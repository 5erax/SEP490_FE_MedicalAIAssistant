import { apiRequest } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

export function registerStaffApplication(payload) {
  return apiRequest(ENDPOINTS.AUTH.REGISTER_STAFF, {
    method: "POST",
    body: payload,
  });
}
