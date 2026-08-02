import { apiRequest } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

const authenticatedRequest = (path, options = {}) => apiRequest(path, { ...options, auth: true });

export const userMedicationsApi = {
  list() {
    return authenticatedRequest(ENDPOINTS.USER_MEDICATIONS.BASE);
  },

  get(medicationId) {
    return authenticatedRequest(ENDPOINTS.USER_MEDICATIONS.BY_ID(medicationId));
  },

  create(payload) {
    return authenticatedRequest(ENDPOINTS.USER_MEDICATIONS.BASE, {
      method: "POST",
      body: payload,
    });
  },

  update(medicationId, payload) {
    return authenticatedRequest(ENDPOINTS.USER_MEDICATIONS.BY_ID(medicationId), {
      method: "PUT",
      body: payload,
    });
  },

  remove(medicationId) {
    return authenticatedRequest(ENDPOINTS.USER_MEDICATIONS.BY_ID(medicationId), {
      method: "DELETE",
    });
  },

  replaceReminders(medicationId, payload) {
    return authenticatedRequest(ENDPOINTS.USER_MEDICATIONS.REMINDERS(medicationId), {
      method: "PUT",
      body: payload,
    });
  },
};
