import { apiRequest } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

export const doctorInvitationsApi = {
  validate(token) {
    const normalizedToken = String(token ?? "").trim();
    if (!normalizedToken) {
      throw new Error("Invitation token is required.");
    }

    const params = new URLSearchParams({ token: normalizedToken });
    return apiRequest(`${ENDPOINTS.DOCTOR_INVITATIONS.VALIDATE}?${params.toString()}`);
  },

  register(payload) {
    return apiRequest(ENDPOINTS.DOCTOR_INVITATIONS.REGISTER, {
      method: "POST",
      body: payload,
    });
  },
};
