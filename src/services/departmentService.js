import { apiRequest, withPagination } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

export const medicalDepartmentsApi = {
  list(pageNumber = 1, pageSize = 10, filters = {}) {
    const params = new URLSearchParams(withPagination(pageNumber, pageSize));
    if (filters.search?.trim()) params.set("search", filters.search.trim());
    return apiRequest(`${ENDPOINTS.MEDICAL_DEPARTMENTS.BASE}?${params.toString()}`, { auth: true });
  },

  listAll() {
    return apiRequest(ENDPOINTS.MEDICAL_DEPARTMENTS.BASE);
  },

  get(id) {
    return apiRequest(ENDPOINTS.MEDICAL_DEPARTMENTS.BY_ID(id));
  },

  create(payload) {
    return apiRequest(ENDPOINTS.MEDICAL_DEPARTMENTS.BASE, {
      method: "POST",
      body: payload,
      auth: true,
    });
  },

  update(id, payload) {
    return apiRequest(ENDPOINTS.MEDICAL_DEPARTMENTS.BY_ID(id), {
      method: "PUT",
      body: payload,
      auth: true,
    });
  },

  remove(id) {
    return apiRequest(ENDPOINTS.MEDICAL_DEPARTMENTS.BY_ID(id), {
      method: "DELETE",
      auth: true,
    });
  },
};
