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
          <p className="eyebrow">Patient Workspace</p>
          <h1>Bạn cần đăng nhập để mở hồ sơ cá nhân.</h1>
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
      setProfileMessage({ type: "error", text: "Không tìm thấy userId trong phiên đăng nhập." });
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
    <main className="landing-page">
      <Navbar />
      <section className="app-page">
        <div className="container app-main">
          <header className="app-topbar">
            <div>
              <p className="eyebrow">Patient Workspace</p>
              <h1>Chào {displayName}</h1>
              <p className="muted-text">Workspace riêng cho người dùng. Các module AI triệu chứng/bệnh viện sẽ mở khi backend có API tương ứng.</p>
            </div>
            <button className="btn btn-dark btn-small" type="button" onClick={handleLogout}>Đăng xuất</button>
          </header>

          <ApiMessage message={message} />

          <div className="app-stats">
            <article>
              <span>Trạng thái</span>
              <strong>{loading ? "Đang tải" : Number(user?.status) === 1 ? "Đã duyệt" : "Chờ duyệt"}</strong>
            </article>
            <article>
              <span>Role</span>
              <strong>{roles.length ? roles.join(", ") : "user"}</strong>
            </article>
            <article>
              <span>Chuyên khoa</span>
              <strong>{departments.length}</strong>
            </article>
            <article>
              <span>API hiện có</span>
              <strong>Profile</strong>
            </article>
          </div>

          <div className="app-work-grid">
            <form className="app-card clean-form" onSubmit={handleSaveProfile}>
              <div className="panel-title-row">
                <div>
                  <p className="eyebrow">Hồ sơ</p>
                  <h2>Thông tin cá nhân</h2>
                </div>
                <span className="soft-badge">PUT /api/users/:id</span>
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
                  <h2>Danh mục chuyên khoa</h2>
                </div>
                <span className="soft-badge">GET</span>
              </div>
              <ApiMessage message={departmentMessage} />
              <div className="mini-list">
                {departments.length === 0 && <p className="muted-text">Chưa có chuyên khoa từ backend.</p>}
                {departments.map((department) => (
                  <article key={department.id}>
                    <strong>{department.departmentName || "Chưa đặt tên"}</strong>
                    <span>{department.description || "Chưa có mô tả."}</span>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

