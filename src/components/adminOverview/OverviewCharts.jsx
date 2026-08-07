import { LineChart, TrendingUp, Users } from "lucide-react";
import { buildPaymentStatusCounts, buildRevenueGrowth, formatCurrency } from "./overviewChartUtils";

export function RevenueLineChart({ series }) {
  const width = 600;
  const height = 200;
  const maxValue = Math.max(...series.map((point) => point.value), 1);
  const stepX = series.length > 1 ? width / (series.length - 1) : 0;

  const points = series.map((point, index) => ({
    ...point,
    x: series.length > 1 ? index * stepX : width / 2,
    y: height - (point.value / maxValue) * (height - 12) - 6,
  }));

  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  const areaPath = points.length > 0
    ? `${linePath} L${points[points.length - 1].x},${height} L${points[0].x},${height} Z`
    : "";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="overview-line-chart"
      role="img"
      aria-label="Biểu đồ tăng trưởng doanh thu theo tháng"
    >
      <path d={areaPath} className="overview-line-chart-area" />
      <path d={linePath} className="overview-line-chart-line" />
      {points.map((point) => (
        <circle key={point.label} cx={point.x} cy={point.y} r="4" className="overview-line-chart-dot">
          <title>{`${point.label}: ${formatCurrency(point.value)}`}</title>
        </circle>
      ))}
    </svg>
  );
}

export function PaymentStatusBarChart({ success, failure }) {
  const total = success + failure;
  const maxValue = Math.max(success, failure, 1);
  const bars = [
    { key: "success", label: "Thành công", value: success, tone: "success" },
    { key: "failure", label: "Không thành công", value: failure, tone: "danger" },
  ];

  return (
    <div
      className="overview-bar-chart"
      role="img"
      aria-label={`Tỉ lệ thanh toán: ${success} thành công, ${failure} không thành công`}
    >
      {bars.map((bar) => {
        const percentOfTotal = total > 0 ? Math.round((bar.value / total) * 100) : 0;
        return (
          <div className="overview-bar-chart-column" key={bar.key}>
            <span className="overview-bar-chart-value">{bar.value}</span>
            <div className="overview-bar-chart-track">
              <div
                className={`overview-bar-chart-fill is-${bar.tone}`}
                style={{ height: `${(bar.value / maxValue) * 100}%` }}
              />
            </div>
            <span className="overview-bar-chart-label">{bar.label}</span>
            <span className="overview-bar-chart-percent">{percentOfTotal}%</span>
          </div>
        );
      })}
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
  const { series, total } = buildRevenueGrowth(payments);

  return (
    <div className="admin-overview-chart-card is-revenue">
      <header className="admin-overview-chart-head">
        <span className="admin-overview-chart-icon" aria-hidden="true"><TrendingUp size={19} /></span>
        <div>
          <p className="eyebrow">Doanh thu</p>
          <h3>Tăng trưởng doanh thu</h3>
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
      ) : series.length === 0 ? (
        <div className="admin-overview-chart-empty">
          <strong>Chưa có giao dịch thành công</strong>
          <p>Doanh thu sẽ hiển thị khi có thanh toán thành công đầu tiên.</p>
        </div>
      ) : (
        <>
          <p className="admin-overview-chart-total">{formatCurrency(total)}</p>
          <RevenueLineChart series={series} />
          <div className="overview-line-chart-legend">
            {series.map((point) => <span key={point.label}>{point.label}</span>)}
          </div>
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
        <PaymentStatusBarChart success={success} failure={failure} />
      )}
    </div>
  );
}
