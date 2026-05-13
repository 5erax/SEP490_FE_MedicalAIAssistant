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
  },
  {
    id: "vinmec-times-city",
    name: "Vinmec Times City",
    type: "Bệnh viện quốc tế",
    address: "458 Minh Khai, Hà Nội",
    longitude: 105.8675,
    latitude: 20.9957,
    wait: "20 phút",
  },
  {
    id: "medlatec",
    name: "Medlatec Nghĩa Dũng",
    type: "Xét nghiệm & chẩn đoán",
    address: "42 Nghĩa Dũng, Hà Nội",
    longitude: 105.8419,
    latitude: 21.0451,
    wait: "15 phút",
  },
  {
    id: "viet-duc",
    name: "Bệnh viện Việt Đức",
    type: "Ngoại khoa & cấp cứu",
    address: "40 Tràng Thi, Hà Nội",
    longitude: 105.8463,
    latitude: 21.0286,
    wait: "30 phút",
  },
];

const INITIAL_VIEW_STATE = {
  longitude: 105.846,
  latitude: 21.026,
  zoom: 11.6,
  pitch: 38,
  bearing: -12,
};

const DEFAULT_SETTINGS = {
  scrollZoom: true,
  boxZoom: true,
  dragRotate: true,
  dragPan: true,
  keyboard: true,
  doubleClickZoom: true,
  touchZoomRotate: true,
  touchPitch: true,
  minZoom: 10,
  maxZoom: 16,
  minPitch: 0,
  maxPitch: 70,
};

const SETTING_LABELS = {
  scrollZoom: "Cuộn để zoom",
  boxZoom: "Zoom theo vùng",
  dragRotate: "Kéo để xoay",
  dragPan: "Kéo để di chuyển",
  keyboard: "Điều khiển bàn phím",
  doubleClickZoom: "Double click zoom",
  touchZoomRotate: "Zoom/xoay cảm ứng",
  touchPitch: "Pitch bằng cảm ứng",
  minZoom: "Zoom tối thiểu",
  maxZoom: "Zoom tối đa",
  minPitch: "Pitch tối thiểu",
  maxPitch: "Pitch tối đa",
};

function MapControlPanel({ settings, onChange }) {
  const booleanSettings = Object.entries(settings).filter(([, value]) => typeof value === "boolean");
  const numericSettings = Object.entries(settings).filter(([, value]) => typeof value === "number");

  return (
    <aside className="map-control-panel" aria-label="Cài đặt tương tác bản đồ">
      <div>
        <p className="map-panel-kicker">Map interaction</p>
        <h3>Kiểm soát thao tác bản đồ</h3>
        <p>
          Bật hoặc tắt từng kiểu tương tác như ví dụ react-map-gl, phù hợp khi
          nhúng bản đồ vào landing page mà vẫn muốn kiểm soát trải nghiệm cuộn.
        </p>
      </div>

      <div className="map-toggle-grid">
        {booleanSettings.map(([name, value]) => (
          <label className="map-toggle" key={name}>
            <input
              type="checkbox"
              checked={value}
              onChange={(event) => onChange(name, event.target.checked)}
            />
            <span>{SETTING_LABELS[name]}</span>
          </label>
        ))}
      </div>

      <div className="map-range-grid">
        {numericSettings.map(([name, value]) => (
          <label className="map-number" key={name}>
            <span>{SETTING_LABELS[name]}</span>
            <input
              type="number"
              value={value}
              min={name.includes("Zoom") ? 0 : 0}
              max={name.includes("Zoom") ? 22 : 85}
              onChange={(event) => onChange(name, Number(event.target.value))}
            />
          </label>
        ))}
      </div>
    </aside>
  );
}

export function MapSection() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [selectedId, setSelectedId] = useState(MEDICAL_LOCATIONS[0].id);

  const selectedLocation = useMemo(
    () => MEDICAL_LOCATIONS.find((location) => location.id === selectedId),
    [selectedId],
  );

  const updateSettings = (name, value) => {
    setSettings((current) => ({ ...current, [name]: value }));
  };

  return (
    <section id="map" className="section section-alt map-section">
      <div className="container">
        <p className="eyebrow">Bản đồ cơ sở y tế</p>
        <h2 className="section-title">
          Tìm nơi chăm sóc phù hợp và <em>kiểm soát trải nghiệm bản đồ</em>.
        </h2>
        <p className="section-copy">
          Người dùng có thể xem các cơ sở y tế gần khu vực trung tâm, chọn marker
          để xem thông tin nhanh và thử các chế độ tương tác của bản đồ.
        </p>

        <div className="map-layout">
          <div className="map-shell">
            <Map
              initialViewState={INITIAL_VIEW_STATE}
              mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
              attributionControl={false}
              {...settings}
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

          <MapControlPanel settings={settings} onChange={updateSettings} />
        </div>
      </div>
    </section>
  );
}
