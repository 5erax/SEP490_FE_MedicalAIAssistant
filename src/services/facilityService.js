import { apiRequest, withPagination } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

export const medicalFacilitiesApi = {
  list(pageNumber = 1, pageSize = 50) {
    return apiRequest(`${ENDPOINTS.MEDICAL_FACILITIES.BASE}?${withPagination(pageNumber, pageSize)}`);
  },

  active() {
    return apiRequest(ENDPOINTS.MEDICAL_FACILITIES.ACTIVE);
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
