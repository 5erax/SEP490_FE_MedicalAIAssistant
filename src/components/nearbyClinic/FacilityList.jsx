export default function FacilityList({
  cardRefs,
  facilities,
  loading,
  onViewDetail,
  selectedFacilityId,
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
        <div className="sidebar-note">Chưa tìm thấy cơ sở y tế phù hợp với bộ lọc hoặc khu vực hiện tại. Vui lòng thử đổi bộ lọc hoặc từ khóa tìm kiếm.</div>
      )}
      {!loading && facilities.map((facility) => (
        <article
          ref={(node) => { cardRefs.current[facility.facilityId] = node; }}
          className={`facility-result-card ${selectedFacilityId === facility.facilityId ? "selected" : ""}`}
          key={facility.facilityId}
        >
          <div className="facility-top">
            <strong>{facility.facilityName}</strong>
            <span className={`type-badge ${facility.facilityTypeKey}`}>{facility.facilityTypeLabel}</span>
          </div>
          <p className="facility-card-address">{facility.address}</p>
          <div className="facility-card-meta">
            {facility.distanceLabel && <span>{facility.distanceLabel}</span>}
            <span>{facility.openingHours}</span>
            <span>{facility.hasValidCoordinates ? "Có vị trí bản đồ" : "Thiếu tọa độ"}</span>
          </div>
          <button
            className="facility-select-button"
            type="button"
            aria-pressed={selectedFacilityId === facility.facilityId}
            aria-label={`Xem chi tiết ${facility.facilityName}`}
            onClick={(event) => { event.stopPropagation(); onViewDetail(facility); }}
          >
            {selectedFacilityId === facility.facilityId ? "Đang xem chi tiết" : "Xem chi tiết"}
          </button>
          {selectedFacilityId === facility.facilityId && <div className="facility-details">
            <p>Địa chỉ: {facility.address}</p>
            <p>Giờ mở cửa: {facility.openingHours}</p>
            <p>Liên hệ: {facility.phoneLabel}</p>
            {!facility.hasValidCoordinates && <p className="coordinate-notice">Chưa có vị trí chính xác trên bản đồ.</p>}
            <div className="department-row">
              {facility.departments.map((department) => <span key={department}>{department}</span>)}
            </div>
          </div>}
        </article>
      ))}
    </section>
  );
}
