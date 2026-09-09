import { Star } from "lucide-react";
import { hasRating } from "../../utils/facilityDiscovery";
export default function FacilityList({ cardRefs, facilities, totalCount, loading, error, onViewDetail, selectedFacilityId }) {
  return <section className="facility-list-panel" id="facility-list" tabIndex="-1" aria-label="Danh sách cơ sở">
    <p role="status" aria-live="polite">{loading ? "Đang tải dữ liệu…" : `Đang hiển thị ${facilities.length}${Number.isFinite(totalCount) ? ` trong ${totalCount}` : ""} cơ sở`}</p>
    {!loading && !error && facilities.length === 0 && <p>Chưa tìm thấy cơ sở phù hợp. Bạn có thể thay đổi từ khóa hoặc điều chỉnh tìm kiếm.</p>}
    {!loading && facilities.map((f) => <article key={f.facilityId} ref={(node) => { cardRefs.current[f.facilityId] = node; }}
      className={`facility-result-card ${selectedFacilityId === f.facilityId ? "selected" : ""}`}>
      <div className="facility-top"><strong>{f.facilityName}</strong>{f.distanceLabel && <span>{f.distanceLabel}</span>}</div>
      <p className="facility-card-address">{f.address}</p>
      <div className="facility-card-meta">{hasRating(f)
        ? <span><Star size={13} aria-hidden="true" /> {f.averageRating.toFixed(1)}/5 · {f.reviewCount} đánh giá</span>
        : <span>{f.reviewCount === 0 ? "Chưa có đánh giá" : "Chưa có dữ liệu đánh giá"}</span>}</div>
      <button className="facility-select-button" type="button" aria-label={`Xem thông tin ${f.facilityName}`} onClick={() => onViewDetail(f)}>Xem thông tin</button>
    </article>)}
  </section>;
}
