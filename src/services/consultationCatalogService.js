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

export function getConsultationCatalogApiMessage(source, fallback = "") {
  const payload = source?.payload ?? source;
  return firstMessage(payload?.errors)
    || firstMessage(payload?.message)
    || firstMessage(source?.message)
    || fallback;
}

function createQuery(pageNumber, pageSize, filters = {}) {
  const params = new URLSearchParams(withPagination(pageNumber, pageSize));
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== "" && value !== null && value !== undefined) {
      params.set(key, typeof value === "string" ? value.trim() : String(value));
    }
  });
  return params.toString();
}

export const departmentConsultationQuestionsApi = {
  list(pageNumber = 1, pageSize = 10, filters = {}) {
    return apiRequest(`${ENDPOINTS.DEPARTMENT_CONSULTATION_QUESTIONS.BASE}?${createQuery(pageNumber, pageSize, filters)}`, { auth: true });
  },
  get(id) {
    return apiRequest(ENDPOINTS.DEPARTMENT_CONSULTATION_QUESTIONS.BY_ID(id), { auth: true });
  },
  create(payload) {
    return apiRequest(ENDPOINTS.DEPARTMENT_CONSULTATION_QUESTIONS.BASE, { method: "POST", body: payload, auth: true });
  },
  update(id, payload) {
    return apiRequest(ENDPOINTS.DEPARTMENT_CONSULTATION_QUESTIONS.BY_ID(id), { method: "PUT", body: payload, auth: true });
  },
  remove(id) {
    return apiRequest(ENDPOINTS.DEPARTMENT_CONSULTATION_QUESTIONS.BY_ID(id), { method: "DELETE", auth: true });
  },
  bulk(items) {
    return apiRequest(ENDPOINTS.DEPARTMENT_CONSULTATION_QUESTIONS.BULK, {
      method: "POST",
      body: Array.isArray(items) ? { questions: items } : items,
      auth: true,
    });
  },
};

export const checklistItemsApi = {
  list(pageNumber = 1, pageSize = 10, filters = {}) {
    return apiRequest(`${ENDPOINTS.CHECKLIST_ITEMS.BASE}?${createQuery(pageNumber, pageSize, filters)}`, { auth: true });
  },
  byDepartment(departmentId) {
    return apiRequest(ENDPOINTS.CHECKLIST_ITEMS.BY_DEPARTMENT(departmentId), { auth: true });
  },
  byFacility(facilityId) {
    return apiRequest(ENDPOINTS.CHECKLIST_ITEMS.BY_FACILITY(facilityId), { auth: true });
  },
  get(id) {
    return apiRequest(ENDPOINTS.CHECKLIST_ITEMS.BY_ID(id), { auth: true });
  },
  create(payload) {
    return apiRequest(ENDPOINTS.CHECKLIST_ITEMS.BASE, { method: "POST", body: payload, auth: true });
  },
  update(id, payload) {
    return apiRequest(ENDPOINTS.CHECKLIST_ITEMS.BY_ID(id), { method: "PUT", body: payload, auth: true });
  },
  remove(id) {
    return apiRequest(ENDPOINTS.CHECKLIST_ITEMS.BY_ID(id), { method: "DELETE", auth: true });
  },
  bulk(items) {
    return apiRequest(ENDPOINTS.CHECKLIST_ITEMS.BULK, {
      method: "POST",
      body: Array.isArray(items) ? { items } : items,
      auth: true,
    });
  },
};
