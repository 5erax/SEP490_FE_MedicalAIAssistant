import { apiRequest, withPagination } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

export const feedbackReviewsApi = {
  list(pageNumber = 1, pageSize = 20, filters = {}) {
    const params = new URLSearchParams(withPagination(pageNumber, pageSize));
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) params.set(key, String(value));
    });
    return apiRequest(`${ENDPOINTS.FEEDBACK_REVIEWS.BASE}?${params.toString()}`, { auth: true });
  },

  byFacility(facilityId, pageNumber = 1, pageSize = 20) {
    return apiRequest(
      `${ENDPOINTS.FEEDBACK_REVIEWS.BY_FACILITY(facilityId)}?${withPagination(pageNumber, pageSize)}`,
    );
  },

  get(id) {
    return apiRequest(ENDPOINTS.FEEDBACK_REVIEWS.BY_ID(id), { auth: true });
  },

  create(payload) {
    return apiRequest(ENDPOINTS.FEEDBACK_REVIEWS.BASE, {
      method: "POST",
      body: payload,
      auth: true,
    });
  },

  update(id, payload) {
    return apiRequest(ENDPOINTS.FEEDBACK_REVIEWS.BY_ID(id), {
      method: "PUT",
      body: payload,
      auth: true,
    });
  },

  setStatus(id, statusValue) {
    return apiRequest(ENDPOINTS.FEEDBACK_REVIEWS.STATUS(id), {
      method: "PATCH",
      body: { status: statusValue },
      auth: true,
    });
  },

  remove(id) {
    return apiRequest(ENDPOINTS.FEEDBACK_REVIEWS.BY_ID(id), {
      method: "DELETE",
      auth: true,
    });
  },
};
