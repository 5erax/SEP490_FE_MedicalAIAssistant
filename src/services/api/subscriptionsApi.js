import { apiRequest } from "./httpClient";

export const subscriptionPlansApi = {
  list() {
    return apiRequest("/api/subscription-plans");
  },

  active() {
    return apiRequest("/api/subscription-plans/active");
  },

  get(id) {
    return apiRequest(`/api/subscription-plans/${id}`);
  },

  create(payload) {
    return apiRequest("/api/subscription-plans", {
      method: "POST",
      body: payload,
      auth: true,
    });
  },

  update(id, payload) {
    return apiRequest(`/api/subscription-plans/${id}`, {
      method: "PUT",
      body: payload,
      auth: true,
    });
  },

  setStatus(id, isActive) {
    return apiRequest(`/api/subscription-plans/${id}/status`, {
      method: "PATCH",
      body: { isActive },
      auth: true,
    });
  },

  remove(id) {
    return apiRequest(`/api/subscription-plans/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },
};
