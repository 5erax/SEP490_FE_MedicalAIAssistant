import { ExternalLink } from "lucide-react";
import { Button } from "../ui";

const LAB_RESULT_STATUS_LABELS = {
  unknown: "Chưa xác định",
  normal: "Trong khoảng tham chiếu",
  high: "Cao",
  low: "Thấp",
};

function formatDateOnly(value) {
  const [year, month, day] = String(value ?? "").slice(0, 10).split("-");
  if (!year || !month || !day) return "Chưa cập nhật";
  return `${day}/${month}/${year}`;
}

function formatNumber(value, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(number);
}

function finiteOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function sortedPoints(points) {
  return [...(Array.isArray(points) ? points : [])].sort((left, right) => (
    String(left?.testDate ?? "").localeCompare(String(right?.testDate ?? ""))
  ));
}

function buildSegments(points, accessor, xAt, yAt) {
  const segments = [];
  let current = [];

  points.forEach((point, index) => {
    const value = finiteOrNull(accessor(point));
    if (value === null) {
      if (current.length > 0) segments.push(current);
      current = [];
      return;
    }
    current.push([xAt(index), yAt(value)]);
  });

  if (current.length > 0) segments.push(current);
  return segments;
}

function pathFromSegment(segment) {
  return segment.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x},${y}`).join(" ");
}

export default function LabTestTrendChart({ trend, onOpenSession }) {
  const points = sortedPoints(trend?.points);
  if (points.length === 0) return null;

  const width = 820;
  const height = 310;
  const margins = { top: 20, right: 26, bottom: 48, left: 64 };
  const chartWidth = width - margins.left - margins.right;
  const chartHeight = height - margins.top - margins.bottom;

  const numericValues = points.flatMap((point) => [
    finiteOrNull(point?.value),
    finiteOrNull(point?.referenceMin),
    finiteOrNull(point?.referenceMax),
  ]).filter((value) => value !== null);

  let minimum = Math.min(...numericValues);
  let maximum = Math.max(...numericValues);
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) {
    minimum = 0;
    maximum = 1;
  }
  const rawRange = maximum - minimum;
  const padding = rawRange > 0
    ? rawRange * 0.12
    : Math.max(Math.abs(maximum) * 0.1, 1);
  const yMin = minimum - padding;
  const yMax = maximum + padding;
  const yRange = Math.max(yMax - yMin, 1);

  const xAt = (index) => (
    points.length === 1
      ? margins.left + chartWidth / 2
      : margins.left + (index / (points.length - 1)) * chartWidth
  );
  const yAt = (value) => margins.top + ((yMax - value) / yRange) * chartHeight;
  const valueSegments = buildSegments(points, (point) => point.value, xAt, yAt);
  const minSegments = buildSegments(points, (point) => point.referenceMin, xAt, yAt);
  const maxSegments = buildSegments(points, (point) => point.referenceMax, xAt, yAt);
  const gridValues = Array.from({ length: 5 }, (_, index) => yMin + (index / 4) * yRange).reverse();

  const firstLabelIndex = 0;
  const middleLabelIndex = Math.floor((points.length - 1) / 2);
  const lastLabelIndex = points.length - 1;
  const labelIndices = [...new Set([firstLabelIndex, middleLabelIndex, lastLabelIndex])];

  return (
    <div className="lab-trend-chart-wrap">
      <div className="lab-trend-chart-scroll">
        <svg
          className="lab-trend-chart"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-labelledby="lab-trend-chart-title lab-trend-chart-description"
        >
          <title id="lab-trend-chart-title">Biểu đồ lịch sử {trend?.name || trend?.symbol || "chỉ số xét nghiệm"}</title>
          <desc id="lab-trend-chart-description">
            Biểu đồ hiển thị giá trị xét nghiệm và khoảng tham chiếu do hệ thống trả về theo từng ngày xét nghiệm.
          </desc>

          {gridValues.map((value) => {
            const y = yAt(value);
            return (
              <g key={value} className="lab-trend-chart__grid">
                <line x1={margins.left} x2={width - margins.right} y1={y} y2={y} />
                <text x={margins.left - 10} y={y + 4} textAnchor="end">{formatNumber(value)}</text>
              </g>
            );
          })}

          {minSegments.map((segment, index) => (
            <path key={`min-${index}`} className="lab-trend-chart__reference is-min" d={pathFromSegment(segment)} />
          ))}
          {maxSegments.map((segment, index) => (
            <path key={`max-${index}`} className="lab-trend-chart__reference is-max" d={pathFromSegment(segment)} />
          ))}
          {valueSegments.map((segment, index) => (
            <path key={`value-${index}`} className="lab-trend-chart__value-line" d={pathFromSegment(segment)} />
          ))}

          {points.map((point, index) => {
            const value = finiteOrNull(point?.value);
            if (value === null) return null;
            return (
              <circle
                key={`${point.sessionId || index}-${point.testDate || index}`}
                className={`lab-trend-chart__point is-${String(point.status || "unknown").toLowerCase()}`}
                cx={xAt(index)}
                cy={yAt(value)}
                r="5.5"
              >
                <title>{[
                  formatDateOnly(point.testDate),
                  `${formatNumber(point.value)}${point.unit || trend?.unit ? ` ${point.unit || trend?.unit}` : ""}`,
                  LAB_RESULT_STATUS_LABELS[String(point.status || "unknown").toLowerCase()] || "Chưa xác định",
                  point.facilityName || "",
                ].filter(Boolean).join(" · ")}</title>
              </circle>
            );
          })}

          {labelIndices.map((index) => (
            <text
              key={`label-${index}`}
              className="lab-trend-chart__x-label"
              x={xAt(index)}
              y={height - 18}
              textAnchor="middle"
            >
              {formatDateOnly(points[index]?.testDate)}
            </text>
          ))}
        </svg>
      </div>

      <div className="lab-trend-chart-legend" aria-label="Chú giải biểu đồ">
        <span><i className="is-value" aria-hidden="true" /> Giá trị xét nghiệm</span>
        <span><i className="is-reference" aria-hidden="true" /> Khoảng tham chiếu</span>
      </div>

      <ol className="lab-trend-measurements" aria-label="Các lần đo trong biểu đồ">
        {points.map((point, index) => {
          const statusKey = String(point?.status || "unknown").toLowerCase();
          const unit = point?.unit || trend?.unit || "";
          const hasReference = point?.referenceMin != null || point?.referenceMax != null;
          return (
            <li key={`${point.sessionId || index}-${point.testDate || index}`}>
              <div className="lab-trend-measurement__heading">
                <div>
                  <strong>{formatDateOnly(point.testDate)}</strong>
                  <span>{point.facilityName || "Cơ sở chưa được ghi nhận"}</span>
                </div>
                <span className={`lab-trend-status is-${statusKey}`}>{LAB_RESULT_STATUS_LABELS[statusKey] || "Chưa xác định"}</span>
              </div>
              <dl>
                <div><dt>Giá trị</dt><dd>{formatNumber(point.value)}{unit ? ` ${unit}` : ""}</dd></div>
                {hasReference && (
                  <div>
                    <dt>Khoảng tham chiếu</dt>
                    <dd>
                      {point.referenceMin == null ? "—" : formatNumber(point.referenceMin)} – {point.referenceMax == null ? "—" : formatNumber(point.referenceMax)}{unit ? ` ${unit}` : ""}
                    </dd>
                  </div>
                )}
                {point.deviationPercent != null && (
                  <div><dt>Độ lệch</dt><dd>{formatNumber(point.deviationPercent)}%</dd></div>
                )}
              </dl>
              {point.sessionId && onOpenSession && (
                <Button
                  type="button"
                  tone="secondary"
                  size="sm"
                  onClick={(event) => onOpenSession(point.sessionId, event.currentTarget)}
                >
                  Xem kết quả <ExternalLink size={15} aria-hidden="true" />
                </Button>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
