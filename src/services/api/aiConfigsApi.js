import { apiRequest } from "./httpClient";
import { withPagination } from "./query";

export const aiConfigsApi = {
  list(pageNumber = 1, pageSize = 20) {
    return apiRequest(`/api/ai-configs?${withPagination(pageNumber, pageSize)}`, { auth: true });
  },

  active() {
    return apiRequest("/api/ai-configs/active", { auth: true });
  },

  byTaskType(taskType) {
    return apiRequest(`/api/ai-configs/by-task-type/${encodeURIComponent(taskType)}`, { auth: true });
  },

  get(id) {
    return apiRequest(`/api/ai-configs/${id}`, { auth: true });
  },

  create(payload) {
    return apiRequest("/api/ai-configs", {
      method: "POST",
      body: payload,
      auth: true,
    });
  },

  update(id, payload) {
    return apiRequest(`/api/ai-configs/${id}`, {
      method: "PUT",
      body: payload,
      auth: true,
    });
  },

  setStatus(id, isActive) {
    return apiRequest(`/api/ai-configs/${id}/status`, {
      method: "PATCH",
      body: { isActive },
      auth: true,
    });
  },

  remove(id) {
    return apiRequest(`/api/ai-configs/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },
};
