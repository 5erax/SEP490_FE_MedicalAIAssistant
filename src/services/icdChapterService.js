import { apiRequest, withPagination } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

export const icdChaptersApi = {
  list(pageNumber = 1, pageSize = 10, filters = {}) {
    const params = new URLSearchParams(withPagination(pageNumber, pageSize));
    if (filters.search?.trim()) params.set("search", filters.search.trim());
    return apiRequest(`${ENDPOINTS.ICD_CHAPTERS.BASE}?${params.toString()}`, { auth: true });
  },

  get(id) {
    return apiRequest(ENDPOINTS.ICD_CHAPTERS.BY_ID(id), { auth: true });
  },

  create(payload) {
    return apiRequest(ENDPOINTS.ICD_CHAPTERS.BASE, {
      method: "POST",
      body: payload,
      auth: true,
    });
  },

  bulk(payload) {
    return apiRequest(ENDPOINTS.ICD_CHAPTERS.BULK, {
      method: "POST",
      body: Array.isArray(payload) ? { chapters: payload } : payload,
      auth: true,
    });
  },

  update(id, payload) {
    return apiRequest(ENDPOINTS.ICD_CHAPTERS.BY_ID(id), {
      method: "PUT",
      body: payload,
      auth: true,
    });
  },

  remove(id) {
    return apiRequest(ENDPOINTS.ICD_CHAPTERS.BY_ID(id), {
      method: "DELETE",
      auth: true,
    });
  },
};
