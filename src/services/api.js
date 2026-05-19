const DIRECT_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const API_BASE_URL = import.meta.env.DEV ? DIRECT_API_BASE_URL : "";
const AUTH_STORAGE_KEY = "medimate.auth";

function buildUrl(path) {
  if (path.startsWith("http")) return path;
  return `${API_BASE_URL}${path}`;
}

function parseStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getStoredAuth() {
  if (typeof window === "undefined") return null;
  return parseStoredAuth();
}

export function setStoredAuth(auth) {
  if (!auth) return;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getAccessToken() {
  return getStoredAuth()?.accessToken ?? "";
}

function normalizeAuthResponse(response) {
  const authData = response?.data ?? response;
  if (authData?.accessToken) {
    setStoredAuth(authData);
  }
  return response;
}

export async function apiRequest(path, options = {}) {
  const { method = "GET", body, auth = false, headers = {} } = options;
  const requestHeaders = { ...headers };

  if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = getAccessToken();
    if (token) requestHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers: requestHeaders,
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let payload = { success: response.ok };

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = {
        success: false,
        message:
          "Dịch vụ đang phản hồi không ổn định. Vui lòng thử lại sau.",
      };
    }
  }
  const ok = response.ok && payload.success !== false;

  if (!ok) {
    const message =
      payload?.message ||
      payload?.errors?.join(", ") ||
      `Yêu cầu thất bại với mã ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

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
    return apiRequest("/api/authentication/refresh", {
      method: "POST",
      auth: true,
    }).then(normalizeAuthResponse);
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
    return apiRequest("/api/users/me", { auth: true });
  },

  updateUser(userId, payload) {
    return apiRequest(`/api/users/${userId}`, {
      method: "PUT",
      body: payload,
      auth: true,
    });
  },
};

export const medicalDepartmentsApi = {
  list() {
    return apiRequest("/api/medical-departments");
  },

  get(id) {
    return apiRequest(`/api/medical-departments/${id}`);
  },

  create(payload) {
    return apiRequest("/api/medical-departments", {
      method: "POST",
      body: payload,
      auth: true,
    });
  },

  update(id, payload) {
    return apiRequest(`/api/medical-departments/${id}`, {
      method: "PUT",
      body: payload,
      auth: true,
    });
  },

  remove(id) {
    return apiRequest(`/api/medical-departments/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },
};

export const patientProfilesApi = {
  list(pageNumber = 1, pageSize = 50) {
    const params = new URLSearchParams({
      PageNumber: String(pageNumber),
      PageSize: String(pageSize),
    });
    return apiRequest(`/api/patient-profiles?${params.toString()}`, { auth: true });
  },

  get(id) {
    return apiRequest(`/api/patient-profiles/${id}`, { auth: true });
  },

  create(payload) {
    return apiRequest("/api/patient-profiles", {
      method: "POST",
      body: payload,
      auth: true,
    });
  },

  update(id, payload) {
    return apiRequest(`/api/patient-profiles/${id}`, {
      method: "PUT",
      body: payload,
      auth: true,
    });
  },

  remove(id) {
    return apiRequest(`/api/patient-profiles/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },
};

export const usersApi = {
  list(pageNumber = 1, pageSize = 10) {
    const params = new URLSearchParams({
      PageNumber: String(pageNumber),
      PageSize: String(pageSize),
    });
    return apiRequest(`/api/users?${params.toString()}`, { auth: true });
  },

  update(userId, payload) {
    return apiRequest(`/api/users/${userId}`, {
      method: "PUT",
      body: payload,
      auth: true,
    });
  },

  remove(userId) {
    return apiRequest(`/api/users/${userId}`, {
      method: "DELETE",
      auth: true,
    });
  },

  approve(userId) {
    return apiRequest(`/api/users/${userId}/approve`, {
      method: "POST",
      auth: true,
    });
  },
};
