import { Component, useEffect, useMemo, useRef, useState } from "react";
import Map, { Marker, NavigationControl, Popup } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { navigate } from "../router/navigation";
import {
  facilityDepartmentsApi,
  feedbackReviewsApi,
  getStoredAuth,
  medicalDepartmentsApi,
  medicalFacilitiesApi,
} from "../services/api";

const FILTERS = [
  ["all", "Tất cả"],
  ["hospital", "Bệnh viện"],
  ["clinic", "Phòng khám"],
  ["pharmacy", "Nhà thuốc"],
  ["emergency", "Cấp cứu"],
];

const TYPE_LABELS = {
  hospital: "Bệnh viện",
  clinic: "Phòng khám",
  pharmacy: "Nhà thuốc",
  emergency: "Cấp cứu",
  other: "Cơ sở y tế",
};

const FREE_MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const MAP_LOAD_TIMEOUT_MS = 12_000;

function coordinateOrNull(value, minimum, maximum) {
  if (value === null || value === undefined || value === "") return null;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) && coordinate >= minimum && coordinate <= maximum
    ? coordinate
    : null;
}

function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizeFacilityType(value) {
  const normalized = normalizeSearchText(value);
  if (normalized.includes("hospital") || normalized.includes("benh vien")) return "hospital";
  if (normalized.includes("clinic") || normalized.includes("phong kham")) return "clinic";
  if (normalized.includes("pharmacy") || normalized.includes("nha thuoc")) return "pharmacy";
  if (normalized.includes("emergency") || normalized.includes("cap cuu")) return "emergency";
  return "other";
}

function normalizePhone(value) {
  const phone = String(value ?? "").trim();
  return phone || null;
}

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

function getArrayData(response) {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  return [];
}

function normalizeFacility(facility, relationDepartments = []) {
  const id = facility.facilityId ?? facility.id;
  const latitude = coordinateOrNull(facility.latitude, -90, 90);
  const longitude = coordinateOrNull(facility.longitude, -180, 180);
  const embeddedDepartments = Array.isArray(facility.departments)
    ? facility.departments.map((item) => item.departmentName ?? item.name ?? item).filter(Boolean)
    : [];
  const departments = Array.from(new Set([...embeddedDepartments, ...relationDepartments].filter(Boolean)));
  const typeKey = normalizeFacilityType(facility.facilityType);
  const phone = normalizePhone(facility.phone);

  return {
    ...facility,
    facilityId: id,
    facilityName: facility.facilityName || facility.name || "Cơ sở y tế",
    address: facility.address || "TP.HCM",
    latitude,
    longitude,
    hasValidCoordinates: latitude !== null && longitude !== null,
    phone,
    phoneLabel: phone || "Chưa có số điện thoại",
    website: String(facility.website ?? "").trim(),
    facilityType: facility.facilityType || TYPE_LABELS[typeKey],
    facilityTypeKey: typeKey,
    facilityTypeLabel: TYPE_LABELS[typeKey],
    openingHours: facility.openingHours || "Đang cập nhật",
    departments: departments.length ? departments : ["Đa khoa"],
  };
}

function NearbyClinicPage() {
  const auth = getStoredAuth();
  const [chatContext] = useState(() => {
    try {
      const raw = sessionStorage.getItem("medimate.map.chat");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [facilities, setFacilities] = useState([]);
  const [loadingFacilities, setLoadingFacilities] = useState(true);
  const [apiNotice, setApiNotice] = useState("");
  const [searchText, setSearchText] = useState(
    () => new URLSearchParams(window.location.search).get("search") || "",
  );
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: "5", comment: "" });
  const [reviewMessage, setReviewMessage] = useState("");
  const [savingReview, setSavingReview] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [mapStatus, setMapStatus] = useState("loading");
  const [mapRenderKey, setMapRenderKey] = useState(0);
  const [viewState, setViewState] = useState({ longitude: 106.6297, latitude: 10.8231, zoom: 12 });
  const mapRef = useRef(null);
  const cardRefs = useRef({});
  const hasInitialSearchRef = useRef(Boolean(searchText.trim()));

  useEffect(() => {
    const timerId = window.setTimeout(() => setDebouncedSearch(searchText), 400);
    return () => window.clearTimeout(timerId);
  }, [searchText]);

  useEffect(() => {
    if (mapStatus !== "loading") return undefined;
    const timeoutId = window.setTimeout(() => {
      setMapStatus((current) => current === "loading" ? "error" : current);
    }, MAP_LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timeoutId);
  }, [mapRenderKey, mapStatus]);

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      medicalFacilitiesApi.active(),
      medicalDepartmentsApi.list(1, 100),
      facilityDepartmentsApi.active(),
    ])
      .then(([facilityResult, departmentResult, relationResult]) => {
        if (!active) return;
        if (facilityResult.status !== "fulfilled") {
          throw facilityResult.reason;
        }

        const rawFacilities = getArrayData(facilityResult.value);
        const departments = departmentResult.status === "fulfilled" ? getArrayData(departmentResult.value) : [];
        const departmentNamesById = new globalThis.Map(
          departments
            .map((department) => [department.id, department.departmentName || department.name])
            .filter(([id, name]) => id && name),
        );
        const relations = relationResult.status === "fulfilled" ? getArrayData(relationResult.value) : [];
        const relationDepartmentsByFacility = relations.reduce((map, relation) => {
          const facilityId = relation.facilityId;
          const departmentName = relation.departmentName || departmentNamesById.get(relation.departmentId);
          if (!facilityId || !departmentName) return map;
          const names = map.get(facilityId) ?? [];
          names.push(departmentName);
          map.set(facilityId, names);
          return map;
        }, new globalThis.Map());
        const data = rawFacilities.map((facility) => {
          const facilityId = facility.facilityId ?? facility.id;
          return normalizeFacility(facility, relationDepartmentsByFacility.get(facilityId) ?? []);
        });
        setFacilities(data);
        setReviewsLoading(Boolean(data[0]));
        setSelectedFacility(hasInitialSearchRef.current ? null : (data[0] ?? null));
        setApiNotice(data.length ? "" : "Backend chưa có cơ sở y tế đang hoạt động.");
      })
      .catch((error) => {
        if (active) {
          setFacilities([]);
          setSelectedFacility(null);
          setApiNotice(error.message || "Không tải được dữ liệu cơ sở y tế từ backend.");
        }
      })
      .finally(() => {
        if (active) setLoadingFacilities(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedFacility?.facilityId) return;

    let active = true;
    feedbackReviewsApi.byFacility(selectedFacility.facilityId)
      .then((response) => {
        if (active) setReviews(response.data?.items ?? []);
      })
      .catch((error) => {
        if (active) setReviewMessage(error.message);
      })
      .finally(() => {
        if (active) setReviewsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedFacility?.facilityId]);

  const filteredFacilities = useMemo(() => {
    const normalized = normalizeSearchText(debouncedSearch);
    return facilities.filter((facility) => {
      const searchable = [
        facility.facilityName,
        facility.address,
        facility.facilityType,
        facility.facilityTypeLabel,
        facility.openingHours,
        ...facility.departments,
      ].map(normalizeSearchText);
      const matchSearch = !normalized || searchable.some((value) => value.includes(normalized));
      const matchFilter = activeFilter === "all" || facility.facilityTypeKey === activeFilter;
      return matchSearch && matchFilter;
    });
  }, [activeFilter, debouncedSearch, facilities]);

  const mappableFacilities = useMemo(
    () => filteredFacilities.filter((facility) => facility.hasValidCoordinates),
    [filteredFacilities],
  );
  const hasActiveFacilitiesWithoutMapData = facilities.length > 0 && !facilities.some((facility) => facility.hasValidCoordinates);

  const prefersReducedMotion = () => (
    document.documentElement.dataset.motion === "reduce"
    || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
  );

  const handleSearchChange = (event) => {
    setSearchText(event.target.value);
    setSelectedFacility(null);
    setReviews([]);
    setReviewsLoading(false);
  };

  const handleFilterChange = (value) => {
    setActiveFilter(value);
    setSelectedFacility(null);
    setReviews([]);
    setReviewsLoading(false);
  };

  const handleCardClick = (facility) => {
    setReviewsLoading(true);
    setReviewMessage("");
    setSelectedFacility(facility);
    if (facility.hasValidCoordinates && mapStatus === "ready") {
      mapRef.current?.flyTo?.({
        center: [facility.longitude, facility.latitude],
        zoom: 16,
        duration: prefersReducedMotion() ? 0 : 1200,
      });
    }
    cardRefs.current[facility.facilityId]?.scrollIntoView?.({
      block: "nearest",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
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
        mapRef.current?.flyTo?.({
          center: [longitude, latitude],
          zoom: 15,
          duration: prefersReducedMotion() ? 0 : 1500,
        });
      },
      () => setLocationError("Không thể lấy vị trí của bạn.")
    );
  };

  const openDirections = (facility) => {
    if (!facility.hasValidCoordinates) return;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}`, "_blank", "noopener,noreferrer");
  };

  const callFacility = (facility) => {
    if (!facility.phone) return;
    window.location.href = `tel:${facility.phone.replaceAll(" ", "")}`;
  };

  const handleMapError = () => {
    setMapStatus((current) => current === "ready" ? current : "error");
  };

  const retryMap = () => {
    setMapStatus("loading");
    setMapRenderKey((current) => current + 1);
  };

  const submitReview = async (event) => {
    event.preventDefault();
    if (!selectedFacility?.facilityId) return;
    if (!auth) {
      navigate(`/login?redirect=${encodeURIComponent("/map")}`);
      return;
    }

    setSavingReview(true);
    setReviewMessage("");
    try {
      const response = await feedbackReviewsApi.create({
        facilityId: selectedFacility.facilityId,
        rating: Number(reviewForm.rating),
        comment: reviewForm.comment.trim() || null,
      });
      setReviewForm({ rating: "5", comment: "" });
      setReviewMessage(response.message || "Đã gửi đánh giá.");
      const refreshed = await feedbackReviewsApi.byFacility(selectedFacility.facilityId);
      setReviews(refreshed.data?.items ?? []);
    } catch (error) {
      setReviewMessage(error.message);
    } finally {
      setSavingReview(false);
    }
  };

  return (
    <main className="clinic-page">
      <style>{styles}</style>
      <h1 className="sr-only">Bản đồ cơ sở y tế</h1>
      <a className="map-skip-link" href="#facility-list">Bỏ qua bản đồ, đến danh sách cơ sở</a>
      <aside className="clinic-sidebar">
        <div className="map-page-actions">
          <button type="button" onClick={() => navigate("/dashboard")}>← Trang chủ</button>
          <button type="button" onClick={handleLocateMe}>Định vị tôi</button>
        </div>
        <div className="clinic-search">
          <span aria-hidden="true">⌕</span>
          <label className="sr-only" htmlFor="facility-search">Tìm cơ sở y tế</label>
          <input
            id="facility-search"
            name="search"
            type="search"
            value={searchText}
            onChange={handleSearchChange}
            placeholder="Tìm tên bệnh viện, phòng khám…"
            autoComplete="off"
          />
          {searchText && (
            <button type="button" aria-label="Xóa tìm kiếm" onClick={() => { setSearchText(""); setSelectedFacility(null); }}>×</button>
          )}
        </div>

        <div className="filter-row">
          {FILTERS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={activeFilter === value ? "active" : ""}
              onClick={() => handleFilterChange(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="result-count">{loadingFacilities ? "Đang đồng bộ cơ sở y tế..." : `Tìm thấy ${filteredFacilities.length} cơ sở`}</p>
        {apiNotice && <div className="sidebar-note">{apiNotice}</div>}
        {hasActiveFacilitiesWithoutMapData && (
          <div className="sidebar-note">
            Backend đã có cơ sở active nhưng chưa có tọa độ hợp lệ. Admin cần cập nhật vĩ độ và kinh độ để bản đồ hiển thị marker.
          </div>
        )}

        <section
          className="facility-list-panel"
          id="facility-list"
          tabIndex="-1"
          aria-label="Danh sách cơ sở y tế"
        >
          {!loadingFacilities && filteredFacilities.length === 0 && (
            <div className="sidebar-note">Không có cơ sở y tế phù hợp từ backend.</div>
          )}
          {filteredFacilities.map((facility) => (
            <article
              ref={(node) => { cardRefs.current[facility.facilityId] = node; }}
              className={`facility-result-card ${selectedFacility?.facilityId === facility.facilityId ? "selected" : ""}`}
              key={facility.facilityId}
              onClick={() => handleCardClick(facility)}
            >
              <div className="facility-top">
                <strong>{facility.facilityName}</strong>
                <span className={`type-badge ${facility.facilityTypeKey}`}>{facility.facilityTypeLabel}</span>
              </div>
              <p>⌖ {facility.address}</p>
              <p>◷ {facility.openingHours}</p>
              <p>Liên hệ: {facility.phoneLabel}</p>
              {!facility.hasValidCoordinates && (
                <p className="coordinate-notice">Chưa có vị trí chính xác trên bản đồ.</p>
              )}
              <div className="department-row">
                {facility.departments.map((department) => <span key={department}>{department}</span>)}
              </div>
              <button
                className="facility-select-button"
                type="button"
                aria-pressed={selectedFacility?.facilityId === facility.facilityId}
                onClick={(event) => {
                  event.stopPropagation();
                  handleCardClick(facility);
                }}
              >
                {facility.hasValidCoordinates ? "Hiển thị trên bản đồ" : "Xem thông tin cơ sở"}
              </button>
              <div className="facility-actions">
                <button
                  type="button"
                  disabled={!facility.phone}
                  title={facility.phone ? undefined : "Cơ sở chưa có số điện thoại"}
                  onClick={(event) => {
                    event.stopPropagation();
                    callFacility(facility);
                  }}
                >
                  Gọi ngay
                </button>
                <button
                  type="button"
                  disabled={!facility.hasValidCoordinates}
                  title={facility.hasValidCoordinates ? undefined : "Cơ sở chưa có tọa độ chính xác"}
                  onClick={(event) => {
                    event.stopPropagation();
                    openDirections(facility);
                  }}
                >
                  Chỉ đường
                </button>
              </div>
            </article>
          ))}
        </section>

        {selectedFacility && (
          <section className="facility-reviews" aria-labelledby="facility-review-title">
            <h2 id="facility-review-title">Đánh giá {selectedFacility.facilityName}</h2>
            <form onSubmit={submitReview}>
              <label>
                <span>Số sao</span>
                <select
                  value={reviewForm.rating}
                  onChange={(event) => setReviewForm({ ...reviewForm, rating: event.target.value })}
                >
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <option key={rating} value={rating}>{rating} sao</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Nhận xét</span>
                <textarea
                  rows={3}
                  value={reviewForm.comment}
                  onChange={(event) => setReviewForm({ ...reviewForm, comment: event.target.value })}
                  placeholder="Chia sẻ trải nghiệm của bạn"
                />
              </label>
              <button type="submit" disabled={savingReview}>
                {auth ? (savingReview ? "Đang gửi..." : "Gửi đánh giá") : "Đăng nhập để đánh giá"}
              </button>
            </form>
            {reviewMessage && <p className="review-message" role="status">{reviewMessage}</p>}
            <div className="review-list" aria-live="polite">
              {reviewsLoading && <p>Đang tải đánh giá...</p>}
              {!reviewsLoading && reviews.length === 0 && <p>Chưa có đánh giá.</p>}
              {reviews.map((review) => (
                <article key={review.id}>
                  <strong>{review.rating}/5 sao</strong>
                  <p>{review.comment || "Không có nhận xét."}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        <div className="sidebar-note">ℹ Thông tin chỉ mang tính tham khảo. Vui lòng gọi trước khi đến.</div>
      </aside>

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
          <MapErrorBoundary key={mapRenderKey} onError={handleMapError}>
            <Map
              ref={mapRef}
              mapStyle={FREE_MAP_STYLE}
              {...viewState}
              onLoad={() => setMapStatus("ready")}
              onError={handleMapError}
              onMove={(event) => setViewState(event.viewState)}
              style={{ width: "100%", height: "100%" }}
            >
              <NavigationControl position="top-right" />

              {userLocation && (
                <Marker longitude={userLocation.lng} latitude={userLocation.lat}>
                  <div className="user-marker"><span /></div>
                </Marker>
              )}

              {mappableFacilities.map((facility) => (
                <Marker
                  key={facility.facilityId}
                  longitude={facility.longitude}
                  latitude={facility.latitude}
                >
                  <button
                    className={`clinic-marker ${selectedFacility?.facilityId === facility.facilityId ? "selected" : ""}`}
                    type="button"
                    aria-label={`Chọn ${facility.facilityName} trên bản đồ`}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleCardClick(facility);
                    }}
                  >
                    <span aria-hidden="true">+</span>
                  </button>
                </Marker>
              ))}

              {selectedFacility?.hasValidCoordinates && (
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
                    <span>{selectedFacility.phoneLabel}</span>
                    {selectedFacility.website && (
                      <a href={selectedFacility.website} target="_blank" rel="noreferrer">Website cơ sở</a>
                    )}
                    <button type="button" onClick={() => openDirections(selectedFacility)}>Xem chi tiết</button>
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
              <button type="button" onClick={retryMap}>Thử tải lại bản đồ</button>
              <a href="#facility-list">Đến danh sách cơ sở</a>
            </div>
          </div>
        )}

        {mapStatus === "ready" && (
          <button className="locate-button" type="button" onClick={handleLocateMe} aria-label="Định vị tôi">⌖</button>
        )}
        {locationError && <div className="location-error">{locationError}</div>}
      </section>
    </main>
  );
}

const styles = `
.clinic-page { height: 100svh; display: flex; background: var(--bg); color: var(--ink); overflow: hidden; }
.map-skip-link { position: fixed; left: 340px; top: 12px; z-index: 20; border: 2px solid var(--ink); border-radius: 8px; background: var(--lime); padding: 10px 14px; color: var(--ink); font-weight: 900; transform: translateY(calc(-100% - 24px)); transition: transform 160ms ease; }
.map-skip-link:focus { transform: translateY(0); }
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
.facility-list-panel:focus { outline: none; }
.facility-result-card { border: 1px solid var(--line); border-radius: 10px; background: var(--paper-soft); padding: 12px; cursor: pointer; transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease; }
.facility-result-card:hover, .facility-result-card:focus-visible, .facility-result-card.selected { border: 1.5px solid var(--ink); box-shadow: 3px 3px 0 var(--ink); transform: translateY(-1px); }
.facility-top { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
.facility-top strong { font-size: 14px; line-height: 1.35; }
.type-badge { flex: 0 0 auto; border-radius: 999px; padding: 5px 8px; font-size: 10px; font-weight: 900; background: var(--lime); }
.type-badge.clinic { background: var(--mint); color: #075d66; }
.type-badge.pharmacy { background: #e5f8d1; color: #365e08; }
.type-badge.emergency { background: rgba(239,111,97,.16); color: #b42318; }
.type-badge.other { background: #fff; border: 1px solid var(--line); color: var(--muted); }
.facility-result-card p { margin: 8px 0 0; color: var(--muted); font-size: 11px; line-height: 1.45; }
.facility-result-card .coordinate-notice { color: #9a3412; font-weight: 850; }
.department-row { display: flex; gap: 6px; overflow-x: auto; margin-top: 10px; padding-bottom: 2px; }
.department-row span { flex: 0 0 auto; border-radius: 999px; background: #fff; border: 1px solid var(--line); padding: 5px 8px; color: var(--muted); font-size: 11px; font-weight: 800; }
.facility-select-button { width: 100%; min-height: 38px; margin-top: 10px; border: 1.5px solid var(--ink); border-radius: 8px; background: var(--mint); color: var(--ink); font-size: 12px; font-weight: 900; }
.facility-select-button[aria-pressed="true"] { background: var(--ink); color: #fff; }
.facility-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; border-top: 1px solid var(--line); margin-top: 10px; padding-top: 10px; }
.facility-actions button, .popup-card button { border: 1.5px solid var(--ink); border-radius: 8px; background: #fff; padding: 8px; font-size: 12px; font-weight: 900; }
.facility-actions button:last-child, .popup-card button { background: var(--lime); }
.facility-actions button:disabled { border-color: var(--line); background: #eef0e8; color: var(--muted); box-shadow: none; }
.sidebar-note { margin-top: 14px; border: 1px solid rgba(8,127,140,.22); border-radius: 10px; background: var(--mint); padding: 12px; color: var(--muted); font-size: 12px; line-height: 1.55; font-weight: 800; }
.facility-reviews { display: grid; gap: 10px; margin-top: 14px; border-top: 1px solid var(--line); padding-top: 14px; }
.facility-reviews h2 { margin: 0; font-size: 16px; }
.facility-reviews form, .facility-reviews label { display: grid; gap: 7px; }
.facility-reviews label span { font-size: 12px; font-weight: 850; }
.facility-reviews select, .facility-reviews textarea { width: 100%; border: 1.5px solid var(--ink); border-radius: 8px; background: #fff; padding: 9px; color: var(--ink); }
.facility-reviews form > button { min-height: 40px; border: 1.5px solid var(--ink); border-radius: 8px; background: var(--lime); color: var(--ink); font-weight: 900; }
.review-message, .review-list p { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.5; }
.review-list { display: grid; gap: 8px; }
.review-list article { border: 1px solid var(--line); border-radius: 8px; background: #fff; padding: 9px; }
.review-list article p { margin-top: 4px; }
.map-panel { position: relative; flex: 1; min-width: 0; background: #e9eee1; }
.map-status-overlay, .map-fallback { position: absolute; inset: 0; z-index: 5; display: grid; place-content: center; justify-items: center; gap: 10px; padding: 24px; text-align: center; }
.map-status-overlay { background: rgba(245,247,239,.88); backdrop-filter: blur(3px); }
.map-status-overlay p, .map-fallback p { max-width: 440px; margin: 0; color: var(--muted); line-height: 1.55; }
.map-loading-spinner { width: 34px; height: 34px; border: 4px solid rgba(8,127,140,.2); border-top-color: var(--teal); border-radius: 50%; animation: mapSpin .8s linear infinite; }
.map-fallback { background: linear-gradient(90deg, rgba(17,20,18,.06) 1px, transparent 1px), linear-gradient(rgba(17,20,18,.06) 1px, transparent 1px), #f5f7ef; background-size: 36px 36px; }
.map-fallback > span { width: 44px; height: 44px; display: grid; place-items: center; border: 2px solid var(--ink); border-radius: 50%; background: #fff4f2; color: #b42318; font-size: 24px; font-weight: 950; }
.map-fallback strong { font-size: clamp(20px, 3vw, 28px); }
.map-fallback-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 6px; }
.map-fallback-actions button, .map-fallback-actions a { min-height: 44px; display: inline-flex; align-items: center; justify-content: center; border: 1.5px solid var(--ink); border-radius: 9px; background: #fff; padding: 10px 14px; color: var(--ink); font-weight: 900; }
.map-fallback-actions button { background: var(--lime); }
.map-chat-context { position: absolute; left: 18px; top: 18px; z-index: 3; width: min(420px, calc(100% - 36px)); display: grid; gap: 8px; border: 1.5px solid var(--ink); border-radius: 14px; background: rgba(255,255,255,.94); box-shadow: 4px 4px 0 var(--ink); padding: 14px; backdrop-filter: blur(14px); }
.map-chat-context strong { font-size: 14px; }
.map-chat-context p { margin: 0; color: var(--ink); font-size: 13px; line-height: 1.45; font-weight: 850; }
.map-chat-context span { color: var(--muted); font-size: 12px; line-height: 1.5; }
.map-token-empty { height: 100%; display: grid; place-items: center; align-content: center; gap: 8px; text-align: center; background: linear-gradient(90deg, rgba(17,20,18,.06) 1px, transparent 1px), linear-gradient(rgba(17,20,18,.06) 1px, transparent 1px), #f5f7ef; background-size: 36px 36px; padding: 24px; }
.map-token-empty strong { font-size: 24px; }
.map-token-empty span { max-width: 420px; color: var(--muted); line-height: 1.5; }
.clinic-marker { width: 30px; height: 34px; display: grid; place-items: center; border: 2px solid var(--ink); border-radius: 999px 999px 999px 4px; background: var(--ink); color: var(--lime); padding: 0; font-weight: 900; transform: rotate(-45deg); box-shadow: 2px 2px 0 rgba(17,20,18,.28); transition: transform 180ms ease; }
.clinic-marker span { transform: rotate(45deg); }
.clinic-marker.selected { transform: rotate(-45deg) scale(1.25); background: var(--lime); color: var(--ink); }
.user-marker { width: 26px; height: 26px; display: grid; place-items: center; border: 2px solid var(--ink); border-radius: 50%; background: rgba(170,237,99,.35); animation: pulse 1.4s infinite; }
.user-marker span { width: 12px; height: 12px; border-radius: 50%; background: var(--lime); }
.popup-card { min-width: 190px; display: grid; gap: 6px; color: var(--ink); }
.popup-card strong { font-size: 14px; }
.popup-card span { color: var(--muted); font-size: 12px; line-height: 1.4; }
.popup-card a { color: var(--teal); font-size: 12px; font-weight: 900; }
.clinic-popup .maplibregl-popup-content { border: 1.5px solid var(--ink); border-radius: 10px; box-shadow: 3px 3px 0 var(--ink); padding: 12px; }
.clinic-popup .maplibregl-popup-tip { display: none; }
.locate-button { position: absolute; right: 18px; bottom: 18px; z-index: 2; width: 48px; height: 48px; display: grid; place-items: center; border: 1.5px solid var(--ink); border-radius: 12px; background: var(--lime); color: var(--ink); box-shadow: 4px 4px 0 var(--ink); font-size: 22px; font-weight: 900; }
.location-error { position: absolute; right: 18px; bottom: 78px; z-index: 2; border: 1px solid rgba(239,111,97,.35); border-radius: 9px; background: #fff4f2; color: #b42318; padding: 9px 11px; font-size: 12px; font-weight: 800; }
@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(170,237,99,.55); } 100% { box-shadow: 0 0 0 14px rgba(170,237,99,0); } }
@keyframes mapSpin { to { transform: rotate(360deg); } }
@media (max-width: 760px) {
  .clinic-page { flex-direction: column-reverse; }
  .clinic-sidebar { width: 100%; flex: 0 0 45vh; border-right: 0; border-top: 1.5px solid var(--ink); }
  .map-panel { flex: 0 0 55vh; }
  .map-skip-link { left: 12px; }
}
@media (prefers-reduced-motion: reduce) {
  .map-loading-spinner { animation: none; }
}
`;

export default NearbyClinicPage;
