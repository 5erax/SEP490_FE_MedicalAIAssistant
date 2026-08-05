function normalizeErrorCode(value) {
  const code = String(value ?? "").trim();
  return /^[A-Z][A-Z0-9_]+$/.test(code) ? code : "";
}

export function getApiErrorCode(error) {
  const payload = error?.payload ?? {};
  const candidates = [
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
