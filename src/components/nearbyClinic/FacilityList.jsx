import { formatFacilityRating } from "../../utils/facilityRating";
import { EmptyState, ErrorState } from "../ui";

export default function FacilityList({
  cardRefs,
  facilities,
  loading,
  onViewDetail,
  selectedFacilityId,
  emptyMessage,
  onRetry,
}) {
  return (
    <section className="facility-list-panel" id="facility-list" tabIndex="-1" aria-labelledby="facility-list-title">
      <div className="result-summary">
        <div>
          <h2 id="facility-list-title">Danh sách cơ sở</h2>
          <span role="status" aria-live="polite">
            {loading ? "Đang tải dữ liệu" : `${facilities.length} kết quả phù hợp`}
          </span>
        </div>
      </div>
      {loading && [0, 1, 2].map((item) => (
        <article className="facility-result-card facility-result-skeleton" key={item} aria-hidden="true">
          <span className="skeleton-line" />
          <span className="skeleton-line short" />
          <span className="skeleton-line" />
        </article>
      ))}
      {!loading && facilities.length === 0 && (
        onRetry ? <ErrorState title="Chưa tải được danh sách cơ sở" description={emptyMessage} action={<button type="button" className="facility-select-button" onClick={onRetry}>Thử tải lại</button>} />
          : <EmptyState title="Chưa tìm thấy cơ sở phù hợp" description={emptyMessage || "Hãy thử đổi chuyên khoa, phạm vi hoặc từ khóa."} />
      )}
      {!loading && facilities.map((facility) => (
        <article
          ref={(node) => { cardRefs.current[facility.facilityId] = node; }}
          className={`facility-result-card ${selectedFacilityId === facility.facilityId ? "selected" : ""}`}
          key={facility.facilityId}
        >
          <div className="facility-top">
            <strong>{facility.facilityName}</strong>
            {facility.distanceLabel && <span className="explorer-distance">{facility.distanceLabel}</span>}
          </div>
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
    </section>
  );
}
