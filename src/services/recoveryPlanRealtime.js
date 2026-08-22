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
const CROSS_TAB_CHANNEL = "medimate.recovery-plan-realtime";
const CROSS_TAB_STORAGE_KEY = "medimate.recovery-plan-realtime-event";

const listeners = new Set();
let connection = null;
let connectionToken = "";
let startPromise = null;
let lastStartFailureAt = 0;
let crossTabChannel = null;
let crossTabListening = false;
const tabId = typeof crypto !== "undefined" && crypto.randomUUID
  ? crypto.randomUUID()
  : `${Date.now()}:${Math.random()}`;

function getRealtimeBaseUrl() {
  const configured = String(import.meta.env.VITE_REALTIME_BASE_URL || "").trim();
  if (configured) return configured.replace(/\/$/, "");

  const currentOrigin =
    typeof window !== "undefined" ? window.location.origin : "";
  const currentProtocol =
    typeof window !== "undefined" ? window.location.protocol : "";
  const apiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || "").trim();
  if (apiBaseUrl) {
    try {
      const resolvedApiUrl = new URL(apiBaseUrl, currentOrigin || undefined);
      const isMixedContent =
        currentProtocol === "https:" && resolvedApiUrl.protocol === "http:";

      if (!isMixedContent) {
        return resolvedApiUrl.origin.replace(/\/$/, "");
      }
    } catch {
      return apiBaseUrl.replace(/\/$/, "");
    }
  }

  if (currentOrigin) {
    return currentOrigin.replace(/\/$/, "");
  }

  return "";
}

function emit(event) {
  listeners.forEach((listener) => listener(event));
}

function emitAndBroadcast(event) {
  emit(event);
  broadcastRecoveryPlanEvent(event);
}

function receiveCrossTabEvent(message) {
  if (!message || message.sourceId === tabId || !message.event) return;
  emit({ ...message.event, crossTab: true });
}

function setupCrossTabSync() {
  if (crossTabListening || typeof window === "undefined") return;
  crossTabListening = true;

  if ("BroadcastChannel" in window) {
    crossTabChannel = new BroadcastChannel(CROSS_TAB_CHANNEL);
    crossTabChannel.onmessage = (message) => {
      receiveCrossTabEvent(message.data);
    };
  }

  window.addEventListener("storage", (event) => {
    if (event.key !== CROSS_TAB_STORAGE_KEY || !event.newValue) return;
    try {
      receiveCrossTabEvent(JSON.parse(event.newValue));
    } catch {
      // Ignore malformed cross-tab payloads from older app versions.
    }
  });
}

export function broadcastRecoveryPlanEvent(event) {
  if (typeof window === "undefined") return;

  const message = {
    sourceId: tabId,
    event,
    occurredAt: Date.now(),
  };

  try {
    crossTabChannel?.postMessage(message);
  } catch {
    // Storage fallback below keeps same-browser tabs in sync.
  }

  try {
    window.localStorage.setItem(CROSS_TAB_STORAGE_KEY, JSON.stringify(message));
    window.localStorage.removeItem(CROSS_TAB_STORAGE_KEY);
  } catch {
    // Best-effort only; SignalR and local state updates still continue.
  }
}

export function publishRecoveryPlanEvent(event) {
  emitAndBroadcast(event);
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
    emitAndBroadcast({ type: "request", payload });
  });
  nextConnection.on(PLAN_EVENT, (payload) => {
    emitAndBroadcast({ type: "plan", payload });
  });
  nextConnection.on(QUEUE_EVENT, (payload) => {
    emitAndBroadcast({ type: "queue", payload });
  });
  nextConnection.on(ACCESS_CHANGED_EVENT, (payload) => {
    emitAndBroadcast({ type: "access", payload });
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
  setupCrossTabSync();
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
