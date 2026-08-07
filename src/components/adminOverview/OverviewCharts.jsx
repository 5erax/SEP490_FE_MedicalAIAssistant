import { LineChart, TrendingUp, Users } from "lucide-react";
import { buildPaymentStatusCounts, buildRevenueGrowth, formatCompactCurrency, formatCurrency } from "./overviewChartUtils";

export function RevenueLineChart({ series }) {
  const width = 720;
  const height = 220;
  const xPadding = 24;
  const topPadding = 30;
  const bottomPadding = 30;
  const plotWidth = width - xPadding * 2;
  const plotHeight = height - topPadding - bottomPadding;

  const maxValue = Math.max(...series.map((point) => point.value), 1);
  const stepX = series.length > 1 ? plotWidth / (series.length - 1) : 0;

  const points = series.map((point, index) => ({
    ...point,
    x: xPadding + (series.length > 1 ? index * stepX : plotWidth / 2),
    y: topPadding + plotHeight - (point.value / maxValue) * plotHeight,
  }));

  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  const gridLineCount = 4;
  const gridLines = Array.from({ length: gridLineCount + 1 }, (_, index) => topPadding + (plotHeight / gridLineCount) * index);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="overview-line-chart"
      role="img"
      aria-label="Biểu đồ doanh thu theo từng tháng"
    >
      {gridLines.map((y) => (
        <line key={y} x1={xPadding} y1={y} x2={width - xPadding} y2={y} className="overview-line-chart-grid" />
      ))}
      <path d={linePath} className="overview-line-chart-line" />
      {points.map((point) => (
        <g key={point.label}>
          <circle cx={point.x} cy={point.y} r="3.5" className="overview-line-chart-dot">
            <title>{`${point.label}: ${formatCurrency(point.value)}`}</title>
          </circle>
          {point.value > 0 && (
            <text x={point.x} y={point.y - 10} textAnchor="middle" className="overview-line-chart-value-label">
              {formatCompactCurrency(point.value)}
            </text>
          )}
          <text x={point.x} y={height - 8} textAnchor="middle" className="overview-line-chart-axis-label">
            {point.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function PaymentStatusDonutChart({ success, failure }) {
  const total = success + failure;
  const size = 200;
  const radius = 74;
  const strokeWidth = 30;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  const segments = [
    { key: "success", label: "Thành công", value: success, tone: "success" },
    { key: "failure", label: "Không thành công", value: failure, tone: "danger" },
  ].filter((segment) => segment.value > 0);

  let cumulativeFraction = 0;
  const arcs = segments.map((segment) => {
    const fraction = segment.value / total;
    const dash = fraction * circumference;
    const arc = { ...segment, fraction, dash, offset: -cumulativeFraction * circumference };
    cumulativeFraction += fraction;
    return arc;
  });

  return (
    <div className="overview-donut-chart">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Tỉ lệ thanh toán: ${success} thành công, ${failure} không thành công`}
      >
        <circle cx={center} cy={center} r={radius} className="overview-donut-track" strokeWidth={strokeWidth} fill="none" />
        {arcs.map((arc) => (
          <circle
            key={arc.key}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
            strokeDashoffset={arc.offset}
            transform={`rotate(-90 ${center} ${center})`}
            className={`overview-donut-segment is-${arc.tone}`}
          >
            <title>{`${arc.label}: ${arc.value} (${Math.round(arc.fraction * 100)}%)`}</title>
          </circle>
        ))}
      </svg>
      <div className="overview-donut-center">
        <strong>{total}</strong>
        <span>giao dịch</span>
      </div>
      <ul className="overview-donut-legend">
        {segments.map((segment) => (
          <li key={segment.key}>
            <span className={`overview-donut-swatch is-${segment.tone}`} aria-hidden="true" />
            <span className="overview-donut-legend-label">{segment.label}</span>
            <strong>{segment.value}</strong>
            <span className="overview-donut-legend-percent">{Math.round((segment.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function UserGrowthPlaceholderCard() {
  return (
    <div className="admin-overview-chart-card is-placeholder">
      <header className="admin-overview-chart-head">
        <span className="admin-overview-chart-icon" aria-hidden="true"><Users size={19} /></span>
        <div>
          <p className="eyebrow">Tài khoản người dùng</p>
          <h3>Tăng trưởng tài khoản</h3>
        </div>
      </header>
      <div className="admin-overview-chart-empty">
        <LineChart size={26} aria-hidden="true" />
        <strong>Chưa có dữ liệu</strong>
        <p>API tài khoản người dùng hiện chưa trả về thời gian tạo (createdAt), nên MediMate chưa thể vẽ biểu đồ tăng trưởng này.</p>
      </div>
    </div>
  );
}

export function RevenueChartCard({ loading, error, payments, onRetry }) {
  const { series, total, year } = buildRevenueGrowth(payments);

  return (
    <div className="admin-overview-chart-card is-revenue">
      <header className="admin-overview-chart-head">
        <span className="admin-overview-chart-icon" aria-hidden="true"><TrendingUp size={19} /></span>
        <div>
          <p className="eyebrow">Doanh thu</p>
          <h3>Doanh thu theo tháng{year ? ` - Năm ${year}` : ""}</h3>
        </div>
      </header>

      {loading ? (
        <p className="admin-overview-chart-status">Đang tải dữ liệu thanh toán…</p>
      ) : error ? (
        <div className="admin-overview-chart-empty">
          <strong>Không thể tải dữ liệu thanh toán</strong>
          <p>{error}</p>
          <button type="button" className="btn btn-ghost btn-small" onClick={onRetry}>Thử lại</button>
        </div>
      ) : total === 0 ? (
        <div className="admin-overview-chart-empty">
          <strong>Chưa có giao dịch thành công</strong>
          <p>Doanh thu sẽ hiển thị khi có thanh toán thành công đầu tiên.</p>
        </div>
      ) : (
        <>
          <p className="admin-overview-chart-total">{formatCurrency(total)}</p>
          <RevenueLineChart series={series} />
        </>
      )}
    </div>
  );
}

export function PaymentStatusChartCard({ loading, error, payments, onRetry }) {
  const { success, failure } = buildPaymentStatusCounts(payments);

  return (
    <div className="admin-overview-chart-card is-payment-status">
      <header className="admin-overview-chart-head">
        <span className="admin-overview-chart-icon" aria-hidden="true"><TrendingUp size={19} /></span>
        <div>
          <p className="eyebrow">Thanh toán</p>
          <h3>Tỉ lệ thanh toán thành công</h3>
        </div>
      </header>

      {loading ? (
        <p className="admin-overview-chart-status">Đang tải dữ liệu thanh toán…</p>
      ) : error ? (
        <div className="admin-overview-chart-empty">
          <strong>Không thể tải dữ liệu thanh toán</strong>
          <p>{error}</p>
          <button type="button" className="btn btn-ghost btn-small" onClick={onRetry}>Thử lại</button>
        </div>
      ) : success + failure === 0 ? (
        <div className="admin-overview-chart-empty">
          <strong>Chưa có giao dịch đã hoàn tất</strong>
          <p>Tỉ lệ sẽ hiển thị khi có giao dịch thành công hoặc thất bại.</p>
        </div>
      ) : (
        <PaymentStatusDonutChart success={success} failure={failure} />
      )}
    </div>
  );
}
