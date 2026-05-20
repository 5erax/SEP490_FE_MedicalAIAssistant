import { apiRequest } from "./api";

export function registerStaffApplication(payload) {
  return apiRequest("/api/authentication/register/staff", {
    method: "POST",
    body: payload,
  });
}
