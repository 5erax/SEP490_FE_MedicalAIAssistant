import { apiRequest } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

export const subscriptionPlansApi = {
  list() {
    return apiRequest(ENDPOINTS.SUBSCRIPTION_PLANS.BASE);
  },

  active() {
    return apiRequest(ENDPOINTS.SUBSCRIPTION_PLANS.ACTIVE);
  },

  get(id) {
    return apiRequest(ENDPOINTS.SUBSCRIPTION_PLANS.BY_ID(id));
  },

  create(payload) {
    return apiRequest(ENDPOINTS.SUBSCRIPTION_PLANS.BASE, {
      method: "POST",
      body: payload,
      auth: true,
    });
  },

  update(id, payload) {
    return apiRequest(ENDPOINTS.SUBSCRIPTION_PLANS.BY_ID(id), {
      method: "PUT",
      body: payload,
      auth: true,
    });
  },

  setStatus(id, isActive) {
    return apiRequest(ENDPOINTS.SUBSCRIPTION_PLANS.STATUS(id), {
      method: "PATCH",
      body: { isActive },
      auth: true,
    });
  },

  remove(id) {
    return apiRequest(ENDPOINTS.SUBSCRIPTION_PLANS.BY_ID(id), {
      method: "DELETE",
      auth: true,
    });
  },
};
