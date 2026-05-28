import { apiRequest } from "./api";

function buildAIConfigQuery(pageNumber = 1, pageSize = 10) {
  return new URLSearchParams({
    PageNumber: String(pageNumber),
    PageSize: String(pageSize),
  }).toString();
}

export const aiConfigManagementApi = {
  list(pageNumber = 1, pageSize = 10) {
    return apiRequest(`/api/ai-configs?${buildAIConfigQuery(pageNumber, pageSize)}`, { auth: true });
  },

  active() {
    return apiRequest("/api/ai-configs/active", { auth: true });
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
