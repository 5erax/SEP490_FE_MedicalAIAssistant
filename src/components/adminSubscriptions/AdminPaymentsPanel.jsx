import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, ReceiptText, RefreshCw, X } from "lucide-react";
import { Badge, Button, DataTable, Dialog, EmptyState, ErrorState, LoadingState } from "../ui";
import { paymentsApi } from "../../services/api";
import { translateApiMessage } from "../../services/apiMessageTranslator";

const PAGE_SIZE = 10;

function normalizePage(response, pageNumber) {
  const data = response?.data ?? {};
  if (Array.isArray(data)) {
    return { items: data, pageNumber, pageSize: PAGE_SIZE, totalCount: data.length, totalPages: 1 };
  }
  return {
    items: Array.isArray(data.items) ? data.items : [],
    pageNumber: Number(data.pageNumber) || pageNumber,
    pageSize: Number(data.pageSize) || PAGE_SIZE,
    totalCount: Number(data.totalCount) || 0,
    totalPages: Math.max(1, Number(data.totalPages) || 1),
  };
}

function formatMoney(value, currency = "VND") {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: currency || "VND", maximumFractionDigits: 0 }).format(amount);
}

function formatDateTime(value) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Chưa cập nhật" : date.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

function getPaymentStatus(payment) {
  const status = String(payment?.statusName ?? payment?.status ?? "").toLowerCase();
  if (["paid", "completed", "success"].includes(status)) return { label: "Đã thanh toán", tone: "success" };
  if (["failed", "refunded"].includes(status)) return { label: status === "refunded" ? "Đã hoàn tiền" : "Thất bại", tone: "danger" };
  if (["cancelled", "canceled"].includes(status)) return { label: "Đã hủy", tone: "warning" };
  return { label: "Đang chờ", tone: "warning" };
}

function PaymentDetailDialog({ paymentSummary, onClose, restoreFocusRef }) {
  const [payment, setPayment] = useState(paymentSummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const closeButtonRef = useRef(null);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      paymentsApi.get(paymentSummary.id)
        .then((response) => {
          if (active) setPayment(response?.data ?? paymentSummary);
        })
        .catch((error) => {
          if (active) {
            setError(translateApiMessage(error?.message, {
              status: error?.status,
              fallback: "Chưa thể tải đầy đủ chi tiết giao dịch.",
            }));
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    });
    return () => {
      active = false;
    };
  }, [paymentSummary]);

  const status = getPaymentStatus(payment);
  return (
    <Dialog
      backdropClassName="admin-payment-dialog-backdrop"
      className="admin-payment-dialog"
      labelledBy="admin-payment-detail-title"
      onClose={onClose}
      initialFocusRef={closeButtonRef}
      restoreFocusRef={restoreFocusRef}
    >
      <header>
        <div>
          <p className="eyebrow">Chi tiết thanh toán</p>
          <h2 id="admin-payment-detail-title">{payment.planName || "Giao dịch MediMate"}</h2>
        </div>
        <button ref={closeButtonRef} type="button" className="btn btn-ghost btn-small" onClick={onClose} aria-label="Đóng chi tiết thanh toán">
          <X size={18} aria-hidden="true" />
        </button>
      </header>
      <p className="sr-only" role="status" aria-atomic="true">{loading ? "Đang tải chi tiết giao dịch." : error || "Đã tải chi tiết giao dịch."}</p>
      {error && <p className="admin-payment-detail-error">{error}</p>}
      <dl className="admin-payment-detail-grid" aria-busy={loading}>
        <div className="admin-payment-detail-wide"><dt>Mã thanh toán</dt><dd>{payment.id || "—"}</dd></div>
        <div><dt>Trạng thái</dt><dd><Badge tone={status.tone}>{status.label}</Badge></dd></div>
        <div><dt>Số tiền</dt><dd>{formatMoney(payment.amount, payment.currency)}</dd></div>
        <div><dt>Người dùng</dt><dd>{payment.userId || "—"}</dd></div>
        <div><dt>Gói dịch vụ</dt><dd>{payment.planName || "—"}</dd></div>
        <div><dt>Cổng thanh toán</dt><dd>{payment.paymentProvider || payment.provider || "—"}</dd></div>
        <div><dt>Mã giao dịch</dt><dd>{payment.transactionReference || "—"}</dd></div>
        <div><dt>Ngày tạo</dt><dd>{formatDateTime(payment.createdAt)}</dd></div>
        <div><dt>Ngày thanh toán</dt><dd>{formatDateTime(payment.paidAt)}</dd></div>
      </dl>
    </Dialog>
  );
}

export default function AdminPaymentsPanel() {
  const [pageNumber, setPageNumber] = useState(1);
  const [paymentPage, setPaymentPage] = useState(() => normalizePage(null, 1));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const detailTriggerRef = useRef(null);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      paymentsApi.list(pageNumber, PAGE_SIZE)
        .then((response) => {
          if (active) setPaymentPage(normalizePage(response, pageNumber));
        })
        .catch((error) => {
          if (active) {
            setError(translateApiMessage(error?.message, {
              status: error?.status,
              fallback: "Chưa thể tải lịch sử thanh toán. Vui lòng thử lại.",
            }));
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    });
    return () => {
      active = false;
    };
  }, [pageNumber, reloadKey]);

  const statusMessage = useMemo(() => {
    if (loading) return "Đang tải lịch sử thanh toán.";
    if (error) return error;
    return `Đã tải ${paymentPage.items.length} giao dịch trên trang ${paymentPage.pageNumber}.`;
  }, [error, loading, paymentPage]);

  function reload() {
    setLoading(true);
    setError("");
    setReloadKey((current) => current + 1);
  }

  function changePage(nextPage) {
    setLoading(true);
    setError("");
    setPageNumber(nextPage);
  }

  return (
    <section className="admin-payment-panel" aria-labelledby="admin-payments-title" aria-busy={loading}>
      <div className="panel-title-row">
        <div>
          <p className="eyebrow">Giao dịch</p>
          <h2 id="admin-payments-title">Lịch sử thanh toán</h2>
          <p className="muted-text">Theo dõi các giao dịch đăng ký gói và mở chi tiết khi cần đối soát.</p>
        </div>
        <Button tone="secondary" size="sm" onClick={reload} disabled={loading}><RefreshCw size={16} aria-hidden="true" /> Tải lại</Button>
      </div>
      <p className="sr-only" role="status" aria-atomic="true">{statusMessage}</p>

      {loading && paymentPage.items.length === 0 ? (
        <LoadingState label="Đang tải lịch sử thanh toán…" />
      ) : error ? (
        <ErrorState title="Không thể tải lịch sử thanh toán" description={error} action={<Button onClick={reload}>Thử lại</Button>} />
      ) : paymentPage.items.length === 0 ? (
        <EmptyState icon={<ReceiptText size={26} aria-hidden="true" />} title="Chưa có giao dịch thanh toán" description="Các giao dịch đăng ký gói sẽ xuất hiện tại đây." />
      ) : (
        <DataTable
          className="admin-payment-table"
          caption="Danh sách giao dịch thanh toán"
          rowHeaderKey="plan"
          getRowKey={(payment) => payment.id}
          rows={paymentPage.items}
          columns={[
            { key: "plan", header: "Gói dịch vụ", render: (payment) => <strong>{payment.planName || "Giao dịch MediMate"}</strong> },
            { key: "user", header: "Người dùng", render: (payment) => payment.userId || "—" },
            { key: "amount", header: "Số tiền", render: (payment) => formatMoney(payment.amount, payment.currency) },
            { key: "status", header: "Trạng thái", render: (payment) => { const status = getPaymentStatus(payment); return <Badge tone={status.tone}>{status.label}</Badge>; } },
            { key: "created", header: "Ngày tạo", render: (payment) => formatDateTime(payment.createdAt) },
            {
              key: "action",
              header: "Thao tác",
              render: (payment) => (
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  onClick={(event) => {
                    detailTriggerRef.current = event.currentTarget;
                    setSelectedPayment(payment);
                  }}
                >
                  <Eye size={15} aria-hidden="true" /> Xem chi tiết
                </button>
              ),
            },
          ]}
        />
      )}

      {paymentPage.totalPages > 1 && !error && (
        <nav className="admin-payment-pagination" aria-label="Phân trang lịch sử thanh toán">
          <Button tone="ghost" size="sm" disabled={loading || pageNumber <= 1} onClick={() => changePage(pageNumber - 1)}>Trang trước</Button>
          <span>Trang {paymentPage.pageNumber}/{paymentPage.totalPages}</span>
          <Button tone="ghost" size="sm" disabled={loading || pageNumber >= paymentPage.totalPages} onClick={() => changePage(pageNumber + 1)}>Trang sau</Button>
        </nav>
      )}

      {selectedPayment && (
        <PaymentDetailDialog
          paymentSummary={selectedPayment}
          onClose={() => setSelectedPayment(null)}
          restoreFocusRef={detailTriggerRef}
        />
      )}
    </section>
  );
}
