import { getApiErrorCode } from "./apiError";

export const SERVICE_CREDIT_CODE = "SERVICE_CREDIT";

export const CREDIT_ERRORS = Object.freeze({
  NO_PACKAGE: "NO_CREDIT_PACKAGE",
  EXHAUSTED: "SERVICE_CREDIT_EXHAUSTED",
  NOT_CONFIGURED: "SERVICE_CREDIT_NOT_CONFIGURED",
  MUTATION_FAILED: "QUOTA_MUTATION_FAILED",
});

const CREDIT_ERROR_CODES = new Set(Object.values(CREDIT_ERRORS));

const CREDIT_ERROR_PRESENTATIONS = Object.freeze({
  [CREDIT_ERRORS.NO_PACKAGE]: Object.freeze({
    tone: "warning",
    title: "Bạn chưa có lượt sử dụng",
    message: "Hãy mua gói lượt để bắt đầu dịch vụ này.",
    action: "purchase",
    actionLabel: "Mua gói",
  }),
  [CREDIT_ERRORS.EXHAUSTED]: Object.freeze({
    tone: "warning",
    title: "Bạn đã dùng hết lượt",
    message: "Mua thêm lượt để tiếp tục sử dụng các dịch vụ MediMate.",
    action: "purchase",
    actionLabel: "Mua thêm lượt",
  }),
  [CREDIT_ERRORS.NOT_CONFIGURED]: Object.freeze({
    tone: "error",
    title: "Dịch vụ lượt dùng chưa sẵn sàng",
    message: "Hệ thống chưa thể kiểm tra cấu hình lượt dùng. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.",
    action: "retry",
    actionLabel: "Thử lại",
  }),
  [CREDIT_ERRORS.MUTATION_FAILED]: Object.freeze({
    tone: "error",
    title: "Chưa thể cập nhật lượt dùng",
    message: "Trạng thái lượt dùng chưa được cập nhật nhất quán. Vui lòng tải lại trước khi thử tiếp.",
    action: "retry",
    actionLabel: "Tải lại",
  }),
});

function normalizeCode(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function toCount(value, fallback = 0) {
  const count = Number(value);
  return Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : fallback;
}

function unwrapData(source) {
  if (
    source
    && typeof source === "object"
    && !Array.isArray(source)
    && Object.prototype.hasOwnProperty.call(source, "data")
  ) {
    return source.data;
  }

  return source;
}

function selectBalanceCandidate(source) {
  const data = unwrapData(source);
  if (!Array.isArray(data)) return data;

  const serviceCredit = data.find(
    (item) => normalizeCode(item?.quotaCode ?? item?.code) === normalizeCode(SERVICE_CREDIT_CODE),
  );

  // Older deployments returned a one-item quota array. Keep that shape
  // readable during rollout, while always preferring SERVICE_CREDIT when it
  // is present alongside other quota types.
  return serviceCredit ?? data[0] ?? null;
}

export function normalizeServiceCreditBalance(source) {
  const candidate = selectBalanceCandidate(source);
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;

  const hasBalanceField = [
    "grantedCount",
    "limitValue",
    "usedCount",
    "reservedCount",
    "remainingCount",
  ].some((field) => candidate[field] !== undefined && candidate[field] !== null);

  if (!hasBalanceField) return null;

  const usedCount = toCount(candidate.usedCount);
  const reservedCount = toCount(candidate.reservedCount);
  const explicitRemaining = candidate.remainingCount !== undefined && candidate.remainingCount !== null;
  const remainingCount = explicitRemaining ? toCount(candidate.remainingCount) : null;
  const grantedFallback = usedCount + reservedCount + (remainingCount ?? 0);
  const grantedCount = toCount(candidate.grantedCount ?? candidate.limitValue, grantedFallback);

  return {
    quotaCode: SERVICE_CREDIT_CODE,
    grantedCount,
    usedCount,
    reservedCount,
    remainingCount: remainingCount ?? Math.max(0, grantedCount - usedCount - reservedCount),
  };
}

export function findServiceCreditQuota(plan) {
  const quotas = Array.isArray(plan?.quotas) ? plan.quotas : [];
  return quotas.find((quota) => (
    quota?.isActive !== false
    && normalizeCode(quota?.quotaCode ?? quota?.code) === normalizeCode(SERVICE_CREDIT_CODE)
  )) ?? null;
}

export function getServiceCreditLimit(plan) {
  const quota = findServiceCreditQuota(plan);
  if (!quota || quota.limitValue === null || quota.limitValue === undefined || quota.limitValue === "") {
    return null;
  }

  const limit = Number(quota.limitValue);
  return Number.isFinite(limit) ? Math.max(0, Math.trunc(limit)) : null;
}

export function getServiceCreditErrorCode(error) {
  const code = typeof error === "string" ? error : getApiErrorCode(error);
  return CREDIT_ERROR_CODES.has(code) ? code : "";
}

export function getServiceCreditErrorPresentation(error) {
  const code = getServiceCreditErrorCode(error);
  const presentation = CREDIT_ERROR_PRESENTATIONS[code];
  return presentation ? { code, ...presentation } : null;
}
