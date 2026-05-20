import Map, { Marker, NavigationControl, Popup } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

export default function MedicalMap({
  hospitals,
  loading,
  selectedHospital,
  viewState,
  onMove,
  onSelectHospital,
  onMapLoad,
}) {
  return (
    <section className="assistant-map-panel">
      <div className="assistant-map-status">
        <span>{loading ? "Đang tải bản đồ" : "Bản đồ cơ sở y tế"}</span>
        <strong>{selectedHospital?.name || "Chọn một cơ sở để xem chi tiết"}</strong>
        {selectedHospital && <small>{selectedHospital.address}</small>}
      </div>

      <Map
        {...viewState}
        onLoad={onMapLoad}
        onMove={(event) => onMove(event.viewState)}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        attributionControl={false}
      >
        <NavigationControl position="top-right" />
        {hospitals.map((hospital) => (
          <Marker
            key={hospital.id}
            longitude={hospital.longitude}
            latitude={hospital.latitude}
            anchor="bottom"
            onClick={(event) => {
              event.originalEvent.stopPropagation();
              onSelectHospital(hospital);
            }}
          >
            <button
              className={`map-marker assistant-map-marker ${selectedHospital?.id === hospital.id ? "active" : ""}`}
              type="button"
              aria-label={hospital.name}
            >
              <span>+</span>
            </button>
          </Marker>
        ))}

        {selectedHospital && (
          <Popup
            longitude={selectedHospital.longitude}
            latitude={selectedHospital.latitude}
            anchor="top"
            closeButton={false}
            offset={18}
          >
            <div className="map-popup">
              <strong>{selectedHospital.name}</strong>
              <span>{selectedHospital.department}</span>
              <p>{selectedHospital.address}</p>
              <small>{selectedHospital.phone}</small>
            </div>
          </Popup>
        )}
      </Map>

      {loading && <div className="assistant-map-loading">Đang chuẩn bị dữ liệu bản đồ...</div>}
    </section>
  );
}
