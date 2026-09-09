import { Component, useEffect, useMemo, useRef } from "react";
import { LocateFixed } from "lucide-react";
import Map, { Marker, NavigationControl, Popup } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { clusterFacilities } from "../../utils/facilityDiscovery";

class MapErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function FacilityMap({ facilities, hidePopup = false, mapRef, mapRenderKey, mapStatus,
  selectedFacility, userLocation, viewState, onError, onLocate, onMapLoad, onRetry, onSelect,
  onViewStateChange, onViewDetail, onUserMove, locating, locationError }) {
  const popupActionRef = useRef(null);
  const clusters = useMemo(() => clusterFacilities(facilities, viewState.zoom), [facilities, viewState.zoom]);
  useEffect(() => {
    if (!hidePopup && selectedFacility) popupActionRef.current?.focus({ preventScroll: true });
  }, [hidePopup, selectedFacility]);
  return <section className="map-panel" aria-label="Bản đồ các cơ sở đang hiển thị">
    {mapStatus !== "error" && <MapErrorBoundary key={mapRenderKey} onError={onError}>
      <Map ref={mapRef} mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        initialViewState={viewState} onLoad={onMapLoad} onError={onError}
        // MapLibre owns the live camera. React observes it for history/clusters;
        // list renders must not replay a slightly older camera frame.
        onMove={(event) => { if (event.originalEvent) onUserMove?.(); onViewStateChange(event.viewState); }}
        onMoveEnd={(event) => onViewStateChange(event.viewState)}
        onDragStart={onUserMove} onZoomStart={(event) => { if (event.originalEvent) onUserMove?.(); }}
        style={{ width:"100%", height:"100%" }}>
        <NavigationControl position="top-right" />
        {userLocation && <Marker longitude={userLocation.lng} latitude={userLocation.lat}>
          <div className="user-marker" role="img" aria-label="Vị trí của bạn"><span /></div>
        </Marker>}
        {clusters.map((cluster) => <Marker key={cluster.ids.join(",")} longitude={cluster.longitude} latitude={cluster.latitude}>
          <button type="button" className={`clinic-marker ${cluster.items.length > 1 ? "discovery-cluster" : ""} ${cluster.ids.includes(String(selectedFacility?.facilityId)) ? "selected" : ""}`}
            aria-label={cluster.items.length > 1 ? `Mở cụm ${cluster.items.length} cơ sở` : `Chọn ${cluster.items[0].facilityName} trên bản đồ`}
            aria-pressed={cluster.ids.includes(String(selectedFacility?.facilityId))}
            onClick={() => {
              if (cluster.items.length === 1) { onSelect(cluster.items[0]); return; }
              onUserMove?.();
              mapRef.current?.stop?.();
              mapRef.current?.fitBounds?.([
                [Math.min(...cluster.items.map((f) => f.longitude)), Math.min(...cluster.items.map((f) => f.latitude))],
                [Math.max(...cluster.items.map((f) => f.longitude)), Math.max(...cluster.items.map((f) => f.latitude))]
              ], { padding:60, maxZoom:18, duration:350 });
            }}><span aria-hidden="true">{cluster.items.length > 1 ? cluster.items.length : "+"}</span></button>
        </Marker>)}
        {!hidePopup && selectedFacility?.hasValidCoordinates && <Popup longitude={selectedFacility.longitude}
          latitude={selectedFacility.latitude} closeOnClick={false} onClose={() => onSelect(null)} maxWidth="280px">
          <div className="popup-card" role="dialog" aria-label={selectedFacility.facilityName}>
            <strong>{selectedFacility.facilityName}</strong>
            {selectedFacility.distanceLabel && <span>{selectedFacility.distanceLabel} · đường thẳng</span>}
            <button type="button" ref={popupActionRef} onClick={() => onViewDetail(selectedFacility)}>Xem thông tin</button>
          </div>
        </Popup>}
      </Map>
    </MapErrorBoundary>}
    {mapStatus === "loading" && <div className="map-status-overlay" role="status">
      <strong>Đang tải bản đồ…</strong><p>Bạn vẫn có thể chọn cơ sở trong danh sách.</p>
    </div>}
    {mapStatus === "error" && <div className="map-fallback" role="status">
      <strong>Chưa thể hiển thị bản đồ</strong><p>Danh sách cơ sở vẫn sử dụng được.</p>
      <button type="button" onClick={onRetry}>Thử tải lại bản đồ</button>
    </div>}
    {locationError && <div className="discovery-map-location" role="alert">{locationError}</div>}
    {mapStatus === "ready" && <button className="locate-button" type="button" disabled={locating} aria-busy={locating} onClick={onLocate} aria-label="Vị trí của tôi">
      <LocateFixed size={18} aria-hidden="true" /><span>Vị trí của tôi</span>
    </button>}
  </section>;
}
