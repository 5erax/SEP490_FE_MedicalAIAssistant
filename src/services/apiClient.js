import {
  getApiStatusMessage,
  localizeApiPayload,
} from "./apiMessageTranslator";

// Ở môi trường production, frontend gọi API cùng origin thông qua
// /api/proxy.js để tránh mixed-content và giảm vấn đề CORS.
const API_BASE_URL = import.meta.env.DEV
  ? (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "")
  : "";

const API_PROXY_PATH = "/api/proxy.js";
const AUTH_STORAGE_KEY = "medimate.auth";

function buildUrl(path) {
  const normalizedPath = String(path ?? "").trim();

  if (!normalizedPath) {
    throw new TypeError("Đường dẫn API không được để trống.");
  }

  if (/^https?:\/\//i.test(normalizedPath)) {
    return normalizedPath;
  }

  if (!import.meta.env.DEV) {
    const queryIndex = normalizedPath.indexOf("?");

    const pathname =
      queryIndex >= 0
        ? normalizedPath.slice(0, queryIndex)
        : normalizedPath;

    const query =
      queryIndex >= 0
        ? normalizedPath.slice(queryIndex + 1)
        : "";

    const targetPath = pathname
      .replace(/^\/api\/?/, "")
      .replace(/^\/+/, "");

    const querySuffix = query ? `&${query}` : "";

    return `${API_PROXY_PATH}?path=${encodeURIComponent(
      targetPath,
    )}${querySuffix}`;
  }

  return `${API_BASE_URL}${normalizedPath}`;
}

function canUseLocalStorage() {
  return (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined"
  );
}

function parseStoredAuth() {
  if (!canUseLocalStorage()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(
      AUTH_STORAGE_KEY,
    );

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
    patientOnboardingPending:
      auth.patientOnboardingPending,
    isPremium: auth.isPremium,
    isSubscribed: auth.isSubscribed,
    hasPremiumAccess: auth.hasPremiumAccess,
    planName: auth.planName,
    subscriptionPlan: auth.subscriptionPlan,
    plan: auth.plan,
    subscriptionStatus:
      auth.subscriptionStatus ??
      auth.subscription?.status,
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

function normalizeApiText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

function getMessageComparisonKey(value) {
  return normalizeApiText(value)
    .toLocaleLowerCase("vi-VN")
    .replace(/[.!?,;:]+$/g, "")
    .trim();
}

/**
 * Thu gọn trường hợp backend hoặc tầng xử lý phía trước đã lặp nguyên
 * một thông báo nhiều lần liên tiếp.
 */
function collapseRepeatedMessage(value) {
  const text = normalizeApiText(value);

  if (!text) {
    return "";
  }

  const words = text.split(" ");

  const maximumRepeatCount = Math.min(
    4,
    words.length,
  );

  for (
    let repeatCount = maximumRepeatCount;
    repeatCount >= 2;
    repeatCount -= 1
  ) {
    if (words.length % repeatCount !== 0) {
      continue;
    }

    const partLength = words.length / repeatCount;

    if (partLength <= 0) {
      continue;
    }

    const parts = Array.from(
      { length: repeatCount },
      (_, index) =>
        words
          .slice(
            index * partLength,
            (index + 1) * partLength,
          )
          .join(" "),
    );

    const firstKey = getMessageComparisonKey(
      parts[0],
    );

    if (
      firstKey &&
      parts.every(
        (part) =>
          getMessageComparisonKey(part) === firstKey,
      )
    ) {
      return normalizeApiText(parts[0]);
    }
  }

  return text;
}

/**
 * Chuyển mọi cấu trúc lỗi từ backend thành một mảng thông báo phẳng.
 *
 * Hỗ trợ:
 * - Chuỗi.
 * - Mảng lồng nhau.
 * - Object validation theo tên trường.
 */
function flattenApiMessages(value) {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) =>
      flattenApiMessages(item),
    );
  }

  if (typeof value === "object") {
    return Object.values(value).flatMap((item) =>
      flattenApiMessages(item),
    );
  }

  const message = collapseRepeatedMessage(value);

  return message ? [message] : [];
}

function getUniqueMessages(messages) {
  const uniqueMessages = [];
  const seenKeys = new Set();

  for (const rawMessage of messages) {
    const message = collapseRepeatedMessage(
      rawMessage,
    );

    const key = getMessageComparisonKey(message);

    if (!message || !key || seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);
    uniqueMessages.push(message);
  }

  return uniqueMessages;
}

/**
 * Ưu tiên lỗi cụ thể thay vì nối thêm thông báo nghiệp vụ chung.
 *
 * Ví dụ backend trả:
 * - message: "Đặt lại mật khẩu thất bại."
 * - errors: [
 *     "Mật khẩu phải có ít nhất một ký tự đặc biệt.",
 *     "Mật khẩu phải có ít nhất một chữ cái viết hoa."
 *   ]
 *
 * Giao diện chỉ hiển thị hai lỗi cụ thể để người dùng biết cần sửa gì.
 */
function getApiErrorMessage(payload, status) {
  const detailedMessages = getUniqueMessages([
    ...flattenApiMessages(payload?.errors),
    ...flattenApiMessages(payload?.error),
    ...flattenApiMessages(payload?.detail),
  ]);

  if (detailedMessages.length > 0) {
    return detailedMessages.join(" ");
  }

  const primaryMessages = getUniqueMessages([
    ...flattenApiMessages(payload?.message),
    ...flattenApiMessages(payload?.title),
  ]);

  if (primaryMessages.length > 0) {
    return primaryMessages[0];
  }

  return (
    getApiStatusMessage(status) ||
    `Yêu cầu thất bại với mã ${status}`
  );
}

function hasHeader(headers, name) {
  return headers.has(name);
}

function isFormData(value) {
  return (
    typeof FormData !== "undefined" &&
    value instanceof FormData
  );
}

function isUrlSearchParams(value) {
  return (
    typeof URLSearchParams !== "undefined" &&
    value instanceof URLSearchParams
  );
}

function isBlob(value) {
  return (
    typeof Blob !== "undefined" &&
    value instanceof Blob
  );
}

function isArrayBuffer(value) {
  return (
    typeof ArrayBuffer !== "undefined" &&
    value instanceof ArrayBuffer
  );
}

function prepareRequestBody(body, requestHeaders) {
  if (body === undefined) {
    return undefined;
  }

  if (
    typeof body === "string" ||
    isFormData(body) ||
    isUrlSearchParams(body) ||
    isBlob(body) ||
    isArrayBuffer(body)
  ) {
    return body;
  }

  if (!hasHeader(requestHeaders, "Content-Type")) {
    requestHeaders.set(
      "Content-Type",
      "application/json",
    );
  }

  return JSON.stringify(body);
}

function createApiError({
  message,
  status,
  payload,
  originalPayload,
  cause,
}) {
  const error = new Error(message);

  error.name = "ApiError";
  error.status = status;
  error.payload = payload;

  /*
   * Không đưa payload thô từ backend vào lỗi production vì payload
   * có thể chứa dữ liệu tài khoản hoặc dữ liệu sức khỏe nhạy cảm.
   */
  if (import.meta.env.DEV) {
    error.originalPayload = originalPayload;
  }

  if (cause) {
    error.cause = cause;
  }

  return error;
}

function parseResponsePayload(text, responseOk) {
  if (!text) {
    return {
      success: responseOk,
    };
  }

  try {
    const parsed = JSON.parse(text);

    if (
      parsed !== null &&
      typeof parsed === "object"
    ) {
      return parsed;
    }

    return responseOk
      ? {
          success: true,
          data: parsed,
        }
      : {
          success: false,
          message: normalizeApiText(parsed),
        };
  } catch {
    if (responseOk) {
      return {
        success: true,
        data: text,
      };
    }

    return {
      success: false,
      message:
        "Dịch vụ đang phản hồi không ổn định. Vui lòng thử lại sau.",
    };
  }
}

export function getStoredAuth() {
  if (!canUseLocalStorage()) {
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
    window.localStorage.getItem(AUTH_STORAGE_KEY) !==
    serializedAuth
  ) {
    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      serializedAuth,
    );
  }

  return storedAuth;
}

export function setStoredAuth(auth) {
  if (!canUseLocalStorage() || !auth) {
    return;
  }

  const storedAuth = selectStoredAuth(auth);

  if (!storedAuth) {
    return;
  }

  window.localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify(storedAuth),
  );
}

export function clearStoredAuth() {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
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
  ).toLocaleLowerCase("vi-VN");

  const subscriptionStatus = String(
    auth?.subscriptionStatus ??
      auth?.subscription?.status ??
      "",
  ).toLocaleLowerCase("vi-VN");

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
  const normalizedPageNumber = Math.max(
    1,
    Number(pageNumber) || 1,
  );

  const normalizedPageSize = Math.max(
    1,
    Number(pageSize) || 10,
  );

  return new URLSearchParams({
    PageNumber: String(normalizedPageNumber),
    PageSize: String(normalizedPageSize),
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
    signal,
    cache,
    redirect,
  } = options;

  const requestHeaders = new Headers(headers);

  if (auth) {
    const token = getAccessToken();

    if (token) {
      requestHeaders.set(
        "Authorization",
        `Bearer ${token}`,
      );
    }
  }

  const requestBody = prepareRequestBody(
    body,
    requestHeaders,
  );

  let response;

  try {
    response = await fetch(buildUrl(path), {
      method,
      headers: requestHeaders,
      credentials,
      body: requestBody,
      signal,
      cache,
      redirect,
    });
  } catch (cause) {
    const wasAborted = cause?.name === "AbortError";

    const message = wasAborted
      ? "Yêu cầu đã bị hủy."
      : getApiStatusMessage(0);

    const payload = {
      success: false,
      message,
    };

    throw createApiError({
      message,
      status: 0,
      payload,
      originalPayload: null,
      cause,
    });
  }

  const text = await response.text();

  const rawPayload = parseResponsePayload(
    text,
    response.ok,
  );

  /*
   * Chỉ Việt hóa các trường thông báo.
   *
   * Không dịch hoặc biến đổi `data` vì trường này có thể chứa:
   * - Hồ sơ sức khỏe.
   * - Triệu chứng do người dùng nhập.
   * - Kết quả xét nghiệm.
   * - Kết quả phân tích y tế.
   * - Nội dung tư vấn hoặc cảnh báo.
   */
  const payload = localizeApiPayload(
    rawPayload,
    response.status,
  );

  const requestSucceeded =
    response.ok &&
    payload?.success !== false;

  if (!requestSucceeded) {
    const message = getApiErrorMessage(
      payload,
      response.status,
    );

    throw createApiError({
      message,
      status: response.status,
      payload,
      originalPayload: rawPayload,
    });
  }

  return payload;
}