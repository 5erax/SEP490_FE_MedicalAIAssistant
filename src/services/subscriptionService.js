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
    return apiRequest(ENDPOINTS.SUBSCRIPTION_PLANS.BASE, { auth: true });
  },

  active() {
    return apiRequest(ENDPOINTS.SUBSCRIPTION_PLANS.ACTIVE);
  },

  get(id) {
    return apiRequest(ENDPOINTS.SUBSCRIPTION_PLANS.BY_ID(id), { auth: true });
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

export const adminQuotasApi = {
  list() {
    return apiRequest(ENDPOINTS.ADMIN_QUOTAS.BASE, { auth: true });
  },
};

export const adminSubscriptionPlanQuotasApi = {
  list(planId) {
    return apiRequest(ENDPOINTS.ADMIN_SUBSCRIPTION_PLAN_QUOTAS.BY_PLAN(planId), { auth: true });
  },

  upsert(planId, quotaId, payload) {
    return apiRequest(ENDPOINTS.ADMIN_SUBSCRIPTION_PLAN_QUOTAS.BY_PLAN_QUOTA(planId, quotaId), {
      method: "PUT",
      body: payload,
      auth: true,
    });
  },

  remove(planId, quotaId) {
    return apiRequest(ENDPOINTS.ADMIN_SUBSCRIPTION_PLAN_QUOTAS.BY_PLAN_QUOTA(planId, quotaId), {
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

  // Admin-wide subscription listing (all users), used e.g. for active-user-count stats.
  adminList(pageNumber = 1, pageSize = 1, { status = "", currentOnly = false } = {}) {
    return apiRequest(withQuery(ENDPOINTS.USER_SUBSCRIPTIONS.ADMIN_LIST, {
      PageNumber: pageNumber,
      PageSize: pageSize,
      status,
      currentOnly: currentOnly ? "true" : "",
    }), { auth: true });
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

  // Legacy: not called by the reconciliation flow, kept only for
  // backward compatibility while BE still exposes these endpoints.
  payOsReturn(params = {}) {
    return apiRequest(withQuery(ENDPOINTS.PAYMENTS.PAYOS_RETURN, params));
  },

  payOsCancel(params = {}) {
    return apiRequest(withQuery(ENDPOINTS.PAYMENTS.PAYOS_CANCEL, params));
  },

  payOsStatus(orderCode) {
    return apiRequest(ENDPOINTS.PAYMENTS.PAYOS_STATUS(orderCode));
  },

  reconcilePayOs(orderCode) {
    const normalizedOrderCode = String(orderCode ?? "").trim();
    if (!normalizedOrderCode) {
      return Promise.reject(new Error("Thiếu mã giao dịch PayOS."));
    }
    return apiRequest(ENDPOINTS.PAYMENTS.PAYOS_RECONCILE(normalizedOrderCode), {
      method: "POST",
      auth: true,
    });
  },
};
