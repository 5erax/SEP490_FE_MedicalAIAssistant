import { apiRequest, withPagination } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

function firstMessage(value) {
  if (typeof value === "string") {
    return value.trim();
  }

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

export function getLabTestApiMessage(source, fallback = "") {
  const payload = source?.payload ?? source;

  return (
    firstMessage(payload?.message) ||
    firstMessage(payload?.errors) ||
    firstMessage(source?.message) ||
    fallback
  );
}

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

  // Admin-wide session listing (all users), unlike mySessions above.
  adminSessions(pageNumber = 1, pageSize = 1, { status = "" } = {}) {
    const query = new URLSearchParams(withPagination(pageNumber, pageSize));
    if (status) query.set("status", status);
    return apiRequest(`${ENDPOINTS.LAB_TESTS.SESSIONS}?${query}`, { auth: true });
  },
};
