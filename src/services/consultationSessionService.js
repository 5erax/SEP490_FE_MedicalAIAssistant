import { apiRequest, withPagination } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

export const consultationSessionsApi = {
  generateQuestions(departmentId, symptoms) {
    return apiRequest(ENDPOINTS.CONSULTATION_SESSIONS.GENERATE_QUESTIONS, {
      method: "POST",
      auth: true,
      body: {
        departmentId,
        symptoms,
      },
    });
  },

  listMySessions(pageNumber = 1, pageSize = 10) {
    const params = withPagination(pageNumber, pageSize);
    return apiRequest(`${ENDPOINTS.CONSULTATION_SESSIONS.MY_SESSIONS}?${params}`, {
      auth: true,
    });
  },

  get(sessionId) {
    return apiRequest(ENDPOINTS.CONSULTATION_SESSIONS.BY_ID(sessionId), {
      auth: true,
    });
  },
};
