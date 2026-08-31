import { apiRequest, withPagination } from "./apiClient";
import { ENDPOINTS } from "./endpoints";
import { buildNearbyQuery } from "../utils/nearbyFacilities";

export const medicalFacilitiesApi = {
  nearby(filters, signal) {
    return apiRequest(`${ENDPOINTS.MEDICAL_FACILITIES.NEARBY}?${buildNearbyQuery(filters)}`, { signal, cache: "no-store" });
  },
  list(pageNumber = 1, pageSize = 50, filters = {}) {
    const params = new URLSearchParams(withPagination(pageNumber, pageSize));
    if (filters.search?.trim()) params.set("search", filters.search.trim());
    if (filters.isActive !== "" && filters.isActive !== undefined && filters.isActive !== null) {
      params.set("isActive", String(filters.isActive));
    }
    return apiRequest(`${ENDPOINTS.MEDICAL_FACILITIES.BASE}?${params.toString()}`);
  },

  active(filters = {}, options = {}) {
    const params = new URLSearchParams();
    if (filters.departmentId) params.set("departmentId", filters.departmentId);
    if (filters.search) params.set("search", filters.search);
    const query = params.toString();
    return apiRequest(`${ENDPOINTS.MEDICAL_FACILITIES.ACTIVE}${query ? `?${query}` : ""}`, options);
  },

  get(id) {
    return apiRequest(ENDPOINTS.MEDICAL_FACILITIES.BY_ID(id));
  },

  create(payload) {
    return apiRequest(ENDPOINTS.MEDICAL_FACILITIES.BASE, {
      method: "POST",
      body: payload,
      auth: true,
    });
  },

  update(id, payload) {
    return apiRequest(ENDPOINTS.MEDICAL_FACILITIES.BY_ID(id), {
      method: "PUT",
      body: payload,
      auth: true,
    });
  },

  setStatus(id, isActive) {
    return apiRequest(ENDPOINTS.MEDICAL_FACILITIES.STATUS(id), {
      method: "PATCH",
      body: { isActive },
      auth: true,
    });
  },

  remove(id) {
    return apiRequest(ENDPOINTS.MEDICAL_FACILITIES.BY_ID(id), {
      method: "DELETE",
      auth: true,
    });
  },
};
