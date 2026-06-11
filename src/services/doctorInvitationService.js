import { apiRequest } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

export const doctorInvitationsApi = {
  validate(token) {
    const params = new URLSearchParams({ token });
    return apiRequest(`${ENDPOINTS.DOCTOR_INVITATIONS.VALIDATE}?${params.toString()}`);
  },

  register(payload) {
    return apiRequest(ENDPOINTS.DOCTOR_INVITATIONS.REGISTER, {
      method: "POST",
      body: payload,
    });
  },
};
