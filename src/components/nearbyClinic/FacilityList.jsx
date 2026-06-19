export default function FacilityList({
  cardRefs,
  facilities,
  loading,
  onCall,
  onDirections,
  onSelect,
  selectedFacilityId,
}) {
  return (
    <section className="facility-list-panel" id="facility-list" tabIndex="-1" aria-label="Danh sách cơ sở y tế">
      {!loading && facilities.length === 0 && (
        <div className="sidebar-note">Không có cơ sở y tế phù hợp từ backend.</div>
      )}
      {facilities.map((facility) => (
        <article
          ref={(node) => { cardRefs.current[facility.facilityId] = node; }}
          className={`facility-result-card ${selectedFacilityId === facility.facilityId ? "selected" : ""}`}
          key={facility.facilityId}
          onClick={() => onSelect(facility)}
        >
          <div className="facility-top">
            <strong>{facility.facilityName}</strong>
            <span className={`type-badge ${facility.facilityTypeKey}`}>{facility.facilityTypeLabel}</span>
          </div>
          <p>⌖ {facility.address}</p>
          <p>◷ {facility.openingHours}</p>
          <p>Liên hệ: {facility.phoneLabel}</p>
          {!facility.hasValidCoordinates && <p className="coordinate-notice">Chưa có vị trí chính xác trên bản đồ.</p>}
          <div className="department-row">
            {facility.departments.map((department) => <span key={department}>{department}</span>)}
          </div>
          <button
            className="facility-select-button"
            type="button"
            aria-pressed={selectedFacilityId === facility.facilityId}
            onClick={(event) => { event.stopPropagation(); onSelect(facility); }}
          >
            {facility.hasValidCoordinates ? "Hiển thị trên bản đồ" : "Xem thông tin cơ sở"}
          </button>
          <div className="facility-actions">
            <button
              type="button"
              disabled={!facility.phone}
              title={facility.phone ? undefined : "Cơ sở chưa có số điện thoại"}
              onClick={(event) => { event.stopPropagation(); onCall(facility); }}
            >
              Gọi ngay
            </button>
            <button
              type="button"
              disabled={!facility.hasValidCoordinates}
              title={facility.hasValidCoordinates ? undefined : "Cơ sở chưa có tọa độ chính xác"}
              onClick={(event) => { event.stopPropagation(); onDirections(facility); }}
            >
              Chỉ đường
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
