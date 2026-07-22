import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ReceiptText, RefreshCw, X } from "lucide-react";
import { Dialog } from "../ui";
import { paymentsApi } from "../../services/api";
import "../../styles/payment-history.css";

const PAGE_SIZE = 10;

const PAYMENT_STATUS = {
  pending: { label: "Đang chờ", tone: "warning" },
  paid: { label: "Đã thanh toán", tone: "success" },
  cancelled: { label: "Đã hủy", tone: "neutral" },
  canceled: { label: "Đã hủy", tone: "neutral" },
  failed: { label: "Thất bại", tone: "danger" },
};

function normalizePaymentPage(response, requestedPage) {
  const data = response?.data ?? {};
  const items = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
  const pageSize = Math.max(1, Number(data.pageSize) || PAGE_SIZE);
  const totalCount = Math.max(0, Number(data.totalCount) || items.length);
  const totalPages = Math.max(0, Number(data.totalPages) || Math.ceil(totalCount / pageSize));

  return {
    items,
    pageNumber: Math.max(1, Number(data.pageNumber) || requestedPage),
    pageSize,
    totalCount,
    totalPages,
  };
}

function getPaymentStatus(payment) {
  const rawStatus = String(payment?.statusName ?? payment?.status ?? "Đang xử lý").trim();
  const presentation = PAYMENT_STATUS[rawStatus.toLowerCase()];
  return presentation ?? { label: rawStatus || "Đang xử lý", tone: "neutral" };
}

function formatMoney(amount, currency = "VND") {
  const numericAmount = Number(amount);
  const normalizedCurrency = String(currency || "VND").toUpperCase();
  if (!Number.isFinite(numericAmount)) return "—";

  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: normalizedCurrency,
      maximumFractionDigits: normalizedCurrency === "VND" ? 0 : 2,
    }).format(numericAmount);
  } catch {
    return `${numericAmount.toLocaleString("vi-VN")} ${normalizedCurrency}`;
  }
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getHistoryErrorMessage(error) {
  if (error?.status === 401) {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để xem lịch sử thanh toán.";
  }
  return "Chưa thể tải lịch sử thanh toán. Vui lòng thử lại sau.";
}

function getDetailErrorMessage(error) {
  if (error?.status === 404) {
    return "Không tìm thấy giao dịch này hoặc bạn không có quyền xem giao dịch.";
  }
  if (error?.status === 401) {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }
  return "Chưa thể tải chi tiết giao dịch. Vui lòng thử lại sau.";
}

function PaymentStatusBadge({ payment }) {
  const status = getPaymentStatus(payment);
  return <span className={`payment-status payment-status-${status.tone}`}>{status.label}</span>;
}

function PaymentDetailDialog({ paymentId, summary, onClose, restoreFocusRef }) {
  const closeButtonRef = useRef(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    paymentsApi.getMyPayment(paymentId)
      .then((response) => {
        if (!active) return;
        setPayment(response?.data ?? null);
      })
      .catch((requestError) => {
        if (!active) return;
        setPayment(null);
        setError(getDetailErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [paymentId, reloadKey]);

  const visiblePayment = payment ?? summary;
  const title = visiblePayment?.planName || "Giao dịch MediMate+";

  return (
    <Dialog
      backdropClassName="payment-detail-backdrop"
      className="payment-detail-dialog"
      labelledBy="payment-detail-title"
      describedBy="payment-detail-description"
      onClose={onClose}
      initialFocusRef={closeButtonRef}
      restoreFocusRef={restoreFocusRef}
    >
      <header className="payment-detail-header">
        <div>
          <p>Chi tiết giao dịch</p>
          <h2 id="payment-detail-title">{title}</h2>
        </div>
        <button ref={closeButtonRef} type="button" aria-label="Đóng chi tiết giao dịch" onClick={onClose}>
          <X size={20} aria-hidden="true" />
        </button>
      </header>
      <p id="payment-detail-description" className="sr-only">
        Thông tin thanh toán của tài khoản hiện tại.
      </p>
      <div className="payment-detail-status" role="status" aria-atomic="true">
        {loading ? "Đang tải chi tiết giao dịch..." : error || "Chi tiết giao dịch đã tải xong."}
      </div>

      {loading ? (
        <div className="payment-history-state">
          <RefreshCw className="payment-history-spinner" size={28} aria-hidden="true" />
          <strong>Đang tải chi tiết</strong>
        </div>
      ) : error ? (
        <div className="payment-history-state payment-history-error">
          <strong>Không tải được chi tiết</strong>
          <p>{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setError("");
              setReloadKey((current) => current + 1);
            }}
          >
            <RefreshCw size={17} aria-hidden="true" />
            Thử lại
          </button>
        </div>
      ) : payment ? (
        <dl className="payment-detail-grid">
          <div className="payment-detail-wide">
            <dt>Mã thanh toán</dt>
            <dd>{payment.id || "—"}</dd>
          </div>
          <div>
            <dt>Gói dịch vụ</dt>
            <dd>{payment.planName || "—"}</dd>
          </div>
          <div>
            <dt>Trạng thái</dt>
            <dd><PaymentStatusBadge payment={payment} /></dd>
          </div>
          <div>
            <dt>Số tiền</dt>
            <dd>{formatMoney(payment.amount, payment.currency)}</dd>
          </div>
          <div>
            <dt>Tiền tệ</dt>
            <dd>{payment.currency || "VND"}</dd>
          </div>
          <div>
            <dt>Cổng thanh toán</dt>
            <dd>{payment.provider || "—"}</dd>
          </div>
          <div>
            <dt>Mã giao dịch</dt>
            <dd>{payment.transactionReference || "—"}</dd>
          </div>
          <div>
            <dt>Ngày tạo</dt>
            <dd><time dateTime={payment.createdAt || undefined}>{formatDateTime(payment.createdAt)}</time></dd>
          </div>
          <div>
            <dt>Ngày thanh toán</dt>
            <dd><time dateTime={payment.paidAt || undefined}>{formatDateTime(payment.paidAt)}</time></dd>
          </div>
          <div>
            <dt>Cập nhật lần cuối</dt>
            <dd><time dateTime={payment.updatedAt || undefined}>{formatDateTime(payment.updatedAt)}</time></dd>
          </div>
        </dl>
      ) : null}
    </Dialog>
  );
}

export default function PaymentHistoryPanel() {
  const detailTriggerRef = useRef(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [paymentPage, setPaymentPage] = useState(() => normalizePaymentPage(null, 1));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState(null);

  useEffect(() => {
    let active = true;

    paymentsApi.getMyPayments(pageNumber, PAGE_SIZE)
      .then((response) => {
        if (!active) return;
        setPaymentPage(normalizePaymentPage(response, pageNumber));
      })
      .catch((requestError) => {
        if (!active) return;
        setPaymentPage(normalizePaymentPage(null, pageNumber));
        setError(getHistoryErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [pageNumber, reloadKey]);

  const statusMessage = useMemo(() => {
    if (loading) return `Đang tải trang ${pageNumber} của lịch sử thanh toán.`;
    if (error) return error;
    if (!paymentPage.totalCount) return "Bạn chưa có giao dịch thanh toán nào.";
    return `Đã tải ${paymentPage.items.length} giao dịch trên trang ${paymentPage.pageNumber}.`;
  }, [error, loading, pageNumber, paymentPage]);

  const firstItem = paymentPage.totalCount
    ? (paymentPage.pageNumber - 1) * paymentPage.pageSize + 1
    : 0;
  const lastItem = Math.min(
    paymentPage.totalCount,
    firstItem + paymentPage.items.length - 1,
  );
  const hasPreviousPage = pageNumber > 1;
  const hasNextPage = pageNumber < paymentPage.totalPages;

  function changePage(nextPage) {
    setLoading(true);
    setError("");
    setPageNumber(nextPage);
  }

  function retryHistory() {
    setLoading(true);
    setError("");
    setReloadKey((current) => current + 1);
  }

  return (
    <section
      id="profile-panel-transactions"
      role="tabpanel"
      aria-labelledby="profile-tab-transactions"
      className="profile-card payment-history"
      aria-busy={loading}
    >
      <div className="payment-history-heading">
        <div>
          <h1>Lịch sử thanh toán</h1>
          <p>Kiểm tra các giao dịch của tài khoản hiện tại.</p>
        </div>
        <span>{paymentPage.totalCount} giao dịch</span>
      </div>
      <p className="sr-only" role="status" aria-atomic="true">{statusMessage}</p>

      {loading && paymentPage.items.length === 0 ? (
        <div className="payment-history-state">
          <RefreshCw className="payment-history-spinner" size={28} aria-hidden="true" />
          <strong>Đang tải lịch sử thanh toán</strong>
        </div>
      ) : error ? (
        <div className="payment-history-state payment-history-error">
          <strong>Không tải được lịch sử thanh toán</strong>
          <p>{error}</p>
          <button type="button" onClick={retryHistory}>
            <RefreshCw size={17} aria-hidden="true" />
            Thử lại
          </button>
        </div>
      ) : paymentPage.items.length === 0 ? (
        <div className="payment-history-state">
          <span className="payment-history-state-icon"><ReceiptText size={22} aria-hidden="true" /></span>
          <strong>Chưa có giao dịch</strong>
          <p>Các giao dịch thanh toán sẽ xuất hiện tại đây sau khi bạn đăng ký gói dịch vụ.</p>
        </div>
      ) : (
        <div className="payment-history-list">
          {paymentPage.items.map((payment, index) => {
            const paymentId = String(payment.id ?? "");
            const itemKey = paymentId || payment.transactionReference || `${pageNumber}-${index}`;
            return (
              <article className="payment-history-item" key={itemKey}>
                <header>
                  <div>
                    <strong>{payment.planName || "Giao dịch MediMate+"}</strong>
                    <small>{paymentId || "Chưa có mã thanh toán"}</small>
                  </div>
                  <PaymentStatusBadge payment={payment} />
                </header>
                <dl className="payment-history-summary">
                  <div>
                    <dt>Số tiền</dt>
                    <dd>{formatMoney(payment.amount, payment.currency)}</dd>
                  </div>
                  <div>
                    <dt>Cổng thanh toán</dt>
                    <dd>{payment.provider || "—"}</dd>
                  </div>
                  <div>
                    <dt>Mã giao dịch</dt>
                    <dd>{payment.transactionReference || "—"}</dd>
                  </div>
                  <div>
                    <dt>Ngày tạo</dt>
                    <dd><time dateTime={payment.createdAt || undefined}>{formatDateTime(payment.createdAt)}</time></dd>
                  </div>
                  <div>
                    <dt>Ngày thanh toán</dt>
                    <dd><time dateTime={payment.paidAt || undefined}>{formatDateTime(payment.paidAt)}</time></dd>
                  </div>
                </dl>
                <button
                  type="button"
                  className="payment-history-detail-button"
                  disabled={!paymentId}
                  onClick={(event) => {
                    detailTriggerRef.current = event.currentTarget;
                    setSelectedPayment(payment);
                  }}
                >
                  Xem chi tiết
                </button>
              </article>
            );
          })}
        </div>
      )}

      {paymentPage.totalPages > 1 && !error && (
        <nav className="payment-history-pagination" aria-label="Phân trang lịch sử thanh toán">
          <button
            type="button"
            aria-label="Trang trước"
            disabled={!hasPreviousPage || loading}
            onClick={() => changePage(Math.max(1, pageNumber - 1))}
          >
            <ChevronLeft size={18} aria-hidden="true" />
            Trước
          </button>
          <span aria-current="page">
            Trang {paymentPage.pageNumber} / {paymentPage.totalPages}
            <small>Hiển thị {firstItem}–{lastItem} trong {paymentPage.totalCount}</small>
          </span>
          <button
            type="button"
            aria-label="Trang sau"
            disabled={!hasNextPage || loading}
            onClick={() => changePage(pageNumber + 1)}
          >
            Sau
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </nav>
      )}

      {selectedPayment?.id && (
        <PaymentDetailDialog
          paymentId={selectedPayment.id}
          summary={selectedPayment}
          onClose={() => setSelectedPayment(null)}
          restoreFocusRef={detailTriggerRef}
        />
      )}
    </section>
  );
}
