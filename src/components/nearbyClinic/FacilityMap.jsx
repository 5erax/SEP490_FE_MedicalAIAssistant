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

function confidencePercent(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric <= 1 ? numeric * 100 : numeric)));
}

function getDiagnosisField(diagnosis, camelKey, pascalKey, fallback = "") {
  return diagnosis?.[camelKey] ?? diagnosis?.[pascalKey] ?? fallback;
}

function getDiagnosisName(diagnosis) {
  return getDiagnosisField(diagnosis, "diseaseName", "DiseaseName", "Chưa xác định");
}

function getDiagnosisRank(diagnosis, index = 0) {
  return Number(getDiagnosisField(diagnosis, "rank", "Rank", index + 1)) || index + 1;
}

function getDiagnosisIcd(diagnosis) {
  return getDiagnosisField(diagnosis, "icd10Code", "Icd10Code", "");
}

function getDiagnosisReasoning(diagnosis) {
  return getDiagnosisField(diagnosis, "clinicalReasoning", "ClinicalReasoning", "");
}

function getDiagnosisPAGivenB(diagnosis) {
  return Number(getDiagnosisField(diagnosis, "paGivenB", "PAGivenB", 0)) || 0;
}

function AccessibleFacilityMarker({ facility, selected, onSelect }) {
  return (
    <Marker
      longitude={facility.longitude}
      latitude={facility.latitude}
    >
      <button
        className={`clinic-marker ${selected ? "selected" : ""}`}
        type="button"
        aria-label={`Chọn ${facility.facilityName} trên bản đồ`}
        aria-pressed={selected}
        onClick={(event) => { event.stopPropagation(); onSelect(facility); }}
      >
        <span aria-hidden="true">+</span>
      </button>
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
  recommendationContext,
  userLocation,
  viewState,
  onError,
  onLocate,
  onMapLoad,
  onRetry,
  onSelect,
  onViewStateChange,
  onViewDetail,
}) {
  const popupActionRef = useRef(null);
  const primaryDiagnosis = recommendationContext?.primaryDiagnosis;
  const recommendedDepartment = recommendationContext?.recommendedDepartment;
  const diagnoses = Array.isArray(recommendationContext?.diagnoses)
    ? recommendationContext.diagnoses
    : [];
  const diagnosisRows = diagnoses
    .map((diagnosis, index) => ({
      rank: getDiagnosisRank(diagnosis, index),
      name: getDiagnosisName(diagnosis),
      icd10Code: getDiagnosisIcd(diagnosis),
      paGivenB: getDiagnosisPAGivenB(diagnosis),
      probability: confidencePercent(getDiagnosisPAGivenB(diagnosis)),
    }))
    .sort((left, right) => left.rank - right.rank);
  const recommendedFacility = Array.isArray(recommendationContext?.recommendedFacilities)
    ? recommendationContext.recommendedFacilities.find((facility) => (
      String(facility.facilityId ?? facility.id) === String(selectedFacility?.facilityId)
    ))
    : null;
  const confidence = confidencePercent(getDiagnosisPAGivenB(primaryDiagnosis) || recommendedDepartment?.confidenceScore);

  useEffect(() => {
    if (!selectedFacility?.hasValidCoordinates) return undefined;
    const focusId = window.setTimeout(() => popupActionRef.current?.focus(), 0);
    return () => window.clearTimeout(focusId);
  }, [selectedFacility?.facilityId, selectedFacility?.hasValidCoordinates]);

  return (
    <section className="map-panel" aria-labelledby="interactive-map-title" aria-describedby="interactive-map-description">
      <h2 className="sr-only" id="interactive-map-title">Bản đồ tương tác các cơ sở y tế</h2>
      <p className="sr-only" id="interactive-map-description">
        Bản đồ hiển thị các cơ sở có tọa độ hợp lệ. Danh sách cơ sở bên cạnh cung cấp cùng thông tin ở dạng văn bản.
      </p>
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
                <div className="user-marker" role="img" aria-label="Vị trí hiện tại của bạn"><span /></div>
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
                <div
                  className="popup-card"
                  role="dialog"
                  aria-label={`Thông tin ${selectedFacility.facilityName}`}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") onSelect(null);
                  }}
                >
                  <strong>{selectedFacility.facilityName}</strong>
                  <span>{selectedFacility.address}</span>
                  {recommendationContext && (
                    <div className="popup-ai-summary">
                      <small>Chẩn đoán lâm sàng</small>
                      {primaryDiagnosis && <b>{getDiagnosisName(primaryDiagnosis)}</b>}
                      {Number.isFinite(confidence) && confidence > 0 && <em>{confidence}% phù hợp</em>}
                      {getDiagnosisReasoning(primaryDiagnosis) && <p>{getDiagnosisReasoning(primaryDiagnosis)}</p>}
                      {diagnosisRows.length > 0 && (
                        <>
                          <div className="popup-diagnosis-chart">
                            {diagnosisRows.slice(0, 4).map((row) => (
                              <div key={`${row.rank}-${row.name}`}>
                                <span>#{row.rank}</span>
                                <strong>{row.name}</strong>
                                <i style={{ width: `${row.probability}%` }} />
                                <em>{row.probability}%</em>
                              </div>
                            ))}
                          </div>
                          <table className="popup-diagnosis-table">
                            <thead>
                              <tr>
                                <th>Bệnh</th>
                                <th>PAGivenB</th>
                              </tr>
                            </thead>
                            <tbody>
                              {diagnosisRows.slice(0, 4).map((row) => (
                                <tr key={`${row.rank}-${row.name}-popup-table`}>
                                  <td>{row.name}</td>
                                  <td>{row.paGivenB.toFixed(4)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </>
                      )}
                      {recommendedFacility?.reason && <p>{recommendedFacility.reason}</p>}
                    </div>
                  )}
                  <span>{selectedFacility.phoneLabel}</span>
                  {selectedFacility.website && <a href={selectedFacility.website} target="_blank" rel="noreferrer">Website cơ sở</a>}
                  <button ref={popupActionRef} type="button" onClick={() => onViewDetail(selectedFacility)}>Xem chi tiết</button>
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
