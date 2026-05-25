import { apiRequest, normalizeAuthResponse, refreshStoredAuth } from "./httpClient";
import { normalizeUserRecord } from "./normalizers";

export const authApi = {
  async login(payload) {
    return normalizeAuthResponse(
      await apiRequest("/api/authentication/login", {
        method: "POST",
        body: payload,
      }),
    );
  },

  async register(payload) {
    return normalizeAuthResponse(
      await apiRequest("/api/authentication/register", {
        method: "POST",
        body: payload,
      }),
    );
  },

  async registerStaff(payload) {
    return normalizeAuthResponse(
      await apiRequest("/api/authentication/register/staff", {
        method: "POST",
        body: payload,
        auth: true,
      }),
    );
  },

  async googleLogin(credential) {
    return normalizeAuthResponse(
      await apiRequest("/api/authentication/google", {
        method: "POST",
        body: { credential },
      }),
    );
  },

  refresh() {
    return refreshStoredAuth();
  },

  logout() {
    return apiRequest("/api/authentication/logout", {
      method: "POST",
      auth: true,
    });
  },

  forgotPassword(email) {
    return apiRequest("/api/authentication/forgot-password", {
      method: "POST",
      body: { email },
    });
  },

  changePassword(payload) {
    return apiRequest("/api/authentication/change-password", {
      method: "POST",
      body: payload,
    });
  },

  me() {
    return apiRequest("/api/users/me", { auth: true }).then((response) => ({
      ...response,
      data: normalizeUserRecord(response.data),
    }));
  },

  updateUser(userId, payload) {
    return apiRequest(`/api/users/${userId}`, {
      method: "PUT",
      body: payload,
      auth: true,
    });
  },

  approveStaff(userId) {
    return apiRequest(`/api/authentication/${userId}/approve-staff`, {
      method: "POST",
      auth: true,
    });
  },
};
