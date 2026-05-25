import { clearStoredAuth, getStoredAccessToken, isExpiredToken, setStoredAuth } from "./authStorage";

const DIRECT_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const API_BASE_URL = import.meta.env.DEV ? DIRECT_API_BASE_URL : "";
const LEGACY_NBSP = String.fromCharCode(160);
const REFRESH_PARSE_ERROR =
  `KhÃ´ng thá»ƒ lÃ${LEGACY_NBSP}m má»›i phiÃªn Ä‘Äƒng nháº­p. Vui lÃ²ng Ä‘Äƒng nháº­p láº¡i.`;

function buildUrl(path) {
  if (path.startsWith("http")) return path;
  return `${API_BASE_URL}${path}`;
}

function normalizeAuthResponse(response) {
  const authData = response?.data ?? response;
  if (authData?.accessToken) {
    setStoredAuth(authData);
  }
  return response;
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

export async function refreshStoredAuth() {
  const response = await fetch(buildUrl("/api/authentication/refresh"), {
    method: "POST",
    credentials: "include",
  });

  const text = await response.text();
  let payload = { success: response.ok };

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = {
        success: false,
        message: REFRESH_PARSE_ERROR,
      };
    }
  }

  const ok = response.ok && payload.success !== false;
  if (!ok) {
    const message =
      payload?.message ||
      formatApiErrors(payload?.errors) ||
      payload?.title ||
      `KhÃ´ng thá»ƒ lÃ${LEGACY_NBSP}m má»›i phiÃªn Ä‘Äƒng nháº­p vá»›i mÃ£ ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return normalizeAuthResponse(payload);
}

export async function getFreshAccessToken() {
  const token = getStoredAccessToken();
  if (!token) return "";
  if (!isExpiredToken(token)) return token;

  try {
    const response = await refreshStoredAuth();
    return (response.data ?? response)?.accessToken ?? "";
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      clearStoredAuth();
    }
    return "";
  }
}

export async function apiRequest(path, options = {}) {
  const { method = "GET", body, auth = false, headers = {} } = options;
  const requestHeaders = { ...headers };

  if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = await getFreshAccessToken();
    if (token) requestHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers: requestHeaders,
    credentials: "include",
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

export { normalizeAuthResponse };
