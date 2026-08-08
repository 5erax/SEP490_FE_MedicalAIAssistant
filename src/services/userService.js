import { apiRequest, withPagination } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

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
