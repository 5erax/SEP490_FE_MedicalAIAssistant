import { formatFacilityRating } from "../../utils/facilityRating";
import { ChevronDown, Stethoscope } from "lucide-react";

export default function FacilityList({
  cardRefs,
  facilities,
  loading,
  onViewDetail,
  selectedFacilityId,
  emptyMessage,
  onRetry,
  error,
  summary,
  resultDetails,
  specialtyId,
  specialtyName,
  onExpand,
  expandLabel,
  onChangeFilters,
}) {
  return (
    <section className="facility-list-panel" id="facility-list" tabIndex="-1" aria-labelledby="facility-list-title">
      <div className="result-summary">
        <div>
          <h2 id="facility-list-title" className="sr-only">Danh sách cơ sở</h2>
          <span role="status" aria-live="polite">
            {loading ? "Đang tìm cơ sở phù hợp…" : error ? "Chưa tải được danh sách cơ sở" : summary || `${facilities.length} cơ sở phù hợp`}
          </span>
        </div>
        {resultDetails && !loading && !error && <details className="explorer-result-info">
          <summary>Về kết quả này <ChevronDown size={18} aria-hidden="true" /></summary>
          <div>{resultDetails}</div>
        </details>}
      </div>
      {loading && [0, 1, 2].map((item) => (
        <article className="facility-result-card facility-result-skeleton" key={item} aria-hidden="true">
          <span className="skeleton-line" />
          <span className="skeleton-line short" />
          <span className="skeleton-line" />
        </article>
      ))}
      {!loading && error && <div className="explorer-notice" role="alert">{error}{onRetry && <button type="button" className="facility-select-button" onClick={onRetry}>Thử lại</button>}</div>}
      {!loading && !error && facilities.length === 0 && (
        <div className="sidebar-note"><p role="status">{emptyMessage || "Chưa tìm thấy cơ sở phù hợp trong dữ liệu hiện có. Bạn có thể đổi bộ lọc hoặc từ khóa."}</p>{onChangeFilters && <button type="button" className="facility-select-button" onClick={onChangeFilters}>Đổi bộ lọc</button>}</div>
      )}
      {!loading && !error && facilities.map((facility) => (
        <article
          ref={(node) => { cardRefs.current[facility.facilityId] = node; }}
          className={`facility-result-card ${selectedFacilityId === facility.facilityId ? "selected" : ""}`}
          key={facility.facilityId}
        >
          <div className="facility-top">
            <strong>{facility.facilityName}</strong>
            {facility.distanceLabel && <span className="explorer-distance" aria-label={`Khoảng cách ước tính ${facility.distanceLabel}`}>≈ {facility.distanceLabel}</span>}
          </div>
          {specialtyName && facility.departmentIds?.some((id) => String(id).toLowerCase() === String(specialtyId).toLowerCase()) && <p className="facility-card-specialty"><Stethoscope size={16} aria-hidden="true" />{specialtyName}</p>}
          <p className="facility-card-address">{facility.address}</p>
          <p className="facility-card-rating">{formatFacilityRating(facility)}</p>
          <button
            className="facility-select-button"
            type="button"
            aria-pressed={selectedFacilityId === facility.facilityId}
            aria-label={`Xem chi tiết ${facility.facilityName}`}
            onClick={(event) => { event.stopPropagation(); onViewDetail(facility); }}
          >
            {selectedFacilityId === facility.facilityId ? "Đang xem chi tiết" : "Xem chi tiết"}
          </button>
        </article>
      ))}
      {!loading && !error && onExpand && <button className="explorer-expand-search" type="button" onClick={onExpand}>{expandLabel}</button>}
    </section>
  );
}
