// Production uses same-origin /api so Vercel rewrites can avoid
// mixed-content and CORS issues.
const API_BASE_URL = import.meta.env.DEV
  ? (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "")
  : "";

const API_PROXY_PATH = "/api/proxy.js";
const AUTH_STORAGE_KEY = "medimate.auth";

function buildUrl(path) {
  if (path.startsWith("http")) {
    return path;
  }

  if (!import.meta.env.DEV) {
    const [pathname, query = ""] = path.split("?");

    const targetPath = pathname
      .replace(/^\/api\/?/, "")
      .replace(/^\/+/, "");

    const queryPrefix = query ? `&${query}` : "";

    return `${API_PROXY_PATH}?path=${encodeURIComponent(
      targetPath,
    )}${queryPrefix}`;
  }

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

function selectStoredAuth(auth) {
  if (!auth || typeof auth !== "object") {
    return null;
  }

  return {
    accessToken: auth.accessToken,
    userId: auth.userId,
    identityId: auth.identityId,
    email: auth.email,
    username: auth.username,
    displayName: auth.displayName,
    fullName: auth.fullName,
    name: auth.name,
    avatarUrl: auth.avatarUrl,
    avatar: auth.avatar,
    picture: auth.picture,
    photoUrl: auth.photoUrl,
    imageUrl: auth.imageUrl,
    profilePictureUrl: auth.profilePictureUrl,
    roles: auth.roles,
    role: auth.role,
    expiresAtUtc: auth.expiresAtUtc,
    firstLogin: auth.firstLogin,
    isFirstLogin: auth.isFirstLogin,
    isProfileCompleted: auth.isProfileCompleted,
    patientOnboardingPending: auth.patientOnboardingPending,
    isPremium: auth.isPremium,
    isSubscribed: auth.isSubscribed,
    hasPremiumAccess: auth.hasPremiumAccess,
    planName: auth.planName,
    subscriptionPlan: auth.subscriptionPlan,
    plan: auth.plan,
    subscriptionStatus: auth.subscriptionStatus,
  };
}

function decodeJwtPayload(token) {
  try {
    const payload = String(token).split(".")[1];

    if (!payload) {
      return null;
    }

    const normalized = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const padded = normalized.padEnd(
      normalized.length +
      ((4 - (normalized.length % 4)) % 4),
      "=",
    );

    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function isExpiredToken(token) {
  const payload = decodeJwtPayload(token);

  if (!payload?.exp) {
    return false;
  }

  return Number(payload.exp) * 1000 <= Date.now();
}

function isUsableAuth(auth) {
  return (
    Boolean(auth?.accessToken) &&
    !isExpiredToken(auth.accessToken)
  );
}

/**
 * Chuyển các dạng errors từ backend thành một chuỗi có thể hiển thị.
 *
 * Hỗ trợ:
 * - string
 * - string[]
 * - object chứa string hoặc string[]
 */
function formatApiErrors(errors) {
  if (!errors) {
    return "";
  }

  if (Array.isArray(errors)) {
    return errors
      .map((value) => normalizeErrorText(value))
      .filter(Boolean)
      .join(", ");
  }

  if (typeof errors === "string") {
    return normalizeErrorText(errors);
  }

  if (typeof errors === "object") {
    return Object.values(errors)
      .flatMap((value) =>
        Array.isArray(value) ? value : [value],
      )
      .map((value) => normalizeErrorText(value))
      .filter(Boolean)
      .join(", ");
  }

  return "";
}

/**
 * Chuẩn hóa khoảng trắng để việc so sánh thông báo ổn định hơn.
 */
function normalizeErrorText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * So sánh hai thông báo mà không phân biệt hoa thường.
 */
function normalizeErrorForComparison(value) {
  return normalizeErrorText(value)
    .toLocaleLowerCase("vi-VN")
    .replace(/[.!?,;:]+$/g, "")
    .trim();
}

/**
 * Tạo thông báo lỗi cuối cùng mà không lặp message và errors.
 *
 * Ví dụ backend trả:
 *
 * {
 *   message: "Email đã tồn tại",
 *   errors: ["Email đã tồn tại"]
 * }
 *
 * Kết quả chỉ còn:
 *
 * "Email đã tồn tại"
 */
function getApiErrorMessage(payload, status) {
  const message = normalizeErrorText(payload?.message);
  const errors = formatApiErrors(payload?.errors);
  const title = normalizeErrorText(payload?.title);

  if (message && errors) {
    const normalizedMessage =
      normalizeErrorForComparison(message);

    const normalizedErrors =
      normalizeErrorForComparison(errors);

    // Hai nội dung giống hoàn toàn.
    if (normalizedMessage === normalizedErrors) {
      return message;
    }

    // errors đã chứa toàn bộ message.
    if (normalizedErrors.includes(normalizedMessage)) {
      return errors;
    }

    // message đã chứa toàn bộ errors.
    if (normalizedMessage.includes(normalizedErrors)) {
      return message;
    }

    // Hai nội dung thực sự khác nhau thì vẫn hiển thị cả hai.
    return `${message} ${errors}`;
  }

  return (
    message ||
    errors ||
    title ||
    `Yêu cầu thất bại với mã ${status}`
  );
}

export function getStoredAuth() {
  if (typeof window === "undefined") {
    return null;
  }

  const auth = parseStoredAuth();

  if (!isUsableAuth(auth)) {
    clearStoredAuth();
    return null;
  }

  const storedAuth = selectStoredAuth(auth);
  const serializedAuth = JSON.stringify(storedAuth);

  if (
    localStorage.getItem(AUTH_STORAGE_KEY) !==
    serializedAuth
  ) {
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      serializedAuth,
    );
  }

  return storedAuth;
}

export function setStoredAuth(auth) {
  if (!auth) {
    return;
  }

  localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify(selectStoredAuth(auth)),
  );
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function isAuthenticated() {
  return Boolean(getStoredAuth());
}

export function hasPremiumAccess(
  auth = getStoredAuth(),
) {
  const planName = String(
    auth?.planName ??
    auth?.subscriptionPlan ??
    auth?.plan ??
    "",
  ).toLowerCase();

  const subscriptionStatus = String(
    auth?.subscriptionStatus ??
    auth?.subscription?.status ??
    "",
  ).toLowerCase();

  return Boolean(
    auth?.isPremium ||
    auth?.isSubscribed ||
    auth?.hasPremiumAccess ||
    planName.includes("premium") ||
    planName.includes("medimate+") ||
    subscriptionStatus === "active",
  );
}

export function getAccessToken() {
  return getStoredAuth()?.accessToken ?? "";
}

export function withPagination(
  pageNumber = 1,
  pageSize = 10,
) {
  return new URLSearchParams({
    PageNumber: String(pageNumber),
    PageSize: String(pageSize),
  }).toString();
}

export async function apiRequest(
  path,
  options = {},
) {
  const {
    method = "GET",
    body,
    auth = false,
    headers = {},
    credentials = "include",
  } = options;

  const requestHeaders = {
    ...headers,
  };

  if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = getAccessToken();

    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers: requestHeaders,
    credentials,
    body:
      body === undefined
        ? undefined
        : JSON.stringify(body),
  });

  const text = await response.text();

  let payload = {
    success: response.ok,
  };

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

  const ok =
    response.ok &&
    payload?.success !== false;

  if (!ok) {
    const error = new Error(
      getApiErrorMessage(
        payload,
        response.status,
      ),
    );

    error.status = response.status;
    error.payload = payload;

    throw error;
  }

  return payload;
}