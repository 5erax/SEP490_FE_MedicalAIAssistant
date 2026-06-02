import { apiRequest } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

export const medicalDepartmentsApi = {
  list() {
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
