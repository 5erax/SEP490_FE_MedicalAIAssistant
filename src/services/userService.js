import { apiRequest, withPagination } from "./apiClient";
import { ENDPOINTS } from "./endpoints";
import { resolveProfileCompletion } from "../utils/patientProfileCompletion";

export function normalizeUserRecord(user) {
  if (!user || typeof user !== "object") return user;
  const id = user.id ?? user.userId ?? user.identityId ?? "";

  return {
    ...user,
    id,
    userId: user.userId ?? id,
    identityId: user.identityId ?? id,
    name: user.name ?? user.displayName ?? "",
  };
}

export function mergeAuthWithCurrentUser(auth, user) {
  const normalizedUser = normalizeUserRecord(user) ?? {};
  const roles = normalizedUser.roles ?? normalizedUser.role ?? auth?.roles ?? auth?.role ?? [];
  const isProfileCompleted = resolveProfileCompletion(normalizedUser, auth);

  return {
    ...auth,
    userId: normalizedUser.userId || auth?.userId,
    identityId: normalizedUser.identityId || auth?.identityId,
    email: normalizedUser.email ?? auth?.email,
    username: normalizedUser.userName ?? normalizedUser.username ?? auth?.username,
    displayName: normalizedUser.displayName ?? normalizedUser.name ?? auth?.displayName,
    name: normalizedUser.name ?? normalizedUser.displayName ?? auth?.name,
    roles: Array.isArray(roles) ? roles : [roles].filter(Boolean),
    role: normalizedUser.role ?? auth?.role,
    address: normalizedUser.address ?? null,
    gender: normalizedUser.gender ?? null,
    dateOfBirth: normalizedUser.dateOfBirth ?? null,
    phoneNumber: normalizedUser.phoneNumber ?? null,
    firstLogin: isProfileCompleted ? false : (normalizedUser.firstLogin ?? auth?.firstLogin),
    isFirstLogin: isProfileCompleted ? false : (normalizedUser.isFirstLogin ?? auth?.isFirstLogin),
    isProfileCompleted,
    patientOnboardingPending: isProfileCompleted ? false : auth?.patientOnboardingPending,
  };
}

function normalizePagedUsers(response) {
  const data = response?.data;
  if (!data?.items) return response;

  return {
    ...response,
    data: {
      ...data,
      items: data.items.map(normalizeUserRecord),
    },
  };
}

export const usersApi = {
  list(pageNumber = 1, pageSize = 10) {
    return apiRequest(`${ENDPOINTS.USERS.BASE}?${withPagination(pageNumber, pageSize)}`, { auth: true }).then(normalizePagedUsers);
  },

  update(userId, payload) {
    return apiRequest(ENDPOINTS.USERS.BY_ID(userId), {
      method: "PUT",
      body: payload,
      auth: true,
    });
  },

  updateMe(payload) {
    return apiRequest(ENDPOINTS.USERS.ME, {
      method: "PUT",
      body: payload,
      auth: true,
    });
  },

  updatePhone(payload) {
    return apiRequest(ENDPOINTS.USERS.PHONE, {
      method: "PUT",
      body: payload,
      auth: true,
    });
  },

  remove(userId) {
    return apiRequest(ENDPOINTS.USERS.BY_ID(userId), {
      method: "DELETE",
      auth: true,
    });
  },

  restore(userId) {
    return apiRequest(ENDPOINTS.USERS.RESTORE(userId), {
      method: "POST",
      auth: true,
    });
  },

};
