import { apiRequest } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

export const symptomAnalysisApi = {
  analyze(message) {
    return this.suggestClinicalQuestions(message);
  },

  suggestClinicalQuestions(userInput) {
    return apiRequest(ENDPOINTS.SYMPTOM_ANALYSIS.SUGGEST_CLINICAL_QUESTIONS, {
      method: "POST",
      body: { userInput },
      auth: true,
    });
  },

  submitClinicalQuestionAnswers(sessionId, answers) {
    return apiRequest(ENDPOINTS.SYMPTOM_ANALYSIS.SUBMIT_CLINICAL_QUESTION_ANSWERS, {
      method: "POST",
      body: { sessionId, answers },
      auth: true,
    });
  },

  submitDiagnosis(sessionId, answers) {
    return apiRequest(ENDPOINTS.SYMPTOM_ANALYSIS.SUBMIT_DIAGNOSIS, {
      method: "POST",
      body: { sessionId, answers },
      auth: true,
    });
  },

  listMySessions(pageNumber = 1, pageSize = 10) {
    const search = new URLSearchParams({
      PageNumber: String(pageNumber),
      PageSize: String(pageSize),
    }).toString();
    return apiRequest(`${ENDPOINTS.SYMPTOM_ANALYSIS.MY_SESSIONS}?${search}`, { auth: true });
  },

  get(sessionId) {
    return apiRequest(ENDPOINTS.SYMPTOM_ANALYSIS.BY_SESSION(sessionId), { auth: true });
  },
};
