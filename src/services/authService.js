import { apiRequest, setStoredAuth } from "./apiClient";
import { ENDPOINTS } from "./endpoints";
import { normalizeUserRecord } from "./userService";

function normalizeAuthResponse(response) {
  const authData = response?.data ?? response;
  if (authData?.accessToken) {
    const isProfileCompleted = authData.isProfileCompleted === true;
    const isFirstLogin = isProfileCompleted
      ? false
      : authData.firstLogin === true || authData.isFirstLogin === true;
    const normalizedAuth = {
      ...authData,
      firstLogin: isFirstLogin,
      isFirstLogin,
      isProfileCompleted,
    };

    setStoredAuth(normalizedAuth);
    return response?.data
      ? { ...response, data: normalizedAuth }
      : normalizedAuth;
  }
  return response;
}

export const authApi = {
  async login(payload) {
    return normalizeAuthResponse(
      await apiRequest(ENDPOINTS.AUTH.LOGIN, {
        method: "POST",
        body: payload,
      }),
    );
  },

  async register(payload) {
    return normalizeAuthResponse(
      await apiRequest(ENDPOINTS.AUTH.REGISTER, {
        method: "POST",
        body: payload,
      }),
    );
  },

  async googleLogin(credential) {
    return normalizeAuthResponse(
      await apiRequest(ENDPOINTS.AUTH.GOOGLE, {
        method: "POST",
        body: { credential },
      }),
    );
  },

  refresh() {
    return apiRequest(ENDPOINTS.AUTH.REFRESH, {
      method: "POST",
      auth: true,
    }).then(normalizeAuthResponse);
  },

  logout() {
    return apiRequest(ENDPOINTS.AUTH.LOGOUT, {
      method: "POST",
      auth: true,
    });
  },

  forgotPassword(email) {
    return apiRequest(ENDPOINTS.AUTH.FORGOT_PASSWORD, {
      method: "POST",
      body: { email },
    });
  },

  changePassword(payload) {
    return apiRequest(ENDPOINTS.AUTH.CHANGE_PASSWORD, {
      method: "POST",
      body: payload,
    });
  },

  me() {
    return apiRequest(ENDPOINTS.USERS.ME, { auth: true }).then((response) => ({
      ...response,
      data: normalizeUserRecord(response.data),
    }));
  },

  updateUser(userId, payload) {
    return apiRequest(ENDPOINTS.USERS.BY_ID(userId), {
      method: "PUT",
      body: payload,
      auth: true,
    });
  },

};
