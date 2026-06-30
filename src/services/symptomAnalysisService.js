import { apiRequest } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

const FALLBACK_ANSWER_OPTIONS = [
  ["yes", "Có"],
  ["no", "Không"],
];

export function getClinicalQuestionAnswerOptions(question) {
  const entries = Object.entries(question?.answers ?? {})
    .filter(([key]) => Boolean(String(key).trim()));

  if (entries.length > 0) {
    return entries.map(([key, label]) => [key, String(label || key)]);
  }

  return FALLBACK_ANSWER_OPTIONS;
}

export function buildClinicalQuestionAnswerItems(questions = [], selectedAnswers = {}) {
  return questions.map((question) => {
    const selected = selectedAnswers[question.questionId];
    const options = getClinicalQuestionAnswerOptions(question);

    return {
      questionId: question.questionId,
      answers: Object.fromEntries(options.map(([key, label], index) => {
        if (typeof selected === "boolean") {
          const normalized = `${key} ${label}`.toLowerCase();
          const isPositive = /\byes\b|\btrue\b|\bc[oó]\b/.test(normalized) || index === 0;
          const isNegative = /\bno\b|\bfalse\b|\bkh[oô]ng\b/.test(normalized) || index === 1;
          return [key, selected ? isPositive : isNegative];
        }

        return [key, selected === key];
      })),
    };
  });
}

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
