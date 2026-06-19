import { apiRequest } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

export const icdChaptersApi = {
  list() {
    return apiRequest(ENDPOINTS.ICD_CHAPTERS.BASE, { auth: true });
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
