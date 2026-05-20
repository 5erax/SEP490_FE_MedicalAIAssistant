import { useMemo, useState } from "react";
import { clearStoredAuth, getStoredAuth } from "../services/api";

const mockUser = {
  userId: "u1",
  fullName: "Nguyễn Văn Phước",
  email: "phuoc@gmail.com",
  isActive: true,
};

const mockPatientProfile = null;
const mockReminders = [
  { icon: "💊", label: "Uống Amoxicillin", time: "8:00", type: "Medication" },
  { icon: "📅", label: "Tái khám Bệnh viện Bạch Mai", time: "14:00", type: "FollowUpVisit" },
  { icon: "🔬", label: "Lấy kết quả xét nghiệm", time: "16:30", type: "LabTest" },
];

const quickReplies = [
  "Tôi bị đau đầu và sốt nhẹ 2 ngày",
  "Tôi nên chuẩn bị gì trước khi đi khám?",
  "Triệu chứng nào cần đi cấp cứu?",
];

const clinics = [
  { name: "Bệnh viện Chợ Rẫy", address: "201B Nguyễn Chí Thanh, Q.5", type: "Cấp cứu" },
  { name: "BV Đại học Y Dược", address: "215 Hồng Bàng, Q.5", type: "Đa khoa" },
];

function navigate(path) {
  window.location.href = path;
}

function openChat(prefill = "") {
  if (prefill) sessionStorage.setItem("medimate.chat.prefill", prefill);
  navigate("/chat");
}

export default function DashboardPage() {
  const auth = getStoredAuth();
  const user = useMemo(() => ({
    ...mockUser,
    fullName: auth?.displayName || auth?.name || auth?.email?.split("@")[0] || mockUser.fullName,
    email: auth?.email || mockUser.email,
    isActive: true,
  }), [auth]);
  const [quickInput, setQuickInput] = useState("");
  const [symptomDraft, setSymptomDraft] = useState("");

  function logout() {
    clearStoredAuth();
    navigate("/");
  }

  function openSymptom() {
    if (symptomDraft.trim()) sessionStorage.setItem("medimate.symptom.prefill", symptomDraft.trim());
    navigate("/symptom");
  }

  return (
    <main className="dash-page">
      <style>{styles}</style>
      <header className="dash-header">
        <div>
          <p className="section-label">Không gian cá nhân</p>
          <h1>Chào, {user.fullName}</h1>
          <p>Theo dõi hồ sơ, chuẩn bị câu hỏi khi đi khám và tìm nơi chăm sóc phù hợp.</p>
        </div>
        <button className="outline-btn" type="button" onClick={logout}>Đăng xuất</button>
      </header>

      <section className="stats-row" aria-label="Tổng quan">
        <article>
          <span>Tài khoản</span>
          <strong>{user.isActive ? "Đã xác thực" : "Chưa xác thực"}</strong>
          <em className={user.isActive ? "badge lime" : "badge amber"}>{user.isActive ? "Sẵn sàng" : "Cần xác thực"}</em>
        </article>
        <article>
          <span>Hồ sơ SK</span>
          <strong>{mockPatientProfile ? "Đã tạo" : "Chưa tạo"}</strong>
          {!mockPatientProfile && <button type="button" onClick={() => navigate("/profile")}>Tạo ngay</button>}
        </article>
        <article>
          <span>Phân tích</span>
          <strong>2</strong>
          <small>Phiên gần đây</small>
        </article>
        <article>
          <span>Gợi ý BĐ</span>
          <strong>4</strong>
          <small>Cơ sở phù hợp</small>
        </article>
      </section>

      <section className="tool-grid" aria-label="Chuc nang chinh">
        <button type="button" onClick={() => navigate("/profile")}><span>01</span><strong>Hồ sơ cá nhân</strong><small>Cập nhật thông tin và hồ sơ sức khoẻ</small></button>
        <button type="button" onClick={() => navigate("/records")}><span>02</span><strong>Hồ sơ y tế</strong><small>Xem xét nghiệm, toa thuốc và phân tích AI</small></button>
        <button type="button" onClick={() => navigate("/medication")}><span>03</span><strong>Nhận diện thuốc</strong><small>Quét nhãn thuốc và kiểm tra tương tác</small></button>
        <button type="button" onClick={() => navigate("/pricing")}><span>04</span><strong>MediMate+</strong><small>Khám phá các tính năng nâng cao</small></button>
      </section>

      <section className="main-grid">
        <div className="stack">
          <article className="feature-card">
            <p className="section-label">Phân tích triệu chứng</p>
            <h2>Bạn đang có triệu chứng gì?</h2>
            <textarea value={symptomDraft} onChange={(event) => setSymptomDraft(event.target.value)} placeholder="Mô tả triệu chứng bằng tiếng Việt..." />
            <button className="primary-btn full" type="button" onClick={openSymptom}>Phân tích ngay →</button>
          </article>

          <article className="feature-card">
            <p className="section-label">Nhắc nhở hôm nay</p>
            <div className="reminder-list">
              {mockReminders.map((item) => (
                <div className="reminder-item" key={item.label}>
                  <span className="reminder-icon">{item.icon}</span>
                  <strong>{item.label}</strong>
                  <em>{item.time}</em>
                  <small>{item.type}</small>
                </div>
              ))}
            </div>
          </article>
        </div>

        <div className="stack">
          <article className="feature-card">
            <div className="title-row">
              <div>
                <p className="section-label">Trợ lý nhanh</p>
                <h2>Hỏi MediMate AI</h2>
              </div>
              <span className="ready-badge">Sẵn sàng</span>
            </div>
            <div className="chips">
              {quickReplies.map((reply) => (
                <button type="button" key={reply} onClick={() => openChat(reply)}>{reply}</button>
              ))}
            </div>
            <div className="mini-chat">
              <input value={quickInput} onChange={(event) => setQuickInput(event.target.value)} placeholder="Nhập câu hỏi nhanh..." />
              <button type="button" onClick={() => openChat(quickInput)}>Gửi</button>
            </div>
          </article>

          <article className="feature-card">
            <p className="section-label">Cơ sở y tế gần bạn</p>
            <button className="map-preview-card" type="button" onClick={() => navigate("/map")}>
              <span>Xem bản đồ đầy đủ</span>
            </button>
            <div className="clinic-list">
              {clinics.map((clinic) => (
                <div key={clinic.name}>
                  <strong>{clinic.name}</strong>
                  <small>{clinic.address}</small>
                  <em>{clinic.type}</em>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}

const styles = `
.dash-page{min-height:100vh;background:#f7f8f3;color:#111412;padding:34px min(5vw,72px) 64px;font-family:"Be Vietnam Pro",system-ui,sans-serif}
.dash-header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:24px}
.section-label{display:flex;align-items:center;gap:8px;margin:0 0 12px;color:#6fab29;font-size:11px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.section-label:before{content:"";width:12px;height:2px;background:#6fab29}
.dash-header h1{margin:0;font-family:Lora,serif;font-size:clamp(40px,6vw,72px);line-height:1.02}.dash-header p:not(.section-label){color:rgba(17,20,18,.66);font-size:17px}
.outline-btn,.primary-btn,.mini-chat button{border:1.5px solid #111412;border-radius:8px;background:#fff;color:#111412;font-weight:900;min-height:44px;padding:0 18px}.primary-btn,.mini-chat button{background:#aaed63;box-shadow:4px 4px 0 #111412}.full{width:100%}
.stats-row{display:grid;grid-template-columns:repeat(4,minmax(220px,1fr));gap:12px;margin-bottom:18px}.stats-row article,.feature-card{border:1.5px solid #111412;border-radius:12px;background:#fff;box-shadow:4px 4px 0 #111412;padding:18px;min-width:0}.stats-row span{display:block;color:rgba(17,20,18,.48);font-size:12px;font-weight:900;text-transform:uppercase}.stats-row strong{display:block;margin-top:8px;font-size:22px}.stats-row button{margin-top:10px;border:1px solid #111412;border-radius:999px;background:#aaed63;font-weight:900;padding:7px 12px}.badge{display:inline-flex;margin-top:10px;border-radius:999px;padding:6px 10px;font-size:11px;font-style:normal;font-weight:900}.lime{background:#aaed63}.amber{background:#fff2d0;color:#b45309}
.tool-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:20px}.tool-grid button{min-width:0;border:1.5px solid #111412;border-radius:12px;background:#fff;color:#111412;text-align:left;padding:16px;box-shadow:3px 3px 0 #111412;transition:transform .18s ease,background .18s ease}.tool-grid button:hover{transform:translateY(-3px);background:#eef8dc}.tool-grid span{display:inline-grid;place-items:center;width:30px;height:30px;border-radius:999px;background:#111412;color:#aaed63;font-size:12px;font-weight:900}.tool-grid strong{display:block;margin-top:12px;font-size:16px}.tool-grid small{display:block;margin-top:5px;color:rgba(17,20,18,.62);line-height:1.45}
.main-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}.stack{display:grid;gap:20px}.feature-card h2{margin:0 0 14px;font-size:28px}.feature-card textarea{width:100%;min-height:128px;resize:vertical;border:1.5px solid #111412;border-radius:10px;padding:14px;font:inherit;margin-bottom:14px}
.reminder-list{display:grid;gap:10px}.reminder-item{display:grid;grid-template-columns:auto 1fr auto auto;gap:10px;align-items:center;border:1px solid #dde4d5;border-radius:10px;background:#fbfcf7;padding:12px}.reminder-icon{font-size:22px}.reminder-item em,.reminder-item small{border-radius:999px;padding:5px 9px;font-size:11px;font-style:normal;font-weight:900}.reminder-item em{background:#111412;color:#fff}.reminder-item small{background:#dff8ed;color:#087f8c}
.title-row{display:flex;justify-content:space-between;gap:12px}.ready-badge{align-self:start;border-radius:999px;background:#dff8ed;color:#087f8c;padding:7px 10px;font-size:12px;font-weight:900}.chips{display:flex;flex-wrap:wrap;gap:9px}.chips button{border:1px solid #dde4d5;border-radius:999px;background:#fff;padding:9px 12px;font-weight:800;color:rgba(17,20,18,.7)}
.mini-chat{display:grid;grid-template-columns:1fr auto;gap:10px;margin-top:14px}.mini-chat input{border:1.5px solid #111412;border-radius:10px;padding:12px;font:inherit}
.map-preview-card{width:100%;height:140px;border:1.5px dashed #111412;border-radius:12px;background:linear-gradient(90deg,rgba(17,20,18,.06) 1px,transparent 1px),linear-gradient(rgba(17,20,18,.06) 1px,transparent 1px),#eef2ec;background-size:26px 26px;display:grid;place-items:center;font-weight:900;color:#111412}.map-preview-card span{border:1.5px solid #111412;border-radius:999px;background:#aaed63;padding:10px 14px;box-shadow:3px 3px 0 #111412}
.clinic-list{display:grid;gap:10px;margin-top:14px}.clinic-list div{border:1px solid #dde4d5;border-radius:10px;background:#fbfcf7;padding:12px}.clinic-list strong,.clinic-list small,.clinic-list em{display:block}.clinic-list small{margin-top:4px;color:rgba(17,20,18,.62)}.clinic-list em{margin-top:7px;color:#087f8c;font-style:normal;font-size:12px;font-weight:900}
@media(max-width:980px){.tool-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:767px){.dash-page{padding:24px 14px 48px}.dash-header{flex-direction:column}.stats-row{display:flex;overflow-x:auto;padding-bottom:8px}.stats-row article{min-width:220px}.tool-grid{display:flex;overflow-x:auto;padding-bottom:8px}.tool-grid button{min-width:220px}.main-grid{grid-template-columns:1fr}.reminder-item{grid-template-columns:auto 1fr}.mini-chat{grid-template-columns:1fr}}
`;
