import { useEffect, useMemo, useState } from "react";
import { Navbar } from "../components/landing/Navbar";
import { Footer } from "../components/landing/PricingSection";
import { authApi, clearStoredAuth, getStoredAuth, medicalDepartmentsApi } from "../services/api";
import { normalizeRoles } from "../utils/roles";

const EMPTY_PROFILE = {
  displayName: "",
  address: "",
  gender: "1",
  dateOfBirth: "",
  phoneNumber: "",
};

const suggestedFacilities = [
  {
    name: "Bệnh viện Đại học Y Dược",
    department: "Nội tổng quát",
    distance: "2.4 km",
    status: "Đang mở cửa",
    address: "215 Hồng Bàng, Quận 5",
    x: 62,
    y: 34,
  },
  {
    name: "Bệnh viện Chợ Rẫy",
    department: "Cấp cứu",
    distance: "3.1 km",
    status: "Ưu tiên khi triệu chứng nặng",
    address: "201B Nguyễn Chí Thanh, Quận 5",
    x: 42,
    y: 56,
  },
  {
    name: "Phòng khám Gia đình",
    department: "Khám ban đầu",
    distance: "1.2 km",
    status: "Còn lượt trong ngày",
    address: "Khu vực gần bạn",
    x: 74,
    y: 68,
  },
];

const quickPrompts = [
  "Tôi bị đau đầu và sốt nhẹ 2 ngày",
  "Tôi nên chuẩn bị gì trước khi đi khám?",
  "Triệu chứng nào cần đi cấp cứu?",
];

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

function toDateInput(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function getUserId(user, auth) {
  return user?.userId ?? user?.identityId ?? auth?.userId ?? auth?.identityId ?? "";
}

function EmptyAuth() {
  return (
    <main className="landing-page">
      <Navbar />
      <section className="app-page">
        <div className="container app-empty">
          <p className="eyebrow">Hồ sơ cá nhân</p>
          <h1>Bạn cần đăng nhập để mở không gian chăm sóc sức khỏe.</h1>
          <div className="hero-actions">
            <a className="btn btn-primary" href="/login">Đăng nhập</a>
            <a className="btn btn-ghost" href="/signup">Tạo tài khoản</a>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

function MapPreview() {
  return (
    <section className="app-card patient-map-card">
      <div className="panel-title-row">
        <div>
          <p className="eyebrow">Gợi ý nơi khám</p>
          <h2>Bản đồ cơ sở y tế gần bạn</h2>
        </div>
        <span className="soft-badge">Sắp có</span>
      </div>

      <div className="patient-map-layout">
        <div className="map-preview" aria-label="Bản đồ gợi ý cơ sở y tế">
          <div className="map-route route-a" />
          <div className="map-route route-b" />
          <div className="map-current-location">Bạn</div>
          {suggestedFacilities.map((facility, index) => (
            <button
              className="map-pin"
              style={{ left: `${facility.x}%`, top: `${facility.y}%` }}
              key={facility.name}
              type="button"
              aria-label={facility.name}
            >
              {index + 1}
            </button>
          ))}
        </div>

        <div className="facility-list">
          {suggestedFacilities.map((facility, index) => (
            <article key={facility.name}>
              <span>{index + 1}</span>
              <div>
                <strong>{facility.name}</strong>
                <small>{facility.department} · {facility.distance}</small>
                <p>{facility.address}</p>
                <em>{facility.status}</em>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ChatAssistant() {
  const [messages, setMessages] = useState([
    {
      from: "assistant",
      text: "Bạn có thể mô tả triệu chứng, thời gian xuất hiện và mức độ khó chịu. Mình sẽ giúp bạn chuẩn bị thông tin trước khi đi khám.",
    },
  ]);
  const [draft, setDraft] = useState("");

  function sendMessage(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;

    setMessages((current) => [
      ...current,
      { from: "user", text },
      {
        from: "assistant",
        text: "Mình đã ghi nhận. Hãy theo dõi mức độ nặng hơn, thời gian kéo dài và các dấu hiệu bất thường như khó thở, đau ngực, lơ mơ hoặc sốt cao.",
      },
    ]);
    setDraft("");
  }

  return (
    <section className="app-card patient-chat-card">
      <div className="panel-title-row">
        <div>
          <p className="eyebrow">Hỏi nhanh</p>
          <h2>Trợ lý chăm sóc</h2>
        </div>
        <span className="soft-badge">Tham khảo</span>
      </div>

      <div className="chat-thread">
        {messages.map((message, index) => (
          <div className={`chat-bubble ${message.from}`} key={`${message.from}-${index}`}>
            {message.text}
          </div>
        ))}
      </div>

      <div className="quick-prompts">
        {quickPrompts.map((prompt) => (
          <button key={prompt} type="button" onClick={() => setDraft(prompt)}>
            {prompt}
          </button>
        ))}
      </div>

      <form className="chat-input-row" onSubmit={sendMessage}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Mô tả triệu chứng hoặc điều bạn muốn hỏi..."
        />
        <button className="btn btn-primary btn-small" type="submit">Gửi</button>
      </form>
    </section>
  );
}

export default function PatientWorkspacePage() {
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [user, setUser] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE);
  const [loading, setLoading] = useState(Boolean(auth));
  const [savingProfile, setSavingProfile] = useState(false);
  const [message, setMessage] = useState(null);
  const [profileMessage, setProfileMessage] = useState(null);
  const [departmentMessage, setDepartmentMessage] = useState(null);

  const roles = useMemo(() => normalizeRoles(user?.roles ?? auth?.roles ?? []), [auth, user]);
  const displayName = user?.name || user?.displayName || auth?.email?.split("@")[0] || "bạn";
  const currentUserId = getUserId(user, auth);

  useEffect(() => {
    if (!auth) return;
    let active = true;

    Promise.allSettled([authApi.me(), medicalDepartmentsApi.list()])
      .then(([profileResult, departmentResult]) => {
        if (!active) return;

        if (profileResult.status === "fulfilled") {
          const data = profileResult.value.data ?? {};
          setUser(data);
          setProfileForm({
            displayName: data.name ?? data.displayName ?? auth.email ?? "",
            address: data.address ?? "",
            gender: String(data.gender ?? "1"),
            dateOfBirth: toDateInput(data.dateOfBirth),
            phoneNumber: data.phoneNumber ?? "",
          });
        } else {
          setMessage({ type: "warning", text: profileResult.reason.message });
        }

        if (departmentResult.status === "fulfilled") {
          setDepartments(departmentResult.value.data ?? []);
        } else {
          setDepartmentMessage({ type: "error", text: departmentResult.reason.message });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [auth]);

  if (!auth) return <EmptyAuth />;

  function updateProfile(key, value) {
    setProfileForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSaveProfile(event) {
    event.preventDefault();
    if (!currentUserId) {
      setProfileMessage({ type: "error", text: "Không tìm thấy tài khoản trong phiên đăng nhập." });
      return;
    }

    setSavingProfile(true);
    setProfileMessage(null);
    try {
      const response = await authApi.updateUser(currentUserId, {
        ...profileForm,
        gender: Number(profileForm.gender),
        dateOfBirth: profileForm.dateOfBirth || null,
      });
      setProfileMessage({ type: "success", text: response.message || "Đã cập nhật hồ sơ." });
    } catch (error) {
      setProfileMessage({ type: "error", text: error.message });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      // Keep local logout reliable when the server session has already expired.
    } finally {
      clearStoredAuth();
      setAuth(null);
      window.location.href = "/";
    }
  }

  return (
    <main className="workspace-root patient-workspace">
      <section className="app-page">
        <div className="container app-main">
          <header className="app-topbar workspace-topbar">
            <div>
              <p className="eyebrow">Không gian cá nhân</p>
              <h1>Chào {displayName}</h1>
              <p className="muted-text">Theo dõi hồ sơ, chuẩn bị câu hỏi khi đi khám và tìm nơi chăm sóc phù hợp.</p>
            </div>
            <button className="btn btn-dark btn-small" type="button" onClick={handleLogout}>Đăng xuất</button>
          </header>

          <ApiMessage message={message} />

          <div className="app-stats">
            <article>
              <span>Trạng thái</span>
              <strong>{loading ? "Đang tải" : Number(user?.status) === 1 ? "Đã xác thực" : "Đang chờ"}</strong>
            </article>
            <article>
              <span>Tài khoản</span>
              <strong>{roles.length ? roles.join(", ") : "Người dùng"}</strong>
            </article>
            <article>
              <span>Chuyên khoa</span>
              <strong>{departments.length}</strong>
            </article>
            <article>
              <span>Gợi ý hôm nay</span>
              <strong>{suggestedFacilities.length}</strong>
            </article>
          </div>

          <div className="app-work-grid">
            <form className="app-card clean-form" onSubmit={handleSaveProfile}>
              <div className="panel-title-row">
                <div>
                  <p className="eyebrow">Hồ sơ</p>
                  <h2>Thông tin cá nhân</h2>
                </div>
                <span className="soft-badge">Đang lưu</span>
              </div>
              <ApiMessage message={profileMessage} />
              <Field label="Tên hiển thị">
                <input value={profileForm.displayName} onChange={(event) => updateProfile("displayName", event.target.value)} />
              </Field>
              <Field label="Địa chỉ">
                <input value={profileForm.address} onChange={(event) => updateProfile("address", event.target.value)} />
              </Field>
              <div className="form-two-cols">
                <Field label="Giới tính">
                  <select value={profileForm.gender} onChange={(event) => updateProfile("gender", event.target.value)}>
                    <option value="1">Nam</option>
                    <option value="2">Nữ</option>
                  </select>
                </Field>
                <Field label="Ngày sinh">
                  <input type="date" value={profileForm.dateOfBirth} onChange={(event) => updateProfile("dateOfBirth", event.target.value)} />
                </Field>
              </div>
              <Field label="Số điện thoại">
                <input value={profileForm.phoneNumber} onChange={(event) => updateProfile("phoneNumber", event.target.value)} />
              </Field>
              <button className="btn btn-primary" type="submit" disabled={savingProfile}>
                {savingProfile ? "Đang lưu..." : "Lưu hồ sơ"}
              </button>
            </form>

            <section className="app-card">
              <div className="panel-title-row">
                <div>
                  <p className="eyebrow">Tra cứu</p>
                  <h2>Chuyên khoa phù hợp</h2>
                </div>
                <span className="soft-badge">Danh mục</span>
              </div>
              <ApiMessage message={departmentMessage} />
              <div className="mini-list">
                {departments.length === 0 && <p className="muted-text">Chưa có chuyên khoa để hiển thị.</p>}
                {departments.slice(0, 6).map((department) => (
                  <article key={department.id}>
                    <strong>{department.departmentName || "Chưa đặt tên"}</strong>
                    <span>{department.description || "Chưa có mô tả."}</span>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <div className="patient-tools-grid">
            <MapPreview />
            <ChatAssistant />
          </div>
        </div>
      </section>
    </main>
  );
}
