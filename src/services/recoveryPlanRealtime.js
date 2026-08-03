import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import { getStoredAuth } from "./apiClient";

const REQUEST_EVENT = "RecoveryPlanRequestChanged";
const PLAN_EVENT = "RecoveryPlanChanged";
const QUEUE_EVENT = "RecoveryPlanQueueChanged";
const ACCESS_CHANGED_EVENT = "RecoveryPlanRealtimeAccessChanged";
const REFRESH_DOCTOR_MEMBERSHIP_METHOD = "RefreshDoctorMembershipAsync";
const HUB_PATH = "/hubs/recovery-plans";

const listeners = new Set();
let connection = null;
let connectionToken = "";
let startPromise = null;
let lastStartFailureAt = 0;

function getRealtimeBaseUrl() {
  const configured = String(import.meta.env.VITE_REALTIME_BASE_URL || "").trim();
  if (configured) return configured.replace(/\/$/, "");

  if (import.meta.env.DEV) {
    return String(import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/$/, "");
  }

  return "";
}

function emit(event) {
  listeners.forEach((listener) => listener(event));
}

function buildConnection(accessToken) {
  const realtimeBaseUrl = getRealtimeBaseUrl();
  if (!realtimeBaseUrl) return null;

  const nextConnection = new HubConnectionBuilder()
    .withUrl(`${realtimeBaseUrl}${HUB_PATH}`, {
      accessTokenFactory: () => getStoredAuth()?.accessToken || accessToken,
    })
    .configureLogging(LogLevel.None)
    .withAutomaticReconnect()
    .build();

  nextConnection.on(REQUEST_EVENT, (payload) => {
    emit({ type: "request", payload });
  });
  nextConnection.on(PLAN_EVENT, (payload) => {
    emit({ type: "plan", payload });
  });
  nextConnection.on(QUEUE_EVENT, (payload) => {
    emit({ type: "queue", payload });
  });
  nextConnection.on(ACCESS_CHANGED_EVENT, (payload) => {
    emit({ type: "access", payload });
  });
  nextConnection.onreconnecting(() => {
    emit({ type: "connection", status: "reconnecting" });
  });
  nextConnection.onreconnected(() => {
    emit({ type: "connection", status: "connected", refetch: true });
  });
  nextConnection.onclose(() => {
    emit({ type: "connection", status: "disconnected" });
  });

  return nextConnection;
}

export function subscribeToRecoveryPlanEvents(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function ensureRecoveryPlanConnection() {
  const accessToken = getStoredAuth()?.accessToken || "";
  if (!accessToken) return "unauthenticated";
  if (!getRealtimeBaseUrl()) return "unavailable";

  if (connection && connectionToken !== accessToken) {
    await stopRecoveryPlanConnection();
  }

  if (!connection) {
    connectionToken = accessToken;
    connection = buildConnection(accessToken);
  }

  if (!connection) return "unavailable";
  if (connection.state === HubConnectionState.Connected) return "connected";
  if (startPromise) return startPromise;
  if (lastStartFailureAt && Date.now() - lastStartFailureAt < 30_000) return "disconnected";

  startPromise = connection.start()
    .then(() => {
      lastStartFailureAt = 0;
      emit({ type: "connection", status: "connected", refetch: true });
      return "connected";
    })
    .catch(() => {
      lastStartFailureAt = Date.now();
      emit({ type: "connection", status: "disconnected" });
      return "disconnected";
    })
    .finally(() => {
      startPromise = null;
    });

  return startPromise;
}

// Doctor-only: joins the private doctor group and, if accepting requests,
// the shared queue group. Must be invoked after every connect/reconnect
// (the hub does not know the caller's role until this is called) -
// patient pages never call this.
export async function refreshDoctorMembership() {
  if (!connection || connection.state !== HubConnectionState.Connected) return false;
  try {
    await connection.invoke(REFRESH_DOCTOR_MEMBERSHIP_METHOD);
    return true;
  } catch {
    return false;
  }
}

export async function stopRecoveryPlanConnection() {
  const activeConnection = connection;
  connection = null;
  connectionToken = "";
  startPromise = null;
  lastStartFailureAt = 0;

  if (activeConnection && activeConnection.state !== HubConnectionState.Disconnected) {
    try {
      await activeConnection.stop();
    } catch {
      // Local auth cleanup must continue even if the realtime transport already closed.
    }
  }
}
