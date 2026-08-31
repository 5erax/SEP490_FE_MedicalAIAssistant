// Missing/null means unknown, not "profile incomplete".
export function resolveProfileCompletion(record, previous) {
  return typeof record?.isProfileCompleted === "boolean"
    ? record.isProfileCompleted
    : previous?.isProfileCompleted;
}

export function getProfileUserId(account) {
  const id = account?.userId || account?.identityId || account?.id;
  if (id) return String(id);
  try {
    const payload = account?.accessToken?.split(".")[1];
    if (!payload) return "";
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")));
    return String(claims.userId || claims.sub || claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || "");
  } catch {
    return "";
  }
}

export function getProfileAccountKey(account) {
  if (!account?.accessToken) return "";
  return getProfileUserId(account) || account.email || account.accessToken;
}

export function isSameProfileAccount(left, right) {
  const key = getProfileAccountKey(left);
  return Boolean(key) && key === getProfileAccountKey(right);
}

export async function verifyPatientProfileSetup({ auth, loadUser, findProfile }) {
  const response = await loadUser();
  const user = response?.data;
  if (!user || typeof user !== "object" || Array.isArray(user)) {
    throw new Error("Chưa thể xác minh thông tin hồ sơ. Vui lòng thử lại.");
  }
  const knownId = getProfileUserId(auth);
  const returnedId = getProfileUserId(user);
  if (knownId && returnedId && knownId !== returnedId) {
    throw new Error("Phiên tài khoản đã thay đổi. Vui lòng tải lại trang.");
  }
  const userId = returnedId || knownId;
  if (!userId) throw new Error("Chưa thể xác định tài khoản để kiểm tra hồ sơ.");
  if (resolveProfileCompletion(user, auth) === true) {
    return { required: false, user, userId };
  }
  // Only a successful lookup with no profile (including a handled 404) can open the form.
  const profile = await findProfile(userId);
  if (profile !== null && (!profile || typeof profile !== "object" || Array.isArray(profile) || !(profile.id || profile.patientProfileId || profile.profileId))) {
    throw new Error("Chưa thể xác minh hồ sơ sức khỏe. Vui lòng thử lại.");
  }
  return { required: !profile, user, userId };
}
