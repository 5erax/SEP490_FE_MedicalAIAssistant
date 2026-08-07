import {
  Component,
  useMemo,
  useState,
} from "react";
import Map, {
  Marker,
  NavigationControl,
  Popup,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

const MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

class LandingMapErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div
          className="care-map-library-state"
          role="status"
        >
          <strong>
            Trình duyệt chưa thể mở bản đồ trực tiếp.
          </strong>
          <span>
            Bạn vẫn có thể mở trang bản đồ đầy đủ
            để xem danh sách cơ sở.
          </span>
        </div>
      );
    }

    return this.props.children;
  }
}

function getInitialView(facilities) {
  const longitudes = facilities.map(
    (facility) => facility.longitude,
  );
  const latitudes = facilities.map(
    (facility) => facility.latitude,
  );

  const minLongitude = Math.min(
    ...longitudes,
  );
  const maxLongitude = Math.max(
    ...longitudes,
  );
  const minLatitude = Math.min(
    ...latitudes,
  );
  const maxLatitude = Math.max(
    ...latitudes,
  );

  const longitudeSpan =
    maxLongitude - minLongitude;
  const latitudeSpan =
    maxLatitude - minLatitude;
  const span = Math.max(
    longitudeSpan,
    latitudeSpan,
  );

  let zoom = 8;

  if (span < 0.015) zoom = 13;
  else if (span < 0.04) zoom = 12;
  else if (span < 0.08) zoom = 11;
  else if (span < 0.2) zoom = 10;
  else if (span < 0.5) zoom = 9;

  return {
    longitude:
      (minLongitude + maxLongitude) / 2,
    latitude:
      (minLatitude + maxLatitude) / 2,
    zoom,
  };
}

function getFacilityMapUrl(facility) {
  if (!facility?.id) {
    return "/map";
  }

  return `/map?facilityId=${encodeURIComponent(
    facility.id,
  )}`;
}

export default function LandingFacilityMap({
  facilities,
}) {
  const [selectedId, setSelectedId] =
    useState("");
  const [mapStatus, setMapStatus] =
    useState("loading");

  const initialViewState = useMemo(
    () => getInitialView(facilities),
    [facilities],
  );

  const selectedFacility =
    facilities.find(
      (facility) =>
        String(facility.id) === selectedId,
    ) ?? null;

  if (mapStatus === "error") {
    return (
      <div
        className="care-map-library-state"
        role="status"
      >
        <strong>
          Chưa thể hiển thị bản đồ trực tiếp.
        </strong>
        <span>
          Bạn vẫn có thể mở trang bản đồ đầy đủ
          để xem danh sách cơ sở.
        </span>
      </div>
    );
  }

  return (
    <div
      className="care-map-library"
      aria-label={`Bản đồ tương tác ${facilities.length} cơ sở y tế`}
    >
      <LandingMapErrorBoundary>
        <Map
          initialViewState={initialViewState}
          mapStyle={MAP_STYLE}
          keyboard
          scrollZoom={false}
          cooperativeGestures
          attributionControl
          reuseMaps
          onLoad={() =>
            setMapStatus("ready")
          }
          onError={() =>
            setMapStatus((current) =>
              current === "loading"
                ? "error"
                : current,
            )
          }
          style={{
            width: "100%",
            height: "100%",
          }}
        >
          <NavigationControl
            position="top-right"
            showCompass={false}
          />

          {facilities.map((facility) => (
            <Marker
              key={facility.id}
              longitude={facility.longitude}
              latitude={facility.latitude}
            >
              <button
                className={
                  `care-live-marker ${
                    String(facility.id) ===
                    selectedId
                      ? "selected"
                      : ""
                  }`
                }
                type="button"
                aria-label={
                  `Chọn ${facility.name} trên bản đồ`
                }
                aria-pressed={
                  String(facility.id) ===
                  selectedId
                }
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedId(
                    String(facility.id),
                  );
                }}
              >
                <span aria-hidden="true">
                  +
                </span>
              </button>
            </Marker>
          ))}

          {selectedFacility && (
            <Popup
              longitude={
                selectedFacility.longitude
              }
              latitude={
                selectedFacility.latitude
              }
              closeOnClick={false}
              onClose={() =>
                setSelectedId("")
              }
              offset={22}
              className="care-live-popup"
            >
              <strong>
                {selectedFacility.name}
              </strong>

              {selectedFacility.address && (
                <span>
                  {selectedFacility.address}
                </span>
              )}

              <a
                href={getFacilityMapUrl(
                  selectedFacility,
                )}
              >
                Xem chi tiết cơ sở
              </a>
            </Popup>
          )}
        </Map>
      </LandingMapErrorBoundary>

      {mapStatus === "loading" && (
        <div
          className="care-map-library-loading"
          role="status"
        >
          Đang tải bản đồ trực tiếp…
        </div>
      )}
    </div>
  );
}