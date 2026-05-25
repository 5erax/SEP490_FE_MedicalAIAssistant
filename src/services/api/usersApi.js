import { apiRequest } from "./httpClient";
import { normalizePagedUsers } from "./normalizers";
import { withPagination } from "./query";

export const usersApi = {
  list(pageNumber = 1, pageSize = 10) {
    return apiRequest(`/api/users?${withPagination(pageNumber, pageSize)}`, { auth: true }).then(normalizePagedUsers);
  },

  update(userId, payload) {
    return apiRequest(`/api/users/${userId}`, {
      method: "PUT",
      body: payload,
      auth: true,
    });
  },

  remove(userId) {
    return apiRequest(`/api/users/${userId}`, {
      method: "DELETE",
      auth: true,
    });
  },

  approve(userId) {
    return apiRequest(`/api/authentication/${userId}/approve-staff`, {
      method: "POST",
      auth: true,
    });
  },
};
