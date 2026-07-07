const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const GOOGLE_AUTHORIZED_ORIGINS = import.meta.env.VITE_GOOGLE_AUTHORIZED_ORIGINS || "";

function getCurrentOrigin() {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

function getAuthorizedOrigins() {
  return GOOGLE_AUTHORIZED_ORIGINS
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getGoogleClientId() {
  return GOOGLE_CLIENT_ID.trim();
}

export function isGoogleOAuthEnabledForCurrentOrigin() {
  const clientId = getGoogleClientId();
  if (!clientId) return false;

  const origins = getAuthorizedOrigins();
  if (!origins.length) return false;

  const currentOrigin = getCurrentOrigin();
  return origins.includes("*") || origins.includes(currentOrigin);
}
