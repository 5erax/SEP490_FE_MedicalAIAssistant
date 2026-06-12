import { apiRequest } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

export const symptomAnalysisApi = {
  analyze(message) {
    return apiRequest(ENDPOINTS.SYMPTOM_ANALYSIS.ANALYZE, {
      method: "POST",
      body: { message, disclaimerShown: true },
      auth: true,
    });
  },

  get(sessionId) {
    return apiRequest(ENDPOINTS.SYMPTOM_ANALYSIS.BY_SESSION(sessionId), { auth: true });
  },
};
