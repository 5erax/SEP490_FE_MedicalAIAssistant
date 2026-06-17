// Keep browser requests same-origin. Vite and Vercel proxy /api to the configured backend.
const API_BASE_URL = "";
const AUTH_STORAGE_KEY = "medimate.auth";
const AUTH_ERROR_STATUSES = new Set([401, 403]);

function buildUrl(path) {
  if (path.startsWith("http")) return path;
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

function selectStoredAuth(auth) {
  if (!auth || typeof auth !== "object") return null;

  return {
    accessToken: auth.accessToken,
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

function isUsableAuth(auth) {
  return Boolean(auth?.accessToken) && !isExpiredToken(auth.accessToken);
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

function getRequestId(response, payload) {
  return response.headers.get("x-request-id")
    || response.headers.get("x-correlation-id")
    || payload?.requestId
    || payload?.traceId
    || "";
}

export function isUnauthorizedError(error) {
  return Number(error?.status) === 401;
}

export function isForbiddenError(error) {
  return Number(error?.status) === 403;
}

export function isAuthError(error) {
  return AUTH_ERROR_STATUSES.has(Number(error?.status));
}

export function getUserSafeErrorMessage(error, fallback = "Yêu cầu chưa thể hoàn tất. Vui lòng thử lại sau.") {
  if (isUnauthorizedError(error)) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  if (isForbiddenError(error)) return "Bạn không có quyền thực hiện thao tác này.";
  return error?.message || fallback;
}

export function getStoredAuth() {
  if (typeof window === "undefined") return null;
  const auth = parseStoredAuth();
  if (!isUsableAuth(auth)) {
    clearStoredAuth();
    return null;
  }

  const storedAuth = selectStoredAuth(auth);
  const serializedAuth = JSON.stringify(storedAuth);
  if (localStorage.getItem(AUTH_STORAGE_KEY) !== serializedAuth) {
    localStorage.setItem(AUTH_STORAGE_KEY, serializedAuth);
  }
  return storedAuth;
}

export function setStoredAuth(auth) {
  if (!auth) return;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(selectStoredAuth(auth)));
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function isAuthenticated() {
  return Boolean(getStoredAuth());
}

export function hasPremiumAccess(auth = getStoredAuth()) {
  const planName = String(auth?.planName ?? auth?.subscriptionPlan ?? auth?.plan ?? "").toLowerCase();
  const subscriptionStatus = String(auth?.subscriptionStatus ?? auth?.subscription?.status ?? "").toLowerCase();
  const roles = Array.isArray(auth?.roles) ? auth.roles.map((role) => String(role).toLowerCase()) : [];

  return Boolean(
    auth?.isPremium ||
    auth?.isSubscribed ||
    auth?.hasPremiumAccess ||
    planName.includes("premium") ||
    planName.includes("medimate+") ||
    subscriptionStatus === "active" ||
    roles.includes("admin") ||
    roles.includes("staff")
  );
}

export function getAccessToken() {
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
          "Dá»‹ch vá»¥ Ä‘ang pháº£n há»“i khÃ´ng á»•n Ä‘á»‹nh. Vui lÃ²ng thá»­ láº¡i sau.",
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
      `YÃªu cáº§u tháº¥t báº¡i vá»›i mÃ£ ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.code = payload?.code || payload?.errorCode || payload?.type || "";
    error.details = payload?.errors ?? null;
    error.requestId = getRequestId(response, payload);
    error.payload = payload;
    if (auth && isUnauthorizedError(error)) clearStoredAuth();
    throw error;
  }

  return payload;
}
