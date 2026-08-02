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

  cancel(id) {
    return apiRequest(ENDPOINTS.USER_SUBSCRIPTIONS.CANCEL(id), {
      method: "POST",
      auth: true,
    });
  },
};

export const paymentsApi = {
  list(pageNumber = 1, pageSize = 10) {
    return apiRequest(withQuery(ENDPOINTS.PAYMENTS.LIST, {
      PageNumber: pageNumber,
      PageSize: pageSize,
    }), { auth: true });
  },

  getMyPayments(pageNumber = 1, pageSize = 10) {
    return apiRequest(withQuery(ENDPOINTS.PAYMENTS.ME, {
      PageNumber: pageNumber,
      PageSize: pageSize,
    }), { auth: true });
  },

  getMyPayment(id) {
    return apiRequest(ENDPOINTS.PAYMENTS.MY_PAYMENT(id), { auth: true });
  },

  get(id) {
    return apiRequest(ENDPOINTS.PAYMENTS.BY_ID(id), { auth: true });
  },

  byUser(userId) {
    return apiRequest(ENDPOINTS.PAYMENTS.BY_USER(userId), { auth: true });
  },

  payOsStatus(orderCode) {
    return apiRequest(ENDPOINTS.PAYMENTS.PAYOS_STATUS(orderCode));
  },
};
