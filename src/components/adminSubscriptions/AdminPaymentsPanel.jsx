import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Filter, ReceiptText, RefreshCw, RotateCcw, Search, X } from "lucide-react";
import { Badge, Button, CustomSelect, DataTable, Dialog, EmptyState, ErrorState, LoadingState } from "../ui";
import { paymentsApi } from "../../services/api";
import { translateApiMessage } from "../../services/apiMessageTranslator";
import { getPaymentStatusLabel } from "../../services/paymentStatusLabels";
import AdminPagination from "../admin/AdminPagination";
import AdminFilterDisclosure from "../admin/AdminFilterDisclosure";

const PAGE_SIZE = 10;
const EMPTY_FILTERS = { search: "", status: "" };
const PAYMENT_STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "paid", label: "Đã thanh toán" },
  { value: "pending", label: "Đang chờ" },
  { value: "failed", label: "Thất bại" },
  { value: "cancelled", label: "Đã hủy" },
  { value: "refunded", label: "Đã hoàn tiền" },
];

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
  const status = String(payment?.status ?? "").toLowerCase();
  const label = getPaymentStatusLabel(status, payment?.statusName || "Đang chờ");
  if (status === "paid") return { label, tone: "success" };
  if (status === "failed" || status === "refunded") return { label, tone: "danger" };
  if (status === "cancelled" || status === "canceled") return { label, tone: "warning" };
  return { label, tone: "warning" };
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
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const detailTriggerRef = useRef(null);

  const filteredPayments = useMemo(() => {
    const search = appliedFilters.search.trim().toLocaleLowerCase("vi");
    return paymentPage.items.filter((payment) => {
      const rawStatus = String(payment?.status ?? "").toLowerCase();
      const normalizedStatus = rawStatus === "canceled" ? "cancelled" : rawStatus;
      if (appliedFilters.status && normalizedStatus !== appliedFilters.status) return false;
      if (!search) return true;
      return [
        payment.id,
        payment.planName,
        payment.userId,
        payment.transactionReference,
        payment.paymentProvider,
        payment.provider,
      ].some((value) => String(value ?? "").toLocaleLowerCase("vi").includes(search));
    });
  }, [appliedFilters, paymentPage.items]);

  const activeFilterCount = Number(Boolean(appliedFilters.search.trim())) + Number(Boolean(appliedFilters.status));

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

  function applyFilters(event) {
    event.preventDefault();
    setAppliedFilters({ search: filters.search.trim(), status: filters.status });
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
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

      <AdminFilterDisclosure
        className="admin-payment-filter-card"
        description="Tìm theo mã, người dùng, gói dịch vụ hoặc trạng thái giao dịch trên trang hiện tại."
        headingClassName="admin-payment-filter-heading"
        icon={<Filter size={18} />}
        summary={`${activeFilterCount} bộ lọc · ${filteredPayments.length} giao dịch`}
        title="Lọc lịch sử thanh toán"
        titleId="admin-payment-filter-title"
      >
        <form className="admin-payment-filter-form" onSubmit={applyFilters}>
          <label className="admin-payment-search-field">
            <span>Tìm giao dịch</span>
            <span className="admin-payment-search-control">
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                autoComplete="off"
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder="Mã giao dịch, người dùng hoặc gói dịch vụ"
              />
            </span>
          </label>
          <CustomSelect
            className="clean-field admin-payment-status-field"
            label="Trạng thái"
            value={filters.status}
            options={PAYMENT_STATUS_OPTIONS}
            onChange={(status) => setFilters((current) => ({ ...current, status }))}
          />
          <div className="admin-payment-filter-actions">
            <Button size="sm" type="submit" disabled={loading}><Filter size={14} aria-hidden="true" /> Áp dụng</Button>
            <Button tone="secondary" size="sm" type="button" onClick={clearFilters} disabled={loading}><RotateCcw size={14} aria-hidden="true" /> Xóa lọc</Button>
          </div>
        </form>
      </AdminFilterDisclosure>

      {loading && paymentPage.items.length === 0 ? (
        <LoadingState label="Đang tải lịch sử thanh toán…" />
      ) : error ? (
        <ErrorState title="Không thể tải lịch sử thanh toán" description={error} action={<Button onClick={reload}>Thử lại</Button>} />
      ) : filteredPayments.length === 0 ? (
        <EmptyState icon={<ReceiptText size={26} aria-hidden="true" />} title={activeFilterCount ? "Không có giao dịch phù hợp" : "Chưa có giao dịch thanh toán"} description={activeFilterCount ? "Hãy thay đổi hoặc xóa bộ lọc để xem giao dịch khác." : "Các giao dịch đăng ký gói sẽ xuất hiện tại đây."} />
      ) : (
        <DataTable
          className="admin-payment-table"
          caption="Danh sách giao dịch thanh toán"
          rowHeaderKey="plan"
          getRowKey={(payment) => payment.id}
          rows={filteredPayments}
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
        <AdminPagination ariaLabel="Phân trang lịch sử thanh toán" currentPage={paymentPage.pageNumber} totalPages={paymentPage.totalPages} totalCount={paymentPage.totalCount} pageSize={paymentPage.pageSize} itemCount={paymentPage.items.length} itemLabel="giao dịch" loading={loading} onPageChange={changePage} />
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
