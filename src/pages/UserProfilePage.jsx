import { useMemo, useState } from "react";
import { useFeedback } from "../components/feedback/feedbackContext";
import { getStoredAuth } from "../services/api";

const mockUser = { fullName: "Nguyễn Văn Phước", email: "phuoc@gmail.com", phone: "0901234567", address: "Quận 5, TP.HCM", gender: "Nam", dateOfBirth: "1998-02-14" };
const tabs = [
  ["info", "👤", "Thông tin cá nhân"],
  ["medical", "♡", "Hồ sơ y tế"],
  ["security", "🛡", "Bảo mật"],
  ["subscription", "💳", "Gói đăng ký"],
];

function initials(name) {
  return name.split(" ").filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase() || "MM";
}

function go(path) {
  window.location.href = path;
}

export default function UserProfilePage() {
  const { confirmAction, showToast } = useFeedback();
  const auth = getStoredAuth();
  const user = useMemo(() => ({ ...mockUser, fullName: auth?.displayName || auth?.name || mockUser.fullName, email: auth?.email || mockUser.email }), [auth]);
  const [activeTab, setActiveTab] = useState("info");
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState("");
  const [profileForm, setProfileForm] = useState({ ...user });
  const [medicalForm, setMedicalForm] = useState({
    bloodType: "",
    height: "",
    weight: "",
    allergyNote: "",
    chronicDiseaseNote: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  });

  function updateProfile(key, value) {
    setProfileForm((current) => ({ ...current, [key]: value }));
  }

  function updateMedical(key, value) {
    setMedicalForm((current) => ({ ...current, [key]: value }));
  }

  function validateProfile() {
    const next = {};
    if (!profileForm.fullName.trim()) next.fullName = "Họ và tên không được để trống.";
    if (profileForm.phone && !/^\d+$/.test(profileForm.phone)) next.phone = "Số điện thoại chỉ gồm chữ số.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function validateMedical() {
    const next = {};
    if (medicalForm.height && Number(medicalForm.height) <= 0) next.height = "Chiều cao phải là số dương.";
    if (medicalForm.weight && Number(medicalForm.weight) <= 0) next.weight = "Cân nặng phải là số dương.";
    if (medicalForm.emergencyContactPhone && !/^\d+$/.test(medicalForm.emergencyContactPhone)) next.emergencyContactPhone = "SĐT khẩn chỉ gồm chữ số.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function saveProfile(event) {
    event.preventDefault();
    if (!validateProfile()) return;
    setIsEditing(false);
    setToast("Đã lưu thông tin!");
    showToast({ type: "success", title: "Đã lưu thông tin", message: "Hồ sơ cá nhân đã được cập nhật." });
  }

  function saveMedical(event) {
    event.preventDefault();
    if (!validateMedical()) return;
    setToast("Đã lưu hồ sơ!");
    showToast({ type: "success", title: "Đã lưu hồ sơ", message: "Thông tin sức khỏe đã được cập nhật." });
  }

  async function requestDeleteAccount() {
    const confirmed = await confirmAction({
      title: "Xóa tài khoản?",
      message: "Thao tác này có thể làm mất quyền truy cập vào hồ sơ. Bạn có thể hủy và quay lại bất cứ lúc nào.",
      confirmLabel: "Xóa tài khoản",
      tone: "danger",
    });
    if (confirmed) {
      showToast({ type: "warning", title: "Chưa kết nối API xóa", message: "Chức năng xóa tài khoản sẽ được bật khi backend hỗ trợ." });
    }
  }

  return (
    <main className="profile-page">
      <style>{styles}</style>
      <aside className="profile-sidebar">
        <div className="profile-identity">
          <span>{initials(profileForm.fullName)}</span>
          <strong>{profileForm.fullName}</strong>
          <small>{profileForm.email}</small>
        </div>
        <nav>
          {tabs.map(([id, icon, label]) => (
            <button className={activeTab === id ? "active" : ""} key={id} type="button" onClick={() => setActiveTab(id)}>
              <span>{icon}</span>{label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="profile-content">
        <nav className="profile-quick-nav" aria-label="Dieu huong nhanh">
          <button type="button" onClick={() => go("/dashboard")}>← Trang chủ</button>
          <button type="button" onClick={() => go("/symptom")}>Phân tích triệu chứng</button>
          <button type="button" onClick={() => go("/records")}>Hồ sơ y tế</button>
          <button type="button" onClick={() => go("/map")}>Bản đồ</button>
        </nav>
        <div className="mobile-tabs">
          {tabs.map(([id, icon, label]) => (
            <button className={activeTab === id ? "active" : ""} key={id} type="button" onClick={() => setActiveTab(id)}>
              <span>{icon}</span><small>{label}</small>
            </button>
          ))}
        </div>
        {toast && <div className="toast">{toast}</div>}

        {activeTab === "info" && (
          <form className="profile-card" onSubmit={saveProfile}>
            <div className="profile-head">
              <div><h1>Thông tin cá nhân</h1><span>Cơ bản</span></div>
              {!isEditing ? <button type="button" onClick={() => setIsEditing(true)}>Chỉnh sửa</button> : <div><button className="lime" type="submit">Lưu</button><button type="button" onClick={() => setIsEditing(false)}>Huỷ</button></div>}
            </div>
            <div className="form-grid">
              <Field label="Họ và tên" error={errors.fullName} wide><input value={profileForm.fullName} disabled={!isEditing} onChange={(e) => updateProfile("fullName", e.target.value)} /></Field>
              <Field label="Email" wide><input value={profileForm.email} disabled /><em>Không thể đổi</em></Field>
              <Field label="Giới tính"><select value={profileForm.gender} disabled={!isEditing} onChange={(e) => updateProfile("gender", e.target.value)}><option>Nam</option><option>Nữ</option><option>Khác</option></select></Field>
              <Field label="Ngày sinh"><input type="date" value={profileForm.dateOfBirth} disabled={!isEditing} onChange={(e) => updateProfile("dateOfBirth", e.target.value)} /></Field>
              <Field label="Số điện thoại" error={errors.phone}><input value={profileForm.phone} disabled={!isEditing} onChange={(e) => updateProfile("phone", e.target.value)} /></Field>
              <Field label="Địa chỉ" wide><input value={profileForm.address} disabled={!isEditing} onChange={(e) => updateProfile("address", e.target.value)} /></Field>
            </div>
          </form>
        )}

        {activeTab === "medical" && (
          <form className="profile-card" onSubmit={saveMedical}>
            <div className="profile-head"><div><h1>Hồ sơ bệnh nhân</h1><span>Tạo mới</span></div></div>
            <div className="form-grid three">
              <Field label="Nhóm máu"><select value={medicalForm.bloodType} onChange={(e) => updateMedical("bloodType", e.target.value)}><option value="">Chọn</option>{["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((v)=><option key={v}>{v}</option>)}</select></Field>
              <Field label="Chiều cao (cm)" error={errors.height}><input type="number" value={medicalForm.height} onChange={(e) => updateMedical("height", e.target.value)} /></Field>
              <Field label="Cân nặng (kg)" error={errors.weight}><input type="number" value={medicalForm.weight} onChange={(e) => updateMedical("weight", e.target.value)} /></Field>
            </div>
            <Field label="Dị ứng"><textarea value={medicalForm.allergyNote} onChange={(e) => updateMedical("allergyNote", e.target.value)} /></Field>
            <Field label="Bệnh nền"><textarea value={medicalForm.chronicDiseaseNote} onChange={(e) => updateMedical("chronicDiseaseNote", e.target.value)} /></Field>
            <div className="form-grid">
              <Field label="Người liên hệ khẩn"><input value={medicalForm.emergencyContactName} onChange={(e) => updateMedical("emergencyContactName", e.target.value)} /></Field>
              <Field label="SĐT khẩn" error={errors.emergencyContactPhone}><input value={medicalForm.emergencyContactPhone} onChange={(e) => updateMedical("emergencyContactPhone", e.target.value)} /></Field>
            </div>
            <button className="lime full" type="submit">Lưu hồ sơ</button>
          </form>
        )}

        {activeTab === "security" && (
          <section className="profile-card">
            <h1>Bảo mật</h1>
            <div className="form-grid">
              <Field label="Mật khẩu hiện tại"><input type="password" /></Field>
              <Field label="Mật khẩu mới"><input type="password" /></Field>
              <Field label="Xác nhận mật khẩu mới"><input type="password" /></Field>
            </div>
            <button className="lime" type="button">Đổi mật khẩu</button>
            <div className="danger"><strong>Xoá tài khoản</strong><p>Thao tác này cần được xác nhận trước khi thực hiện.</p><button type="button" onClick={requestDeleteAccount}>Xoá tài khoản</button></div>
          </section>
        )}

        {activeTab === "subscription" && (
          <section className="profile-card">
            <h1>Gói đăng ký</h1>
            <div className="plan-box"><span>Gói hiện tại</span><strong>Free</strong><p>Phân tích triệu chứng cơ bản, hồ sơ cá nhân và bản đồ cơ sở y tế.</p></div>
            <button className="lime" type="button" onClick={() => go("/pricing")}>Nâng cấp MediMate+</button>
          </section>
        )}
      </section>
    </main>
  );
}

function Field({ label, error, wide, children }) {
  return <label className={wide ? "field wide" : "field"}><span>{label}</span>{children}{error && <small>{error}</small>}</label>;
}

const styles = `
.profile-page{min-height:100vh;display:flex;background:#f7f8f3;color:#111412;font-family:"Be Vietnam Pro",system-ui,sans-serif}.profile-sidebar{width:220px;padding:24px 18px;border-right:1.5px solid #111412;background:#fff;position:sticky;top:0;height:100vh}.profile-identity{text-align:center;border-bottom:1px solid #dde4d5;padding-bottom:18px;margin-bottom:18px}.profile-identity span{display:grid;place-items:center;width:76px;height:76px;margin:0 auto 12px;border-radius:999px;background:#111412;color:#aaed63;font-size:24px;font-weight:900}.profile-identity strong,.profile-identity small{display:block}.profile-identity small{color:rgba(17,20,18,.56);margin-top:4px}.profile-sidebar nav{display:grid;gap:6px}.profile-sidebar button,.mobile-tabs button{border:0;background:transparent;color:#111412;font-weight:800;text-align:left;padding:12px;border-radius:8px}.profile-sidebar button.active{background:#eef8dc;border-right:3px solid #aaed63}.profile-sidebar button span{margin-right:8px}.profile-content{flex:1;padding:24px;min-width:0}.profile-quick-nav{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}.profile-quick-nav button{min-height:38px;border:1.5px solid #111412;border-radius:999px;background:#fff;color:#111412;padding:0 13px;font-weight:900}.profile-quick-nav button:first-child{background:#aaed63}.mobile-tabs{display:none}.toast{border:1px solid #111412;border-radius:8px;background:#aaed63;padding:10px 12px;margin-bottom:14px;font-weight:900}.profile-card{border:1.5px solid #111412;border-radius:12px;background:#fff;box-shadow:4px 4px 0 #111412;padding:24px;display:grid;gap:14px}.profile-card h1{margin:0;font-size:30px}.profile-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.profile-head span,.plan-box span{display:inline-flex;border-radius:999px;background:#dff8ed;color:#087f8c;padding:6px 10px;font-size:12px;font-weight:900}.profile-head button,.lime,.danger button{border:1.5px solid #111412;border-radius:8px;background:#fff;min-height:40px;padding:0 14px;font-weight:900}.lime{background:#aaed63;box-shadow:3px 3px 0 #111412}.full{width:100%}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.form-grid.three{grid-template-columns:repeat(3,1fr)}.field{display:grid;gap:6px;font-size:13px;font-weight:900;color:rgba(17,20,18,.72);position:relative}.field.wide{grid-column:1/-1}.field input,.field select,.field textarea{width:100%;border:1px solid #b9c5ad;border-radius:8px;background:#fff;padding:12px;font:inherit}.field textarea{height:80px;resize:vertical}.field input:disabled,.field select:disabled{background:#f7f8f3;color:rgba(17,20,18,.7)}.field small{color:#dc2626;font-size:11px}.field em{position:absolute;right:8px;top:32px;border-radius:999px;background:#eef8dc;padding:4px 8px;font-size:11px;font-style:normal;color:#6fab29}.danger{border:1.5px solid #ef4444;border-radius:10px;background:#fff5f5;padding:14px;margin-top:14px}.danger p{color:#7f1d1d}.plan-box{border:1px solid #dde4d5;border-radius:10px;background:#fbfcf7;padding:18px}.plan-box strong{display:block;font-size:34px;margin:10px 0}.plan-box p{color:rgba(17,20,18,.62)}
@media(max-width:767px){.profile-page{display:block}.profile-sidebar{display:none}.profile-content{padding:14px}.mobile-tabs{display:flex;overflow-x:auto;gap:8px;margin-bottom:12px}.mobile-tabs button{min-width:112px;border:1px solid #dde4d5;background:#fff;text-align:center}.mobile-tabs button.active{background:#eef8dc;border-color:#111412}.mobile-tabs span,.mobile-tabs small{display:block}.profile-head{flex-direction:column}.form-grid,.form-grid.three{grid-template-columns:1fr}.profile-card{padding:18px}}
`;
