import { apiRequest } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

function withQuery(path, params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value !== null && value !== undefined) {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

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

export const userSubscriptionsApi = {
  checkout(planId, autoRenew = false) {
    return apiRequest(ENDPOINTS.USER_SUBSCRIPTIONS.CHECKOUT, {
      method: "POST",
      body: { planId, autoRenew },
      auth: true,
    });
  },

  me() {
    return apiRequest(ENDPOINTS.USER_SUBSCRIPTIONS.ME, { auth: true });
  },

  get(id) {
    return apiRequest(ENDPOINTS.USER_SUBSCRIPTIONS.BY_ID(id), { auth: true });
  },

  cancel(id) {
    return apiRequest(ENDPOINTS.USER_SUBSCRIPTIONS.CANCEL(id), {
      method: "POST",
      auth: true,
    });
  },
};

export const paymentsApi = {
  get(id) {
    return apiRequest(ENDPOINTS.PAYMENTS.BY_ID(id), { auth: true });
  },

  byUser(userId) {
    return apiRequest(ENDPOINTS.PAYMENTS.BY_USER(userId), { auth: true });
  },

  payOsReturn(params = {}) {
    return apiRequest(withQuery(ENDPOINTS.PAYMENTS.PAYOS_RETURN, params));
  },

  payOsCancel(params = {}) {
    return apiRequest(withQuery(ENDPOINTS.PAYMENTS.PAYOS_CANCEL, params));
  },

  payOsWebhook(payload = {}) {
    return apiRequest(ENDPOINTS.PAYMENTS.PAYOS_WEBHOOK, {
      method: "POST",
      body: payload,
    });
  },

  payOsStatus(orderCode) {
    return apiRequest(ENDPOINTS.PAYMENTS.PAYOS_STATUS(orderCode));
  },
};
