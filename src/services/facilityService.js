import { apiRequest, withPagination } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

export const medicalFacilitiesApi = {
  list(pageNumber = 1, pageSize = 50, filters = {}) {
    const params = new URLSearchParams(withPagination(pageNumber, pageSize));
    if (filters.search?.trim()) params.set("search", filters.search.trim());
    if (filters.isActive !== "" && filters.isActive !== undefined && filters.isActive !== null) {
      params.set("isActive", String(filters.isActive));
    }
    return apiRequest(`${ENDPOINTS.MEDICAL_FACILITIES.BASE}?${params.toString()}`);
  },

  active(filters = {}) {
    const params = new URLSearchParams();
    if (filters.departmentId) params.set("departmentId", filters.departmentId);
    if (filters.search) params.set("search", filters.search);
    const query = params.toString();
    return apiRequest(`${ENDPOINTS.MEDICAL_FACILITIES.ACTIVE}${query ? `?${query}` : ""}`);
  },

  nearby({ latitude, longitude, radiusKm = 7, departmentId, limit = 20 } = {}) {
    const params = new URLSearchParams();
    const lat = Number(latitude);
    const lng = Number(longitude);
    const radius = Number(radiusKm);
    const resultLimit = Number(limit);
    if (Number.isFinite(lat)) params.set("latitude", String(lat));
    if (Number.isFinite(lng)) params.set("longitude", String(lng));
    if (Number.isFinite(radius) && radius > 0) params.set("radiusKm", String(radius));
    if (departmentId) params.set("departmentId", departmentId);
    if (Number.isFinite(resultLimit) && resultLimit > 0) params.set("limit", String(resultLimit));
    return apiRequest(`${ENDPOINTS.MEDICAL_FACILITIES.NEARBY}?${params.toString()}`);
  },

  topRated({ departmentId, limit = 5 } = {}) {
    const params = new URLSearchParams();
    const resultLimit = Number(limit);
    if (departmentId) params.set("departmentId", departmentId);
    if (Number.isFinite(resultLimit) && resultLimit > 0) params.set("limit", String(resultLimit));
    const query = params.toString();
    return apiRequest(`${ENDPOINTS.MEDICAL_FACILITIES.TOP_RATED}${query ? `?${query}` : ""}`);
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
