import { formatCompactCurrency, formatCurrency } from "./overviewChartUtils";
import { normalizeSaleRevenueSeries } from "./saleRevenueImpactUtils";

export default function SaleRevenueImpactChart({ series }) {
  const points = normalizeSaleRevenueSeries(series);
  const width = Math.max(720, points.length * 80 + 96);
  const left = 88;
  const right = width - 24;
  const top = 52;
  const bottom = 252;
  const step = (right - left) / Math.max(points.length, 1);
  const maxValue = points.reduce((max, point) => Math.max(max, Number(point.totalRevenue) || 0, Number(point.campaignRevenue) || 0), 1);
  const x = (index) => left + step * (index + 0.5);
  const y = (value) => bottom - ((Number(value) || 0) / maxValue) * (bottom - top);
  const path = (field) => points.map((point, index) => `${index ? "L" : "M"}${x(index)},${y(point[field])}`).join(" ");
  const bands = [];
  points.forEach((point, index) => {
    const previous = bands[bands.length - 1];
    if (previous?.period === point.period) previous.end = index;
    else bands.push({ period: point.period, label: point.periodLabel, start: index, end: index });
  });

  return (
    <div className="sale-impact-chart">
      <ul className="sale-impact-legend" aria-label="Chú giải doanh thu">
        <li><span className="sale-impact-swatch" aria-hidden="true" />Doanh thu toàn hệ thống</li>
        <li><span className="sale-impact-swatch is-campaign" aria-hidden="true" />Doanh thu từ campaign</li>
      </ul>
      <div className="sale-impact-chart-scroll" role="region" aria-label="Biểu đồ Sale, cuộn ngang để xem toàn bộ thời gian" tabIndex={0}>
        <svg viewBox={`0 0 ${width} 292`} style={{ minWidth: width }} role="img" aria-label="Doanh thu hàng ngày trước, trong và sau Sale">
          {bands.map((band) => (
            <g key={`${band.period}-${band.start}`}>
              <rect x={left + step * band.start} y={top} width={step * (band.end - band.start + 1)} height={bottom - top}
                className={`sale-impact-band is-${band.period.toLowerCase()}`} />
              <text x={left + step * (band.start + band.end + 1) / 2} y={28} textAnchor="middle" className="sale-impact-axis">{band.label}</text>
              {band.start > 0 && <line x1={left + step * band.start} x2={left + step * band.start} y1={top} y2={bottom} className="sale-impact-separator" />}
            </g>
          ))}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <g key={ratio}>
              <line x1={left} x2={right} y1={y(maxValue * ratio)} y2={y(maxValue * ratio)} className="sale-impact-grid" />
              <text x={left - 10} y={y(maxValue * ratio) + 4} textAnchor="end" className="sale-impact-axis">{formatCompactCurrency(maxValue * ratio)}</text>
            </g>
          ))}
          <path d={path("totalRevenue")} className="sale-impact-line" />
          <path d={path("campaignRevenue")} className="sale-impact-line is-campaign" />
          {points.map((point, index) => (
            <g key={point.id} className="sale-impact-point" data-period={point.period} data-date={point.date}>
              <circle cx={x(index)} cy={y(point.totalRevenue)} r="4" className="sale-impact-dot">
                <title>{`${point.dateLabel} · ${point.periodLabel}: Toàn hệ thống ${formatCurrency(point.totalRevenue)}`}</title>
              </circle>
              <circle cx={x(index)} cy={y(point.campaignRevenue)} r="4" className="sale-impact-dot is-campaign">
                <title>{`${point.dateLabel} · ${point.periodLabel}: Campaign ${formatCurrency(point.campaignRevenue)}`}</title>
              </circle>
              <text x={x(index)} y={278} textAnchor="middle" className="sale-impact-axis">{point.dateLabel}</text>
            </g>
          ))}
        </svg>
      </div>
      <details className="sale-impact-data">
        <summary>Xem dữ liệu từng ngày</summary>
        <div className="sale-impact-chart-scroll" tabIndex={0} role="region" aria-label="Bảng dữ liệu doanh thu từng ngày">
          <table>
            <caption>Doanh thu và giao dịch theo từng ngày, từng giai đoạn</caption>
            <thead><tr><th scope="col">Ngày</th><th scope="col">Giai đoạn</th><th scope="col">Toàn hệ thống</th><th scope="col">Từ campaign</th><th scope="col">Giao dịch đã trả</th><th scope="col">Giao dịch Sale</th></tr></thead>
            <tbody>{points.map((point) => (
              <tr key={point.id}><th scope="row">{point.date}</th><td>{point.periodLabel}</td><td>{formatCurrency(point.totalRevenue)}</td><td>{formatCurrency(point.campaignRevenue)}</td><td>{point.paidOrders}</td><td>{point.campaignOrders}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
