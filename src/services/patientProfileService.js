import { apiRequest, withPagination } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

function unwrapPatientProfile(response) {
  if (!response || typeof response !== "object") return response ?? null;
  if (!("data" in response)) return response;

  const data = response.data;
  if (data && typeof data === "object" && "data" in data) return data.data;
  return data ?? null;
}

export const patientProfilesApi = {
  list(pageNumber = 1, pageSize = 50) {
    return apiRequest(`${ENDPOINTS.PATIENT_PROFILES.BASE}?${withPagination(pageNumber, pageSize)}`, { auth: true });
  },

  get(id) {
    return apiRequest(ENDPOINTS.PATIENT_PROFILES.BY_ID(id), { auth: true });
  },

  getByUserId(userId) {
    return apiRequest(ENDPOINTS.PATIENT_PROFILES.BY_USER(userId), { auth: true });
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

  async findByUserId(userId) {
    if (!userId) return null;

    try {
      const response = await this.getByUserId(userId);
      return unwrapPatientProfile(response);
    } catch (error) {
      if (error?.status === 404) return null;
      throw error;
    }
  },
};
