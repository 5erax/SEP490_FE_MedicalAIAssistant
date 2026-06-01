import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bell,
  BrainCircuit,
  Building2,
  CalendarDays,
  ClipboardList,
  Cpu,
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
import { Badge, DataTable, EmptyState, LoadingState } from "../components/ui";
import DoctorFilters from "../components/adminDoctors/DoctorFilters";
import DoctorFormModal from "../components/adminDoctors/DoctorFormModal";
import DoctorTable from "../components/adminDoctors/DoctorTable";
import AIConfigDetailModal from "../components/adminAIConfigs/AIConfigDetailModal";
import AIConfigFormModal from "../components/adminAIConfigs/AIConfigFormModal";
import AIConfigTable from "../components/adminAIConfigs/AIConfigTable";
import AIConfigToolbar from "../components/adminAIConfigs/AIConfigToolbar";
import { getEnvironment } from "../components/adminAIConfigs/aiConfigUtils";
import {
  authApi,
  clearStoredAuth,
  getStoredAuth,
  medicalFacilitiesApi,
  medicalDepartmentsApi,
  usersApi,
} from "../services/api";
import { aiConfigManagementApi } from "../services/aiConfigManagement";
import { doctorManagementApi } from "../services/doctors";
import { hasRole, normalizeRoles } from "../utils/roles";
import "../styles/operator-workspace.css";

const EMPTY_DEPARTMENT = { departmentName: "", description: "" };
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
const EMPTY_AI_CONFIG_FILTERS = {
  search: "",
  status: "",
  taskType: "",
  model: "",
  environment: "",
};
const DEFAULT_AI_CONFIG_PAGE_SIZE = 10;

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

export default function AdminWorkspacePage() {
  const { confirmAction, showToast } = useFeedback();
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [profile, setProfile] = useState(null);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [aiConfigs, setAIConfigs] = useState([]);
  const [pageInfo, setPageInfo] = useState({ pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 });
  const [doctorPageInfo, setDoctorPageInfo] = useState({ pageNumber: 1, pageSize: DEFAULT_DOCTOR_PAGE_SIZE, totalCount: 0, totalPages: 1 });
  const [aiConfigPageInfo, setAIConfigPageInfo] = useState({ pageNumber: 1, pageSize: DEFAULT_AI_CONFIG_PAGE_SIZE, totalCount: 0, totalPages: 1 });
  const [activeSection, setActiveSection] = useState("overview");
  const [search, setSearch] = useState("");
  const [doctorFilters, setDoctorFilters] = useState(EMPTY_DOCTOR_FILTERS);
  const [aiConfigFilters, setAIConfigFilters] = useState(EMPTY_AI_CONFIG_FILTERS);
  const [departmentForm, setDepartmentForm] = useState(EMPTY_DEPARTMENT);
  const [editingDepartmentId, setEditingDepartmentId] = useState("");
  const [staffForm, setStaffForm] = useState(EMPTY_STAFF);
  const [doctorModal, setDoctorModal] = useState({ open: false, mode: "create", doctor: null });
  const [aiConfigModal, setAIConfigModal] = useState({ open: false, mode: "create", config: null });
  const [aiConfigDetail, setAIConfigDetail] = useState(null);
  const [loading, setLoading] = useState(Boolean(auth));
  const [usersLoading, setUsersLoading] = useState(true);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [aiConfigsLoading, setAIConfigsLoading] = useState(true);
  const [facilitiesLoading, setFacilitiesLoading] = useState(true);
  const [savingDepartment, setSavingDepartment] = useState(false);
  const [savingStaff, setSavingStaff] = useState(false);
  const [savingDoctor, setSavingDoctor] = useState(false);
  const [savingAIConfig, setSavingAIConfig] = useState(false);
  const [globalMessage, setGlobalMessage] = useState(null);
  const [usersMessage, setUsersMessage] = useState(null);
  const [departmentMessage, setDepartmentMessage] = useState(null);
  const [staffMessage, setStaffMessage] = useState(null);
  const [doctorMessage, setDoctorMessage] = useState(null);
  const [aiConfigMessage, setAIConfigMessage] = useState(null);

  const roles = useMemo(() => normalizeRoles(profile?.roles ?? auth?.roles ?? []), [auth, profile]);
  const isAdmin = hasRole(roles, "admin");
  const displayName = profile?.name || profile?.displayName || auth?.email?.split("@")[0] || "Admin";

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return users;

    return users.filter((user) => {
      return [user.email, user.displayName, user.identityId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });
  }, [search, users]);

  const pendingUsers = users.filter((user) => Number(user.status) !== 1).length;
  const activeDoctors = doctors.filter((doctor) => doctor.isActive).length;
  const activeAIConfigs = aiConfigs.filter((config) => config.isActive).length;
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
    return doctors
      .filter((doctor) => doctor.facilityDepartmentId)
      .map((doctor) => ({
        id: doctor.facilityDepartmentId,
        facilityId: doctor.facilityId,
        departmentId: doctor.departmentId,
        label: `${doctor.facilityName || "Cơ sở y tế"} - ${doctor.departmentName || "Chuyên khoa"}`,
      }));
  }, [doctors]);

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
    ])
      .then(([profileResult, usersResult, departmentResult, doctorResult, aiConfigResult, facilityResult]) => {
        if (!active) return;

        if (profileResult.status === "fulfilled") {
          setProfile(profileResult.value.data ?? {});
        } else {
          setGlobalMessage({ type: "warning", text: profileResult.reason.message });
        }

        if (usersResult.status === "fulfilled") {
          const data = usersResult.value.data ?? {};
          setUsers(data.items ?? []);
          setPageInfo({
            pageNumber: data.pageNumber ?? 1,
            pageSize: data.pageSize ?? pageInfo.pageSize,
            totalCount: data.totalCount ?? 0,
            totalPages: data.totalPages ?? 1,
          });
        } else {
          setUsersMessage({ type: "error", text: usersResult.reason.message });
        }

        if (departmentResult.status === "fulfilled") {
          setDepartments(departmentResult.value.data ?? []);
        } else {
          setDepartmentMessage({ type: "error", text: departmentResult.reason.message });
        }

        if (doctorResult.status === "fulfilled") {
          const data = doctorResult.value.data ?? {};
          setDoctors(data.items ?? []);
          setDoctorPageInfo({
            pageNumber: data.pageNumber ?? 1,
            pageSize: data.pageSize ?? DEFAULT_DOCTOR_PAGE_SIZE,
            totalCount: data.totalCount ?? 0,
            totalPages: data.totalPages ?? 1,
          });
        } else {
          console.error("Không thể tải danh sách bác sĩ:", doctorResult.reason);
          setDoctorMessage({ type: "error", text: doctorResult.reason.message });
        }

        if (aiConfigResult.status === "fulfilled") {
          const data = aiConfigResult.value.data ?? {};
          setAIConfigs(data.items ?? []);
          setAIConfigPageInfo({
            pageNumber: data.pageNumber ?? 1,
            pageSize: data.pageSize ?? DEFAULT_AI_CONFIG_PAGE_SIZE,
            totalCount: data.totalCount ?? 0,
            totalPages: data.totalPages ?? 1,
          });
        } else {
          console.error("AI Config API error:", aiConfigResult.reason);
          setAIConfigMessage({ type: "error", text: aiConfigResult.reason.message });
        }

        if (facilityResult.status === "fulfilled") {
          setFacilities(facilityResult.value.data?.items ?? facilityResult.value.data ?? []);
        } else {
          console.error("Không thể tải danh sách bệnh viện:", facilityResult.reason);
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
    } catch (error) {
      setUsersMessage({ type: "error", text: error.message });
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
    try {
      const response = await medicalFacilitiesApi.list(1, 100);
      setFacilities(response.data?.items ?? response.data ?? []);
    } catch (error) {
      console.error("Không thể tải danh sách bệnh viện:", error);
      showToast({ type: "error", title: "Không tải được bệnh viện", message: error.message });
    } finally {
      setFacilitiesLoading(false);
    }
  }

  async function loadDoctors(pageNumber = doctorPageInfo.pageNumber, filters = doctorFilters) {
    setDoctorsLoading(true);
    setDoctorMessage(null);
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
      setDoctorMessage({ type: "error", text: error.message });
      showToast({ type: "error", title: "Không tải được danh sách bác sĩ", message: error.message });
    } finally {
      setDoctorsLoading(false);
    }
  }

  async function loadAIConfigs(pageNumber = aiConfigPageInfo.pageNumber, pageSize = aiConfigPageInfo.pageSize) {
    setAIConfigsLoading(true);
    setAIConfigMessage(null);
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
      setAIConfigMessage({ type: "error", text: error.message });
      showToast({ type: "error", title: "Không tải được AI configs", message: error.message });
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
    setAIConfigModal({ open: true, mode: "create", config: null });
  }

  function openEditAIConfig(config) {
    setAIConfigModal({ open: true, mode: "edit", config });
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
    setDoctorModal({ open: true, mode: "create", doctor: null });
  }

  function openEditDoctor(doctor) {
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
    setActiveSection("departments");
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
    try {
      await authApi.logout();
    } catch {
      // Keep local logout reliable when the server session is already gone.
    } finally {
      clearStoredAuth();
      setAuth(null);
      window.location.href = "/";
    }
  }

  const userColumns = [
    {
      key: "user",
      header: "Người dùng",
      render: (item) => (
        <div className="table-primary-cell">
          <strong>{item.displayName || item.email || "Người dùng"}</strong>
          <span>{item.email || "Chưa có email"}</span>
          <small>{item.identityId}</small>
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
              <button className={activeSection === "overview" ? "active" : ""} type="button" onClick={() => setActiveSection("overview")}>
                <span className="admin-nav-icon"><LayoutDashboard size={17} /></span>
                <span>Tổng quan</span>
              </button>
              <button className={activeSection === "users" ? "active" : ""} type="button" onClick={() => setActiveSection("users")}>
                <span className="admin-nav-icon"><Users size={17} /></span>
                <span>Người dùng</span>
              </button>
              <button className={activeSection === "doctors" ? "active" : ""} type="button" onClick={() => setActiveSection("doctors")}>
                <span className="admin-nav-icon"><Stethoscope size={17} /></span>
                <span>Bác sĩ</span>
              </button>
              <button className={activeSection === "ai-configs" ? "active" : ""} type="button" onClick={() => setActiveSection("ai-configs")}>
                <span className="admin-nav-icon"><BrainCircuit size={17} /></span>
                <span>AI Config</span>
              </button>
              <button className={activeSection === "staff" ? "active" : ""} type="button" onClick={() => setActiveSection("staff")}>
                <span className="admin-nav-icon"><UserPlus size={17} /></span>
                <span>Tạo staff</span>
              </button>
              <button className={activeSection === "departments" ? "active" : ""} type="button" onClick={() => setActiveSection("departments")}>
                <span className="admin-nav-icon"><Building2 size={17} /></span>
                <span>Chuyên khoa</span>
              </button>
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
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm user, email hoặc ID..." />
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
                    <small>ID: {profile?.userId || auth.userId || "Admin"}</small>
                  </div>
                </div>
              </div>
            </header>

            <ApiMessage message={globalMessage} />

            <section className="admin-hero-panel">
              <div>
                <p className="eyebrow">Admin Workspace</p>
                <h1>Quản trị MediMate AI</h1>
                <p>Giám sát người dùng, bác sĩ, AI config và danh mục chuyên khoa trong một dashboard rõ ràng cho vận hành hằng ngày.</p>
              </div>
              <div className="admin-top-actions">
                <a className="btn btn-ghost btn-small" href="/app/staff">Giao diện nhân sự</a>
                <button className="btn btn-primary btn-small" type="button" onClick={() => {
                  loadUsers();
                  loadDepartments();
                  loadDoctors();
                  loadAIConfigs();
                  loadFacilities();
                }}><RefreshCw size={15} /> Đồng bộ dữ liệu</button>
              </div>
            </section>

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
                      <button className={`admin-operation admin-operation-${item.tone}`} type="button" key={item.title} onClick={() => setActiveSection(item.section)}>
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
              <section className="admin-panel">
                <div className="panel-title-row">
                  <div>
                    <p className="eyebrow">Tài khoản</p>
                    <h2>Quản lý người dùng</h2>
                  </div>
                  <button className="btn btn-ghost btn-small" type="button" onClick={() => loadUsers()}>Tải lại</button>
                </div>
                <ApiMessage message={usersMessage} />
                <div className="admin-toolbar">
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo email, tên hoặc ID..." />
                  <select value={pageInfo.pageSize} onChange={(event) => setPageInfo((current) => ({ ...current, pageSize: Number(event.target.value) }))}>
                    <option value="10">10 / trang</option>
                    <option value="20">20 / trang</option>
                    <option value="50">50 / trang</option>
                  </select>
                </div>

                {usersLoading ? (
                  <LoadingState label="Đang tải danh sách người dùng..." />
                ) : (
                  <DataTable
                    columns={userColumns}
                    rows={filteredUsers}
                    getRowKey={(item) => item.identityId}
                    emptyState={<EmptyState title="Không tìm thấy người dùng" description="Thử đổi từ khóa tìm kiếm hoặc tải lại danh sách." />}
                  />
                )}

                <div className="pagination-row">
                  <button className="btn btn-ghost btn-small" type="button" disabled={pageInfo.pageNumber <= 1} onClick={() => loadUsers(pageInfo.pageNumber - 1)}>Trước</button>
                  <span>Trang {pageInfo.pageNumber} / {pageInfo.totalPages || 1} · {pageInfo.totalCount} user</span>
                  <button className="btn btn-ghost btn-small" type="button" disabled={pageInfo.pageNumber >= pageInfo.totalPages} onClick={() => loadUsers(pageInfo.pageNumber + 1)}>Sau</button>
                </div>
              </section>
            )}

            {activeSection === "doctors" && (
              <section className="admin-panel doctor-admin-panel">
                <div className="panel-title-row doctor-section-heading">
                  <div>
                    <p className="eyebrow">Doctor Management</p>
                    <h2>Quản lý bác sĩ</h2>
                    <p className="muted-text">Tạo, cập nhật, lọc và quản lý trạng thái bác sĩ theo bệnh viện/chuyên khoa từ API backend.</p>
                  </div>
                </div>

                <ApiMessage message={doctorMessage} />

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
                  <div className="doctor-skeleton-list" aria-live="polite">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div className="doctor-skeleton-row" key={index}>
                        <span />
                        <div />
                        <div />
                        <div />
                      </div>
                    ))}
                  </div>
                ) : (
                  <DoctorTable
                    doctors={doctors}
                    onEdit={openEditDoctor}
                    onToggleStatus={handleToggleDoctorStatus}
                    onDelete={handleDeleteDoctor}
                    onCreate={openCreateDoctor}
                  />
                )}

                <div className="pagination-row">
                  <button className="btn btn-ghost btn-small" type="button" disabled={doctorPageInfo.pageNumber <= 1 || doctorsLoading} onClick={() => loadDoctors(doctorPageInfo.pageNumber - 1)}>
                    Trước
                  </button>
                  <span>Trang {doctorPageInfo.pageNumber} / {doctorPageInfo.totalPages || 1} · {doctorPageInfo.totalCount} bác sĩ</span>
                  <button className="btn btn-ghost btn-small" type="button" disabled={doctorPageInfo.pageNumber >= doctorPageInfo.totalPages || doctorsLoading} onClick={() => loadDoctors(doctorPageInfo.pageNumber + 1)}>
                    Sau
                  </button>
                </div>
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
                  <div className="ai-config-skeleton-list" aria-live="polite">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div className="ai-config-skeleton-row" key={index}>
                        <span />
                        <div />
                        <div />
                        <div />
                      </div>
                    ))}
                  </div>
                ) : (
                  <AIConfigTable
                    configs={filteredAIConfigs}
                    onView={setAIConfigDetail}
                    onEdit={openEditAIConfig}
                    onToggleStatus={handleToggleAIConfigStatus}
                    onDelete={handleDeleteAIConfig}
                    onCreate={openCreateAIConfig}
                  />
                )}

                <div className="pagination-row">
                  <button className="btn btn-ghost btn-small" type="button" disabled={aiConfigPageInfo.pageNumber <= 1 || aiConfigsLoading} onClick={() => loadAIConfigs(aiConfigPageInfo.pageNumber - 1)}>
                    Trước
                  </button>
                  <span>Trang {aiConfigPageInfo.pageNumber} / {aiConfigPageInfo.totalPages || 1} · {filteredAIConfigs.length} / {aiConfigPageInfo.totalCount} configs</span>
                  <button className="btn btn-ghost btn-small" type="button" disabled={aiConfigPageInfo.pageNumber >= aiConfigPageInfo.totalPages || aiConfigsLoading} onClick={() => loadAIConfigs(aiConfigPageInfo.pageNumber + 1)}>
                    Sau
                  </button>
                </div>
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
          onClose={closeAIConfigModal}
          onSubmit={handleSaveAIConfig}
        />
      )}
      {aiConfigDetail && (
        <AIConfigDetailModal config={aiConfigDetail} onClose={() => setAIConfigDetail(null)} />
      )}
    </main>
  );
}
