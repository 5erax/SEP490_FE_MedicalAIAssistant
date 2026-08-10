import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ReceiptText, RefreshCw, X } from "lucide-react";
import { Dialog } from "../ui";
import { paymentsApi } from "../../services/api";
import { getPaymentReconcileErrorMessage } from "../../services/apiError";
import { translateApiMessage } from "../../services/apiMessageTranslator";
import { getPaymentStatusLabel } from "../../services/paymentStatusLabels";
import "../../styles/payment-history.css";

const PAGE_SIZE = 10;

const PAYMENT_STATUS_TONE = {
  pending: "warning",
  paid: "success",
  cancelled: "neutral",
  canceled: "neutral",
  failed: "danger",
  refunded: "neutral",
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
  const status = String(payment?.status ?? "").toLowerCase();
  const label = getPaymentStatusLabel(status, payment?.statusName || "Đang xử lý");
  return { label, tone: PAYMENT_STATUS_TONE[status] ?? "neutral" };
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
  // 404 covers both "not found" and "belongs to another user" - BE intentionally
  // returns the same status for both to avoid leaking other users' payment IDs.
  if (error?.status === 404) {
    return "Không tìm thấy giao dịch này hoặc bạn không có quyền xem giao dịch.";
  }
  return translateApiMessage(error?.message, {
    status: error?.status,
    fallback: "Chưa thể tải chi tiết giao dịch. Vui lòng thử lại sau.",
  });
}

// Only Pending PayOS transactions can be reconciled - other providers or
// already-terminal statuses have nothing for the reconcile endpoint to fix.
function canReconcilePayment(payment) {
  const status = String(payment?.status ?? "").toLowerCase();
  const provider = String(payment?.paymentProvider ?? payment?.provider ?? "").toLowerCase();
  const orderCode = String(payment?.transactionReference ?? "").trim();
  return status === "pending" && provider === "payos" && Boolean(orderCode);
}

function getFriendlyReconcileMessage(error) {
  return getPaymentReconcileErrorMessage(error, "Chưa thể kiểm tra giao dịch lúc này. Vui lòng thử lại sau.");
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
        <div className="payment-detail-title">
          <span className="payment-detail-title-icon" aria-hidden="true">
            <ReceiptText size={21} />
          </span>
          <div>
            <p>Chi tiết giao dịch</p>
            <h2 id="payment-detail-title">{title}</h2>
          </div>
        </div>
        <button ref={closeButtonRef} type="button" aria-label="Đóng chi tiết giao dịch" onClick={onClose}>
          <X size={20} aria-hidden="true" />
        </button>
      </header>
      <div className="payment-detail-overview">
        <div className="payment-detail-amount">
          <span>Giá trị giao dịch</span>
          <strong>{formatMoney(visiblePayment?.amount, visiblePayment?.currency)}</strong>
          <small>{visiblePayment?.currency || "VND"}</small>
        </div>
        <div className="payment-detail-overview-status">
          <span>Trạng thái</span>
          <PaymentStatusBadge payment={visiblePayment} />
        </div>
      </div>
      <p id="payment-detail-description" className="sr-only">
        Thông tin thanh toán của tài khoản hiện tại.
      </p>
      <div className="payment-detail-status" role="status" aria-atomic="true">
        {loading ? "Đang tải chi tiết giao dịch..." : error || "Chi tiết giao dịch đã tải xong."}
      </div>

      <div className="payment-detail-content">
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
          <div className="payment-detail-information">
            <h3>Thông tin giao dịch</h3>
            <dl className="payment-detail-grid">
              <div className="payment-detail-wide payment-detail-reference">
                <dt>Mã thanh toán</dt>
                <dd>{payment.id || "—"}</dd>
              </div>
              <div>
                <dt>Gói dịch vụ</dt>
                <dd>{payment.planName || "—"}</dd>
              </div>
              <div>
                <dt>Cổng thanh toán</dt>
                <dd>{payment.paymentProvider ?? payment.provider ?? "—"}</dd>
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
          </div>
        ) : null}
      </div>
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
  const [reconcilingOrderCode, setReconcilingOrderCode] = useState("");
  const [reconcileMessage, setReconcileMessage] = useState("");

  async function reconcileHistoryPayment(payment) {
    const orderCode = String(payment?.transactionReference ?? "").trim();
    if (!orderCode) return;

    setReconcilingOrderCode(orderCode);
    setReconcileMessage("Đang kiểm tra giao dịch với PayOS...");
    try {
      const response = await paymentsApi.reconcilePayOs(orderCode);
      setReconcileMessage(response?.data?.message || response?.message || "Đã cập nhật giao dịch.");
      setReloadKey((current) => current + 1);
    } catch (requestError) {
      setReconcileMessage(getFriendlyReconcileMessage(requestError));
    } finally {
      setReconcilingOrderCode("");
    }
  }

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
      aria-label="Lịch sử thanh toán"
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
      {reconcileMessage && (
        <p className="payment-history-reconcile-status" role="status" aria-live="polite">{reconcileMessage}</p>
      )}

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
        <div
          className="payment-history-table-region"
          role="region"
          aria-labelledby="payment-history-table-caption"
          tabIndex="0"
        >
          <table className="payment-history-table">
            <caption id="payment-history-table-caption" className="sr-only">
              Danh sách giao dịch thanh toán của tài khoản hiện tại
            </caption>
            <colgroup>
              <col className="payment-history-col-plan" />
              <col className="payment-history-col-status" />
              <col className="payment-history-col-amount" />
              <col className="payment-history-col-provider" />
              <col className="payment-history-col-date" />
              <col className="payment-history-col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Gói dịch vụ</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Số tiền</th>
                <th scope="col">Thanh toán</th>
                <th scope="col">Ngày tạo</th>
                <th scope="col" className="payment-history-action-heading">Thao tác</th>
              </tr>
            </thead>
            <tbody>
          {paymentPage.items.map((payment, index) => {
            const paymentId = String(payment.id ?? "");
            const itemKey = paymentId || payment.transactionReference || `${pageNumber}-${index}`;
            return (
              <tr key={itemKey}>
                <th scope="row" data-label="Gói dịch vụ">
                    <strong>{payment.planName || "Giao dịch MediMate+"}</strong>
                </th>
                <td data-label="Trạng thái"><PaymentStatusBadge payment={payment} /></td>
                <td data-label="Số tiền">{formatMoney(payment.amount, payment.currency)}</td>
                <td className="payment-history-secondary" data-label="Thanh toán">
                  <strong>{payment.paymentProvider ?? payment.provider ?? "—"}</strong>
                  <small>{payment.transactionReference || "Chưa có mã giao dịch"}</small>
                </td>
                <td data-label="Ngày tạo">
                  <time dateTime={payment.createdAt || undefined}>{formatDateTime(payment.createdAt)}</time>
                </td>
                <td className="payment-history-table-action" data-label="Thao tác">
                  <div className="payment-history-actions">
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
                    {canReconcilePayment(payment) && (
                      <button
                        type="button"
                        className="payment-history-reconcile-button"
                        disabled={reconcilingOrderCode === payment.transactionReference}
                        onClick={() => reconcileHistoryPayment(payment)}
                      >
                        <RefreshCw
                          size={14}
                          aria-hidden="true"
                          className={reconcilingOrderCode === payment.transactionReference ? "payment-history-spinner" : ""}
                        />
                        {reconcilingOrderCode === payment.transactionReference ? "Đang kiểm tra..." : "Kiểm tra với PayOS"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
            </tbody>
          </table>
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
