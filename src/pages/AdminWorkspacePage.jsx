import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Building2,
  CircleHelp,
  CreditCard,
  FileHeart,
  LayoutDashboard,
  SlidersHorizontal,
  Stethoscope,
  Users,
} from "lucide-react";
import { Navbar } from "../components/landing/Navbar";
import { Footer } from "../components/landing/PricingSection";
import { useFeedback } from "../components/feedback/feedbackContext";
import DoctorFormModal from "../components/adminDoctors/DoctorFormModal";
import AdminDoctorsSection from "../components/adminDoctors/AdminDoctorsSection";
import AIConfigDetailModal from "../components/adminAIConfigs/AIConfigDetailModal";
import { navigate } from "../router/navigation";
import { getAdminSectionPath, getNavigationModel } from "../router/routes";
import AIConfigFormModal from "../components/adminAIConfigs/AIConfigFormModal";
import AdminAIConfigsSection from "../components/adminAIConfigs/AdminAIConfigsSection";
import { getEnvironment } from "../components/adminAIConfigs/aiConfigUtils";
import SubscriptionPlanFormModal from "../components/adminSubscriptions/SubscriptionPlanFormModal";
import AdminSubscriptionsSection from "../components/adminSubscriptions/AdminSubscriptionsSection";
import AdminOverviewSection from "../components/adminOverview/AdminOverviewSection";
import AdminUsersSection from "../components/adminUsers/AdminUsersSection";
import AdminDepartmentsSection from "../components/adminDepartments/AdminDepartmentsSection";
import AdminICDChaptersSection from "../components/adminICDChapters/AdminICDChaptersSection";
import AdminFacilitiesSection from "../components/adminFacilities/AdminFacilitiesSection";
import AdminPatientProfilesSection from "../components/adminPatientProfiles/AdminPatientProfilesSection";
import AdminClinicalCatalogSection from "../components/adminClinicalData/AdminClinicalCatalogSection";
import {
  authApi,
  doctorInvitationsApi,
  facilityDepartmentsApi,
  getStoredAuth,
  medicalFacilitiesApi,
  medicalDepartmentsApi,
  clinicalQuestionsApi,
  icdChaptersApi,
  patientProfilesApi,
  subscriptionPlansApi,
  usersApi,
} from "../services/api";
import { aiConfigManagementApi } from "../services/aiConfigManagement";
import { doctorManagementApi } from "../services/doctors";
import { logoutUser } from "../services/logoutService";
import { hasRole, normalizeRoles } from "../utils/roles";
import "../styles/operator-workspace.css";

const EMPTY_DEPARTMENT = { departmentName: "", description: "", chapterCode: "" };
const EMPTY_ICD_CHAPTER = { chapterCode: "", chapterName: "", keywordWeights: "{}" };
const EMPTY_INVITATION = { email: "", doctorId: "" };
const EMPTY_FACILITY = {
  facilityName: "",
  address: "",
  latitude: "",
  longitude: "",
  phone: "",
  website: "",
  imageUrl: "",
  openingHours: "",
  facilityType: "",
  isActive: true,
  departmentIds: [],
};
const EMPTY_PATIENT_PROFILE = {
  userId: "",
  bloodType: "",
  height: "",
  weight: "",
  allergyNote: "",
  chronicDiseases: [],
};
const EMPTY_FACILITY_FILTERS = {
  search: "",
  isActive: "",
  departmentId: "",
};
const EMPTY_DEPARTMENT_FILTERS = {
  search: "",
};
const EMPTY_ICD_CHAPTER_FILTERS = {
  search: "",
};
const EMPTY_DOCTOR_FILTERS = {
  search: "",
  facilityId: "",
  departmentId: "",
  isActive: "",
  departmentRole: "",
};
const DEFAULT_DOCTOR_PAGE_SIZE = 10;
const DEFAULT_DEPARTMENT_PAGE_SIZE = 10;
const DEFAULT_FACILITY_PAGE_SIZE = 10;
const DEFAULT_ICD_CHAPTER_PAGE_SIZE = 10;
function createEmptyDisease() {
  return {
    localId: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    id: "",
    diseaseName: "",
    from: "",
    to: "",
    note: "",
  };
}
const USER_LOAD_ERROR_MESSAGE = "Vui lòng kiểm tra kết nối và thử tải lại danh sách tài khoản.";
const DOCTOR_LOAD_ERROR_MESSAGE = "Vui lòng kiểm tra kết nối và thử tải lại danh sách.";
const AI_CONFIG_LOAD_ERROR_MESSAGE = "Vui lòng kiểm tra kết nối và thử tải lại danh sách cấu hình.";
const SUBSCRIPTION_PLAN_LOAD_ERROR_MESSAGE = "Vui lòng kiểm tra kết nối và thử tải lại danh sách gói dịch vụ.";
const FACILITY_LOAD_ERROR_MESSAGE = "Vui lòng kiểm tra kết nối và thử tải lại danh sách cơ sở y tế.";
const PATIENT_PROFILE_LOAD_ERROR_MESSAGE = "Vui lòng kiểm tra kết nối và thử tải lại danh sách hồ sơ bệnh nhân.";
const DEPARTMENT_LOAD_ERROR_MESSAGE = "Vui lòng kiểm tra kết nối và thử tải lại danh mục chuyên khoa.";
const ICD_CHAPTER_LOAD_ERROR_MESSAGE = "Vui lòng kiểm tra kết nối và thử tải lại danh mục chương ICD.";
const EMPTY_AI_CONFIG_FILTERS = {
  search: "",
  status: "",
  taskType: "",
  model: "",
  environment: "",
};
const DEFAULT_AI_CONFIG_PAGE_SIZE = 10;
const DOCTOR_PAGE_SIZES = new Set([10, 20, 50]);
const ADMIN_NAV_ICONS = {
  dashboard: LayoutDashboard,
  users: Users,
  doctor: Stethoscope,
  ai: SlidersHorizontal,
  subscription: CreditCard,
  facility: Building2,
  icd: BookOpen,
  question: CircleHelp,
  "patient-profile": FileHeart,
};
const QUESTION_CATALOG_CONFIG = {
  title: "Câu hỏi lâm sàng", formTitle: "Nội dung câu hỏi", singularLabel: "câu hỏi", pluralLabel: "câu hỏi lâm sàng",
  primaryField: "questionVi", secondaryField: "englishPrefix",
  fields: [
    { name: "chapterId", label: "Chương ICD", required: true, type: "icd-select" },
    { name: "questionVi", label: "Câu hỏi tiếng Việt", required: true, multiline: true },
    { name: "englishPrefix", label: "Câu hỏi tiếng Anh", required: true, multiline: true },
    { name: "sortOrder", label: "Thứ tự", required: true, type: "number", min: 0, step: 1, serialize: Number },
    { name: "answers", label: "Các đáp án", type: "answers" },
  ],
};
const ADMIN_NAV_ITEMS = getNavigationModel("admin");

function readDoctorViewState(search = window.location.search) {
  const params = new URLSearchParams(search);
  const requestedPageSize = Number(params.get("pageSize"));
  const requestedPage = Number(params.get("page"));
  const isActive = params.get("isActive");

  return {
    filters: {
      search: params.get("search")?.trim() || "",
      facilityId: params.get("facilityId") || "",
      departmentId: params.get("departmentId") || "",
      isActive: ["true", "false"].includes(isActive) ? isActive : "",
      departmentRole: params.get("departmentRole") || "",
    },
    pageNumber: Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    pageSize: DOCTOR_PAGE_SIZES.has(requestedPageSize) ? requestedPageSize : DEFAULT_DOCTOR_PAGE_SIZE,
  };
}

function getDoctorViewPath(filters, pageNumber, pageSize) {
  const params = new URLSearchParams();
  const normalizedSearch = filters.search.trim();

  if (normalizedSearch) params.set("search", normalizedSearch);
  if (filters.facilityId) params.set("facilityId", filters.facilityId);
  if (filters.departmentId) params.set("departmentId", filters.departmentId);
  if (filters.isActive !== "") params.set("isActive", filters.isActive);
  if (filters.departmentRole !== "") params.set("departmentRole", filters.departmentRole);
  if (pageNumber > 1) params.set("page", String(pageNumber));
  if (pageSize !== DEFAULT_DOCTOR_PAGE_SIZE) params.set("pageSize", String(pageSize));

  const query = params.toString();
  return `/app/admin/doctors${query ? `?${query}` : ""}`;
}

function ApiMessage({ message }) {
  if (!message) return null;
  return <div className={`api-message ${message.type}`}>{message.text}</div>;
}

const APPROVED_USER_STATUSES = new Set(["1", "active", "approved", "confirmed", "enabled", "verified"]);
const PENDING_USER_STATUSES = new Set(["0", "pending", "pendingapproval", "pending_approval", "awaitingapproval", "unapproved", "unconfirmed"]);
const USER_STATUS_FILTERS = {
  all: "all",
  pending: "pending",
  confirmed: "confirmed",
  deleted: "deleted",
};

function normalizeStatusText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function getUserStatusText(user) {
  return normalizeStatusText(
    user?.statusName
      ?? user?.accountStatus
      ?? user?.approvalStatus
      ?? user?.status,
  );
}

function isApprovedUser(user) {
  const status = getUserStatusText(user);
  if (PENDING_USER_STATUSES.has(status)) return false;
  if (APPROVED_USER_STATUSES.has(status)) return true;
  if (Number(user?.status) === 1) return true;
  if (user?.isApproved === true || user?.approved === true) return true;
  return user?.isActive === true && status !== "";
}

function isPendingApprovalUser(user) {
  return !user?.isDeleted && !isApprovedUser(user);
}

function isProtectedAdminUser(user) {
  const userRoles = normalizeRoles(
    user?.roles
    ?? user?.role
    ?? user?.userRoles
    ?? user?.Role
    ?? [],
  );
  const identityText = normalizeStatusText([
    user?.displayName,
    user?.name,
    user?.email,
  ].filter(Boolean).join(" "));
  return hasRole(userRoles, "admin")
    || userRoles.some((role) => ["systemadmin", "system-admin", "system admin"].includes(role))
    || identityText.includes("systemadmin")
    || identityText.includes("admin@medmate.local");
}

function statusLabel(user) {
  return isApprovedUser(user) ? "Đã duyệt" : "Chờ duyệt";
}

function parseOptionalCoordinate(value, minimum, maximum) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;
  const coordinate = Number(trimmed);
  return Number.isFinite(coordinate) && coordinate >= minimum && coordinate <= maximum
    ? coordinate
    : Number.NaN;
}

function isFacilityActive(facility) {
  return facility?.isActive !== false;
}

function getFacilityDepartmentIds(facility, facilityDepartments) {
  const directIds = Array.isArray(facility?.departmentIds) ? facility.departmentIds : [];
  const nestedIds = Array.isArray(facility?.departments)
    ? facility.departments.map((department) => department.departmentId ?? department.id)
    : [];
  const linkedIds = facilityDepartments
    .filter((item) => item.facilityId === facility?.id)
    .map((item) => item.departmentId);

  return Array.from(new Set([...directIds, ...nestedIds, ...linkedIds].filter(Boolean)));
}

function getDepartmentItems(response) {
  const data = response?.data ?? [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

function getPagedPayload(response) {
  const data = response?.data ?? {};
  const items = Array.isArray(data) ? data : data.items ?? [];

  return {
    items,
    pageNumber: data.pageNumber ?? 1,
    pageSize: data.pageSize ?? items.length,
    totalCount: data.totalCount ?? items.length,
    totalPages: data.totalPages ?? 1,
  };
}

function formatRoles(roles) {
  return roles.length ? roles.join(", ") : "admin";
}

function AccessDenied({ auth, roles }) {
  return (
    <main className="workspace-root admin-operator">
      <section className="app-page">
        <div className="container app-empty">
          <p className="eyebrow">Không có quyền Admin</p>
          <h1>Tài khoản này không thể mở Admin Workspace.</h1>
          <p>
            Phiên hiện tại là {auth?.email || "người dùng"} với role {formatRoles(roles)}. Hãy dùng tài khoản Admin hoặc quay về workspace phù hợp.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="/app">Mở workspace của tôi</a>
            <a className="btn btn-ghost" href="/login">Đăng nhập tài khoản khác</a>
          </div>
        </div>
      </section>
    </main>
  );
}

function EmptyAuth() {
  return (
    <main className="landing-page">
      <Navbar />
      <section className="app-page">
        <div className="container app-empty">
          <p className="eyebrow">Admin</p>
          <h1>Bạn cần đăng nhập bằng tài khoản Admin.</h1>
          <div className="hero-actions">
            <a className="btn btn-primary" href="/login">Đăng nhập</a>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

export default function AdminWorkspacePage({ initialSection = "overview" }) {
  const { confirmAction, showToast } = useFeedback();
  const [initialDoctorView] = useState(readDoctorViewState);
  const currentDoctorSearch = window.location.search;
  const lastDoctorViewSearchRef = useRef(currentDoctorSearch);
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [profile, setProfile] = useState(null);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [departmentCatalog, setDepartmentCatalog] = useState([]);
  const [icdChapters, setIcdChapters] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [patientProfiles, setPatientProfiles] = useState([]);
  const [facilityDepartments, setFacilityDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [aiConfigs, setAIConfigs] = useState([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [pageInfo, setPageInfo] = useState({ pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 });
  const [doctorPageInfo, setDoctorPageInfo] = useState({
    pageNumber: initialDoctorView.pageNumber,
    pageSize: initialDoctorView.pageSize,
    totalCount: 0,
    totalPages: 1,
  });
  const [departmentPageInfo, setDepartmentPageInfo] = useState({ pageNumber: 1, pageSize: DEFAULT_DEPARTMENT_PAGE_SIZE, totalCount: 0, totalPages: 1 });
  const [icdChapterPageInfo, setIcdChapterPageInfo] = useState({ pageNumber: 1, pageSize: DEFAULT_ICD_CHAPTER_PAGE_SIZE, totalCount: 0, totalPages: 1 });
  const [aiConfigPageInfo, setAIConfigPageInfo] = useState({ pageNumber: 1, pageSize: DEFAULT_AI_CONFIG_PAGE_SIZE, totalCount: 0, totalPages: 1 });
  const [facilityPageInfo, setFacilityPageInfo] = useState({ pageNumber: 1, pageSize: DEFAULT_FACILITY_PAGE_SIZE, totalCount: 0, totalPages: 1 });
  const [patientProfilePageInfo, setPatientProfilePageInfo] = useState({ pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 });
  const activeSection = initialSection;
  const activeAdminItem = ADMIN_NAV_ITEMS.find((item) => item.id === `admin.${activeSection}`);
  const adminNavRef = useRef(null);
  const [search, setSearch] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState(USER_STATUS_FILTERS.all);
  const [facilityFilters, setFacilityFilters] = useState(EMPTY_FACILITY_FILTERS);
  const [appliedFacilityFilters, setAppliedFacilityFilters] = useState(EMPTY_FACILITY_FILTERS);
  const [departmentFilters, setDepartmentFilters] = useState(EMPTY_DEPARTMENT_FILTERS);
  const [appliedDepartmentFilters, setAppliedDepartmentFilters] = useState(EMPTY_DEPARTMENT_FILTERS);
  const [icdChapterFilters, setIcdChapterFilters] = useState(EMPTY_ICD_CHAPTER_FILTERS);
  const [appliedIcdChapterFilters, setAppliedIcdChapterFilters] = useState(EMPTY_ICD_CHAPTER_FILTERS);
  const [doctorFilters, setDoctorFilters] = useState(initialDoctorView.filters);
  const [aiConfigFilters, setAIConfigFilters] = useState(EMPTY_AI_CONFIG_FILTERS);
  const [patientProfileSearch, setPatientProfileSearch] = useState("");
  const [departmentForm, setDepartmentForm] = useState(EMPTY_DEPARTMENT);
  const [icdChapterForm, setIcdChapterForm] = useState(EMPTY_ICD_CHAPTER);
  const [facilityForm, setFacilityForm] = useState(EMPTY_FACILITY);
  const [patientProfileForm, setPatientProfileForm] = useState(EMPTY_PATIENT_PROFILE);
  const [editingDepartmentId, setEditingDepartmentId] = useState("");
  const [editingIcdChapterId, setEditingIcdChapterId] = useState("");
  const [editingFacilityId, setEditingFacilityId] = useState("");
  const [editingPatientProfileId, setEditingPatientProfileId] = useState("");
  const [doctorModal, setDoctorModal] = useState({ open: false, mode: "create", doctor: null });
  const [invitationForm, setInvitationForm] = useState(EMPTY_INVITATION);
  const [lastInvitation, setLastInvitation] = useState(null);
  const [aiConfigModal, setAIConfigModal] = useState({ open: false, mode: "create", config: null });
  const [subscriptionPlanModal, setSubscriptionPlanModal] = useState({ open: false, mode: "create", plan: null });
  const [aiConfigDetail, setAIConfigDetail] = useState(null);
  const operatorDialogTriggerRef = useRef(null);
  const [loading, setLoading] = useState(Boolean(auth));
  const [usersLoading, setUsersLoading] = useState(true);
  const [, setDepartmentsLoading] = useState(true);
  const [departmentCatalogLoading, setDepartmentCatalogLoading] = useState(true);
  const [icdChaptersLoading, setIcdChaptersLoading] = useState(true);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [aiConfigsLoading, setAIConfigsLoading] = useState(true);
  const [subscriptionPlansLoading, setSubscriptionPlansLoading] = useState(true);
  const [facilitiesLoading, setFacilitiesLoading] = useState(true);
  const [patientProfilesLoading, setPatientProfilesLoading] = useState(true);
  const [savingDepartment, setSavingDepartment] = useState(false);
  const [savingIcdChapter, setSavingIcdChapter] = useState(false);
  const [savingFacility, setSavingFacility] = useState(false);
  const [savingPatientProfile, setSavingPatientProfile] = useState(false);
  const [savingDoctor, setSavingDoctor] = useState(false);
  const [savingInvitation, setSavingInvitation] = useState(false);
  const [savingAIConfig, setSavingAIConfig] = useState(false);
  const [savingSubscriptionPlan, setSavingSubscriptionPlan] = useState(false);
  const [globalMessage, setGlobalMessage] = useState(null);
  const [usersMessage, setUsersMessage] = useState(null);
  const [usersLoadError, setUsersLoadError] = useState("");
  const [departmentMessage, setDepartmentMessage] = useState(null);
  const [departmentCatalogLoadError, setDepartmentCatalogLoadError] = useState("");
  const [icdChapterMessage, setIcdChapterMessage] = useState(null);
  const [icdChapterLoadError, setIcdChapterLoadError] = useState("");
  const [facilityMessage, setFacilityMessage] = useState(null);
  const [facilityLoadError, setFacilityLoadError] = useState("");
  const [facilityOverviewLoadError, setFacilityOverviewLoadError] = useState("");
  const [patientProfileMessage, setPatientProfileMessage] = useState(null);
  const [patientProfileLoadError, setPatientProfileLoadError] = useState("");

  useEffect(() => {
    const navigation = adminNavRef.current;
    if (!navigation) return undefined;

    function revealActiveItem() {
      const activeButton = navigation.querySelector("button.active");
      if (!activeButton) return;
      navigation.scrollLeft = Math.max(0, activeButton.offsetLeft - 8);
    }

    revealActiveItem();
    window.addEventListener("resize", revealActiveItem);
    return () => window.removeEventListener("resize", revealActiveItem);
  }, [activeSection]);
  const [doctorMessage, setDoctorMessage] = useState(null);
  const [doctorLoadError, setDoctorLoadError] = useState("");
  const [aiConfigMessage, setAIConfigMessage] = useState(null);
  const [aiConfigLoadError, setAIConfigLoadError] = useState("");
  const [subscriptionPlanMessage, setSubscriptionPlanMessage] = useState(null);
  const [subscriptionPlanLoadError, setSubscriptionPlanLoadError] = useState("");

  const roles = useMemo(() => normalizeRoles(profile?.roles ?? auth?.roles ?? []), [auth, profile]);
  const isAdmin = hasRole(roles, "admin");
  const displayName = profile?.name || profile?.displayName || auth?.email?.split("@")[0] || "Admin";

  function openSection(section) {
    navigate(getAdminSectionPath(section));
  }

  function retryOverviewMetric(section) {
    if (section === "users") loadUsers();
    else if (section === "doctors") loadDoctors();
    else if (section === "ai-configs") loadAIConfigs();
    else if (section === "facilities") loadFacilities();
  }

  const manageableUsers = useMemo(() => users.filter((user) => !isProtectedAdminUser(user)), [users]);
  const pendingApprovalUsers = useMemo(() => manageableUsers.filter(isPendingApprovalUser), [manageableUsers]);

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return manageableUsers.filter((user) => {
      const matchesStatus = userStatusFilter === USER_STATUS_FILTERS.all
        || (userStatusFilter === USER_STATUS_FILTERS.pending && isPendingApprovalUser(user))
        || (userStatusFilter === USER_STATUS_FILTERS.confirmed && !user.isDeleted && isApprovedUser(user))
        || (userStatusFilter === USER_STATUS_FILTERS.deleted && user.isDeleted);
      if (!matchesStatus) return false;
      if (!keyword) return true;

      return [user.email, user.displayName, user.name, user.identityId, user.userId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });
  }, [manageableUsers, search, userStatusFilter]);

  const pendingUsers = pendingApprovalUsers.length;
  const activeAIConfigs = aiConfigs.filter((config) => config.isActive).length;
  const activeSubscriptionPlans = subscriptionPlans.filter((plan) => plan.isActive).length;
  const disabledAIConfigs = aiConfigs.filter((config) => !config.isActive).length;
  const runningAIFeatures = new Set(aiConfigs.filter((config) => config.isActive).map((config) => config.taskType).filter(Boolean)).size;
  const facilityDepartmentOptions = useMemo(() => {
    const activeOptions = facilityDepartments
      .map((item) => ({
        id: item.id ?? item.facilityDepartmentId ?? "",
        facilityId: item.facilityId ?? "",
        departmentId: item.departmentId ?? "",
        label: [item.facilityName, item.departmentName].filter(Boolean).join(" - "),
      }))
      .filter((item) => item.id)
      .map((item) => ({ ...item, label: item.label || item.id }));

    const doctorOptions = doctors
      .filter((doctor) => doctor.facilityDepartmentId)
      .map((doctor) => ({
        id: doctor.facilityDepartmentId,
        facilityId: doctor.facilityId,
        departmentId: doctor.departmentId,
        label: `${doctor.facilityName || "Cơ sở y tế"} - ${doctor.departmentName || "Chuyên khoa"}`,
      }));

    return Array.from(
      new Map([...activeOptions, ...doctorOptions].map((item) => [item.id, item])).values(),
    );
  }, [doctors, facilityDepartments]);

  const aiTaskTypes = useMemo(() => {
    return Array.from(new Set(aiConfigs.map((config) => config.taskType).filter(Boolean))).sort();
  }, [aiConfigs]);

  const aiModels = useMemo(() => {
    return Array.from(new Set(aiConfigs.map((config) => config.model).filter(Boolean))).sort();
  }, [aiConfigs]);

  const aiEnvironments = useMemo(() => {
    return Array.from(new Set(aiConfigs.map(getEnvironment))).sort();
  }, [aiConfigs]);

  const filteredAIConfigs = useMemo(() => {
    const keyword = aiConfigFilters.search.trim().toLowerCase();
    return aiConfigs.filter((config) => {
      const matchesSearch = !keyword || [config.taskType, config.model, config.systemPrompt]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
      const matchesStatus =
        !aiConfigFilters.status ||
        (aiConfigFilters.status === "active" && config.isActive) ||
        (aiConfigFilters.status === "inactive" && !config.isActive);
      const matchesTaskType = !aiConfigFilters.taskType || config.taskType === aiConfigFilters.taskType;
      const matchesModel = !aiConfigFilters.model || config.model === aiConfigFilters.model;
      const matchesEnvironment = !aiConfigFilters.environment || getEnvironment(config) === aiConfigFilters.environment;

      return matchesSearch && matchesStatus && matchesTaskType && matchesModel && matchesEnvironment;
    });
  }, [aiConfigFilters, aiConfigs]);

  useEffect(() => {
    if (!auth) return;
    let active = true;

    Promise.allSettled([
      authApi.me(),
      usersApi.list(1, pageInfo.pageSize),
      medicalDepartmentsApi.listAll(),
      medicalDepartmentsApi.list(1, DEFAULT_DEPARTMENT_PAGE_SIZE, EMPTY_DEPARTMENT_FILTERS),
      icdChaptersApi.list(1, DEFAULT_ICD_CHAPTER_PAGE_SIZE, EMPTY_ICD_CHAPTER_FILTERS),
      doctorManagementApi.list({
        ...initialDoctorView.filters,
        pageNumber: initialDoctorView.pageNumber,
        pageSize: initialDoctorView.pageSize,
      }),
      aiConfigManagementApi.list(1, DEFAULT_AI_CONFIG_PAGE_SIZE),
      medicalFacilitiesApi.list(1, DEFAULT_FACILITY_PAGE_SIZE, EMPTY_FACILITY_FILTERS),
      patientProfilesApi.list(1, patientProfilePageInfo.pageSize),
      facilityDepartmentsApi.active(),
      subscriptionPlansApi.list(),
    ])
      .then(([
        profileResult,
        usersResult,
        departmentResult,
        departmentCatalogResult,
        icdChapterResult,
        doctorResult,
        aiConfigResult,
        facilityResult,
        patientProfileResult,
        facilityDepartmentResult,
        subscriptionPlanResult,
      ]) => {
        if (!active) return;

        if (profileResult.status === "fulfilled") {
          setProfile(profileResult.value.data ?? {});
        } else {
          setGlobalMessage({
            type: "warning",
            text: "Chưa thể đồng bộ thông tin tài khoản quản trị. Một số dữ liệu có thể tạm thời chưa khả dụng.",
          });
        }

        if (usersResult.status === "fulfilled") {
          const data = usersResult.value.data ?? {};
          setUsersLoadError("");
          setUsers(data.items ?? []);
          setPageInfo({
            pageNumber: data.pageNumber ?? 1,
            pageSize: data.pageSize ?? pageInfo.pageSize,
            totalCount: data.totalCount ?? 0,
            totalPages: data.totalPages ?? 1,
          });
        } else {
          setUsersLoadError(USER_LOAD_ERROR_MESSAGE);
        }

        if (departmentResult.status === "fulfilled") {
          setDepartments(getDepartmentItems(departmentResult.value));
        } else {
          setDepartmentMessage({
            type: "warning",
            text: "Chưa tải được dữ liệu chuyên khoa dùng cho các biểu mẫu liên kết.",
          });
        }

        if (departmentCatalogResult.status === "fulfilled") {
          setDepartmentCatalogLoadError("");
          const data = departmentCatalogResult.value.data ?? {};
          if (Array.isArray(data)) {
            setDepartmentCatalog(data);
            setDepartmentPageInfo({
              pageNumber: 1,
              pageSize: DEFAULT_DEPARTMENT_PAGE_SIZE,
              totalCount: data.length,
              totalPages: Math.max(1, Math.ceil(data.length / DEFAULT_DEPARTMENT_PAGE_SIZE)),
            });
          } else {
            setDepartmentCatalog(data.items ?? []);
            setDepartmentPageInfo({
              pageNumber: data.pageNumber ?? 1,
              pageSize: data.pageSize ?? DEFAULT_DEPARTMENT_PAGE_SIZE,
              totalCount: data.totalCount ?? 0,
              totalPages: data.totalPages ?? 1,
            });
          }
        } else {
          setDepartmentCatalogLoadError(DEPARTMENT_LOAD_ERROR_MESSAGE);
        }

        if (icdChapterResult.status === "fulfilled") {
          setIcdChapterLoadError("");
          const data = icdChapterResult.value.data ?? {};
          setIcdChapters(data.items ?? []);
          setIcdChapterPageInfo({
            pageNumber: data.pageNumber ?? 1,
            pageSize: data.pageSize ?? DEFAULT_ICD_CHAPTER_PAGE_SIZE,
            totalCount: data.totalCount ?? 0,
            totalPages: data.totalPages ?? 1,
          });
        } else {
          setIcdChapterLoadError(ICD_CHAPTER_LOAD_ERROR_MESSAGE);
        }

        if (doctorResult.status === "fulfilled") {
          const data = doctorResult.value.data ?? {};
          setDoctorLoadError("");
          setDoctors(data.items ?? []);
          setDoctorPageInfo({
            pageNumber: data.pageNumber ?? initialDoctorView.pageNumber,
            pageSize: data.pageSize ?? initialDoctorView.pageSize,
            totalCount: data.totalCount ?? 0,
            totalPages: data.totalPages ?? 1,
          });
        } else {
          setDoctorLoadError(DOCTOR_LOAD_ERROR_MESSAGE);
        }

        if (aiConfigResult.status === "fulfilled") {
          const data = aiConfigResult.value.data ?? {};
          setAIConfigLoadError("");
          setAIConfigs(data.items ?? []);
          setAIConfigPageInfo({
            pageNumber: data.pageNumber ?? 1,
            pageSize: data.pageSize ?? DEFAULT_AI_CONFIG_PAGE_SIZE,
            totalCount: data.totalCount ?? 0,
            totalPages: data.totalPages ?? 1,
          });
        } else {
          setAIConfigLoadError(AI_CONFIG_LOAD_ERROR_MESSAGE);
        }

        if (facilityResult.status === "fulfilled") {
          setFacilityOverviewLoadError("");
          const data = facilityResult.value.data ?? {};
          setFacilities(data.items ?? []);
          setFacilityPageInfo({
            pageNumber: data.pageNumber ?? 1,
            pageSize: data.pageSize ?? DEFAULT_FACILITY_PAGE_SIZE,
            totalCount: data.totalCount ?? 0,
            totalPages: data.totalPages ?? 1,
          });
        } else {
          setFacilityOverviewLoadError(FACILITY_LOAD_ERROR_MESSAGE);
        }

        if (patientProfileResult.status === "fulfilled") {
          const data = getPagedPayload(patientProfileResult.value);
          setPatientProfileLoadError("");
          setPatientProfiles(data.items);
          setPatientProfilePageInfo({
            pageNumber: data.pageNumber,
            pageSize: data.pageSize || patientProfilePageInfo.pageSize,
            totalCount: data.totalCount,
            totalPages: data.totalPages,
          });
        } else {
          setPatientProfileLoadError(PATIENT_PROFILE_LOAD_ERROR_MESSAGE);
        }

        if (facilityDepartmentResult.status === "fulfilled") {
          const data = facilityDepartmentResult.value.data;
          setFacilityDepartments(Array.isArray(data) ? data : data?.items ?? []);
        } else {
          setDoctorMessage({
            type: "warning",
            text: "Chưa tải được danh sách cơ sở y tế - khoa. Không thể thêm bác sĩ mới.",
          });
        }
        setFacilityLoadError(
          facilityResult.status === "fulfilled" && facilityDepartmentResult.status === "fulfilled"
            ? ""
            : FACILITY_LOAD_ERROR_MESSAGE,
        );

        if (subscriptionPlanResult.status === "fulfilled") {
          setSubscriptionPlanLoadError("");
          setSubscriptionPlans(Array.isArray(subscriptionPlanResult.value.data) ? subscriptionPlanResult.value.data : []);
        } else {
          setSubscriptionPlanLoadError(SUBSCRIPTION_PLAN_LOAD_ERROR_MESSAGE);
        }
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
        setUsersLoading(false);
        setDepartmentsLoading(false);
        setDepartmentCatalogLoading(false);
        setIcdChaptersLoading(false);
        setDoctorsLoading(false);
        setAIConfigsLoading(false);
        setFacilitiesLoading(false);
        setPatientProfilesLoading(false);
        setSubscriptionPlansLoading(false);
      });

    return () => {
      active = false;
    };
  }, [auth, initialDoctorView, pageInfo.pageSize, patientProfilePageInfo.pageSize]);

  useEffect(() => {
    if (!auth || activeSection !== "doctors" || lastDoctorViewSearchRef.current === currentDoctorSearch) return undefined;

    lastDoctorViewSearchRef.current = currentDoctorSearch;
    const nextView = readDoctorViewState(currentDoctorSearch);
    let active = true;

    setDoctorFilters(nextView.filters);
    setDoctorPageInfo((current) => ({
      ...current,
      pageNumber: nextView.pageNumber,
      pageSize: nextView.pageSize,
    }));
    setDoctorsLoading(true);
    setDoctorMessage(null);
    setDoctorLoadError("");

    doctorManagementApi.list({
      ...nextView.filters,
      pageNumber: nextView.pageNumber,
      pageSize: nextView.pageSize,
    })
      .then((response) => {
        if (!active) return;
        const data = response.data ?? {};
        setDoctors(data.items ?? []);
        setDoctorPageInfo({
          pageNumber: data.pageNumber ?? nextView.pageNumber,
          pageSize: data.pageSize ?? nextView.pageSize,
          totalCount: data.totalCount ?? 0,
          totalPages: data.totalPages ?? 1,
        });
      })
      .catch(() => {
        if (!active) return;
        setDoctorLoadError(DOCTOR_LOAD_ERROR_MESSAGE);
      })
      .finally(() => {
        if (active) setDoctorsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeSection, auth, currentDoctorSearch]);

  if (!auth) return <EmptyAuth />;
  if (!loading && !isAdmin) return <AccessDenied auth={auth} roles={roles} />;

  async function loadUsers(pageNumber = pageInfo.pageNumber, pageSize = pageInfo.pageSize) {
    setUsersLoading(true);
    setUsersMessage(null);
    setUsersLoadError("");
    try {
      const response = await usersApi.list(pageNumber, pageSize);
      const data = response.data ?? {};
      setUsers(data.items ?? []);
      setPageInfo({
        pageNumber: data.pageNumber ?? pageNumber,
        pageSize: data.pageSize ?? pageSize,
        totalCount: data.totalCount ?? 0,
        totalPages: data.totalPages ?? 1,
      });
    } catch {
      setUsersLoadError(USER_LOAD_ERROR_MESSAGE);
      showToast({
        type: "error",
        title: "Không tải được danh sách tài khoản",
        message: USER_LOAD_ERROR_MESSAGE,
      });
    } finally {
      setUsersLoading(false);
    }
  }

  async function loadDepartments() {
    setDepartmentsLoading(true);
    try {
      const response = await medicalDepartmentsApi.listAll();
      setDepartments(getDepartmentItems(response));
    } catch {
      setDepartmentMessage({
        type: "warning",
        text: "Chưa tải được dữ liệu chuyên khoa dùng cho các biểu mẫu liên kết.",
      });
    } finally {
      setDepartmentsLoading(false);
    }
  }

  async function loadDepartmentCatalog(
    pageNumber = departmentPageInfo.pageNumber,
    pageSize = departmentPageInfo.pageSize,
    filters = appliedDepartmentFilters,
  ) {
    setDepartmentCatalogLoading(true);
    setDepartmentMessage(null);
    setDepartmentCatalogLoadError("");
    try {
      const response = await medicalDepartmentsApi.list(pageNumber, pageSize, filters);
      const data = response.data ?? {};
      if (Array.isArray(data)) {
        const filtered = filters.search?.trim()
          ? data.filter((department) => (
            [
              department.departmentName,
              department.description,
              department.chapterCode,
              department.id,
            ]
              .filter(Boolean)
              .some((value) => String(value).toLowerCase().includes(filters.search.trim().toLowerCase()))
          ))
          : data;
        const startIndex = (pageNumber - 1) * pageSize;
        setDepartmentCatalog(filtered.slice(startIndex, startIndex + pageSize));
        setDepartmentPageInfo({
          pageNumber,
          pageSize,
          totalCount: filtered.length,
          totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
        });
      } else {
        setDepartmentCatalog(data.items ?? []);
        setDepartmentPageInfo({
          pageNumber: data.pageNumber ?? pageNumber,
          pageSize: data.pageSize ?? pageSize,
          totalCount: data.totalCount ?? 0,
          totalPages: data.totalPages ?? 1,
        });
      }
    } catch {
      setDepartmentCatalogLoadError(DEPARTMENT_LOAD_ERROR_MESSAGE);
    } finally {
      setDepartmentCatalogLoading(false);
    }
  }

  function updateDepartmentFilter(key, value) {
    setDepartmentFilters((current) => ({ ...current, [key]: value }));
  }

  function applyDepartmentFilters(event) {
    event.preventDefault();
    setAppliedDepartmentFilters(departmentFilters);
    setDepartmentPageInfo((current) => ({ ...current, pageNumber: 1 }));
    loadDepartmentCatalog(1, departmentPageInfo.pageSize, departmentFilters);
  }

  function clearDepartmentFilters() {
    setDepartmentFilters(EMPTY_DEPARTMENT_FILTERS);
    setAppliedDepartmentFilters(EMPTY_DEPARTMENT_FILTERS);
    setDepartmentPageInfo((current) => ({ ...current, pageNumber: 1 }));
    loadDepartmentCatalog(1, departmentPageInfo.pageSize, EMPTY_DEPARTMENT_FILTERS);
  }

  function changeDepartmentPageSize(pageSize) {
    setDepartmentPageInfo((current) => ({ ...current, pageNumber: 1, pageSize }));
    loadDepartmentCatalog(1, pageSize, appliedDepartmentFilters);
  }

  async function loadIcdChapters(
    pageNumber = icdChapterPageInfo.pageNumber,
    pageSize = icdChapterPageInfo.pageSize,
    filters = appliedIcdChapterFilters,
  ) {
    setIcdChaptersLoading(true);
    setIcdChapterMessage(null);
    setIcdChapterLoadError("");
    try {
      const response = await icdChaptersApi.list(pageNumber, pageSize, filters);
      const data = response.data ?? {};
      setIcdChapters(data.items ?? []);
      setIcdChapterPageInfo({
        pageNumber: data.pageNumber ?? pageNumber,
        pageSize: data.pageSize ?? pageSize,
        totalCount: data.totalCount ?? 0,
        totalPages: data.totalPages ?? 1,
      });
    } catch {
      setIcdChapterLoadError(ICD_CHAPTER_LOAD_ERROR_MESSAGE);
    } finally {
      setIcdChaptersLoading(false);
    }
  }

  function updateIcdChapterFilter(key, value) {
    setIcdChapterFilters((current) => ({ ...current, [key]: value }));
  }

  function applyIcdChapterFilters(event) {
    event.preventDefault();
    setAppliedIcdChapterFilters(icdChapterFilters);
    setIcdChapterPageInfo((current) => ({ ...current, pageNumber: 1 }));
    loadIcdChapters(1, icdChapterPageInfo.pageSize, icdChapterFilters);
  }

  function clearIcdChapterFilters() {
    setIcdChapterFilters(EMPTY_ICD_CHAPTER_FILTERS);
    setAppliedIcdChapterFilters(EMPTY_ICD_CHAPTER_FILTERS);
    setIcdChapterPageInfo((current) => ({ ...current, pageNumber: 1 }));
    loadIcdChapters(1, icdChapterPageInfo.pageSize, EMPTY_ICD_CHAPTER_FILTERS);
  }

  function changeIcdChapterPageSize(pageSize) {
    setIcdChapterPageInfo((current) => ({ ...current, pageSize, pageNumber: 1 }));
    loadIcdChapters(1, pageSize, appliedIcdChapterFilters);
  }

  async function loadPatientProfiles(
    pageNumber = patientProfilePageInfo.pageNumber,
    pageSize = patientProfilePageInfo.pageSize,
  ) {
    setPatientProfilesLoading(true);
    setPatientProfileMessage(null);
    setPatientProfileLoadError("");
    try {
      const response = await patientProfilesApi.list(pageNumber, pageSize);
      const data = getPagedPayload(response);
      setPatientProfiles(data.items);
      setPatientProfilePageInfo({
        pageNumber: data.pageNumber || pageNumber,
        pageSize: data.pageSize || pageSize,
        totalCount: data.totalCount,
        totalPages: data.totalPages,
      });
    } catch (error) {
      setPatientProfileLoadError(PATIENT_PROFILE_LOAD_ERROR_MESSAGE);
      setPatientProfileMessage({ type: "error", text: error.message });
    } finally {
      setPatientProfilesLoading(false);
    }
  }

  function changePatientProfilePageSize(pageSize) {
    setPatientProfilePageInfo((current) => ({ ...current, pageNumber: 1, pageSize }));
    loadPatientProfiles(1, pageSize);
  }

  function resetPatientProfileForm() {
    setEditingPatientProfileId("");
    setPatientProfileForm(EMPTY_PATIENT_PROFILE);
  }

  function startCreatePatientProfile() {
    setPatientProfileMessage(null);
    resetPatientProfileForm();
  }

  function normalizeDiseaseForForm(disease) {
    return {
      localId: disease.id || crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      id: disease.id ?? "",
      diseaseName: disease.diseaseName ?? "",
      from: disease.from ?? "",
      to: disease.to ?? "",
      note: disease.note ?? "",
    };
  }

  function startEditPatientProfile(profile) {
    setEditingPatientProfileId(profile.id);
    setPatientProfileMessage(null);
    setPatientProfileForm({
      userId: profile.userId ?? "",
      bloodType: profile.bloodType ?? "",
      height: profile.height ?? "",
      weight: profile.weight ?? "",
      allergyNote: profile.allergyNote ?? "",
      chronicDiseases: (profile.chronicDiseases ?? []).map(normalizeDiseaseForForm),
    });
    openSection("patient-profiles");
  }

  function updatePatientProfileDisease(index, key, value) {
    setPatientProfileForm((current) => ({
      ...current,
      chronicDiseases: current.chronicDiseases.map((disease, diseaseIndex) => (
        diseaseIndex === index ? { ...disease, [key]: value } : disease
      )),
    }));
  }

  function addPatientProfileDisease() {
    setPatientProfileForm((current) => ({
      ...current,
      chronicDiseases: [...current.chronicDiseases, createEmptyDisease()],
    }));
  }

  function removePatientProfileDisease(index) {
    setPatientProfileForm((current) => ({
      ...current,
      chronicDiseases: current.chronicDiseases.filter((_, diseaseIndex) => diseaseIndex !== index),
    }));
  }

  function nullableNumber(value, label) {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) return null;
    const numberValue = Number(trimmed);
    if (!Number.isFinite(numberValue) || numberValue < 0) {
      throw new Error(`${label} không hợp lệ.`);
    }
    return numberValue;
  }

  function buildPatientProfilePayload() {
    const chronicDiseases = patientProfileForm.chronicDiseases
      .map((disease) => ({
        id: disease.id || undefined,
        diseaseName: disease.diseaseName.trim(),
        from: disease.from || null,
        to: disease.to || null,
        note: disease.note.trim() || null,
      }))
      .filter((disease) => disease.diseaseName);

    const payload = {
      bloodType: patientProfileForm.bloodType || null,
      height: nullableNumber(patientProfileForm.height, "Chiều cao"),
      weight: nullableNumber(patientProfileForm.weight, "Cân nặng"),
      allergyNote: patientProfileForm.allergyNote.trim() || null,
      chronicDiseases,
    };

    if (!editingPatientProfileId) {
      payload.userId = patientProfileForm.userId.trim();
    }

    return payload;
  }

  async function handleSavePatientProfile(event) {
    event.preventDefault();
    setPatientProfileMessage(null);
    setSavingPatientProfile(true);

    try {
      const payload = buildPatientProfilePayload();
      const response = editingPatientProfileId
        ? await patientProfilesApi.update(editingPatientProfileId, payload)
        : await patientProfilesApi.create(payload);

      showToast({
        type: "success",
        title: editingPatientProfileId ? "Đã cập nhật hồ sơ bệnh nhân" : "Đã tạo hồ sơ bệnh nhân",
        message: response.message || "Dữ liệu hồ sơ bệnh nhân đã được cập nhật.",
      });
      resetPatientProfileForm();
      await loadPatientProfiles(editingPatientProfileId ? patientProfilePageInfo.pageNumber : 1, patientProfilePageInfo.pageSize);
      setPatientProfileMessage({
        type: "success",
        text: response.message || (editingPatientProfileId ? "Đã cập nhật hồ sơ bệnh nhân." : "Đã tạo hồ sơ bệnh nhân."),
      });
    } catch (error) {
      setPatientProfileMessage({ type: "error", text: error.message });
      showToast({ type: "error", title: "Không lưu được hồ sơ bệnh nhân", message: error.message });
    } finally {
      setSavingPatientProfile(false);
    }
  }

  async function handleDeletePatientProfile(profile) {
    const confirmed = await confirmAction({
      title: "Xóa hồ sơ bệnh nhân?",
      message: `Hồ sơ của user ${profile.userId} sẽ bị xóa mềm khỏi danh sách quản trị.`,
      confirmLabel: "Xóa hồ sơ",
      tone: "danger",
    });
    if (!confirmed) return;

    setPatientProfileMessage(null);
    try {
      const response = await patientProfilesApi.remove(profile.id);
      showToast({ type: "success", title: "Đã xóa hồ sơ bệnh nhân", message: response.message || "Danh sách hồ sơ đã được cập nhật." });
      if (editingPatientProfileId === profile.id) resetPatientProfileForm();
      await loadPatientProfiles(patientProfilePageInfo.pageNumber, patientProfilePageInfo.pageSize);
    } catch (error) {
      setPatientProfileMessage({ type: "error", text: error.message });
      showToast({ type: "error", title: "Không xóa được hồ sơ bệnh nhân", message: error.message });
    }
  }

  async function loadFacilities(
    pageNumber = facilityPageInfo.pageNumber,
    pageSize = facilityPageInfo.pageSize,
    filters = appliedFacilityFilters,
  ) {
    setFacilitiesLoading(true);
    setFacilityMessage(null);
    setFacilityLoadError("");
    setFacilityOverviewLoadError("");
    try {
      const [facilityResponse, facilityDepartmentResponse] = await Promise.all([
        medicalFacilitiesApi.list(pageNumber, pageSize, filters),
        facilityDepartmentsApi.active(),
      ]);
      const facilityData = facilityResponse.data ?? {};
      setFacilities(facilityData.items ?? []);
      setFacilityPageInfo({
        pageNumber: facilityData.pageNumber ?? pageNumber,
        pageSize: facilityData.pageSize ?? pageSize,
        totalCount: facilityData.totalCount ?? 0,
        totalPages: facilityData.totalPages ?? 1,
      });
      const data = facilityDepartmentResponse.data;
      setFacilityDepartments(Array.isArray(data) ? data : data?.items ?? []);
    } catch {
      setFacilityLoadError(FACILITY_LOAD_ERROR_MESSAGE);
      setFacilityOverviewLoadError(FACILITY_LOAD_ERROR_MESSAGE);
      showToast({
        type: "error",
        title: "Không tải được danh sách cơ sở y tế",
        message: FACILITY_LOAD_ERROR_MESSAGE,
      });
    } finally {
      setFacilitiesLoading(false);
    }
  }

  function updateFacilityFilter(key, value) {
    setFacilityFilters((current) => ({ ...current, [key]: value }));
  }

  function applyFacilityFilters(event) {
    event.preventDefault();
    setAppliedFacilityFilters(facilityFilters);
    setFacilityPageInfo((current) => ({ ...current, pageNumber: 1 }));
    loadFacilities(1, facilityPageInfo.pageSize, facilityFilters);
  }

  function clearFacilityFilters() {
    setFacilityFilters(EMPTY_FACILITY_FILTERS);
    setAppliedFacilityFilters(EMPTY_FACILITY_FILTERS);
    setFacilityPageInfo((current) => ({ ...current, pageNumber: 1 }));
    loadFacilities(1, facilityPageInfo.pageSize, EMPTY_FACILITY_FILTERS);
  }

  function changeFacilityPageSize(pageSize) {
    setFacilityPageInfo((current) => ({ ...current, pageSize, pageNumber: 1 }));
    loadFacilities(1, pageSize, appliedFacilityFilters);
  }

  async function loadDoctors(pageNumber = doctorPageInfo.pageNumber, filters = doctorFilters) {
    setDoctorsLoading(true);
    setDoctorMessage(null);
    setDoctorLoadError("");
    try {
      const response = await doctorManagementApi.list({
        ...filters,
        pageNumber,
        pageSize: doctorPageInfo.pageSize,
      });
      const data = response.data ?? {};
      setDoctors(data.items ?? []);
      setDoctorPageInfo({
        pageNumber: data.pageNumber ?? pageNumber,
        pageSize: data.pageSize ?? doctorPageInfo.pageSize,
        totalCount: data.totalCount ?? 0,
        totalPages: data.totalPages ?? 1,
      });
    } catch {
      setDoctorLoadError(DOCTOR_LOAD_ERROR_MESSAGE);
      showToast({
        type: "error",
        title: "Không tải được danh sách bác sĩ",
        message: DOCTOR_LOAD_ERROR_MESSAGE,
      });
    } finally {
      setDoctorsLoading(false);
    }
  }

  async function loadAIConfigs(pageNumber = aiConfigPageInfo.pageNumber, pageSize = aiConfigPageInfo.pageSize) {
    setAIConfigsLoading(true);
    setAIConfigMessage(null);
    setAIConfigLoadError("");
    try {
      const response = await aiConfigManagementApi.list(pageNumber, pageSize);
      const data = response.data ?? {};
      setAIConfigs(data.items ?? []);
      setAIConfigPageInfo({
        pageNumber: data.pageNumber ?? pageNumber,
        pageSize: data.pageSize ?? pageSize,
        totalCount: data.totalCount ?? 0,
        totalPages: data.totalPages ?? 1,
      });
    } catch {
      setAIConfigLoadError(AI_CONFIG_LOAD_ERROR_MESSAGE);
      showToast({
        type: "error",
        title: "Không tải được AI configs",
        message: AI_CONFIG_LOAD_ERROR_MESSAGE,
      });
    } finally {
      setAIConfigsLoading(false);
    }
  }

  function updateAIConfigFilter(key, value) {
    setAIConfigFilters((current) => ({ ...current, [key]: value }));
  }

  function handleAIConfigFilterSubmit(event) {
    event.preventDefault();
  }

  function resetAIConfigFilters() {
    setAIConfigFilters(EMPTY_AI_CONFIG_FILTERS);
  }

  function handleAIConfigPageSizeChange(pageSize) {
    setAIConfigPageInfo((current) => ({ ...current, pageSize }));
    loadAIConfigs(1, pageSize);
  }

  function openCreateAIConfig() {
    operatorDialogTriggerRef.current = document.activeElement;
    setAIConfigModal({ open: true, mode: "create", config: null });
  }

  function openEditAIConfig(config) {
    operatorDialogTriggerRef.current = document.activeElement;
    setAIConfigModal({ open: true, mode: "edit", config });
  }

  function openAIConfigDetail(config) {
    operatorDialogTriggerRef.current = document.activeElement;
    setAIConfigDetail(config);
  }

  function closeAIConfigModal() {
    if (savingAIConfig) return;
    setAIConfigModal({ open: false, mode: "create", config: null });
  }

  async function handleSaveAIConfig(payload) {
    setSavingAIConfig(true);
    setAIConfigMessage(null);
    try {
      const response = aiConfigModal.mode === "edit"
        ? await aiConfigManagementApi.update(aiConfigModal.config.id, payload)
        : await aiConfigManagementApi.create(payload);
      const savedConfig = response.data;
      setAIConfigMessage({
        type: "success",
        text: response.message || (aiConfigModal.mode === "edit" ? "Đã cập nhật AI config." : "Đã tạo AI config."),
      });
      showToast({
        type: "success",
        title: aiConfigModal.mode === "edit" ? "Đã cập nhật AI config" : "Đã tạo AI config",
        message: response.message || "AI configuration đã được đồng bộ.",
      });
      setAIConfigModal({ open: false, mode: "create", config: null });
      if (savedConfig?.id && aiConfigModal.mode === "edit") {
        setAIConfigs((current) => current.map((config) => (config.id === savedConfig.id ? savedConfig : config)));
      } else {
        await loadAIConfigs(1);
      }
    } catch (error) {
      setAIConfigMessage({ type: "error", text: error.message });
      showToast({ type: "error", title: "Không lưu được AI config", message: error.message });
    } finally {
      setSavingAIConfig(false);
    }
  }

  async function handleToggleAIConfigStatus(config) {
    setAIConfigMessage(null);
    try {
      const response = await aiConfigManagementApi.setStatus(config.id, !config.isActive);
      const updatedConfig = response.data;
      setAIConfigs((current) => current.map((item) => (item.id === config.id ? (updatedConfig ?? { ...item, isActive: !item.isActive }) : item)));
      showToast({
        type: "success",
        title: (updatedConfig?.isActive ?? !config.isActive) ? "Đã bật AI config" : "Đã tắt AI config",
        message: response.message || "Trạng thái AI config đã được cập nhật.",
      });
    } catch (error) {
      setAIConfigMessage({ type: "error", text: error.message });
      showToast({ type: "error", title: "Không đổi được trạng thái AI config", message: error.message });
    }
  }

  async function handleDeleteAIConfig(config) {
    const confirmed = await confirmAction({
      title: "Xóa AI config?",
      message: `${config.taskType || "Config này"} sẽ bị xóa khỏi AI platform console. Hãy chắc chắn trước khi tiếp tục.`,
      confirmLabel: "Xóa AI config",
      tone: "danger",
    });
    if (!confirmed) return;

    setAIConfigMessage(null);
    try {
      const response = await aiConfigManagementApi.remove(config.id);
      setAIConfigs((current) => current.filter((item) => item.id !== config.id));
      setAIConfigPageInfo((current) => ({ ...current, totalCount: Math.max(0, current.totalCount - 1) }));
      showToast({ type: "success", title: "Đã xóa AI config", message: response.message || "Danh sách AI config đã được cập nhật." });
    } catch (error) {
      setAIConfigMessage({ type: "error", text: error.message });
      showToast({ type: "error", title: "Không xóa được AI config", message: error.message });
    }
  }

  async function loadSubscriptionPlans() {
    setSubscriptionPlansLoading(true);
    setSubscriptionPlanMessage(null);
    setSubscriptionPlanLoadError("");
    try {
      const response = await subscriptionPlansApi.list();
      setSubscriptionPlans(Array.isArray(response.data) ? response.data : []);
    } catch {
      setSubscriptionPlanLoadError(SUBSCRIPTION_PLAN_LOAD_ERROR_MESSAGE);
      showToast({
        type: "error",
        title: "Không tải được gói dịch vụ",
        message: SUBSCRIPTION_PLAN_LOAD_ERROR_MESSAGE,
      });
    } finally {
      setSubscriptionPlansLoading(false);
    }
  }

  function openCreateSubscriptionPlan() {
    operatorDialogTriggerRef.current = document.activeElement;
    setSubscriptionPlanModal({ open: true, mode: "create", plan: null });
  }

  function openEditSubscriptionPlan(plan) {
    operatorDialogTriggerRef.current = document.activeElement;
    setSubscriptionPlanModal({ open: true, mode: "edit", plan });
  }

  function closeSubscriptionPlanModal() {
    if (savingSubscriptionPlan) return;
    setSubscriptionPlanModal({ open: false, mode: "create", plan: null });
  }

  async function handleSaveSubscriptionPlan(payload) {
    setSavingSubscriptionPlan(true);
    setSubscriptionPlanMessage(null);
    try {
      const response = subscriptionPlanModal.mode === "edit"
        ? await subscriptionPlansApi.update(subscriptionPlanModal.plan.id, payload)
        : await subscriptionPlansApi.create(payload);
      const savedPlan = response.data;
      setSubscriptionPlanModal({ open: false, mode: "create", plan: null });
      setSubscriptionPlanMessage({
        type: "success",
        text: response.message || (subscriptionPlanModal.mode === "edit" ? "Đã cập nhật gói dịch vụ." : "Đã tạo gói dịch vụ."),
      });
      showToast({
        type: "success",
        title: subscriptionPlanModal.mode === "edit" ? "Đã cập nhật gói" : "Đã tạo gói",
        message: response.message || "Danh sách gói dịch vụ đã được đồng bộ.",
      });
      if (savedPlan?.id && subscriptionPlanModal.mode === "edit") {
        setSubscriptionPlans((current) => current.map((plan) => (plan.id === savedPlan.id ? savedPlan : plan)));
      } else {
        await loadSubscriptionPlans();
      }
    } catch {
      const message = "Không thể lưu gói dịch vụ lúc này. Vui lòng thử lại.";
      setSubscriptionPlanMessage({ type: "error", text: message });
      showToast({ type: "error", title: "Không lưu được gói dịch vụ", message });
    } finally {
      setSavingSubscriptionPlan(false);
    }
  }

  async function handleToggleSubscriptionPlanStatus(plan) {
    setSubscriptionPlanMessage(null);
    try {
      const response = await subscriptionPlansApi.setStatus(plan.id, !plan.isActive);
      const updatedPlan = response.data ?? { ...plan, isActive: !plan.isActive };
      setSubscriptionPlans((current) => current.map((item) => (item.id === plan.id ? updatedPlan : item)));
      showToast({
        type: "success",
        title: updatedPlan.isActive ? "Đã mở bán gói" : "Đã tạm ẩn gói",
        message: response.message || "Trạng thái gói dịch vụ đã được cập nhật.",
      });
    } catch {
      const message = "Không thể cập nhật trạng thái gói lúc này. Vui lòng thử lại.";
      setSubscriptionPlanMessage({ type: "error", text: message });
      showToast({ type: "error", title: "Không đổi được trạng thái gói", message });
    }
  }

  async function handleDeleteSubscriptionPlan(plan) {
    const confirmed = await confirmAction({
      title: "Xóa gói dịch vụ?",
      message: `${plan.planName || "Gói này"} sẽ bị xóa khỏi danh sách quản trị. Nếu gói đang có người dùng, hệ thống có thể từ chối thao tác này.`,
      confirmLabel: "Xóa gói",
      tone: "danger",
    });
    if (!confirmed) return;

    setSubscriptionPlanMessage(null);
    try {
      const response = await subscriptionPlansApi.remove(plan.id);
      setSubscriptionPlans((current) => current.filter((item) => item.id !== plan.id));
      showToast({ type: "success", title: "Đã xóa gói dịch vụ", message: response.message || "Danh sách gói đã được cập nhật." });
    } catch {
      const message = "Không thể xóa gói dịch vụ lúc này. Vui lòng thử lại.";
      setSubscriptionPlanMessage({ type: "error", text: message });
      showToast({ type: "error", title: "Không xóa được gói dịch vụ", message });
    }
  }

  function updateDoctorFilter(key, value) {
    setDoctorFilters((current) => ({ ...current, [key]: value }));
  }

  function handleDoctorFilterSubmit(event) {
    event.preventDefault();
    navigate(getDoctorViewPath(doctorFilters, 1, doctorPageInfo.pageSize));
  }

  function resetDoctorFilters() {
    setDoctorFilters(EMPTY_DOCTOR_FILTERS);
    navigate("/app/admin/doctors");
  }

  function openCreateDoctor() {
    operatorDialogTriggerRef.current = document.activeElement;
    setDoctorModal({ open: true, mode: "create", doctor: null });
  }

  function openEditDoctor(doctor) {
    operatorDialogTriggerRef.current = document.activeElement;
    setDoctorModal({ open: true, mode: "edit", doctor });
  }

  function closeDoctorModal() {
    if (savingDoctor) return;
    setDoctorModal({ open: false, mode: "create", doctor: null });
  }

  async function handleSaveDoctor(payload) {
    setSavingDoctor(true);
    setDoctorMessage(null);
    try {
      const response = doctorModal.mode === "edit"
        ? await doctorManagementApi.update(doctorModal.doctor.id, payload)
        : await doctorManagementApi.create(payload);
      const savedDoctor = response.data;
      setDoctorMessage({
        type: "success",
        text: response.message || (doctorModal.mode === "edit" ? "Đã cập nhật bác sĩ." : "Đã thêm bác sĩ."),
      });
      showToast({
        type: "success",
        title: doctorModal.mode === "edit" ? "Đã cập nhật bác sĩ" : "Đã thêm bác sĩ",
        message: response.message || "Danh sách bác sĩ đã được cập nhật.",
      });
      setDoctorModal({ open: false, mode: "create", doctor: null });
      if (savedDoctor?.id && doctorModal.mode === "edit") {
        setDoctors((current) => current.map((doctor) => (doctor.id === savedDoctor.id ? savedDoctor : doctor)));
      } else {
        await loadDoctors(1);
      }
    } catch (error) {
      setDoctorMessage({ type: "error", text: error.message });
      showToast({ type: "error", title: "Không lưu được bác sĩ", message: error.message });
    } finally {
      setSavingDoctor(false);
    }
  }

  async function handleToggleDoctorStatus(doctor) {
    setDoctorMessage(null);
    try {
      const response = await doctorManagementApi.setStatus(doctor.id, !doctor.isActive);
      const updatedDoctor = response.data;
      setDoctors((current) => current.map((item) => (item.id === doctor.id ? (updatedDoctor ?? { ...item, isActive: !item.isActive }) : item)));
      showToast({
        type: "success",
        title: (updatedDoctor?.isActive ?? !doctor.isActive) ? "Đã kích hoạt bác sĩ" : "Đã tạm ẩn bác sĩ",
        message: response.message || "Trạng thái bác sĩ đã được cập nhật.",
      });
    } catch (error) {
      setDoctorMessage({ type: "error", text: error.message });
      showToast({ type: "error", title: "Không đổi được trạng thái", message: error.message });
    }
  }

  async function handleDeleteDoctor(doctor) {
    const confirmed = await confirmAction({
      title: "Xóa bác sĩ?",
      message: `${doctor.fullName || "Bác sĩ này"} sẽ bị xóa khỏi danh sách quản trị. Hãy chắc chắn trước khi tiếp tục.`,
      confirmLabel: "Xóa bác sĩ",
      tone: "danger",
    });
    if (!confirmed) return;

    setDoctorMessage(null);
    try {
      const response = await doctorManagementApi.remove(doctor.id);
      setDoctors((current) => current.filter((item) => item.id !== doctor.id));
      setDoctorPageInfo((current) => ({ ...current, totalCount: Math.max(0, current.totalCount - 1) }));
      showToast({ type: "success", title: "Đã xóa bác sĩ", message: response.message || "Danh sách bác sĩ đã được cập nhật." });
    } catch (error) {
      setDoctorMessage({ type: "error", text: error.message });
      showToast({ type: "error", title: "Không xóa được bác sĩ", message: error.message });
    }
  }

  async function handleDeleteUser(userId) {
    const targetUser = users.find((user) => String(user.identityId || user.userId || user.id) === String(userId));
    if (targetUser && isProtectedAdminUser(targetUser)) {
      const protectedMessage = "Tài khoản quản trị hệ thống được bảo vệ và không thể xóa tại màn hình này.";
      setUsersMessage({ type: "error", text: protectedMessage });
      showToast({ type: "error", title: "Không thể xóa tài khoản quản trị", message: protectedMessage });
      return;
    }

    const confirmed = await confirmAction({
      title: "Xóa người dùng?",
      message: "Tài khoản này sẽ bị xóa khỏi danh sách quản trị. Hãy chắc chắn trước khi tiếp tục.",
      confirmLabel: "Xóa người dùng",
      tone: "danger",
    });
    if (!confirmed) return;

    setUsersMessage(null);
    try {
      const response = await usersApi.remove(userId);
      setUsersMessage({ type: "success", text: response.message || "Đã xóa người dùng." });
      showToast({ type: "success", title: "Đã xóa người dùng", message: response.message || "Danh sách đã được cập nhật." });
      await loadUsers();
    } catch (error) {
      setUsersMessage({ type: "error", text: error.message });
    }
  }

  function startEditDepartment(department) {
    setEditingDepartmentId(department.id);
    setDepartmentForm({
      departmentName: department.departmentName ?? "",
      description: department.description ?? "",
      chapterCode: department.chapterCode ?? "",
    });
    openSection("departments");
  }

  function resetDepartmentForm() {
    setEditingDepartmentId("");
    setDepartmentForm(EMPTY_DEPARTMENT);
  }

  async function handleSaveDepartment(event) {
    event.preventDefault();
    setSavingDepartment(true);
    setDepartmentMessage(null);
    try {
      const response = editingDepartmentId
        ? await medicalDepartmentsApi.update(editingDepartmentId, departmentForm)
        : await medicalDepartmentsApi.create(departmentForm);
      const successMessage = {
        type: "success",
        text: response.message || (editingDepartmentId ? "Đã cập nhật chuyên khoa." : "Đã tạo chuyên khoa."),
      };
      resetDepartmentForm();
      await Promise.all([
        loadDepartments(),
        loadDepartmentCatalog(departmentPageInfo.pageNumber, departmentPageInfo.pageSize, appliedDepartmentFilters),
      ]);
      setDepartmentMessage(successMessage);
    } catch {
      setDepartmentMessage({ type: "error", text: "Không thể lưu chuyên khoa lúc này. Vui lòng thử lại." });
    } finally {
      setSavingDepartment(false);
    }
  }

  async function handleDeleteDepartment(id) {
    const confirmed = await confirmAction({
      title: "Xóa chuyên khoa?",
      message: "Chuyên khoa sẽ bị xóa khỏi danh mục. Người dùng có thể không còn thấy lựa chọn này.",
      confirmLabel: "Xóa chuyên khoa",
      tone: "danger",
    });
    if (!confirmed) return;

    setDepartmentMessage(null);
    try {
      const response = await medicalDepartmentsApi.remove(id);
      await Promise.all([
        loadDepartments(),
        loadDepartmentCatalog(departmentPageInfo.pageNumber, departmentPageInfo.pageSize, appliedDepartmentFilters),
      ]);
      setDepartmentMessage({ type: "success", text: response.message || "Đã xóa chuyên khoa." });
      showToast({ type: "success", title: "Đã xóa chuyên khoa", message: response.message || "Danh mục đã được cập nhật." });
    } catch {
      setDepartmentMessage({ type: "error", text: "Không thể xóa chuyên khoa lúc này. Vui lòng thử lại." });
    }
  }

  function getIcdChapterId(chapter) {
    return chapter.id ?? chapter.icdChapterId ?? "";
  }

  function getIcdChapterCode(chapter) {
    return chapter.chapterCode ?? chapter.code ?? chapter.icdCode ?? "";
  }

  function startEditIcdChapter(chapter) {
    setEditingIcdChapterId(getIcdChapterId(chapter));
    setIcdChapterForm({
      chapterCode: getIcdChapterCode(chapter),
      chapterName: chapter.chapterName ?? chapter.name ?? chapter.title ?? "",
      keywordWeights: JSON.stringify(chapter.keywordWeights ?? {}, null, 2),
    });
    openSection("icd-chapters");
  }

  function resetIcdChapterForm() {
    setEditingIcdChapterId("");
    setIcdChapterForm(EMPTY_ICD_CHAPTER);
  }

  function buildIcdChapterPayload() {
    const chapterCode = icdChapterForm.chapterCode.trim();
    const chapterName = icdChapterForm.chapterName.trim();
    if (!chapterCode || !chapterName) {
      throw new Error("Vui lòng nhập mã và tên ICD Chapter.");
    }
    let keywordWeights;
    try {
      keywordWeights = JSON.parse(icdChapterForm.keywordWeights || "{}");
    } catch {
      throw new Error("Danh sách trọng số từ khóa chưa đúng định dạng.");
    }
    if (!keywordWeights || Array.isArray(keywordWeights) || typeof keywordWeights !== "object"
      || Object.values(keywordWeights).some((value) => !Number.isInteger(value))) {
      throw new Error("Mỗi từ khóa cần có điểm trọng số là số nguyên.");
    }
    return { chapterCode, chapterName, keywordWeights };
  }

  async function handleViewIcdChapter(chapter) {
    const id = getIcdChapterId(chapter);
    if (!id) {
      setIcdChapterMessage({ type: "error", text: "Không thể xác định chương ICD cần tải." });
      return;
    }

    setIcdChapterMessage(null);
    try {
      const response = await icdChaptersApi.get(id);
      startEditIcdChapter(response.data ?? chapter);
      setIcdChapterMessage({ type: "success", text: response.message || "Đã tải chi tiết ICD Chapter." });
    } catch {
      setIcdChapterMessage({ type: "error", text: "Không thể tải chi tiết chương ICD lúc này. Vui lòng thử lại." });
    }
  }

  async function handleSaveIcdChapter(event) {
    event.preventDefault();
    setSavingIcdChapter(true);
    setIcdChapterMessage(null);
    try {
      const payload = buildIcdChapterPayload();
      const response = editingIcdChapterId
        ? await icdChaptersApi.update(editingIcdChapterId, payload)
        : await icdChaptersApi.create(payload);
      const successMessage = response.message
        || (editingIcdChapterId ? "Đã cập nhật chương ICD." : "Đã tạo chương ICD.");
      const targetPage = editingIcdChapterId ? icdChapterPageInfo.pageNumber : 1;
      resetIcdChapterForm();
      await loadIcdChapters(targetPage, icdChapterPageInfo.pageSize);
      setIcdChapterMessage({
        type: "success",
        text: successMessage,
      });
    } catch {
      setIcdChapterMessage({ type: "error", text: "Không thể lưu chương ICD lúc này. Vui lòng thử lại." });
    } finally {
      setSavingIcdChapter(false);
    }
  }

  async function handleDeleteIcdChapter(chapter) {
    const id = getIcdChapterId(chapter);
    if (!id) {
      setIcdChapterMessage({ type: "error", text: "Không thể xác định chương ICD cần xóa." });
      return;
    }

    const confirmed = await confirmAction({
      title: "Xóa ICD Chapter?",
      message: `${getIcdChapterCode(chapter) || "ICD Chapter này"} sẽ bị xóa khỏi danh mục lâm sàng.`,
      confirmLabel: "Xóa ICD Chapter",
      tone: "danger",
    });
    if (!confirmed) return;

    setIcdChapterMessage(null);
    try {
      const response = await icdChaptersApi.remove(id);
      const successMessage = response.message || "Đã xóa chương ICD.";
      if (editingIcdChapterId === id) resetIcdChapterForm();
      await loadIcdChapters(icdChapterPageInfo.pageNumber, icdChapterPageInfo.pageSize);
      setIcdChapterMessage({ type: "success", text: successMessage });
      showToast({ type: "success", title: "Đã xóa chương ICD", message: response.message || "Danh mục đã được cập nhật." });
    } catch {
      setIcdChapterMessage({ type: "error", text: "Không thể xóa chương ICD lúc này. Vui lòng thử lại." });
    }
  }

  async function handleCreateInvitation(event) {
    event.preventDefault();
    const normalizedEmail = invitationForm.email.trim().toLowerCase();
    const registeredUser = users.find(
      (user) => String(user.email ?? "").trim().toLowerCase() === normalizedEmail,
    );
    const selectedDoctor = doctors.find((doctor) => doctor.id === invitationForm.doctorId);

    if (registeredUser) {
      setDoctorMessage({
        type: "error",
        text: "Email này đã có tài khoản trong hệ thống. Hãy dùng email chưa đăng ký.",
      });
      return;
    }

    if (selectedDoctor?.userId) {
      setDoctorMessage({
        type: "error",
        text: "Hồ sơ bác sĩ đã được liên kết với tài khoản và không thể nhận invitation mới.",
      });
      return;
    }

    setSavingInvitation(true);
    setDoctorMessage(null);
    try {
      const payload = { email: normalizedEmail };
      if (invitationForm.doctorId) payload.doctorId = invitationForm.doctorId;
      const response = await doctorInvitationsApi.create(payload);
      setLastInvitation(response.data ?? null);
      setInvitationForm(EMPTY_INVITATION);
      setDoctorMessage({
        type: "success",
        text: response.message || "Đã tạo và gửi lời mời đăng ký bác sĩ.",
      });
    } catch (error) {
      setDoctorMessage({ type: "error", text: error.message });
    } finally {
      setSavingInvitation(false);
    }
  }

  async function handleRevokeInvitation() {
    if (!lastInvitation?.id) return;
    setSavingInvitation(true);
    setDoctorMessage(null);
    try {
      const response = await doctorInvitationsApi.revoke(lastInvitation.id);
      setLastInvitation((current) => current ? { ...current, status: "Revoked" } : current);
      setDoctorMessage({ type: "success", text: response.message || "Đã thu hồi lời mời." });
    } catch (error) {
      setDoctorMessage({ type: "error", text: error.message });
    } finally {
      setSavingInvitation(false);
    }
  }

  function toggleFacilityDepartment(departmentId) {
    setFacilityForm((current) => ({
      ...current,
      departmentIds: current.departmentIds.includes(departmentId)
        ? current.departmentIds.filter((id) => id !== departmentId)
        : [...current.departmentIds, departmentId],
    }));
  }

  function startEditFacility(facility) {
    setEditingFacilityId(facility.id);
    setFacilityMessage(null);
    setFacilityForm({
      facilityName: facility.facilityName ?? "",
      address: facility.address ?? "",
      latitude: facility.latitude ?? "",
      longitude: facility.longitude ?? "",
      phone: facility.phone ?? "",
      website: facility.website ?? "",
      imageUrl: facility.imageUrl ?? facility.thumbnailUrl ?? facility.photoUrl ?? "",
      openingHours: facility.openingHours ?? "",
      facilityType: facility.facilityType ?? "",
      isActive: facility.isActive ?? true,
      departmentIds: getFacilityDepartmentIds(facility, facilityDepartments),
    });
    openSection("facilities");
  }

  function resetFacilityForm() {
    setEditingFacilityId("");
    setFacilityForm(EMPTY_FACILITY);
  }

  function buildFacilityPayload() {
    const latitude = parseOptionalCoordinate(facilityForm.latitude, -90, 90);
    const longitude = parseOptionalCoordinate(facilityForm.longitude, -180, 180);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      throw new Error("Tọa độ không hợp lệ. Vĩ độ phải từ -90 đến 90, kinh độ phải từ -180 đến 180.");
    }

    return {
      facilityName: facilityForm.facilityName.trim(),
      address: facilityForm.address.trim(),
      latitude,
      longitude,
      phone: facilityForm.phone.trim() || null,
      website: facilityForm.website.trim() || null,
      imageUrl: facilityForm.imageUrl.trim() || null,
      openingHours: facilityForm.openingHours.trim() || null,
      facilityType: facilityForm.facilityType.trim() || null,
      isActive: Boolean(facilityForm.isActive),
      departmentIds: facilityForm.departmentIds,
    };
  }

  async function handleSaveFacility(event) {
    event.preventDefault();
    setFacilityMessage(null);

    if (facilityForm.departmentIds.length === 0) {
      setFacilityMessage({
        type: "error",
        text: "Hãy chọn ít nhất một chuyên khoa để có thể thêm bác sĩ.",
      });
      return;
    }

    setSavingFacility(true);
    try {
      const payload = buildFacilityPayload();
      const response = editingFacilityId
        ? await medicalFacilitiesApi.update(editingFacilityId, payload)
        : await medicalFacilitiesApi.create(payload);
      showToast({
        type: "success",
        title: editingFacilityId ? "Đã cập nhật cơ sở y tế" : "Đã tạo cơ sở y tế",
        message: "Dữ liệu cơ sở y tế đã được cập nhật.",
      });
      resetFacilityForm();
      await loadFacilities(editingFacilityId ? facilityPageInfo.pageNumber : 1, facilityPageInfo.pageSize);
      setFacilityMessage({
        type: "success",
        text: response.message || (editingFacilityId ? "Đã cập nhật cơ sở y tế." : "Đã tạo cơ sở y tế và liên kết chuyên khoa."),
      });
    } catch (error) {
      setFacilityMessage({ type: "error", text: error.message });
      showToast({ type: "error", title: "Không lưu được cơ sở y tế", message: error.message });
    } finally {
      setSavingFacility(false);
    }
  }

  async function handleToggleFacilityStatus(facility) {
    setFacilityMessage(null);
    try {
      const nextStatus = !isFacilityActive(facility);
      const response = await medicalFacilitiesApi.setStatus(facility.id, nextStatus);
      const updatedFacility = response.data ?? { ...facility, isActive: nextStatus };
      setFacilities((current) => current.map((item) => (item.id === facility.id ? updatedFacility : item)));
      showToast({
        type: "success",
        title: updatedFacility.isActive ? "Đã bật cơ sở y tế" : "Đã tắt cơ sở y tế",
        message: response.message || "Trạng thái cơ sở y tế đã được cập nhật.",
      });
      await loadFacilities(facilityPageInfo.pageNumber, facilityPageInfo.pageSize);
    } catch (error) {
      setFacilityMessage({ type: "error", text: error.message });
      showToast({ type: "error", title: "Không đổi được trạng thái cơ sở y tế", message: error.message });
    }
  }

  async function handleDeleteFacility(facility) {
    const confirmed = await confirmAction({
      title: "Xóa cơ sở y tế?",
      message: `${facility.facilityName || "Cơ sở này"} sẽ bị xóa khỏi danh sách quản trị. Nếu cơ sở đang có bác sĩ hoặc đánh giá liên quan, hệ thống có thể từ chối thao tác này.`,
      confirmLabel: "Xóa cơ sở",
      tone: "danger",
    });
    if (!confirmed) return;

    setFacilityMessage(null);
    try {
      const response = await medicalFacilitiesApi.remove(facility.id);
      setFacilities((current) => current.filter((item) => item.id !== facility.id));
      showToast({ type: "success", title: "Đã xóa cơ sở y tế", message: response.message || "Danh sách cơ sở y tế đã được cập nhật." });
      if (editingFacilityId === facility.id) resetFacilityForm();
      await loadFacilities(facilityPageInfo.pageNumber, facilityPageInfo.pageSize);
    } catch (error) {
      setFacilityMessage({ type: "error", text: error.message });
      showToast({ type: "error", title: "Không xóa được cơ sở y tế", message: error.message });
    }
  }

  async function handleLogout() {
    await logoutUser({ onClear: () => setAuth(null), redirect: navigate });
  }

  return (
    <main className="workspace-root admin-operator">
      <section className="admin-page">
        <div className="container admin-shell">
          <aside className="admin-sidebar">
            <a className="brand" href="/">
              <span className="brand-mark" aria-hidden="true">
                <img src="/logo.svg" alt="" width="36" height="36" />
              </span>
              <span>MediMate AI</span>
            </a>

            <nav ref={adminNavRef} className="admin-nav" aria-label="Điều hướng admin">
              {ADMIN_NAV_ITEMS.map((item) => {
                const Icon = ADMIN_NAV_ICONS[item.icon];
                const section = item.id.replace("admin.", "");
                return (
                  <button
                    className={activeSection === section ? "active" : ""}
                    type="button"
                    key={item.id}
                    onClick={() => openSection(section)}
                  >
                    <span className="admin-nav-icon"><Icon size={17} /></span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="admin-session-card">
              <span>Phiên quản trị</span>
              <strong>{formatRoles(roles)}</strong>
              <small>{auth.email}</small>
              <button className="btn btn-dark btn-small" type="button" onClick={handleLogout}>Đăng xuất</button>
            </div>
          </aside>

          <div className="admin-main">
            <h1 className="sr-only">{activeAdminItem?.label ?? "Quản trị hệ thống"}</h1>
            <header className="admin-topbar">
              <div className="admin-topbar-context">
                <span>Không gian quản trị</span>
                <strong>{activeAdminItem?.label ?? "Quản trị hệ thống"}</strong>
              </div>
              <div className="admin-top-profile">
                <div className="admin-profile-chip">
                  <span>{displayName.slice(0, 1).toUpperCase()}</span>
                  <div>
                    <strong>{displayName}</strong>
                    <small>{formatRoles(roles)}</small>
                  </div>
                </div>
              </div>
            </header>

            <ApiMessage message={globalMessage} />

            {activeSection === "overview" && (
              <AdminOverviewSection
                aiConfigsError={aiConfigLoadError}
                aiConfigsLoading={aiConfigsLoading}
                aiConfigTotalCount={aiConfigPageInfo.totalCount}
                doctorsError={doctorLoadError}
                doctorsLoading={doctorsLoading}
                doctorTotalCount={doctorPageInfo.totalCount}
                facilitiesError={facilityOverviewLoadError}
                facilitiesLoading={facilitiesLoading}
                facilityTotalCount={facilityPageInfo.totalCount}
                usersError={usersLoadError}
                usersLoading={usersLoading}
                userTotalCount={pageInfo.totalCount}
                onOpenSection={openSection}
                onRetryMetric={retryOverviewMetric}
              />
            )}

            {activeSection === "users" && (
              <AdminUsersSection
                error={usersLoadError}
                isApproved={isApprovedUser}
                loading={usersLoading}
                message={usersMessage}
                onDelete={handleDeleteUser}
                onLoadPage={loadUsers}
                onPageSizeChange={(pageSize) => loadUsers(1, pageSize)}
                onSearchChange={setSearch}
                onStatusFilterChange={setUserStatusFilter}
                pageInfo={pageInfo}
                pendingCount={pendingUsers}
                rows={filteredUsers}
                search={search}
                statusFilter={userStatusFilter}
                statusLabel={statusLabel}
                totalVisibleCount={manageableUsers.length}
              />
            )}

            {activeSection === "doctors" && (
              <AdminDoctorsSection
                departments={departments}
                doctors={doctors}
                error={doctorLoadError}
                facilities={facilities}
                facilitiesLoading={facilitiesLoading}
                filters={doctorFilters}
                invitation={invitationForm}
                invitationMessage={doctorMessage}
                lastInvitation={lastInvitation}
                loading={doctorsLoading}
                pageInfo={doctorPageInfo}
                savingInvitation={savingInvitation}
                onCreate={openCreateDoctor}
                onDelete={handleDeleteDoctor}
                onEdit={openEditDoctor}
                onFilterChange={updateDoctorFilter}
                onFilterReset={resetDoctorFilters}
                onFilterSubmit={handleDoctorFilterSubmit}
                onInvitationChange={(key, value) => setInvitationForm((current) => ({ ...current, [key]: value }))}
                onInvitationSubmit={handleCreateInvitation}
                onLoad={loadDoctors}
                onNavigatePage={(pageNumber) => navigate(getDoctorViewPath(doctorFilters, pageNumber, doctorPageInfo.pageSize))}
                onPageSizeChange={(pageSize) => setDoctorPageInfo((current) => ({ ...current, pageSize }))}
                onRevokeInvitation={handleRevokeInvitation}
                onToggleStatus={handleToggleDoctorStatus}
              />
            )}

            {activeSection === "ai-configs" && (
              <AdminAIConfigsSection
                activeCount={activeAIConfigs}
                configs={filteredAIConfigs}
                disabledCount={disabledAIConfigs}
                environments={aiEnvironments}
                error={aiConfigLoadError}
                featureCount={runningAIFeatures}
                filters={aiConfigFilters}
                loading={aiConfigsLoading}
                message={aiConfigMessage}
                models={aiModels}
                pageInfo={aiConfigPageInfo}
                taskTypes={aiTaskTypes}
                onCreate={openCreateAIConfig}
                onDelete={handleDeleteAIConfig}
                onEdit={openEditAIConfig}
                onFilterChange={updateAIConfigFilter}
                onFilterReset={resetAIConfigFilters}
                onFilterSubmit={handleAIConfigFilterSubmit}
                onLoadPage={loadAIConfigs}
                onPageSizeChange={handleAIConfigPageSizeChange}
                onToggleStatus={handleToggleAIConfigStatus}
                onView={openAIConfigDetail}
              />
            )}

            {activeSection === "subscriptions" && (
              <AdminSubscriptionsSection
                activeCount={activeSubscriptionPlans}
                error={subscriptionPlanLoadError}
                loading={subscriptionPlansLoading}
                message={subscriptionPlanMessage}
                plans={subscriptionPlans}
                onCreate={openCreateSubscriptionPlan}
                onDelete={handleDeleteSubscriptionPlan}
                onEdit={openEditSubscriptionPlan}
                onReload={loadSubscriptionPlans}
                onToggleStatus={handleToggleSubscriptionPlanStatus}
              />
            )}

            {activeSection === "departments" && (
              <AdminDepartmentsSection
                allDepartmentsCount={departmentPageInfo.totalCount || departments.length}
                departments={departmentCatalog}
                editingDepartmentId={editingDepartmentId}
                error={departmentCatalogLoadError}
                filters={departmentFilters}
                form={departmentForm}
                loading={departmentCatalogLoading}
                message={departmentMessage}
                pageInfo={departmentPageInfo}
                saving={savingDepartment}
                onApplyFilters={applyDepartmentFilters}
                onClearFilters={clearDepartmentFilters}
                onDelete={handleDeleteDepartment}
                onEdit={startEditDepartment}
                onFilterChange={updateDepartmentFilter}
                onFormChange={(key, value) => setDepartmentForm((current) => ({ ...current, [key]: value }))}
                onLoadPage={(pageNumber) => loadDepartmentCatalog(pageNumber, departmentPageInfo.pageSize, appliedDepartmentFilters)}
                onPageSizeChange={changeDepartmentPageSize}
                onReload={() => {
                  loadDepartments();
                  loadDepartmentCatalog(departmentPageInfo.pageNumber, departmentPageInfo.pageSize, appliedDepartmentFilters);
                }}
                onReset={resetDepartmentForm}
                onSubmit={handleSaveDepartment}
              />
            )}

            {activeSection === "icd-chapters" && (
              <AdminICDChaptersSection
                chapters={icdChapters}
                editingChapterId={editingIcdChapterId}
                error={icdChapterLoadError}
                filters={icdChapterFilters}
                form={icdChapterForm}
                loading={icdChaptersLoading}
                message={icdChapterMessage}
                pageInfo={icdChapterPageInfo}
                saving={savingIcdChapter}
                onDelete={handleDeleteIcdChapter}
                onEdit={startEditIcdChapter}
                onApplyFilters={applyIcdChapterFilters}
                onClearFilters={clearIcdChapterFilters}
                onFilterChange={updateIcdChapterFilter}
                onFormChange={(key, value) => setIcdChapterForm((current) => ({ ...current, [key]: value }))}
                onLoadPage={(pageNumber) => loadIcdChapters(pageNumber, icdChapterPageInfo.pageSize)}
                onPageSizeChange={changeIcdChapterPageSize}
                onReload={() => loadIcdChapters(icdChapterPageInfo.pageNumber, icdChapterPageInfo.pageSize)}
                onReset={resetIcdChapterForm}
                onSubmit={handleSaveIcdChapter}
                onView={handleViewIcdChapter}
              />
            )}
            {activeSection === "clinical-questions" && (
              <AdminClinicalCatalogSection config={QUESTION_CATALOG_CONFIG} icdChapters={icdChapters} service={clinicalQuestionsApi} />
            )}

            {activeSection === "patient-profiles" && (
              <AdminPatientProfilesSection
                editingProfileId={editingPatientProfileId}
                error={patientProfileLoadError}
                form={patientProfileForm}
                loading={patientProfilesLoading}
                message={patientProfileMessage}
                pageInfo={patientProfilePageInfo}
                profiles={patientProfiles}
                saving={savingPatientProfile}
                search={patientProfileSearch}
                onAddDisease={addPatientProfileDisease}
                onCreate={startCreatePatientProfile}
                onDelete={handleDeletePatientProfile}
                onEdit={startEditPatientProfile}
                onFieldChange={(key, value) => setPatientProfileForm((current) => ({ ...current, [key]: value }))}
                onLoadPage={(pageNumber) => loadPatientProfiles(pageNumber, patientProfilePageInfo.pageSize)}
                onPageSizeChange={changePatientProfilePageSize}
                onReload={() => loadPatientProfiles(patientProfilePageInfo.pageNumber, patientProfilePageInfo.pageSize)}
                onRemoveDisease={removePatientProfileDisease}
                onReset={resetPatientProfileForm}
                onSearchChange={setPatientProfileSearch}
                onSubmit={handleSavePatientProfile}
                onUpdateDisease={updatePatientProfileDisease}
              />
            )}

            {activeSection === "facilities" && (
              <AdminFacilitiesSection
                departments={departments}
                editingFacilityId={editingFacilityId}
                facilities={facilities}
                facilityDepartments={facilityDepartments}
                filters={facilityFilters}
                form={facilityForm}
                loadError={facilityLoadError}
                loading={facilitiesLoading}
                message={facilityMessage}
                pageInfo={facilityPageInfo}
                saving={savingFacility}
                onDelete={handleDeleteFacility}
                onEdit={startEditFacility}
                onFilterChange={updateFacilityFilter}
                onApplyFilters={applyFacilityFilters}
                onClearFilters={clearFacilityFilters}
                onFormChange={(key, value) => setFacilityForm((current) => ({ ...current, [key]: value }))}
                onLoadPage={(pageNumber) => loadFacilities(pageNumber, facilityPageInfo.pageSize)}
                onPageSizeChange={changeFacilityPageSize}
                onReload={() => loadFacilities(facilityPageInfo.pageNumber, facilityPageInfo.pageSize)}
                onReset={resetFacilityForm}
                onSubmit={handleSaveFacility}
                onToggleDepartment={toggleFacilityDepartment}
                onToggleStatus={handleToggleFacilityStatus}
              />
            )}

          </div>
        </div>
      </section>
      {doctorModal.open && (
        <DoctorFormModal
          key={doctorModal.doctor?.id ?? "create"}
          mode={doctorModal.mode}
          doctor={doctorModal.doctor}
          facilityDepartmentOptions={facilityDepartmentOptions}
          saving={savingDoctor}
          restoreFocusRef={operatorDialogTriggerRef}
          onClose={closeDoctorModal}
          onSubmit={handleSaveDoctor}
        />
      )}
      {aiConfigModal.open && (
        <AIConfigFormModal
          key={aiConfigModal.config?.id ?? "create"}
          mode={aiConfigModal.mode}
          config={aiConfigModal.config}
          saving={savingAIConfig}
          restoreFocusRef={operatorDialogTriggerRef}
          onClose={closeAIConfigModal}
          onSubmit={handleSaveAIConfig}
        />
      )}
      {subscriptionPlanModal.open && (
        <SubscriptionPlanFormModal
          key={subscriptionPlanModal.plan?.id ?? "create"}
          mode={subscriptionPlanModal.mode}
          plan={subscriptionPlanModal.plan}
          saving={savingSubscriptionPlan}
          restoreFocusRef={operatorDialogTriggerRef}
          onClose={closeSubscriptionPlanModal}
          onSubmit={handleSaveSubscriptionPlan}
        />
      )}
      {aiConfigDetail && (
        <AIConfigDetailModal
          config={aiConfigDetail}
          restoreFocusRef={operatorDialogTriggerRef}
          onClose={() => setAIConfigDetail(null)}
        />
      )}
    </main>
  );
}
