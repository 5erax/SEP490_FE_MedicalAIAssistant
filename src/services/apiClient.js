const DIRECT_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const API_BASE_URL = import.meta.env.DEV ? DIRECT_API_BASE_URL : "";
const AUTH_STORAGE_KEY = "medimate.auth";

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

export function getStoredAuth() {
  if (typeof window === "undefined") return null;
  const auth = parseStoredAuth();
  if (!isUsableAuth(auth)) {
    clearStoredAuth();
    return null;
  }
  return auth;
}

export function setStoredAuth(auth) {
  if (!auth) return;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
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
      payload?.message ||
      formatApiErrors(payload?.errors) ||
      payload?.title ||
      `YÃªu cáº§u tháº¥t báº¡i vá»›i mÃ£ ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}
