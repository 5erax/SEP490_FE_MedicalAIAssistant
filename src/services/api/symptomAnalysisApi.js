import { apiRequest } from "./httpClient";

export const symptomAnalysisApi = {
  analyze(message, { disclaimerShown = true, auth = false } = {}) {
    return apiRequest("/api/symptom-analysis/analyze", {
      method: "POST",
      body: { message, disclaimerShown },
      auth,
    });
  },

  get(sessionId, { auth = false } = {}) {
    return apiRequest(`/api/symptom-analysis/${sessionId}`, { auth });
  },
};
