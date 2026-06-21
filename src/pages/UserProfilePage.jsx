import { Children, cloneElement, useEffect, useId, useState } from "react";
import { CreditCard, FileHeart, ShieldCheck, User } from "lucide-react";
import { useFeedback } from "../components/feedback/feedbackContext";
import { navigate as go } from "../router/navigation";
import {
  authApi,
  getStoredAuth,
  patientProfilesApi,
  usersApi,
  userSubscriptionsApi,
} from "../services/api";
import {
  normalizePersonalProfile,
  validateMedicalProfile,
  validatePersonalProfile,
} from "../utils/profileValidation";

const EMPTY_USER = { displayName: "", email: "", phoneNumber: "", address: "", gender: "1", dateOfBirth: "" };
const tabs = [
  ["info", User, "Thông tin cá nhân"],
  ["medical", FileHeart, "Hồ sơ y tế"],
  ["security", ShieldCheck, "Bảo mật"],
  ["subscription", CreditCard, "Giao dịch"],
];
const TAB_IDS = new Set(tabs.map(([id]) => id));

function getInitialTab() {
  const requestedTab = new URLSearchParams(window.location.search).get("tab");
  return TAB_IDS.has(requestedTab) ? requestedTab : "info";
}

function initials(name) {
  return name.split(" ").filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase() || "MM";
}

export default function UserProfilePage() {
  const { showToast } = useFeedback();
  const auth = getStoredAuth();
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState("");
  const [profileForm, setProfileForm] = useState(EMPTY_USER);
  const [medicalForm, setMedicalForm] = useState({
    bloodType: "",
    height: "",
    weight: "",
    allergyNote: "",
    chronicDiseaseNote: "",
  });
  const [userId, setUserId] = useState("");
  const [patientProfileId, setPatientProfileId] = useState("");
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      authApi.me(),
      patientProfilesApi.list(1, 100),
      userSubscriptionsApi.me(),
    ]).then(([userResult, profileResult, subscriptionResult]) => {
      if (!active) return;

      const user = userResult.status === "fulfilled" ? userResult.value.data ?? {} : {};
      const resolvedUserId = user.userId ?? user.identityId ?? user.id ?? auth?.userId ?? auth?.identityId ?? "";
      setUserId(resolvedUserId);
      setProfileForm({
        displayName: user.displayName ?? user.name ?? "",
        email: user.email ?? "",
        phoneNumber: user.phoneNumber ?? "",
        address: user.address ?? "",
        gender: String(user.gender ?? "1"),
        dateOfBirth: user.dateOfBirth ? String(user.dateOfBirth).slice(0, 10) : "",
      });

      const profiles = profileResult.status === "fulfilled" ? profileResult.value.data?.items ?? [] : [];
      const patientProfile = profiles.find((item) => String(item.userId) === String(resolvedUserId)) ?? null;
      setPatientProfileId(patientProfile?.id ?? "");
      setMedicalForm({
        bloodType: patientProfile?.bloodType ?? "",
        height: patientProfile?.height ?? "",
        weight: patientProfile?.weight ?? "",
        allergyNote: patientProfile?.allergyNote ?? "",
        chronicDiseaseNote: patientProfile?.chronicDiseaseNote ?? "",
      });

      const subscriptions = subscriptionResult.status === "fulfilled"
        ? Array.isArray(subscriptionResult.value.data) ? subscriptionResult.value.data : []
        : [];
      setSubscription(subscriptions.find((item) => String(item.statusName).toLowerCase() === "active") ?? subscriptions[0] ?? null);
      setLoading(false);
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

  function updateProfile(key, value) {
    setProfileForm((current) => ({ ...current, [key]: value }));
  }

  function updateMedical(key, value) {
    setMedicalForm((current) => ({ ...current, [key]: value }));
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
    if (!validateProfile()) return;
    try {
      await usersApi.update(userId, normalizePersonalProfile(profileForm));
      setIsEditing(false);
      setToast("Đã lưu thông tin!");
      showToast({ type: "success", title: "Đã lưu thông tin", message: "Hồ sơ cá nhân đã được cập nhật." });
    } catch (error) {
      setToast(error.message);
    }
  }

  async function saveMedical(event) {
    event.preventDefault();
    if (!validateMedical()) return;
    const payload = {
      bloodType: medicalForm.bloodType || null,
      height: medicalForm.height === "" ? null : Number(medicalForm.height),
      weight: medicalForm.weight === "" ? null : Number(medicalForm.weight),
      allergyNote: medicalForm.allergyNote.trim() || null,
      chronicDiseaseNote: medicalForm.chronicDiseaseNote.trim() || null,
    };
    try {
      const response = patientProfileId
        ? await patientProfilesApi.update(patientProfileId, payload)
        : await patientProfilesApi.create({ userId, ...payload });
      if (!patientProfileId) setPatientProfileId(response.data?.id ?? "");
      setToast("Đã lưu hồ sơ!");
      showToast({ type: "success", title: "Đã lưu hồ sơ", message: "Thông tin sức khỏe đã được cập nhật." });
    } catch (error) {
      setToast(error.message);
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
    medicalForm.chronicDiseaseNote,
  ].filter(Boolean).length;

  return (
    <main className="profile-page">
      <style>{styles}</style>
      <aside className="profile-sidebar">
        <div className="profile-identity">
          <span>{initials(profileForm.displayName)}</span>
          <strong>{profileForm.displayName || (loading ? "Đang tải..." : "Người dùng")}</strong>
          <small>{profileForm.email}</small>
        </div>
        <nav>
          {tabs.map(([id, Icon, label]) => (
            <button className={activeTab === id ? "active" : ""} key={id} type="button" onClick={() => selectTab(id)}>
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
        <section className="profile-overview" aria-label="Tổng quan hồ sơ cá nhân">
          <div className="profile-overview-person">
            <span>{initials(profileForm.displayName)}</span>
            <div>
              <p>Không gian cá nhân</p>
              <h1>{profileForm.displayName || (loading ? "Đang tải hồ sơ..." : "Cập nhật hồ sơ của bạn")}</h1>
              <small>{profileForm.email || "Chưa có email"}</small>
            </div>
          </div>
          <div className="profile-summary-grid">
            <article>
              <span>Thông tin</span>
              <strong>{personalCompletion}/5</strong>
              <small>Mục cơ bản đã cập nhật</small>
            </article>
            <article>
              <span>Y tế</span>
              <strong>{medicalCompletion}/5</strong>
              <small>Dữ liệu nền cho tư vấn</small>
            </article>
            <article>
              <span>Gói dịch vụ</span>
              <strong>{subscription?.planName || "Free"}</strong>
              <small>{subscription?.statusName || "Tiêu chuẩn"}</small>
            </article>
          </div>
        </section>
        <div className="mobile-tabs">
          {tabs.map(([id, Icon, label]) => (
            <button className={activeTab === id ? "active" : ""} key={id} type="button" onClick={() => selectTab(id)}>
              <span><Icon size={18} strokeWidth={2} aria-hidden="true" /></span><small>{label}</small>
            </button>
          ))}
        </div>
        {toast && <div className="toast" role="status" aria-live="polite">{toast}</div>}

        {activeTab === "info" && (
          <form className="profile-card" onSubmit={saveProfile} noValidate>
            <div className="profile-head">
              <div><h1>Thông tin cá nhân</h1><span>Cơ bản</span></div>
              {!isEditing ? <button type="button" onClick={() => setIsEditing(true)}>Chỉnh sửa</button> : <div><button className="lime" type="submit">Lưu</button><button type="button" onClick={() => setIsEditing(false)}>Huỷ</button></div>}
            </div>
            <div className="form-grid">
              <Field label="Họ và tên" error={errors.displayName} wide><input value={profileForm.displayName} disabled={!isEditing} onChange={(e) => updateProfile("displayName", e.target.value)} /></Field>
              <Field label="Email" wide><input value={profileForm.email} disabled /><em>Không thể đổi</em></Field>
              <Field label="Giới tính" error={errors.gender}><select value={profileForm.gender} disabled={!isEditing} onChange={(e) => updateProfile("gender", e.target.value)}><option value="1">Nam</option><option value="2">Nữ</option><option value="0">Khác</option></select></Field>
              <Field label="Ngày sinh" error={errors.dateOfBirth}><input type="date" value={profileForm.dateOfBirth} disabled={!isEditing} onChange={(e) => updateProfile("dateOfBirth", e.target.value)} /></Field>
              <Field label="Số điện thoại" error={errors.phoneNumber}><input type="tel" inputMode="tel" autoComplete="tel" value={profileForm.phoneNumber} disabled={!isEditing} onChange={(e) => updateProfile("phoneNumber", e.target.value)} /></Field>
              <Field label="Địa chỉ" error={errors.address} wide><input value={profileForm.address} disabled={!isEditing} onChange={(e) => updateProfile("address", e.target.value)} /></Field>
            </div>
          </form>
        )}

        {activeTab === "medical" && (
          <form className="profile-card" onSubmit={saveMedical} noValidate>
            <div className="profile-head"><div><h1>Hồ sơ bệnh nhân</h1><span>{patientProfileId ? "Đã đồng bộ" : "Tạo mới"}</span></div></div>
            <div className="form-grid three">
              <Field label="Nhóm máu"><select value={medicalForm.bloodType} onChange={(e) => updateMedical("bloodType", e.target.value)}><option value="">Chọn</option>{["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((v)=><option key={v}>{v}</option>)}</select></Field>
              <Field label="Chiều cao (cm)" error={errors.height}><input type="number" min="40" max="250" step="0.1" value={medicalForm.height} onChange={(e) => updateMedical("height", e.target.value)} /></Field>
              <Field label="Cân nặng (kg)" error={errors.weight}><input type="number" min="2" max="500" step="0.1" value={medicalForm.weight} onChange={(e) => updateMedical("weight", e.target.value)} /></Field>
            </div>
            <Field label="Dị ứng" error={errors.allergyNote}><textarea maxLength={1000} value={medicalForm.allergyNote} onChange={(e) => updateMedical("allergyNote", e.target.value)} /></Field>
            <Field label="Bệnh nền" error={errors.chronicDiseaseNote}><textarea maxLength={1000} value={medicalForm.chronicDiseaseNote} onChange={(e) => updateMedical("chronicDiseaseNote", e.target.value)} /></Field>
            <button className="lime full" type="submit">Lưu hồ sơ</button>
          </form>
        )}

        {activeTab === "security" && (
          <section className="profile-card">
            <h1>Bảo mật</h1>
            <p>Backend đổi mật khẩu bằng mã OTP gửi qua email.</p>
            <button className="lime" type="button" onClick={() => go("/forgot-password")}>Gửi mã đổi mật khẩu</button>
          </section>
        )}

        {activeTab === "subscription" && (
          <section className="profile-card">
            <h1>Lịch sử giao dịch</h1>
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
@media(max-width:767px){.profile-page{display:block}.profile-sidebar{display:none}.profile-content{padding:14px}.profile-overview,.profile-card{padding:18px}.profile-overview-person,.profile-summary-grid{grid-template-columns:1fr}.mobile-tabs{display:flex;overflow-x:auto;gap:8px;margin-bottom:12px}.mobile-tabs button{min-width:112px;border:1px solid #dde4d5;background:#fff;text-align:center}.mobile-tabs button.active{background:#eef7e8;border-color:#111412}.mobile-tabs span,.mobile-tabs small{display:block}.profile-head{flex-direction:column}.form-grid,.form-grid.three{grid-template-columns:1fr}}
`;
