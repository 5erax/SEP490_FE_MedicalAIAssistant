import { apiRequest, withPagination } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

export const clinicalQuestionsApi = {
  list(pageNumber = 1, pageSize = 20) {
    return apiRequest(`${ENDPOINTS.CLINICAL_QUESTIONS.BASE}?${withPagination(pageNumber, pageSize)}`);
  },

  get(id) {
    return apiRequest(ENDPOINTS.CLINICAL_QUESTIONS.BY_ID(id));
  },
};
