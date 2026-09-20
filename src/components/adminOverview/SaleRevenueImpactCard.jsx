import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { saleCampaignsApi } from "../../services/saleCampaignService";
import { formatCurrency } from "./overviewChartUtils";
import { formatRevenueChange, getSaleWindowPresentation, loadAllSaleCampaigns, PERIOD_LABELS, TIMELINE_STATUS_LABELS } from "./saleRevenueImpactUtils";
import SaleRevenueImpactChart from "./SaleRevenueImpactChart";

function formatDateTime(value) {
  if (!value || Number.isNaN(Date.parse(value))) return "Chưa có thời gian";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short", timeStyle: "short",
  }).format(new Date(value));
}

function Metric({ label, value, note }) {
  return (
    <div className="sale-impact-kpi">
      <dt>{label}</dt>
      <dd>{value}</dd>
      {note && <dd className="sale-impact-kpi-note">{note}</dd>}
    </div>
  );
}

function SaleRevenueImpactDetails({ campaignId, onMissing }) {
  const [state, setState] = useState({ loading: true, impact: null, error: "" });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let current = true;
    async function loadImpact() {
      try {
        const response = await saleCampaignsApi.revenueImpact(campaignId);
        if (!response?.data) throw new Error("Missing revenue impact data");
        if (current) setState({ loading: false, impact: response.data, error: "" });
      } catch (error) {
        if (!current) return;
        if (error?.status === 404) onMissing(campaignId);
        else setState({ loading: false, impact: null, error: "Không thể tải phân tích doanh thu. Vui lòng thử lại." });
      }
    }
    const timer = window.setTimeout(loadImpact, 0);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [campaignId, revision, onMissing]);

  function retry() {
    setState({ loading: true, impact: null, error: "" });
    setRevision((value) => value + 1);
  }

  if (state.loading) return <p className="sale-impact-message" role="status">Đang tải phân tích doanh thu…</p>;
  if (state.error) return <div className="sale-impact-message"><p role="alert">{state.error}</p><button type="button" onClick={retry}>Thử lại phân tích</button></div>;

  const { impact } = state;
  const metrics = impact.metrics ?? {};
  const windows = impact.windows ?? {};
  const { notStarted, showAfter, partialAfter, description } = getSaleWindowPresentation(impact);
  const series = impact.series ?? [];
  const count = (value) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(Number(value) || 0);

  return (
    <div className="sale-impact-results">
      <div className="sale-impact-meta">
        <strong>{impact.campaignName}</strong>
        {impact.badgeText && <span>{impact.badgeText}</span>}
        <span className="sale-impact-status">{TIMELINE_STATUS_LABELS[impact.campaignStatus] ?? impact.campaignStatus}</span>
        <button type="button" onClick={retry}><RefreshCw size={15} aria-hidden="true" />Tải lại phân tích</button>
      </div>
      <p className="sale-impact-copy">{formatDateTime(impact.startAt)} → {formatDateTime(impact.endAt)} (giờ địa phương)</p>
      <p className="sale-impact-copy">{description}</p>
      {partialAfter && <p className="sale-impact-notice" role="status">Dữ liệu sau Sale chưa đủ kỳ. Dữ liệu hiện mới là một phần vì chưa đủ độ dài kỳ so sánh.</p>}
      {!notStarted && (
        <>
          <dl className="sale-impact-kpis">
            <Metric label="Kỳ liền trước" value={formatCurrency(metrics.revenueBefore)} note={`${count(metrics.paidOrdersBefore)} giao dịch đã thanh toán`} />
            <Metric label="Trong thời gian Sale" value={formatCurrency(metrics.revenueDuring)} note={`Toàn hệ thống · ${count(metrics.paidOrdersDuring)} giao dịch`} />
            <Metric label="Thay đổi so với kỳ liền trước" value={formatRevenueChange(metrics.revenueChangePercent)} note={`Chênh lệch: ${formatCurrency(metrics.revenueChangeAmount)}`} />
            <Metric label="Doanh thu từ campaign" value={formatCurrency(metrics.campaignRevenue)} note="Giao dịch áp dụng campaign, kể cả thanh toán sau khi Sale kết thúc." />
            {showAfter && <Metric label="Sau Sale" value={formatCurrency(metrics.revenueAfter)} note={`${count(metrics.paidOrdersAfter)} giao dịch${partialAfter ? " · Chưa đủ kỳ" : ""}`} />}
          </dl>
          <dl className="sale-impact-kpis is-secondary">
            <Metric label="Giao dịch Sale" value={count(metrics.campaignPaidOrders)} />
            <Metric label="Giá trị đơn TB" value={formatCurrency(metrics.averageCampaignOrderValue)} />
            <Metric label="Tổng ưu đãi giá đã áp dụng" value={formatCurrency(metrics.campaignDiscountAmount)} />
            <Metric label="Lượt khuyến mãi đã cấp" value={`${count(metrics.campaignBonusCreditGranted)} lượt`} />
          </dl>
          <ul className="sale-impact-windows">
            {["Before", "During", ...(showAfter ? ["After"] : [])].map((period) => (
              <li key={period}><strong>{PERIOD_LABELS[period]}:</strong> {formatDateTime(windows[`${period.toLowerCase()}Start`])} → {formatDateTime(windows[`${period.toLowerCase()}End`])}</li>
            ))}
          </ul>
        </>
      )}
      {notStarted ? <p className="sale-impact-message" role="status">Chưa bắt đầu — biểu đồ sẽ có dữ liệu khi chương trình bắt đầu.</p>
        : series.length ? <SaleRevenueImpactChart series={series} />
          : <p className="sale-impact-message" role="status">Chưa có dữ liệu doanh thu trong các kỳ so sánh.</p>}
      <p className="sale-impact-footnote">Doanh thu toàn hệ thống trong thời gian Sale và doanh thu từ campaign là hai chỉ số riêng. Mức thay đổi phản ánh so sánh giữa các kỳ, không khẳng định nguyên nhân do khuyến mãi.</p>
    </div>
  );
}

export default function SaleRevenueImpactCard() {
  const [list, setList] = useState({ loading: true, items: [], error: "" });
  const [request, setRequest] = useState({ revision: 0, excludedIds: [] });
  const [selectedId, setSelectedId] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let current = true;
    async function loadCampaigns() {
      try {
        const items = await loadAllSaleCampaigns(saleCampaignsApi);
        if (!current) return;
        const available = items.filter((item) => !request.excludedIds.includes(item.id));
        setList({ loading: false, items: available, error: "" });
        setSelectedId((id) => available.some((item) => item.id === id) ? id : available[0]?.id ?? "");
      } catch {
        if (current) setList({ loading: false, items: [], error: "Không thể tải danh sách chương trình khuyến mãi." });
      }
    }
    const timer = window.setTimeout(loadCampaigns, 0);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [request]);

  const handleMissing = useCallback((id) => {
    setNotice("Chương trình đã chọn không còn khả dụng. Danh sách đã được cập nhật; hãy kiểm tra chương trình đang chọn.");
    setSelectedId("");
    setList({ loading: true, items: [], error: "" });
    // Exclude deleted IDs even if a stale list response still contains them.
    setRequest((previous) => ({ revision: previous.revision + 1, excludedIds: [...previous.excludedIds, id] }));
  }, []);

  function refreshList() {
    setNotice("");
    setList((previous) => ({ ...previous, loading: true, error: "" }));
    setRequest((previous) => ({ revision: previous.revision + 1, excludedIds: [] }));
  }

  return (
    <section className="sale-impact-card" aria-labelledby="sale-impact-title">
      <header className="sale-impact-header">
        <div><p className="eyebrow">Phân tích khuyến mãi</p><h3 id="sale-impact-title">Doanh thu theo timeline Sale</h3></div>
        <button type="button" onClick={refreshList} disabled={list.loading}><RefreshCw size={16} aria-hidden="true" />Tải lại danh sách</button>
      </header>
      {notice && <p className="sale-impact-notice" role="status">{notice}</p>}
      {list.loading ? <p className="sale-impact-message" role="status">Đang tải chương trình khuyến mãi…</p>
        : list.error ? <p className="sale-impact-message" role="alert">{list.error} Hãy tải lại danh sách.</p>
          : !list.items.length ? <p className="sale-impact-message">Chưa có chương trình khuyến mãi để phân tích.</p>
            : <>
              <div className="sale-impact-selector"><label htmlFor="sale-impact-campaign">Chương trình khuyến mãi</label>
                <select id="sale-impact-campaign" value={selectedId} onChange={(event) => { setNotice(""); setSelectedId(event.target.value); }}>
                  {list.items.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name} · {formatDateTime(campaign.startAt)}</option>)}
                </select>
              </div>
              {selectedId && <SaleRevenueImpactDetails key={selectedId} campaignId={selectedId} onMissing={handleMissing} />}
            </>}
    </section>
  );
}
