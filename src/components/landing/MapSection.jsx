import { useMemo, useState } from "react";
import Map, { Marker, NavigationControl, Popup } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

const MEDICAL_LOCATIONS = [
  {
    id: "bach-mai",
    name: "Bệnh viện Bạch Mai",
    type: "Bệnh viện đa khoa",
    address: "78 Giải Phóng, Hà Nội",
    longitude: 105.8412,
    latitude: 21.0017,
    wait: "35 phút",
    distance: "2.4 km",
  },
  {
    id: "vinmec-times-city",
    name: "Vinmec Times City",
    type: "Bệnh viện quốc tế",
    address: "458 Minh Khai, Hà Nội",
    longitude: 105.8675,
    latitude: 20.9957,
    wait: "20 phút",
    distance: "4.1 km",
  },
  {
    id: "medlatec",
    name: "Medlatec Nghĩa Dũng",
    type: "Xét nghiệm & chẩn đoán",
    address: "42 Nghĩa Dũng, Hà Nội",
    longitude: 105.8419,
    latitude: 21.0451,
    wait: "15 phút",
    distance: "3.2 km",
  },
  {
    id: "viet-duc",
    name: "Bệnh viện Việt Đức",
    type: "Ngoại khoa & cấp cứu",
    address: "40 Tràng Thi, Hà Nội",
    longitude: 105.8463,
    latitude: 21.0286,
    wait: "30 phút",
    distance: "1.1 km",
  },
];

const INITIAL_VIEW_STATE = {
  longitude: 105.846,
  latitude: 21.026,
  zoom: 11.6,
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

            <a className="btn btn-primary" href="/contact">
              Liên hệ đặt lịch
            </a>
          </aside>
        </div>
      </div>
    </section>
  );
}
