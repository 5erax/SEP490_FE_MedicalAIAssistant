import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  Clock3,
  Globe2,
  House,
  ImagePlus,
  Info,
  MapPin,
  Pencil,
  Phone,
  Route,
  Search,
  Share2,
  Star,
  Stethoscope,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useFeedback } from "../components/feedback/feedbackContext";
import FacilityList from "../components/nearbyClinic/FacilityList";
import FacilityMap from "../components/nearbyClinic/FacilityMap";
import useNearbyFacilities from "../hooks/useNearbyFacilities";
import { getFacilityRating, formatFacilityRating } from "../utils/facilityRating";
import { DEFAULT_NEARBY_RADIUS_KM, NEARBY_LIMIT } from "../utils/nearbyFacilities";
import { navigate } from "../router/navigation";
import { doctorManagementApi } from "../services/doctors";
import { uploadImageToCloudinary } from "../services/cloudinaryUploadService";
import {
  facilityDepartmentsApi,
  FEEDBACK_REVIEW_MESSAGES,
  feedbackReviewsApi,
  getFeedbackReviewApiMessage,
  getStoredAuth,
  medicalDepartmentsApi,
  medicalFacilitiesApi,
  readAnalysisPayload,
  symptomAnalysisApi,
} from "../services/api";
import "../styles/map-clinical-refresh.css";

const TYPE_LABELS = {
  hospital: "Bệnh viện",
  clinic: "Phòng khám",
  pharmacy: "Nhà thuốc",
  emergency: "Cấp cứu",
  other: "Cơ sở y tế",
};

const MAP_LOAD_TIMEOUT_MS = 12_000;
const SIDEBAR_MAP_OFFSET = 190;
const DETAIL_TABS = [
  ["overview", "Tổng quan"],
  ["reviews", "Đánh giá"],
];

const RATING_LABELS = ["", "Rất tệ", "Không hài lòng", "Bình thường", "Hài lòng", "Rất hài lòng"];

function getValidTab(value) {
  return DETAIL_TABS.some(([id]) => id === value) ? value : "overview";
}

function readMapQuery() {
  const params = new URLSearchParams(window.location.search);
  return {
    departmentId: params.get("departmentId") || "",
    doctorId: params.get("doctorId") || "",
    facilityId: params.get("facilityId") || "",
    search: params.get("search") || "",
    sessionId: params.get("sessionId") || "",
    source: params.get("source") || "",
    tab: getValidTab(params.get("tab")),
  };
}

function sanitizeDepartment(department) {
  if (!department || typeof department !== "object") return null;
  const emergencyValue = department.isEmergencySuggested ?? department.IsEmergencySuggested;
  return {
    confidenceScore: Number(department.confidenceScore ?? department.ConfidenceScore ?? 0) || 0,
    departmentId: String(
      department.departmentId
      ?? department.DepartmentId
      ?? department.id
      ?? "",
    ).trim(),
    departmentName: department.departmentName ?? department.DepartmentName ?? department.name ?? "",
    description: String(
      department.description
      ?? department.Description
      ?? "",
    ).trim(),
    icdChapterCode: String(
      department.icdChapterCode
      ?? department.IcdChapterCode
      ?? "",
    ).trim(),
    priorityRank: Number(department.priorityRank ?? department.PriorityRank ?? 0) || 0,
    reason: String(department.reason ?? department.Reason ?? "").trim(),
    isEmergencySuggested: emergencyValue === true
      || String(emergencyValue ?? "").toLowerCase() === "true",
  };
}

function sanitizeDiagnosis(diagnosis, index = 0) {
  if (!diagnosis || typeof diagnosis !== "object") return null;

  const diseaseName = String(
    diagnosis.diseaseName ?? diagnosis.DiseaseName ?? diagnosis.name ?? "",
  ).trim();
  const icd10Code = String(
    diagnosis.icd10Code ?? diagnosis.Icd10Code ?? diagnosis.icdCode ?? "",
  ).trim();
  if (!diseaseName && !icd10Code) return null;

  return {
    clinicalReasoning: String(
      diagnosis.clinicalReasoning ?? diagnosis.ClinicalReasoning ?? "",
    ).trim(),
    diseaseName,
    icd10Code,
    rank: Number(diagnosis.rank ?? diagnosis.Rank ?? index + 1) || index + 1,
  };
}

function sanitizeSymptomAsDiagnosis(symptom, index = 0) {
  if (!symptom || typeof symptom !== "object") return null;

  const diagnosis = sanitizeDiagnosis({
    clinicalReasoning: symptom.extractedText ?? symptom.ExtractedText,
    diseaseName: symptom.symptomName ?? symptom.SymptomName,
    icd10Code: symptom.icd10Code ?? symptom.Icd10Code,
    rank: index + 1,
  }, index);
  if (!diagnosis) return null;

  return {
    ...diagnosis,
    confidenceScore: Number(
      symptom.confidenceScore ?? symptom.ConfidenceScore ?? 0,
    ) || 0,
  };
}

function sanitizeRecommendedFacility(facility) {
  if (!facility || typeof facility !== "object") return null;
  const id = String(
    facility.facilityId
    ?? facility.FacilityId
    ?? facility.medicalFacilityId
    ?? facility.id
    ?? "",
  ).trim();
  if (!id) return null;
  const departmentItems = facility.departments ?? facility.Departments;
  return {
    address: String(facility.address ?? facility.Address ?? "").trim(),
    departments: (Array.isArray(departmentItems) ? departmentItems : []).map((department) => ({
      departmentId: String(
        department?.departmentId ?? department?.DepartmentId ?? department?.id ?? "",
      ).trim(),
      departmentName: String(
        department?.departmentName ?? department?.DepartmentName ?? department?.name ?? "",
      ).trim(),
    })).filter((department) => department.departmentId || department.departmentName),
    facilityId: id,
    facilityName: String(
      facility.facilityName ?? facility.FacilityName ?? facility.name ?? "",
    ).trim(),
    facilityType: String(facility.facilityType ?? facility.FacilityType ?? "").trim(),
    imageUrl: String(facility.imageUrl ?? facility.ImageUrl ?? "").trim(),
    isActive: (facility.isActive ?? facility.IsActive) !== false,
    latitude: coordinateOrNull(facility.latitude ?? facility.Latitude, -90, 90),
    longitude: coordinateOrNull(facility.longitude ?? facility.Longitude, -180, 180),
    openingHours: String(facility.openingHours ?? facility.OpeningHours ?? "").trim(),
    phone: String(facility.phone ?? facility.Phone ?? "").trim(),
    website: String(facility.website ?? facility.Website ?? "").trim(),
  };
}

function buildClinicalRecommendationContext(analysis) {
  if (!analysis || typeof analysis !== "object") return null;
  const diagnosisItems = analysis.diagnoses ?? analysis.Diagnoses;
  const primaryDiagnosis = analysis.primaryDiagnosis ?? analysis.PrimaryDiagnosis;
  let diagnoses = (
    Array.isArray(diagnosisItems) && diagnosisItems.length > 0
      ? diagnosisItems
      : primaryDiagnosis ? [primaryDiagnosis] : []
  )
    .map(sanitizeDiagnosis)
    .filter(Boolean)
    .sort((left, right) => left.rank - right.rank);
  if (diagnoses.length === 0) {
    const symptomItems = analysis.symptoms ?? analysis.Symptoms;
    diagnoses = (Array.isArray(symptomItems) ? symptomItems : [])
      .map(sanitizeSymptomAsDiagnosis)
      .filter(Boolean)
      .sort((left, right) => right.confidenceScore - left.confidenceScore)
      .map((diagnosis, index) => ({ ...diagnosis, rank: index + 1 }));
  }
  const departmentItems = analysis.recommendedDepartments ?? analysis.RecommendedDepartments;
  const recommendedDepartment = sanitizeDepartment(
    analysis.recommendedDepartment
    ?? analysis.RecommendedDepartment
    ?? (Array.isArray(departmentItems) ? departmentItems[0] : null),
  );
  const facilityItems = analysis.recommendedFacilities ?? analysis.RecommendedFacilities;
  const recommendedFacilities = (Array.isArray(facilityItems)
    ? facilityItems
    : [])
    .map(sanitizeRecommendedFacility)
    .filter(Boolean);

  const context = {
    diagnoses,
    recommendedDepartment,
    recommendedFacilities,
    sessionId: String(analysis.sessionId ?? "").trim(),
  };

  return recommendedDepartment || recommendedFacilities.length || diagnoses.length
    ? context
    : null;
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

function formatDistance(distanceKm) {
  if (!Number.isFinite(distanceKm)) return "";
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`;
}

function getDistanceKm(fromLocation, facility) {
  if (!fromLocation || !facility?.hasValidCoordinates) return null;
  const toRadians = (degree) => degree * Math.PI / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(facility.latitude - fromLocation.lat);
  const dLng = toRadians(facility.longitude - fromLocation.lng);
  const lat1 = toRadians(fromLocation.lat);
  const lat2 = toRadians(facility.latitude);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}


function getReviewAuthorName(review) {
  return review?.reviewerName
    || review?.userFullName
    || review?.fullName
    || review?.userName
    || review?.username
    || review?.createdByName
    || review?.patientName
    || "Người dùng ẩn danh";
}

function getReviewAuthorInitial(name) {
  if (name === "Người dùng ẩn danh") return "ND";
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  return words.slice(-2).map((word) => word[0]).join("").toUpperCase() || "ND";
}

function getReviewDate(review) {
  const value = review?.createdAt || review?.reviewedAt || review?.updatedAt;
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("vi-VN");
}

function getReviewImageUrls(review) {
  const collection = review?.imageUrls || review?.images || review?.reviewImages || [];
  const collectionUrls = Array.isArray(collection)
    ? collection.map((image) => typeof image === "string" ? image : image?.url || image?.imageUrl).filter(Boolean)
    : Object.values(collection || {}).filter((url) => typeof url === "string" && url);
  const legacyUrl = review?.imageUrl || review?.reviewImageUrl || review?.photoUrl || "";
  return Array.from(new Set([...collectionUrls, legacyUrl].filter(Boolean)));
}

function toReviewImageUrlMap(imageUrls) {
  return Object.fromEntries(
    imageUrls.slice(0, 5).map((imageUrl, index) => [`image${index + 1}`, imageUrl]),
  );
}

function isReviewByCurrentUser(review, auth) {
  if (!review || !auth) return false;
  if (review.isCurrentUser === true) return true;
  const currentIds = [auth.userId, auth.identityId].filter(Boolean).map(String);
  const reviewIds = [review.userId, review.reviewerId, review.identityId, review.createdBy]
    .filter(Boolean)
    .map(String);
  if (currentIds.some((id) => reviewIds.includes(id))) return true;

  const currentEmail = String(auth.email || "").trim().toLowerCase();
  const reviewEmail = String(review.reviewerEmail || review.userEmail || "").trim().toLowerCase();
  return Boolean(currentEmail && reviewEmail && currentEmail === reviewEmail);
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

function getDoctorName(doctor) {
  return doctor?.fullName || "Bác sĩ chưa cập nhật tên";
}

function getDoctorSpecialty(doctor) {
  return doctor?.departmentName || doctor?.specialty || "Chưa cập nhật chuyên khoa";
}

function getDoctorRoleLabel(doctor) {
  const role = doctor?.departmentRoleName || doctor?.departmentRole || "";
  const normalizedRole = normalizeSearchText(role);
  if (normalizedRole === "doctor") return "Bác sĩ";
  if (normalizedRole === "deputyhead") return "Phó khoa";
  if (normalizedRole === "head") return "Trưởng khoa";
  if (normalizedRole === "leadingexpert") return "Chuyên gia đầu ngành";
  if (normalizedRole === "consultant") return "Cố vấn chuyên môn";
  return role;
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
  const embeddedDepartmentItems = Array.isArray(facility.departments) ? facility.departments : [];
  const embeddedDepartments = embeddedDepartmentItems
    .map((item) => item.departmentName ?? item.name ?? item)
    .filter(Boolean);
  const consultationDepartmentsById = new globalThis.Map();
  embeddedDepartmentItems.forEach((item, index) => {
    const departmentId = String(item?.departmentId ?? item?.id ?? "").trim();
    if (!departmentId) return;
    consultationDepartmentsById.set(departmentId, {
      id: departmentId,
      name: item?.departmentName ?? item?.name ?? embeddedDepartments[index] ?? `Chuyên khoa ${index + 1}`,
    });
  });
  relationDepartmentIds.forEach((value, index) => {
    const departmentId = String(value ?? "").trim();
    if (!departmentId || consultationDepartmentsById.has(departmentId)) return;
    consultationDepartmentsById.set(departmentId, {
      id: departmentId,
      name: relationDepartments[index] ?? `Chuyên khoa ${index + 1}`,
    });
  });
  const consultationDepartments = Array.from(consultationDepartmentsById.values());
  const departments = Array.from(new Set([...embeddedDepartments, ...relationDepartments].filter(Boolean)));
  const departmentIds = consultationDepartments.map((department) => department.id);
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
    consultationDepartments,
  };
}

function NearbyClinicPage() {
  const auth = getStoredAuth();
  const { confirmAction, showToast } = useFeedback();
  const [mapQuery, setMapQuery] = useState(readMapQuery);
  const isClinicalFlow = mapQuery.source === "clinical";
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
  const [recommendationContext, setRecommendationContext] = useState(null);
  const [clinicalStatus, setClinicalStatus] = useState(() => {
    if (!isClinicalFlow) return "idle";
    if (!auth?.accessToken) return "locked";
    if (!mapQuery.sessionId) return "error";
    return "loading";
  });
  const [clinicalNotice, setClinicalNotice] = useState(() => {
    if (!isClinicalFlow) return "";
    if (!auth?.accessToken) {
      return "Đăng nhập để xem lại kết quả gợi ý chuyên khoa của bạn.";
    }
    if (!mapQuery.sessionId) {
      return "Không tìm thấy mã phiên gợi ý để khôi phục kết quả.";
    }
    return "";
  });
  const [facilities, setFacilities] = useState([]);
  const [loadingFacilities, setLoadingFacilities] = useState(true);
  const [apiNotice, setApiNotice] = useState("");
  const [searchText, setSearchText] = useState(
    () => mapQuery.search,
  );
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState("all");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(requestedDepartmentId || "all");
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [departmentPickerOpen, setDepartmentPickerOpen] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [sidebarView, setSidebarView] = useState("hospital-list");
  const [sidebarUnlocked, setSidebarUnlocked] = useState(false);
  const [activeHospitalTab, setActiveHospitalTab] = useState(mapQuery.tab);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [detailFacility, setDetailFacility] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailDoctors, setDetailDoctors] = useState([]);
  const [, setDetailDoctorsLoading] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsTotalCount, setReviewsTotalCount] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: "5", comment: "", imageUrls: [] });
  const [hoveredReviewRating, setHoveredReviewRating] = useState(0);
  const [reviewMessage, setReviewMessage] = useState("");
  const [savingReview, setSavingReview] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState("");
  const [submittedReview, setSubmittedReview] = useState(null);
  const [editingReview, setEditingReview] = useState(false);
  const [uploadingReviewImage, setUploadingReviewImage] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyEnabled, setNearbyEnabled] = useState(false);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_NEARBY_RADIUS_KM);
  const [nearbyAttempt, setNearbyAttempt] = useState(0);
  const [locating, setLocating] = useState(false);
  const locatingRef = useRef(false);
  const nearby = useNearbyFacilities(nearbyEnabled ? userLocation : null, radiusKm, selectedDepartmentId, nearbyAttempt);
  const [locationError, setLocationError] = useState("");
  const [mapStatus, setMapStatus] = useState("loading");
  const [mapRenderKey, setMapRenderKey] = useState(0);
  const [viewState, setViewState] = useState({ longitude: 106.6297, latitude: 10.8231, zoom: 12 });
  const mapRef = useRef(null);
  const cardRefs = useRef({});
  const departmentFilterRef = useRef(null);
  const searchBoxRef = useRef(null);
  const sidebarTitleRef = useRef(null);
  const detailCloseButtonRef = sidebarTitleRef;
  const detailBodyRef = useRef(null);
  const savedDetailScrollRef = useRef(0);
  const requestedFacilityOpenedRef = useRef(false);
  const requestedDoctorOpenedRef = useRef(false);
  const lastFittedBoundsRef = useRef("");
  const clinicalRestoreRequestRef = useRef({ sessionId: "", promise: null });
  const clinicalDepartmentAutoSelectedRef = useRef(false);

  useEffect(() => {
    const timerId = window.setTimeout(() => setDebouncedSearch(searchText), 400);
    return () => window.clearTimeout(timerId);
  }, [searchText]);

  useEffect(() => {
    let active = true;

    medicalDepartmentsApi.listAll()
      .then((response) => {
        if (!active) return;
        const data = getArrayData(response);
        setDepartments(data.map((department) => ({
          id: String(department?.id ?? department?.departmentId ?? "").trim(),
          name: department?.departmentName ?? department?.name ?? "Chuyên khoa chưa đặt tên",
        })).filter((department) => department.id));
      })
      .catch(() => {
        if (active) setDepartments([]);
      })
      .finally(() => {
        if (active) setDepartmentsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!departmentPickerOpen) return undefined;

    function handlePointerDown(event) {
      if (!departmentFilterRef.current?.contains(event.target)) {
        setDepartmentPickerOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") setDepartmentPickerOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [departmentPickerOpen]);

  useEffect(() => {
    if (!suggestionsOpen) return undefined;

    function handlePointerDown(event) {
      if (!searchBoxRef.current?.contains(event.target)) {
        setSuggestionsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") setSuggestionsOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [suggestionsOpen]);

  useEffect(() => {
    if (!isClinicalFlow) return undefined;

    if (!auth?.accessToken || !mapQuery.sessionId) return undefined;

    const cachedContext = buildClinicalRecommendationContext(
      symptomAnalysisApi.getCachedClinicalAnalysis(mapQuery.sessionId),
    );
    let active = true;

    async function restoreClinicalContext() {
      if (!active) return;
      if (cachedContext) {
        setRecommendationContext(cachedContext);
        setClinicalStatus("ready");
        setClinicalNotice("");
        if (cachedContext.diagnoses.length > 0) return;
      } else {
        setRecommendationContext(null);
        setClinicalStatus("loading");
        setClinicalNotice("");
      }

      try {
        if (clinicalRestoreRequestRef.current.sessionId !== mapQuery.sessionId) {
          clinicalRestoreRequestRef.current = {
            sessionId: mapQuery.sessionId,
            promise: symptomAnalysisApi.get(mapQuery.sessionId),
          };
        }
        const response = await clinicalRestoreRequestRef.current.promise;
        const analysis = readAnalysisPayload(response);
        const restoredContext = buildClinicalRecommendationContext({
          ...analysis,
          sessionId: analysis?.sessionId ?? mapQuery.sessionId,
        });
        if (!restoredContext) {
          if (!active) return;
          setRecommendationContext(null);
          setClinicalStatus("empty");
          setClinicalNotice("Phiên này không có kết quả gợi ý chuyên khoa hoặc cơ sở y tế được lưu.");
          return;
        }
        if (!active) return;
        setRecommendationContext(restoredContext);
        setClinicalStatus("ready");
        setClinicalNotice("");
      } catch {
        if (!active) return;
        if (cachedContext) {
          setClinicalStatus("ready");
          setClinicalNotice("Chưa thể tải lại đầy đủ thông tin của phiên gợi ý này.");
          return;
        }
        setRecommendationContext(null);
        setClinicalStatus("error");
        setClinicalNotice("Chưa thể tải lại gợi ý của phiên này. Vui lòng thử lại từ lịch sử.");
      }
    }

    void restoreClinicalContext();

    return () => {
      active = false;
    };
  }, [
    auth?.accessToken,
    isClinicalFlow,
    mapQuery.sessionId,
  ]);

  useEffect(() => {
    const recommendedDepartment = recommendationContext?.recommendedDepartment;
    const departmentId = recommendedDepartment?.departmentId;
    if (!isClinicalFlow || !departmentId || recommendedDepartment.description) return undefined;

    let active = true;

    medicalDepartmentsApi.get(departmentId)
      .then((response) => {
        if (!active) return;
        const department = sanitizeDepartment(getObjectData(response));
        if (!department?.description) return;

        setRecommendationContext((current) => {
          if (
            !current?.recommendedDepartment
            || current.recommendedDepartment.departmentId !== departmentId
            || current.recommendedDepartment.description
          ) return current;

          return {
            ...current,
            recommendedDepartment: {
              ...current.recommendedDepartment,
              departmentName: current.recommendedDepartment.departmentName
                || department.departmentName,
              description: department.description,
            },
          };
        });
      })
      .catch(() => {
        // Keep the recommendation usable when the department catalog is unavailable.
      });

    return () => {
      active = false;
    };
  }, [isClinicalFlow, recommendationContext]);

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
      facilityDepartmentsApi.active(),
    ])
      .then(([facilityResult, relationResult]) => {
        if (!active) return;

        if (facilityResult.status !== "fulfilled") throw facilityResult.reason;

        const relationsByFacility = new globalThis.Map();
        if (relationResult.status === "fulfilled") {
          getArrayData(relationResult.value).forEach((relation) => {
            const facilityId = String(
              relation?.facilityId
              ?? relation?.medicalFacilityId
              ?? relation?.facility?.id
              ?? "",
            ).trim();
            const departmentId = String(
              relation?.departmentId
              ?? relation?.medicalDepartmentId
              ?? relation?.department?.id
              ?? "",
            ).trim();
            if (!facilityId || !departmentId) return;
            const current = relationsByFacility.get(facilityId) ?? [];
            current.push({
              id: departmentId,
              name: relation?.departmentName
                ?? relation?.medicalDepartmentName
                ?? relation?.department?.name
                ?? "Chuyên khoa chưa cập nhật tên",
            });
            relationsByFacility.set(facilityId, current);
          });
        }

        const data = getArrayData(facilityResult.value).map((facility) => {
          const facilityId = String(facility?.facilityId ?? facility?.id ?? "");
          const relations = relationsByFacility.get(facilityId) ?? [];
          return normalizeFacility(
            facility,
            relations.map((relation) => relation.name),
            relations.map((relation) => relation.id),
          );
        });
        setFacilities(data);
        setReviewsLoading(Boolean(data[0]));
        setSelectedFacility(null);
        setApiNotice(data.length
          ? relationResult.status === "rejected"
            ? "Danh sách khoa liên kết đang tạm thời chưa đầy đủ."
            : ""
          : "Chưa có cơ sở y tế đang hoạt động.");
      })
      .catch(() => {
        if (active) {
          setFacilities([]);
          setSelectedFacility(null);
          setApiNotice("Chưa thể tải danh sách cơ sở y tế. Vui lòng kiểm tra kết nối và thử lại.");
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
        if (active) {
          setReviews(response.data?.items ?? []);
          setReviewsTotalCount(response.data?.totalCount ?? response.data?.items?.length ?? 0);
        }
      })
      .catch((error) => {
        if (active) {
          setReviewMessage(getFeedbackReviewApiMessage(
            error,
            FEEDBACK_REVIEW_MESSAGES.facility.invalidId,
          ));
        }
      })
      .finally(() => {
        if (active) setReviewsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedFacility?.facilityId, selectedFacility?.isMockFacility]);

  const resolvedRecommendationContext = useMemo(() => {
    if (
      !recommendationContext
      || recommendationContext.recommendedDepartment?.departmentName
      || !requestedDepartmentId
    ) return recommendationContext;

    const requestedFacility = facilities.find((facility) => (
      String(facility.facilityId) === String(requestedFacilityId)
    ));
    const matchingDepartment = requestedFacility?.consultationDepartments?.find((department) => (
      String(department.id) === String(requestedDepartmentId)
    ));
    if (!matchingDepartment?.name) return recommendationContext;

    return {
      ...recommendationContext,
      recommendedDepartment: {
        ...recommendationContext.recommendedDepartment,
        departmentName: matchingDepartment.name,
      },
    };
  }, [
    facilities,
    recommendationContext,
    requestedDepartmentId,
    requestedFacilityId,
  ]);

  // Once the recommended department is known, filter pins by it like the
  // plain map's department picker - not just the AI's short facility list -
  // so every active facility offering that department shows up, not one.
  useEffect(() => {
    const departmentId = resolvedRecommendationContext?.recommendedDepartment?.departmentId;
    if (!isClinicalFlow || !departmentId || clinicalDepartmentAutoSelectedRef.current) return;
    clinicalDepartmentAutoSelectedRef.current = true;
    setSelectedDepartmentId(departmentId);
  }, [isClinicalFlow, resolvedRecommendationContext?.recommendedDepartment?.departmentId]);

  const recommendedFacilityOrder = useMemo(() => {
    const entries = resolvedRecommendationContext?.recommendedFacilities ?? [];
    return new globalThis.Map(entries.map((facility, index) => [
      String(facility.facilityId),
      index,
    ]));
  }, [resolvedRecommendationContext?.recommendedFacilities]);
  const clinicalRecommendationFacilities = useMemo(() => {
    if (!isClinicalFlow || clinicalStatus !== "ready") return [];

    return (resolvedRecommendationContext?.recommendedFacilities ?? [])
      .filter((facility) => facility.isActive !== false)
      .map((recommendedFacility) => {
        const activeFacility = facilities.find((facility) => (
          String(facility.facilityId) === String(recommendedFacility.facilityId)
        ));
        const departmentNames = recommendedFacility.departments
          .map((department) => department.departmentName)
          .filter(Boolean);
        const departmentIds = recommendedFacility.departments
          .map((department) => department.departmentId)
          .filter(Boolean);
        if (activeFacility) {
          return normalizeFacility({
            ...activeFacility,
            address: recommendedFacility.address || activeFacility.address,
            departments: recommendedFacility.departments.length
              ? recommendedFacility.departments
              : activeFacility.consultationDepartments,
            facilityName: recommendedFacility.facilityName || activeFacility.facilityName,
            facilityType: recommendedFacility.facilityType || activeFacility.facilityType,
            imageUrl: recommendedFacility.imageUrl || activeFacility.imageUrl,
            latitude: recommendedFacility.latitude ?? activeFacility.latitude,
            longitude: recommendedFacility.longitude ?? activeFacility.longitude,
            openingHours: recommendedFacility.openingHours || activeFacility.openingHours,
            phone: recommendedFacility.phone || activeFacility.phone,
            website: recommendedFacility.website || activeFacility.website,
          }, activeFacility.departments, activeFacility.departmentIds);
        }

        return normalizeFacility(recommendedFacility, departmentNames, departmentIds);
      });
  }, [
    clinicalStatus,
    facilities,
    isClinicalFlow,
    resolvedRecommendationContext?.recommendedFacilities,
  ]);
  // AI-recommended facilities can include ones the general active-facilities
  // list hasn't caught (e.g. a stale fetch); keep them in the pool so
  // department-based filtering never silently drops a recommended facility.
  const clinicalFacilityPool = useMemo(() => {
    if (nearbyEnabled) return nearby.items.map((item) => normalizeFacility(item));
    if (!isClinicalFlow) return facilities;
    const activeIds = new Set(facilities.map((facility) => String(facility.facilityId)));
    const extras = clinicalRecommendationFacilities.filter((facility) => (
      !activeIds.has(String(facility.facilityId))
    ));
    return extras.length ? [...facilities, ...extras] : facilities;
  }, [clinicalRecommendationFacilities, facilities, isClinicalFlow, nearbyEnabled, nearby.items]);
  const effectiveDepartmentId = selectedDepartmentId;
  const selectedDepartment = selectedDepartmentId === "all"
    ? { id: "all", name: "Tất cả các khoa" }
    : departments.find((department) => department.id === selectedDepartmentId) || null;

  const filteredFacilities = useMemo(() => {
    if (isClinicalFlow && clinicalStatus !== "ready") return [];
    // With no working map there is no pin to click either, so fall back to
    // showing every facility in the list regardless of department filter.
    if (!isClinicalFlow && !effectiveDepartmentId && mapStatus !== "error") return [];

    const normalized = normalizeSearchText(debouncedSearch);
    const normalizedDepartmentId = String(effectiveDepartmentId).trim();
    const normalizedDepartmentSearch = normalizeSearchText(effectiveDepartmentId);
    const matches = clinicalFacilityPool.filter((facility) => {
      const searchable = [
        facility.facilityName,
        facility.address,
        facility.facilityType,
        facility.facilityTypeLabel,
        facility.openingHours,
        ...facility.departments,
      ].map(normalizeSearchText);
      const matchSearch = !normalized || searchable.some((value) => value.includes(normalized));
      const matchDepartment = nearbyEnabled || !normalizedDepartmentId
        || normalizedDepartmentId === "all"
        || facility.departmentIds?.some((departmentId) => String(departmentId) === normalizedDepartmentId)
        || facility.departments.map(normalizeSearchText).some((value) => value.includes(normalizedDepartmentSearch));
      return matchSearch && matchDepartment;
    });
    // AI-recommended facilities (if any matched the department too) surface
    // first; every other facility offering the department follows them.
    if (nearbyEnabled) return matches.sort((a, b) => a.distanceKm - b.distanceKm);
    return isClinicalFlow && recommendedFacilityOrder.size > 0
      ? matches.sort((left, right) => {
        const leftRank = recommendedFacilityOrder.get(String(left.facilityId));
        const rightRank = recommendedFacilityOrder.get(String(right.facilityId));
        if (leftRank === undefined && rightRank === undefined) return 0;
        if (leftRank === undefined) return 1;
        if (rightRank === undefined) return -1;
        return leftRank - rightRank;
      })
      : matches;
  }, [
    debouncedSearch,
    clinicalFacilityPool,
    clinicalStatus,
    effectiveDepartmentId,
    isClinicalFlow,
    mapStatus,
    recommendedFacilityOrder,
    nearbyEnabled,
  ]);

  // Undebounced (unlike filteredFacilities' pin filter above) since this is
  // a pure client-side filter over the already-loaded facility list - cheap
  // enough to recompute on every keystroke for instant suggestions.
  const searchSuggestions = useMemo(() => {
    const normalized = normalizeSearchText(searchText);
    if (!normalized) return [];
    return clinicalFacilityPool
      .filter((facility) => (
        normalizeSearchText(facility.facilityName).includes(normalized)
        || normalizeSearchText(facility.address).includes(normalized)
      ))
      .slice(0, 6);
  }, [searchText, clinicalFacilityPool]);

  const typedFacilities = useMemo(
    () => filteredFacilities.filter((facility) => selectedType === "all" || facility.facilityTypeKey === selectedType),
    [filteredFacilities, selectedType],
  );

  const visibleFacilities = useMemo(
    () => typedFacilities.map((facility) => {
      const distanceKm = nearbyEnabled && Number.isFinite(facility.distanceKm) ? facility.distanceKm : getDistanceKm(userLocation, facility);
      return {
        ...facility,
        distanceLabel: distanceKm === null ? "" : formatDistance(distanceKm),
      };
    }),
    [typedFacilities, userLocation, nearbyEnabled],
  );

  const mappableFacilities = useMemo(
    () => visibleFacilities.filter((facility) => facility.hasValidCoordinates),
    [visibleFacilities],
  );
  const mapBoundsKey = useMemo(
    () => mappableFacilities.map((facility) => `${facility.facilityId}:${facility.longitude}:${facility.latitude}`).join("|"),
    [mappableFacilities],
  );
  const hasActiveFacilitiesWithoutMapData = facilities.length > 0 && !facilities.some((facility) => facility.hasValidCoordinates);
  const unavailableRecommendationCount = isClinicalFlow && recommendedFacilityOrder.size > 0
    ? (resolvedRecommendationContext?.recommendedFacilities ?? [])
      .filter((facility) => facility.isActive === false)
      .length
    : 0;
  const effectiveClinicalNotice = clinicalNotice || (
    isClinicalFlow && !loadingFacilities && unavailableRecommendationCount > 0
      ? "Cơ sở được gợi ý hiện không còn khả dụng."
      : ""
  );

  const prefersReducedMotion = useCallback(() => (
    document.documentElement.dataset.motion === "reduce"
    || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
  ), []);

  const handleSearchChange = (event) => {
    setSearchText(event.target.value);
    setSuggestionsOpen(Boolean(event.target.value.trim()));
    setSelectedFacility(null);
    setSidebarView("hospital-list");
    setDetailPanelOpen(false);
    setDetailFacility(null);
    setSelectedDoctor(null);
    setReviews([]);
    setReviewsTotalCount(0);
    setReviewsLoading(false);
    setSubmittedReview(null);
    setEditingReview(false);
  };

  const syncMapUrl = useCallback((nextState = {}, mode = "push") => {
    const params = new URLSearchParams(window.location.search);

    if (nextState.facilityId) params.set("facilityId", nextState.facilityId);
    else params.delete("facilityId");

    if (nextState.tab && nextState.facilityId) params.set("tab", nextState.tab);
    else params.delete("tab");

    if (nextState.doctorId && nextState.facilityId) params.set("doctorId", nextState.doctorId);
    else params.delete("doctorId");

    const search = params.toString();
    const nextUrl = `${window.location.pathname}${search ? `?${search}` : ""}`;
    if (nextUrl === `${window.location.pathname}${window.location.search}`) return;
    window.history[mode === "replace" ? "replaceState" : "pushState"]({}, "", nextUrl);
  }, []);

  const handleCardClick = useCallback((facility) => {
    setReviewMessage("");
    setSubmittedReview(null);
    setEditingReview(false);
    if (facility?.isMockFacility) {
      setReviews([]);
      setReviewsTotalCount(0);
      setReviewsLoading(false);
    } else {
      setReviewsLoading(true);
    }
    setSelectedFacility(facility);
    if (facility.hasValidCoordinates && mapStatus === "ready") {
      mapRef.current?.flyTo?.({
        center: [facility.longitude, facility.latitude],
        zoom: 16,
        offset: window.innerWidth > 760 ? [SIDEBAR_MAP_OFFSET, 0] : [0, -120],
        duration: prefersReducedMotion() ? 0 : 900,
      });
    }
    cardRefs.current[facility.facilityId]?.scrollIntoView?.({
      block: "nearest",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, [
    mapStatus,
    prefersReducedMotion,
    setReviewMessage,
    setReviews,
    setReviewsLoading,
    setReviewsTotalCount,
    setSelectedFacility,
    setSubmittedReview,
  ]);

  useEffect(() => {
    if (mapStatus !== "ready" || selectedFacility || mappableFacilities.length === 0) return;
    if (lastFittedBoundsRef.current === mapBoundsKey) return;
    lastFittedBoundsRef.current = mapBoundsKey;

    const duration = prefersReducedMotion() ? 0 : 900;

    // Keep markers from landing underneath the floating search/department bar,
    // and under the recommended-department summary cards in the clinical flow.
    const topClearance = isClinicalFlow ? 220 : 110;

    if (mappableFacilities.length === 1) {
      const [facility] = mappableFacilities;
      mapRef.current?.flyTo?.({
        center: [facility.longitude, facility.latitude],
        zoom: 14,
        duration,
        offset: [0, topClearance / 2],
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
        padding: { top: topClearance, right: 72, bottom: 72, left: 72 },
      },
    );
  }, [isClinicalFlow, mapBoundsKey, mapStatus, mappableFacilities, prefersReducedMotion, selectedFacility]);

  const openFacilityDetail = useCallback(async (facility, options = {}) => {
    if (!facility?.facilityId) return;
    handleCardClick(facility);
    setSidebarView("hospital-detail");
    setSidebarUnlocked(true);
    setSelectedDoctor(null);
    setDetailPanelOpen(true);
    setDetailFacility(facility);
    setDetailLoading(true);
    setDetailDoctorsLoading(true);
    setDetailDoctors([]);
    setDetailError("");
    if (options.tab) setActiveHospitalTab(getValidTab(options.tab));
    if (options.syncUrl !== false) {
      syncMapUrl({
        facilityId: facility.facilityId,
        tab: getValidTab(options.tab || activeHospitalTab),
      });
    }

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
  }, [activeHospitalTab, handleCardClick, syncMapUrl]);

  useEffect(() => {
    const handlePopState = () => {
      const nextQuery = readMapQuery();
      const params = new URLSearchParams(window.location.search);
      const navigationFacilities = nextQuery.source === "clinical"
        ? clinicalRecommendationFacilities
        : facilities;
      const matchedFacility = navigationFacilities.find((facility) => (
        String(facility.facilityId) === String(nextQuery.facilityId)
      ));
      const shouldShowClinicalDetail = nextQuery.source === "clinical"
        && nextQuery.facilityId
        && params.has("tab");

      setMapQuery(nextQuery);
      setSelectedDoctor(null);

      if (!nextQuery.facilityId || (nextQuery.source === "clinical" && !shouldShowClinicalDetail)) {
        setSidebarView("hospital-list");
        setDetailPanelOpen(false);
        setDetailFacility(null);
        setDetailError("");
        setDetailDoctors([]);
        setSelectedFacility(nextQuery.source === "clinical" ? matchedFacility ?? null : null);
        if (matchedFacility) handleCardClick(matchedFacility);
        return;
      }

      if (matchedFacility) {
        openFacilityDetail(matchedFacility, {
          syncUrl: false,
          tab: nextQuery.tab,
        });
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [clinicalRecommendationFacilities, facilities, handleCardClick, openFacilityDetail]);

  useEffect(() => {
    if (
      isClinicalFlow
      || loadingFacilities
      || !requestedFacilityId
      || requestedFacilityOpenedRef.current
    ) return;

    const matchedFacility = facilities.find((facility) => String(facility.facilityId) === String(requestedFacilityId));
    requestedFacilityOpenedRef.current = true;

    if (!matchedFacility) return undefined;

    const timeoutId = window.setTimeout(() => {
      openFacilityDetail(matchedFacility, {
        syncUrl: false,
        tab: mapQuery.tab,
      });
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [
    facilities,
    isClinicalFlow,
    loadingFacilities,
    mapQuery.tab,
    openFacilityDetail,
    requestedFacilityId,
  ]);

  useEffect(() => {
    if (!detailPanelOpen) return undefined;
    const focusId = window.setTimeout(() => sidebarTitleRef.current?.focus(), 0);
    return () => window.clearTimeout(focusId);
  }, [detailPanelOpen, detailFacility?.facilityId]);

  useEffect(() => {
    if (!detailPanelOpen || requestedDoctorOpenedRef.current || !mapQuery.doctorId) return;
    const matchedDoctor = detailDoctors.find((doctor) => String(doctor.id) === String(mapQuery.doctorId));
    if (!matchedDoctor) return;
    requestedDoctorOpenedRef.current = true;
    const timeoutId = window.setTimeout(() => {
      setActiveHospitalTab("doctors");
      setSelectedDoctor(matchedDoctor);
      setSidebarView("doctor-detail");
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [detailDoctors, detailPanelOpen, mapQuery.doctorId]);

  const closeFacilityDetail = () => {
    const facilityId = detailFacility?.facilityId;
    setSidebarView("hospital-list");
    setSidebarUnlocked(false);
    setDetailPanelOpen(false);
    setDetailFacility(null);
    setDetailError("");
    setDetailDoctors([]);
    setSelectedDoctor(null);
    setSelectedFacility(isClinicalFlow ? detailFacility : null);
    setSubmittedReview(null);
    setEditingReview(false);
    syncMapUrl(isClinicalFlow && detailFacility?.facilityId
      ? { facilityId: detailFacility.facilityId }
      : {});
    window.setTimeout(() => {
      cardRefs.current[facilityId]?.querySelector?.(".facility-select-button")?.focus();
    }, 0);
  };

  const backToHospitalList = () => closeFacilityDetail();

  const changeHospitalTab = (tabId) => {
    setActiveHospitalTab(tabId);
    if (detailFacility?.facilityId) {
      syncMapUrl({ facilityId: detailFacility.facilityId, tab: tabId }, "replace");
    }
  };

  const handleHospitalTabKeyDown = (event, currentTabId) => {
    const currentIndex = DETAIL_TABS.findIndex(([tabId]) => tabId === currentTabId);
    if (currentIndex < 0) return;

    let nextIndex;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % DETAIL_TABS.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + DETAIL_TABS.length) % DETAIL_TABS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = DETAIL_TABS.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextTabId = DETAIL_TABS[nextIndex][0];
    changeHospitalTab(nextTabId);
    event.currentTarget
      .closest('[role="tablist"]')
      ?.querySelector(`#facility-tab-${nextTabId}`)
      ?.focus();
  };

  const backToHospitalDetail = () => {
    setSidebarView("hospital-detail");
    setSelectedDoctor(null);
    if (detailFacility?.facilityId) {
      syncMapUrl({ facilityId: detailFacility.facilityId, tab: activeHospitalTab }, "replace");
    }
    window.setTimeout(() => {
      if (detailBodyRef.current) detailBodyRef.current.scrollTop = savedDetailScrollRef.current;
      sidebarTitleRef.current?.focus();
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
    if (locatingRef.current) return;
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Trình duyệt không hỗ trợ định vị.");
      return;
    }

    locatingRef.current = true;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        locatingRef.current = false;
        setLocating(false);
        setUserLocation({ lat: latitude, lng: longitude });
        setNearbyEnabled(true);
        setSidebarUnlocked(true);
        setSidebarView("hospital-list");
        setSelectedFacility(null);
        mapRef.current?.flyTo?.({
          center: [longitude, latitude],
          zoom: 15,
          duration: prefersReducedMotion() ? 0 : 1500,
        });
      },
      (error) => {
        locatingRef.current = false;
        setLocating(false);
        setLocationError(error.code === 1
          ? "Bạn chưa cho phép định vị. Hãy bật quyền vị trí để tìm cơ sở gần bạn."
          : "Không thể lấy vị trí. Hãy kiểm tra GPS và thử lại.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
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

  const refreshFacilityRating = async (facilityId) => {
    let summary;
    try {
      const response = await medicalFacilitiesApi.get(facilityId);
      const data = getObjectData(response);
      summary = { averageRating: data.averageRating, reviewCount: data.reviewCount };
    } catch {
      summary = { averageRating: null, reviewCount: null };
      showToast({ type: "warning", title: "Chưa cập nhật được điểm đánh giá", message: "Đánh giá đã được lưu. Vui lòng mở lại thông tin cơ sở để tải điểm mới." });
    }
    const update = (item) => String(item?.facilityId) === String(facilityId) ? { ...item, ...summary } : item;
    setDetailFacility(update);
    setSelectedFacility(update);
    setFacilities((current) => current.map(update));
    setNearbyAttempt((current) => current + 1);
  };

  const submitReview = async (event) => {
    event.preventDefault();
    if (!selectedFacility?.facilityId) return;
    if (!auth) {
      navigate(`/login?redirect=${encodeURIComponent("/map")}`);
      return;
    }

    const isUpdating = Boolean(editingReview && currentUserReview?.id);
    setSavingReview(true);
    setReviewMessage("");
    try {
      const submittedRating = Number(reviewForm.rating);
      const submittedComment = reviewForm.comment.trim();
      const submittedImageUrls = toReviewImageUrlMap(reviewForm.imageUrls);
      const reviewValues = {
        rating: submittedRating,
        comment: submittedComment || null,
        imageUrls: Object.keys(submittedImageUrls).length ? submittedImageUrls : null,
      };
      const response = isUpdating
        ? await feedbackReviewsApi.update(currentUserReview.id, reviewValues)
        : await feedbackReviewsApi.create({ facilityId: selectedFacility.facilityId, ...reviewValues });
      const savedReview = {
        ...(currentUserReview || {}),
        ...(response.data || {}),
        facilityId: selectedFacility.facilityId,
        rating: submittedRating,
        comment: submittedComment,
        imageUrl: reviewForm.imageUrls[0] || "",
        imageUrls: reviewForm.imageUrls,
        reviewerName: auth.displayName || auth.fullName || auth.name || auth.username || "Bạn",
        isCurrentUser: true,
      };
      setSubmittedReview(savedReview);
      setEditingReview(false);
      setHoveredReviewRating(0);
      setReviewForm({ rating: "5", comment: "", imageUrls: [] });
      setReviewMessage(getFeedbackReviewApiMessage(
        response,
        isUpdating
          ? FEEDBACK_REVIEW_MESSAGES.update.success
          : FEEDBACK_REVIEW_MESSAGES.create.success,
      ));
      try {
        const refreshed = await feedbackReviewsApi.byFacility(selectedFacility.facilityId);
        const refreshedItems = refreshed.data?.items ?? [];
        const savedIndex = refreshedItems.findIndex((review) => String(review.id) === String(savedReview.id));
        const nextReviews = savedIndex >= 0
          ? refreshedItems.map((review, index) => index === savedIndex ? { ...savedReview, ...review } : review)
          : [savedReview, ...refreshedItems];
        setReviews(nextReviews);
        setReviewsTotalCount(Math.max(refreshed.data?.totalCount ?? 0, nextReviews.length));
      } catch {
        setReviews((current) => [savedReview, ...current.filter((review) => String(review.id) !== String(savedReview.id))]);
        setReviewsTotalCount((current) => Math.max(current, 1));
      }
      await refreshFacilityRating(selectedFacility.facilityId);
    } catch (error) {
      const message = getFeedbackReviewApiMessage(
        error,
        error?.status === 401
          ? FEEDBACK_REVIEW_MESSAGES.auth.fallback
          : isUpdating
            ? FEEDBACK_REVIEW_MESSAGES.update.failure
            : FEEDBACK_REVIEW_MESSAGES.create.failure,
      );
      setReviewMessage(message);
      if (normalizeSearchText(message).includes("da danh gia")) {
        setSubmittedReview({ isCurrentUser: true, isKnownDuplicate: true });
      }
    } finally {
      setSavingReview(false);
    }
  };

  const startEditingReview = () => {
    if (!currentUserReview?.id) return;
    setReviewForm({
      rating: String(currentUserReview.rating || 5),
      comment: currentUserReview.comment || "",
      imageUrls: getReviewImageUrls(currentUserReview),
    });
    setReviewMessage("");
    setEditingReview(true);
  };

  const cancelEditingReview = () => {
    setHoveredReviewRating(0);
    setReviewForm({ rating: "5", comment: "", imageUrls: [] });
    setReviewMessage("");
    setEditingReview(false);
  };

  const deleteCurrentUserReview = async () => {
    const reviewId = currentUserReview?.id;
    if (!reviewId || deletingReviewId) return;

    const confirmed = await confirmAction({
      title: "Xóa đánh giá?",
      message: "Đánh giá và ảnh minh họa sẽ không còn hiển thị. Hành động này không thể hoàn tác.",
      confirmLabel: "Xóa đánh giá",
      tone: "danger",
    });
    if (!confirmed) return;

    const normalizedReviewId = String(reviewId);
    setDeletingReviewId(normalizedReviewId);
    setReviewMessage("");
    try {
      const response = await feedbackReviewsApi.remove(reviewId);
      const successMessage = getFeedbackReviewApiMessage(
        response,
        FEEDBACK_REVIEW_MESSAGES.delete.success,
      );

      setReviews((current) => current.filter(
        (review) => String(review.id) !== normalizedReviewId,
      ));
      setReviewsTotalCount((current) => Math.max(0, current - 1));
      setSubmittedReview(null);
      setEditingReview(false);
      setHoveredReviewRating(0);
      setReviewForm({ rating: "5", comment: "", imageUrls: [] });
      setReviewMessage(successMessage);
      showToast({ type: "success", title: "Đã xóa đánh giá" });
      await refreshFacilityRating(selectedFacility.facilityId);
    } catch (error) {
      const message = getFeedbackReviewApiMessage(
        error,
        error?.status === 401
          ? FEEDBACK_REVIEW_MESSAGES.auth.fallback
          : FEEDBACK_REVIEW_MESSAGES.delete.failure,
      );
      setReviewMessage(message);
      showToast({
        type: "error",
        title: "Không thể xóa đánh giá",
        message,
      });
    } finally {
      setDeletingReviewId("");
    }
  };

  const uploadReviewImage = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;

    const remainingSlots = 5 - reviewForm.imageUrls.length;
    if (remainingSlots <= 0) {
      setReviewMessage("Mỗi đánh giá được tải tối đa 5 ảnh.");
      return;
    }
    if (files.length > remainingSlots) {
      setReviewMessage(`Bạn chỉ có thể tải thêm ${remainingSlots} ảnh.`);
      return;
    }

    setUploadingReviewImage(true);
    setReviewMessage("");
    try {
      const uploads = await Promise.all(files.map((file) => uploadImageToCloudinary(file)));
      const uploadedUrls = uploads.map(({ secureUrl }) => secureUrl);
      setReviewForm((current) => ({ ...current, imageUrls: [...current.imageUrls, ...uploadedUrls] }));
      setReviewMessage(`Đã tải ${uploadedUrls.length} ảnh. Ảnh sẽ được lưu cùng đánh giá.`);
    } catch (error) {
      setReviewMessage(error.message || "Không thể tải ảnh lên. Vui lòng thử lại.");
    } finally {
      setUploadingReviewImage(false);
    }
  };

  const shareFacility = async (facility) => {
    const url = new URL(window.location.href);
    url.searchParams.set("facilityId", facility.facilityId);
    url.searchParams.set("tab", activeHospitalTab);
    const shareData = {
      title: facility.facilityName,
      text: `${facility.facilityName} - ${facility.address}`,
      url: url.toString(),
    };

    setShareMessage("");
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareMessage("Đã mở tùy chọn chia sẻ.");
        return;
      }
      await navigator.clipboard.writeText(shareData.url);
      setShareMessage("Đã sao chép liên kết cơ sở y tế.");
    } catch (error) {
      if (error?.name === "AbortError") return;
      setShareMessage("Không thể chia sẻ lúc này. Vui lòng thử lại.");
    }
  };

  const { average: detailAverageRating, count: detailReviewCount } = getFacilityRating(detailFacility);
  const currentUserReview = reviews.find((review) => isReviewByCurrentUser(review, auth)) || submittedReview;
  const selectedFacilityDistance = detailFacility ? getDistanceKm(userLocation, detailFacility) : null;
  const selectedFacilityDistanceLabel = selectedFacilityDistance === null ? "" : formatDistance(selectedFacilityDistance);
  const activeTypeOptions = [
    ["all", "Tất cả"],
    ...Object.entries(TYPE_LABELS).filter(([type]) => facilities.some((facility) => facility.facilityTypeKey === type)),
  ];
  const reviewDistribution = [5, 4, 3, 2, 1].map((rating) => {
    const count = reviews.filter((review) => Number(review.rating) === rating).length;
    return {
      rating,
      count,
      percent: reviews.length ? Math.round((count / reviews.length) * 100) : 0,
    };
  });
  const showLegacyMapDetail = Boolean(0);
  const showSidebar =
    // Once a pin has been opened at least once, keep the sidebar available so
    // switching departments can return to its list instead of hiding it.
    sidebarUnlocked
    // If the map itself failed to load there is no pin left to click, so the
    // list is the only way left to find and select a facility.
    || mapStatus === "error";

  return (
    <main className={`clinic-page map-clinical-refresh${isClinicalFlow ? " is-clinical-map-flow" : ""}`}>
      <style>{styles}</style>
      <h1 className="sr-only">Bản đồ cơ sở y tế</h1>
      <a className="map-skip-link" href="#facility-list">Bỏ qua bản đồ, đến danh sách cơ sở</a>
      {showSidebar && (
      <aside className={`clinic-sidebar sidebar-view-${sidebarView}`}>
        {sidebarView === "hospital-list" && (
        <div className="map-sidebar-screen sidebar-screen-active">
        <header className="map-sidebar-head">
          <p>Cơ sở y tế</p>
          <h2>Tìm nơi khám phù hợp</h2>
          <span>
            {selectedDepartment
              ? `Đang lọc theo khoa: ${selectedDepartment.name}.`
              : "Chọn một cơ sở để xem địa chỉ, chuyên khoa và đánh giá."}
          </span>
        </header>

        <div className="facility-type-filter" role="group" aria-label="Lọc loại cơ sở y tế">
          {activeTypeOptions.map(([type, label]) => (
            <button
              key={type}
              type="button"
              className={selectedType === type ? "active" : ""}
              aria-pressed={selectedType === type}
              onClick={() => setSelectedType(type)}
            >
              {label}
            </button>
          ))}
        </div>

        {apiNotice && <div className="sidebar-note">{apiNotice}</div>}
        {isClinicalFlow && !loadingFacilities && unavailableRecommendationCount > 0 && (
          <div className="sidebar-note" role="status">
            Cơ sở được gợi ý hiện không còn trong danh sách cơ sở đang hoạt động.
          </div>
        )}
        {hasActiveFacilitiesWithoutMapData && (
          <div className="sidebar-note">
            Cơ sở y tế hiện chưa có tọa độ hợp lệ. Quản trị viên cần cập nhật vĩ độ và kinh độ để bản đồ hiển thị điểm khám.
          </div>
        )}

        <FacilityList
          cardRefs={cardRefs}
          facilities={visibleFacilities}
          loading={nearbyEnabled ? nearby.loading : isClinicalFlow ? clinicalStatus === "loading" : loadingFacilities}
          selectedFacilityId={selectedFacility?.facilityId}
          onViewDetail={openFacilityDetail}
        />

        </div>
        )}

        {sidebarView === "hospital-list" && (
          <div className="sidebar-note sidebar-disclaimer">
            <Info size={16} aria-hidden="true" />
            <span>Thông tin chỉ mang tính tham khảo. Vui lòng gọi trước khi đến.</span>
          </div>
        )}
        {sidebarView === "hospital-detail" && detailFacility && (
          <section
            className="map-sidebar-screen facility-detail-sidebar sidebar-screen-active"
            aria-labelledby="facility-detail-title"
            onKeyDown={(event) => {
              if (event.key === "Escape") backToHospitalList();
            }}
          >
            <div className="facility-detail-topbar">
              <button type="button" onClick={backToHospitalList}><ArrowLeft size={17} /> Quay lại danh sách</button>
              <button type="button" aria-label="Đóng chi tiết" onClick={closeFacilityDetail}><X size={18} /></button>
            </div>

            <div className="facility-detail-body" ref={detailBodyRef}>
              <div className="facility-detail-media">
                {detailFacility.imageUrl ? (
                  <img
                    src={detailFacility.imageUrl}
                    alt={`Ảnh ${detailFacility.facilityName}`}
                    width="640"
                    height="360"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span aria-hidden="true"><Building2 size={46} /></span>
                )}
              </div>

              <section className="facility-detail-summary">
                <span className={`type-badge ${detailFacility.facilityTypeKey}`}>{detailFacility.facilityTypeLabel}</span>
                <h2 id="facility-detail-title" ref={sidebarTitleRef} tabIndex="-1">{detailFacility.facilityName}</h2>
                <p><MapPin size={16} /> {detailFacility.address}</p>
                <p><Clock3 size={16} /> {detailFacility.openingHours || "Chưa có giờ hoạt động"}</p>
                <p><Star size={16} fill={detailAverageRating ? "currentColor" : "none"} /> {formatFacilityRating(detailFacility)}</p>
                {selectedFacilityDistanceLabel && <p><Route size={16} /> Cách bạn khoảng {selectedFacilityDistanceLabel}</p>}
              </section>

              <div className="facility-quick-actions" aria-label={`Thao tác nhanh với ${detailFacility.facilityName}`}>
                <button type="button" className="primary" disabled={!detailFacility.hasValidCoordinates} onClick={() => openDirections(detailFacility)}><Route size={18} /><span>Chỉ đường</span></button>
                <button type="button" disabled={!detailFacility.phone} title={detailFacility.phone ? undefined : "Cơ sở chưa có số điện thoại"} onClick={() => callFacility(detailFacility)}><Phone size={18} /><span>Gọi</span></button>
                <button type="button" onClick={() => shareFacility(detailFacility)}><Share2 size={18} /><span>Chia sẻ</span></button>
                {detailFacility.website && <a href={detailFacility.website} target="_blank" rel="noreferrer"><Globe2 size={18} /><span>Website</span></a>}
              </div>
              {shareMessage && <p className="facility-action-message" role="status">{shareMessage}</p>}

              <div className="facility-detail-tabs" role="tablist" aria-label="Thông tin cơ sở y tế">
                {DETAIL_TABS.map(([tabId, label]) => (
                  <button
                    key={tabId}
                    id={`facility-tab-${tabId}`}
                    type="button"
                    role="tab"
                    aria-selected={activeHospitalTab === tabId}
                    aria-controls={`facility-panel-${tabId}`}
                    tabIndex={activeHospitalTab === tabId ? 0 : -1}
                    className={activeHospitalTab === tabId ? "active" : ""}
                    onClick={() => changeHospitalTab(tabId)}
                    onKeyDown={(event) => handleHospitalTabKeyDown(event, tabId)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {detailLoading && <p className="facility-detail-status">Đang tải thông tin chi tiết...</p>}
              {detailError && <p className="facility-detail-error">{detailError}</p>}

              {activeHospitalTab === "overview" && (
                <div
                  id="facility-panel-overview"
                  className="facility-detail-tab-panel"
                  role="tabpanel"
                  aria-labelledby="facility-tab-overview"
                >
                  <section className="facility-info-group">
                    <h3>Thông tin tổng quan</h3>
                    <p>{detailFacility.description || "Cơ sở y tế này chưa có mô tả chi tiết."}</p>
                    <dl className="facility-plain-facts">
                      {detailFacility.phone && <div><dt>Số điện thoại</dt><dd>{detailFacility.phone}</dd></div>}
                      {detailFacility.website && <div><dt>Website</dt><dd><a href={detailFacility.website} target="_blank" rel="noreferrer">{detailFacility.website}</a></dd></div>}
                      <div><dt>Địa chỉ</dt><dd>{detailFacility.address}</dd></div>
                    </dl>
                  </section>
                  <section className="facility-info-group">
                    <h3>Chuyên khoa và dịch vụ</h3>
                    <div className="facility-detail-tags">{detailFacility.departments.map((department) => <span key={department}>{department}</span>)}</div>
                  </section>
                  <section className="facility-info-group busy-hours-section">
                    <h3>Mức độ đông khách</h3>
                    <p>Hệ thống chưa có dữ liệu lượng khách theo thời gian thực từ cơ sở này. Vui lòng liên hệ trực tiếp trước khi đến.</p>
                  </section>
                  <section className="facility-info-group">
                    <h3>Tiện ích hiện có dữ liệu</h3>
                    <div className="facility-detail-services">{detailServices.length ? detailServices.map((service) => <span key={service}>{service}</span>) : <p>Chưa có thông tin về tiện ích hoặc dịch vụ nổi bật của cơ sở này.</p>}</div>
                  </section>
                </div>
              )}

              {activeHospitalTab === "reviews" && (
                <div
                  id="facility-panel-reviews"
                  className="facility-detail-tab-panel"
                  role="tabpanel"
                  aria-labelledby="facility-tab-reviews"
                >
                  <section className="facility-info-group">
                    <h3>Đánh giá người dùng</h3>
                    <div className="review-overview"><strong>{detailAverageRating ? detailAverageRating.toFixed(1) : "--"}</strong><div className="review-summary-stars" aria-label={detailAverageRating ? `${detailAverageRating.toFixed(1)} trên 5 sao` : "Chưa có điểm đánh giá"}>{[1, 2, 3, 4, 5].map((rating) => <Star key={rating} size={18} fill={detailAverageRating >= rating - 0.25 ? "currentColor" : "none"} aria-hidden="true" />)}</div><span>{detailReviewCount == null ? "Chưa tải được tổng đánh giá" : `${detailReviewCount} đánh giá`}</span></div>
                    <div className="review-distribution" aria-label="Phân bố đánh giá đã tải">
                      {reviews.length < reviewsTotalCount && <small>Phân bố của {reviews.length} đánh giá đã tải, không phải toàn bộ đánh giá.</small>}
                      {reviewDistribution.map((row) => <div key={row.rating}><span>{row.rating} sao</span><i><b style={{ width: `${row.percent}%` }} /></i><em>{row.percent}%</em></div>)}
                    </div>
                  </section>
                  <section className="facility-info-group">
                    <h3>{editingReview ? "Chỉnh sửa đánh giá" : currentUserReview ? "Đánh giá của bạn" : "Gửi đánh giá"}</h3>
                    {currentUserReview && !editingReview ? (
                      <div className="current-user-review">
                        <div className="review-item-stars" aria-label={currentUserReview.rating ? `${currentUserReview.rating} trên 5 sao` : "Đánh giá đã được ghi nhận"}>{[1, 2, 3, 4, 5].map((rating) => <Star key={rating} size={18} fill={Number(currentUserReview.rating) >= rating ? "currentColor" : "none"} aria-hidden="true" />)}</div>
                        <strong>Bạn đã đánh giá cơ sở này</strong>
                        <p>{currentUserReview.isKnownDuplicate ? "Đánh giá hiện tại chưa xuất hiện trong danh sách công khai." : (currentUserReview.comment || "Bạn không để lại nhận xét.")}</p>
                        {getReviewImageUrls(currentUserReview).length > 0 && <div className="review-photo-grid">{getReviewImageUrls(currentUserReview).map((imageUrl, index) => <img className="review-image" key={imageUrl} src={imageUrl} alt={`Ảnh minh họa ${index + 1} trong đánh giá của bạn`} width="240" height="180" loading="lazy" decoding="async" />)}</div>}
                        {currentUserReview.id ? (
                          <div className="review-owner-actions">
                            <button type="button" className="review-edit-button" onClick={startEditingReview} disabled={Boolean(deletingReviewId)}><Pencil size={15} aria-hidden="true" /> Chỉnh sửa đánh giá</button>
                            <button type="button" className="review-delete-button" onClick={deleteCurrentUserReview} disabled={Boolean(deletingReviewId)}><Trash2 size={15} aria-hidden="true" /> {deletingReviewId ? "Đang xóa..." : "Xóa đánh giá"}</button>
                          </div>
                        ) : <small>Đánh giá hiện tại chưa thể chỉnh sửa hoặc xóa. Vui lòng thử lại sau.</small>}
                      </div>
                    ) : (
                      <form className="facility-review-form" onSubmit={submitReview}>
                        <fieldset className="star-rating"><legend>Chọn số sao</legend><div onMouseLeave={() => setHoveredReviewRating(0)}>{[1, 2, 3, 4, 5].map((rating) => <label key={rating} title={`${rating} sao · ${RATING_LABELS[rating]}`} onMouseEnter={() => setHoveredReviewRating(rating)}><input type="radio" name="rating" value={rating} checked={reviewForm.rating === String(rating)} onChange={(event) => { setReviewForm((current) => ({ ...current, rating: event.target.value })); setHoveredReviewRating(0); }} /><Star size={32} fill={(hoveredReviewRating || Number(reviewForm.rating)) >= rating ? "currentColor" : "none"} aria-hidden="true" /><span className="sr-only">{rating} sao · {RATING_LABELS[rating]}</span></label>)}</div><p>{hoveredReviewRating || reviewForm.rating}/5 · {RATING_LABELS[hoveredReviewRating || Number(reviewForm.rating)]}</p></fieldset>
                        <label><span>Chia sẻ trải nghiệm</span><textarea rows={4} maxLength={1000} value={reviewForm.comment} onChange={(event) => setReviewForm((current) => ({ ...current, comment: event.target.value }))} placeholder="Điều gì khiến bạn hài lòng hoặc chưa hài lòng?" /><small>{reviewForm.comment.length}/1000 ký tự</small></label>
                        <div className="review-image-upload">
                          <div><strong>Ảnh minh họa</strong><small>Tối đa 5 MB · JPG, PNG, WebP hoặc định dạng ảnh được hỗ trợ.</small></div>
                          {reviewForm.imageUrls.length > 0 && <div className="review-image-preview-grid">{reviewForm.imageUrls.map((imageUrl, index) => <div className="review-image-preview" key={imageUrl}><img className="review-image" src={imageUrl} alt={`Ảnh minh họa ${index + 1} sẽ đính kèm đánh giá`} width="240" height="180" decoding="async" /><button type="button" aria-label={`Xóa ảnh ${index + 1}`} onClick={() => setReviewForm((current) => ({ ...current, imageUrls: current.imageUrls.filter((url) => url !== imageUrl) }))}>×</button></div>)}</div>}
                          {reviewForm.imageUrls.length < 5 && <label className="review-upload-button"><ImagePlus size={17} aria-hidden="true" /><span>{uploadingReviewImage ? "Đang tải ảnh..." : `Thêm ảnh (${reviewForm.imageUrls.length}/5)`}</span><input type="file" accept="image/*" multiple onChange={uploadReviewImage} disabled={uploadingReviewImage || savingReview} /></label>}
                          <p>Không tải ảnh chứa hồ sơ bệnh án, giấy tờ tùy thân hoặc thông tin sức khỏe riêng tư.</p>
                        </div>
                        <div className="review-form-actions"><button type="submit" disabled={savingReview || uploadingReviewImage}>{auth ? (savingReview ? (editingReview ? "Đang cập nhật..." : "Đang gửi...") : (editingReview ? "Lưu chỉnh sửa" : "Gửi đánh giá")) : "Đăng nhập để đánh giá"}</button>{editingReview && <button type="button" className="secondary" onClick={cancelEditingReview} disabled={savingReview || uploadingReviewImage}>Hủy chỉnh sửa</button>}</div>
                      </form>
                    )}
                    {reviewMessage && <p className="review-message" role="status">{reviewMessage}</p>}
                  </section>
                  <section className="facility-info-group">
                    <h3>Nhận xét gần đây</h3>
                    {reviewsLoading && <p className="facility-detail-status">Đang tải đánh giá...</p>}
                    {!reviewsLoading && reviews.length === 0 && <p className="facility-empty-state">Chưa có đánh giá công khai cho cơ sở này.</p>}
                    <div className="facility-detail-list review-list">{reviews.map((review) => { const authorName = isReviewByCurrentUser(review, auth) ? "Bạn" : getReviewAuthorName(review); const reviewDate = getReviewDate(review); const reviewImageUrls = getReviewImageUrls(review); return <article key={review.id}><header><span className="review-author-avatar" aria-hidden="true">{getReviewAuthorInitial(authorName)}</span><div><strong>{authorName}</strong><small>{reviewDate ? `${reviewDate} · ` : ""}{review.rating} sao</small></div></header><div className="review-rating-line"><div className="review-item-stars" aria-label={`${review.rating} trên 5 sao`}>{[1, 2, 3, 4, 5].map((rating) => <Star key={rating} size={16} fill={Number(review.rating) >= rating ? "currentColor" : "none"} aria-hidden="true" />)}</div><span>{RATING_LABELS[Number(review.rating)]}</span></div><p className="review-comment">{review.comment || "Không có nhận xét."}</p>{reviewImageUrls.length > 0 && <div className="review-photo-grid">{reviewImageUrls.map((imageUrl, index) => <img className="review-image" key={imageUrl} src={imageUrl} alt={`Ảnh ${index + 1} trong đánh giá của ${authorName}`} width="240" height="180" loading="lazy" decoding="async" />)}</div>}</article>; })}</div>
                  </section>
                </div>
              )}
            </div>
          </section>
        )}

        {sidebarView === "doctor-detail" && selectedDoctor && detailFacility && (
          <section className="map-sidebar-screen doctor-detail-view sidebar-screen-active" aria-labelledby="doctor-detail-title">
            <div className="facility-detail-topbar">
              <button type="button" onClick={backToHospitalDetail}><ArrowLeft size={17} /> Quay lại bệnh viện</button>
              <button type="button" aria-label="Đóng chi tiết bác sĩ" onClick={closeFacilityDetail}><X size={18} /></button>
            </div>
            <div className="doctor-detail-body">
              <section className="doctor-profile-card">
                <span className="doctor-profile-image">{getDoctorImageUrl(selectedDoctor) ? <img src={getDoctorImageUrl(selectedDoctor)} alt={`Ảnh bác sĩ ${getDoctorName(selectedDoctor)}`} width="76" height="76" loading="lazy" decoding="async" /> : <UserRound size={34} aria-hidden="true" />}</span>
                <div><p>Thông tin bác sĩ</p><h2 id="doctor-detail-title" ref={sidebarTitleRef} tabIndex="-1">{getDoctorName(selectedDoctor)}</h2><span>{selectedDoctor.academicTitle || "Chưa cập nhật học hàm/học vị"}</span></div>
              </section>
              <div className="doctor-fact-grid">
                <div><Stethoscope size={17} /><span>{getDoctorSpecialty(selectedDoctor)}</span></div>
                <div><Building2 size={17} /><span>{detailFacility.facilityName}</span></div>
                {selectedDoctor.yearsOfExperience && <div><Star size={17} /><span>{selectedDoctor.yearsOfExperience} năm kinh nghiệm</span></div>}
              </div>
              <section className="facility-info-group doctor-info-panel">
                <h3>Thông tin chuyên môn</h3>
                <dl className="facility-plain-facts">
                  <div><dt>Chuyên khoa</dt><dd>{getDoctorSpecialty(selectedDoctor)}</dd></div>
                  {getDoctorRoleLabel(selectedDoctor) && <div><dt>Vai trò</dt><dd>{getDoctorRoleLabel(selectedDoctor)}</dd></div>}
                  {selectedDoctor.yearsOfExperience && <div><dt>Kinh nghiệm</dt><dd>{selectedDoctor.yearsOfExperience} năm</dd></div>}
                  <div><dt>Cơ sở công tác</dt><dd>{detailFacility.facilityName}</dd></div>
                </dl>
              </section>
              <div className="doctor-sticky-actions">
                <button type="button" disabled={!detailFacility.phone} onClick={() => callFacility(detailFacility)}><Phone size={17} /> Gọi bệnh viện</button>
                <button type="button" disabled><Clock3 size={17} /> Chưa hỗ trợ đặt lịch</button>
              </div>
            </div>
          </section>
        )}
      </aside>
      )}

      <section className="map-stage">
        <div className="map-top-controls">
        <div className="map-top-controls-row" ref={departmentFilterRef}>
          <button
            type="button"
            className="map-top-home-button"
            aria-label="Về trang chủ"
            onClick={() => navigate("/dashboard")}
          >
            <House size={18} aria-hidden="true" />
          </button>
          <div className="map-top-search" ref={searchBoxRef}>
            <Search size={17} aria-hidden="true" />
            <label className="sr-only" htmlFor="facility-search">Tìm tên bệnh viện, phòng khám</label>
            <input
              id="facility-search"
              name="search"
              type="search"
              value={searchText}
              onChange={handleSearchChange}
              onFocus={() => { if (searchText.trim() && searchSuggestions.length > 0) setSuggestionsOpen(true); }}
              placeholder="Tìm tên bệnh viện, phòng khám…"
              autoComplete="off"
              role="combobox"
              aria-expanded={suggestionsOpen && searchSuggestions.length > 0}
              aria-controls="facility-search-suggestions"
              aria-autocomplete="list"
            />
            {searchText && (
              <button type="button" aria-label="Xóa tìm kiếm" onClick={() => { setSearchText(""); setSelectedFacility(null); setSuggestionsOpen(false); }}>×</button>
            )}
            {suggestionsOpen && searchSuggestions.length > 0 && (
              <div id="facility-search-suggestions" className="map-search-suggestions-panel" role="listbox" aria-label="Gợi ý cơ sở y tế">
                <ul>
                  {searchSuggestions.map((facility) => (
                    <li key={facility.facilityId}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selectedFacility?.facilityId === facility.facilityId}
                        onClick={() => {
                          setSuggestionsOpen(false);
                          handleCardClick(facility);
                        }}
                      >
                        <MapPin size={15} aria-hidden="true" />
                        <span>
                          <strong>{facility.facilityName}</strong>
                          <small>{facility.address}</small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="map-department-filter">
            <button
              type="button"
              className={`map-department-filter-trigger${selectedDepartment ? " has-selection" : ""}`}
              aria-haspopup="listbox"
              aria-expanded={departmentPickerOpen}
              onClick={() => setDepartmentPickerOpen((open) => !open)}
            >
              <Stethoscope size={16} aria-hidden="true" />
              <span>{selectedDepartment ? selectedDepartment.name : "Khoa khám"}</span>
              <ChevronDown size={14} aria-hidden="true" />
            </button>
            {departmentPickerOpen && (
              <div className="map-department-filter-panel" role="listbox" aria-label="Chọn khoa khám">
                {departmentsLoading ? (
                  <p className="map-department-filter-status">Đang tải danh sách khoa…</p>
                ) : (
                  <ul>
                    <li>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selectedDepartmentId === "all"}
                        className={selectedDepartmentId === "all" ? "active" : ""}
                        onClick={() => {
                          setSelectedDepartmentId("all");
                          setSidebarView("hospital-list");
                          setDepartmentPickerOpen(false);
                        }}
                      >
                        Tất cả các khoa
                      </button>
                    </li>
                    {selectedDepartmentId && (
                      <li>
                        <button
                          type="button"
                          className="map-department-filter-clear"
                          onClick={() => {
                            setSelectedDepartmentId("");
                            setSidebarView("hospital-list");
                            setDepartmentPickerOpen(false);
                          }}
                        >
                          Xóa lựa chọn
                        </button>
                      </li>
                    )}
                    {departments.length === 0 ? (
                      <li><p className="map-department-filter-status">Chưa có khoa khám nào được cấu hình.</p></li>
                    ) : (
                      departments.map((department) => (
                        <li key={department.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={department.id === selectedDepartmentId}
                            className={department.id === selectedDepartmentId ? "active" : ""}
                            onClick={() => {
                              setSelectedDepartmentId(department.id);
                              setSidebarView("hospital-list");
                              setDepartmentPickerOpen(false);
                            }}
                          >
                            {department.name}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="map-nearby-controls">
          <button type="button" onClick={handleLocateMe} disabled={locating}>
            <MapPin size={16} aria-hidden="true" /> {locating ? "Đang định vị…" : nearbyEnabled ? "Định vị lại" : "Tìm gần tôi"}
          </button>
          <label>Bán kính
            <select value={radiusKm} onChange={(event) => { setRadiusKm(Number(event.target.value)); setSelectedFacility(null); }}>
              {[1, 3, 5, 7, 10, 15, 20, 30, 50].map((radius) => <option key={radius} value={radius}>{radius} km</option>)}
            </select>
          </label>
          {nearbyEnabled && <button type="button" onClick={() => { setNearbyEnabled(false); setSelectedFacility(null); }}>Bỏ giới hạn khoảng cách</button>}
          <span role="status">
            {nearbyEnabled ? nearby.loading ? "Đang tìm cơ sở gần bạn…" : nearby.error || (nearby.items.length
              ? `${nearby.items.length} cơ sở trong ${radiusKm} km · Tối đa ${NEARBY_LIMIT} kết quả gần nhất`
              : `Không có cơ sở phù hợp trong ${radiusKm} km. Hãy tăng bán kính hoặc đổi chuyên khoa.`)
              : "Cho phép định vị để tìm quanh bạn; chọn chuyên khoa nếu cần."}
          </span>
          {nearbyEnabled && nearby.error && <button type="button" onClick={() => setNearbyAttempt((value) => value + 1)}>Thử lại</button>}
        </div>
        {apiNotice && !nearbyEnabled && <div className="map-top-notice" role="status">{apiNotice}</div>}
        </div>
        <FacilityMap
          chatContext={chatContext}
          clinicalNotice={effectiveClinicalNotice}
          clinicalStatus={clinicalStatus}
          hasTopNotice={Boolean(apiNotice)}
          isClinicalFlow={isClinicalFlow}
          facilities={mappableFacilities}
          locationError={locationError}
          mapRef={mapRef}
          mapRenderKey={mapRenderKey}
          mapStatus={mapStatus}
          selectedFacility={nearbyEnabled && !mappableFacilities.some((facility) => facility.facilityId === selectedFacility?.facilityId) ? null : selectedFacility}
          recommendationContext={resolvedRecommendationContext}
          userLocation={userLocation}
          viewState={viewState}
          hidePopup={detailPanelOpen || isClinicalFlow}
          onError={handleMapError}
          onLocate={handleLocateMe}
          onMapLoad={() => setMapStatus("ready")}
          onRetry={retryMap}
          onSelect={(facility) => facility
            ? handleCardClick(facility)
            : setSelectedFacility(null)}
          onViewStateChange={setViewState}
          onViewDetail={openFacilityDetail}
        />
        {showLegacyMapDetail && detailPanelOpen && detailFacility && (
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
              {detailFacility.imageUrl ? <img src={detailFacility.imageUrl} alt="" width="640" height="360" loading="lazy" decoding="async" /> : <span aria-hidden="true">+</span>}
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
              <p>{detailFacility.description || "Cơ sở y tế này chưa có mô tả chi tiết."}</p>
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
                  : <p>Cơ sở này chưa có tiện ích hoặc dịch vụ nổi bật.</p>}
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
.map-nearby-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; padding: 10px 12px; margin-top: 8px; border: 1px solid var(--line); border-radius: 14px; background: #fff; color: var(--ink); box-shadow: 0 4px 16px #123a3310; }
.map-nearby-controls button, .map-nearby-controls select { min-height: 40px; border: 1px solid var(--line); border-radius: 10px; background: var(--paper-soft); color: var(--ink); padding: 8px 12px; font: inherit; }
.map-nearby-controls button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; }
.map-nearby-controls button:disabled { opacity: .6; cursor: wait; }
.map-nearby-controls label { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.map-nearby-controls span[role="status"] { flex: 1 1 220px; color: var(--muted); font-size: 13px; line-height: 1.5; }
.map-nearby-controls :focus-visible { outline: 2px solid var(--teal); outline-offset: 2px; }
.clinic-page { position: relative; height: 100svh; display: flex; background: var(--bg); color: var(--ink); overflow: hidden; }
.map-skip-link { position: fixed; left: 340px; top: 12px; z-index: 20; border: 2px solid var(--ink); border-radius: 8px; background: var(--lime); padding: 10px 14px; color: var(--ink); font-weight: 900; transform: translateY(calc(-100% - 24px)); transition: transform 160ms ease; }
.map-skip-link:focus { transform: translateY(0); }
.clinic-sidebar { width: 320px; flex: 0 0 320px; overflow-y: auto; border-right: 1.5px solid var(--ink); background: var(--paper); padding: 16px; }
.map-page-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
.map-page-actions button { min-height: 44px; border: 1.5px solid var(--ink); border-radius: 999px; background: #fff; color: var(--ink); font-weight: 900; }
.map-page-actions button:last-child { background: var(--lime); }
.clinic-search { display: grid; grid-template-columns: auto minmax(0,1fr) auto; align-items: center; gap: 8px; border: 1.5px solid var(--ink); border-radius: 10px; background: #fff; padding: 0 10px; }
.clinic-search input { min-width: 0; height: 42px; border: 0; outline: none; }
.clinic-search button { width: 44px; height: 44px; border: 0; border-radius: 50%; background: var(--mint); font-size: 18px; font-weight: 900; }
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
.facility-select-button { width: 100%; min-height: 44px; margin-top: 10px; border: 1.5px solid var(--ink); border-radius: 8px; background: var(--mint); color: var(--ink); font-size: 12px; font-weight: 900; }
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
.facility-reviews form > button { min-height: 44px; border: 1.5px solid var(--ink); border-radius: 8px; background: var(--lime); color: var(--ink); font-weight: 900; }
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
.map-panel > .locate-button { bottom: 86px; width: 44px; height: 44px; border-radius: 50%; background: #0c7c7b; color: #fff; box-shadow: 0 12px 30px rgba(17,20,18,.2); }
.map-ai-launcher { position: absolute; right: 18px; bottom: 18px; z-index: 7; width: 64px; height: 64px; display: grid; place-items: center; border: 1.5px solid var(--ink); border-radius: 999px; background: var(--lime); color: var(--ink); box-shadow: 5px 5px 0 var(--ink), 0 18px 42px rgba(17,20,18,.18); cursor: pointer; transition: transform .18s ease, box-shadow .18s ease; animation: landingChatPulse 2.8s ease-in-out infinite; }
.map-ai-launcher:hover { transform: translateY(-3px); box-shadow: 6px 6px 0 var(--ink), 0 22px 48px rgba(17,20,18,.2); }
.map-ai-bot-icon { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 999px; background: rgba(255,255,255,.56); color: var(--ink); font-size: 14px; font-weight: 950; letter-spacing: -.01em; }
.map-ai-hint { position: absolute; right: 86px; bottom: 29px; z-index: 6; border: 1px solid rgba(12,124,123,.2); border-radius: 999px; background: rgba(255,255,255,.96); color: #0c6766; padding: 9px 12px; font-size: 12px; font-weight: 950; box-shadow: 0 14px 34px rgba(17,20,18,.12); pointer-events: none; }
.map-ai-hint::after { content: ""; position: absolute; right: -6px; top: 50%; width: 10px; height: 10px; background: rgba(255,255,255,.96); border-right: 1px solid rgba(12,124,123,.2); border-top: 1px solid rgba(12,124,123,.2); transform: translateY(-50%) rotate(45deg); }
.map-ai-panel { position: absolute; top: 18px; right: 18px; bottom: 18px; z-index: 8; width: min(420px, 34vw); min-width: 360px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; border: 1px solid rgba(12,124,123,.22); border-radius: 24px; background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(248,252,246,.98)); box-shadow: -18px 0 54px rgba(17,20,18,.12), 0 26px 70px rgba(17,20,18,.16); padding: 18px; backdrop-filter: blur(16px); animation: mapAiPanelReveal .28s cubic-bezier(.22, 1, .36, 1) both; }
@keyframes mapAiPanelReveal { from { opacity: 0; transform: translateY(10px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
.map-ai-panel header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.map-ai-panel header > div { display: flex; align-items: center; gap: 10px; min-width: 0; }
.map-ai-panel header span { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 14px; background: #e8f6f7; color: #0c7c7b; }
.map-ai-panel header strong, .map-ai-panel header small { display: block; }
.map-ai-panel header strong { font-size: 15px; }
.map-ai-panel header small { margin-top: 2px; color: var(--muted); font-size: 12px; font-weight: 800; }
.map-ai-panel header button { width: 44px; height: 44px; display: grid; place-items: center; border: 1px solid var(--line); border-radius: 999px; background: #fff; color: var(--ink); cursor: pointer; }
.map-ai-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; border-radius: 14px; background: #f2f7ee; padding: 5px; }
.map-ai-tabs button { border: 0; border-radius: 11px; background: transparent; color: var(--muted); padding: 10px 8px; font-weight: 950; cursor: pointer; }
.map-ai-tabs button.active { background: #fff; color: var(--ink); box-shadow: 0 8px 18px rgba(17,20,18,.08); }
.map-ai-flow, .map-ai-history { display: grid; gap: 12px; }
.map-ai-flow label { display: grid; gap: 7px; color: var(--ink); font-size: 12px; font-weight: 950; }
.map-ai-flow select, .map-ai-flow textarea { width: 100%; border: 1px solid var(--line-strong); border-radius: 14px; background: #fff; color: var(--ink); padding: 11px 12px; font: inherit; font-weight: 800; outline: none; }
.map-ai-flow textarea { resize: vertical; min-height: 92px; line-height: 1.45; }
.map-ai-flow select:focus, .map-ai-flow textarea:focus { box-shadow: 0 0 0 4px rgba(12,124,123,.12); border-color: #0c7c7b; }
.map-ai-flow > button { min-height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 1.5px solid var(--ink); border-radius: 14px; background: var(--lime); color: var(--ink); box-shadow: 3px 3px 0 var(--ink); font-weight: 950; cursor: pointer; }
.map-ai-flow > button:disabled { opacity: .55; cursor: not-allowed; box-shadow: none; }
.map-ai-results { display: grid; gap: 8px; border: 1px solid rgba(12,124,123,.18); border-radius: 16px; background: #f7fcf8; padding: 12px; }
.map-ai-results small { width: fit-content; border-radius: 999px; background: #dff7ea; color: #0b6b42; padding: 5px 8px; font-size: 11px; font-weight: 950; }
.map-ai-results strong { font-size: 14px; }
.map-ai-results ul, .map-ai-session-detail ul { margin: 0; padding-left: 18px; display: grid; gap: 6px; color: var(--muted); font-size: 13px; font-weight: 850; line-height: 1.45; }
.map-ai-history-list { display: grid; gap: 9px; }
.map-ai-history article { display: flex; align-items: center; justify-content: space-between; gap: 10px; border: 1px solid var(--line); border-radius: 14px; background: #fff; padding: 10px; transition: border-color .18s ease, background .18s ease, box-shadow .18s ease; }
.map-ai-history article.active { border-color: rgba(12,124,123,.36); background: #f2fbf8; box-shadow: 0 10px 24px rgba(12,124,123,.08); }
.map-ai-history article div { display: flex; align-items: center; gap: 8px; min-width: 0; }
.map-ai-history article div > span { min-width: 0; }
.map-ai-history article strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.map-ai-history article small { display: block; margin-top: 3px; color: var(--muted); font-size: 10px; font-weight: 800; }
.map-ai-history article button { flex: 0 0 auto; border: 1px solid var(--line-strong); border-radius: 999px; background: #fff; padding: 8px 10px; font-size: 12px; font-weight: 950; cursor: pointer; }
.map-ai-session-detail { display: grid; gap: 7px; border: 1px dashed rgba(12,124,123,.26); border-radius: 14px; background: #f8fbf4; padding: 11px; }
.map-ai-session-detail p, .map-ai-message, .map-ai-history > p { margin: 0; color: var(--muted); font-size: 13px; font-weight: 850; line-height: 1.45; }
.map-ai-message { border-radius: 12px; background: #f2f7ee; padding: 9px 10px; }
.map-ai-panel { gap: 0; overflow: hidden; padding: 0; background: rgba(252, 254, 250, .98); box-shadow: -18px 0 54px rgba(17,20,18,.12), 0 28px 72px rgba(17,20,18,.16); }
.map-ai-header { flex: 0 0 auto; padding: 16px 18px; border-bottom: 1px solid rgba(220,228,217,.9); background: rgba(255,255,255,.9); backdrop-filter: blur(14px); }
.map-ai-header-actions { display: flex; align-items: center; gap: 8px; }
.map-ai-header-actions button { transition: transform .18s ease, border-color .18s ease, background .18s ease, color .18s ease, box-shadow .18s ease; }
.map-ai-header-actions button:hover, .map-ai-header-actions button.active { border-color: rgba(12,124,123,.24); background: #e8f6f7; color: #0c7c7b; box-shadow: 0 10px 22px rgba(12,124,123,.12); transform: translateY(-1px); }
.map-ai-chat { min-height: 0; flex: 1; display: flex; flex-direction: column; background: linear-gradient(180deg, #fbfdf8 0%, #f7fbf4 100%); }
.map-ai-thread { min-height: 0; flex: 1; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; padding: 18px 18px 22px; scroll-padding-bottom: 84px; scrollbar-width: thin; scrollbar-color: rgba(12,124,123,.24) transparent; }
.map-ai-thread::-webkit-scrollbar, .map-ai-history::-webkit-scrollbar { width: 8px; }
.map-ai-thread::-webkit-scrollbar-thumb, .map-ai-history::-webkit-scrollbar-thumb { border-radius: 999px; background: rgba(12,124,123,.2); }
.map-ai-message-bubble { max-width: 92%; min-width: 0; display: flex; gap: 9px; align-items: flex-start; border: 1px solid rgba(220,228,217,.9); border-radius: 18px; padding: 11px 12px; color: var(--ink); line-height: 1.45; overflow-wrap: anywhere; animation: mapAiMessageIn .26s ease both; }
.map-ai-message-bubble > span { flex: 0 0 28px; width: 28px; height: 28px; display: grid; place-items: center; border-radius: 999px; background: #e8f6f7; color: #0c7c7b; }
.map-ai-message-bubble p { min-width: 0; margin: 0; font-size: 13px; font-weight: 850; white-space: normal; }
.map-ai-message-bubble.bot { align-self: flex-start; background: #fff; box-shadow: 0 10px 26px rgba(17,20,18,.06); }
.map-ai-message-bubble.bot.loading { border-color: rgba(12,124,123,.18); background: linear-gradient(135deg, #fff 0%, #f3fbf8 100%); color: #0c6766; }
.map-ai-message-bubble.bot.loading p { display: inline-flex; align-items: center; gap: 7px; color: #0c6766; }
.map-ai-message-bubble.bot.loading i { flex: 0 0 21px; width: 21px; height: 5px; background:
  radial-gradient(circle at 2.5px 2.5px, currentColor 0 2.5px, transparent 2.6px),
  radial-gradient(circle at 10.5px 2.5px, currentColor 0 2.5px, transparent 2.6px),
  radial-gradient(circle at 18.5px 2.5px, currentColor 0 2.5px, transparent 2.6px);
  opacity: .6; animation: mapAiTypingDot 1.2s ease-in-out infinite; }
.map-ai-message-bubble.user { align-self: flex-end; border-color: rgba(12,124,123,.18); background: #e4f4f2; color: #064f55; }
.map-ai-message-bubble.user p { font-weight: 950; }
.map-ai-message-bubble.user.symptom { max-width: 86%; background: #dcf3ee; border-color: rgba(12,124,123,.24); }
.map-ai-message-bubble.has-control { width: 100%; max-width: 100%; }
.map-ai-message-bubble.has-control > div { min-width: 0; flex: 1; display: grid; gap: 10px; }
.map-ai-select-control { display: block; }
.map-ai-select-control > span { display: block; margin-bottom: 6px; color: var(--muted); font-size: 11px; font-weight: 900; }
.map-ai-select-control select { width: 100%; min-height: 42px; border: 1px solid var(--line-strong); border-radius: 14px; background: #fff; color: var(--ink); padding: 0 12px; font: inherit; font-size: 13px; font-weight: 900; outline: none; transition: border-color .18s ease, box-shadow .18s ease; }
.map-ai-select-control select:focus { border-color: #0c7c7b; box-shadow: 0 0 0 4px rgba(12,124,123,.12); }
.map-ai-context-pill { align-self: center; width: fit-content; max-width: 100%; border-radius: 999px; background: #e8f6f7; color: #0c6766; padding: 6px 10px; font-size: 11px; font-weight: 950; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.map-ai-question-stack { display: grid; gap: 9px; }
.map-ai-question-card { min-width: 0; display: grid; grid-template-columns: 30px minmax(0, 1fr); align-items: start; gap: 10px; border: 1px solid rgba(220,228,217,.95); border-radius: 16px; background: rgba(255,255,255,.96); padding: 12px; box-shadow: 0 10px 24px rgba(17,20,18,.055); animation: mapAiQuestionIn .28s ease both; animation-delay: calc(var(--question-index, 0) * 70ms); transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease; }
.map-ai-question-card:hover { border-color: rgba(12,124,123,.28); box-shadow: 0 14px 30px rgba(17,20,18,.08); transform: translateY(-1px); }
.map-ai-question-card span { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 999px; background: #f2f7ee; color: #0c7c7b; font-weight: 950; }
.map-ai-question-card p { min-width: 0; margin: 0; color: var(--ink); font-size: 13px; line-height: 1.45; font-weight: 900; overflow-wrap: anywhere; }
.map-ai-composer { flex: 0 0 auto; display: grid; grid-template-columns: minmax(0, 1fr) 42px; gap: 10px; align-items: end; padding: 12px 14px 14px; border-top: 1px solid rgba(220,228,217,.9); background: rgba(255,255,255,.94); }
.map-ai-composer-field { min-width: 0; display: grid; gap: 5px; }
.map-ai-composer-field > span { color: var(--muted); font-size: 11px; font-weight: 900; }
.map-ai-composer input { width: 100%; min-width: 0; min-height: 44px; border: 1px solid var(--line-strong); border-radius: 999px; background: #fff; color: var(--ink); padding: 0 15px; font: inherit; font-size: 13px; font-weight: 850; outline: none; transition: border-color .18s ease, box-shadow .18s ease; }
.map-ai-composer input:focus { border-color: #0c7c7b; box-shadow: 0 0 0 4px rgba(12,124,123,.12); }
.map-ai-composer button { width: 42px; height: 42px; display: grid; place-items: center; border: 1.5px solid var(--ink); border-radius: 999px; background: var(--lime); color: var(--ink); box-shadow: 3px 3px 0 var(--ink); cursor: pointer; transition: transform .18s ease, box-shadow .18s ease, opacity .18s ease; }
.map-ai-composer button:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 4px 4px 0 var(--ink); }
.map-ai-composer button:disabled { opacity: .45; cursor: not-allowed; box-shadow: none; }
.map-ai-history { min-height: 0; flex: 1; align-content: start; grid-auto-rows: max-content; overflow-y: auto; padding: 18px; background: linear-gradient(180deg, #fbfdf8 0%, #f7fbf4 100%); }
.map-ai-history-title { display: flex; align-items: center; gap: 10px; border: 1px solid rgba(220,228,217,.9); border-radius: 16px; background: #fff; padding: 12px; box-shadow: 0 10px 24px rgba(17,20,18,.055); }
.map-ai-history-title > svg { color: #0c7c7b; }
.map-ai-history-title > div { min-width: 0; flex: 1; }
.map-ai-history-title > span { min-width: 28px; min-height: 28px; display: grid; place-items: center; border-radius: 999px; background: #e8f6f7; color: #0c6766; font-size: 11px; font-weight: 950; }
.map-ai-history-title strong, .map-ai-history-title small { display: block; }
.map-ai-history-title strong { font-size: 14px; }
.map-ai-history-title small { margin-top: 2px; color: var(--muted); font-size: 11px; font-weight: 850; }
@keyframes mapAiMessageIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes mapAiQuestionIn { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes mapAiTypingDot { 0%, 80%, 100% { transform: translateY(0); opacity: .35; } 40% { transform: translateY(-3px); opacity: .95; } }
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
  .map-ai-panel {
    top: auto;
    right: 10px;
    bottom: 82px;
    left: 10px;
    width: auto;
    min-width: 0;
    max-height: min(430px, calc(100% - 104px));
    border-radius: 20px;
  }
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
  .clinic-page { display: flex; flex-direction: column; }
  .map-stage { order: 1; flex: 0 0 52%; min-height: 260px; }
  .map-stage > .map-panel { inset: 10px; border-radius: 18px; }
  .clinic-sidebar { order: 2; width: 100%; flex: 1 1 auto; min-height: 0; max-height: none; border-top: 1px solid rgba(16, 20, 17, 0.13); padding: 18px 14px 96px; }
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

/* Google Maps style sidebar detail flow. */
.clinic-sidebar {
  position: relative;
  height: 100%;
  min-height: 0;
  align-self: stretch;
  width: min(420px, 38vw);
  flex: 0 0 min(420px, 38vw);
  padding: 0;
  overflow: hidden;
  border-right: 1px solid rgba(17, 20, 18, .1);
  box-shadow: 10px 0 30px rgba(17, 20, 18, .07);
}
.clinic-sidebar.sidebar-view-hospital-detail > .facility-detail-sidebar,
.clinic-sidebar.sidebar-view-doctor-detail > .doctor-detail-view {
  position: absolute;
  inset: 0;
  width: 100%;
  height: auto;
}
.map-sidebar-screen {
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  padding: 22px;
  background: rgba(252, 253, 250, .99);
  animation: sidebarSlideIn 280ms cubic-bezier(.22, 1, .36, 1);
}
.facility-type-filter {
  display: flex;
  gap: 7px;
  overflow-x: auto;
  padding: 12px 0 4px;
}
.facility-type-filter button {
  flex: 0 0 auto;
  min-height: 44px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #fff;
  color: var(--muted);
  padding: 0 12px;
  font-size: 12px;
  font-weight: 900;
}
.facility-type-filter button.active {
  border-color: var(--teal);
  background: #e4f4f2;
  color: #075d66;
}
.facility-detail-sidebar,
.doctor-detail-view {
  display: block;
  gap: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0;
}
.facility-detail-topbar {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-bottom: 1px solid var(--line);
  background: rgba(252, 253, 250, .96);
  padding: 12px 14px;
  backdrop-filter: blur(12px);
}
.facility-detail-topbar button {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #fff;
  color: var(--ink);
  padding: 0 12px;
  font-weight: 900;
}
.facility-detail-topbar button:last-child {
  width: 38px;
  padding: 0;
  color: #b42318;
}
.facility-detail-body,
.doctor-detail-body {
  width: 100%;
  min-height: 100%;
  max-height: none;
  overflow: visible;
  padding-bottom: 18px;
}
.facility-detail-media {
  height: 198px;
  background: linear-gradient(135deg, rgba(8, 127, 140, .14), rgba(184, 239, 121, .34)), #eef7ea;
}
.facility-detail-media img,
.facility-detail-media span {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  object-fit: cover;
  color: #315d18;
}
.facility-detail-summary {
  display: grid;
  gap: 8px;
  padding: 18px 18px 14px;
}
.facility-detail-summary h2 {
  margin: 0;
  color: var(--ink);
  font-size: clamp(25px, 3vw, 34px);
  line-height: 1.08;
  overflow-wrap: anywhere;
}
.facility-detail-summary h2:focus-visible {
  outline: 3px solid rgba(8, 127, 140, .42);
  outline-offset: 4px;
}
.facility-detail-summary p {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.45;
}
.facility-detail-summary svg {
  flex: 0 0 auto;
  margin-top: 1px;
  color: var(--teal);
}
.facility-quick-actions {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  padding: 0 18px 16px;
}
.facility-quick-actions button,
.facility-quick-actions a {
  min-width: 0;
  min-height: 64px;
  display: grid;
  place-items: center;
  gap: 5px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fff;
  color: var(--ink);
  padding: 8px 5px;
  font-size: 11px;
  font-weight: 900;
  text-align: center;
  text-decoration: none;
}
.facility-quick-actions .primary {
  border-color: #087f8c;
  background: #087f8c;
  color: #fff;
}
.facility-action-message {
  margin: -4px 18px 10px;
  color: #075d66;
  font-size: 12px;
  font-weight: 850;
}
.busy-hours-section {
  gap: 14px;
}
.busy-hours-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 14px;
}
.busy-hours-heading h3,
.busy-hours-heading p {
  margin: 0;
}
.busy-hours-heading p {
  margin-top: 4px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.45;
}
.busy-hours-heading label {
  display: grid;
  flex: 0 0 116px;
  gap: 5px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 900;
}
.busy-hours-heading select {
  min-height: 44px;
  border: 1px solid var(--line-strong);
  border-radius: 10px;
  background: #fff;
  color: var(--ink);
  padding: 0 9px;
  font: inherit;
}
.busy-hours-chart {
  display: grid;
  gap: 9px;
  margin: 0;
}
.busy-hours-bars {
  height: 174px;
  display: grid;
  grid-template-columns: repeat(10, minmax(24px, 1fr));
  align-items: end;
  gap: 5px;
  border-bottom: 1px solid var(--line-strong);
  padding-top: 24px;
}
.busy-hour-column {
  height: 150px;
  display: grid;
  grid-template-rows: 20px minmax(0, 1fr) 24px;
  align-items: end;
  gap: 3px;
  text-align: center;
}
.busy-hour-column i {
  width: 100%;
  min-height: 4px;
  border-radius: 6px 6px 2px 2px;
  background: #087f8c;
}
.busy-hour-value,
.busy-hour-column small {
  color: var(--muted);
  font-size: 9px;
  font-style: normal;
  font-weight: 850;
}
.busy-hour-value.high { color: #8f2d1f; }
.busy-hour-value.medium { color: #725200; }
.busy-hour-value.low { color: #12643a; }
.busy-hours-chart figcaption,
.busy-hours-data {
  color: var(--muted);
  font-size: 11px;
  line-height: 1.5;
}
.busy-hours-data summary {
  width: fit-content;
  min-height: 44px;
  cursor: pointer;
  color: var(--teal);
  font-weight: 900;
}
.busy-hours-data p { margin: 6px 0 0; }
.busy-hours-data table {
  width: 100%;
  margin-top: 8px;
  border-collapse: collapse;
  color: var(--ink);
  font-size: 12px;
}
.busy-hours-data caption {
  padding-bottom: 7px;
  font-weight: 900;
  text-align: left;
}
.busy-hours-data th,
.busy-hours-data td {
  border-bottom: 1px solid var(--line);
  padding: 7px 6px;
  text-align: left;
}
.busy-hours-data th { color: var(--muted); }
.busy-level-badge {
  display: inline-flex;
  min-width: 54px;
  justify-content: center;
  border-radius: 999px;
  padding: 4px 8px;
  font-weight: 900;
}
.busy-level-badge.high { background: #f8ddd8; color: #7c271c; }
.busy-level-badge.medium { background: #f6ebc8; color: #604500; }
.busy-level-badge.low { background: #dff3e7; color: #10582f; }
.facility-quick-actions button:disabled {
  background: #eef0e8;
  color: var(--muted);
}
.facility-detail-tabs {
  position: sticky;
  top: 0;
  z-index: 4;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  background: rgba(252, 253, 250, .96);
  backdrop-filter: blur(12px);
}
.facility-detail-tabs button {
  min-height: 46px;
  border: 0;
  border-bottom: 3px solid transparent;
  background: transparent;
  color: var(--muted);
  font-weight: 950;
}
.facility-detail-tabs button.active {
  border-bottom-color: var(--teal);
  color: var(--teal);
}
.facility-detail-tab-panel {
  display: grid;
  gap: 12px;
  padding: 16px 18px;
}
.facility-info-group {
  display: grid;
  gap: 10px;
  border-bottom: 1px solid var(--line);
  padding-bottom: 14px;
}
.facility-info-group:last-child {
  border-bottom: 0;
}
.facility-info-group h3 {
  margin: 0;
  font-size: 16px;
}
.facility-info-group p {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.55;
}
.facility-plain-facts {
  display: grid;
  gap: 10px;
  margin: 0;
}
.facility-plain-facts div {
  display: grid;
  gap: 3px;
}
.facility-plain-facts dt {
  color: var(--muted);
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}
.facility-plain-facts dd {
  margin: 0;
  color: var(--ink);
  font-size: 13px;
  font-weight: 850;
  overflow-wrap: anywhere;
}
.facility-empty-state {
  border: 1px dashed var(--line-strong);
  border-radius: 14px;
  background: var(--paper-soft);
  padding: 13px;
}
.facility-detail-doctor-list article {
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
}
.facility-detail-doctor-image {
  display: grid;
  place-items: center;
  overflow: hidden;
}
.facility-detail-doctor-image img,
.doctor-profile-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.facility-detail-doctor-list small {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.35;
}
.facility-detail-doctor-list button {
  min-height: 44px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #fff;
  padding: 0 10px;
  color: var(--teal);
  font-size: 12px;
  font-weight: 950;
}
.review-overview {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 10px 12px;
  border: 1px solid rgba(8, 127, 140, .16);
  border-radius: 16px;
  background:
    radial-gradient(circle at 100% 0%, rgba(8, 127, 140, .1), transparent 10rem),
    linear-gradient(135deg, #ffffff, #f3fbf8);
  padding: 14px;
  box-shadow: 0 12px 28px rgba(15, 61, 58, .08);
}
.review-overview strong {
  grid-row: span 2;
  color: var(--teal);
  font-size: 42px;
  line-height: 1;
}
.review-overview span,
.review-distribution em {
  color: var(--muted);
  font-size: 12px;
  font-style: normal;
  font-weight: 850;
}
.review-summary-stars,
.review-item-stars {
  display: flex;
  gap: 3px;
  color: #d89517;
}
.star-rating {
  display: grid;
  gap: 10px;
  margin: 0;
  border: 1px solid rgba(8, 127, 140, .16);
  border-radius: 16px;
  background: #f7fbf8;
  padding: 14px;
}
.star-rating legend {
  padding: 0 4px;
  font-size: 12px;
  font-weight: 950;
}
.star-rating > div {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}
.star-rating label {
  position: relative;
  width: 100%;
  height: 48px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fff;
  color: #d89517;
  cursor: pointer;
  transition: border-color 180ms ease, background 180ms ease, transform 180ms ease;
}
.star-rating label svg {
  pointer-events: none;
  transition: color 140ms ease, fill 140ms ease, transform 140ms ease;
}
.star-rating label:hover {
  border-color: rgba(8, 127, 140, .34);
  background: #eff9f5;
  transform: translateY(-1px);
}
.star-rating label:hover svg { transform: scale(1.08); }
.star-rating input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}
.star-rating label:has(input:focus-visible) {
  border-radius: 8px;
  outline: 3px solid #087f8c;
  outline-offset: 1px;
}
.star-rating p {
  margin: 0;
  color: var(--muted);
  font-size: 11px;
  font-weight: 850;
}
.current-user-review {
  display: grid;
  gap: 10px;
  border: 1px solid rgba(8, 127, 140, .22);
  border-radius: 18px;
  background: linear-gradient(135deg, #eef8f5, #ffffff);
  padding: 16px;
  box-shadow: 0 12px 28px rgba(15, 61, 58, .08);
}
.current-user-review p,
.current-user-review small { margin: 0; color: var(--muted); line-height: 1.5; }
.current-user-review small { font-size: 11px; font-weight: 800; }
.review-owner-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.review-edit-button,
.review-delete-button {
  width: fit-content;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid rgba(8, 127, 140, .24);
  border-radius: 999px;
  background: #fff;
  padding: 0 12px;
  font-weight: 900;
  cursor: pointer;
}
.review-edit-button { color: var(--teal); }
.review-delete-button {
  border-color: rgba(180, 35, 24, .24);
  background: #fff8f7;
  color: #b42318;
}
.review-edit-button:disabled,
.review-delete-button:disabled {
  cursor: wait;
  opacity: .62;
}
.review-owner-actions button:focus-visible {
  outline: 3px solid rgba(8, 127, 140, .32);
  outline-offset: 2px;
}
.review-image-upload {
  min-width: 0;
  display: grid;
  gap: 12px;
  border: 1px dashed rgba(8, 127, 140, .28);
  border-radius: 18px;
  background: linear-gradient(135deg, #ffffff, #f5fbf8);
  padding: 14px;
}
.review-image-upload > div:first-child { display: grid; gap: 2px; }
.review-image-upload small,
.review-image-upload p { margin: 0; color: var(--muted); font-size: 11px; line-height: 1.5; }
.review-upload-button {
  width: fit-content;
  min-height: 44px;
  display: inline-flex !important;
  grid-auto-flow: column;
  align-items: center;
  gap: 7px;
  border: 1px solid rgba(8, 127, 140, .22);
  border-radius: 999px;
  background: #fff;
  color: var(--teal);
  padding: 0 14px;
  font-weight: 950;
  cursor: pointer;
}
.review-upload-button input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}
.review-upload-button:has(input:focus-visible) { outline: 3px solid var(--teal); outline-offset: 2px; }
.review-image-preview-grid,
.review-photo-grid {
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: start;
  gap: 6px;
}
.review-image-preview {
  position: relative;
  min-width: 0;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--paper, #fff);
  contain: layout paint;
}
.review-image {
  width: 100%;
  aspect-ratio: 4 / 3;
  display: block;
  border: 1px solid var(--line);
  border-radius: 10px;
  object-fit: cover;
}
.review-image-preview .review-image {
  position: absolute;
  inset: 0;
  height: 100%;
  border: 0;
  border-radius: inherit;
}
.review-image-preview button {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 44px;
  height: 44px;
  border: 1px solid rgba(255,255,255,.72);
  border-radius: 50%;
  background: rgba(16,20,17,.78);
  color: #fff;
  padding: 0;
  font-size: 20px;
  font-weight: 900;
}
.review-image-preview button:focus-visible {
  outline: 3px solid var(--teal);
  outline-offset: 2px;
}
.review-form-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.review-form-actions button { flex: 1 1 150px; }
.review-form-actions .secondary { background: var(--paper, #fff); border-color: var(--teal); color: var(--teal); box-shadow: none; }
.review-list { gap: 10px; }
.review-list article {
  gap: 10px;
  border: 1px solid rgba(8, 127, 140, .14);
  border-radius: 16px;
  background: linear-gradient(135deg, #ffffff, #fbfdfb);
  padding: 14px;
  box-shadow: 0 10px 24px rgba(15, 61, 58, .06);
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}
.review-list article:hover {
  border-color: rgba(8, 127, 140, .28);
  box-shadow: 0 14px 30px rgba(15, 61, 58, .1);
  transform: translateY(-1px);
}
.review-list article:last-child { border-bottom: 1px solid rgba(8, 127, 140, .14); }
.review-list article header {
  display: flex;
  align-items: center;
  gap: 9px;
}
.review-list article header > div { min-width: 0; display: grid; gap: 2px; }
.review-list article header strong { overflow-wrap: anywhere; }
.review-list article header small { color: var(--muted); font-size: 11px; }
.review-rating-line { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; }
.review-rating-line > span { color: var(--muted); font-size: 11px; font-weight: 800; }
.review-comment { color: var(--ink) !important; font-size: 13px !important; line-height: 1.55 !important; }
.review-author-avatar {
  flex: 0 0 34px;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(8, 127, 140, .2);
  border-radius: 50%;
  background: #e6f4ee;
  color: var(--teal);
  font-size: 10px;
  font-weight: 950;
}
@media (prefers-reduced-motion: reduce) {
  .star-rating label svg { transition: none; }
}
@media (max-width: 420px) {
  .review-photo-grid,
  .review-image-preview-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
.review-distribution {
  display: grid;
  gap: 9px;
  margin-top: 12px;
}
.review-distribution div {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 38px;
  align-items: center;
  gap: 8px;
}
.review-distribution span {
  color: var(--muted);
  font-size: 11px;
  font-weight: 850;
}
.review-distribution i {
  height: 9px;
  overflow: hidden;
  border-radius: 999px;
  background: #e5eee9;
}
.review-distribution b {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--teal), #18a6a0);
}
.facility-review-form {
  display: grid;
  gap: 14px;
}
.facility-review-form label {
  display: grid;
  gap: 6px;
  font-size: 12px;
  font-weight: 900;
}
.facility-review-form select,
.facility-review-form textarea {
  width: 100%;
  border: 1px solid rgba(8, 127, 140, .24);
  border-radius: 14px;
  background: #fff;
  padding: 12px;
  color: var(--ink);
  transition: border-color 180ms ease, box-shadow 180ms ease;
}
.facility-review-form select:focus,
.facility-review-form textarea:focus {
  border-color: var(--teal);
  box-shadow: 0 0 0 4px rgba(8, 127, 140, .12);
  outline: 0;
}
.facility-review-form button,
.doctor-sticky-actions button {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid var(--teal);
  border-radius: 999px;
  background: var(--teal);
  color: #fff;
  font-weight: 950;
  box-shadow: 0 10px 22px rgba(8, 127, 140, .18);
}
.doctor-profile-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  padding: 20px 18px 14px;
}
.doctor-profile-image {
  width: 76px;
  height: 76px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: var(--paper-soft);
  color: var(--teal);
}
.doctor-profile-card p,
.doctor-profile-card h2 {
  margin: 0;
}
.doctor-profile-card p {
  color: var(--teal);
  font-size: 11px;
  font-weight: 950;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.doctor-profile-card h2 {
  font-size: 24px;
  line-height: 1.12;
}
.doctor-profile-card span {
  color: var(--muted);
  font-size: 13px;
  font-weight: 850;
}
.doctor-fact-grid {
  display: grid;
  gap: 8px;
  padding: 0 18px 16px;
}
.doctor-fact-grid div {
  display: flex;
  gap: 8px;
  align-items: center;
  color: var(--muted);
  font-size: 13px;
  font-weight: 850;
}
.doctor-sticky-actions {
  position: sticky;
  bottom: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  border-top: 1px solid var(--line);
  background: rgba(252, 253, 250, .96);
  padding: 12px 18px;
  backdrop-filter: blur(12px);
}
.doctor-sticky-actions button:disabled {
  border-color: var(--line);
  background: #eef0e8;
  color: var(--muted);
}
.doctor-detail-view .doctor-detail-body {
  background: linear-gradient(180deg, #fbfdf8 0%, #f3f8ef 100%);
}
.doctor-detail-view .doctor-profile-card {
  margin: 16px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 12px 30px rgba(24, 54, 31, .07);
  padding: 16px;
}
.doctor-detail-view .doctor-profile-card h2 {
  font-size: 25px;
  line-height: 1.12;
  overflow-wrap: anywhere;
}
.doctor-detail-view .doctor-fact-grid {
  padding: 0 16px 14px;
}
.doctor-detail-view .doctor-fact-grid div {
  border: 1px solid var(--line);
  border-radius: 13px;
  background: rgba(255, 255, 255, .86);
  padding: 10px 12px;
}
.doctor-info-panel {
  margin: 0 16px 16px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 10px 26px rgba(24, 54, 31, .06);
  padding: 16px;
}
.doctor-info-panel .facility-plain-facts {
  gap: 8px;
}
.doctor-info-panel .facility-plain-facts div {
  border: 1px solid var(--line);
  border-radius: 13px;
  background: var(--paper-soft);
  padding: 10px 12px;
}
.facility-detail-doctor-list article {
  gap: 12px;
  border-radius: 16px;
  background: #fff;
  padding: 14px;
}
.doctor-card-copy {
  min-width: 0;
  display: grid;
  gap: 3px;
}
.doctor-card-copy strong {
  display: block;
  color: var(--ink);
  font-size: 14px;
  line-height: 1.25;
  overflow-wrap: anywhere;
}
.doctor-card-copy span {
  display: block;
  color: var(--ink);
  font-size: 12px;
  font-weight: 900;
}
.doctor-detail-view .doctor-sticky-actions button {
  border-color: var(--line);
  border-radius: 14px;
  box-shadow: none;
}
.facility-detail-view {
  display: none;
}
@keyframes sidebarSlideIn {
  from { opacity: .5; transform: translateX(18px); }
  to { opacity: 1; transform: translateX(0); }
}
@media (max-width: 760px) {
  .clinic-sidebar {
    width: 100%;
    flex: 1 1 auto;
    max-height: 64svh;
    border-right: 0;
    border-top: 1px solid rgba(16, 20, 17, .13);
    border-radius: 18px 18px 0 0;
  }
  .map-sidebar-screen {
    padding: 16px 14px 92px;
  }
  .facility-detail-sidebar,
  .doctor-detail-view {
    padding: 0;
  }
  .facility-detail-media {
    height: 152px;
  }
  .facility-quick-actions {
    grid-template-columns: repeat(4, minmax(68px, 1fr));
    overflow-x: auto;
  }
  .busy-hours-heading {
    align-items: stretch;
    flex-direction: column;
  }
  .busy-hours-heading label { flex-basis: auto; }
  .busy-hours-bars { gap: 3px; overflow-x: auto; }
  .facility-detail-tabs {
    top: 0;
  }
  .doctor-sticky-actions {
    grid-template-columns: 1fr;
  }
}
@media (prefers-reduced-motion: reduce) {
  .map-sidebar-screen {
    animation: none;
  }
}
`;

export default NearbyClinicPage;
