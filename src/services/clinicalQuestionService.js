import { apiRequest, withPagination } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

function firstMessage(value) {
  if (typeof value === "string") return value.trim();

  if (Array.isArray(value)) {
    for (const item of value) {
      const message = firstMessage(item);
      if (message) return message;
    }
  }

  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      const message = firstMessage(item);
      if (message) return message;
    }
  }

  return "";
}

export function getClinicalQuestionApiMessage(source, fallback = "") {
  const payload = source?.payload ?? source;

  return (
    firstMessage(payload?.message) ||
    firstMessage(payload?.errors) ||
    firstMessage(source?.message) ||
    fallback
  );
}

export const clinicalQuestionsApi = {
  list(pageNumber = 1, pageSize = 20, filters = {}) {
    const params = new URLSearchParams(withPagination(pageNumber, pageSize));
    if (filters.chapterId) params.set("chapterId", filters.chapterId);
    if (filters.search?.trim()) params.set("search", filters.search.trim());
    return apiRequest(`${ENDPOINTS.CLINICAL_QUESTIONS.BASE}?${params.toString()}`, { auth: true });
  },

  get(id) {
    return apiRequest(ENDPOINTS.CLINICAL_QUESTIONS.BY_ID(id), { auth: true });
  },
  create(payload) {
    return apiRequest(ENDPOINTS.CLINICAL_QUESTIONS.BASE, { method: "POST", body: payload, auth: true });
  },
  bulk(payload) {
    return apiRequest(ENDPOINTS.CLINICAL_QUESTIONS.BULK, {
      method: "POST",
      body: Array.isArray(payload) ? { questions: payload } : payload,
      auth: true,
    });
  },
  update(id, payload) {
    return apiRequest(ENDPOINTS.CLINICAL_QUESTIONS.BY_ID(id), { method: "PUT", body: payload, auth: true });
  },
  remove(id) {
    return apiRequest(ENDPOINTS.CLINICAL_QUESTIONS.BY_ID(id), { method: "DELETE", auth: true });
  },
};
