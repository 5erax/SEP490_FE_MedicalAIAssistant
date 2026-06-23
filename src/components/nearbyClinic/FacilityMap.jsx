import { Component, useEffect, useRef } from "react";
import Map, { Marker, NavigationControl, Popup } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

const FREE_MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

class MapErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function AccessibleFacilityMarker({ facility, selected, onSelect }) {
  const markerRef = useRef(null);

  useEffect(() => {
    markerRef.current?.getElement?.().setAttribute(
      "aria-label",
      `Chọn ${facility.facilityName} trên bản đồ`,
    );
  }, [facility.facilityName]);

  return (
    <Marker
      ref={markerRef}
      longitude={facility.longitude}
      latitude={facility.latitude}
      onClick={(event) => { event.originalEvent.stopPropagation(); onSelect(facility); }}
    >
      <span className={`clinic-marker ${selected ? "selected" : ""}`} aria-hidden="true">
        <span>+</span>
      </span>
    </Marker>
  );
}

export default function FacilityMap({
  chatContext,
  facilities,
  locationError,
  mapRef,
  mapRenderKey,
  mapStatus,
  selectedFacility,
  userLocation,
  viewState,
  onDirections,
  onError,
  onLocate,
  onMapLoad,
  onRetry,
  onSelect,
  onViewStateChange,
}) {
  return (
    <section className="map-panel" aria-labelledby="interactive-map-title">
      <h2 className="sr-only" id="interactive-map-title">Bản đồ tương tác các cơ sở y tế</h2>
      {chatContext && (
        <aside className="map-chat-context" aria-label="Khung chat gợi ý chuyên khoa">
          <strong>Gợi ý chuyên khoa qua triệu chứng</strong>
          <p>{chatContext.symptom}</p>
          <span>{chatContext.answer}</span>
        </aside>
      )}

      {mapStatus !== "error" && (
        <MapErrorBoundary key={mapRenderKey} onError={onError}>
          <Map
            ref={mapRef}
            mapStyle={FREE_MAP_STYLE}
            {...viewState}
            onLoad={onMapLoad}
            onError={onError}
            onMove={(event) => onViewStateChange(event.viewState)}
            style={{ width: "100%", height: "100%" }}
          >
            <NavigationControl position="top-right" />
            {userLocation && (
              <Marker longitude={userLocation.lng} latitude={userLocation.lat}>
                <div className="user-marker"><span /></div>
              </Marker>
            )}
            {facilities.map((facility) => (
              <AccessibleFacilityMarker
                key={facility.facilityId}
                facility={facility}
                selected={selectedFacility?.facilityId === facility.facilityId}
                onSelect={onSelect}
              />
            ))}
            {selectedFacility?.hasValidCoordinates && (
              <Popup
                longitude={selectedFacility.longitude}
                latitude={selectedFacility.latitude}
                onClose={() => onSelect(null)}
                closeOnClick={false}
                offset={28}
                className="clinic-popup"
              >
                <div className="popup-card">
                  <strong>{selectedFacility.facilityName}</strong>
                  <span>{selectedFacility.address}</span>
                  <span>{selectedFacility.phoneLabel}</span>
                  {selectedFacility.website && <a href={selectedFacility.website} target="_blank" rel="noreferrer">Website cơ sở</a>}
                  <button type="button" onClick={() => onDirections(selectedFacility)}>Xem chi tiết</button>
                </div>
              </Popup>
            )}
          </Map>
        </MapErrorBoundary>
      )}

      {mapStatus === "loading" && (
        <div className="map-status-overlay" role="status" aria-live="polite" aria-busy="true">
          <span className="map-loading-spinner" aria-hidden="true" />
          <strong>Đang tải bản đồ…</strong>
          <p>Danh sách cơ sở vẫn có thể sử dụng trong lúc chờ.</p>
        </div>
      )}
      {mapStatus === "error" && (
        <div className="map-fallback" role="status" aria-live="polite">
          <span aria-hidden="true">!</span>
          <strong>Không thể hiển thị bản đồ lúc này</strong>
          <p>Bạn vẫn có thể xem, tìm kiếm và chọn cơ sở trong danh sách.</p>
          <div className="map-fallback-actions">
            <button type="button" onClick={onRetry}>Thử tải lại bản đồ</button>
            <a href="#facility-list">Đến danh sách cơ sở</a>
          </div>
        </div>
      )}
      {mapStatus === "ready" && <button className="locate-button" type="button" onClick={onLocate} aria-label="Định vị tôi">⌖</button>}
      {locationError && <div className="location-error">{locationError}</div>}
    </section>
  );
}
