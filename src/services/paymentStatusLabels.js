// Vietnamese display labels for the payment/subscription/provider status
// vocabularies documented in BE's "Chuẩn hóa payment status trên FE" doc.
//
// These read the machine-readable `status` / `subscriptionStatus` /
// `providerStatus` fields, never `statusName` - per the doc, statusName is a
// display-only string and must not drive any FE logic (including which
// label to show), since it can change wording independently of `status`.

const PAYMENT_STATUS_LABELS = {
  pending: "Đang chờ thanh toán",
  paid: "Đã thanh toán",
  failed: "Thanh toán thất bại",
  cancelled: "Đã hủy",
  canceled: "Đã hủy",
  refunded: "Đã hoàn tiền",
};

const SUBSCRIPTION_STATUS_LABELS = {
  pending: "Đang chờ kích hoạt",
  active: "Đang hoạt động",
  expired: "Đã hết hạn",
  cancelled: "Đã hủy",
  canceled: "Đã hủy",
};

const PROVIDER_STATUS_LABELS = {
  PENDING: "Đang chờ xác nhận",
  PROCESSING: "Đang xử lý",
  PAID: "Đã thanh toán",
  CANCELLED: "Đã hủy",
  UNDERPAID: "Thanh toán chưa đủ",
  EXPIRED: "Liên kết đã hết hạn",
  FAILED: "Thanh toán thất bại",
};

export function getPaymentStatusLabel(status, fallback = "") {
  return PAYMENT_STATUS_LABELS[String(status ?? "").toLowerCase()] ?? fallback;
}

export function getPaymentAmountLabel(status) {
  return String(status ?? "").toLowerCase() === "paid" ? "Đã thanh toán" : "Số tiền giao dịch";
}

export function getSubscriptionStatusLabel(status, fallback = "") {
  return SUBSCRIPTION_STATUS_LABELS[String(status ?? "").toLowerCase()] ?? fallback;
}

export function getProviderStatusLabel(providerStatus, fallback = "") {
  return PROVIDER_STATUS_LABELS[String(providerStatus ?? "").toUpperCase()] ?? fallback;
}
