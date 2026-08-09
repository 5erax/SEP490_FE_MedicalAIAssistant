import { apiRequest, withPagination } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

export const consultationSessionsApi = {
  generateQuestions(payloadOrDepartmentId, symptoms = "") {
    const payload = payloadOrDepartmentId && typeof payloadOrDepartmentId === "object"
      ? payloadOrDepartmentId
      : { departmentId: payloadOrDepartmentId, symptoms };

    return apiRequest(ENDPOINTS.CONSULTATION_SESSIONS.GENERATE_QUESTIONS, {
      method: "POST",
      auth: true,
      body: payload,
    });
  },

  listMySessions(pageNumber = 1, pageSize = 10) {
    const params = withPagination(pageNumber, pageSize);
    return apiRequest(`${ENDPOINTS.CONSULTATION_SESSIONS.MY_SESSIONS}?${params}`, {
      auth: true,
    });
  },

  async listAllMySessions(pageSize = 50) {
    const firstResponse = await this.listMySessions(1, pageSize);
    const firstPage = firstResponse?.data ?? {};
    const firstItems = Array.isArray(firstPage)
      ? firstPage
      : Array.isArray(firstPage.items)
        ? firstPage.items
        : Array.isArray(firstPage.Items)
          ? firstPage.Items
          : [];
    const totalPages = Math.max(1, Number(firstPage.totalPages ?? firstPage.TotalPages) || 1);

    if (totalPages === 1) return firstItems;

    const remainingResponses = await Promise.all(
      Array.from(
        { length: totalPages - 1 },
        (_, index) => this.listMySessions(index + 2, pageSize),
      ),
    );
    const allItems = remainingResponses.reduce((items, response) => {
      const page = response?.data ?? {};
      const pageItems = Array.isArray(page)
        ? page
        : Array.isArray(page.items)
          ? page.items
          : Array.isArray(page.Items)
            ? page.Items
            : [];
      return items.concat(pageItems);
    }, firstItems);
    const seenSessionIds = new Set();

    return allItems.filter((session) => {
      const sessionId = session?.sessionId ?? session?.id ?? session?.consultationSessionId;
      if (!sessionId) return true;
      if (seenSessionIds.has(sessionId)) return false;
      seenSessionIds.add(sessionId);
      return true;
    });
  },

  get(sessionId) {
    return apiRequest(ENDPOINTS.CONSULTATION_SESSIONS.BY_ID(sessionId), {
      auth: true,
    });
  },

  registerReminder(sessionId, payload) {
    return apiRequest(ENDPOINTS.CONSULTATION_SESSIONS.REGISTER_REMINDER(sessionId), {
      method: "POST",
      auth: true,
      body: payload,
    });
  },

  getSummary(sessionId) {
    return apiRequest(ENDPOINTS.CONSULTATION_SESSIONS.SUMMARY(sessionId), {
      auth: true,
    });
  },

  complete(sessionId) {
    return apiRequest(ENDPOINTS.CONSULTATION_SESSIONS.COMPLETE(sessionId), {
      method: "POST",
      auth: true,
    });
  },
};
