function decodeJwtPayload(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;

  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function collectRoleValues(authOrUser) {
  if (!authOrUser) return [];

  const jwtPayload = decodeJwtPayload(authOrUser.accessToken);
  return [
    authOrUser.roles,
    authOrUser.role,
    authOrUser.Role,
    authOrUser.userRoles,
    authOrUser.data?.roles,
    authOrUser.data?.role,
    jwtPayload?.roles,
    jwtPayload?.role,
    jwtPayload?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"],
  ];
}

export function normalizeRoles(roles = []) {
  const values = Array.isArray(roles) ? roles : [roles];
  return values
    .flatMap((role) => (Array.isArray(role) ? role : String(role).split(",")))
    .map((role) => String(role).trim().toLowerCase())
    .filter(Boolean);
}

export function hasRole(roles = [], role) {
  const normalizedRoles = normalizeRoles(roles);
  const wanted = role.toLowerCase();

  return normalizedRoles.some((current) => {
    if (current === wanted) return true;
    if (wanted === "admin") return ["administrator", "superadmin"].includes(current);
    if (wanted === "staff") return ["doctor", "clinician", "medicalstaff"].includes(current);
    return false;
  });
}

export function hasAuthRole(authOrUser, role) {
  return hasRole(normalizeRoles(collectRoleValues(authOrUser)), role);
}

export function getWorkspacePath(authOrUser) {
  const roles = normalizeRoles(collectRoleValues(authOrUser));

  if (hasRole(roles, "admin")) return "/app/admin";
  if (hasRole(roles, "staff")) return "/app/staff";
  return "/dashboard";
}

export function shouldSetupPatientProfile(authOrUser) {
  const roles = normalizeRoles(collectRoleValues(authOrUser));
  const isFirstLogin = authOrUser?.isFirstLogin === true || authOrUser?.firstLogin === true;

  return isFirstLogin && !hasRole(roles, "admin") && !hasRole(roles, "staff");
}

export function getPostLoginPath(authOrUser) {
  if (shouldSetupPatientProfile(authOrUser)) return "/patient/profile/setup";
  return getWorkspacePath(authOrUser);
}
