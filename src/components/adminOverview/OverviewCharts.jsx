import { LineChart, PieChart, TrendingUp, Users } from "lucide-react";
import {
  buildDepartmentDistribution,
  buildPaymentStatusCounts,
  buildRevenueGrowth,
  formatCompactCurrency,
  formatCurrency,
} from "./overviewChartUtils";

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

export function PaymentSuccessGaugeChart({ success, failure }) {
  const total = success + failure;
  const percent = total > 0 ? Math.round((success / total) * 100) : 0;

  const width = 240;
  const height = 150;
  const radius = 92;
  const strokeWidth = 28;
  const cx = width / 2;
  const cy = 136;
  const circumference = Math.PI * radius;
  const dash = (percent / 100) * circumference;
  const path = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;

  return (
    <div className="overview-gauge-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Tỉ lệ thanh toán thành công: ${percent}%`}>
        <path d={path} className="overview-gauge-track" strokeWidth={strokeWidth} fill="none" />
        {total > 0 && (
          <path
            d={path}
            className="overview-gauge-value"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${dash} ${circumference - dash}`}
          />
        )}
        <text x={cx} y={cy - 14} textAnchor="middle" className="overview-gauge-percent-text">
          {percent}%
        </text>
      </svg>
      <ul className="overview-gauge-legend">
        <li>
          <span className="overview-gauge-swatch is-success" aria-hidden="true" />
          <span>Thành công</span>
          <strong>{success}</strong>
        </li>
        <li>
          <span className="overview-gauge-swatch is-muted" aria-hidden="true" />
          <span>Không thành công</span>
          <strong>{failure}</strong>
        </li>
      </ul>
    </div>
  );
}

export function DepartmentPieChart({ segments }) {
  const size = 220;
  const radius = 100;
  const center = size / 2;
  const toRad = (deg) => (deg * Math.PI) / 180;

  const slices = segments.reduce((acc, segment) => {
    const previous = acc[acc.length - 1];
    const startAngle = previous ? previous.endAngle : -90;
    const angle = segment.fraction * 360;
    const endAngle = startAngle + angle;

    const x1 = center + radius * Math.cos(toRad(startAngle));
    const y1 = center + radius * Math.sin(toRad(startAngle));
    const x2 = center + radius * Math.cos(toRad(endAngle));
    const y2 = center + radius * Math.sin(toRad(endAngle));
    const largeArc = angle > 180 ? 1 : 0;

    acc.push({
      ...segment,
      endAngle,
      path: `M${center},${center} L${x1},${y1} A${radius},${radius} 0 ${largeArc} 1 ${x2},${y2} Z`,
    });
    return acc;
  }, []);

  return (
    <div className="overview-pie-chart">
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Tỉ trọng chuyên khoa trong tổng số cơ sở y tế">
        {slices.length === 1 ? (
          <circle cx={center} cy={center} r={radius} className="overview-pie-slice" style={{ fill: slices[0].color }}>
            <title>{`${slices[0].label}: ${slices[0].value} (100%)`}</title>
          </circle>
        ) : (
          slices.map((slice) => (
            <path key={slice.id} d={slice.path} className="overview-pie-slice" style={{ fill: slice.color }}>
              <title>{`${slice.label}: ${slice.value} (${Math.round(slice.fraction * 100)}%)`}</title>
            </path>
          ))
        )}
      </svg>
      <ul className="overview-pie-legend">
        {segments.map((segment) => (
          <li key={segment.id}>
            <span className="overview-pie-swatch" style={{ backgroundColor: segment.color }} aria-hidden="true" />
            <span className="overview-pie-legend-label">{segment.label}</span>
            <strong>{segment.value}</strong>
            <span className="overview-pie-legend-percent">{Math.round(segment.fraction * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DepartmentDistributionCard({ loading, error, facilityDepartments, onRetry }) {
  const { segments, total } = buildDepartmentDistribution(facilityDepartments);

  return (
    <div className="admin-overview-chart-card is-department-pie">
      <header className="admin-overview-chart-head">
        <span className="admin-overview-chart-icon" aria-hidden="true"><PieChart size={19} /></span>
        <div>
          <p className="eyebrow">Cơ sở y tế</p>
          <h3>Tỉ trọng chuyên khoa theo cơ sở y tế</h3>
        </div>
      </header>

      {loading ? (
        <p className="admin-overview-chart-status">Đang tải dữ liệu cơ sở - khoa…</p>
      ) : error ? (
        <div className="admin-overview-chart-empty">
          <strong>Không thể tải dữ liệu cơ sở - khoa</strong>
          <p>{error}</p>
          <button type="button" className="btn btn-ghost btn-small" onClick={onRetry}>Thử lại</button>
        </div>
      ) : total === 0 ? (
        <div className="admin-overview-chart-empty">
          <strong>Chưa có cơ sở nào được gán chuyên khoa</strong>
          <p>Biểu đồ sẽ hiển thị khi cơ sở y tế được gán ít nhất một chuyên khoa.</p>
        </div>
      ) : (
        <>
          <p className="admin-overview-chart-total">{total} lượt gán chuyên khoa</p>
          <DepartmentPieChart segments={segments} />
        </>
      )}
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
        <PaymentSuccessGaugeChart success={success} failure={failure} />
      )}
    </div>
  );
}
