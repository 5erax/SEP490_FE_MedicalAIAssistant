import { useMemo, useState } from "react";
import Map, { Marker, NavigationControl, Popup } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

const MEDICAL_LOCATIONS = [
  {
    id: "cho-ray",
    name: "Bệnh viện Chợ Rẫy",
    type: "Bệnh viện đa khoa tuyến cuối",
    address: "201B Nguyễn Chí Thanh, Quận 5, TP.HCM",
    longitude: 106.6602,
    latitude: 10.7553,
    wait: "35 phút",
    distance: "2.4 km",
  },
  {
    id: "umc",
    name: "BV Đại học Y Dược TP.HCM",
    type: "Bệnh viện đa khoa",
    address: "215 Hồng Bàng, Quận 5, TP.HCM",
    longitude: 106.6636,
    latitude: 10.7539,
    wait: "25 phút",
    distance: "2.8 km",
  },
  {
    id: "tu-du",
    name: "Bệnh viện Từ Dũ",
    type: "Sản phụ khoa",
    address: "284 Cống Quỳnh, Quận 1, TP.HCM",
    longitude: 106.6867,
    latitude: 10.7685,
    wait: "20 phút",
    distance: "3.5 km",
  },
  {
    id: "children-1",
    name: "Bệnh viện Nhi Đồng 1",
    type: "Nhi khoa",
    address: "341 Sư Vạn Hạnh, Quận 10, TP.HCM",
    longitude: 106.6672,
    latitude: 10.7682,
    wait: "30 phút",
    distance: "4.1 km",
  },
];

const INITIAL_VIEW_STATE = {
  longitude: 106.676,
  latitude: 10.765,
  zoom: 12.2,
  pitch: 38,
  bearing: -12,
};

export function MapSection() {
  const [selectedId, setSelectedId] = useState(MEDICAL_LOCATIONS[0].id);

  const selectedLocation = useMemo(
    () => MEDICAL_LOCATIONS.find((location) => location.id === selectedId),
    [selectedId],
  );

  return (
    <section id="map" className="section section-alt map-section">
      <div className="container">
        <p className="eyebrow">Bản đồ cơ sở y tế</p>
        <h2 className="section-title">
          Tìm nơi chăm sóc phù hợp sau khi <em>AI gợi ý chuyên khoa</em>.
        </h2>
        <p className="section-copy">
          Sau phần phân tích triệu chứng, người dùng có thể xem các cơ sở y tế
          gần mình, chọn marker để xem thông tin nhanh và lưu địa điểm cho lần
          đặt lịch tiếp theo.
        </p>

        <div className="map-layout">
          <div className="map-shell">
            <Map
              initialViewState={INITIAL_VIEW_STATE}
              mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
              attributionControl={false}
            >
              <NavigationControl position="top-right" />

              {MEDICAL_LOCATIONS.map((location) => (
                <Marker
                  key={location.id}
                  longitude={location.longitude}
                  latitude={location.latitude}
                  anchor="bottom"
                  onClick={(event) => {
                    event.originalEvent.stopPropagation();
                    setSelectedId(location.id);
                  }}
                >
                  <button
                    className={`map-marker ${selectedId === location.id ? "active" : ""}`}
                    aria-label={location.name}
                  >
                    <span>+</span>
                  </button>
                </Marker>
              ))}

              {selectedLocation && (
                <Popup
                  longitude={selectedLocation.longitude}
                  latitude={selectedLocation.latitude}
                  anchor="top"
                  closeButton={false}
                  offset={18}
                >
                  <div className="map-popup">
                    <strong>{selectedLocation.name}</strong>
                    <span>{selectedLocation.type}</span>
                    <p>{selectedLocation.address}</p>
                    <small>Thời gian chờ dự kiến: {selectedLocation.wait}</small>
                  </div>
                </Popup>
              )}
            </Map>
          </div>

          <aside className="map-location-panel" aria-label="Cơ sở y tế gần bạn">
            <p className="map-panel-kicker">Gợi ý gần bạn</p>
            <h3>Cơ sở phù hợp để đặt lịch</h3>
            <p>
              Danh sách này minh họa bước tiếp theo sau khi người dùng nhận gợi ý
              chuyên khoa từ MediMate AI.
            </p>

            <div className="map-location-list">
              {MEDICAL_LOCATIONS.map((location) => (
                <button
                  className={`map-location-card ${selectedId === location.id ? "active" : ""}`}
                  key={location.id}
                  onClick={() => setSelectedId(location.id)}
                >
                  <span>
                    <strong>{location.name}</strong>
                    <small>{location.type}</small>
                  </span>
                  <span className="map-location-meta">
                    {location.distance} · {location.wait}
                  </span>
                </button>
              ))}
            </div>

          </aside>
        </div>
      </div>
    </section>
  );
}
