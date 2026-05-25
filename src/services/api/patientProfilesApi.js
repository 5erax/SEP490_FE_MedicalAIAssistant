import { apiRequest } from "./httpClient";
import { withPagination } from "./query";

export const patientProfilesApi = {
  list(pageNumber = 1, pageSize = 50) {
    return apiRequest(`/api/patient-profiles?${withPagination(pageNumber, pageSize)}`, { auth: true });
  },

  get(id) {
    return apiRequest(`/api/patient-profiles/${id}`, { auth: true });
  },

  create(payload) {
    return apiRequest("/api/patient-profiles", {
      method: "POST",
      body: payload,
      auth: true,
    });
  },

  update(id, payload) {
    return apiRequest(`/api/patient-profiles/${id}`, {
      method: "PUT",
      body: payload,
      auth: true,
    });
  },

  remove(id) {
    return apiRequest(`/api/patient-profiles/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },
};
