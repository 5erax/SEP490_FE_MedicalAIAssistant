import { apiRequest, withPagination } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

export const clinicalQuestionsApi = {
  list(pageNumber = 1, pageSize = 20) {
    return apiRequest(`${ENDPOINTS.CLINICAL_QUESTIONS.BASE}?${withPagination(pageNumber, pageSize)}`);
  },

  get(id) {
    return apiRequest(ENDPOINTS.CLINICAL_QUESTIONS.BY_ID(id));
  },
  create(payload) {
    return apiRequest(ENDPOINTS.CLINICAL_QUESTIONS.BASE, { method: "POST", body: payload, auth: true });
  },
  update(id, payload) {
    return apiRequest(ENDPOINTS.CLINICAL_QUESTIONS.BY_ID(id), { method: "PUT", body: payload, auth: true });
  },
  remove(id) {
    return apiRequest(ENDPOINTS.CLINICAL_QUESTIONS.BY_ID(id), { method: "DELETE", auth: true });
  },
};
