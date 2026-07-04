import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FacilityList from "../components/nearbyClinic/FacilityList";
import FacilityMap from "../components/nearbyClinic/FacilityMap";
import FacilityReviews from "../components/nearbyClinic/FacilityReviews";
import { ensureMockFacilityCoverage } from "../data/mockMedicalFacilities";
import { navigate } from "../router/navigation";
import { doctorManagementApi } from "../services/doctors";
import {
  facilityDepartmentsApi,
  feedbackReviewsApi,
  getStoredAuth,
  medicalDepartmentsApi,
  medicalFacilitiesApi,
} from "../services/api";

const TYPE_LABELS = {
  hospital: "Bệnh viện",
  clinic: "Phòng khám",
  pharmacy: "Nhà thuốc",
  emergency: "Cấp cứu",
  other: "Cơ sở y tế",
};

const MAP_LOAD_TIMEOUT_MS = 12_000;

function readMapQuery() {
  const params = new URLSearchParams(window.location.search);
  return {
    departmentId: params.get("departmentId") || "",
    facilityId: params.get("facilityId") || "",
    search: params.get("search") || "",
    source: params.get("source") || "",
  };
}

function readMapRecommendationContext() {
  if (typeof sessionStorage === "undefined") return null;

  try {
    const raw = sessionStorage.getItem("medimate.map.recommendation");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

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

function getArrayData(response) {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  return [];
}

function getObjectData(response) {
  return response?.data?.data ?? response?.data ?? response;
}

function getDoctorImageUrl(doctor) {
  return doctor?.imageUrl || doctor?.avatarUrl || doctor?.photoUrl || "";
}

function mergeFacilityDetail(existingFacility, apiFacility) {
  return {
    ...existingFacility,
    ...apiFacility,
    phone: apiFacility.phone || existingFacility.phone,
    website: apiFacility.website || existingFacility.website,
    openingHours: apiFacility.openingHours || existingFacility.openingHours,
    imageUrl: apiFacility.imageUrl || apiFacility.thumbnailUrl || apiFacility.photoUrl || existingFacility.imageUrl,
    description: apiFacility.description || apiFacility.summary || existingFacility.description,
  };
}

function normalizeFacility(facility, relationDepartments = [], relationDepartmentIds = []) {
  const id = facility.facilityId ?? facility.id;
  const latitude = coordinateOrNull(facility.latitude, -90, 90);
  const longitude = coordinateOrNull(facility.longitude, -180, 180);
  const embeddedDepartments = Array.isArray(facility.departments)
    ? facility.departments.map((item) => item.departmentName ?? item.name ?? item).filter(Boolean)
    : [];
  const embeddedDepartmentIds = Array.isArray(facility.departments)
    ? facility.departments.map((item) => item.departmentId ?? item.id).filter(Boolean)
    : [];
  const departments = Array.from(new Set([...embeddedDepartments, ...relationDepartments].filter(Boolean)));
  const departmentIds = Array.from(new Set(
    [...embeddedDepartmentIds, ...relationDepartmentIds]
      .map((value) => String(value ?? "").trim())
      .filter(Boolean),
  ));
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
    imageUrl: facility.imageUrl || facility.thumbnailUrl || facility.photoUrl || "",
    description: facility.description || facility.summary || "",
    facilityType: facility.facilityType || TYPE_LABELS[typeKey],
    facilityTypeKey: typeKey,
    facilityTypeLabel: TYPE_LABELS[typeKey],
    openingHours: facility.openingHours || "Đang cập nhật",
    departments: departments.length ? departments : ["Đa khoa"],
    departmentIds,
  };
}

function NearbyClinicPage() {
  const auth = getStoredAuth();
  const [mapQuery] = useState(readMapQuery);
  const requestedDepartmentId = mapQuery.departmentId;
  const requestedFacilityId = mapQuery.facilityId;
  const [chatContext] = useState(() => {
    try {
      const raw = sessionStorage.getItem("medimate.map.chat");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [recommendationContext] = useState(readMapRecommendationContext);
  const [facilities, setFacilities] = useState([]);
  const [loadingFacilities, setLoadingFacilities] = useState(true);
  const [apiNotice, setApiNotice] = useState("");
  const [searchText, setSearchText] = useState(
    () => mapQuery.search,
  );
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [detailFacility, setDetailFacility] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailDoctors, setDetailDoctors] = useState([]);
  const [detailDoctorsLoading, setDetailDoctorsLoading] = useState(false);
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
  const detailCloseButtonRef = useRef(null);
  const requestedFacilityOpenedRef = useRef(false);
  const lastFittedBoundsRef = useRef("");

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

        const rawFacilities = facilityResult.status === "fulfilled" ? getArrayData(facilityResult.value) : [];
        const departments = departmentResult.status === "fulfilled" ? getArrayData(departmentResult.value) : [];
        const departmentNamesById = new globalThis.Map(
          departments
            .map((department) => [department.id, department.departmentName || department.name])
            .filter(([id, name]) => id && name),
        );
        const relations = relationResult.status === "fulfilled" ? getArrayData(relationResult.value) : [];
        const relationDepartmentsByFacility = new globalThis.Map();
        const relationDepartmentIdsByFacility = new globalThis.Map();
        relations.forEach((relation) => {
          const facilityId = relation.facilityId;
          if (!facilityId) return;

          const departmentName = relation.departmentName || departmentNamesById.get(relation.departmentId);
          if (departmentName) {
            const names = relationDepartmentsByFacility.get(facilityId) ?? [];
            names.push(departmentName);
            relationDepartmentsByFacility.set(facilityId, names);
          }

          if (relation.departmentId) {
            const ids = relationDepartmentIdsByFacility.get(facilityId) ?? [];
            ids.push(relation.departmentId);
            relationDepartmentIdsByFacility.set(facilityId, ids);
          }
        });
        const backendFacilities = rawFacilities.map((facility) => {
          const facilityId = facility.facilityId ?? facility.id;
          return normalizeFacility(
            facility,
            relationDepartmentsByFacility.get(facilityId) ?? [],
            relationDepartmentIdsByFacility.get(facilityId) ?? [],
          );
        });
        const data = ensureMockFacilityCoverage(backendFacilities, departments).map((facility) => normalizeFacility(facility));
        const usesMockData = data.some((facility) => facility.isMockFacility || facility.isMockAugmented);
        setFacilities(data);
        setReviewsLoading(Boolean(data[0]));
        setSelectedFacility(null);
        if (facilityResult.status !== "fulfilled") {
          setApiNotice("Không tải được danh sách cơ sở từ backend. Đang dùng dữ liệu mẫu cục bộ, ảnh được phục vụ từ frontend.");
        } else if (usesMockData) {
          setApiNotice("");
        } else {
          setApiNotice(data.length ? "" : "Backend chưa có cơ sở y tế đang hoạt động.");
        }
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
    if (selectedFacility.isMockFacility) return;

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
  }, [selectedFacility?.facilityId, selectedFacility?.isMockFacility]);

  const filteredFacilities = useMemo(() => {
    const normalized = normalizeSearchText(debouncedSearch);
    const normalizedDepartmentId = String(requestedDepartmentId).trim();
    const normalizedDepartmentSearch = normalizeSearchText(requestedDepartmentId);
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
      const matchDepartment = !normalizedDepartmentId
        || facility.departmentIds?.some((departmentId) => String(departmentId) === normalizedDepartmentId)
        || facility.departments.map(normalizeSearchText).some((value) => value.includes(normalizedDepartmentSearch));
      return matchSearch && matchDepartment;
    });
  }, [debouncedSearch, facilities, requestedDepartmentId]);

  const mappableFacilities = useMemo(
    () => filteredFacilities.filter((facility) => facility.hasValidCoordinates),
    [filteredFacilities],
  );
  const mapBoundsKey = useMemo(
    () => mappableFacilities.map((facility) => `${facility.facilityId}:${facility.longitude}:${facility.latitude}`).join("|"),
    [mappableFacilities],
  );
  const hasActiveFacilitiesWithoutMapData = facilities.length > 0 && !facilities.some((facility) => facility.hasValidCoordinates);

  const prefersReducedMotion = useCallback(() => (
    document.documentElement.dataset.motion === "reduce"
    || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
  ), []);

  const handleSearchChange = (event) => {
    setSearchText(event.target.value);
    setSelectedFacility(null);
    setDetailPanelOpen(false);
    setDetailFacility(null);
    setReviews([]);
    setReviewsLoading(false);
  };

  const handleCardClick = useCallback((facility) => {
    setReviewMessage("");
    if (facility?.isMockFacility) {
      setReviews([]);
      setReviewsLoading(false);
    } else {
      setReviewsLoading(true);
    }
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
  }, [mapStatus, prefersReducedMotion]);

  useEffect(() => {
    if (mapStatus !== "ready" || selectedFacility || mappableFacilities.length === 0) return;
    if (lastFittedBoundsRef.current === mapBoundsKey) return;
    lastFittedBoundsRef.current = mapBoundsKey;

    const duration = prefersReducedMotion() ? 0 : 900;

    if (mappableFacilities.length === 1) {
      const [facility] = mappableFacilities;
      mapRef.current?.flyTo?.({
        center: [facility.longitude, facility.latitude],
        zoom: 14,
        duration,
      });
      return;
    }

    const longitudes = mappableFacilities.map((facility) => facility.longitude);
    const latitudes = mappableFacilities.map((facility) => facility.latitude);
    mapRef.current?.fitBounds?.(
      [
        [Math.min(...longitudes), Math.min(...latitudes)],
        [Math.max(...longitudes), Math.max(...latitudes)],
      ],
      {
        duration,
        padding: { top: 72, right: 72, bottom: 72, left: 72 },
      },
    );
  }, [mapBoundsKey, mapStatus, mappableFacilities, prefersReducedMotion, selectedFacility]);

  const openFacilityDetail = useCallback(async (facility) => {
    if (!facility?.facilityId) return;
    handleCardClick(facility);
    setDetailPanelOpen(true);
    setDetailFacility(facility);
    setDetailLoading(true);
    setDetailDoctorsLoading(true);
    setDetailDoctors([]);
    setDetailError("");

    if (facility.isMockFacility) {
      setDetailFacility(facility);
      setDetailLoading(false);
      setDetailDoctorsLoading(false);
      return;
    }

    try {
      const [facilityResult, doctorResult] = await Promise.allSettled([
        medicalFacilitiesApi.get(facility.facilityId),
        doctorManagementApi.list({ facilityId: facility.facilityId, pageNumber: 1, pageSize: 12, isActive: true }),
      ]);
      if (facilityResult.status === "fulfilled") {
        setDetailFacility(normalizeFacility(
          mergeFacilityDetail(facility, getObjectData(facilityResult.value)),
          facility.departments,
          facility.departmentIds,
        ));
      } else {
        throw facilityResult.reason;
      }
      setDetailDoctors(doctorResult.status === "fulfilled" ? getArrayData(doctorResult.value) : []);
    } catch (error) {
      setDetailError(error.message || "Không tải được thông tin chi tiết cơ sở y tế.");
    } finally {
      setDetailLoading(false);
      setDetailDoctorsLoading(false);
    }
  }, [handleCardClick]);

  useEffect(() => {
    if (loadingFacilities || !requestedFacilityId || requestedFacilityOpenedRef.current) return;

    const matchedFacility = facilities.find((facility) => String(facility.facilityId) === String(requestedFacilityId));
    requestedFacilityOpenedRef.current = true;

    if (!matchedFacility) return undefined;

    const timeoutId = window.setTimeout(() => {
      if (mapQuery.source === "clinical") {
        handleCardClick(matchedFacility);
      } else {
        openFacilityDetail(matchedFacility);
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [facilities, handleCardClick, loadingFacilities, mapQuery.source, openFacilityDetail, requestedFacilityId]);

  useEffect(() => {
    if (mapQuery.source !== "clinical" || requestedFacilityId || selectedFacility || mappableFacilities.length === 0) return;
    const timeoutId = window.setTimeout(() => handleCardClick(mappableFacilities[0]), 0);
    return () => window.clearTimeout(timeoutId);
  }, [handleCardClick, mapQuery.source, mappableFacilities, requestedFacilityId, selectedFacility]);

  useEffect(() => {
    if (!detailPanelOpen) return undefined;
    const focusId = window.setTimeout(() => detailCloseButtonRef.current?.focus(), 0);
    return () => window.clearTimeout(focusId);
  }, [detailPanelOpen, detailFacility?.facilityId]);

  useEffect(() => {
    if (!detailPanelOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [detailPanelOpen]);

  const closeFacilityDetail = () => {
    const facilityId = detailFacility?.facilityId;
    setDetailPanelOpen(false);
    setDetailFacility(null);
    setDetailError("");
    setDetailDoctors([]);
    window.setTimeout(() => {
      cardRefs.current[facilityId]?.querySelector?.(".facility-select-button")?.focus();
    }, 0);
  };

  const detailServices = useMemo(() => {
    if (!detailFacility) return [];
    return [
      detailFacility.departments.length > 0 ? "Có thông tin chuyên khoa" : "",
      detailFacility.openingHours && detailFacility.openingHours !== "Đang cập nhật" ? "Có giờ hoạt động" : "",
      detailFacility.phone ? "Có số điện thoại liên hệ" : "",
      detailFacility.website ? "Có website cơ sở" : "",
      detailFacility.hasValidCoordinates ? "Có vị trí chỉ đường" : "",
    ].filter(Boolean);
  }, [detailFacility]);

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
        <header className="map-sidebar-head">
          <p>Cơ sở y tế</p>
          <h1>Tìm nơi khám phù hợp</h1>
          <span>Chọn một cơ sở để xem địa chỉ, chuyên khoa và đánh giá.</span>
        </header>
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

        {apiNotice && <div className="sidebar-note">{apiNotice}</div>}
        {hasActiveFacilitiesWithoutMapData && (
          <div className="sidebar-note">
            Backend đã có cơ sở active nhưng chưa có tọa độ hợp lệ. Admin cần cập nhật vĩ độ và kinh độ để bản đồ hiển thị marker.
          </div>
        )}

        <FacilityList
          cardRefs={cardRefs}
          facilities={filteredFacilities}
          loading={loadingFacilities}
          selectedFacilityId={selectedFacility?.facilityId}
          onCall={callFacility}
          onDirections={openDirections}
          onViewDetail={openFacilityDetail}
        />

        <FacilityReviews
          authenticated={Boolean(auth)}
          facility={selectedFacility}
          form={reviewForm}
          loading={reviewsLoading}
          message={reviewMessage}
          reviews={reviews}
          saving={savingReview}
          onFormChange={(key, value) => setReviewForm((current) => ({ ...current, [key]: value }))}
          onSubmit={submitReview}
        />

        <div className="sidebar-note">ℹ Thông tin chỉ mang tính tham khảo. Vui lòng gọi trước khi đến.</div>
      </aside>

      <section className="map-stage">
        <FacilityMap
          chatContext={chatContext}
          facilities={mappableFacilities}
          locationError={locationError}
          mapRef={mapRef}
          mapRenderKey={mapRenderKey}
          mapStatus={mapStatus}
          selectedFacility={selectedFacility}
          recommendationContext={recommendationContext}
          userLocation={userLocation}
          viewState={viewState}
          onError={handleMapError}
          onLocate={handleLocateMe}
          onMapLoad={() => setMapStatus("ready")}
          onRetry={retryMap}
          onSelect={(facility) => facility ? handleCardClick(facility) : setSelectedFacility(null)}
          onViewStateChange={setViewState}
          onViewDetail={openFacilityDetail}
        />
        {detailPanelOpen && detailFacility && (
          <section
            className="facility-detail-view"
            aria-labelledby="facility-detail-title"
            tabIndex="-1"
            onKeyDown={(event) => {
              if (event.key === "Escape") closeFacilityDetail();
            }}
          >
            <button
              ref={detailCloseButtonRef}
              className="facility-detail-close"
              type="button"
              onClick={closeFacilityDetail}
              aria-label="Đóng xem chi tiết"
            >
              ×
            </button>
            <div className="facility-detail-hero">
              {detailFacility.imageUrl ? <img src={detailFacility.imageUrl} alt="" /> : <span aria-hidden="true">+</span>}
              <div>
                <span className={`type-badge ${detailFacility.facilityTypeKey}`}>{detailFacility.facilityTypeLabel}</span>
                <h2 id="facility-detail-title">{detailFacility.facilityName}</h2>
                <p>{detailFacility.address}</p>
                <div className="facility-detail-hero-actions">
                  <button type="button" disabled={!detailFacility.phone} onClick={() => callFacility(detailFacility)}>Gọi điện</button>
                  <button type="button" disabled={!detailFacility.hasValidCoordinates} onClick={() => openDirections(detailFacility)}>Chỉ đường</button>
                </div>
              </div>
            </div>

          <div className="facility-detail-content">
            {detailLoading && <p className="facility-detail-status">Đang tải thông tin chi tiết...</p>}
            {detailError && <p className="facility-detail-error">{detailError}</p>}

            <section className="facility-detail-card wide">
              <h3>Thông tin bệnh viện</h3>
              <p>{detailFacility.description || "Backend chưa cung cấp mô tả chi tiết cho cơ sở y tế này."}</p>
              <dl className="facility-detail-facts">
                <div>
                  <dt>Số điện thoại</dt>
                  <dd>{detailFacility.phoneLabel}</dd>
                </div>
                <div>
                  <dt>Giờ hoạt động</dt>
                  <dd>{detailFacility.openingHours}</dd>
                </div>
                <div>
                  <dt>Website</dt>
                  <dd>{detailFacility.website ? <a href={detailFacility.website} target="_blank" rel="noreferrer">{detailFacility.website}</a> : "Chưa cập nhật"}</dd>
                </div>
              </dl>
              <div className="facility-detail-tags">
                {detailFacility.departments.map((department) => <span key={department}>{department}</span>)}
              </div>
            </section>

            <section className="facility-detail-card">
              <h3>Danh sách bác sĩ</h3>
              <div className="facility-detail-list facility-detail-doctor-list">
                {detailDoctorsLoading && <p>Đang tải danh sách bác sĩ...</p>}
                {!detailDoctorsLoading && detailDoctors.length === 0 && <p>Chưa có bác sĩ được liên kết với cơ sở này từ backend.</p>}
                {detailDoctors.map((doctor) => (
                  <article key={doctor.id}>
                    {getDoctorImageUrl(doctor) && (
                      <img
                        className="facility-detail-doctor-image"
                        src={getDoctorImageUrl(doctor)}
                        alt={`Ảnh bác sĩ ${doctor.fullName || ""}`.trim()}
                      />
                    )}
                    <div>
                      <strong>{doctor.fullName || "Bác sĩ chưa cập nhật tên"}</strong>
                      <span>{doctor.departmentName || doctor.specialty || "Chưa cập nhật chuyên khoa"}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="facility-detail-card">
              <h3>Đánh giá người dùng</h3>
              <div className="facility-detail-list">
                {reviewsLoading && <p>Đang tải đánh giá...</p>}
                {!reviewsLoading && reviews.length === 0 && <p>Chưa có đánh giá công khai cho cơ sở này.</p>}
                {reviews.slice(0, 4).map((review) => (
                  <article key={review.id}>
                    <strong>{review.rating}/5 sao</strong>
                    <span>{review.comment || "Không có nhận xét."}</span>
                  </article>
                ))}
              </div>
            </section>

            <section className="facility-detail-card wide">
              <h3>Tiện ích và dịch vụ nổi bật</h3>
              <div className="facility-detail-services">
                {detailServices.length
                  ? detailServices.map((service) => <span key={service}>{service}</span>)
                  : <p>Backend chưa cung cấp tiện ích hoặc dịch vụ nổi bật cho cơ sở này.</p>}
              </div>
            </section>
          </div>
        </section>
        )}
      </section>
    </main>
  );
}

const styles = `
.clinic-page { position: relative; height: 100svh; display: flex; background: var(--bg); color: var(--ink); overflow: hidden; }
.map-skip-link { position: fixed; left: 340px; top: 12px; z-index: 20; border: 2px solid var(--ink); border-radius: 8px; background: var(--lime); padding: 10px 14px; color: var(--ink); font-weight: 900; transform: translateY(calc(-100% - 24px)); transition: transform 160ms ease; }
.map-skip-link:focus { transform: translateY(0); }
.clinic-sidebar { width: 320px; flex: 0 0 320px; overflow-y: auto; border-right: 1.5px solid var(--ink); background: var(--paper); padding: 16px; }
.map-page-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
.map-page-actions button { min-height: 38px; border: 1.5px solid var(--ink); border-radius: 999px; background: #fff; color: var(--ink); font-weight: 900; }
.map-page-actions button:last-child { background: var(--lime); }
.clinic-search { display: grid; grid-template-columns: auto minmax(0,1fr) auto; align-items: center; gap: 8px; border: 1.5px solid var(--ink); border-radius: 10px; background: #fff; padding: 0 10px; }
.clinic-search input { min-width: 0; height: 42px; border: 0; outline: none; }
.clinic-search button { width: 28px; height: 28px; border: 0; border-radius: 50%; background: var(--mint); font-size: 18px; font-weight: 900; }
.filter-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; padding: 14px 0 8px; }
.filter-row::-webkit-scrollbar, .department-row::-webkit-scrollbar { display: none; }
.filter-row button { min-width: 0; border: 1.5px solid var(--ink); border-radius: 999px; background: #fff; color: var(--ink); padding: 8px 11px; font-size: 12px; font-weight: 900; }
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
.facility-details { margin-top: 10px; border-top: 1px solid var(--line); padding-top: 2px; }
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
.map-stage { position: relative; flex: 1; min-width: 0; }
.map-stage > .map-panel { position: absolute; inset: 14px; margin: 0; width: auto; height: auto; }
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
.clinic-marker { width: 42px; height: 42px; display: grid; place-items: center; border: 3px solid var(--ink); border-radius: 999px 999px 999px 5px; background: #d8f3bd; color: var(--ink); padding: 0; font-size: 24px; font-weight: 950; line-height: 1; box-shadow: 0 3px 8px rgba(17,20,18,.28); transform: rotate(-45deg); transition: transform 180ms ease; }
.clinic-marker span { transform: rotate(45deg) translateY(-1px); }
.clinic-marker.selected { transform: rotate(-45deg) scale(1.16); background: #bdf56d; color: var(--ink); }
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
.facility-detail-view { position: absolute; inset: 42px; z-index: 8; overflow-y: auto; display: block; border: 1px solid var(--line-strong); border-radius: 24px; background: linear-gradient(180deg, #f8fbf4, #eef5e9); box-shadow: 0 24px 70px rgba(17,20,18,.22); transform-origin: center bottom; animation: facilityDetailReveal 520ms cubic-bezier(.16, 1, .3, 1) both; }
.facility-detail-close { position: absolute; top: 18px; right: 18px; z-index: 12; width: 44px; height: 44px; display: grid; place-items: center; border: 1px solid rgba(180, 35, 24, .24); border-radius: 50%; background: #fff4f2; color: #b42318; box-shadow: 0 12px 28px rgba(180, 35, 24, .18); font-size: 28px; line-height: 1; font-weight: 900; cursor: pointer; transition: transform 180ms ease, background 180ms ease, box-shadow 180ms ease; }
.facility-detail-close:hover, .facility-detail-close:focus-visible { background: #b42318; color: #fff; box-shadow: 0 16px 34px rgba(180, 35, 24, .28); transform: scale(1.04); outline: none; }
.facility-detail-hero { min-height: 320px; display: grid; grid-template-columns: minmax(280px, .8fr) minmax(0, 1fr); gap: 0; border-bottom: 1px solid var(--line); background: #fff; }
.facility-detail-hero > img, .facility-detail-hero > span { width: 100%; height: 100%; min-height: 320px; object-fit: cover; }
.facility-detail-hero > span { display: grid; place-items: center; background: linear-gradient(135deg, rgba(8,127,140,.16), rgba(184,239,121,.36)), #edf6e8; color: var(--ink); font-size: 48px; font-weight: 950; }
.facility-detail-hero > div { display: grid; align-content: center; gap: 13px; padding: clamp(24px, 4vw, 44px); }
.facility-detail-hero h2 { max-width: 780px; margin: 0; font-size: clamp(36px, 5vw, 62px); line-height: 1.02; letter-spacing: 0; }
.facility-detail-hero p { margin: 0; color: var(--muted); font-size: 16px; line-height: 1.55; font-weight: 780; }
.facility-detail-hero > div > button { width: fit-content; min-height: 38px; border: 1px solid var(--line); border-radius: 999px; background: #fff; color: var(--ink); padding: 0 13px; font-weight: 900; }
.facility-detail-hero-actions { display: flex; flex-wrap: wrap; gap: 10px; padding-top: 8px; }
.facility-detail-hero-actions button { min-height: 44px; border: 1.5px solid var(--ink); border-radius: 10px; background: #fff; color: var(--ink); padding: 0 16px; font-weight: 900; }
.facility-detail-hero-actions button:first-child { background: #d8f3bd; }
.facility-detail-hero-actions button:disabled { border-color: var(--line); background: #eef0e8; color: var(--muted); }
.facility-detail-content { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; padding: clamp(18px, 3vw, 28px); }
.facility-detail-card { min-width: 0; display: grid; align-content: start; gap: 12px; border: 1px solid var(--line); border-radius: 18px; background: rgba(255,255,255,.88); box-shadow: 0 14px 42px rgba(24,54,31,.08); padding: clamp(16px, 2vw, 22px); }
.facility-detail-card.wide { grid-column: 1 / -1; }
.facility-detail-card h3 { margin: 0; font-size: 21px; line-height: 1.22; }
.facility-detail-card p, .facility-detail-status, .facility-detail-error { margin: 0; color: var(--muted); line-height: 1.55; font-size: 13px; font-weight: 760; }
.facility-detail-error { border: 1px solid rgba(239,111,97,.28); border-radius: 12px; background: #fff4f2; color: #b42318; padding: 10px; }
.facility-detail-status { border: 1px solid rgba(8,127,140,.18); border-radius: 12px; background: var(--mint); padding: 10px; }
.facility-detail-facts { display: grid; gap: 8px; margin: 0; }
.facility-detail-facts div { min-width: 0; border: 1px solid var(--line); border-radius: 12px; background: var(--paper-soft); padding: 10px; }
.facility-detail-facts dt { color: var(--muted); font-size: 11px; font-weight: 900; text-transform: uppercase; }
.facility-detail-facts dd { margin: 5px 0 0; overflow-wrap: anywhere; color: var(--ink); font-size: 13px; font-weight: 850; }
.facility-detail-facts a { color: var(--teal); }
.facility-detail-tags { display: flex; flex-wrap: wrap; gap: 7px; }
.facility-detail-tags span { border: 1px solid var(--line); border-radius: 999px; background: var(--paper-soft); padding: 6px 9px; color: #315d18; font-size: 12px; font-weight: 850; }
.facility-detail-list, .facility-detail-services { display: grid; gap: 9px; }
.facility-detail-list article { display: grid; gap: 4px; border: 1px solid var(--line); border-radius: 12px; background: var(--paper-soft); padding: 11px; }
.facility-detail-doctor-list article { grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 10px; }
.facility-detail-doctor-list article > div { min-width: 0; }
.facility-detail-list strong { font-size: 13px; }
.facility-detail-list span { color: var(--muted); font-size: 12px; line-height: 1.45; }
.facility-detail-doctor-image { width: 42px; height: 42px; border: 1px solid var(--line); border-radius: 999px; object-fit: cover; background: #f4f7ee; }
.facility-detail-services { display: flex; flex-wrap: wrap; gap: 8px; }
.facility-detail-services span { border: 1px solid var(--line); border-radius: 999px; background: #e4f4f2; color: #075d66; padding: 8px 10px; font-size: 12px; font-weight: 850; }
@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(170,237,99,.55); } 100% { box-shadow: 0 0 0 14px rgba(170,237,99,0); } }
@keyframes mapSpin { to { transform: rotate(360deg); } }
@keyframes facilityDetailReveal { from { opacity: 0; transform: translateY(34px) scale(.94); } to { opacity: 1; transform: translateY(0) scale(1); } }
@media (max-width: 760px) {
  .clinic-page { flex-direction: column-reverse; }
  .clinic-sidebar { width: 100%; flex: 0 0 45vh; border-right: 0; border-top: 1.5px solid var(--ink); }
  .map-stage { flex: 0 0 55vh; }
  .map-stage > .map-panel { inset: 10px; }
  .map-skip-link { left: 12px; }
  .facility-detail-view { inset: 18px; }
}
@media (prefers-reduced-motion: reduce) {
  .map-loading-spinner { animation: none; }
}

/* Map workspace: list first, detail on demand, map kept visually quiet. */
.clinic-page {
  --ink: #111412;
  --muted: #5d685f;
  --paper-soft: #f7faf5;
  --line: #dce4d9;
  --line-strong: #bac8b6;
  --teal: #087f8c;
  --lime: #b8ef79;
  --mint: #e4f4f2;
  color-scheme: light;
  color: var(--ink);
  background: #eef3ec;
}
.clinic-sidebar { width: min(430px, 40vw); border-right: 1px solid #d7e0d3; background: rgba(252, 253, 250, .98); padding: 22px; }
.map-sidebar-head { display: grid; gap: 5px; margin-bottom: 18px; }
.map-sidebar-head p { margin: 0; color: var(--teal); font-size: 11px; font-weight: 950; letter-spacing: .12em; text-transform: uppercase; }
.map-sidebar-head h1 { margin: 0; font-size: clamp(25px, 3vw, 34px); line-height: 1.08; }
.map-sidebar-head span { color: var(--muted); font-size: 13px; line-height: 1.5; }
.map-page-actions button { border-color: var(--line); border-radius: 10px; background: var(--paper-soft); }
.map-page-actions button:last-child { border-color: #87b65b; background: #e9f7da; }
.clinic-search { min-height: 50px; border: 1px solid var(--line-strong); border-radius: 14px; box-shadow: 0 8px 24px rgba(24, 54, 31, .07); }
.filter-row { grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 2px 0 7px; }
.filter-row button { min-height: 38px; border-color: var(--line); background: #fff; }
.filter-row button.active { border-color: var(--teal); background: #e4f4f2; color: #075d66; }
.result-summary { display: flex; align-items: baseline; flex-wrap: wrap; gap: 5px; margin: 4px 0 12px; }
.result-summary .result-count { margin: 0; color: var(--ink); font-size: 13px; }
.result-summary span { color: var(--muted); font-size: 12px; }
.facility-list-panel { gap: 10px; }
.facility-result-card { border-color: var(--line); border-radius: 16px; background: #fff; padding: 15px; box-shadow: 0 7px 24px rgba(24, 54, 31, .05); }
.facility-result-card:hover, .facility-result-card:focus-within, .facility-result-card.selected { border-color: #6e9e49; box-shadow: 0 12px 30px rgba(24, 54, 31, .11); transform: translateY(-1px); }
.facility-select-button { min-height: 42px; border-color: var(--line-strong); border-radius: 10px; background: var(--paper-soft); }
.facility-select-button[aria-pressed="true"] { border-color: #315d18; background: #e9f7da; color: #244611; }
.facility-details { margin-top: 14px; padding-top: 10px; }
.facility-reviews { border: 1px solid var(--line); border-radius: 16px; background: #fff; padding: 15px; }
.map-panel { margin: 14px; overflow: hidden; border: 1px solid #d7e0d3; border-radius: 22px; box-shadow: 0 18px 54px rgba(24, 54, 31, .12); }
.clinic-marker { border-color: var(--ink); background: #d8f3bd; box-shadow: 0 4px 12px rgba(17, 20, 18, .28); }
.clinic-marker.selected { background: #bdf56d; box-shadow: 0 5px 18px rgba(17, 20, 18, .35); }
.clinic-popup .maplibregl-popup-content { border: 1px solid var(--line-strong); border-radius: 14px; box-shadow: 0 14px 40px rgba(17, 20, 18, .18); }
.locate-button { border-color: #fff; border-radius: 50%; background: var(--teal); color: #fff; box-shadow: 0 8px 24px rgba(17, 20, 18, .22); }

@media (max-width: 760px) {
  .clinic-page { display: grid; grid-template-rows: minmax(38svh, 320px) auto; }
  .map-panel { order: 1; min-height: 38svh; margin: 10px; border-radius: 18px; }
  .clinic-sidebar { order: 2; width: 100%; max-height: none; padding: 18px 14px 96px; }
  .map-sidebar-head h1 { font-size: 27px; }
}

/* Focused /map UX refinements: text alternative, keyboard markers, compact detail panel. */
.result-summary {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  margin: 16px 0 8px;
}
.result-summary h2 {
  margin: 0;
  font-size: 16px;
  line-height: 1.25;
}
.result-summary span {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
}
.facility-result-skeleton {
  display: grid;
  gap: 10px;
}
.facility-result-skeleton .short {
  width: 62%;
}
.facility-result-card {
  cursor: default;
}
.facility-card-address {
  margin: 8px 0 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}
.facility-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.facility-card-meta span {
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--paper-soft);
  color: var(--muted);
  padding: 5px 8px;
  font-size: 11px;
  font-weight: 800;
}
.clinic-search:focus-within {
  border-color: var(--teal);
  box-shadow: 0 0 0 4px rgba(8, 127, 140, .12), 0 8px 24px rgba(24, 54, 31, .07);
}
.clinic-marker {
  appearance: none;
  cursor: pointer;
}
.clinic-marker:focus-visible {
  outline: 3px solid rgba(8, 127, 140, .5);
  outline-offset: 4px;
}
.clinic-marker[aria-pressed="true"] {
  border-color: #315d18;
}
.popup-card {
  max-width: 230px;
}
.popup-ai-summary {
  display: grid;
  gap: 6px;
  max-width: 280px;
  max-height: 240px;
  overflow-y: auto;
  border: 1px solid rgba(8, 127, 140, .18);
  border-radius: 12px;
  background: linear-gradient(180deg, #f2fbfa, #fff);
  padding: 10px;
}
.popup-ai-summary small {
  width: fit-content;
  border-radius: 999px;
  background: #d8f3bd;
  color: #244611;
  padding: 4px 8px;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: .04em;
  text-transform: uppercase;
}
.popup-ai-summary b {
  color: var(--ink);
  font-size: 15px;
  line-height: 1.2;
}
.popup-ai-summary em {
  width: fit-content;
  border-radius: 999px;
  background: #fff7d8;
  color: #6b5100;
  padding: 4px 8px;
  font-size: 11px;
  font-style: normal;
  font-weight: 950;
}
.popup-ai-summary p {
  margin: 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.45;
}
.popup-ai-summary ul {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.popup-ai-summary li {
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #fff;
  color: var(--muted);
  padding: 4px 7px;
  font-size: 10px;
  font-weight: 850;
}
.popup-diagnosis-chart {
  display: grid;
  gap: 7px;
}
.popup-diagnosis-chart div {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) 42px;
  align-items: center;
  gap: 7px;
}
.popup-diagnosis-chart span {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--ink);
  color: var(--lime);
  font-size: 10px;
  font-weight: 950;
}
.popup-diagnosis-chart strong {
  min-width: 0;
  color: var(--ink);
  font-size: 11px;
  overflow-wrap: anywhere;
}
.popup-diagnosis-chart i {
  grid-column: 2 / -1;
  display: block;
  height: 7px;
  min-width: 5px;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--lime), var(--teal));
}
.popup-diagnosis-chart em {
  color: var(--muted);
  font-size: 10px;
  font-style: normal;
  font-weight: 950;
  text-align: right;
}
.popup-diagnosis-table {
  width: 100%;
  border-collapse: collapse;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 10px;
  font-size: 10px;
}
.popup-diagnosis-table th,
.popup-diagnosis-table td {
  padding: 6px;
  border-bottom: 1px solid var(--line);
  text-align: left;
}
.popup-diagnosis-table th {
  color: var(--muted);
  font-weight: 950;
}
.popup-diagnosis-table tr:last-child td {
  border-bottom: 0;
}
.popup-card button:focus-visible,
.facility-select-button:focus-visible,
.facility-actions button:focus-visible,
.facility-detail-hero button:focus-visible,
.facility-reviews button:focus-visible,
.locate-button:focus-visible {
  outline: 3px solid rgba(8, 127, 140, .42);
  outline-offset: 3px;
}
.facility-detail-view {
  inset: 28px;
  border-radius: 20px;
  background: #f7faf5;
  animation-duration: 320ms;
}
.facility-detail-hero {
  min-height: 240px;
  grid-template-columns: minmax(240px, .58fr) minmax(0, 1fr);
}
.facility-detail-hero > img,
.facility-detail-hero > span {
  min-height: 240px;
}
.facility-detail-hero > div {
  align-content: center;
  padding: clamp(22px, 3vw, 34px);
}
.facility-detail-hero h2 {
  max-width: 700px;
  font-size: clamp(30px, 4vw, 48px);
  overflow-wrap: anywhere;
}
.facility-detail-hero p {
  overflow-wrap: anywhere;
}
.facility-detail-content {
  gap: 14px;
  padding: clamp(16px, 2.4vw, 24px);
}
.facility-detail-card {
  border-radius: 14px;
  box-shadow: 0 10px 28px rgba(24, 54, 31, .07);
}

@media (max-width: 1080px) {
  .clinic-sidebar {
    width: min(390px, 42vw);
  }
  .facility-detail-view {
    inset: 20px;
  }
  .facility-detail-hero {
    grid-template-columns: 1fr;
  }
  .facility-detail-hero > img,
  .facility-detail-hero > span {
    min-height: 170px;
    max-height: 220px;
  }
  .facility-detail-content {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .clinic-page {
    min-height: 100svh;
    height: auto;
    overflow: visible;
  }
  .map-stage {
    min-height: 320px;
  }
  .clinic-sidebar {
    width: 100%;
  }
  .facility-detail-view {
    position: fixed;
    inset: 12px;
    z-index: 60;
    border-radius: 18px;
    max-height: calc(100svh - 24px);
  }
  .facility-detail-hero {
    min-height: 0;
  }
  .facility-detail-hero > img,
  .facility-detail-hero > span {
    min-height: 132px;
    max-height: 160px;
  }
  .facility-detail-hero h2 {
    font-size: clamp(26px, 8vw, 34px);
  }
  .facility-detail-hero-actions button,
  .facility-actions button,
  .map-page-actions button {
    width: 100%;
  }
}
`;

export default NearbyClinicPage;
