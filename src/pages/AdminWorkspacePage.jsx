import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Bell,
  BrainCircuit,
  Building2,
  CalendarDays,
  ClipboardList,
  Cpu,
  CreditCard,
  LayoutDashboard,
  MoreVertical,
  RefreshCw,
  Search,
  Stethoscope,
  Users,
  UserPlus,
} from "lucide-react";
import { Navbar } from "../components/landing/Navbar";
import { Footer } from "../components/landing/PricingSection";
import { useFeedback } from "../components/feedback/feedbackContext";
import { Badge, Button, DataTable, EmptyState, ErrorState, LoadingState } from "../components/ui";
import DoctorFilters from "../components/adminDoctors/DoctorFilters";
import DoctorFormModal from "../components/adminDoctors/DoctorFormModal";
import DoctorTable from "../components/adminDoctors/DoctorTable";
import AIConfigDetailModal from "../components/adminAIConfigs/AIConfigDetailModal";
import { navigate } from "../router/navigation";
import { getAdminSectionPath, getNavigationModel } from "../router/routes";
import AIConfigFormModal from "../components/adminAIConfigs/AIConfigFormModal";
import AIConfigTable from "../components/adminAIConfigs/AIConfigTable";
import AIConfigToolbar from "../components/adminAIConfigs/AIConfigToolbar";
import { getEnvironment } from "../components/adminAIConfigs/aiConfigUtils";
import SubscriptionPlanFormModal from "../components/adminSubscriptions/SubscriptionPlanFormModal";
import SubscriptionPlanTable from "../components/adminSubscriptions/SubscriptionPlanTable";
import {
  authApi,
  doctorInvitationsApi,
  facilityDepartmentsApi,
  getStoredAuth,
  medicalFacilitiesApi,
  medicalDepartmentsApi,
  subscriptionPlansApi,
  usersApi,
} from "../services/api";
import { aiConfigManagementApi } from "../services/aiConfigManagement";
import { doctorManagementApi } from "../services/doctors";
import { logoutUser } from "../services/logoutService";
import { hasRole, normalizeRoles } from "../utils/roles";
import "../styles/operator-workspace.css";

const EMPTY_DEPARTMENT = { departmentName: "", description: "" };
const EMPTY_INVITATION = { email: "", doctorId: "" };
const EMPTY_FACILITY = {
  facilityName: "",
  address: "",
  phone: "",
  website: "",
  openingHours: "",
  facilityType: "",
  departmentIds: [],
};
const EMPTY_STAFF = {
  email: "",
  userName: "",
  password: "",
  confirmPassword: "",
  displayName: "",
  address: "",
  gender: "1",
  dateOfBirth: "",
};
const EMPTY_DOCTOR_FILTERS = {
  search: "",
  facilityId: "",
  departmentId: "",
  isActive: "",
  departmentRole: "",
};
const DEFAULT_DOCTOR_PAGE_SIZE = 10;
const USER_LOAD_ERROR_MESSAGE = "Vui lòng kiểm tra kết nối và thử tải lại danh sách tài khoản.";
const DOCTOR_LOAD_ERROR_MESSAGE = "Vui lòng kiểm tra kết nối và thử tải lại danh sách.";
const AI_CONFIG_LOAD_ERROR_MESSAGE = "Vui lòng kiểm tra kết nối và thử tải lại danh sách cấu hình.";
const SUBSCRIPTION_PLAN_LOAD_ERROR_MESSAGE = "Vui lòng kiểm tra kết nối và thử tải lại danh sách gói dịch vụ.";
const FACILITY_LOAD_ERROR_MESSAGE = "Vui lòng kiểm tra kết nối và thử tải lại danh sách cơ sở y tế.";
const EMPTY_AI_CONFIG_FILTERS = {
  search: "",
  status: "",
  taskType: "",
  model: "",
  environment: "",
};
const DEFAULT_AI_CONFIG_PAGE_SIZE = 10;
const ADMIN_NAV_ICONS = {
  dashboard: LayoutDashboard,
  users: Users,
  doctor: Stethoscope,
  ai: BrainCircuit,
  subscription: CreditCard,
  staff: UserPlus,
  facility: Building2,
};
const ADMIN_NAV_ITEMS = getNavigationModel("admin");

function ApiMessage({ message }) {
  if (!message) return null;
  return <div className={`api-message ${message.type}`}>{message.text}</div>;
}

function Field({ label, children }) {
  return (
    <label className="clean-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function statusLabel(status) {
  return Number(status) === 1 ? "Đã duyệt" : "Chờ duyệt";
}

function formatRoles(roles) {
  return roles.length ? roles.join(", ") : "admin";
}

function AccessDenied({ auth, roles }) {
  const path = hasRole(roles, "staff") ? "/app/staff" : "/dashboard";

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
            <a className="btn btn-primary" href={path}>Mở workspace của tôi</a>
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
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [profile, setProfile] = useState(null);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [facilityDepartments, setFacilityDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [aiConfigs, setAIConfigs] = useState([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [pageInfo, setPageInfo] = useState({ pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 });
  const [doctorPageInfo, setDoctorPageInfo] = useState({ pageNumber: 1, pageSize: DEFAULT_DOCTOR_PAGE_SIZE, totalCount: 0, totalPages: 1 });
  const [aiConfigPageInfo, setAIConfigPageInfo] = useState({ pageNumber: 1, pageSize: DEFAULT_AI_CONFIG_PAGE_SIZE, totalCount: 0, totalPages: 1 });
  const activeSection = initialSection;
  const [search, setSearch] = useState("");
  const [doctorFilters, setDoctorFilters] = useState(EMPTY_DOCTOR_FILTERS);
  const [aiConfigFilters, setAIConfigFilters] = useState(EMPTY_AI_CONFIG_FILTERS);
  const [departmentForm, setDepartmentForm] = useState(EMPTY_DEPARTMENT);
  const [facilityForm, setFacilityForm] = useState(EMPTY_FACILITY);
  const [editingDepartmentId, setEditingDepartmentId] = useState("");
  const [staffForm, setStaffForm] = useState(EMPTY_STAFF);
  const [doctorModal, setDoctorModal] = useState({ open: false, mode: "create", doctor: null });
  const [invitationForm, setInvitationForm] = useState(EMPTY_INVITATION);
  const [lastInvitation, setLastInvitation] = useState(null);
  const [aiConfigModal, setAIConfigModal] = useState({ open: false, mode: "create", config: null });
  const [subscriptionPlanModal, setSubscriptionPlanModal] = useState({ open: false, mode: "create", plan: null });
  const [aiConfigDetail, setAIConfigDetail] = useState(null);
  const operatorDialogTriggerRef = useRef(null);
  const [loading, setLoading] = useState(Boolean(auth));
  const [usersLoading, setUsersLoading] = useState(true);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [aiConfigsLoading, setAIConfigsLoading] = useState(true);
  const [subscriptionPlansLoading, setSubscriptionPlansLoading] = useState(true);
  const [facilitiesLoading, setFacilitiesLoading] = useState(true);
  const [savingDepartment, setSavingDepartment] = useState(false);
  const [savingFacility, setSavingFacility] = useState(false);
  const [savingStaff, setSavingStaff] = useState(false);
  const [savingDoctor, setSavingDoctor] = useState(false);
  const [savingInvitation, setSavingInvitation] = useState(false);
  const [savingAIConfig, setSavingAIConfig] = useState(false);
  const [savingSubscriptionPlan, setSavingSubscriptionPlan] = useState(false);
  const [globalMessage, setGlobalMessage] = useState(null);
  const [usersMessage, setUsersMessage] = useState(null);
  const [usersLoadError, setUsersLoadError] = useState("");
  const [departmentMessage, setDepartmentMessage] = useState(null);
  const [facilityMessage, setFacilityMessage] = useState(null);
  const [facilityLoadError, setFacilityLoadError] = useState("");
  const [staffMessage, setStaffMessage] = useState(null);
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

  const pendingApprovalUsers = useMemo(() => {
    return users.filter((user) => Number(user.status) !== 1 && !user.isDeleted);
  }, [users]);

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return pendingApprovalUsers;

    return pendingApprovalUsers.filter((user) => {
      return [user.email, user.displayName, user.identityId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });
  }, [search, pendingApprovalUsers]);

  const pendingUsers = pendingApprovalUsers.length;
  const activeDoctors = doctors.filter((doctor) => doctor.isActive).length;
  const activeAIConfigs = aiConfigs.filter((config) => config.isActive).length;
  const activeSubscriptionPlans = subscriptionPlans.filter((plan) => plan.isActive).length;
  const disabledAIConfigs = aiConfigs.filter((config) => !config.isActive).length;
  const runningAIFeatures = new Set(aiConfigs.filter((config) => config.isActive).map((config) => config.taskType).filter(Boolean)).size;
  const approvalRate = pageInfo.totalCount ? Math.round(((pageInfo.totalCount - pendingUsers) / pageInfo.totalCount) * 100) : 100;
  const doctorActivationRate = doctorPageInfo.totalCount ? Math.round((activeDoctors / doctorPageInfo.totalCount) * 100) : 0;
  const aiHealthScore = aiConfigPageInfo.totalCount ? Math.round((activeAIConfigs / aiConfigPageInfo.totalCount) * 100) : 0;
  const managementLoad = pendingUsers + disabledAIConfigs + Math.max(0, doctorPageInfo.totalCount - activeDoctors);
  const performanceBars = [
    { label: "User", value: approvalRate, accent: "mint" },
    { label: "Bác sĩ", value: doctorActivationRate, accent: "teal" },
    { label: "AI", value: aiHealthScore, accent: "coral" },
    { label: "Khoa", value: Math.min(100, departments.length * 8), accent: "sand" },
    { label: "Feature", value: Math.min(100, runningAIFeatures * 18), accent: "mint" },
    { label: "Tải", value: Math.max(12, Math.min(100, 100 - managementLoad * 8)), accent: "teal" },
  ];
  const operations = [
    {
      title: `${pendingUsers} tài khoản cần duyệt`,
      time: "Ưu tiên hôm nay",
      tone: "warning",
      section: "users",
      icon: <Users size={16} />,
    },
    {
      title: `${disabledAIConfigs} AI config đang tắt`,
      time: "Kiểm tra prompt/model",
      tone: "info",
      section: "ai-configs",
      icon: <BrainCircuit size={16} />,
    },
    {
      title: `${Math.max(0, doctorPageInfo.totalCount - activeDoctors)} bác sĩ chưa active`,
      time: "Cập nhật hồ sơ nhân sự",
      tone: "success",
      section: "doctors",
      icon: <Stethoscope size={16} />,
    },
  ];
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
      medicalDepartmentsApi.list(),
      doctorManagementApi.list({ pageNumber: 1, pageSize: DEFAULT_DOCTOR_PAGE_SIZE }),
      aiConfigManagementApi.list(1, DEFAULT_AI_CONFIG_PAGE_SIZE),
      medicalFacilitiesApi.list(1, 100),
      facilityDepartmentsApi.active(),
      subscriptionPlansApi.list(),
    ])
      .then(([
        profileResult,
        usersResult,
        departmentResult,
        doctorResult,
        aiConfigResult,
        facilityResult,
        facilityDepartmentResult,
        subscriptionPlanResult,
      ]) => {
        if (!active) return;

        if (profileResult.status === "fulfilled") {
          setProfile(profileResult.value.data ?? {});
        } else {
          setGlobalMessage({ type: "warning", text: profileResult.reason.message });
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
          setDepartments(departmentResult.value.data ?? []);
        } else {
          setDepartmentMessage({ type: "error", text: departmentResult.reason.message });
        }

        if (doctorResult.status === "fulfilled") {
          const data = doctorResult.value.data ?? {};
          setDoctorLoadError("");
          setDoctors(data.items ?? []);
          setDoctorPageInfo({
            pageNumber: data.pageNumber ?? 1,
            pageSize: data.pageSize ?? DEFAULT_DOCTOR_PAGE_SIZE,
            totalCount: data.totalCount ?? 0,
            totalPages: data.totalPages ?? 1,
          });
        } else {
          console.error("Không thể tải danh sách bác sĩ:", doctorResult.reason);
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
          console.error("AI Config API error:", aiConfigResult.reason);
          setAIConfigLoadError(AI_CONFIG_LOAD_ERROR_MESSAGE);
        }

        if (facilityResult.status === "fulfilled") {
          setFacilities(facilityResult.value.data?.items ?? facilityResult.value.data ?? []);
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
        setDoctorsLoading(false);
        setAIConfigsLoading(false);
        setFacilitiesLoading(false);
        setSubscriptionPlansLoading(false);
      });

    return () => {
      active = false;
    };
  }, [auth, pageInfo.pageSize]);

  if (!auth) return <EmptyAuth />;
  if (!loading && !isAdmin) return <AccessDenied auth={auth} roles={roles} />;

  async function loadUsers(pageNumber = pageInfo.pageNumber) {
    setUsersLoading(true);
    setUsersMessage(null);
    setUsersLoadError("");
    try {
      const response = await usersApi.list(pageNumber, pageInfo.pageSize);
      const data = response.data ?? {};
      setUsers(data.items ?? []);
      setPageInfo({
        pageNumber: data.pageNumber ?? pageNumber,
        pageSize: data.pageSize ?? pageInfo.pageSize,
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
    setDepartmentMessage(null);
    try {
      const response = await medicalDepartmentsApi.list();
      setDepartments(response.data ?? []);
    } catch (error) {
      setDepartmentMessage({ type: "error", text: error.message });
    } finally {
      setDepartmentsLoading(false);
    }
  }

  async function loadFacilities() {
    setFacilitiesLoading(true);
    setFacilityMessage(null);
    setFacilityLoadError("");
    try {
      const [facilityResponse, facilityDepartmentResponse] = await Promise.all([
        medicalFacilitiesApi.list(1, 100),
        facilityDepartmentsApi.active(),
      ]);
      setFacilities(facilityResponse.data?.items ?? facilityResponse.data ?? []);
      const data = facilityDepartmentResponse.data;
      setFacilityDepartments(Array.isArray(data) ? data : data?.items ?? []);
    } catch {
      setFacilityLoadError(FACILITY_LOAD_ERROR_MESSAGE);
      showToast({
        type: "error",
        title: "Không tải được danh sách cơ sở y tế",
        message: FACILITY_LOAD_ERROR_MESSAGE,
      });
    } finally {
      setFacilitiesLoading(false);
    }
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
    } catch (error) {
      console.error("Doctor API error:", error);
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
    } catch (error) {
      console.error("AI Config API error:", error);
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
      console.error("AI Config save API error:", error);
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
      console.error("AI Config status API error:", error);
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
      console.error("AI Config delete API error:", error);
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
    } catch (error) {
      setSubscriptionPlanMessage({ type: "error", text: error.message });
      showToast({ type: "error", title: "Không lưu được gói dịch vụ", message: error.message });
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
    } catch (error) {
      setSubscriptionPlanMessage({ type: "error", text: error.message });
      showToast({ type: "error", title: "Không đổi được trạng thái gói", message: error.message });
    }
  }

  async function handleDeleteSubscriptionPlan(plan) {
    const confirmed = await confirmAction({
      title: "Xóa gói dịch vụ?",
      message: `${plan.planName || "Gói này"} sẽ bị xóa khỏi danh sách quản trị. Gói đang được sử dụng có thể không xóa được theo quy tắc backend.`,
      confirmLabel: "Xóa gói",
      tone: "danger",
    });
    if (!confirmed) return;

    setSubscriptionPlanMessage(null);
    try {
      const response = await subscriptionPlansApi.remove(plan.id);
      setSubscriptionPlans((current) => current.filter((item) => item.id !== plan.id));
      showToast({ type: "success", title: "Đã xóa gói dịch vụ", message: response.message || "Danh sách gói đã được cập nhật." });
    } catch (error) {
      setSubscriptionPlanMessage({ type: "error", text: error.message });
      showToast({ type: "error", title: "Không xóa được gói dịch vụ", message: error.message });
    }
  }

  function updateDoctorFilter(key, value) {
    setDoctorFilters((current) => ({ ...current, [key]: value }));
  }

  function handleDoctorFilterSubmit(event) {
    event.preventDefault();
    loadDoctors(1, doctorFilters);
  }

  function resetDoctorFilters() {
    setDoctorFilters(EMPTY_DOCTOR_FILTERS);
    loadDoctors(1, EMPTY_DOCTOR_FILTERS);
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
      console.error("Doctor save API error:", error);
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
      console.error("Doctor status API error:", error);
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
      console.error("Doctor delete API error:", error);
      setDoctorMessage({ type: "error", text: error.message });
      showToast({ type: "error", title: "Không xóa được bác sĩ", message: error.message });
    }
  }

  async function handleApproveUser(userId) {
    setUsersMessage(null);
    try {
      const response = await usersApi.approve(userId);
      setUsersMessage({ type: "success", text: response.message || "Đã duyệt người dùng." });
      await loadUsers();
    } catch (error) {
      setUsersMessage({ type: "error", text: error.message });
    }
  }

  async function handleDeleteUser(userId) {
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
      setDepartmentMessage({
        type: "success",
        text: response.message || (editingDepartmentId ? "Đã cập nhật chuyên khoa." : "Đã tạo chuyên khoa."),
      });
      resetDepartmentForm();
      await loadDepartments();
    } catch (error) {
      setDepartmentMessage({ type: "error", text: error.message });
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
      setDepartmentMessage({ type: "success", text: response.message || "Đã xóa chuyên khoa." });
      showToast({ type: "success", title: "Đã xóa chuyên khoa", message: response.message || "Danh mục đã được cập nhật." });
      await loadDepartments();
    } catch (error) {
      setDepartmentMessage({ type: "error", text: error.message });
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

  async function handleCreateFacility(event) {
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
      const payload = {
        facilityName: facilityForm.facilityName.trim(),
        address: facilityForm.address.trim(),
        phone: facilityForm.phone.trim() || null,
        website: facilityForm.website.trim() || null,
        openingHours: facilityForm.openingHours.trim() || null,
        facilityType: facilityForm.facilityType.trim() || null,
        isActive: true,
        departmentIds: facilityForm.departmentIds,
      };
      const response = await medicalFacilitiesApi.create(payload);
      showToast({
        type: "success",
        title: "Đã tạo cơ sở y tế",
        message: "Chuyên khoa đã sẵn sàng để chọn khi thêm bác sĩ.",
      });
      setFacilityForm(EMPTY_FACILITY);
      await loadFacilities();
      setFacilityMessage({
        type: "success",
        text: response.message || "Đã tạo cơ sở y tế và liên kết chuyên khoa.",
      });
    } catch (error) {
      setFacilityMessage({ type: "error", text: error.message });
      showToast({ type: "error", title: "Không tạo được cơ sở y tế", message: error.message });
    } finally {
      setSavingFacility(false);
    }
  }

  function updateStaff(key, value) {
    setStaffForm((current) => ({ ...current, [key]: value }));
  }

  async function handleCreateStaff(event) {
    event.preventDefault();
    setSavingStaff(true);
    setStaffMessage(null);
    try {
      const response = await authApi.registerStaff({
        ...staffForm,
        gender: Number(staffForm.gender),
        dateOfBirth: staffForm.dateOfBirth || null,
      });
      setStaffMessage({ type: "success", text: response.message || "Đã tạo tài khoản staff." });
      setStaffForm(EMPTY_STAFF);
      await loadUsers();
    } catch (error) {
      setStaffMessage({ type: "error", text: error.message });
    } finally {
      setSavingStaff(false);
    }
  }

  async function handleLogout() {
    await logoutUser({ onClear: () => setAuth(null), redirect: navigate });
  }

  const userColumns = [
    {
      key: "user",
      header: "Người dùng",
      render: (item) => (
        <div className="table-primary-cell">
          <strong>{item.displayName || item.email || "Người dùng"}</strong>
          <span>{item.email || "Chưa có email"}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (item) => (
        <div className="admin-badge-stack">
          <Badge tone={Number(item.status) === 1 ? "success" : "warning"}>{statusLabel(item.status)}</Badge>
          <Badge tone={item.isDeleted ? "danger" : "info"}>{item.isDeleted ? "Đã xóa" : "Hoạt động"}</Badge>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      render: (item) => (
        <div className="record-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={() => handleApproveUser(item.identityId)}>Duyệt</button>
          <button className="btn btn-dark btn-small" type="button" onClick={() => handleDeleteUser(item.identityId)}>Xóa</button>
        </div>
      ),
    },
  ];

  return (
    <main className="workspace-root admin-operator">
      <section className="admin-page">
        <div className="container admin-shell">
          <aside className="admin-sidebar">
            <a className="brand" href="/">
              <span className="brand-mark">+</span>
              <span>MediMate AI</span>
            </a>

            <nav className="admin-nav" aria-label="Điều hướng admin">
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
            <header className="admin-topbar">
              <label className="admin-search" aria-label="Tìm kiếm nhanh trong admin">
                <Search size={17} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm người dùng hoặc email..." />
              </label>
              <div className="admin-top-profile">
                <button className="admin-icon-button" type="button" aria-label="Lịch vận hành">
                  <CalendarDays size={17} />
                </button>
                <button className="admin-icon-button" type="button" aria-label="Thông báo">
                  <Bell size={17} />
                </button>
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

            <section className="admin-stats">
              <article>
                <span className="admin-stat-icon"><Users size={17} /></span>
                <div>
                  <span>Tổng user</span>
                  <strong>{usersLoading ? "..." : pageInfo.totalCount}</strong>
                  <small>Tổng số tài khoản</small>
                </div>
              </article>
              <article>
                <span className="admin-stat-icon"><ClipboardList size={17} /></span>
                <div>
                  <span>Chờ duyệt</span>
                  <strong>{usersLoading ? "..." : pendingUsers}</strong>
                  <small>Trong trang hiện tại</small>
                </div>
              </article>
              <article>
                <span className="admin-stat-icon"><Stethoscope size={17} /></span>
                <div>
                  <span>Bác sĩ</span>
                  <strong>{doctorsLoading ? "..." : doctorPageInfo.totalCount}</strong>
                  <small>{activeDoctors} đang hoạt động</small>
                </div>
              </article>
              <article>
                <span className="admin-stat-icon"><BrainCircuit size={17} /></span>
                <div>
                  <span>AI Configs</span>
                  <strong>{aiConfigsLoading ? "..." : aiConfigPageInfo.totalCount}</strong>
                  <small>{activeAIConfigs} active · {disabledAIConfigs} inactive</small>
                </div>
              </article>
              <article>
                <span className="admin-stat-icon"><Activity size={17} /></span>
                <div>
                  <span>Health score</span>
                  <strong>{aiConfigsLoading ? "..." : `${aiHealthScore}%`}</strong>
                  <small>AI config đang active</small>
                </div>
              </article>
            </section>

            {activeSection === "overview" && (
              <section className="admin-dashboard-grid">
                <div className="admin-panel admin-performance-panel">
                  <div className="panel-title-row">
                    <div>
                      <p className="eyebrow">Performance Over Time</p>
                      <h2>Hiệu suất vận hành</h2>
                      <span className="admin-panel-date">Cập nhật theo dữ liệu trang hiện tại</span>
                    </div>
                    <div className="admin-panel-tools">
                      <span>Short</span>
                      <span>Filter</span>
                      <button type="button" aria-label="Tùy chọn"><MoreVertical size={16} /></button>
                    </div>
                  </div>
                  <div className="admin-overview-metrics">
                    <article>
                      <span>Approval rate</span>
                      <strong>{approvalRate}%</strong>
                      <small className="trend-up">+{Math.max(0, approvalRate - 80)}%</small>
                    </article>
                    <article>
                      <span>Doctor active</span>
                      <strong>{activeDoctors}/{doctorPageInfo.totalCount}</strong>
                      <small className="trend-up">{doctorActivationRate}%</small>
                    </article>
                    <article>
                      <span>AI enabled</span>
                      <strong>{activeAIConfigs}</strong>
                      <small className={disabledAIConfigs ? "trend-down" : "trend-up"}>{disabledAIConfigs} off</small>
                    </article>
                    <article>
                      <span>Departments</span>
                      <strong>{departments.length}</strong>
                      <small className="trend-up">Catalog</small>
                    </article>
                  </div>
                </div>

                <div className="admin-panel admin-chart-panel">
                  <div className="panel-title-row">
                    <div>
                      <p className="eyebrow">Campaign Performance</p>
                      <h2>Chỉ số quản trị</h2>
                      <span className="admin-panel-date">{managementLoad} mục cần xử lý</span>
                    </div>
                    <span className="soft-badge">Live</span>
                  </div>
                  <div className="admin-bar-chart" aria-label="Biểu đồ hiệu suất quản trị">
                    {performanceBars.map((bar) => (
                      <div className={`admin-bar admin-bar-${bar.accent}`} key={bar.label}>
                        <span style={{ height: `${Math.max(14, bar.value)}%` }}>
                          <strong>{bar.value}%</strong>
                        </span>
                        <small>{bar.label}</small>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="admin-panel admin-schedule-panel">
                  <div className="panel-title-row">
                    <div>
                      <p className="eyebrow">Operations Queue</p>
                      <h2>Lịch vận hành</h2>
                    </div>
                    <span className="soft-badge">{formatRoles(roles)}</span>
                  </div>
                  <div className="admin-week-strip">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => (
                      <button className={index === 4 ? "active" : ""} type="button" key={day}>
                        <span>{day}</span>
                        <strong>{15 + index}</strong>
                      </button>
                    ))}
                  </div>
                  <div className="admin-operation-list">
                    {operations.map((item) => (
                      <button className={`admin-operation admin-operation-${item.tone}`} type="button" key={item.title} onClick={() => openSection(item.section)}>
                        <span className="admin-operation-icon">{item.icon}</span>
                        <div>
                          <strong>{item.title}</strong>
                          <small>{item.time}</small>
                        </div>
                        <MoreVertical size={16} />
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {activeSection === "users" && (
              <section className="admin-panel admin-users-panel">
                <div className="panel-title-row">
                  <div>
                    <p className="eyebrow">Tài khoản</p>
                    <h2>Tài khoản chờ duyệt</h2>
                    <p className="muted-text">Chỉ hiển thị các tài khoản chưa được duyệt để admin xử lý nhanh hơn.</p>
                  </div>
                  <button className="btn btn-ghost btn-small" type="button" onClick={() => loadUsers()}>Tải lại</button>
                </div>
                <ApiMessage message={usersMessage} />
                <div className="admin-toolbar">
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo email hoặc tên..." />
                  <select value={pageInfo.pageSize} onChange={(event) => setPageInfo((current) => ({ ...current, pageSize: Number(event.target.value) }))}>
                    <option value="10">10 / trang</option>
                    <option value="20">20 / trang</option>
                    <option value="50">50 / trang</option>
                  </select>
                </div>

                {usersLoading ? (
                  <LoadingState label="Đang tải danh sách người dùng..." />
                ) : usersLoadError ? (
                  <ErrorState
                    title="Không thể tải danh sách tài khoản"
                    description={usersLoadError}
                    action={(
                      <Button onClick={() => loadUsers()}>
                        <RefreshCw size={16} aria-hidden="true" /> Thử tải lại
                      </Button>
                    )}
                  />
                ) : (
                  <DataTable
                    caption="Danh sách tài khoản đang chờ quản trị viên duyệt"
                    columns={userColumns}
                    rows={filteredUsers}
                    getRowKey={(item) => item.identityId}
                    emptyState={<EmptyState title="Không có tài khoản chờ duyệt" description="Các tài khoản đã duyệt hoặc đang hoạt động đã được ẩn khỏi danh sách này." />}
                  />
                )}

                {!usersLoadError && (
                  <div className="pagination-row">
                    <button className="btn btn-ghost btn-small" type="button" disabled={pageInfo.pageNumber <= 1 || usersLoading} onClick={() => loadUsers(pageInfo.pageNumber - 1)}>Trước</button>
                    <span>Trang {pageInfo.pageNumber} / {pageInfo.totalPages || 1} · {filteredUsers.length} tài khoản cần duyệt</span>
                    <button className="btn btn-ghost btn-small" type="button" disabled={pageInfo.pageNumber >= pageInfo.totalPages || usersLoading} onClick={() => loadUsers(pageInfo.pageNumber + 1)}>Sau</button>
                  </div>
                )}
              </section>
            )}

            {activeSection === "doctors" && (
              <section className="admin-panel doctor-admin-panel">
                <div className="panel-title-row doctor-section-heading">
                  <div>
                    <p className="eyebrow">Nhân sự y tế</p>
                    <h2>Quản lý bác sĩ</h2>
                    <p className="muted-text">Tạo, cập nhật, lọc và quản lý trạng thái bác sĩ theo cơ sở y tế và khoa công tác.</p>
                  </div>
                </div>

                <ApiMessage message={doctorMessage} />

                <form className="doctor-invitation-admin" onSubmit={handleCreateInvitation}>
                  <div>
                    <strong>Gửi lời mời đăng ký bác sĩ</strong>
                    <p>Email là bắt buộc. Có thể chọn hồ sơ bác sĩ có sẵn để liên kết tài khoản.</p>
                  </div>
                  <label className="clean-field">
                    <span>Email bác sĩ</span>
                    <input
                      type="email"
                      autoComplete="email"
                      value={invitationForm.email}
                      onChange={(event) => setInvitationForm({ ...invitationForm, email: event.target.value })}
                      required
                    />
                  </label>
                  <label className="clean-field">
                    <span>Hồ sơ bác sĩ có sẵn (không bắt buộc)</span>
                    <select
                      value={invitationForm.doctorId}
                      onChange={(event) => setInvitationForm({ ...invitationForm, doctorId: event.target.value })}
                    >
                      <option value="">Tạo bác sĩ mới khi đăng ký</option>
                      {doctors.filter((doctor) => !doctor.userId).map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>
                          {doctor.fullName || doctor.id}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="btn btn-primary btn-small" type="submit" disabled={savingInvitation}>
                    {savingInvitation ? "Đang gửi..." : "Gửi invitation"}
                  </button>
                  {lastInvitation && (
                    <div className="doctor-invitation-latest" role="status">
                      <span>
                        {lastInvitation.email} · {lastInvitation.status || "Pending"}
                        {lastInvitation.expiresAt && ` · hết hạn ${new Date(lastInvitation.expiresAt).toLocaleString("vi-VN")}`}
                      </span>
                      {String(lastInvitation.status).toLowerCase() !== "revoked" && (
                        <button className="btn btn-ghost btn-small" type="button" onClick={handleRevokeInvitation}>
                          Thu hồi
                        </button>
                      )}
                    </div>
                  )}
                </form>

                <DoctorFilters
                  filters={doctorFilters}
                  departments={departments}
                  facilities={facilities}
                  pageSize={doctorPageInfo.pageSize}
                  onChange={updateDoctorFilter}
                  onPageSizeChange={(pageSize) => setDoctorPageInfo((current) => ({ ...current, pageSize }))}
                  onSubmit={handleDoctorFilterSubmit}
                  onReset={resetDoctorFilters}
                  onCreate={openCreateDoctor}
                />

                {facilitiesLoading && (
                  <p className="muted-text">Đang đồng bộ danh sách bệnh viện cho bộ lọc...</p>
                )}

                {doctorsLoading ? (
                  <LoadingState
                    className="doctor-empty-state"
                    label="Đang tải danh sách bác sĩ..."
                    description="Dữ liệu nhân sự y tế đang được đồng bộ theo bộ lọc hiện tại."
                  />
                ) : doctorLoadError ? (
                  <ErrorState
                    className="doctor-empty-state"
                    title="Không thể tải danh sách bác sĩ"
                    description={doctorLoadError}
                    action={(
                      <Button onClick={() => loadDoctors()}>
                        <RefreshCw size={15} aria-hidden="true" /> Thử tải lại
                      </Button>
                    )}
                  />
                ) : (
                  <DoctorTable
                    doctors={doctors}
                    onEdit={openEditDoctor}
                    onToggleStatus={handleToggleDoctorStatus}
                    onDelete={handleDeleteDoctor}
                    onCreate={openCreateDoctor}
                  />
                )}

                {!doctorLoadError && (
                  <div className="pagination-row">
                    <button className="btn btn-ghost btn-small" type="button" disabled={doctorPageInfo.pageNumber <= 1 || doctorsLoading} onClick={() => loadDoctors(doctorPageInfo.pageNumber - 1)}>
                      Trước
                    </button>
                    <span>Trang {doctorPageInfo.pageNumber} / {doctorPageInfo.totalPages || 1} · {doctorPageInfo.totalCount} bác sĩ</span>
                    <button className="btn btn-ghost btn-small" type="button" disabled={doctorPageInfo.pageNumber >= doctorPageInfo.totalPages || doctorsLoading} onClick={() => loadDoctors(doctorPageInfo.pageNumber + 1)}>
                      Sau
                    </button>
                  </div>
                )}
              </section>
            )}

            {activeSection === "ai-configs" && (
              <section className="admin-panel ai-config-admin-panel">
                <div className="panel-title-row ai-config-section-heading">
                  <div>
                    <p className="eyebrow">AI Platform Console</p>
                    <h2>AI Configuration Management</h2>
                    <p className="muted-text">Quản lý prompt, model và hành vi AI trong hệ thống MediMate AI.</p>
                  </div>
                  <button className="btn btn-ghost btn-small" type="button" onClick={() => loadAIConfigs()}>
                    <RefreshCw size={15} /> Sync AI Settings
                  </button>
                </div>

                <section className="ai-config-kpi-grid">
                  <article>
                    <span><BrainCircuit size={16} /></span>
                    <div>
                      <small>Total AI Configs</small>
                      <strong>{aiConfigPageInfo.totalCount}</strong>
                    </div>
                  </article>
                  <article>
                    <span><Cpu size={16} /></span>
                    <div>
                      <small>Active Models</small>
                      <strong>{activeAIConfigs}</strong>
                    </div>
                  </article>
                  <article>
                    <span><Activity size={16} /></span>
                    <div>
                      <small>Disabled Configs</small>
                      <strong>{disabledAIConfigs}</strong>
                    </div>
                  </article>
                  <article>
                    <span><ClipboardList size={16} /></span>
                    <div>
                      <small>AI Features Running</small>
                      <strong>{runningAIFeatures}</strong>
                    </div>
                  </article>
                </section>

                <ApiMessage message={aiConfigMessage} />

                <AIConfigToolbar
                  filters={aiConfigFilters}
                  taskTypes={aiTaskTypes}
                  models={aiModels}
                  environments={aiEnvironments}
                  pageSize={aiConfigPageInfo.pageSize}
                  onChange={updateAIConfigFilter}
                  onPageSizeChange={handleAIConfigPageSizeChange}
                  onSubmit={handleAIConfigFilterSubmit}
                  onReset={resetAIConfigFilters}
                  onCreate={openCreateAIConfig}
                />

                {aiConfigsLoading ? (
                  <LoadingState
                    className="ai-config-empty-state"
                    label="Đang tải danh sách AI config..."
                    description="Các cấu hình model và prompt đang được đồng bộ."
                  />
                ) : aiConfigLoadError ? (
                  <ErrorState
                    className="ai-config-empty-state"
                    title="Không thể tải danh sách AI config"
                    description={aiConfigLoadError}
                    action={(
                      <Button onClick={() => loadAIConfigs()}>
                        <RefreshCw size={15} aria-hidden="true" /> Thử tải lại
                      </Button>
                    )}
                  />
                ) : (
                  <AIConfigTable
                    configs={filteredAIConfigs}
                    onView={openAIConfigDetail}
                    onEdit={openEditAIConfig}
                    onToggleStatus={handleToggleAIConfigStatus}
                    onDelete={handleDeleteAIConfig}
                    onCreate={openCreateAIConfig}
                  />
                )}

                {!aiConfigLoadError && (
                  <div className="pagination-row">
                    <button className="btn btn-ghost btn-small" type="button" disabled={aiConfigPageInfo.pageNumber <= 1 || aiConfigsLoading} onClick={() => loadAIConfigs(aiConfigPageInfo.pageNumber - 1)}>
                      Trước
                    </button>
                    <span>Trang {aiConfigPageInfo.pageNumber} / {aiConfigPageInfo.totalPages || 1} · {filteredAIConfigs.length} / {aiConfigPageInfo.totalCount} configs</span>
                    <button className="btn btn-ghost btn-small" type="button" disabled={aiConfigPageInfo.pageNumber >= aiConfigPageInfo.totalPages || aiConfigsLoading} onClick={() => loadAIConfigs(aiConfigPageInfo.pageNumber + 1)}>
                      Sau
                    </button>
                  </div>
                )}
              </section>
            )}

            {activeSection === "subscriptions" && (
              <section className="admin-panel subscription-plan-admin-panel">
                <div className="panel-title-row subscription-plan-heading">
                  <div>
                    <p className="eyebrow">Gói đăng ký</p>
                    <h2>Quản lý gói dịch vụ</h2>
                    <p className="muted-text">Tạo và kích hoạt các gói xuất hiện trên trang bảng giá để người dùng đăng ký qua PayOS.</p>
                  </div>
                  <div className="record-actions">
                    <button className="btn btn-ghost btn-small" type="button" onClick={loadSubscriptionPlans}>
                      <RefreshCw size={15} /> Đồng bộ
                    </button>
                    <button className="btn btn-primary btn-small" type="button" onClick={openCreateSubscriptionPlan}>
                      <CreditCard size={15} /> Tạo gói
                    </button>
                  </div>
                </div>

                <section className="subscription-plan-kpis">
                  <article>
                    <span>Tổng số gói</span>
                    <strong>{subscriptionPlans.length}</strong>
                  </article>
                  <article>
                    <span>Đang mở bán</span>
                    <strong>{activeSubscriptionPlans}</strong>
                  </article>
                  <article>
                    <span>Đang tạm ẩn</span>
                    <strong>{Math.max(0, subscriptionPlans.length - activeSubscriptionPlans)}</strong>
                  </article>
                </section>

                <ApiMessage message={subscriptionPlanMessage} />

                {subscriptionPlansLoading ? (
                  <LoadingState
                    label="Đang tải danh sách gói dịch vụ..."
                    description="Dữ liệu gói đăng ký đang được đồng bộ."
                  />
                ) : subscriptionPlanLoadError ? (
                  <ErrorState
                    title="Không thể tải danh sách gói dịch vụ"
                    description={subscriptionPlanLoadError}
                    action={(
                      <Button onClick={loadSubscriptionPlans}>
                        <RefreshCw size={16} aria-hidden="true" /> Thử tải lại
                      </Button>
                    )}
                  />
                ) : (
                  <SubscriptionPlanTable
                    plans={subscriptionPlans}
                    onEdit={openEditSubscriptionPlan}
                    onToggleStatus={handleToggleSubscriptionPlanStatus}
                    onDelete={handleDeleteSubscriptionPlan}
                    onCreate={openCreateSubscriptionPlan}
                  />
                )}
              </section>
            )}

            {activeSection === "staff" && (
              <section className="admin-panel">
                <div className="panel-title-row">
                  <div>
                    <p className="eyebrow">Nhân sự</p>
                    <h2>Tạo tài khoản staff</h2>
                  </div>
                  <span className="soft-badge">Tài khoản nội bộ</span>
                </div>
                <ApiMessage message={staffMessage} />
                <form className="clean-form" onSubmit={handleCreateStaff}>
                  <div className="form-two-cols">
                    <Field label="Email">
                      <input type="email" value={staffForm.email} onChange={(event) => updateStaff("email", event.target.value)} required />
                    </Field>
                    <Field label="Username">
                      <input value={staffForm.userName} onChange={(event) => updateStaff("userName", event.target.value)} required />
                    </Field>
                    <Field label="Tên hiển thị">
                      <input value={staffForm.displayName} onChange={(event) => updateStaff("displayName", event.target.value)} required />
                    </Field>
                    <Field label="Địa chỉ">
                      <input value={staffForm.address} onChange={(event) => updateStaff("address", event.target.value)} />
                    </Field>
                    <Field label="Mật khẩu">
                      <input type="password" value={staffForm.password} onChange={(event) => updateStaff("password", event.target.value)} required />
                    </Field>
                    <Field label="Nhập lại mật khẩu">
                      <input type="password" value={staffForm.confirmPassword} onChange={(event) => updateStaff("confirmPassword", event.target.value)} required />
                    </Field>
                    <Field label="Giới tính">
                      <select value={staffForm.gender} onChange={(event) => updateStaff("gender", event.target.value)}>
                        <option value="1">Nam</option>
                        <option value="2">Nữ</option>
                      </select>
                    </Field>
                    <Field label="Ngày sinh">
                      <input type="date" value={staffForm.dateOfBirth} onChange={(event) => updateStaff("dateOfBirth", event.target.value)} />
                    </Field>
                  </div>
                  <button className="btn btn-primary" type="submit" disabled={savingStaff}>
                    {savingStaff ? "Đang tạo..." : "Tạo tài khoản staff"}
                  </button>
                </form>
              </section>
            )}

            {activeSection === "departments" && (
              <section className="admin-grid">
                <div className="admin-panel">
                  <div className="panel-title-row">
                    <div>
                    <p className="eyebrow">Chuyên khoa</p>
                      <h2>Danh mục chuyên khoa</h2>
                    </div>
                    <button className="btn btn-ghost btn-small" type="button" onClick={loadDepartments}>Tải lại</button>
                  </div>
                  <ApiMessage message={departmentMessage} />
                  {departmentsLoading ? (
                    <p className="muted-text">Đang tải chuyên khoa...</p>
                  ) : (
                    <div className="admin-table-list">
                      {departments.length === 0 && <p className="muted-text">Chưa có chuyên khoa.</p>}
                      {departments.map((department) => (
                        <article className="admin-user-row" key={department.id}>
                          <div>
                            <strong>{department.departmentName || "Chưa đặt tên"}</strong>
                            <span>{department.description || "Chưa có mô tả."}</span>
                            <small>{department.id}</small>
                          </div>
                          <div className="record-actions">
                            <button className="btn btn-ghost btn-small" type="button" onClick={() => startEditDepartment(department)}>Sửa</button>
                            <button className="btn btn-dark btn-small" type="button" onClick={() => handleDeleteDepartment(department.id)}>Xóa</button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                <form className="admin-panel clean-form" onSubmit={handleSaveDepartment}>
                  <div className="panel-title-row">
                    <div>
                      <p className="eyebrow">{editingDepartmentId ? "Update" : "Create"}</p>
                      <h2>{editingDepartmentId ? "Cập nhật chuyên khoa" : "Tạo chuyên khoa"}</h2>
                    </div>
                    {editingDepartmentId && <button className="btn btn-ghost btn-small" type="button" onClick={resetDepartmentForm}>Hủy sửa</button>}
                  </div>
                  <Field label="Tên chuyên khoa">
                    <input
                      value={departmentForm.departmentName}
                      onChange={(event) => setDepartmentForm({ ...departmentForm, departmentName: event.target.value })}
                      placeholder="Ví dụ: Tim mạch"
                      required
                    />
                  </Field>
                  <Field label="Mô tả">
                    <textarea
                      rows={6}
                      value={departmentForm.description}
                      onChange={(event) => setDepartmentForm({ ...departmentForm, description: event.target.value })}
                      placeholder="Mô tả chức năng, nhóm triệu chứng thường gặp..."
                    />
                  </Field>
                  <button className="btn btn-primary" type="submit" disabled={savingDepartment}>
                    {savingDepartment ? "Đang lưu..." : editingDepartmentId ? "Lưu cập nhật" : "Tạo chuyên khoa"}
                  </button>
                </form>
              </section>
            )}

            {activeSection === "facilities" && (
              <section className="admin-grid">
                <div className="admin-panel">
                  <div className="panel-title-row">
                    <div>
                      <p className="eyebrow">Cơ sở y tế</p>
                      <h2>Danh sách cơ sở</h2>
                    </div>
                    <button className="btn btn-ghost btn-small" type="button" onClick={loadFacilities}>Tải lại</button>
                  </div>
                  <ApiMessage message={facilityMessage} />
                  {facilitiesLoading ? (
                    <LoadingState
                      label="Đang tải danh sách cơ sở y tế..."
                      description="Dữ liệu cơ sở và liên kết chuyên khoa đang được đồng bộ."
                    />
                  ) : facilityLoadError ? (
                    <ErrorState
                      title="Không thể tải danh sách cơ sở y tế"
                      description={facilityLoadError}
                      action={(
                        <Button onClick={loadFacilities}>
                          <RefreshCw size={16} aria-hidden="true" /> Thử tải lại
                        </Button>
                      )}
                    />
                  ) : (
                    <div className="admin-table-list">
                      {facilities.length === 0 && (
                        <EmptyState
                          title="Chưa có cơ sở y tế"
                          description="Tạo cơ sở và gán chuyên khoa trước khi thêm bác sĩ."
                        />
                      )}
                      {facilities.map((facility) => {
                        const linkedDepartments = facilityDepartments
                          .filter((item) => item.facilityId === facility.id)
                          .map((item) => item.departmentName)
                          .filter(Boolean);
                        return (
                          <article className="admin-user-row" key={facility.id}>
                            <div>
                              <strong>{facility.facilityName || "Chưa đặt tên"}</strong>
                              <span>{facility.address || "Chưa có địa chỉ."}</span>
                              <small>
                                {linkedDepartments.length
                                  ? `Chuyên khoa: ${linkedDepartments.join(", ")}`
                                  : "Chưa liên kết chuyên khoa."}
                              </small>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>

                <form className="admin-panel clean-form" onSubmit={handleCreateFacility}>
                  <div className="panel-title-row">
                    <div>
                      <p className="eyebrow">Create</p>
                      <h2>Tạo cơ sở y tế</h2>
                    </div>
                  </div>
                  <Field label="Tên cơ sở y tế">
                    <input
                      value={facilityForm.facilityName}
                      onChange={(event) => setFacilityForm({ ...facilityForm, facilityName: event.target.value })}
                      placeholder="Ví dụ: Bệnh viện Đa khoa A"
                      required
                    />
                  </Field>
                  <Field label="Địa chỉ">
                    <input
                      value={facilityForm.address}
                      onChange={(event) => setFacilityForm({ ...facilityForm, address: event.target.value })}
                      required
                    />
                  </Field>
                  <div className="clean-form-grid">
                    <Field label="Số điện thoại">
                      <input
                        type="tel"
                        value={facilityForm.phone}
                        onChange={(event) => setFacilityForm({ ...facilityForm, phone: event.target.value })}
                      />
                    </Field>
                    <Field label="Loại cơ sở">
                      <input
                        value={facilityForm.facilityType}
                        onChange={(event) => setFacilityForm({ ...facilityForm, facilityType: event.target.value })}
                        placeholder="Bệnh viện, phòng khám..."
                      />
                    </Field>
                    <Field label="Website">
                      <input
                        type="url"
                        value={facilityForm.website}
                        onChange={(event) => setFacilityForm({ ...facilityForm, website: event.target.value })}
                        placeholder="https://..."
                      />
                    </Field>
                    <Field label="Giờ mở cửa">
                      <input
                        value={facilityForm.openingHours}
                        onChange={(event) => setFacilityForm({ ...facilityForm, openingHours: event.target.value })}
                        placeholder="07:00 - 17:00"
                      />
                    </Field>
                  </div>
                  <fieldset className="facility-department-picker">
                    <legend>Chuyên khoa tại cơ sở</legend>
                    <p>Chọn ít nhất một chuyên khoa. Đây là dữ liệu form thêm bác sĩ sử dụng.</p>
                    {departments.length === 0 ? (
                      <p className="muted-text">Hãy tạo chuyên khoa trước.</p>
                    ) : (
                      <div className="facility-department-options">
                        {departments.map((department) => (
                          <label key={department.id}>
                            <input
                              type="checkbox"
                              checked={facilityForm.departmentIds.includes(department.id)}
                              onChange={() => toggleFacilityDepartment(department.id)}
                            />
                            <span>{department.departmentName}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </fieldset>
                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={savingFacility || departments.length === 0}
                  >
                    {savingFacility ? "Đang tạo..." : "Tạo cơ sở và liên kết chuyên khoa"}
                  </button>
                </form>
              </section>
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
