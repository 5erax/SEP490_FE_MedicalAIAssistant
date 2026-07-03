// Production uses same-origin /api so Vercel rewrites can avoid mixed-content and CORS issues.
const API_BASE_URL = import.meta.env.DEV
  ? (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "")
  : "";
const API_PROXY_PATH = "/api/proxy.js";
const AUTH_STORAGE_KEY = "medimate.auth";
let memoryAccessToken = "";

function buildUrl(path) {
  if (path.startsWith("http")) return path;
  if (!import.meta.env.DEV) {
    const [pathname, query = ""] = path.split("?");
    const targetPath = pathname.replace(/^\/api\/?/, "").replace(/^\/+/, "");
    const queryPrefix = query ? `&${query}` : "";
    return `${API_PROXY_PATH}?path=${encodeURIComponent(targetPath)}${queryPrefix}`;
  }
  return `${API_BASE_URL}${path}`;
}

function parseStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function selectPersistentAuth(auth) {
  if (!auth || typeof auth !== "object") return null;

  return {
    userId: auth.userId,
    identityId: auth.identityId,
    roles: auth.roles,
    role: auth.role,
    expiresAtUtc: auth.expiresAtUtc,
    firstLogin: auth.firstLogin,
    isFirstLogin: auth.isFirstLogin,
    isProfileCompleted: auth.isProfileCompleted,
    isPremium: auth.isPremium,
    isSubscribed: auth.isSubscribed,
    hasPremiumAccess: auth.hasPremiumAccess,
    planName: auth.planName,
    subscriptionPlan: auth.subscriptionPlan,
    plan: auth.plan,
    subscriptionStatus: auth.subscriptionStatus,
  };
}

function decodeJwtPayload(token) {
  try {
    const payload = String(token).split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function isExpiredToken(token) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  return Number(payload.exp) * 1000 <= Date.now();
}

function isExpiredAuth(auth, token = auth?.accessToken) {
  if (token && isExpiredToken(token)) return true;
  if (!auth?.expiresAtUtc) return false;

  const expiresAt = Date.parse(auth.expiresAtUtc);
  return Number.isFinite(expiresAt) && expiresAt <= Date.now();
}

function authWithMemoryToken(auth) {
  return memoryAccessToken ? { ...auth, accessToken: memoryAccessToken } : auth;
}

function formatApiErrors(errors) {
  if (!errors) return "";
  if (Array.isArray(errors)) return errors.filter(Boolean).join(", ");
  if (typeof errors === "string") return errors;
  if (typeof errors === "object") {
    return Object.values(errors)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter(Boolean)
      .join(", ");
  }
  return "";
}

export function getStoredAuth() {
  if (typeof window === "undefined") return null;
  const auth = parseStoredAuth();
  if (!auth || typeof auth !== "object" || isExpiredAuth(auth)) {
    clearStoredAuth();
    return null;
  }

  if (auth.accessToken && !isExpiredToken(auth.accessToken)) {
    memoryAccessToken = auth.accessToken;
  }

  const storedAuth = selectPersistentAuth(auth);
  const serializedAuth = JSON.stringify(storedAuth);
  if (localStorage.getItem(AUTH_STORAGE_KEY) !== serializedAuth) {
    localStorage.setItem(AUTH_STORAGE_KEY, serializedAuth);
  }
  return authWithMemoryToken(storedAuth);
}

export function setStoredAuth(auth) {
  if (!auth) return;
  if (auth.accessToken && !isExpiredToken(auth.accessToken)) {
    memoryAccessToken = auth.accessToken;
  }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(selectPersistentAuth(auth)));
}

export function clearStoredAuth() {
  memoryAccessToken = "";
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function isAuthenticated() {
  return Boolean(getStoredAuth());
}

export function hasPremiumAccess(auth = getStoredAuth()) {
  const planName = String(auth?.planName ?? auth?.subscriptionPlan ?? auth?.plan ?? "").toLowerCase();
  const subscriptionStatus = String(auth?.subscriptionStatus ?? auth?.subscription?.status ?? "").toLowerCase();

  return Boolean(
    auth?.isPremium ||
    auth?.isSubscribed ||
    auth?.hasPremiumAccess ||
    planName.includes("premium") ||
    planName.includes("medimate+") ||
    subscriptionStatus === "active"
  );
}

export function getAccessToken() {
  if (memoryAccessToken && !isExpiredToken(memoryAccessToken)) return memoryAccessToken;
  if (memoryAccessToken) memoryAccessToken = "";
  return getStoredAuth()?.accessToken ?? "";
}

export function withPagination(pageNumber = 1, pageSize = 10) {
  return new URLSearchParams({
    PageNumber: String(pageNumber),
    PageSize: String(pageSize),
  }).toString();
}

export async function apiRequest(path, options = {}) {
  const { method = "GET", body, auth = false, headers = {}, credentials = "include" } = options;
  const requestHeaders = { ...headers };

  if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = getAccessToken();
    if (token) requestHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers: requestHeaders,
    credentials,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let payload = { success: response.ok };

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = {
        success: false,
        message:
          "Dịch vụ đang phản hồi không ổn định. Vui lòng thử lại sau.",
      };
    }
  }
  const ok = response.ok && payload.success !== false;

  if (!ok) {
    const message =
      (
        payload?.message && formatApiErrors(payload?.errors)
          ? `${payload.message} ${formatApiErrors(payload.errors)}`
          : payload?.message
      ) ||
      formatApiErrors(payload?.errors) ||
      payload?.title ||
      `Yêu cầu thất bại với mã ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}
