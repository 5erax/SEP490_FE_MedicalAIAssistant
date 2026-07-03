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

function escapeRegex(value) {
  return value.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
}

function originMatchesPattern(origin, pattern) {
  if (pattern === "*") return true;
  if (!pattern.includes("*")) return origin === pattern;

  const expression = `^${pattern.split("*").map(escapeRegex).join(".*")}$`;
  return new RegExp(expression).test(origin);
}

function getLoopbackEquivalentOrigins(origin) {
  try {
    const url = new URL(origin);
    if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
      return [origin];
    }

    const equivalentHostname = url.hostname === "localhost" ? "127.0.0.1" : "localhost";
    return [
      origin,
      `${url.protocol}//${equivalentHostname}${url.port ? `:${url.port}` : ""}`,
    ];
  } catch {
    return [origin];
  }
}

export function getGoogleClientId() {
  return GOOGLE_CLIENT_ID.trim();
}

export function isGoogleOAuthEnabledForCurrentOrigin() {
  const clientId = getGoogleClientId();
  if (!clientId) return false;

  const origins = getAuthorizedOrigins();
  if (!origins.length) return true;

  const currentOrigin = getCurrentOrigin();
  const candidateOrigins = getLoopbackEquivalentOrigins(currentOrigin);
  return candidateOrigins.some((origin) => (
    origins.some((authorizedOrigin) => originMatchesPattern(origin, authorizedOrigin))
  ));
}
