import { apiRequest, withPagination } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

export const labTestsApi = {
  analyze(payload) {
    return apiRequest(ENDPOINTS.LAB_TESTS.ANALYZE, {
      method: "POST",
      body: payload,
      auth: true,
    });
  },

  mySessions(pageNumber = 1, pageSize = 8, { status = "" } = {}) {
    const query = new URLSearchParams(withPagination(pageNumber, pageSize));
    if (status) query.set("status", status);
    return apiRequest(`${ENDPOINTS.LAB_TESTS.MY_SESSIONS}?${query}`, { auth: true });
  },

  get(sessionId) {
    return apiRequest(ENDPOINTS.LAB_TESTS.BY_SESSION(sessionId), { auth: true });
  },
};
