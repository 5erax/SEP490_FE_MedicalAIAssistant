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

function decodeJwtPayload(token) {
  try {
    const payload = String(token).split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function isExpiredToken(token) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  return Number(payload.exp) * 1000 <= Date.now();
}

function isUsableAuth(auth) {
  return Boolean(auth?.accessToken);
}

export function getStoredAuth() {
  if (typeof window === "undefined") return null;
  const auth = parseStoredAuth();
  if (!isUsableAuth(auth)) {
    clearStoredAuth();
    return null;
  }
  return auth;
}

export function setStoredAuth(auth) {
  if (!auth) return;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function hasStoredAuthRecord() {
  if (typeof window === "undefined") return false;
  return Boolean(parseStoredAuth()?.accessToken);
}

export function isAuthenticated() {
  return Boolean(getStoredAuth());
}

export function hasPremiumAccess(auth = getStoredAuth()) {
  const planName = String(auth?.planName ?? auth?.subscriptionPlan ?? auth?.plan ?? "").toLowerCase();
  const subscriptionStatus = String(auth?.subscriptionStatus ?? auth?.subscription?.status ?? "").toLowerCase();
  const roles = Array.isArray(auth?.roles) ? auth.roles.map((role) => String(role).toLowerCase()) : [];

  return Boolean(
    auth?.isPremium ||
    auth?.isSubscribed ||
    auth?.hasPremiumAccess ||
    planName.includes("premium") ||
    planName.includes("medimate+") ||
    subscriptionStatus === "active" ||
    roles.includes("admin") ||
    roles.includes("staff")
  );
}

export function getAccessToken() {
  return parseStoredAuth()?.accessToken ?? "";
}

function normalizeAuthResponse(response) {
  const authData = response?.data ?? response;
  if (authData?.accessToken) {
    setStoredAuth(authData);
  }
  return response;
}

function withPagination(pageNumber = 1, pageSize = 10) {
  return new URLSearchParams({
    PageNumber: String(pageNumber),
    PageSize: String(pageSize),
  }).toString();
}

function toQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.set(key, String(value));
  });
  return query.toString();
}

function normalizeUserRecord(user) {
  if (!user || typeof user !== "object") return user;
  const id = user.id ?? user.userId ?? user.identityId ?? "";

  return {
    ...user,
    id,
    userId: user.userId ?? id,
    identityId: user.identityId ?? id,
    name: user.name ?? user.displayName ?? "",
  };
}

function normalizePagedUsers(response) {
  const data = response?.data;
  if (!data?.items) return response;

  return {
    ...response,
    data: {
      ...data,
      items: data.items.map(normalizeUserRecord),
    },
  };
}

function formatApiErrors(errors) {
  if (!errors) return "";
  if (Array.isArray(errors)) return errors.filter(Boolean).join(", ");
  if (typeof errors === "string") return errors;
  if (typeof errors === "object") {
    return Object.values(errors)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter(Boolean)
      .join(", ");
  }
  return "";
}

async function refreshStoredAuth() {
  const response = await fetch(buildUrl("/api/authentication/refresh"), {
    method: "POST",
    credentials: "include",
  });

  const text = await response.text();
  let payload = { success: response.ok };

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = {
        success: false,
        message: "Không thể làm mới phiên đăng nhập. Vui lòng đăng nhập lại.",
      };
    }
  }

  const ok = response.ok && payload.success !== false;
  if (!ok) {
    const message =
      payload?.message ||
      formatApiErrors(payload?.errors) ||
      payload?.title ||
      `Không thể làm mới phiên đăng nhập với mã ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return normalizeAuthResponse(payload);
}

async function getFreshAccessToken() {
  const auth = parseStoredAuth();
  if (!auth?.accessToken) return "";
  if (!isExpiredToken(auth.accessToken)) return auth.accessToken;

  try {
    const response = await refreshStoredAuth();
    return (response.data ?? response)?.accessToken ?? "";
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      clearStoredAuth();
    }
    return "";
  }
}

export async function apiRequest(path, options = {}) {
  const { method = "GET", body, auth = false, headers = {} } = options;
  const requestHeaders = { ...headers };

  if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = await getFreshAccessToken();
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
      formatApiErrors(payload?.errors) ||
      payload?.title ||
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

export const medicalFacilitiesApi = {
  list(pageNumber = 1, pageSize = 50, filters = {}) {
    const query = toQuery({ PageNumber: pageNumber, PageSize: pageSize, ...filters });
    return apiRequest(`/api/medical-facilities?${query}`);
  },

  active(filters = {}) {
    const query = toQuery(filters);
    return apiRequest(`/api/medical-facilities/active${query ? `?${query}` : ""}`);
  },

  get(id) {
    return apiRequest(`/api/medical-facilities/${id}`);
  },

  create(payload) {
    return apiRequest("/api/medical-facilities", {
      method: "POST",
      body: payload,
      auth: true,
    });
  },

  update(id, payload) {
    return apiRequest(`/api/medical-facilities/${id}`, {
      method: "PUT",
      body: payload,
      auth: true,
    });
  },

  setStatus(id, isActive) {
    return apiRequest(`/api/medical-facilities/${id}/status`, {
      method: "PATCH",
      body: { isActive },
      auth: true,
    });
  },

  remove(id) {
    return apiRequest(`/api/medical-facilities/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },
};

export const doctorsApi = {
  list(pageNumber = 1, pageSize = 50, filters = {}) {
    const query = toQuery({ PageNumber: pageNumber, PageSize: pageSize, ...filters });
    return apiRequest(`/api/doctors?${query}`);
  },

  active(filters = {}) {
    const query = toQuery(filters);
    return apiRequest(`/api/doctors/active${query ? `?${query}` : ""}`);
  },

  get(id) {
    return apiRequest(`/api/doctors/${id}`);
  },

  create(payload) {
    return apiRequest("/api/doctors", {
      method: "POST",
      body: payload,
      auth: true,
    });
  },

  update(id, payload) {
    return apiRequest(`/api/doctors/${id}`, {
      method: "PUT",
      body: payload,
      auth: true,
    });
  },

  setStatus(id, isActive) {
    return apiRequest(`/api/doctors/${id}/status`, {
      method: "PATCH",
      body: { isActive },
      auth: true,
    });
  },

  remove(id) {
    return apiRequest(`/api/doctors/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },
};

export const patientProfilesApi = {
  list(pageNumber = 1, pageSize = 50) {
    return apiRequest(`/api/patient-profiles?${withPagination(pageNumber, pageSize)}`, { auth: true });
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
    return apiRequest(`/api/users?${withPagination(pageNumber, pageSize)}`, { auth: true }).then(normalizePagedUsers);
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
    return apiRequest(`/api/authentication/${userId}/approve-staff`, {
      method: "POST",
      auth: true,
    });
  },
};

export const subscriptionPlansApi = {
  list() {
    return apiRequest("/api/subscription-plans");
  },

  active() {
    return apiRequest("/api/subscription-plans/active");
  },

  get(id) {
    return apiRequest(`/api/subscription-plans/${id}`);
  },

  create(payload) {
    return apiRequest("/api/subscription-plans", {
      method: "POST",
      body: payload,
      auth: true,
    });
  },

  update(id, payload) {
    return apiRequest(`/api/subscription-plans/${id}`, {
      method: "PUT",
      body: payload,
      auth: true,
    });
  },

  setStatus(id, isActive) {
    return apiRequest(`/api/subscription-plans/${id}/status`, {
      method: "PATCH",
      body: { isActive },
      auth: true,
    });
  },

  remove(id) {
    return apiRequest(`/api/subscription-plans/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },
};

export const aiConfigsApi = {
  list(pageNumber = 1, pageSize = 20) {
    return apiRequest(`/api/ai-configs?${withPagination(pageNumber, pageSize)}`, { auth: true });
  },

  active() {
    return apiRequest("/api/ai-configs/active", { auth: true });
  },

  byTaskType(taskType) {
    return apiRequest(`/api/ai-configs/by-task-type/${encodeURIComponent(taskType)}`, { auth: true });
  },

  get(id) {
    return apiRequest(`/api/ai-configs/${id}`, { auth: true });
  },

  create(payload) {
    return apiRequest("/api/ai-configs", {
      method: "POST",
      body: payload,
      auth: true,
    });
  },

  update(id, payload) {
    return apiRequest(`/api/ai-configs/${id}`, {
      method: "PUT",
      body: payload,
      auth: true,
    });
  },

  setStatus(id, isActive) {
    return apiRequest(`/api/ai-configs/${id}/status`, {
      method: "PATCH",
      body: { isActive },
      auth: true,
    });
  },

  remove(id) {
    return apiRequest(`/api/ai-configs/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },
};

export const webChatbotApi = {
  message(message, { auth = false } = {}) {
    return apiRequest("/api/web-chatbot/message", {
      method: "POST",
      body: { message },
      auth,
    });
  },
};

export const symptomAnalysisApi = {
  analyze(message, { disclaimerShown = true, auth = false } = {}) {
    return apiRequest("/api/symptom-analysis/analyze", {
      method: "POST",
      body: { message, disclaimerShown },
      auth,
    });
  },

  get(sessionId, { auth = false } = {}) {
    return apiRequest(`/api/symptom-analysis/${sessionId}`, { auth });
  },
};
