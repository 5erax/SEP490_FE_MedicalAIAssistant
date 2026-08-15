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

const authenticatedRequest = (path, options = {}) => apiRequest(path, { ...options, auth: true });

export const recoveryPlanRequestsApi = {
  create(payload, idempotencyKey) {
    return authenticatedRequest(ENDPOINTS.RECOVERY_PLAN_REQUESTS.BASE, {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: payload,
    });
  },

  listMine({ pageNumber = 1, pageSize = 10, status = "" } = {}) {
    return authenticatedRequest(withQuery(ENDPOINTS.RECOVERY_PLAN_REQUESTS.ME, {
      PageNumber: pageNumber,
      PageSize: pageSize,
      Status: status,
    }));
  },

  get(requestId) {
    return authenticatedRequest(ENDPOINTS.RECOVERY_PLAN_REQUESTS.BY_ID(requestId));
  },

  cancel(requestId) {
    return authenticatedRequest(ENDPOINTS.RECOVERY_PLAN_REQUESTS.CANCEL(requestId), {
      method: "POST",
    });
  },

  provideInformation(requestId, additionalInformation) {
    return authenticatedRequest(ENDPOINTS.RECOVERY_PLAN_REQUESTS.PROVIDE_INFORMATION(requestId), {
      method: "POST",
      body: { additionalInformation },
    });
  },
};

export const recoveryPlansApi = {
  listMine({ pageNumber = 1, pageSize = 10, status = "" } = {}) {
    return authenticatedRequest(withQuery(ENDPOINTS.RECOVERY_PLANS.ME, {
      PageNumber: pageNumber,
      PageSize: pageSize,
      Status: status,
    }));
  },

  get(planId) {
    return authenticatedRequest(ENDPOINTS.RECOVERY_PLANS.BY_ID(planId));
  },

  start(planId) {
    return authenticatedRequest(ENDPOINTS.RECOVERY_PLANS.START(planId), {
      method: "POST",
    });
  },

  cancel(planId, payload) {
    return authenticatedRequest(ENDPOINTS.RECOVERY_PLANS.CANCEL(planId), {
      method: "POST",
      body: payload,
    });
  },

  submitFeedback(planId, payload) {
    return authenticatedRequest(ENDPOINTS.RECOVERY_PLANS.FEEDBACK(planId), {
      method: "POST",
      body: payload,
    });
  },
};
