import { apiRequest } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

export const doctorInvitationsApi = {
  validate(token) {
    const normalizedToken = String(token ?? "").trim();
    if (!normalizedToken) {
      throw new Error("Invitation token is required.");
    }

    const params = new URLSearchParams({ token: normalizedToken });
    return apiRequest(`${ENDPOINTS.DOCTOR_INVITATIONS.VALIDATE}?${params.toString()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
  },

  register(payload) {
    return apiRequest(ENDPOINTS.DOCTOR_INVITATIONS.REGISTER, {
      method: "POST",
      body: payload,
    });
  },

  create(payload) {
    return apiRequest(ENDPOINTS.DOCTOR_INVITATIONS.ADMIN_CREATE, {
      method: "POST",
      body: payload,
      auth: true,
    });
  },

  // Admin-wide invitation listing (all invitations), used e.g. for pending-count stats.
  list(pageNumber = 1, pageSize = 1, { status = "", search = "" } = {}) {
    const query = new URLSearchParams({
      PageNumber: String(pageNumber),
      PageSize: String(pageSize),
    });
    if (status) query.set("status", status);
    if (search) query.set("search", search);
    return apiRequest(`${ENDPOINTS.DOCTOR_INVITATIONS.ADMIN_LIST}?${query.toString()}`, { auth: true });
  },

  revoke(id) {
    return apiRequest(ENDPOINTS.DOCTOR_INVITATIONS.ADMIN_REVOKE(id), {
      method: "POST",
      auth: true,
    });
  },
};
