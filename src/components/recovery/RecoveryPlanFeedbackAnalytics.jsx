import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  CalendarRange,
  CheckCircle2,
  MessageSquareText,
  RefreshCw,
  Star,
  TrendingUp,
} from "lucide-react";
import { Button, EmptyState, ErrorState, LoadingState } from "../ui";
import { getApiErrorCode } from "../../services/apiError";
import { doctorRecoveryPlansApi } from "../../services/api";
import "../../styles/recovery-plan-feedback-analytics.css";

function getAnalyticsError(error, fallback) {
  const code = getApiErrorCode(error);
  if (code === "INVALID_DATE_RANGE") {
    return { code, message: "Khoảng thời gian không hợp lệ. Ngày bắt đầu phải trước hoặc bằng ngày kết thúc." };
  }
  if (code === "DOCTOR_PROFILE_NOT_FOUND") {
    return { code, message: "Không tìm thấy hồ sơ bác sĩ để tải số liệu thống kê." };
  }
  if (code === "UNAUTHENTICATED") {
    return { code, message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." };
  }
  if (code === "ANALYTICS_CONFLICT") {
    return { code, message: "Dữ liệu thống kê đang được cập nhật. Vui lòng thử lại sau." };
  }
  if (code === "INVALID_REQUEST") {
    return { code, message: "Yêu cầu thống kê chưa hợp lệ. Vui lòng kiểm tra lại bộ lọc." };
  }
  return { code, message: fallback };
}

function formatNumber(value, maximumFractionDigits = 2, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits }).format(number);
}

function formatPeriod(period) {
  const [year, month] = String(period ?? "").split("-");
  if (!year || !month) return period || "Chưa xác định";
  return `${month}/${year}`;
}

function TimelineChart({ timeline }) {
  const points = Array.isArray(timeline) ? timeline : [];
  if (points.length === 0) return null;

  const width = 700;
  const height = 260;
  const margins = { top: 18, right: 22, bottom: 42, left: 46 };
  const chartWidth = width - margins.left - margins.right;
  const chartHeight = height - margins.top - margins.bottom;
  const xAt = (index) => (
    points.length === 1
      ? margins.left + chartWidth / 2
      : margins.left + (index / (points.length - 1)) * chartWidth
  );
  const yAt = (rating) => margins.top + ((5 - Math.min(5, Math.max(1, Number(rating) || 1))) / 4) * chartHeight;
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${xAt(index)},${yAt(point.averageRating)}`).join(" ");
  const labelIndices = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];

  return (
    <div className="doctor-feedback-chart-scroll">
      <svg
        className="doctor-feedback-timeline-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby="doctor-feedback-timeline-title doctor-feedback-timeline-desc"
      >
        <title id="doctor-feedback-timeline-title">Đánh giá trung bình theo thời gian</title>
        <desc id="doctor-feedback-timeline-desc">Đường biểu diễn điểm đánh giá trung bình từ 1 đến 5 cho từng kỳ có phản hồi.</desc>
        {[1, 2, 3, 4, 5].map((rating) => {
          const y = yAt(rating);
          return (
            <g key={rating} className="doctor-feedback-timeline-grid">
              <line x1={margins.left} x2={width - margins.right} y1={y} y2={y} />
              <text x={margins.left - 10} y={y + 4} textAnchor="end">{rating}</text>
            </g>
          );
        })}
        <path className="doctor-feedback-timeline-line" d={path} />
        {points.map((point, index) => (
          <circle
            key={`${point.period}-${index}`}
            className="doctor-feedback-timeline-point"
            cx={xAt(index)}
            cy={yAt(point.averageRating)}
            r="5"
          >
            <title>{`${formatPeriod(point.period)} · ${formatNumber(point.averageRating)} / 5 · ${Number(point.feedbackCount) || 0} phản hồi`}</title>
          </circle>
        ))}
        {labelIndices.map((index) => (
          <text
            key={`period-${index}`}
            className="doctor-feedback-timeline-label"
            x={xAt(index)}
            y={height - 16}
            textAnchor="middle"
          >
            {formatPeriod(points[index]?.period)}
          </text>
        ))}
      </svg>
    </div>
  );
}

function RatingDistribution({ distribution }) {
  const items = [...(Array.isArray(distribution) ? distribution : [])]
    .sort((left, right) => Number(right.rating) - Number(left.rating));
  const maximum = Math.max(1, ...items.map((item) => Number(item.count) || 0));

  return (
    <div className="doctor-feedback-distribution" aria-label="Phân bố số phản hồi theo mức đánh giá">
      {items.map((item) => {
        const rating = Number(item.rating) || 0;
        const count = Number(item.count) || 0;
        const width = `${Math.max(0, Math.min(100, (count / maximum) * 100))}%`;
        return (
          <div className="doctor-feedback-distribution__row" key={rating}>
            <span className="doctor-feedback-distribution__rating" aria-label={`${rating} sao`}>
              {rating} <Star size={14} aria-hidden="true" />
            </span>
            <span className="doctor-feedback-distribution__track" aria-hidden="true">
              <span style={{ width }} />
            </span>
            <strong>{count}</strong>
          </div>
        );
      })}
    </div>
  );
}

export default function RecoveryPlanFeedbackAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [appliedRange, setAppliedRange] = useState({ from: "", to: "" });
  const [filterError, setFilterError] = useState("");

  const loadAnalytics = useCallback(async (range = appliedRange) => {
    setStatus("loading");
    setErrorMessage("");
    try {
      const response = await doctorRecoveryPlansApi.getFeedbackAnalytics(range);
      setAnalytics(response?.data ?? null);
      setStatus("ready");
    } catch (error) {
      const mapped = getAnalyticsError(error, "Chưa thể tải thống kê phản hồi kế hoạch phục hồi. Vui lòng thử lại.");
      setAnalytics(null);
      setStatus("error");
      setErrorMessage(mapped.message);
    }
  }, [appliedRange]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAnalytics({ from: "", to: "" }), 0);
    return () => window.clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleApplyFilter(event) {
    event.preventDefault();
    if (from && to && from > to) {
      setFilterError("Ngày bắt đầu không được sau ngày kết thúc.");
      return;
    }
    setFilterError("");
    const nextRange = { from, to };
    setAppliedRange(nextRange);
    void loadAnalytics(nextRange);
  }

  function handleClearFilter() {
    setFrom("");
    setTo("");
    setFilterError("");
    const nextRange = { from: "", to: "" };
    setAppliedRange(nextRange);
    void loadAnalytics(nextRange);
  }

  const completedPlans = Number(analytics?.completedPlans) || 0;
  const totalFeedbacks = Number(analytics?.totalFeedbacks) || 0;
  const timeline = Array.isArray(analytics?.timeline) ? analytics.timeline : [];
  const distribution = Array.isArray(analytics?.ratingDistribution) ? analytics.ratingDistribution : [];
  const hasFilter = Boolean(appliedRange.from || appliedRange.to);

  return (
    <section className="doctor-feedback-analytics" aria-labelledby="doctor-feedback-analytics-title">
      <header className="doctor-feedback-analytics__header">
        <div>
          <p className="doctor-overview-eyebrow"><TrendingUp size={16} aria-hidden="true" /> Phản hồi bệnh nhân</p>
          <h2 id="doctor-feedback-analytics-title">Hiệu quả kế hoạch phục hồi</h2>
          <span>Số liệu phản ánh phản hồi đã được gửi cho các kế hoạch hoàn thành, không phải thước đo kết quả điều trị.</span>
        </div>
        <Button
          type="button"
          tone="secondary"
          size="sm"
          disabled={status === "loading"}
          onClick={() => loadAnalytics(appliedRange)}
        >
          <RefreshCw size={16} aria-hidden="true" /> Tải lại
        </Button>
      </header>

      <form className="doctor-feedback-filter" onSubmit={handleApplyFilter} noValidate>
        <label>
          <span>Từ ngày</span>
          <input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setFilterError(""); }} />
        </label>
        <label>
          <span>Đến ngày</span>
          <input type="date" value={to} onChange={(event) => { setTo(event.target.value); setFilterError(""); }} />
        </label>
        <div>
          <Button type="submit" disabled={status === "loading"}>
            <CalendarRange size={16} aria-hidden="true" /> Áp dụng
          </Button>
          {hasFilter && <Button type="button" tone="secondary" onClick={handleClearFilter}>Xóa lọc</Button>}
        </div>
        {filterError && <p role="alert">{filterError}</p>}
      </form>

      {status === "loading" && !analytics && <LoadingState label="Đang tải thống kê phản hồi…" />}
      {status === "error" && (
        <ErrorState
          title="Không thể tải thống kê phản hồi"
          description={errorMessage}
          action={<Button onClick={() => loadAnalytics(appliedRange)}>Thử lại</Button>}
        />
      )}

      {status === "ready" && analytics && completedPlans === 0 && (
        <EmptyState
          icon={<CheckCircle2 size={28} aria-hidden="true" />}
          title="Chưa có dữ liệu đánh giá"
          description="Sau khi bệnh nhân hoàn thành các kế hoạch phục hồi, thống kê phản hồi sẽ xuất hiện tại đây."
        />
      )}

      {status === "ready" && analytics && completedPlans > 0 && (
        <>
          <div className="doctor-feedback-summary" aria-label="Tổng quan phản hồi kế hoạch phục hồi">
            <article>
              <span><Star size={18} aria-hidden="true" /> Đánh giá trung bình</span>
              <strong>{totalFeedbacks > 0 ? `${formatNumber(analytics.averageRating)} / 5` : "—"}</strong>
            </article>
            <article>
              <span><MessageSquareText size={18} aria-hidden="true" /> Phản hồi nhận được</span>
              <strong>{totalFeedbacks.toLocaleString("vi-VN")}</strong>
            </article>
            <article>
              <span><CheckCircle2 size={18} aria-hidden="true" /> Kế hoạch hoàn thành</span>
              <strong>{completedPlans.toLocaleString("vi-VN")}</strong>
            </article>
            <article>
              <span><BarChart3 size={18} aria-hidden="true" /> Tỷ lệ phản hồi</span>
              <strong>{formatNumber(analytics.feedbackRate)}%</strong>
            </article>
          </div>

          {totalFeedbacks === 0 ? (
            <EmptyState
              icon={<MessageSquareText size={28} aria-hidden="true" />}
              title="Chưa có phản hồi từ bệnh nhân"
              description={`0 / ${completedPlans.toLocaleString("vi-VN")} kế hoạch hoàn thành đã nhận được đánh giá.`}
            />
          ) : (
            <div className="doctor-feedback-analytics__charts">
              <article className="doctor-feedback-chart-card">
                <header>
                  <div><TrendingUp size={18} aria-hidden="true" /><span><strong>Đánh giá theo thời gian</strong><small>Điểm trung bình theo kỳ phản hồi</small></span></div>
                </header>
                <TimelineChart timeline={timeline} />
                <ul className="doctor-feedback-timeline-data" aria-label="Chi tiết đánh giá theo từng kỳ">
                  {timeline.map((item) => (
                    <li key={item.period}>
                      <span>{formatPeriod(item.period)}</span>
                      <strong>{formatNumber(item.averageRating)} / 5</strong>
                      <small>{Number(item.feedbackCount) || 0} phản hồi</small>
                    </li>
                  ))}
                </ul>
              </article>

              <article className="doctor-feedback-chart-card">
                <header>
                  <div><BarChart3 size={18} aria-hidden="true" /><span><strong>Phân bố đánh giá</strong><small>Số phản hồi ở từng mức 1–5 sao</small></span></div>
                </header>
                <RatingDistribution distribution={distribution} />
              </article>
            </div>
          )}
        </>
      )}
    </section>
  );
}
