import { useEffect, useMemo, useRef, useState } from "react";
import Map, { Marker, NavigationControl, Popup } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { medicalFacilitiesApi } from "../services/api";

const FILTERS = [
  ["all", "Tất cả"],
  ["Hospital", "Bệnh viện"],
  ["Clinic", "Phòng khám"],
  ["Pharmacy", "Nhà thuốc"],
  ["Emergency", "Cấp cứu"],
];

const HCMC_FACILITIES = [
  {
    facilityId: "1",
    facilityName: "Bệnh viện Chợ Rẫy",
    address: "201B Nguyễn Chí Thanh, Q.5",
    latitude: 10.7553,
    longitude: 106.6602,
    phone: "028 3855 4137",
    facilityType: "Hospital",
    openingHours: "24/7",
    departments: ["Nội khoa", "Ngoại khoa", "Cấp cứu"],
  },
  {
    facilityId: "2",
    facilityName: "BV Đại học Y Dược",
    address: "215 Hồng Bàng, Q.5",
    latitude: 10.7539,
    longitude: 106.6636,
    phone: "028 3855 1668",
    facilityType: "Hospital",
    openingHours: "6:00-20:00",
    departments: ["Da liễu", "Mắt", "Tai mũi họng"],
  },
  {
    facilityId: "3",
    facilityName: "PK Đa khoa Medlatec",
    address: "42 Nguyễn Thị Minh Khai, Q.1",
    latitude: 10.7756,
    longitude: 106.6941,
    phone: "1900 56 56 56",
    facilityType: "Clinic",
    openingHours: "7:00-21:00",
    departments: ["Nội khoa", "Xét nghiệm"],
  },
  {
    facilityId: "4",
    facilityName: "Pharmacity Nguyễn Huệ",
    address: "98 Nguyễn Huệ, Q.1",
    latitude: 10.7729,
    longitude: 106.703,
    phone: "1800 599 932",
    facilityType: "Pharmacy",
    openingHours: "7:00-23:00",
    departments: ["Dược phẩm", "Tư vấn thuốc"],
  },
  {
    facilityId: "5",
    facilityName: "BV Cấp cứu Trưng Vương",
    address: "266 Lý Thường Kiệt, Q.10",
    latitude: 10.7725,
    longitude: 106.6631,
    phone: "028 3865 4388",
    facilityType: "Emergency",
    openingHours: "24/7",
    departments: ["Cấp cứu", "Hồi sức"],
  },
];

const TYPE_LABELS = {
  Hospital: "Bệnh viện",
  Clinic: "Phòng khám",
  Pharmacy: "Nhà thuốc",
  Emergency: "Cấp cứu",
};

const FREE_MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

function normalizeFacility(facility) {
  const id = facility.facilityId ?? facility.id;
  const departments = Array.isArray(facility.departments)
    ? facility.departments.map((item) => item.departmentName ?? item.name ?? item).filter(Boolean)
    : [];
  const directDepartment = facility.departmentName ? [facility.departmentName] : [];

  return {
    ...facility,
    facilityId: id,
    facilityName: facility.facilityName || facility.name || "Cơ sở y tế",
    address: facility.address || "TP.HCM",
    latitude: Number(facility.latitude) || 10.7756,
    longitude: Number(facility.longitude) || 106.6941,
    phone: facility.phone || "Đang cập nhật",
    facilityType: facility.facilityType || "Hospital",
    openingHours: facility.openingHours || "Đang cập nhật",
    departments: departments.length ? departments : directDepartment.length ? directDepartment : ["Đa khoa"],
    confidenceScore: facility.confidenceScore,
    priorityRank: facility.priorityRank ?? 999,
  };
}

function NearbyClinicPage() {
  const [chatContext] = useState(() => {
    try {
      const raw = sessionStorage.getItem("medimate.map.chat");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const analysisFacilities = useMemo(
    () => (chatContext?.recommendedFacilities ?? []).map(normalizeFacility).sort((first, second) => first.priorityRank - second.priorityRank),
    [chatContext],
  );
  const hasAnalysisFacilities = analysisFacilities.length > 0;
  const initialFacilities = hasAnalysisFacilities ? analysisFacilities : HCMC_FACILITIES;
  const [facilities, setFacilities] = useState(initialFacilities);
  const [loadingFacilities, setLoadingFacilities] = useState(!hasAnalysisFacilities);
  const [apiNotice, setApiNotice] = useState("");
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedFacility, setSelectedFacility] = useState(initialFacilities[0] ?? null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [viewState, setViewState] = useState({
    longitude: initialFacilities[0]?.longitude ?? 106.6297,
    latitude: initialFacilities[0]?.latitude ?? 10.8231,
    zoom: hasAnalysisFacilities ? 13 : 12,
  });
  const mapRef = useRef(null);
  const cardRefs = useRef({});

  useEffect(() => {
    const timerId = window.setTimeout(() => setDebouncedSearch(searchText), 400);
    return () => window.clearTimeout(timerId);
  }, [searchText]);

  useEffect(() => {
    let active = true;

    if (hasAnalysisFacilities) {
      return () => {
        active = false;
      };
    }

    const topDepartmentId = chatContext?.recommendedDepartments?.[0]?.departmentId;
    medicalFacilitiesApi.active(topDepartmentId ? { departmentId: topDepartmentId } : {})
      .then((response) => {
        if (!active) return;
        const rawFacilities = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.items)
            ? response.data.items
            : [];
        const data = rawFacilities.map(normalizeFacility);
        if (data.length) {
          setFacilities(data);
          setSelectedFacility(data[0]);
        }
        setApiNotice("");
      })
      .catch((error) => {
        if (active) setApiNotice(error.message || "Đang dùng dữ liệu bệnh viện TP.HCM dự phòng.");
      })
      .finally(() => {
        if (active) setLoadingFacilities(false);
      });

    return () => {
      active = false;
    };
  }, [chatContext, hasAnalysisFacilities]);

  const filteredFacilities = useMemo(() => {
    const normalized = debouncedSearch.trim().toLowerCase();
    return facilities.filter((facility) => {
      const matchSearch = !normalized || facility.facilityName.toLowerCase().includes(normalized) || facility.address.toLowerCase().includes(normalized);
      const matchFilter = activeFilter === "all" || facility.facilityType.toLowerCase() === activeFilter.toLowerCase();
      return matchSearch && matchFilter;
    });
  }, [activeFilter, debouncedSearch, facilities]);

  const handleCardClick = (facility) => {
    setSelectedFacility(facility);
    mapRef.current?.flyTo?.({ center: [facility.longitude, facility.latitude], zoom: 16, duration: 1200 });
    cardRefs.current[facility.facilityId]?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  };

  const handleLocateMe = () => {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Trình duyệt không hỗ trợ định vị.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        mapRef.current?.flyTo?.({ center: [longitude, latitude], zoom: 15, duration: 1500 });
      },
      () => setLocationError("Không thể lấy vị trí của bạn.")
    );
  };

  const openDirections = (facility) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}`, "_blank", "noopener,noreferrer");
  };

  return (
    <main className="clinic-page">
      <style>{styles}</style>
      <h1 className="sr-only">Bản đồ cơ sở y tế</h1>
      <aside className="clinic-sidebar">
        <div className="map-page-actions">
          <button type="button" onClick={() => { window.location.href = "/dashboard"; }}>← Trang chủ</button>
          <button type="button" onClick={handleLocateMe}>Định vị tôi</button>
        </div>
        <div className="clinic-search">
          <span>⌕</span>
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Tìm tên bệnh viện, phòng khám..."
          />
          {searchText && <button type="button" onClick={() => setSearchText("")}>×</button>}
        </div>

        <div className="filter-row">
          {FILTERS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={activeFilter === value ? "active" : ""}
              onClick={() => setActiveFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="result-count">{loadingFacilities ? "Đang đồng bộ cơ sở y tế..." : `Tìm thấy ${filteredFacilities.length} cơ sở`}</p>
        {apiNotice && <div className="sidebar-note">{apiNotice}</div>}

        <div className="facility-list-panel">
          {filteredFacilities.map((facility) => (
            <article
              ref={(node) => { cardRefs.current[facility.facilityId] = node; }}
              className={`facility-result-card ${selectedFacility?.facilityId === facility.facilityId ? "selected" : ""}`}
              key={facility.facilityId}
              onClick={() => handleCardClick(facility)}
            >
              <div className="facility-top">
                <strong>{facility.facilityName}</strong>
                <span className={`type-badge ${facility.facilityType.toLowerCase()}`}>{TYPE_LABELS[facility.facilityType] || facility.facilityType}</span>
              </div>
              <p>⌖ {facility.address}</p>
              <p>◷ {facility.openingHours}</p>
              <div className="department-row">
                {facility.departments.map((department) => <span key={department}>{department}</span>)}
              </div>
              {facility.confidenceScore !== undefined && facility.confidenceScore !== null && (
                <p className="facility-confidence">Độ phù hợp {Math.round((Number(facility.confidenceScore) > 1 ? Number(facility.confidenceScore) : Number(facility.confidenceScore) * 100))}%</p>
              )}
              <div className="facility-actions">
                <button type="button" onClick={(event) => { event.stopPropagation(); window.location.href = `tel:${facility.phone.replaceAll(" ", "")}`; }}>Gọi ngay</button>
                <button type="button" onClick={(event) => { event.stopPropagation(); openDirections(facility); }}>Chỉ đường</button>
              </div>
            </article>
          ))}
        </div>

        <div className="sidebar-note">ℹ Thông tin chỉ mang tính tham khảo. Vui lòng gọi trước khi đến.</div>
      </aside>

      <section className="map-panel">
        {chatContext && (
          <aside className="map-chat-context" aria-label="Khung chat gợi ý chuyên khoa">
            <strong>Gợi ý chuyên khoa qua triệu chứng</strong>
            <p>{chatContext.symptom}</p>
            <span>{chatContext.answer}</span>
            {chatContext.recommendedDepartments?.length > 0 && (
              <div className="map-context-tags">
                {chatContext.recommendedDepartments.slice(0, 3).map((department) => (
                  <b key={department.departmentId || department.departmentName}>{department.departmentName}</b>
                ))}
              </div>
            )}
          </aside>
        )}

        <Map
          ref={mapRef}
          mapStyle={FREE_MAP_STYLE}
          {...viewState}
          onMove={(event) => setViewState(event.viewState)}
          style={{ width: "100%", height: "100%" }}
        >
          <NavigationControl position="top-right" />

          {userLocation && (
            <Marker longitude={userLocation.lng} latitude={userLocation.lat}>
              <div className="user-marker"><span /></div>
            </Marker>
          )}

          {filteredFacilities.map((facility) => (
            <Marker
              key={facility.facilityId}
              longitude={facility.longitude}
              latitude={facility.latitude}
              onClick={(event) => {
                event.originalEvent?.stopPropagation?.();
                handleCardClick(facility);
              }}
            >
              <div className={`clinic-marker ${selectedFacility?.facilityId === facility.facilityId ? "selected" : ""}`}>+</div>
            </Marker>
          ))}

          {selectedFacility && (
            <Popup
              longitude={selectedFacility.longitude}
              latitude={selectedFacility.latitude}
              onClose={() => setSelectedFacility(null)}
              closeOnClick={false}
              offset={28}
              className="clinic-popup"
            >
              <div className="popup-card">
                <strong>{selectedFacility.facilityName}</strong>
                <span>{selectedFacility.address}</span>
                <span>{selectedFacility.phone}</span>
                <button type="button" onClick={() => openDirections(selectedFacility)}>Xem chi tiết</button>
              </div>
            </Popup>
          )}
        </Map>

        <button className="locate-button" type="button" onClick={handleLocateMe} aria-label="Định vị tôi">⌖</button>
        {locationError && <div className="location-error">{locationError}</div>}
      </section>
    </main>
  );
}

const styles = `
.clinic-page { height: 100svh; display: flex; background: var(--bg); color: var(--ink); overflow: hidden; }
.clinic-sidebar { width: 320px; flex: 0 0 320px; overflow-y: auto; border-right: 1.5px solid var(--ink); background: var(--paper); padding: 16px; }
.map-page-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
.map-page-actions button { min-height: 38px; border: 1.5px solid var(--ink); border-radius: 999px; background: #fff; color: var(--ink); font-weight: 900; }
.map-page-actions button:last-child { background: var(--lime); }
.clinic-search { display: grid; grid-template-columns: auto minmax(0,1fr) auto; align-items: center; gap: 8px; border: 1.5px solid var(--ink); border-radius: 10px; background: #fff; padding: 0 10px; }
.clinic-search input { min-width: 0; height: 42px; border: 0; outline: none; }
.clinic-search button { width: 28px; height: 28px; border: 0; border-radius: 50%; background: var(--mint); font-size: 18px; font-weight: 900; }
.filter-row { display: flex; gap: 8px; overflow-x: auto; padding: 14px 0 8px; scrollbar-width: none; }
.filter-row::-webkit-scrollbar, .department-row::-webkit-scrollbar { display: none; }
.filter-row button { flex: 0 0 auto; border: 1.5px solid var(--ink); border-radius: 999px; background: #fff; color: var(--ink); padding: 8px 11px; font-size: 12px; font-weight: 900; }
.filter-row button.active { background: var(--ink); color: #fff; }
.result-count { margin: 0 0 10px; color: var(--muted); font-size: 12px; font-weight: 800; }
.facility-list-panel { display: grid; gap: 9px; }
.facility-result-card { border: 1px solid var(--line); border-radius: 10px; background: var(--paper-soft); padding: 12px; cursor: pointer; transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease; }
.facility-result-card:hover, .facility-result-card.selected { border: 1.5px solid var(--ink); box-shadow: 3px 3px 0 var(--ink); transform: translateY(-1px); }
.facility-top { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
.facility-top strong { font-size: 14px; line-height: 1.35; }
.type-badge { flex: 0 0 auto; border-radius: 999px; padding: 5px 8px; font-size: 10px; font-weight: 900; background: var(--lime); }
.type-badge.clinic { background: var(--mint); color: var(--teal); }
.type-badge.pharmacy { background: #e5f8d1; color: #4d7c0f; }
.type-badge.emergency { background: rgba(239,111,97,.16); color: #b42318; }
.facility-result-card p { margin: 8px 0 0; color: var(--muted); font-size: 11px; line-height: 1.45; }
.department-row { display: flex; gap: 6px; overflow-x: auto; margin-top: 10px; padding-bottom: 2px; }
.department-row span { flex: 0 0 auto; border-radius: 999px; background: #fff; border: 1px solid var(--line); padding: 5px 8px; color: var(--muted); font-size: 11px; font-weight: 800; }
.facility-confidence { color: var(--teal) !important; font-weight: 900; }
.facility-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; border-top: 1px solid var(--line); margin-top: 10px; padding-top: 10px; }
.facility-actions button, .popup-card button { border: 1.5px solid var(--ink); border-radius: 8px; background: #fff; padding: 8px; font-size: 12px; font-weight: 900; }
.facility-actions button:last-child, .popup-card button { background: var(--lime); }
.sidebar-note { margin-top: 14px; border: 1px solid rgba(8,127,140,.22); border-radius: 10px; background: var(--mint); padding: 12px; color: var(--muted); font-size: 12px; line-height: 1.55; font-weight: 800; }
.map-panel { position: relative; flex: 1; min-width: 0; background: #e9eee1; }
.map-chat-context { position: absolute; left: 18px; top: 18px; z-index: 3; width: min(420px, calc(100% - 36px)); display: grid; gap: 8px; border: 1.5px solid var(--ink); border-radius: 14px; background: rgba(255,255,255,.94); box-shadow: 4px 4px 0 var(--ink); padding: 14px; backdrop-filter: blur(14px); }
.map-chat-context strong { font-size: 14px; }
.map-chat-context p { margin: 0; color: var(--ink); font-size: 13px; line-height: 1.45; font-weight: 850; }
.map-chat-context span { color: var(--muted); font-size: 12px; line-height: 1.5; }
.map-context-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.map-context-tags b { border-radius: 999px; background: var(--mint); color: var(--teal); padding: 5px 8px; font-size: 11px; }
.map-token-empty { height: 100%; display: grid; place-items: center; align-content: center; gap: 8px; text-align: center; background: linear-gradient(90deg, rgba(17,20,18,.06) 1px, transparent 1px), linear-gradient(rgba(17,20,18,.06) 1px, transparent 1px), #f5f7ef; background-size: 36px 36px; padding: 24px; }
.map-token-empty strong { font-size: 24px; }
.map-token-empty span { max-width: 420px; color: var(--muted); line-height: 1.5; }
.clinic-marker { width: 24px; height: 30px; display: grid; place-items: center; border: 2px solid var(--ink); border-radius: 999px 999px 999px 4px; background: var(--ink); color: var(--lime); font-weight: 900; transform: rotate(-45deg); box-shadow: 2px 2px 0 rgba(17,20,18,.28); transition: transform 180ms ease; }
.clinic-marker::first-letter { transform: rotate(45deg); }
.clinic-marker.selected { transform: rotate(-45deg) scale(1.25); background: var(--lime); color: var(--ink); }
.user-marker { width: 26px; height: 26px; display: grid; place-items: center; border: 2px solid var(--ink); border-radius: 50%; background: rgba(170,237,99,.35); animation: pulse 1.4s infinite; }
.user-marker span { width: 12px; height: 12px; border-radius: 50%; background: var(--lime); }
.popup-card { min-width: 190px; display: grid; gap: 6px; color: var(--ink); }
.popup-card strong { font-size: 14px; }
.popup-card span { color: var(--muted); font-size: 12px; line-height: 1.4; }
.clinic-popup .maplibregl-popup-content { border: 1.5px solid var(--ink); border-radius: 10px; box-shadow: 3px 3px 0 var(--ink); padding: 12px; }
.clinic-popup .maplibregl-popup-tip { display: none; }
.locate-button { position: absolute; right: 18px; bottom: 18px; z-index: 2; width: 48px; height: 48px; display: grid; place-items: center; border: 1.5px solid var(--ink); border-radius: 12px; background: var(--lime); color: var(--ink); box-shadow: 4px 4px 0 var(--ink); font-size: 22px; font-weight: 900; }
.location-error { position: absolute; right: 18px; bottom: 78px; z-index: 2; border: 1px solid rgba(239,111,97,.35); border-radius: 9px; background: #fff4f2; color: #b42318; padding: 9px 11px; font-size: 12px; font-weight: 800; }
@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(170,237,99,.55); } 100% { box-shadow: 0 0 0 14px rgba(170,237,99,0); } }
@media (max-width: 760px) {
  .clinic-page { flex-direction: column-reverse; }
  .clinic-sidebar { width: 100%; flex: 0 0 45vh; border-right: 0; border-top: 1.5px solid var(--ink); }
  .map-panel { flex: 0 0 55vh; }
}
`;

export default NearbyClinicPage;
