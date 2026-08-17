import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CalendarRange, FlaskConical, RefreshCw, TrendingUp } from "lucide-react";
import { Button, EmptyState, ErrorState, LoadingState } from "../ui";
import { getApiErrorCode } from "../../services/apiError";
import { labTestsApi } from "../../services/api";
import LabTestTrendChart from "./LabTestTrendChart";
import "../../styles/lab-test-trend.css";

const LAB_TREND_LABELS = {
  insufficientData: "Chưa đủ dữ liệu để xác định xu hướng",
  inRange: "Đang duy trì trong khoảng tham chiếu",
  towardReferenceRange: "Đang tiến gần khoảng tham chiếu",
  awayFromReferenceRange: "Đang xa khoảng tham chiếu hơn",
  stable: "Xu hướng tương đối ổn định",
};

function formatDateOnly(value) {
  const [year, month, day] = String(value ?? "").slice(0, 10).split("-");
  if (!year || !month || !day) return "Chưa cập nhật";
  return `${day}/${month}/${year}`;
}

function formatNumber(value, fallback = "Chưa có") {
  if (value === null || value === undefined || value === "") return fallback;
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(number);
}

function getAnalyticsError(error, fallback) {
  const code = getApiErrorCode(error);
  if (code === "INVALID_DATE_RANGE") {
    return { code, message: "Khoảng thời gian không hợp lệ. Ngày bắt đầu phải trước hoặc bằng ngày kết thúc." };
  }
  if (code === "LAB_TEST_TREND_NOT_FOUND") {
    return { code, message: "Không tìm thấy dữ liệu xu hướng cho chỉ số này." };
  }
  if (code === "UNAUTHENTICATED") {
    return { code, message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để xem xu hướng xét nghiệm." };
  }
  if (code === "ANALYTICS_CONFLICT") {
    return { code, message: "Dữ liệu xu hướng đang được cập nhật. Vui lòng thử lại sau." };
  }
  if (code === "INVALID_REQUEST") {
    return { code, message: "Yêu cầu tải xu hướng chưa hợp lệ. Vui lòng kiểm tra lại bộ lọc." };
  }
  return { code, message: fallback };
}

function indicatorLabel(indicator) {
  const name = String(indicator?.name ?? "").trim();
  const symbol = String(indicator?.symbol ?? "").trim();
  if (name && symbol) return `${name} (${symbol})`;
  return name || symbol || "Chỉ số chưa đặt tên";
}

export default function LabTestTrendSection({ onOpenSession, refreshKey = 0 }) {
  const [indicators, setIndicators] = useState([]);
  const [indicatorStatus, setIndicatorStatus] = useState("loading");
  const [indicatorError, setIndicatorError] = useState("");
  const [selectedIndicatorId, setSelectedIndicatorId] = useState("");
  const [trend, setTrend] = useState(null);
  const [trendStatus, setTrendStatus] = useState("idle");
  const [trendError, setTrendError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [appliedRange, setAppliedRange] = useState({ from: "", to: "" });
  const [filterError, setFilterError] = useState("");

  const loadTrend = useCallback(async (indicatorId, range) => {
    if (!indicatorId) {
      setTrend(null);
      setTrendStatus("idle");
      setTrendError("");
      return;
    }

    setTrendStatus("loading");
    setTrendError("");
    try {
      const response = await labTestsApi.getIndicatorTrend(indicatorId, range);
      setTrend(response?.data ?? null);
      setTrendStatus(response?.data ? "ready" : "empty");
    } catch (error) {
      const mapped = getAnalyticsError(error, "Chưa thể tải dữ liệu xu hướng xét nghiệm. Vui lòng thử lại.");
      setTrend(null);
      if (mapped.code === "LAB_TEST_TREND_NOT_FOUND" || error?.status === 404) {
        setTrendStatus("empty");
        setTrendError(mapped.message);
      } else {
        setTrendStatus("error");
        setTrendError(mapped.message);
      }
    }
  }, []);

  const loadIndicators = useCallback(async (range, preferredIndicatorId = "") => {
    setIndicatorStatus("loading");
    setIndicatorError("");
    try {
      const response = await labTestsApi.getTrendIndicators(range);
      const nextIndicators = Array.isArray(response?.data) ? response.data : [];
      setIndicators(nextIndicators);
      setIndicatorStatus("ready");

      const nextSelectedId = nextIndicators.some((item) => item.indicatorId === preferredIndicatorId)
        ? preferredIndicatorId
        : nextIndicators[0]?.indicatorId || "";
      setSelectedIndicatorId(nextSelectedId);

      if (nextSelectedId) {
        await loadTrend(nextSelectedId, range);
      } else {
        setTrend(null);
        setTrendStatus("idle");
        setTrendError("");
      }
    } catch (error) {
      const mapped = getAnalyticsError(error, "Chưa thể tải danh sách chỉ số có thể theo dõi. Vui lòng thử lại.");
      setIndicators([]);
      setSelectedIndicatorId("");
      setTrend(null);
      setTrendStatus("idle");
      setIndicatorStatus("error");
      setIndicatorError(mapped.message);
    }
  }, [loadTrend]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadIndicators(appliedRange, selectedIndicatorId);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleIndicatorChange(event) {
    const indicatorId = event.target.value;
    setSelectedIndicatorId(indicatorId);
    void loadTrend(indicatorId, appliedRange);
  }

  function handleApplyFilter(event) {
    event.preventDefault();
    if (from && to && from > to) {
      setFilterError("Ngày bắt đầu không được sau ngày kết thúc.");
      return;
    }
    setFilterError("");
    const nextRange = { from, to };
    setAppliedRange(nextRange);
    void loadIndicators(nextRange, selectedIndicatorId);
  }

  function handleClearFilter() {
    setFrom("");
    setTo("");
    setFilterError("");
    const nextRange = { from: "", to: "" };
    setAppliedRange(nextRange);
    void loadIndicators(nextRange, selectedIndicatorId);
  }

  const selectedIndicator = indicators.find((item) => item.indicatorId === selectedIndicatorId) ?? null;
  const trendLabel = LAB_TREND_LABELS[trend?.trend] || "Chưa có kết luận xu hướng";
  const unit = trend?.unit || selectedIndicator?.unit || "";
  const hasFilter = Boolean(appliedRange.from || appliedRange.to);

  return (
    <section className="lab-trend-section" aria-labelledby="lab-trend-title">
      <header className="lab-trend-section__header">
        <div className="lab-trend-section__heading">
          <span aria-hidden="true"><TrendingUp size={22} /></span>
          <div>
            <p>XU HƯỚNG CHỈ SỐ XÉT NGHIỆM</p>
            <h2 id="lab-trend-title">Theo dõi thay đổi theo thời gian</h2>
            <span>Biểu đồ chỉ hiển thị dữ liệu và phân loại xu hướng do hệ thống trả về; không tự suy luận tình trạng sức khỏe.</span>
          </div>
        </div>
        <Button
          type="button"
          tone="secondary"
          size="sm"
          disabled={indicatorStatus === "loading" || trendStatus === "loading"}
          onClick={() => loadIndicators(appliedRange, selectedIndicatorId)}
        >
          <RefreshCw size={16} aria-hidden="true" /> Tải lại
        </Button>
      </header>

      <form className="lab-trend-filter" onSubmit={handleApplyFilter} noValidate>
        <label>
          <span>Chỉ số xét nghiệm</span>
          <select
            value={selectedIndicatorId}
            disabled={indicatorStatus !== "ready" || indicators.length === 0}
            onChange={handleIndicatorChange}
          >
            {indicators.length === 0 && <option value="">Chưa có chỉ số</option>}
            {indicators.map((indicator) => (
              <option key={indicator.indicatorId} value={indicator.indicatorId}>{indicatorLabel(indicator)}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Từ ngày</span>
          <input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setFilterError(""); }} />
        </label>
        <label>
          <span>Đến ngày</span>
          <input type="date" value={to} onChange={(event) => { setTo(event.target.value); setFilterError(""); }} />
        </label>
        <div className="lab-trend-filter__actions">
          <Button type="submit" disabled={indicatorStatus === "loading" || trendStatus === "loading"}>
            <CalendarRange size={16} aria-hidden="true" /> Áp dụng
          </Button>
          {hasFilter && (
            <Button type="button" tone="secondary" onClick={handleClearFilter}>Xóa lọc</Button>
          )}
        </div>
        {filterError && <p className="lab-trend-filter__error" role="alert">{filterError}</p>}
      </form>

      {indicatorStatus === "loading" && indicators.length === 0 && (
        <LoadingState label="Đang tải các chỉ số có thể theo dõi…" />
      )}

      {indicatorStatus === "error" && (
        <ErrorState
          title="Không thể tải xu hướng xét nghiệm"
          description={indicatorError}
          action={<Button onClick={() => loadIndicators(appliedRange, selectedIndicatorId)}>Thử lại</Button>}
        />
      )}

      {indicatorStatus === "ready" && indicators.length === 0 && (
        <EmptyState
          icon={<FlaskConical size={27} aria-hidden="true" />}
          title="Chưa có dữ liệu xu hướng xét nghiệm"
          description="Khi bạn có kết quả xét nghiệm đã được phân tích thành công, các chỉ số có thể theo dõi sẽ xuất hiện tại đây."
        />
      )}

      {indicatorStatus === "ready" && indicators.length > 0 && (
        <div className="lab-trend-content">
          {selectedIndicator && (
            <div className="lab-trend-indicator-meta">
              <div>
                <strong>{indicatorLabel(selectedIndicator)}</strong>
                <span>{Number(selectedIndicator.measurementCount) || 0} lần đo</span>
              </div>
              <span>{formatDateOnly(selectedIndicator.firstTestDate)} → {formatDateOnly(selectedIndicator.latestTestDate)}</span>
            </div>
          )}

          {trendStatus === "loading" && <LoadingState label="Đang tải xu hướng xét nghiệm…" />}
          {trendStatus === "error" && (
            <ErrorState
              title="Không thể tải xu hướng xét nghiệm"
              description={trendError}
              action={<Button onClick={() => loadTrend(selectedIndicatorId, appliedRange)}>Thử lại</Button>}
            />
          )}
          {trendStatus === "empty" && (
            <EmptyState
              title="Chưa có dữ liệu xu hướng cho chỉ số này"
              description={trendError || "Hãy thử một chỉ số hoặc khoảng thời gian khác."}
            />
          )}

          {trendStatus === "ready" && trend && (
            <>
              <div className="lab-trend-summary" aria-label="Tóm tắt xu hướng chỉ số">
                <article><span>Giá trị gần nhất</span><strong>{formatNumber(trend.latestValue)}{unit ? ` ${unit}` : ""}</strong></article>
                <article><span>Lần trước</span><strong>{trend.previousValue == null ? "Chưa có" : `${formatNumber(trend.previousValue)}${unit ? ` ${unit}` : ""}`}</strong></article>
                <article><span>Số lần đo</span><strong>{Number(trend.measurementCount) || 0}</strong></article>
                <article className="is-trend"><span>Xu hướng</span><strong>{trendLabel}</strong></article>
              </div>

              {trend.hasMixedUnits && (
                <div className="lab-trend-warning" role="note">
                  <AlertTriangle size={18} aria-hidden="true" />
                  <span>Các kết quả trong lịch sử sử dụng nhiều đơn vị khác nhau. MediMate không tự động chuyển đổi đơn vị cho biểu đồ này.</span>
                </div>
              )}

              {trend.trend === "insufficientData" && (
                <div className="lab-trend-information" role="status">
                  Cần ít nhất hai lần xét nghiệm phù hợp để xác định xu hướng. Hệ thống vẫn hiển thị dữ liệu hiện có để bạn theo dõi.
                </div>
              )}

              <LabTestTrendChart trend={trend} onOpenSession={onOpenSession} />
            </>
          )}
        </div>
      )}
    </section>
  );
}
