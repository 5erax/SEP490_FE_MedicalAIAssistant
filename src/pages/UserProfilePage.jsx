import { Children, cloneElement, useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, CreditCard, Eye, EyeOff, FileHeart, Plus, ReceiptText, ShieldCheck, Trash2, User } from "lucide-react";
import { useFeedback } from "../components/feedback/feedbackContext";
import PaymentHistoryPanel from "../components/payments/PaymentHistoryPanel";
import { ErrorState, LoadingState } from "../components/ui";
import { useUnsavedChangesWarning } from "../hooks/useUnsavedChangesWarning";
import { navigate as go } from "../router/navigation";
import {
  authApi,
  getStoredAuth,
  patientProfilesApi,
  subscriptionUsageApi,
  usersApi,
  userSubscriptionsApi,
} from "../services/api";
import { getSubscriptionStatusLabel } from "../services/paymentStatusLabels";
import {
  getChronicDiseaseText,
  normalizeChronicDiseases,
  normalizePersonalProfile,
  validateMedicalProfile,
  validatePersonalProfile,
} from "../utils/profileValidation";

const EMPTY_USER = { displayName: "", email: "", phoneNumber: "", address: "", gender: "1", dateOfBirth: "" };
const EMPTY_DISEASE = { diseaseName: "", from: "", to: "", note: "" };
const tabs = [
  ["info", User, "Thông tin cá nhân"],
  ["medical", FileHeart, "Hồ sơ y tế"],
  ["package", CreditCard, "Gói dịch vụ"],
  ["transactions", ReceiptText, "Giao dịch"],
  ["security", ShieldCheck, "Bảo mật"],
];
const TAB_IDS = new Set(tabs.map(([id]) => id));
function formatPlanName(planName) {
  const normalizedName = String(planName ?? "").trim();
  if (!normalizedName) return "Miễn phí";
  if (["free", "freemium"].includes(normalizedName.toLowerCase())) return "Miễn phí";
  return normalizedName;
}

function formatSubscriptionStatus(status) {
  const normalizedStatus = String(status ?? "").trim();
  if (!normalizedStatus) return "Chưa có gói trả phí";
  return getSubscriptionStatusLabel(normalizedStatus, normalizedStatus);
}

function getInitialTab() {
  const requestedTab = new URLSearchParams(window.location.search).get("tab");
  if (requestedTab === "subscription") return "transactions";
  return TAB_IDS.has(requestedTab) ? requestedTab : "info";
}

function initials(name) {
  return name.split(" ").filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase() || "MM";
}

function createEmptyDisease() {
  return {
    localId: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    ...EMPTY_DISEASE,
  };
}

function normalizeDiseaseForForm(disease) {
  return {
    localId: disease?.id ?? crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    diseaseName: disease?.diseaseName ?? "",
    from: disease?.from ? String(disease.from).slice(0, 10) : "",
    to: disease?.to ? String(disease.to).slice(0, 10) : "",
    note: disease?.note ?? "",
  };
}

function hasChronicDisease(disease) {
  return Boolean(
    String(disease?.diseaseName ?? "").trim()
    || String(disease?.from ?? "").trim()
    || String(disease?.to ?? "").trim()
    || String(disease?.note ?? "").trim(),
  );
}

export default function UserProfilePage() {
  const { showToast } = useFeedback();
  const auth = getStoredAuth();
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState("");
  const [profileForm, setProfileForm] = useState(EMPTY_USER);
  const [profileSnapshot, setProfileSnapshot] = useState(EMPTY_USER);
  const [medicalForm, setMedicalForm] = useState({
    bloodType: "",
    height: "",
    weight: "",
    allergyNote: "",
    chronicDiseases: [],
  });
  const [medicalSnapshot, setMedicalSnapshot] = useState({
    bloodType: "",
    height: "",
    weight: "",
    allergyNote: "",
    chronicDiseases: [],
  });
  const [userId, setUserId] = useState("");
  const [patientProfileId, setPatientProfileId] = useState("");
  const [subscription, setSubscription] = useState(null);
  const [usageList, setUsageList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadWarning, setLoadWarning] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [sectionLoadState, setSectionLoadState] = useState({
    personal: "loading",
    medical: "loading",
    subscription: "loading",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingMedical, setSavingMedical] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);
  const [medicalDirty, setMedicalDirty] = useState(false);
  const [isMedicalEditing, setIsMedicalEditing] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
  const [passwordVisibility, setPasswordVisibility] = useState({ currentPassword: false, newPassword: false, confirmNewPassword: false });
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const confirmNewPasswordRef = useRef(null);
  const profileFormRef = useRef(null);
  const medicalFormRef = useRef(null);
  const pendingDiseaseFocusRef = useRef(false);

  useUnsavedChangesWarning(profileDirty || medicalDirty);

  useEffect(() => {
    if (!pendingDiseaseFocusRef.current) return;
    pendingDiseaseFocusRef.current = false;
    const diseaseInputs = medicalFormRef.current?.querySelectorAll("[data-disease-name]");
    diseaseInputs?.[diseaseInputs.length - 1]?.focus();
  }, [medicalForm.chronicDiseases.length]);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      authApi.me(),
      patientProfilesApi.list(1, 100),
      userSubscriptionsApi.me(),
      subscriptionUsageApi.getUsage(),
    ]).then(([userResult, profileResult, subscriptionResult, usageResult]) => {
      if (!active) return;

      const unavailableSections = [];
      if (userResult.status !== "fulfilled") unavailableSections.push("thông tin cá nhân");
      if (profileResult.status !== "fulfilled") unavailableSections.push("hồ sơ y tế");
      if (subscriptionResult.status !== "fulfilled") unavailableSections.push("gói dịch vụ");
      setLoadWarning(unavailableSections.length
        ? `Chưa thể tải ${unavailableSections.join(", ")}. Bạn có thể thử lại.`
        : "");

      const user = userResult.status === "fulfilled" ? userResult.value.data ?? {} : {};
      const resolvedUserId = user.userId ?? user.identityId ?? user.id ?? auth?.userId ?? auth?.identityId ?? "";
      setUserId(resolvedUserId);
      if (userResult.status === "fulfilled") {
        const nextProfile = {
          displayName: user.displayName ?? user.name ?? "",
          email: user.email ?? "",
          phoneNumber: user.phoneNumber ?? "",
          address: user.address ?? "",
          gender: String(user.gender ?? "1"),
          dateOfBirth: user.dateOfBirth ? String(user.dateOfBirth).slice(0, 10) : "",
        };
        setProfileForm(nextProfile);
        setProfileSnapshot(nextProfile);
        setProfileDirty(false);
      }

      const profiles = profileResult.status === "fulfilled" ? profileResult.value.data?.items ?? [] : [];
      const patientProfile = profiles.find((item) => String(item.userId) === String(resolvedUserId)) ?? null;
      if (profileResult.status === "fulfilled") {
        setPatientProfileId(patientProfile?.id ?? "");
        const nextMedical = {
          bloodType: patientProfile?.bloodType ?? "",
          height: patientProfile?.height ?? "",
          weight: patientProfile?.weight ?? "",
          allergyNote: patientProfile?.allergyNote ?? "",
          chronicDiseases: Array.isArray(patientProfile?.chronicDiseases) && patientProfile.chronicDiseases.length > 0
            ? patientProfile.chronicDiseases.map(normalizeDiseaseForForm)
            : normalizeChronicDiseases(getChronicDiseaseText(patientProfile)).map(normalizeDiseaseForForm),
        };
        setMedicalForm(nextMedical);
        setMedicalSnapshot(nextMedical);
        setMedicalDirty(false);
      }

      const subscriptions = subscriptionResult.status === "fulfilled"
        ? Array.isArray(subscriptionResult.value.data) ? subscriptionResult.value.data : []
        : [];
      if (subscriptionResult.status === "fulfilled") {
        setSubscription(subscriptions.find((item) => String(item.status).toLowerCase() === "active") ?? subscriptions[0] ?? null);
      }
      // NO_ACTIVE_SUBSCRIPTION / RECOVERY_PLAN_QUOTA_NOT_CONFIGURED are
      // expected states (no plan yet), not a load failure worth warning
      // about - the quota list just stays empty in that case.
      const usageItems = usageResult.status === "fulfilled" ? usageResult.value?.data ?? [] : [];
      setUsageList(Array.isArray(usageItems) ? usageItems : []);
      setSectionLoadState({
        personal: userResult.status === "fulfilled" ? "ready" : "error",
        medical: profileResult.status === "fulfilled" ? "ready" : "error",
        subscription: subscriptionResult.status === "fulfilled" ? "ready" : "error",
      });
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [auth?.identityId, auth?.userId, loadAttempt]);

  function retryProfileData() {
    setLoading(true);
    setLoadWarning("");
    setSectionLoadState({
      personal: "loading",
      medical: "loading",
      subscription: "loading",
    });
    setLoadAttempt((current) => current + 1);
  }

  function selectTab(tabId) {
    setActiveTab(tabId);
    const nextUrl = tabId === "info" ? "/profile" : `/profile?tab=${tabId}`;
    window.history.replaceState(null, "", nextUrl);
  }

  function handleTabKeyDown(event, currentTabId) {
    const currentIndex = tabs.findIndex(([id]) => id === currentTabId);
    let nextIndex;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    else return;

    event.preventDefault();
    const nextTabId = tabs[nextIndex][0];
    selectTab(nextTabId);
    event.currentTarget.parentElement?.querySelectorAll('[role="tab"]')[nextIndex]?.focus();
  }

  function focusFirstError(formRef) {
    window.requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus());
  }

  function updateProfile(key, value) {
    setProfileForm((current) => ({ ...current, [key]: value }));
    setProfileDirty(true);
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  function updateMedical(key, value) {
    setMedicalForm((current) => ({ ...current, [key]: value }));
    setMedicalDirty(true);
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  function addMedicalDisease() {
    pendingDiseaseFocusRef.current = true;
    setIsMedicalEditing(true);
    setMedicalForm((current) => ({
      ...current,
      chronicDiseases: [...current.chronicDiseases, createEmptyDisease()],
    }));
    setMedicalDirty(true);
  }

  function updateMedicalDisease(index, key, value) {
    setMedicalForm((current) => ({
      ...current,
      chronicDiseases: current.chronicDiseases.map((disease, diseaseIndex) => (
        diseaseIndex === index ? { ...disease, [key]: value } : disease
      )),
    }));
    setMedicalDirty(true);
    setErrors((current) => ({ ...current, [`chronicDiseases.${index}.${key}`]: "" }));
  }

  function removeMedicalDisease(index) {
    setMedicalForm((current) => ({
      ...current,
      chronicDiseases: current.chronicDiseases.filter((_, diseaseIndex) => diseaseIndex !== index),
    }));
    setMedicalDirty(true);
  }

  function updatePasswordField(key, value) {
    setPasswordForm((current) => ({ ...current, [key]: value }));
    setPasswordMessage(null);
  }

  function togglePasswordVisibility(key) {
    setPasswordVisibility((current) => ({ ...current, [key]: !current[key] }));
  }

  async function handleUpdatePassword(event) {
    event.preventDefault();
    setPasswordMessage(null);
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setPasswordMessage({ type: "error", text: "Mật khẩu mới nhập lại chưa khớp." });
      window.requestAnimationFrame(() => confirmNewPasswordRef.current?.focus());
      return;
    }
    setSavingPassword(true);
    try {
      const response = await authApi.updatePassword(passwordForm);
      const text = response.message || "Đổi mật khẩu thành công.";
      setPasswordMessage({ type: "success", text });
      showToast({ type: "success", title: "Đã đổi mật khẩu", message: text });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
    } catch (error) {
      setPasswordMessage({ type: "error", text: error.message });
    } finally {
      setSavingPassword(false);
    }
  }

  function cancelProfileEdit() {
    setProfileForm(profileSnapshot);
    setErrors({});
    setProfileDirty(false);
    setIsEditing(false);
  }

  function resetMedicalForm() {
    setMedicalForm(medicalSnapshot);
    setErrors({});
    setMedicalDirty(false);
    setIsMedicalEditing(false);
  }

  function validateProfile() {
    const next = validatePersonalProfile(profileForm);
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function validateMedical() {
    const next = validateMedicalProfile(medicalForm);
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function saveProfile(event) {
    event.preventDefault();
    if (!validateProfile()) {
      setToast("Kiểm tra các trường được đánh dấu và thử lại.");
      focusFirstError(profileFormRef);
      return;
    }
    setSavingProfile(true);
    try {
      await usersApi.update(userId, normalizePersonalProfile(profileForm));
      setIsEditing(false);
      setProfileSnapshot(profileForm);
      setProfileDirty(false);
      setToast("Đã lưu thông tin!");
      showToast({ type: "success", title: "Đã lưu thông tin", message: "Hồ sơ cá nhân đã được cập nhật." });
    } catch {
      setToast("Không thể lưu thông tin cá nhân lúc này. Vui lòng thử lại.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveMedical(event) {
    event.preventDefault();
    if (!validateMedical()) {
      setToast("Kiểm tra các chỉ số sức khỏe được đánh dấu và thử lại.");
      focusFirstError(medicalFormRef);
      return;
    }
    const payload = {
      bloodType: medicalForm.bloodType || null,
      height: medicalForm.height === "" ? null : Number(medicalForm.height),
      weight: medicalForm.weight === "" ? null : Number(medicalForm.weight),
      allergyNote: medicalForm.allergyNote.trim() || null,
      chronicDiseases: medicalForm.chronicDiseases
        .filter(hasChronicDisease)
        .map((disease) => ({
          diseaseName: disease.diseaseName.trim(),
          from: disease.from || null,
          to: disease.to || null,
          note: disease.note.trim() || null,
        })),
    };
    setSavingMedical(true);
    try {
      const response = patientProfileId
        ? await patientProfilesApi.update(patientProfileId, payload)
        : await patientProfilesApi.create({ userId, ...payload });
      if (!patientProfileId) setPatientProfileId(response.data?.id ?? "");
      setMedicalSnapshot(medicalForm);
      setMedicalDirty(false);
      setIsMedicalEditing(false);
      setToast("Đã lưu hồ sơ!");
      showToast({ type: "success", title: "Đã lưu hồ sơ", message: "Thông tin sức khỏe đã được cập nhật." });
    } catch {
      setToast("Không thể lưu hồ sơ y tế lúc này. Vui lòng thử lại.");
    } finally {
      setSavingMedical(false);
    }
  }

  const personalCompletion = [
    profileForm.displayName,
    profileForm.email,
    profileForm.phoneNumber,
    profileForm.address,
    profileForm.dateOfBirth,
  ].filter(Boolean).length;
  const medicalCompletion = [
    medicalForm.bloodType,
    medicalForm.height,
    medicalForm.weight,
    medicalForm.allergyNote,
    medicalForm.chronicDiseases.some(hasChronicDisease),
  ].filter(Boolean).length;
  const personalMissing = [
    [profileForm.displayName, "họ tên"],
    [profileForm.email, "email"],
    [profileForm.phoneNumber, "số điện thoại"],
    [profileForm.address, "địa chỉ"],
    [profileForm.dateOfBirth, "ngày sinh"],
  ].filter(([value]) => !value).map(([, label]) => label);
  const medicalMissing = [
    [medicalForm.bloodType, "nhóm máu"],
    [medicalForm.height, "chiều cao"],
    [medicalForm.weight, "cân nặng"],
    [medicalForm.allergyNote, "dị ứng"],
    [medicalForm.chronicDiseases.some(hasChronicDisease), "bệnh nền"],
  ].filter(([value]) => !value).map(([, label]) => label);
  const personalReady = sectionLoadState.personal === "ready";
  const medicalReady = sectionLoadState.medical === "ready";
  const subscriptionReady = sectionLoadState.subscription === "ready";

  return (
    <div className="profile-page">
      <style>{styles}</style>
      <aside className="profile-sidebar">
        <div className="profile-identity">
          <span>{initials(profileForm.displayName)}</span>
          <strong>
            {sectionLoadState.personal === "loading"
              ? "Đang tải…"
              : sectionLoadState.personal === "error"
                ? "Hồ sơ chưa khả dụng"
                : profileForm.displayName || "Người dùng"}
          </strong>
          <small>{personalReady ? profileForm.email : ""}</small>
        </div>
        <nav role="tablist" aria-label="Các mục hồ sơ">
          {tabs.map(([id, Icon, label]) => (
            <button id={`profile-tab-${id}`} role="tab" aria-selected={activeTab === id} aria-controls={`profile-panel-${id}`} tabIndex={activeTab === id ? 0 : -1} className={activeTab === id ? "active" : ""} key={id} type="button" onClick={() => selectTab(id)} onKeyDown={(event) => handleTabKeyDown(event, id)}>
              <span><Icon size={18} strokeWidth={2} aria-hidden="true" /></span>{label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="profile-content">
        <nav className="profile-quick-nav" aria-label="Điều hướng nhanh">
          <button type="button" onClick={() => go("/dashboard")}>← Trang chủ</button>
          <button type="button" onClick={() => go("/dashboard")}>Phân tích triệu chứng</button>
          <button type="button" onClick={() => go("/records")}>Hồ sơ y tế</button>
          <button type="button" onClick={() => go("/map")}>Bản đồ</button>
        </nav>
        {loadWarning && <div className="profile-load-warning" role="alert"><AlertTriangle size={18} aria-hidden="true" /><span>{loadWarning}</span><button type="button" onClick={retryProfileData}>Thử lại</button></div>}
        <section className="profile-overview" aria-label="Tổng quan hồ sơ cá nhân" aria-busy={loading}>
          <div className="profile-overview-person">
            <span>{initials(profileForm.displayName)}</span>
            <div>
              <p>Không gian cá nhân</p>
              <h1>
                {sectionLoadState.personal === "loading"
                  ? "Đang tải hồ sơ…"
                  : sectionLoadState.personal === "error"
                    ? "Thông tin hồ sơ chưa khả dụng"
                    : profileForm.displayName || "Cập nhật hồ sơ của bạn"}
              </h1>
              <small>{personalReady ? profileForm.email || "Chưa có email" : "Vui lòng thử tải lại dữ liệu."}</small>
            </div>
          </div>
          <div className="profile-summary-grid">
            <button type="button" className="profile-summary-card" onClick={() => selectTab("info")}>
              <span>Thông tin</span>
              <strong>
                {sectionLoadState.personal === "loading"
                  ? "Đang tải"
                  : personalReady ? `${personalCompletion}/5` : "Không khả dụng"}
              </strong>
              <small>
                {personalReady
                  ? personalMissing.length
                    ? `Còn thiếu: ${personalMissing.slice(0, 2).join(", ")}${personalMissing.length > 2 ? "…" : ""}`
                    : "Đã hoàn thiện thông tin cơ bản"
                  : "Chưa thể xác định tiến độ hồ sơ."}
              </small>
              {personalReady && <i role="progressbar" aria-label="Tiến độ thông tin cá nhân" aria-valuemin="0" aria-valuemax="5" aria-valuenow={personalCompletion}><b style={{ width: `${personalCompletion * 20}%` }} /></i>}
            </button>
            <button type="button" className="profile-summary-card" onClick={() => selectTab("medical")}>
              <span>Y tế</span>
              <strong>
                {sectionLoadState.medical === "loading"
                  ? "Đang tải"
                  : medicalReady ? `${medicalCompletion}/5` : "Không khả dụng"}
              </strong>
              <small>
                {medicalReady
                  ? medicalMissing.length
                    ? `Còn thiếu: ${medicalMissing.slice(0, 2).join(", ")}${medicalMissing.length > 2 ? "…" : ""}`
                    : "Đã hoàn thiện dữ liệu sức khỏe"
                  : "Chưa thể xác định tiến độ hồ sơ y tế."}
              </small>
              {medicalReady && <i role="progressbar" aria-label="Tiến độ hồ sơ y tế" aria-valuemin="0" aria-valuemax="5" aria-valuenow={medicalCompletion}><b style={{ width: `${medicalCompletion * 20}%` }} /></i>}
            </button>
            <article>
              <span>Gói dịch vụ</span>
              <strong>
                {sectionLoadState.subscription === "loading"
                  ? "Đang tải"
                  : subscriptionReady ? formatPlanName(subscription?.planName) : "Không khả dụng"}
              </strong>
              <small>
                {subscriptionReady
                  ? formatSubscriptionStatus(subscription?.status)
                  : "Chưa thể xác định gói hiện tại."}
              </small>
            </article>
          </div>
        </section>
        <div className="mobile-tabs" role="tablist" aria-label="Các mục hồ sơ trên di động">
          {tabs.map(([id, Icon, label]) => (
            <button role="tab" aria-selected={activeTab === id} aria-controls={`profile-panel-${id}`} tabIndex={activeTab === id ? 0 : -1} className={activeTab === id ? "active" : ""} key={id} type="button" onClick={() => selectTab(id)} onKeyDown={(event) => handleTabKeyDown(event, id)}>
              <span><Icon size={18} strokeWidth={2} aria-hidden="true" /></span><small>{label}</small>
            </button>
          ))}
        </div>
        {toast && <div className="toast" role={Object.keys(errors).length ? "alert" : "status"} aria-live={Object.keys(errors).length ? "assertive" : "polite"}>{toast}</div>}

        {activeTab === "info" && (
          sectionLoadState.personal === "loading" ? (
            <section id="profile-panel-info" role="tabpanel" aria-label="Thông tin cá nhân">
              <LoadingState
                className="profile-card"
                label="Đang tải thông tin cá nhân..."
                description="Dữ liệu hồ sơ đang được đồng bộ."
              />
            </section>
          ) : sectionLoadState.personal === "error" ? (
            <section id="profile-panel-info" role="tabpanel" aria-label="Thông tin cá nhân">
              <ErrorState
                className="profile-card"
                title="Không thể tải thông tin cá nhân"
                description="Dữ liệu hiện chưa khả dụng và chưa bị thay thế bằng thông tin mặc định."
                urgent
                action={<button className="lime" type="button" onClick={retryProfileData}>Thử tải lại</button>}
              />
            </section>
          ) : (
            <form ref={profileFormRef} id="profile-panel-info" role="tabpanel" aria-label="Thông tin cá nhân" className={`profile-card ${isEditing ? "is-editing" : ""}`} aria-busy={savingProfile} onSubmit={saveProfile} noValidate>
            <div className="profile-head">
              <div><h1>Thông tin cá nhân</h1><span>Cơ bản</span></div>
              {!isEditing ? <button type="button" onClick={() => setIsEditing(true)}>Chỉnh sửa</button> : <div><button className="lime" type="submit" disabled={!profileDirty || savingProfile}>{savingProfile ? "Đang lưu…" : "Lưu thay đổi"}</button><button type="button" onClick={cancelProfileEdit} disabled={savingProfile}>Huỷ</button></div>}
            </div>
            <div className="form-grid">
              <Field label="Họ và tên" error={errors.displayName} wide><input name="displayName" autoComplete="name" value={profileForm.displayName} disabled={!isEditing || savingProfile} onChange={(e) => updateProfile("displayName", e.target.value)} /></Field>
              <Field label="Email" wide><input name="email" type="email" autoComplete="email" value={profileForm.email} disabled /><em>Không thể đổi</em></Field>
              <Field label="Giới tính" error={errors.gender}><select name="gender" autoComplete="sex" value={profileForm.gender} disabled={!isEditing || savingProfile} onChange={(e) => updateProfile("gender", e.target.value)}><option value="1">Nam</option><option value="2">Nữ</option><option value="0">Khác</option></select></Field>
              <Field label="Ngày sinh" error={errors.dateOfBirth}><input name="dateOfBirth" type="date" autoComplete="bday" value={profileForm.dateOfBirth} disabled={!isEditing || savingProfile} onChange={(e) => updateProfile("dateOfBirth", e.target.value)} /></Field>
              <Field label="Số điện thoại" error={errors.phoneNumber}><input name="phoneNumber" type="tel" inputMode="tel" autoComplete="tel" value={profileForm.phoneNumber} disabled={!isEditing || savingProfile} onChange={(e) => updateProfile("phoneNumber", e.target.value)} /></Field>
              <Field label="Địa chỉ" error={errors.address} wide><input name="address" autoComplete="street-address" value={profileForm.address} disabled={!isEditing || savingProfile} onChange={(e) => updateProfile("address", e.target.value)} /></Field>
            </div>
            </form>
          )
        )}

        {activeTab === "medical" && (
          sectionLoadState.medical === "loading" ? (
            <section id="profile-panel-medical" role="tabpanel" aria-label="Hồ sơ y tế">
              <LoadingState
                className="profile-card"
                label="Đang tải hồ sơ y tế..."
                description="Dữ liệu sức khỏe đang được đồng bộ."
              />
            </section>
          ) : sectionLoadState.medical === "error" ? (
            <section id="profile-panel-medical" role="tabpanel" aria-label="Hồ sơ y tế">
              <ErrorState
                className="profile-card"
                title="Không thể tải hồ sơ y tế"
                description="Dữ liệu hiện chưa khả dụng và chưa bị thay thế bằng hồ sơ trống."
                urgent
                action={<button className="lime" type="button" onClick={retryProfileData}>Thử tải lại</button>}
              />
            </section>
          ) : (
            <form ref={medicalFormRef} id="profile-panel-medical" role="tabpanel" aria-label="Hồ sơ y tế" className={`profile-card ${isMedicalEditing ? "is-editing" : ""}`} aria-busy={savingMedical} onSubmit={saveMedical} noValidate>
            <div className="profile-head"><div><h1>Hồ sơ y tế</h1><span>{patientProfileId ? "Đã đồng bộ" : "Chưa tạo"}</span></div>{!isMedicalEditing ? <button type="button" onClick={() => setIsMedicalEditing(true)}>Chỉnh sửa</button> : <div><button className="lime" type="submit" disabled={!medicalDirty || savingMedical}>{savingMedical ? "Đang lưu…" : "Lưu hồ sơ"}</button><button type="button" onClick={resetMedicalForm} disabled={savingMedical}>Huỷ</button></div>}</div>
            <div className="medical-privacy-note"><ShieldCheck size={19} aria-hidden="true" /><div><strong>Dữ liệu sức khỏe nhạy cảm</strong><p>Thông tin này hỗ trợ cá nhân hóa tư vấn. Chỉ nhập dữ liệu bạn biết chính xác.</p></div></div>
            <div className="form-grid three">
              <Field label="Nhóm máu"><select name="bloodType" value={medicalForm.bloodType} disabled={!isMedicalEditing || savingMedical} onChange={(e) => updateMedical("bloodType", e.target.value)}><option value="">Chưa rõ</option>{["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((v)=><option key={v}>{v}</option>)}</select></Field>
              <Field label="Chiều cao (cm)" error={errors.height}><input name="height" type="number" inputMode="decimal" min="40" max="250" step="0.1" value={medicalForm.height} disabled={!isMedicalEditing || savingMedical} onChange={(e) => updateMedical("height", e.target.value)} /></Field>
              <Field label="Cân nặng (kg)" error={errors.weight}><input name="weight" type="number" inputMode="decimal" min="2" max="500" step="0.1" value={medicalForm.weight} disabled={!isMedicalEditing || savingMedical} onChange={(e) => updateMedical("weight", e.target.value)} /></Field>
            </div>
            <Field label="Dị ứng" error={errors.allergyNote}><textarea name="allergyNote" rows={4} maxLength={1000} placeholder="Ví dụ: thuốc, thực phẩm, phấn hoa…" value={medicalForm.allergyNote} disabled={!isMedicalEditing || savingMedical} onChange={(e) => updateMedical("allergyNote", e.target.value)} /></Field>
            <section className="profile-disease-section" aria-label="Bệnh nền">
              <div className="profile-disease-head">
                <div>
                  <h2>Bệnh nền</h2>
                  <p>Mỗi bệnh nền gồm tên bệnh, thời gian theo dõi và ghi chú ngắn.</p>
                </div>
                <button type="button" onClick={addMedicalDisease} disabled={savingMedical}>
                  <Plus size={17} aria-hidden="true" />
                  Thêm bệnh nền
                </button>
              </div>
              {medicalForm.chronicDiseases.length === 0 ? (
                <div className="profile-disease-empty">
                  Chưa có bệnh nền nào. Bấm “Thêm bệnh nền” nếu bạn cần ghi nhận bệnh đang theo dõi.
                </div>
              ) : (
                <div className="profile-disease-list">
                  {medicalForm.chronicDiseases.map((disease, index) => (
                    <article className="profile-disease-card" key={disease.localId ?? index} role="group" aria-label={`Bệnh nền #${index + 1}`}>
                      <div className="profile-disease-card-head">
                        <strong>Bệnh nền #{index + 1}</strong>
                        <button type="button" onClick={() => removeMedicalDisease(index)} disabled={!isMedicalEditing || savingMedical}>
                          <Trash2 size={16} aria-hidden="true" />
                          Xóa
                        </button>
                      </div>
                      <div className="profile-disease-grid">
                        <label className="field wide">
                          <span>Tên bệnh</span>
                          <input
                            data-disease-name
                            id={`profile-disease-${index}-name`}
                            name={`chronicDiseases.${index}.diseaseName`}
                            value={disease.diseaseName}
                            placeholder="Ví dụ: hen suyễn, tăng huyết áp…"
                            disabled={!isMedicalEditing || savingMedical}
                            onChange={(event) => updateMedicalDisease(index, "diseaseName", event.target.value)}
                            aria-invalid={Boolean(errors[`chronicDiseases.${index}.diseaseName`])}
                            aria-describedby={errors[`chronicDiseases.${index}.diseaseName`] ? `profile-disease-${index}-name-error` : undefined}
                          />
                          {errors[`chronicDiseases.${index}.diseaseName`] && <small id={`profile-disease-${index}-name-error`}>{errors[`chronicDiseases.${index}.diseaseName`]}</small>}
                        </label>
                        <label className="field">
                          <span>Từ ngày</span>
                          <input
                            name={`chronicDiseases.${index}.from`}
                            type="date"
                            value={disease.from}
                            disabled={!isMedicalEditing || savingMedical}
                            onChange={(event) => updateMedicalDisease(index, "from", event.target.value)}
                          />
                        </label>
                        <label className="field">
                          <span>Đến ngày</span>
                          <input
                            name={`chronicDiseases.${index}.to`}
                            type="date"
                            value={disease.to}
                            disabled={!isMedicalEditing || savingMedical}
                            onChange={(event) => updateMedicalDisease(index, "to", event.target.value)}
                            aria-invalid={Boolean(errors[`chronicDiseases.${index}.to`])}
                            aria-describedby={errors[`chronicDiseases.${index}.to`] ? `profile-disease-${index}-to-error` : undefined}
                          />
                          {errors[`chronicDiseases.${index}.to`] && <small id={`profile-disease-${index}-to-error`}>{errors[`chronicDiseases.${index}.to`]}</small>}
                        </label>
                        <label className="field wide">
                          <span>Ghi chú</span>
                          <textarea
                            name={`chronicDiseases.${index}.note`}
                            rows={3}
                            value={disease.note}
                            placeholder="Ví dụ: đang dùng thuốc, tái khám định kỳ…"
                            disabled={!isMedicalEditing || savingMedical}
                            onChange={(event) => updateMedicalDisease(index, "note", event.target.value)}
                            aria-invalid={Boolean(errors[`chronicDiseases.${index}.note`])}
                            aria-describedby={errors[`chronicDiseases.${index}.note`] ? `profile-disease-${index}-note-error` : undefined}
                          />
                          {errors[`chronicDiseases.${index}.note`] && <small id={`profile-disease-${index}-note-error`}>{errors[`chronicDiseases.${index}.note`]}</small>}
                        </label>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
            </form>
          )
        )}

        {activeTab === "security" && (
          <section id="profile-panel-security" role="tabpanel" aria-label="Bảo mật" className="profile-card">
            <h1>Bảo mật</h1>
            <p>Nhập mật khẩu hiện tại và mật khẩu mới để đổi mật khẩu đăng nhập.</p>
            <form className="security-password-form" onSubmit={handleUpdatePassword}>
              <PasswordField
                label="Mật khẩu hiện tại"
                name="currentPassword"
                autoComplete="current-password"
                value={passwordForm.currentPassword}
                disabled={savingPassword}
                onChange={(e) => updatePasswordField("currentPassword", e.target.value)}
                visible={passwordVisibility.currentPassword}
                onToggleVisible={() => togglePasswordVisibility("currentPassword")}
                required
              />
              <PasswordField
                label="Mật khẩu mới"
                name="newPassword"
                autoComplete="new-password"
                value={passwordForm.newPassword}
                disabled={savingPassword}
                onChange={(e) => updatePasswordField("newPassword", e.target.value)}
                visible={passwordVisibility.newPassword}
                onToggleVisible={() => togglePasswordVisibility("newPassword")}
                required
              />
              <p className="field-hint">Tối thiểu 8 ký tự, nên có chữ hoa, chữ thường, số và ký tự đặc biệt.</p>
              <PasswordField
                label="Nhập lại mật khẩu mới"
                name="confirmNewPassword"
                autoComplete="new-password"
                inputRef={confirmNewPasswordRef}
                value={passwordForm.confirmNewPassword}
                disabled={savingPassword}
                onChange={(e) => updatePasswordField("confirmNewPassword", e.target.value)}
                visible={passwordVisibility.confirmNewPassword}
                onToggleVisible={() => togglePasswordVisibility("confirmNewPassword")}
                required
              />
              {passwordMessage && (
                <p
                  className={`security-message security-message-${passwordMessage.type}`}
                  role={passwordMessage.type === "error" ? "alert" : "status"}
                >
                  {passwordMessage.text}
                </p>
              )}
              <button className="lime" type="submit" disabled={savingPassword}>
                {savingPassword ? "Đang lưu…" : "Lưu mật khẩu mới"}
              </button>
            </form>
            <p className="security-fallback-note">Quên mật khẩu hiện tại? <button type="button" className="link-button" onClick={() => go("/forgot-password")}>Gửi mã xác thực qua email</button> để đổi mật khẩu.</p>
          </section>
        )}

        {activeTab === "package" && (
          sectionLoadState.subscription === "loading" ? (
            <section id="profile-panel-package" role="tabpanel" aria-label="Gói dịch vụ">
              <LoadingState
                className="profile-card"
                label="Đang tải gói dịch vụ..."
                description="Thông tin quyền lợi của tài khoản đang được đồng bộ."
              />
            </section>
          ) : sectionLoadState.subscription === "error" ? (
            <section id="profile-panel-package" role="tabpanel" aria-label="Gói dịch vụ">
              <ErrorState
                className="profile-card"
                title="Không thể tải gói dịch vụ"
                description="Chưa thể xác định gói hiện tại. Dữ liệu tài khoản của bạn chưa bị thay đổi."
                urgent
                action={<button className="lime" type="button" onClick={retryProfileData}>Thử tải lại</button>}
              />
            </section>
          ) : (
            <section id="profile-panel-package" role="tabpanel" aria-label="Gói dịch vụ" className="profile-card">
            <h1>Gói dịch vụ</h1>
            <div className="plan-box">
              <span>Gói hiện tại</span>
              <strong>{formatPlanName(subscription?.planName)}</strong>
              <p>
                {subscription
                  ? `${formatSubscriptionStatus(subscription.status)}${subscription.endDate ? ` · hết hạn ${new Date(subscription.endDate).toLocaleDateString("vi-VN")}` : ""}`
                  : "Bạn chưa có gói đăng ký trả phí đang hoạt động."}
              </p>
            </div>
            {usageList.length > 0 && (
              <div className="quota-list">
                {usageList.map((item) => (
                  <div className="plan-box quota-box" key={item.quotaCode}>
                    <span>{item.quotaName || "Hạn mức sử dụng"}</span>
                    <strong>{item.remainingCount ?? "—"}/{item.limitValue ?? "—"}</strong>
                    <p>
                      Đã dùng {item.usedCount ?? 0}
                      {Number(item.reservedCount) > 0 ? ` · đang giữ chỗ ${item.reservedCount}` : ""}
                      {item.cycleEnd ? ` · làm mới vào ${new Date(item.cycleEnd).toLocaleDateString("vi-VN")}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <button className="lime" type="button" onClick={() => go("/pricing?view=upgrade&returnTo=%2Fprofile")}>Nâng cấp MediMate+</button>
            </section>
          )
        )}

        {activeTab === "transactions" && (
          <PaymentHistoryPanel />
        )}
      </section>
    </div>
  );
}

function Field({ label, error, wide, children }) {
  const id = useId();
  const errorId = `${id}-error`;
  const [control, ...content] = Children.toArray(children);
  return (
    <label className={wide ? "field wide" : "field"} htmlFor={id}>
      <span>{label}</span>
      {cloneElement(control, {
        id,
        "aria-invalid": Boolean(error),
        "aria-describedby": error ? errorId : undefined,
      })}
      {content}
      {error && <small id={errorId}>{error}</small>}
    </label>
  );
}

function PasswordField({ label, name, value, onChange, autoComplete, disabled, required, inputRef, visible, onToggleVisible }) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <div className="password-input-wrap">
        <input
          id={id}
          ref={inputRef}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          disabled={disabled}
          required={required}
          onChange={onChange}
        />
        <button
          type="button"
          className="password-toggle"
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          onClick={onToggleVisible}
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
    </label>
  );
}

const styles = `
.profile-page{min-height:100vh;display:flex;background:#f7f8f3;color:#111412;font-family:"Be Vietnam Pro",system-ui,sans-serif}.profile-sidebar{width:220px;padding:24px 18px;border-right:1.5px solid #111412;background:#fff;position:sticky;top:0;height:100vh}.profile-identity{text-align:center;border-bottom:1px solid #dde4d5;padding-bottom:18px;margin-bottom:18px}.profile-identity span{display:grid;place-items:center;width:76px;height:76px;margin:0 auto 12px;border-radius:999px;background:#111412;color:#c4e995;font-size:24px;font-weight:900}.profile-identity strong,.profile-identity small{display:block}.profile-identity small{color:rgba(17,20,18,.56);margin-top:4px}.profile-sidebar nav{display:grid;gap:6px}.profile-sidebar button,.mobile-tabs button{border:0;background:transparent;color:#111412;font-weight:800;text-align:left;padding:12px;border-radius:8px}.profile-sidebar button{display:grid;grid-template-columns:22px minmax(0,1fr);align-items:center;gap:8px;line-height:1.25}.profile-sidebar button.active{background:#eef7e8;border-right:3px solid #c4e995}.profile-sidebar button span{display:grid;place-items:center;margin-right:0}.profile-content{flex:1;padding:24px;min-width:0}.profile-quick-nav{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}.profile-quick-nav button{min-height:38px;border:1.5px solid #111412;border-radius:999px;background:#fff;color:#111412;padding:0 13px;font-weight:900}.profile-quick-nav button:first-child{background:#c4e995}.profile-overview{display:grid;gap:16px;border:1.5px solid #111412;border-radius:14px;background:#fff;box-shadow:4px 4px 0 #111412;padding:20px;margin-bottom:14px}.profile-overview-person{display:grid;grid-template-columns:auto minmax(0,1fr);gap:14px;align-items:center}.profile-overview-person>span{display:grid;place-items:center;width:66px;height:66px;border-radius:18px;background:#111412;color:#c4e995;font-size:22px;font-weight:950}.profile-overview-person p,.profile-overview-person h1,.profile-overview-person small{margin:0}.profile-overview-person p,.profile-summary-grid span{color:#3f6428;font-size:11px;font-weight:950;letter-spacing:.08em;text-transform:uppercase}.profile-overview-person h1{margin-top:4px;font-size:clamp(26px,3vw,38px);line-height:1.1}.profile-overview-person small,.profile-summary-grid small{color:rgba(17,20,18,.58);font-weight:760}.profile-summary-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.profile-summary-grid article{display:grid;gap:4px;border:1px solid #dde4d5;border-radius:10px;background:#fbfcf7;padding:12px}.profile-summary-grid strong{font-size:24px;line-height:1.1;overflow-wrap:anywhere}.mobile-tabs{display:none}.toast{border:1px solid #111412;border-radius:8px;background:#c4e995;padding:10px 12px;margin-bottom:14px;font-weight:900}.profile-card{border:1.5px solid #111412;border-radius:12px;background:#fff;box-shadow:4px 4px 0 #111412;padding:24px;display:grid;gap:14px}.profile-card h1{margin:0;font-size:30px}.profile-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.profile-head span,.plan-box span{display:inline-flex;border-radius:999px;background:#e6f4ee;color:#087f8c;padding:6px 10px;font-size:12px;font-weight:900}.profile-head button,.lime,.danger button{border:1.5px solid #111412;border-radius:8px;background:#fff;min-height:40px;padding:0 14px;font-weight:900}.lime{background:#c4e995;box-shadow:3px 3px 0 #111412}.full{width:100%}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.form-grid.three{grid-template-columns:repeat(3,1fr)}.field{display:grid;gap:6px;font-size:13px;font-weight:900;color:rgba(17,20,18,.72);position:relative}.field.wide{grid-column:1/-1}.field input,.field select,.field textarea{width:100%;border:1px solid #b9c5ad;border-radius:8px;background:#fff;padding:12px;font:inherit}.field textarea{height:80px;resize:vertical}.field input:disabled,.field select:disabled{background:#f7f8f3;color:rgba(17,20,18,.7)}.field small{color:#dc2626;font-size:11px}.field em{position:absolute;right:8px;top:32px;border-radius:999px;background:#eef7e8;padding:4px 8px;font-size:11px;font-style:normal;color:#6a9540}.danger{border:1.5px solid #ef4444;border-radius:10px;background:#fff5f5;padding:14px;margin-top:14px}.danger p{color:#7f1d1d}.plan-box{border:1px solid #dde4d5;border-radius:10px;background:#fbfcf7;padding:18px}.plan-box strong{display:block;font-size:34px;margin:10px 0}.plan-box p{color:rgba(17,20,18,.62)}
.profile-form-actions{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center}.profile-form-actions button{border:1.5px solid #111412;border-radius:8px;background:#fff;min-height:40px;padding:0 14px;font-weight:900}
.profile-page{background:var(--paper-soft,#f7f8f3);color:var(--ink,#111412)}
.profile-sidebar,.profile-overview,.profile-card,.profile-summary-card,.mobile-tabs button{background:var(--paper,#fff);color:var(--ink,#111412)}
.profile-sidebar{border-color:var(--line-strong,#111412)}
.profile-identity{border-color:var(--line,#dde4d5)}
.profile-identity span,.profile-overview-person>span{background:var(--ink,#111412);color:var(--lime,#c4e995)}
.profile-identity small,.profile-overview-person small,.profile-summary-grid small,.plan-box p{color:var(--muted,rgba(17,20,18,.62))}
.profile-sidebar button,.mobile-tabs button{min-height:44px;color:var(--ink,#111412)}
.profile-sidebar button.active,.mobile-tabs button.active{background:var(--color-primary-soft,#eef7e8);border-color:var(--line-strong,#111412)}
.profile-sidebar button:focus-visible,.mobile-tabs button:focus-visible,.profile-summary-card:focus-visible,.profile-card button:focus-visible,.profile-quick-nav button:focus-visible{outline:3px solid var(--teal,#087f8c);outline-offset:2px}
.profile-overview,.profile-card{border-color:var(--line-strong,#111412);box-shadow:4px 4px 0 var(--line-strong,#111412)}
.profile-summary-grid{align-items:stretch}
.profile-summary-card{display:grid;gap:5px;min-width:0;border:1px solid var(--line,#dde4d5);border-radius:12px;padding:13px;text-align:left;cursor:pointer}
.profile-summary-card:hover{border-color:var(--teal,#087f8c);transform:translateY(-1px)}
.profile-summary-card span{color:#315d18;font-size:11px;font-weight:950;letter-spacing:.08em;text-transform:uppercase}
.profile-summary-card strong{font-size:24px;line-height:1.1}
.profile-summary-card i{height:6px;overflow:hidden;border-radius:999px;background:var(--line,#dde4d5)}
.profile-summary-card i b{display:block;height:100%;border-radius:inherit;background:var(--teal,#087f8c)}
.profile-load-warning{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;border:1px solid var(--color-warning,#9a5b00);border-radius:12px;background:var(--color-warning-bg,#fff6dc);color:var(--ink,#111412);padding:12px 14px;margin-bottom:14px}
.profile-load-warning button{min-height:36px;border:1px solid currentColor;border-radius:9px;background:transparent;color:inherit;padding:0 12px;font-weight:900}
.profile-card.is-editing{border-color:var(--teal,#087f8c);box-shadow:4px 4px 0 var(--teal,#087f8c)}
.profile-head>div:last-child{display:flex;flex-wrap:wrap;gap:8px}
.profile-head button,.lime,.profile-form-actions button{min-height:44px;border-color:var(--line-strong,#111412);background:var(--paper,#fff);color:var(--ink,#111412)}
.profile-head button:disabled,.lime:disabled{cursor:not-allowed;opacity:.58}
.lime{background:var(--lime,#c4e995)}
.field{color:var(--muted,rgba(17,20,18,.72))}
.field input,.field select,.field textarea{min-height:44px;border-color:var(--line-strong,#b9c5ad);background:var(--paper,#fff);color:var(--ink,#111412)}
.field textarea{height:auto;min-height:104px}
.field input:disabled,.field select:disabled,.field textarea:disabled{background:var(--paper-soft,#f7f8f3);color:var(--muted,rgba(17,20,18,.7));opacity:1}
.field [aria-invalid="true"]{border-color:var(--color-danger,#b42318);box-shadow:0 0 0 2px var(--color-danger-bg,#fff4f2)}
.field small{color:var(--color-danger,#b42318)}
.medical-privacy-note{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;border:1px solid rgba(8,127,140,.28);border-radius:12px;background:var(--mint,#e6f4ee);color:var(--ink,#111412);padding:12px}
.medical-privacy-note strong,.medical-privacy-note p{margin:0}.medical-privacy-note p{margin-top:3px;color:var(--muted);font-size:12px;line-height:1.5}
.profile-disease-section{display:grid;gap:14px;border:1px solid var(--line,#dde4d5);border-radius:14px;background:#fbfcf7;padding:16px}
.profile-disease-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
.profile-disease-head h2,.profile-disease-head p{margin:0}
.profile-disease-head h2{font-size:20px;line-height:1.2}
.profile-disease-head p{margin-top:4px;color:var(--muted,rgba(17,20,18,.62));font-size:13px;line-height:1.5}
.profile-disease-head button,.profile-disease-card-head button{min-height:40px;display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1.5px solid var(--line-strong,#111412);border-radius:10px;background:#fff;color:var(--ink,#111412);padding:0 13px;font-weight:900}
.profile-disease-head button{background:var(--lime,#c4e995);box-shadow:3px 3px 0 var(--line-strong,#111412)}
.profile-disease-head button:disabled,.profile-disease-card-head button:disabled{cursor:not-allowed;opacity:.55;box-shadow:none}
.profile-disease-empty{border:1px dashed var(--line,#dde4d5);border-radius:12px;background:#fff;color:var(--muted,rgba(17,20,18,.62));padding:16px;font-weight:800;line-height:1.55}
.profile-disease-list{display:grid;gap:14px}
.profile-disease-card{display:grid;gap:14px;border:1px solid rgba(17,20,18,.12);border-radius:14px;background:#fff;padding:16px;box-shadow:0 12px 28px rgba(17,20,18,.06)}
.profile-disease-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
.profile-disease-card-head strong{font-size:15px}
.profile-disease-card-head button{border-color:rgba(180,35,24,.28);color:#8f2d1f;box-shadow:none}
.profile-disease-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.profile-disease-grid .wide{grid-column:1/-1}
.toast{border-color:var(--line-strong,#111412);background:var(--lime,#c4e995);color:var(--ink,#111412)}
.plan-box{border-color:var(--line,#dde4d5);background:var(--paper-soft,#fbfcf7)}
@media(prefers-reduced-motion:reduce){.profile-summary-card{transition:none}.profile-summary-card:hover{transform:none}}
@media(forced-colors:active){.profile-summary-card i b{background:Highlight}.profile-summary-card,.profile-card,.profile-overview{box-shadow:none}}
@media(max-width:767px){.profile-page{display:block}.profile-sidebar{display:none}.profile-content{padding:14px}.profile-overview,.profile-card{padding:18px}.profile-overview-person,.profile-summary-grid{grid-template-columns:1fr}.mobile-tabs{display:flex;overflow-x:auto;gap:8px;margin-bottom:12px;scrollbar-width:thin}.mobile-tabs button{min-width:112px;border:1px solid var(--line,#dde4d5);background:var(--paper,#fff);color:var(--ink,#111412);text-align:center}.mobile-tabs button.active{background:var(--color-primary-soft,#eef7e8);border-color:var(--line-strong,#111412)}.mobile-tabs span,.mobile-tabs small{display:block}.profile-head,.profile-disease-head{flex-direction:column}.profile-load-warning{grid-template-columns:auto minmax(0,1fr)}.profile-load-warning button{grid-column:1/-1;width:100%}.form-grid,.form-grid.three,.profile-form-actions,.profile-disease-grid{grid-template-columns:1fr}.profile-form-actions button,.profile-head>div:last-child,.profile-head>div:last-child button,.profile-disease-head button{width:100%}}

/* Patient profile refresh */
.profile-page{
  --profile-navy:#0c2d35;
  --profile-teal:#087f78;
  --profile-teal-dark:#05665f;
  --profile-mint:#eaf6f1;
  --profile-mint-strong:#d8eee6;
  --profile-surface:#fff;
  --profile-subtle:#f7faf8;
  --profile-line:#d7e3dd;
  --profile-muted:#61706b;
  display:grid;
  grid-template-columns:230px minmax(0,1fr);
  width:100%;
  min-height:720px;
  overflow:hidden;
  border:0;
  background:var(--profile-subtle);
  color:var(--profile-navy);
}
.profile-sidebar{
  position:relative;
  top:auto;
  width:auto;
  height:auto;
  min-height:100%;
  padding:28px 18px;
  border:0;
  border-right:1px solid var(--profile-line);
  background:rgba(255,255,255,.92);
}
.profile-identity{
  margin-bottom:20px;
  padding:0 8px 22px;
  border-bottom:1px solid var(--profile-line);
  text-align:left;
}
.profile-identity span{
  width:54px;
  height:54px;
  margin:0 0 14px;
  border:1px solid #b9dbce;
  border-radius:16px;
  background:var(--profile-mint);
  color:var(--profile-teal-dark);
  font-size:18px;
  box-shadow:none;
}
.profile-identity strong{
  overflow:hidden;
  color:var(--profile-navy);
  font-size:15px;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.profile-identity small{
  overflow:hidden;
  margin-top:5px;
  color:var(--profile-muted);
  font-size:11px;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.profile-sidebar nav{gap:5px}
.profile-sidebar button{
  position:relative;
  min-height:46px;
  padding:11px 12px;
  border:1px solid transparent;
  border-radius:12px;
  color:#52625d;
  font-size:13px;
  font-weight:800;
}
.profile-sidebar button span{color:#73827d}
.profile-sidebar button.active{
  border:1px solid #cbe2d9;
  background:var(--profile-mint);
  color:var(--profile-navy);
}
.profile-sidebar button.active::before{
  position:absolute;
  top:10px;
  bottom:10px;
  left:-18px;
  width:3px;
  border-radius:0 3px 3px 0;
  background:var(--profile-teal);
  content:"";
}
.profile-sidebar button.active span{color:var(--profile-teal-dark)}
.profile-content{
  width:min(100%,1020px);
  margin:0 auto;
  padding:30px clamp(20px,3vw,40px) 40px;
}
.profile-overview{
  position:relative;
  gap:22px;
  margin-bottom:18px;
  overflow:hidden;
  border:1px solid var(--profile-line);
  border-radius:20px;
  background:linear-gradient(135deg,#fff 0%,#f4fbf8 100%);
  padding:26px;
  box-shadow:0 16px 42px rgba(12,45,53,.07);
}
.profile-overview::after{
  position:absolute;
  top:-64px;
  right:-50px;
  width:190px;
  height:190px;
  border:28px solid rgba(8,127,120,.045);
  border-radius:50%;
  content:"";
  pointer-events:none;
}
.profile-overview-person{
  position:relative;
  z-index:1;
  gap:16px;
}
.profile-overview-person>span{
  width:62px;
  height:62px;
  border:1px solid #b7dacf;
  border-radius:18px;
  background:var(--profile-mint);
  color:var(--profile-teal-dark);
  font-size:20px;
  box-shadow:none;
}
.profile-overview-person p,
.profile-summary-grid span{
  color:var(--profile-teal-dark);
  font-size:10px;
  font-weight:900;
  letter-spacing:.12em;
}
.profile-overview-person h1{
  max-width:720px;
  margin-top:5px;
  color:var(--profile-navy);
  font-size:clamp(25px,3vw,36px);
  letter-spacing:-.035em;
}
.profile-overview-person small,
.profile-summary-grid small{color:var(--profile-muted);font-weight:650}
.profile-summary-grid{
  position:relative;
  z-index:1;
  gap:12px;
}
.profile-summary-grid article,
.profile-summary-card{
  min-height:122px;
  border:1px solid var(--profile-line);
  border-radius:15px;
  background:rgba(255,255,255,.84);
  padding:15px;
  box-shadow:none;
}
.profile-summary-card{
  transition:border-color .18s ease,background .18s ease,transform .18s ease;
}
.profile-summary-card:hover{
  border-color:#a8cec0;
  background:#fff;
  transform:translateY(-2px);
}
.profile-summary-grid strong{
  margin-top:3px;
  color:var(--profile-navy);
  font-size:23px;
}
.profile-summary-card i{
  height:5px;
  margin-top:auto;
  background:#e6eeea;
}
.profile-summary-card i b{background:var(--profile-teal)}
.profile-card{
  gap:22px;
  border:1px solid var(--profile-line);
  border-radius:20px;
  background:var(--profile-surface);
  padding:clamp(20px,3vw,30px);
  box-shadow:0 16px 42px rgba(12,45,53,.065);
}
.profile-card.is-editing{
  border-color:#9fcab9;
  box-shadow:0 0 0 3px rgba(8,127,120,.08),0 16px 42px rgba(12,45,53,.065);
}
.profile-card h1{
  color:var(--profile-navy);
  font-size:clamp(23px,3vw,30px);
  letter-spacing:-.025em;
}
.profile-head{align-items:center}
.profile-head>div:first-child{
  display:flex;
  flex-wrap:wrap;
  align-items:center;
  gap:9px;
}
.profile-head span,
.plan-box span{
  border:1px solid #c9e3d9;
  background:var(--profile-mint);
  color:var(--profile-teal-dark);
  padding:5px 9px;
  font-size:10px;
  letter-spacing:.05em;
  text-transform:uppercase;
}
.profile-head button,
.profile-form-actions button,
.lime,
.danger button{
  min-height:44px;
  border:1px solid #b7c9c1;
  border-radius:11px;
  background:#fff;
  color:var(--profile-navy);
  padding:0 15px;
  font-weight:850;
  box-shadow:none;
}
.profile-head button:hover,
.profile-form-actions button:hover{border-color:var(--profile-teal);background:#f7fbf9}
.profile-head .lime,
.lime{
  border-color:var(--profile-teal);
  background:var(--profile-teal);
  color:#fff;
}
.profile-head .lime:hover,
.lime:hover{background:var(--profile-teal-dark);color:#fff}
.form-grid{gap:16px}
.field{
  gap:7px;
  color:#43534e;
  font-size:12px;
  font-weight:800;
}
.field input,
.field select,
.field textarea{
  min-height:47px;
  border:1px solid #bdccc5;
  border-radius:11px;
  background:#fff;
  color:var(--profile-navy);
  padding:12px 13px;
  font-weight:650;
  outline:none;
}
.field input:hover:not(:disabled),
.field select:hover:not(:disabled),
.field textarea:hover:not(:disabled){border-color:#82ad9d}
.field input:focus,
.field select:focus,
.field textarea:focus{
  border-color:var(--profile-teal);
  box-shadow:0 0 0 3px rgba(8,127,120,.12);
}
.field input:focus-visible,
.field select:focus-visible,
.field textarea:focus-visible{
  outline:3px solid var(--profile-teal);
  outline-offset:2px;
}
.field input:disabled,
.field select:disabled,
.field textarea:disabled{
  border-color:#dfe7e3;
  background:#f6f8f7;
  color:#53635e;
}
.field em{
  top:35px;
  right:9px;
  background:var(--profile-mint);
  color:var(--profile-teal-dark);
}
.medical-privacy-note{
  border-color:#c3dfd4;
  border-radius:14px;
  background:#f0f8f5;
  color:var(--profile-teal-dark);
  padding:14px;
}
.profile-disease-section{
  gap:16px;
  border-color:var(--profile-line);
  border-radius:16px;
  background:var(--profile-subtle);
  padding:18px;
}
.profile-disease-head h2{color:var(--profile-navy);font-size:18px}
.profile-disease-head p{color:var(--profile-muted)}
.profile-disease-head button{
  border:1px solid #add0c3;
  border-radius:11px;
  background:var(--profile-mint);
  color:var(--profile-teal-dark);
  box-shadow:none;
}
.profile-disease-card{
  border-color:var(--profile-line);
  box-shadow:0 8px 24px rgba(12,45,53,.045);
}
.profile-disease-card-head button{border-width:1px;background:#fff}
.profile-disease-empty{
  border-color:#bfcfc8;
  background:#fff;
  color:var(--profile-muted);
}
.plan-box{
  border-color:var(--profile-line);
  border-radius:16px;
  background:linear-gradient(135deg,#f7fbf9,#eef8f4);
  padding:22px;
}
.plan-box strong{color:var(--profile-navy)}
.quota-list{display:grid;gap:14px}
.toast{
  border:1px solid #a9cbbb;
  border-radius:12px;
  background:#eaf7ef;
  color:#164d3f;
  box-shadow:none;
}
.security-message{margin:10px 0 0;font-size:13px;font-weight:700}
.security-message-success{color:var(--color-success,#15803d)}
.security-message-error{color:var(--color-danger,#b42318)}
.security-password-form{display:grid;gap:16px;max-width:420px;margin:16px auto 0}
.security-fallback-note{max-width:420px;margin:12px auto 0;text-align:center}
.password-input-wrap{position:relative}
.password-input-wrap input{padding-right:42px}
.password-toggle{position:absolute;top:50%;right:6px;transform:translateY(-50%);display:grid;place-items:center;width:32px;height:32px;border:0;border-radius:8px;background:none;color:var(--profile-muted,rgba(17,20,18,.6));cursor:pointer}
.password-toggle:hover{background:var(--profile-subtle,#f7f8f3)}
.field-hint{margin:-10px 0 0;color:var(--muted,rgba(17,20,18,.72));font-size:12px}
.link-button{display:inline;border:0;background:none;padding:0;color:var(--profile-teal-dark,#087f8c);font-weight:800;text-decoration:underline;cursor:pointer}
.profile-load-warning{border-width:1px;box-shadow:none}
.mobile-tabs{display:none}
.profile-sidebar button:focus-visible,
.mobile-tabs button:focus-visible,
.profile-summary-card:focus-visible,
.profile-card button:focus-visible,
.profile-quick-nav button:focus-visible{
  outline:3px solid #3daea5;
  outline-offset:3px;
}
@media(max-width:900px){
  .profile-page{grid-template-columns:190px minmax(0,1fr)}
  .profile-sidebar{padding:24px 12px}
  .profile-sidebar button.active::before{left:-12px}
  .profile-summary-grid{grid-template-columns:1fr 1fr}
  .profile-summary-grid article:last-child{grid-column:1/-1;min-height:96px}
  .form-grid.three{grid-template-columns:1fr 1fr}
}
@media(max-width:767px){
  .profile-page{
    display:block;
    min-height:auto;
    overflow:visible;
    background:transparent;
  }
  .profile-content{width:100%;padding:0}
  .profile-overview{padding:20px;margin-bottom:12px;border-radius:17px}
  .profile-overview::after{display:none}
  .profile-overview-person{grid-template-columns:auto minmax(0,1fr)}
  .profile-summary-grid{grid-template-columns:1fr}
  .profile-summary-grid article:last-child{grid-column:auto}
  .profile-summary-grid article,.profile-summary-card{min-height:108px}
  .mobile-tabs{
    display:grid;
    grid-template-columns:repeat(2,minmax(0,1fr));
    margin:0 0 12px;
    padding:2px 1px;
    gap:7px;
    overflow:visible;
  }
  .mobile-tabs button{
    display:grid;
    width:100%;
    place-items:center;
    gap:3px;
    min-height:58px;
    border:1px solid var(--profile-line);
    border-radius:13px;
    background:#fff;
    color:var(--profile-muted);
  }
  .mobile-tabs button:last-child{grid-column:1/-1}
  .mobile-tabs button.active{
    border-color:#acd0c2;
    background:var(--profile-mint);
    color:var(--profile-navy);
  }
  .profile-card{gap:18px;padding:19px;border-radius:17px}
  .profile-head{align-items:flex-start}
  .profile-head>div:last-child{display:grid;grid-template-columns:1fr 1fr}
  .profile-head>div:last-child button{width:100%}
  .form-grid,.form-grid.three,.profile-form-actions,.profile-disease-grid{grid-template-columns:1fr}
  .profile-disease-section{padding:14px}
  .profile-disease-head button{width:100%}
}
@media(max-width:420px){
  .profile-overview-person>span{width:50px;height:50px;border-radius:14px}
  .profile-overview-person h1{font-size:23px}
  .profile-card h1{font-size:22px}
  .profile-head>div:first-child{align-items:flex-start}
  .profile-head>div:last-child{width:100%}
  .profile-summary-grid strong{font-size:21px}
}
@media(prefers-reduced-motion:reduce){
  .profile-summary-card{transition:none}
  .profile-summary-card:hover{transform:none}
}
@media(forced-colors:active){
  .profile-page,.profile-sidebar,.profile-overview,.profile-card,.profile-summary-card,.profile-summary-grid article{background:Canvas;color:CanvasText}
  .profile-overview,.profile-card,.profile-summary-card,.profile-summary-grid article,.profile-sidebar,.field input,.field select,.field textarea,.mobile-tabs button{border:1px solid CanvasText}
  .profile-overview::after,.profile-sidebar button.active::before{display:none}
  .profile-sidebar button.active,.mobile-tabs button.active,.lime,.profile-head .lime{background:Highlight;color:HighlightText}
  .field input:focus-visible,.field select:focus-visible,.field textarea:focus-visible{outline-color:Highlight}
}
`;
