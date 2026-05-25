const AUTH_STORAGE_KEY = "medimate.auth";

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

export function isExpiredToken(token) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  return Number(payload.exp) * 1000 <= Date.now();
}

function isUsableAuth(auth) {
  return Boolean(auth?.accessToken);
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

export function hasStoredAuthRecord() {
  if (typeof window === "undefined") return false;
  return Boolean(parseStoredAuth()?.accessToken);
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
  return parseStoredAuth()?.accessToken ?? "";
}

export function getStoredAccessToken() {
  return parseStoredAuth()?.accessToken ?? "";
}
