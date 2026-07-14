import { Children, cloneElement, useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, CreditCard, FileHeart, Plus, ReceiptText, ShieldCheck, Trash2, User } from "lucide-react";
import { useFeedback } from "../components/feedback/feedbackContext";
import { useUnsavedChangesWarning } from "../hooks/useUnsavedChangesWarning";
import { navigate as go } from "../router/navigation";
import {
  authApi,
  getStoredAuth,
  patientProfilesApi,
  paymentsApi,
  usersApi,
  userSubscriptionsApi,
} from "../services/api";
import {
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

function getInitialTab() {
  const requestedTab = new URLSearchParams(window.location.search).get("tab");
  if (requestedTab === "subscription") return "transactions";
  return TAB_IDS.has(requestedTab) ? requestedTab : "info";
}

function initials(name) {
  return name.split(" ").filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase() || "MM";
}

function getArrayData(response) {
  const data = response?.data ?? [];
  if (Array.isArray(data)) return data;
  return Array.isArray(data.items) ? data.items : [];
}

function formatMoney(value) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount)
    ? amount.toLocaleString("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 })
    : "--";
}

function formatDate(value) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Chưa cập nhật" : date.toLocaleDateString("vi-VN");
}

function getPaymentStatus(payment) {
  return payment.statusName ?? payment.paymentStatusName ?? payment.status ?? payment.paymentStatus ?? "Đang xử lý";
}

function getPaymentAmount(payment) {
  return payment.amount ?? payment.totalAmount ?? payment.price ?? payment.orderAmount ?? payment.paidAmount;
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
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadWarning, setLoadWarning] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingMedical, setSavingMedical] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);
  const [medicalDirty, setMedicalDirty] = useState(false);
  const [isMedicalEditing, setIsMedicalEditing] = useState(false);
  const profileFormRef = useRef(null);
  const medicalFormRef = useRef(null);

  useUnsavedChangesWarning(profileDirty || medicalDirty);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      authApi.me(),
      patientProfilesApi.list(1, 100),
      userSubscriptionsApi.me(),
    ]).then(([userResult, profileResult, subscriptionResult]) => {
      if (!active) return;

      const unavailableSections = [];
      if (userResult.status !== "fulfilled") unavailableSections.push("thông tin cá nhân");
      if (profileResult.status !== "fulfilled") unavailableSections.push("hồ sơ y tế");
      if (subscriptionResult.status !== "fulfilled") unavailableSections.push("gói dịch vụ");
      setLoadWarning(unavailableSections.length
        ? `Chưa thể tải ${unavailableSections.join(", ")}. Bạn có thể thử tải lại trang.`
        : "");

      const user = userResult.status === "fulfilled" ? userResult.value.data ?? {} : {};
      const resolvedUserId = user.userId ?? user.identityId ?? user.id ?? auth?.userId ?? auth?.identityId ?? "";
      setUserId(resolvedUserId);
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

      const profiles = profileResult.status === "fulfilled" ? profileResult.value.data?.items ?? [] : [];
      const patientProfile = profiles.find((item) => String(item.userId) === String(resolvedUserId)) ?? null;
      setPatientProfileId(patientProfile?.id ?? "");
      const nextMedical = {
        bloodType: patientProfile?.bloodType ?? "",
        height: patientProfile?.height ?? "",
        weight: patientProfile?.weight ?? "",
        allergyNote: patientProfile?.allergyNote ?? "",
        chronicDiseases: Array.isArray(patientProfile?.chronicDiseases)
          ? patientProfile.chronicDiseases.map(normalizeDiseaseForForm)
          : [],
      };
      setMedicalForm(nextMedical);
      setMedicalSnapshot(nextMedical);
      setMedicalDirty(false);

      const subscriptions = subscriptionResult.status === "fulfilled"
        ? Array.isArray(subscriptionResult.value.data) ? subscriptionResult.value.data : []
        : [];
      setSubscription(subscriptions.find((item) => String(item.statusName).toLowerCase() === "active") ?? subscriptions[0] ?? null);
      setLoading(false);

      if (resolvedUserId) {
        setPaymentsLoading(true);
        paymentsApi.byUser(resolvedUserId)
          .then((paymentResult) => {
            if (!active) return;
            setPayments(getArrayData(paymentResult));
            setPaymentsError("");
          })
          .catch((error) => {
            if (!active) return;
            setPayments([]);
            setPaymentsError(error.message);
          })
          .finally(() => {
            if (active) setPaymentsLoading(false);
          });
      }
    });

    return () => {
      active = false;
    };
  }, [auth?.identityId, auth?.userId]);

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
  }

  function removeMedicalDisease(index) {
    setMedicalForm((current) => ({
      ...current,
      chronicDiseases: current.chronicDiseases.filter((_, diseaseIndex) => diseaseIndex !== index),
    }));
    setMedicalDirty(true);
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
    } catch (error) {
      setToast(error.message);
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
    } catch (error) {
      setToast(error.message);
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

  return (
    <main className="profile-page">
      <style>{styles}</style>
      <aside className="profile-sidebar">
        <div className="profile-identity">
          <span>{initials(profileForm.displayName)}</span>
          <strong>{profileForm.displayName || (loading ? "Đang tải..." : "Người dùng")}</strong>
          <small>{profileForm.email}</small>
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
        <nav className="profile-quick-nav" aria-label="Dieu huong nhanh">
          <button type="button" onClick={() => go("/dashboard")}>← Trang chủ</button>
          <button type="button" onClick={() => go("/dashboard")}>Phân tích triệu chứng</button>
          <button type="button" onClick={() => go("/records")}>Hồ sơ y tế</button>
          <button type="button" onClick={() => go("/map")}>Bản đồ</button>
        </nav>
        {loadWarning && <div className="profile-load-warning" role="alert"><AlertTriangle size={18} aria-hidden="true" /><span>{loadWarning}</span><button type="button" onClick={() => window.location.reload()}>Tải lại</button></div>}
        <section className="profile-overview" aria-label="Tổng quan hồ sơ cá nhân" aria-busy={loading}>
          <div className="profile-overview-person">
            <span>{initials(profileForm.displayName)}</span>
            <div>
              <p>Không gian cá nhân</p>
              <h1>{profileForm.displayName || (loading ? "Đang tải hồ sơ..." : "Cập nhật hồ sơ của bạn")}</h1>
              <small>{profileForm.email || "Chưa có email"}</small>
            </div>
          </div>
          <div className="profile-summary-grid">
            <button type="button" className="profile-summary-card" onClick={() => selectTab("info")}>
              <span>Thông tin</span>
              <strong>{personalCompletion}/5</strong>
              <small>{personalMissing.length ? `Còn thiếu: ${personalMissing.slice(0, 2).join(", ")}${personalMissing.length > 2 ? "..." : ""}` : "Đã hoàn thiện thông tin cơ bản"}</small>
              <i role="progressbar" aria-label="Tiến độ thông tin cá nhân" aria-valuemin="0" aria-valuemax="5" aria-valuenow={personalCompletion}><b style={{ width: `${personalCompletion * 20}%` }} /></i>
            </button>
            <button type="button" className="profile-summary-card" onClick={() => selectTab("medical")}>
              <span>Y tế</span>
              <strong>{medicalCompletion}/5</strong>
              <small>{medicalMissing.length ? `Còn thiếu: ${medicalMissing.slice(0, 2).join(", ")}${medicalMissing.length > 2 ? "..." : ""}` : "Đã hoàn thiện dữ liệu sức khỏe"}</small>
              <i role="progressbar" aria-label="Tiến độ hồ sơ y tế" aria-valuemin="0" aria-valuemax="5" aria-valuenow={medicalCompletion}><b style={{ width: `${medicalCompletion * 20}%` }} /></i>
            </button>
            <article>
              <span>Gói dịch vụ</span>
              <strong>{subscription?.planName || "Free"}</strong>
              <small>{subscription?.statusName || "Tiêu chuẩn"}</small>
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
          <form ref={profileFormRef} id="profile-panel-info" role="tabpanel" aria-labelledby="profile-tab-info" className={`profile-card ${isEditing ? "is-editing" : ""}`} onSubmit={saveProfile} noValidate>
            <div className="profile-head">
              <div><h1>Thông tin cá nhân</h1><span>Cơ bản</span></div>
              {!isEditing ? <button type="button" onClick={() => setIsEditing(true)} disabled={loading}>Chỉnh sửa</button> : <div><button className="lime" type="submit" disabled={!profileDirty || savingProfile}>{savingProfile ? "Đang lưu..." : "Lưu thay đổi"}</button><button type="button" onClick={cancelProfileEdit} disabled={savingProfile}>Huỷ</button></div>}
            </div>
            <div className="form-grid">
              <Field label="Họ và tên" error={errors.displayName} wide><input value={profileForm.displayName} disabled={!isEditing || savingProfile} onChange={(e) => updateProfile("displayName", e.target.value)} /></Field>
              <Field label="Email" wide><input value={profileForm.email} disabled /><em>Không thể đổi</em></Field>
              <Field label="Giới tính" error={errors.gender}><select value={profileForm.gender} disabled={!isEditing || savingProfile} onChange={(e) => updateProfile("gender", e.target.value)}><option value="1">Nam</option><option value="2">Nữ</option><option value="0">Khác</option></select></Field>
              <Field label="Ngày sinh" error={errors.dateOfBirth}><input type="date" value={profileForm.dateOfBirth} disabled={!isEditing || savingProfile} onChange={(e) => updateProfile("dateOfBirth", e.target.value)} /></Field>
              <Field label="Số điện thoại" error={errors.phoneNumber}><input type="tel" inputMode="tel" autoComplete="tel" value={profileForm.phoneNumber} disabled={!isEditing || savingProfile} onChange={(e) => updateProfile("phoneNumber", e.target.value)} /></Field>
              <Field label="Địa chỉ" error={errors.address} wide><input value={profileForm.address} disabled={!isEditing || savingProfile} onChange={(e) => updateProfile("address", e.target.value)} /></Field>
            </div>
          </form>
        )}

        {activeTab === "medical" && (
          <form ref={medicalFormRef} id="profile-panel-medical" role="tabpanel" aria-labelledby="profile-tab-medical" className={`profile-card ${isMedicalEditing ? "is-editing" : ""}`} onSubmit={saveMedical} noValidate>
            <div className="profile-head"><div><h1>Hồ sơ y tế</h1><span>{patientProfileId ? "Đã đồng bộ" : "Chưa tạo"}</span></div>{!isMedicalEditing ? <button type="button" onClick={() => setIsMedicalEditing(true)} disabled={loading}>Chỉnh sửa</button> : <div><button className="lime" type="submit" disabled={!medicalDirty || savingMedical}>{savingMedical ? "Đang lưu..." : "Lưu hồ sơ"}</button><button type="button" onClick={resetMedicalForm} disabled={savingMedical}>Huỷ</button></div>}</div>
            <div className="medical-privacy-note"><ShieldCheck size={19} aria-hidden="true" /><div><strong>Dữ liệu sức khỏe nhạy cảm</strong><p>Thông tin này hỗ trợ cá nhân hóa tư vấn. Chỉ nhập dữ liệu bạn biết chính xác.</p></div></div>
            <div className="form-grid three">
              <Field label="Nhóm máu"><select value={medicalForm.bloodType} disabled={!isMedicalEditing || savingMedical} onChange={(e) => updateMedical("bloodType", e.target.value)}><option value="">Chưa rõ</option>{["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((v)=><option key={v}>{v}</option>)}</select></Field>
              <Field label="Chiều cao (cm)" error={errors.height}><input type="number" min="40" max="250" step="0.1" value={medicalForm.height} disabled={!isMedicalEditing || savingMedical} onChange={(e) => updateMedical("height", e.target.value)} /></Field>
              <Field label="Cân nặng (kg)" error={errors.weight}><input type="number" min="2" max="500" step="0.1" value={medicalForm.weight} disabled={!isMedicalEditing || savingMedical} onChange={(e) => updateMedical("weight", e.target.value)} /></Field>
            </div>
            <Field label="Dị ứng" error={errors.allergyNote}><textarea rows={4} maxLength={1000} placeholder="Ví dụ: thuốc, thực phẩm, phấn hoa..." value={medicalForm.allergyNote} disabled={!isMedicalEditing || savingMedical} onChange={(e) => updateMedical("allergyNote", e.target.value)} /></Field>
            <section className="profile-disease-section" aria-label="Bệnh nền">
              <div className="profile-disease-head">
                <div>
                  <h2>Bệnh nền</h2>
                  <p>Mỗi bệnh nền gồm tên bệnh, thời gian theo dõi và ghi chú ngắn.</p>
                </div>
                <button type="button" onClick={addMedicalDisease} disabled={!isMedicalEditing || savingMedical}>
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
                    <article className="profile-disease-card" key={disease.localId ?? index}>
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
                            value={disease.diseaseName}
                            placeholder="Ví dụ: hen suyễn, tăng huyết áp..."
                            disabled={!isMedicalEditing || savingMedical}
                            onChange={(event) => updateMedicalDisease(index, "diseaseName", event.target.value)}
                          />
                        </label>
                        <label className="field">
                          <span>Từ ngày</span>
                          <input
                            type="date"
                            value={disease.from}
                            disabled={!isMedicalEditing || savingMedical}
                            onChange={(event) => updateMedicalDisease(index, "from", event.target.value)}
                          />
                        </label>
                        <label className="field">
                          <span>Đến ngày</span>
                          <input
                            type="date"
                            value={disease.to}
                            disabled={!isMedicalEditing || savingMedical}
                            onChange={(event) => updateMedicalDisease(index, "to", event.target.value)}
                          />
                        </label>
                        <label className="field wide">
                          <span>Ghi chú</span>
                          <textarea
                            rows={3}
                            value={disease.note}
                            placeholder="Ví dụ: đang dùng thuốc, tái khám định kỳ..."
                            disabled={!isMedicalEditing || savingMedical}
                            onChange={(event) => updateMedicalDisease(index, "note", event.target.value)}
                          />
                        </label>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </form>
        )}

        {activeTab === "security" && (
          <section id="profile-panel-security" role="tabpanel" aria-labelledby="profile-tab-security" className="profile-card">
            <h1>Bảo mật</h1>
            <p>Mật khẩu được xác nhận bằng mã OTP gửi qua email.</p>
            <button className="lime" type="button" onClick={() => go("/forgot-password")}>Gửi mã đổi mật khẩu</button>
          </section>
        )}

        {activeTab === "package" && (
          <section id="profile-panel-package" role="tabpanel" aria-labelledby="profile-tab-package" className="profile-card">
            <h1>Gói dịch vụ</h1>
            <div className="plan-box">
              <span>Gói hiện tại</span>
              <strong>{subscription?.planName || (loading ? "Đang tải..." : "Free")}</strong>
              <p>
                {subscription
                  ? `${subscription.statusName || "Đang hoạt động"}${subscription.endDate ? ` · hết hạn ${new Date(subscription.endDate).toLocaleDateString("vi-VN")}` : ""}`
                  : "Bạn chưa có subscription trả phí đang hoạt động."}
              </p>
            </div>
            <button className="lime" type="button" onClick={() => go("/pricing")}>Nâng cấp MediMate+</button>
          </section>
        )}

        {activeTab === "transactions" && (
          <section id="profile-panel-transactions" role="tabpanel" aria-labelledby="profile-tab-transactions" className="profile-card">
            <div className="profile-head"><div><h1>Lịch sử giao dịch</h1><span>{payments.length} giao dịch</span></div></div>
            {paymentsLoading ? <div className="transaction-empty">Đang tải giao dịch...</div> : paymentsError ? <div className="danger"><p>{paymentsError}</p></div> : payments.length === 0 ? <div className="transaction-empty">Bạn chưa có giao dịch nào.</div> : <div className="transaction-list">{payments.map((payment, index) => { const paymentId = payment.id ?? payment.paymentId ?? payment.orderCode ?? index; const title = payment.planName ?? payment.subscriptionPlanName ?? payment.description ?? "Giao dịch MediMate+"; const paidAt = payment.paidAt ?? payment.createdAt ?? payment.updatedAt; return <article className="transaction-row" key={paymentId}><div><strong>{title}</strong><small>{paymentId}</small></div><span>{formatMoney(getPaymentAmount(payment))}</span><span>{getPaymentStatus(payment)}</span><time dateTime={paidAt || undefined}>{formatDate(paidAt)}</time></article>; })}</div>}
          </section>
        )}
      </section>
    </main>
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
.transaction-list{display:grid;gap:10px}.transaction-row{display:grid;grid-template-columns:minmax(0,1.45fr) auto auto auto;gap:14px;align-items:center;border:1px solid var(--line,#dde4d5);border-radius:12px;background:var(--paper-soft,#fbfcf7);padding:14px}.transaction-row strong,.transaction-row small{display:block}.transaction-row strong{font-size:15px}.transaction-row small{margin-top:4px;color:var(--muted,rgba(17,20,18,.56));overflow-wrap:anywhere}.transaction-row span,.transaction-row time{font-weight:900;color:var(--ink,#111412);white-space:nowrap}.transaction-row span:nth-of-type(2){border-radius:999px;background:var(--color-primary-soft,#eef7e8);color:#315d18;padding:6px 10px;font-size:12px}.transaction-empty{border:1px dashed var(--line-strong,#b9c5ad);border-radius:12px;background:var(--paper-soft,#fbfcf7);padding:20px;color:var(--muted,rgba(17,20,18,.62));font-weight:850}
@media(prefers-reduced-motion:reduce){.profile-summary-card{transition:none}.profile-summary-card:hover{transform:none}}
@media(forced-colors:active){.profile-summary-card i b{background:Highlight}.profile-summary-card,.profile-card,.profile-overview{box-shadow:none}}
@media(max-width:767px){.profile-page{display:block}.profile-sidebar{display:none}.profile-content{padding:14px}.profile-overview,.profile-card{padding:18px}.profile-overview-person,.profile-summary-grid{grid-template-columns:1fr}.mobile-tabs{display:flex;overflow-x:auto;gap:8px;margin-bottom:12px;scrollbar-width:thin}.mobile-tabs button{min-width:112px;border:1px solid var(--line,#dde4d5);background:var(--paper,#fff);color:var(--ink,#111412);text-align:center}.mobile-tabs button.active{background:var(--color-primary-soft,#eef7e8);border-color:var(--line-strong,#111412)}.mobile-tabs span,.mobile-tabs small{display:block}.profile-head,.profile-disease-head{flex-direction:column}.profile-load-warning{grid-template-columns:auto minmax(0,1fr)}.profile-load-warning button{grid-column:1/-1;width:100%}.form-grid,.form-grid.three,.profile-form-actions,.transaction-row,.profile-disease-grid{grid-template-columns:1fr}.profile-form-actions button,.profile-head>div:last-child,.profile-head>div:last-child button,.profile-disease-head button{width:100%}.transaction-row span,.transaction-row time{white-space:normal}}
`;
