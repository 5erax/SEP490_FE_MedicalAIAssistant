import { useEffect, useState } from "react";
import { Navbar } from "../components/landing/Navbar";
import { Footer } from "../components/landing/PricingSection";
import { authApi, clearStoredAuth, getStoredAuth } from "../services/api";

function ApiMessage({ message }) {
  if (!message) return null;
  return <div className={`api-message ${message.type}`}>{message.text}</div>;
}

function EmptyAuth() {
  return (
    <main className="landing-page">
      <Navbar />
      <section className="api-page">
        <div className="container api-panel api-empty">
          <p className="eyebrow">Tài khoản</p>
          <h1>Bạn cần đăng nhập để xem hồ sơ.</h1>
          <p>Trang này gọi /api/users/me và các endpoint cần JWT.</p>
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

export default function AccountPage() {
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    displayName: "",
    address: "",
    gender: "1",
    dateOfBirth: "",
    phoneNumber: "",
  });
  const [loading, setLoading] = useState(Boolean(auth));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!auth) return;
    let active = true;

    authApi.me()
      .then((response) => {
        if (!active) return;
        const data = response.data ?? {};
        setUser(data);
        setForm((current) => ({
          ...current,
          displayName: data.name ?? auth.email ?? "",
        }));
      })
      .catch((error) => {
        if (!active) return;
        setMessage({ type: "error", text: error.message });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [auth]);

  if (!auth) return <EmptyAuth />;

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave(event) {
    event.preventDefault();
    const userId = user?.userId ?? auth?.userId;
    if (!userId) {
      setMessage({ type: "error", text: "Không tìm thấy userId để cập nhật hồ sơ." });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const response = await authApi.updateUser(userId, {
        ...form,
        gender: Number(form.gender),
        dateOfBirth: form.dateOfBirth || null,
      });
      setMessage({ type: "success", text: response.message || "Đã cập nhật hồ sơ." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      // Local logout should still happen if the server session is already gone.
    } finally {
      clearStoredAuth();
      setAuth(null);
      window.location.href = "/";
    }
  }

  return (
    <main className="landing-page">
      <Navbar />
      <section className="api-page">
        <div className="container">
          <div className="api-heading">
            <p className="eyebrow">Tài khoản</p>
            <h1>Hồ sơ Freemium của bạn.</h1>
            <p>Đây là vùng dùng các endpoint đã có: /api/users/me, /api/users/:userId và logout.</p>
          </div>

          <div className="account-layout">
            <section className="api-panel">
              <h2>Thông tin đăng nhập</h2>
              <ApiMessage message={message} />
              {loading ? (
                <p className="muted-text">Đang tải hồ sơ...</p>
              ) : (
                <div className="profile-list">
                  <div><span>Email</span><strong>{user?.email ?? auth.email ?? "Chưa có"}</strong></div>
                  <div><span>User ID</span><strong>{user?.userId ?? auth.userId}</strong></div>
                  <div><span>Trạng thái</span><strong>{user?.status === 1 ? "Đã duyệt" : "Chờ duyệt"}</strong></div>
                  <div><span>Vai trò</span><strong>{(user?.roles ?? auth.roles ?? []).join(", ") || "User"}</strong></div>
                </div>
              )}
              <div className="hero-actions compact-actions">
                <a className="btn btn-ghost" href="/departments">Quản lý chuyên khoa</a>
                <a className="btn btn-ghost" href="/admin/users">Admin users</a>
                <button className="btn btn-dark" type="button" onClick={handleLogout}>Đăng xuất</button>
              </div>
            </section>

            <form className="api-panel api-form" onSubmit={handleSave}>
              <h2>Cập nhật hồ sơ</h2>
              <label>
                Tên hiển thị
                <input value={form.displayName} onChange={(event) => update("displayName", event.target.value)} />
              </label>
              <label>
                Địa chỉ
                <input value={form.address} onChange={(event) => update("address", event.target.value)} />
              </label>
              <label>
                Số điện thoại
                <input value={form.phoneNumber} onChange={(event) => update("phoneNumber", event.target.value)} />
              </label>
              <div className="form-two-cols">
                <label>
                  Giới tính
                  <select value={form.gender} onChange={(event) => update("gender", event.target.value)}>
                    <option value="1">Nam</option>
                    <option value="2">Nữ</option>
                  </select>
                </label>
                <label>
                  Ngày sinh
                  <input type="date" value={form.dateOfBirth} onChange={(event) => update("dateOfBirth", event.target.value)} />
                </label>
              </div>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </form>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
