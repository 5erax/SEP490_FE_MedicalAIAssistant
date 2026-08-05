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

export const doctorRecoveryPlanRequestsApi = {
  listOpen({ pageNumber = 1, pageSize = 10, diseaseGroup = "" } = {}) {
    return authenticatedRequest(withQuery(ENDPOINTS.DOCTOR_RECOVERY_PLAN_REQUESTS.OPEN, {
      pageNumber,
      pageSize,
      diseaseGroup,
    }));
  },

  listMine({ pageNumber = 1, pageSize = 10, status = "" } = {}) {
    return authenticatedRequest(withQuery(ENDPOINTS.DOCTOR_RECOVERY_PLAN_REQUESTS.MINE, {
      pageNumber,
      pageSize,
      status,
    }));
  },

  get(requestId) {
    return authenticatedRequest(ENDPOINTS.DOCTOR_RECOVERY_PLAN_REQUESTS.BY_ID(requestId));
  },

  getClinicalContext(requestId) {
    return authenticatedRequest(ENDPOINTS.DOCTOR_RECOVERY_PLAN_REQUESTS.CLINICAL_CONTEXT(requestId));
  },

  accept(requestId) {
    return authenticatedRequest(ENDPOINTS.DOCTOR_RECOVERY_PLAN_REQUESTS.ACCEPT(requestId), { method: "POST" });
  },

  startReview(requestId) {
    return authenticatedRequest(ENDPOINTS.DOCTOR_RECOVERY_PLAN_REQUESTS.START_REVIEW(requestId), { method: "POST" });
  },

  release(requestId, reason) {
    return authenticatedRequest(ENDPOINTS.DOCTOR_RECOVERY_PLAN_REQUESTS.RELEASE(requestId), {
      method: "POST",
      body: reason ? { reason } : {},
    });
  },

  requestMoreInformation(requestId, reason) {
    return authenticatedRequest(ENDPOINTS.DOCTOR_RECOVERY_PLAN_REQUESTS.REQUEST_MORE_INFORMATION(requestId), {
      method: "POST",
      body: { reason },
    });
  },

  reject(requestId, rejectionReasonCode, rejectionReason) {
    return authenticatedRequest(ENDPOINTS.DOCTOR_RECOVERY_PLAN_REQUESTS.REJECT(requestId), {
      method: "POST",
      body: { rejectionReasonCode, rejectionReason },
    });
  },

  createDraft(requestId, payload) {
    return authenticatedRequest(ENDPOINTS.DOCTOR_RECOVERY_PLAN_REQUESTS.CREATE_PLAN(requestId), {
      method: "POST",
      body: payload,
    });
  },
};

// GET /api/doctor/recovery-plans/{planId} wraps the plan tree in
// data.plan alongside request/doctor/clinical-snapshot context.
// Full-plan mutations (updateHeader, publish) return the plan tree
// directly in data, so this normalizer handles both shapes.
//
// Nested CRUD mutations (create/update phase, nutrient, food) do NOT
// return the plan tree — they return only the affected resource
// (RecoveryPlanPhaseResponse / RecoveryPlanNutrientTargetResponse /
// RecoveryPlanFoodSourceResponse). Do not run those responses through
// this normalizer; refetch the plan (get) instead to resync state.
export function normalizeDoctorPlanDetail(response) {
  const data = response?.data;
  if (data && typeof data === "object" && data.plan) {
    return {
      plan: data.plan,
      requestId: data.requestId ?? null,
      diseaseGroup: data.diseaseGroup ?? null,
      doctorId: data.doctorId ?? null,
      clinicalSnapshot: data.clinicalSnapshot ?? null,
    };
  }
  return { plan: data ?? null, requestId: null, diseaseGroup: null, doctorId: null, clinicalSnapshot: null };
}

export const doctorRecoveryPlansApi = {
  get(planId) {
    return authenticatedRequest(ENDPOINTS.DOCTOR_RECOVERY_PLANS.BY_ID(planId));
  },

  updateHeader(planId, payload) {
    return authenticatedRequest(ENDPOINTS.DOCTOR_RECOVERY_PLANS.BY_ID(planId), {
      method: "PUT",
      body: payload,
    });
  },

  remove(planId) {
    return authenticatedRequest(ENDPOINTS.DOCTOR_RECOVERY_PLANS.BY_ID(planId), { method: "DELETE" });
  },

  createPhase(planId, payload) {
    return authenticatedRequest(ENDPOINTS.DOCTOR_RECOVERY_PLANS.PHASES(planId), {
      method: "POST",
      body: payload,
    });
  },

  updatePhase(planId, phaseId, payload) {
    return authenticatedRequest(ENDPOINTS.DOCTOR_RECOVERY_PLANS.PHASE_BY_ID(planId, phaseId), {
      method: "PUT",
      body: payload,
    });
  },

  removePhase(planId, phaseId) {
    return authenticatedRequest(ENDPOINTS.DOCTOR_RECOVERY_PLANS.PHASE_BY_ID(planId, phaseId), { method: "DELETE" });
  },

  createNutrient(planId, phaseId, payload) {
    return authenticatedRequest(ENDPOINTS.DOCTOR_RECOVERY_PLANS.NUTRIENTS(planId, phaseId), {
      method: "POST",
      body: payload,
    });
  },

  updateNutrient(planId, phaseId, nutrientId, payload) {
    return authenticatedRequest(ENDPOINTS.DOCTOR_RECOVERY_PLANS.NUTRIENT_BY_ID(planId, phaseId, nutrientId), {
      method: "PUT",
      body: payload,
    });
  },

  removeNutrient(planId, phaseId, nutrientId) {
    return authenticatedRequest(ENDPOINTS.DOCTOR_RECOVERY_PLANS.NUTRIENT_BY_ID(planId, phaseId, nutrientId), { method: "DELETE" });
  },

  createFood(planId, phaseId, nutrientId, payload) {
    return authenticatedRequest(ENDPOINTS.DOCTOR_RECOVERY_PLANS.FOODS(planId, phaseId, nutrientId), {
      method: "POST",
      body: payload,
    });
  },

  updateFood(planId, phaseId, nutrientId, foodSourceId, payload) {
    return authenticatedRequest(ENDPOINTS.DOCTOR_RECOVERY_PLANS.FOOD_BY_ID(planId, phaseId, nutrientId, foodSourceId), {
      method: "PUT",
      body: payload,
    });
  },

  removeFood(planId, phaseId, nutrientId, foodSourceId) {
    return authenticatedRequest(ENDPOINTS.DOCTOR_RECOVERY_PLANS.FOOD_BY_ID(planId, phaseId, nutrientId, foodSourceId), { method: "DELETE" });
  },

  publish(planId) {
    return authenticatedRequest(ENDPOINTS.DOCTOR_RECOVERY_PLANS.PUBLISH(planId), { method: "POST" });
  },
};
