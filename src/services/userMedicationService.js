import { apiRequest } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

export const userMedicationsApi = {
  list() {
    return apiRequest(ENDPOINTS.USER_MEDICATIONS.BASE, { auth: true });
  },

  get(medicationId) {
    return apiRequest(ENDPOINTS.USER_MEDICATIONS.BY_ID(medicationId), { auth: true });
  },

  create(payload) {
    return apiRequest(ENDPOINTS.USER_MEDICATIONS.BASE, {
      method: "POST",
      body: payload,
      auth: true,
    });
  },

  update(medicationId, payload) {
    return apiRequest(ENDPOINTS.USER_MEDICATIONS.BY_ID(medicationId), {
      method: "PUT",
      body: payload,
      auth: true,
    });
  },

  remove(medicationId) {
    return apiRequest(ENDPOINTS.USER_MEDICATIONS.BY_ID(medicationId), {
      method: "DELETE",
      auth: true,
    });
  },

  replaceReminders(medicationId, payload) {
    return apiRequest(ENDPOINTS.USER_MEDICATIONS.REMINDERS(medicationId), {
      method: "PUT",
      body: payload,
      auth: true,
    });
  },
};
