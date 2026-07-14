import { hasPremiumAccess } from "../services/api";
import {
  getWorkspacePath,
  hasAuthRole,
} from "../utils/roles";
import { withReturnTo } from "./returnIntent";

function hasAllowedRole(auth, roles) {
  return roles.some((role) => hasAuthRole(auth, role));
}

export function resolveRouteAccess(route, auth, requestedPath) {
  const requiresAuth = ["auth", "premium", "role"].includes(route.access);

  if (requiresAuth && !auth) {
    return withReturnTo("/login", requestedPath);
  }

  if (route.access === "role" && !hasAllowedRole(auth, route.roles ?? [])) {
    return getWorkspacePath(auth);
  }

  if (route.access === "premium" && !hasPremiumAccess(auth)) {
    return withReturnTo("/pricing", requestedPath);
  }

  return "";
}
