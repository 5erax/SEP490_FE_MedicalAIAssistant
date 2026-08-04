import {
  getApiStatusMessage,
  localizeApiPayload,
} from "./apiMessageTranslator";

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

    return raw
      ? JSON.parse(raw)
      : null;
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
 * Chuẩn hóa nội dung để hiển thị.
 */
function normalizeApiText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Chuẩn hóa nội dung để so sánh trùng lặp.
 *
 * Không phân biệt:
 * - Hoa/thường
 * - Dấu câu ở cuối
 * - Khoảng trắng thừa
 */
function getMessageComparisonKey(value) {
  return normalizeApiText(value)
    .toLocaleLowerCase("vi-VN")
    .replace(/[.!?,;:]+$/g, "")
    .trim();
}

/**
 * Xử lý trường hợp chính một chuỗi đã bị lặp liên tiếp.
 *
 * Ví dụ:
 * "Email đã tồn tại Email đã tồn tại"
 * trở thành:
 * "Email đã tồn tại"
 *
 * "Mã OTP không hợp lệ hoặc đã hết hạn
 *  Mã OTP không hợp lệ hoặc đã hết hạn"
 * trở thành:
 * "Mã OTP không hợp lệ hoặc đã hết hạn"
 */
function collapseRepeatedMessage(value) {
  const text = normalizeApiText(value);

  if (!text) {
    return "";
  }

  const words = text.split(" ");

  // Kiểm tra chuỗi bị lặp từ 4 lần xuống 2 lần.
  for (
    let repeatCount = Math.min(4, words.length);
    repeatCount >= 2;
    repeatCount -= 1
  ) {
    if (words.length % repeatCount !== 0) {
      continue;
    }

    const partLength = words.length / repeatCount;

    if (partLength === 0) {
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

    const firstPartKey =
      getMessageComparisonKey(parts[0]);

    if (!firstPartKey) {
      continue;
    }

    const allPartsAreEqual = parts.every(
      (part) =>
        getMessageComparisonKey(part) === firstPartKey,
    );

    if (allPartsAreEqual) {
      return normalizeApiText(parts[0]);
    }
  }

  return text;
}

/**
 * Chuyển errors từ backend thành mảng phẳng.
 *
 * Hỗ trợ:
 * - string
 * - string[]
 * - object
 * - object lồng nhau
 */
function flattenApiErrors(errors) {
  if (!errors) {
    return [];
  }

  if (Array.isArray(errors)) {
    return errors.flatMap((item) =>
      flattenApiErrors(item),
    );
  }

  if (typeof errors === "object") {
    return Object.values(errors).flatMap((item) =>
      flattenApiErrors(item),
    );
  }

  const message = collapseRepeatedMessage(errors);

  return message
    ? [message]
    : [];
}

/**
 * Xóa các thông báo trùng nhau.
 */
function getUniqueMessages(messages) {
  const uniqueMessages = [];
  const seenKeys = new Set();

  for (const rawMessage of messages) {
    const message =
      collapseRepeatedMessage(rawMessage);

    const key =
      getMessageComparisonKey(message);

    if (!message || !key || seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);
    uniqueMessages.push(message);
  }

  return uniqueMessages;
}

/**
 * Tạo thông báo lỗi cuối cùng.
 *
 * Tránh các trường hợp:
 *
 * message: "Email đã tồn tại"
 * errors: ["Email đã tồn tại"]
 *
 * hoặc:
 *
 * message:
 * "Mã OTP không hợp lệ hoặc đã hết hạn
 *  Mã OTP không hợp lệ hoặc đã hết hạn"
 */
function getApiErrorMessage(payload, status) {
  const message =
    collapseRepeatedMessage(payload?.message);

  const errors =
    flattenApiErrors(payload?.errors);

  const uniqueMessages = getUniqueMessages([
    message,
    ...errors,
  ]);

  if (uniqueMessages.length > 0) {
    return uniqueMessages.join(" ");
  }

  const title =
    collapseRepeatedMessage(payload?.title);

  return (
    title ||
    getApiStatusMessage(status) ||
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
    requestHeaders["Content-Type"] =
      "application/json";
  }

  if (auth) {
    const token = getAccessToken();

    if (token) {
      requestHeaders.Authorization =
        `Bearer ${token}`;
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

  let rawPayload = {
    success: response.ok,
  };

  if (text) {
    try {
      rawPayload = JSON.parse(text);
    } catch {
      rawPayload = {
        success: false,
        message:
          "Dịch vụ đang phản hồi không ổn định. Vui lòng thử lại sau.",
      };
    }
  }

  // Chỉ dịch message, title và errors.
  // Dữ liệu nghiệp vụ trong data vẫn được giữ nguyên.
  const payload = localizeApiPayload(
    rawPayload,
    response.status,
  );

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

    // Payload tiếng Việt cho component sử dụng.
    error.payload = payload;

    // Payload gốc từ backend để debug khi cần.
    error.originalPayload = rawPayload;

    throw error;
  }

  return payload;
}