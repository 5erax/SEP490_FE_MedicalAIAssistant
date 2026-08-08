import { getCanonicalPath, resolveRoute } from "./routes";
import { getPostLoginPath, shouldSetupPatientProfile } from "../utils/roles";

const RETURN_TO_KEY = "medimate.returnTo";
const RETURN_TO_PARAM = "returnTo";

export function sanitizeReturnTo(value) {
  if (!value || typeof value !== "string") return "";

  try {
    const destination = new URL(value, window.location.origin);
    if (destination.origin !== window.location.origin) return "";

    const route = resolveRoute(destination.pathname);
    if (!route || route.returnable === false) return "";

    return `${getCanonicalPath(route)}${destination.search}${destination.hash}`;
  } catch {
    return "";
  }
}

export function getReturnToFromSearch(search = window.location.search) {
  const params = new URLSearchParams(search);
  return sanitizeReturnTo(
    params.get(RETURN_TO_PARAM)
      ?? params.get("redirect")
      ?? params.get("locked")
      ?? "",
  );
}

export function withReturnTo(path, returnTo) {
  const safeReturnTo = sanitizeReturnTo(returnTo);
  if (!safeReturnTo) return path;

  const destination = new URL(path, window.location.origin);
  destination.searchParams.set(RETURN_TO_PARAM, safeReturnTo);
  return `${destination.pathname}${destination.search}${destination.hash}`;
}

export function getPostAuthDestination(authOrUser, search = window.location.search) {
  const returnTo = getReturnToFromSearch(search);
  const postLoginPath = shouldSetupPatientProfile(authOrUser)
    ? "/patient/profile/setup"
    : getPostLoginPath(authOrUser);

  if (["/app/admin", "/app/staff"].includes(postLoginPath)) {
    return returnTo.startsWith(postLoginPath) ? returnTo : postLoginPath;
  }

  if (postLoginPath === "/patient/profile/setup") {
    return withReturnTo(postLoginPath, returnTo);
  }
  return returnTo || postLoginPath;
}

export function rememberReturnTo(value) {
  const safeReturnTo = sanitizeReturnTo(value);
  if (!safeReturnTo) return "";
  sessionStorage.setItem(RETURN_TO_KEY, safeReturnTo);
  return safeReturnTo;
}

export function getRememberedReturnTo() {
  return sanitizeReturnTo(sessionStorage.getItem(RETURN_TO_KEY) ?? "");
}

export function clearRememberedReturnTo() {
  sessionStorage.removeItem(RETURN_TO_KEY);
}
