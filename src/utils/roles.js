export function normalizeRoles(roles = []) {
  return roles.map((role) => String(role).trim().toLowerCase()).filter(Boolean);
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

export function getWorkspacePath(authOrUser) {
  const roles = normalizeRoles(authOrUser?.roles ?? []);

  if (hasRole(roles, "admin")) return "/app/admin";
  if (hasRole(roles, "staff")) return "/app/staff";
  return "/app/patient";
}

export function shouldSetupPatientProfile(authOrUser) {
  const roles = normalizeRoles(authOrUser?.roles ?? []);
  const isFirstLogin = authOrUser?.isFirstLogin === true || authOrUser?.firstLogin === true;

  return isFirstLogin && !hasRole(roles, "admin") && !hasRole(roles, "staff");
}

export function getPostLoginPath(authOrUser) {
  if (shouldSetupPatientProfile(authOrUser)) return "/patient/profile/setup";
  return getWorkspacePath(authOrUser);
}
