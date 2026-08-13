import { translateApiMessage } from "./apiMessageTranslator";

function normalizeErrorCode(value) {
  const code = String(value ?? "").trim();
  return /^[A-Z][A-Z0-9_]+$/.test(code) ? code : "";
}

export function getApiErrorCode(error) {
  const payload = error?.payload ?? {};
  const candidates = [
    error?.code,
    payload.code,
    payload.errorCode,
    payload.data?.code,
    payload.data?.errorCode,
    ...(Array.isArray(payload.errors) ? payload.errors : []),
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object") {
      const nested = normalizeErrorCode(candidate.code ?? candidate.errorCode);
      if (nested) return nested;
      continue;
    }

    const normalized = normalizeErrorCode(candidate);
    if (normalized) return normalized;
  }

  return "";
}

// Stable error codes returned by POST /api/payments/payos-reconcile/{orderCode},
// per BE's "Chuẩn hóa API Payment cho Frontend" doc section 4.
const PAYMENT_RECONCILE_ERROR_MESSAGES = {
  INVALID_REQUEST: "Mã đơn hàng không hợp lệ.",
  UNAUTHENTICATED: "Vui lòng đăng nhập để tiếp tục.",
  PAYMENT_FORBIDDEN: "Bạn không có quyền truy cập giao dịch thanh toán này.",
  PAYMENT_NOT_FOUND: "Không tìm thấy giao dịch thanh toán.",
  PAYOS_PAYMENT_NOT_FOUND: "Không tìm thấy giao dịch tương ứng trên payOS.",
  PAYOS_RATE_LIMITED: "Đã gửi quá nhiều yêu cầu kiểm tra thanh toán. Vui lòng thử lại sau.",
  PAYOS_UNAVAILABLE: "payOS hiện không khả dụng. Vui lòng thử lại sau.",
  PAYOS_INVALID_RESPONSE: "Không thể xác minh trạng thái giao dịch từ payOS.",
  ORDER_CODE_MISMATCH: "Mã đơn hàng không khớp với giao dịch.",
  AMOUNT_MISMATCH: "Số tiền thanh toán không khớp.",
  PAYMENT_CONFLICT: "Không thể xác minh trạng thái thanh toán. Vui lòng thử lại.",
};

export function getPaymentReconcileErrorMessage(error, fallback) {
  const code = getApiErrorCode(error);
  return PAYMENT_RECONCILE_ERROR_MESSAGES[code] || fallback;
}

// Shared by endpoints that have no stable error codes yet: BE sends a
// generic "X failed." in `message` plus the real reason as a plain English
// sentence in errors[0]. Prefer the specific errors[0] string over message
// when translating, since apiClient concatenates both into error.message
// when they differ, which won't exact-match a single translation entry.
function getFirstErrorMessage(error, fallback) {
  const specific = Array.isArray(error?.payload?.errors) ? error.payload.errors[0] : "";
  return translateApiMessage(specific || error?.message, {
    status: error?.status,
    fallback,
  });
}

// POST /api/user-subscriptions/checkout
export function getCheckoutErrorMessage(error, fallback) {
  return getFirstErrorMessage(error, fallback);
}

// POST /api/admin/doctor-invitations - 403 may be returned by the
// authorization middleware without an ApiResponse body, so it's handled
// before falling back to message/errors[0] translation.
export function getDoctorInvitationErrorMessage(error, fallback) {
  if (error?.status === 403) {
    return "Bạn không có quyền tạo lời mời đăng ký bác sĩ.";
  }
  return getFirstErrorMessage(error, fallback);
}
