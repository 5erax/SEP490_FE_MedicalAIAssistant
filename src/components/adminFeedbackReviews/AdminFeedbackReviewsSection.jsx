import { Filter, MessageSquareText, RefreshCw, ShieldCheck, Star, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFeedback } from "../feedback/feedbackContext";
import { feedbackReviewsApi, getFeedbackReviewApiMessage } from "../../services/feedbackReviewService";
import { medicalFacilitiesApi } from "../../services/facilityService";
import { Badge, Button, EmptyState, ErrorState, LoadingState } from "../ui";

const PAGE_SIZE = 20;
const EMPTY_FILTERS = { facilityId: "", rating: "", status: "" };
const STATUS_LABELS = {
  Approved: "Đã duyệt",
  Pending: "Chờ duyệt",
  Hidden: "Đã ẩn",
  Rejected: "Đã từ chối",
  approved: "Đã duyệt",
  pending: "Chờ duyệt",
  hidden: "Đã ẩn",
  rejected: "Đã từ chối",
};
const STATUS_TONES = {
  Approved: "success",
  approved: "success",
  Pending: "warning",
  pending: "warning",
  Hidden: "neutral",
  hidden: "neutral",
  Rejected: "danger",
  rejected: "danger",
};

function formatDate(value) {
  if (!value) return "Chưa cập nhật";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function getStatusLabel(status) {
  return STATUS_LABELS[status] || "Chưa xác định";
}

function Rating({ value }) {
  return (
    <span className="feedback-rating" aria-label={`${value} trên 5 sao`}>
      <Star size={16} fill="currentColor" aria-hidden="true" />
      <strong>{value}/5</strong>
    </span>
  );
}

export default function AdminFeedbackReviewsSection({ facilities }) {
  const { confirmAction, showToast } = useFeedback();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [reviews, setReviews] = useState([]);
  const [pageInfo, setPageInfo] = useState({ pageNumber: 1, totalCount: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [facilityCatalog, setFacilityCatalog] = useState(facilities);

  const loadReviews = useCallback(async (pageNumber = 1, nextFilters = appliedFilters) => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await feedbackReviewsApi.list(pageNumber, PAGE_SIZE, nextFilters);
      const data = response?.data ?? {};
      setReviews(Array.isArray(data.items) ? data.items : []);
      setPageInfo({
        pageNumber: data.pageNumber ?? pageNumber,
        totalCount: data.totalCount ?? 0,
        totalPages: data.totalPages ?? 1,
      });
    } catch (error) {
      setLoadError(getFeedbackReviewApiMessage(error, "Không thể tải danh sách đánh giá. Vui lòng thử lại."));
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    const timer = window.setTimeout(() => loadReviews(1), 0);
    return () => window.clearTimeout(timer);
  }, [loadReviews]);

  useEffect(() => {
    let active = true;
    medicalFacilitiesApi.list(1, 100).then((response) => {
      const data = response?.data ?? {};
      const items = Array.isArray(data) ? data : data.items;
      if (active && Array.isArray(items)) setFacilityCatalog(items);
    }).catch(() => {
      // The currently loaded facilities still provide a usable filter fallback.
    });
    return () => { active = false; };
  }, []);

  const facilityOptions = useMemo(() => (
    [...facilityCatalog]
      .sort((left, right) => String(left.facilityName).localeCompare(String(right.facilityName), "vi"))
      .map((facility) => ({ value: facility.id, label: facility.facilityName }))
  ), [facilityCatalog]);

  function applyFilters(event) {
    event.preventDefault();
    setAppliedFilters(filters);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  }

  async function updateStatus(review, status) {
    setBusyId(review.id);
    try {
      await feedbackReviewsApi.setStatus(review.id, status);
      showToast({ type: "success", message: `Đã chuyển đánh giá sang trạng thái “${getStatusLabel(status)}”.` });
      await loadReviews(pageInfo.pageNumber);
    } catch (error) {
      showToast({ type: "error", message: getFeedbackReviewApiMessage(error, "Không thể cập nhật trạng thái đánh giá.") });
    } finally {
      setBusyId("");
    }
  }

  async function removeReview(review) {
    const confirmed = await confirmAction({
      title: "Xóa đánh giá này?",
      message: "Đánh giá sẽ không còn hiển thị với người dùng. Thao tác sử dụng cơ chế xóa mềm của hệ thống.",
      confirmLabel: "Xóa đánh giá",
      tone: "danger",
    });
    if (!confirmed) return;

    setBusyId(review.id);
    try {
      await feedbackReviewsApi.remove(review.id);
      showToast({ type: "success", message: "Đã xóa đánh giá." });
      const nextPage = reviews.length === 1 && pageInfo.pageNumber > 1 ? pageInfo.pageNumber - 1 : pageInfo.pageNumber;
      await loadReviews(nextPage);
    } catch (error) {
      showToast({ type: "error", message: getFeedbackReviewApiMessage(error, "Không thể xóa đánh giá.") });
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="admin-panel feedback-admin-panel" aria-labelledby="admin-feedback-title">
      <header className="feedback-admin-heading">
        <div>
          <p className="eyebrow">Đánh giá cơ sở y tế</p>
          <h2 id="admin-feedback-title">Quản lý đánh giá người dùng</h2>
          <p>Theo dõi chất lượng phản hồi, kiểm duyệt nội dung và xử lý đánh giá không phù hợp.</p>
        </div>
        <Button tone="secondary" size="sm" onClick={() => loadReviews(pageInfo.pageNumber)} disabled={loading}>
          <RefreshCw size={15} aria-hidden="true" /> Tải lại
        </Button>
      </header>

      <form className="feedback-filter-card" onSubmit={applyFilters}>
        <div className="feedback-filter-title">
          <Filter size={18} aria-hidden="true" />
          <div><h3>Lọc đánh giá</h3><p>Thu hẹp theo cơ sở, số sao hoặc trạng thái kiểm duyệt.</p></div>
        </div>
        <div className="feedback-filter-grid">
          <label><span>Cơ sở y tế</span><select value={filters.facilityId} onChange={(event) => setFilters((current) => ({ ...current, facilityId: event.target.value }))}><option value="">Tất cả cơ sở</option>{facilityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label><span>Số sao</span><select value={filters.rating} onChange={(event) => setFilters((current) => ({ ...current, rating: event.target.value }))}><option value="">Tất cả mức sao</option>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} sao</option>)}</select></label>
          <label><span>Trạng thái</span><select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="">Tất cả trạng thái</option><option value="Approved">Đã duyệt</option><option value="Pending">Chờ duyệt</option><option value="Hidden">Đã ẩn</option><option value="Rejected">Đã từ chối</option></select></label>
        </div>
        <div className="feedback-filter-actions"><Button size="sm" type="submit"><Filter size={14} aria-hidden="true" /> Áp dụng</Button><Button tone="secondary" size="sm" type="button" onClick={clearFilters}>Xóa lọc</Button></div>
      </form>

      {!loading && !loadError ? <div className="feedback-result-summary" role="status"><ShieldCheck size={18} aria-hidden="true" /><strong>{pageInfo.totalCount} đánh giá phù hợp</strong><span>Trang {pageInfo.pageNumber}/{Math.max(pageInfo.totalPages, 1)}</span></div> : null}

      {loading ? <LoadingState label="Đang tải đánh giá..." description="Dữ liệu đánh giá đang được đồng bộ." /> : loadError ? <ErrorState title="Không thể tải đánh giá" description={loadError} action={<Button onClick={() => loadReviews(pageInfo.pageNumber)}>Thử lại</Button>} /> : reviews.length === 0 ? <EmptyState icon={<MessageSquareText size={24} />} title="Chưa có đánh giá phù hợp" description="Hãy thay đổi bộ lọc hoặc tải lại dữ liệu." /> : (
        <>
          <div className="feedback-table-scroll">
            <table className="feedback-admin-table">
              <caption className="sr-only">Danh sách đánh giá người dùng</caption>
              <thead><tr><th>Người dùng</th><th>Cơ sở y tế</th><th>Điểm</th><th>Nội dung</th><th>Trạng thái</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead>
              <tbody>{reviews.map((review) => <tr key={review.id}><td><code title={review.userId}>{String(review.userId).slice(0, 8)}…</code></td><td><strong>{review.facilityName || "Cơ sở chưa xác định"}</strong></td><td><Rating value={review.rating} /></td><td className="feedback-comment-cell">{review.comment || <em>Không có nội dung</em>}</td><td><Badge tone={STATUS_TONES[review.status] || "neutral"}>{getStatusLabel(review.status)}</Badge></td><td>{formatDate(review.createdAt)}</td><td><div className="feedback-row-actions"><select aria-label={`Đổi trạng thái đánh giá tại ${review.facilityName}`} value={review.status || "Pending"} disabled={busyId === review.id} onChange={(event) => updateStatus(review, event.target.value)}><option value="Approved">Đã duyệt</option><option value="Pending">Chờ duyệt</option><option value="Hidden">Đã ẩn</option><option value="Rejected">Đã từ chối</option></select><Button tone="danger" size="sm" className="admin-danger-btn feedback-delete-button" aria-label={`Xóa đánh giá tại ${review.facilityName}`} disabled={busyId === review.id} onClick={() => removeReview(review)}><Trash2 size={14} aria-hidden="true" /> Xóa</Button></div></td></tr>)}</tbody>
            </table>
          </div>
          <div className="feedback-card-list">{reviews.map((review) => <article className="feedback-admin-card" key={review.id}><header><div><strong>{review.facilityName || "Cơ sở chưa xác định"}</strong><small>{formatDate(review.createdAt)}</small></div><Badge tone={STATUS_TONES[review.status] || "neutral"}>{getStatusLabel(review.status)}</Badge></header><Rating value={review.rating} /><p>{review.comment || "Không có nội dung"}</p><div className="feedback-row-actions"><select aria-label={`Đổi trạng thái đánh giá tại ${review.facilityName}`} value={review.status || "Pending"} disabled={busyId === review.id} onChange={(event) => updateStatus(review, event.target.value)}><option value="Approved">Đã duyệt</option><option value="Pending">Chờ duyệt</option><option value="Hidden">Đã ẩn</option><option value="Rejected">Đã từ chối</option></select><Button tone="danger" size="sm" className="admin-danger-btn feedback-delete-button" disabled={busyId === review.id} onClick={() => removeReview(review)}><Trash2 size={14} aria-hidden="true" /> Xóa</Button></div></article>)}</div>
          <nav className="feedback-pagination" aria-label="Phân trang đánh giá"><Button tone="secondary" size="sm" disabled={pageInfo.pageNumber <= 1 || loading} onClick={() => loadReviews(pageInfo.pageNumber - 1)}>Trang trước</Button><span>Trang {pageInfo.pageNumber}/{Math.max(pageInfo.totalPages, 1)}</span><Button tone="secondary" size="sm" disabled={pageInfo.pageNumber >= pageInfo.totalPages || loading} onClick={() => loadReviews(pageInfo.pageNumber + 1)}>Trang sau</Button></nav>
        </>
      )}
    </section>
  );
}
