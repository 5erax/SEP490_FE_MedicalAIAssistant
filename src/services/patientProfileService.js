import { apiRequest, withPagination } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

export const patientProfilesApi = {
  list(pageNumber = 1, pageSize = 50) {
    return apiRequest(`${ENDPOINTS.PATIENT_PROFILES.BASE}?${withPagination(pageNumber, pageSize)}`, { auth: true });
  },

  get(id) {
    return apiRequest(ENDPOINTS.PATIENT_PROFILES.BY_ID(id), { auth: true });
  },

  create(payload) {
    return apiRequest(ENDPOINTS.PATIENT_PROFILES.BASE, {
      method: "POST",
      body: payload,
      auth: true,
    });
  },

  update(id, payload) {
    return apiRequest(ENDPOINTS.PATIENT_PROFILES.BY_ID(id), {
      method: "PUT",
      body: payload,
      auth: true,
    });
  },

  remove(id) {
    return apiRequest(ENDPOINTS.PATIENT_PROFILES.BY_ID(id), {
      method: "DELETE",
      auth: true,
    });
  },
};
