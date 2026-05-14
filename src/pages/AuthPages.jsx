import { useState } from "react";
import { Navbar } from "../components/landing/Navbar";
import { Footer } from "../components/landing/PricingSection";
import { authApi } from "../services/api";

function ApiMessage({ message }) {
  if (!message) return null;
  return <div className={`api-message ${message.type}`}>{message.text}</div>;
}

function AuthShell({ mode, eyebrow, title, copy, children, benefits }) {
  return (
    <main className="landing-page">
      <Navbar />
      <section className="auth-page">
        <div className="container auth-layout">
          <aside className="auth-hero-card">
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p>{copy}</p>

            <div className="auth-preview">
              <div className="auth-preview-top">
                <span>{mode === "signup" ? "Freemium setup" : "Care workspace"}</span>
                <strong>Live</strong>
              </div>
              <div className="auth-preview-body">
                <div>
                  <span>Gợi ý chuyên khoa</span>
                  <strong>Nội tổng quát</strong>
                </div>
                <div>
                  <span>Mức ưu tiên</span>
                  <strong>Theo dõi trong 24h</strong>
                </div>
                <div>
                  <span>Hồ sơ</span>
                  <strong>{mode === "signup" ? "Sẵn sàng tạo" : "Đồng bộ sau đăng nhập"}</strong>
                </div>
              </div>
            </div>

            <div className="auth-benefits">
              {benefits.map((item) => (
                <div key={item[0]}>
                  <strong>{item[0]}</strong>
                  <span>{item[1]}</span>
                </div>
              ))}
            </div>
          </aside>

          <div className="auth-card">{children}</div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

function Field({ label, hint, ...props }) {
  return (
    <label className="clean-field">
      <span>{label}</span>
      <input {...props} />
      {hint && <small>{hint}</small>}
    </label>
  );
}

function SelectField({ label, children, ...props }) {
  return (
    <label className="clean-field">
      <span>{label}</span>
      <select {...props}>{children}</select>
    </label>
  );
}

export function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await authApi.login(form);
      window.location.href = "/app";
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      mode="login"
      eyebrow="Đăng nhập"
      title="Tiếp tục chăm sóc sức khỏe trong một workspace gọn gàng."
      copy="Đăng nhập để mở dashboard Freemium, lưu hồ sơ và dùng các chức năng backend đã có."
      benefits={[
        ["JWT", "Phiên đăng nhập bảo mật"],
        ["Profile", "Đọc và cập nhật hồ sơ"],
        ["Admin-ready", "Mở thêm quyền khi backend cho phép"],
      ]}
    >
      <div className="auth-card-header">
        <div>
          <p className="eyebrow">MediMate AI</p>
          <h2>Chào mừng trở lại</h2>
        </div>
        <a href="/signup">Tạo tài khoản</a>
      </div>

      <form className="clean-form" onSubmit={handleSubmit}>
        <ApiMessage message={message} />
        <Field
          label="Email"
          type="email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        <Field
          label="Mật khẩu"
          type="password"
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          placeholder="Nhập mật khẩu"
          autoComplete="current-password"
          required
        />
        <div className="auth-inline-row">
          <label className="auth-remember">
            <input type="checkbox" />
            <span>Ghi nhớ phiên</span>
          </label>
          <a href="/forgot-password">Quên mật khẩu?</a>
        </div>
        <button className="btn btn-primary auth-submit" type="submit" disabled={submitting}>
          {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
    </AuthShell>
  );
}

export function SignupPage() {
  const [form, setForm] = useState({
    email: "",
    userName: "",
    password: "",
    confirmPassword: "",
    displayName: "",
    address: "",
    gender: "1",
    dateOfBirth: "",
  });
  const [accepted, setAccepted] = useState(false);
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!accepted) {
      setMessage({ type: "error", text: "Bạn cần đồng ý điều khoản và disclaimer y tế." });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      await authApi.register({
        ...form,
        gender: Number(form.gender),
        dateOfBirth: form.dateOfBirth || null,
      });
      window.location.href = "/app";
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      mode="signup"
      eyebrow="Freemium"
      title="Tạo tài khoản nhẹ nhàng, vào app trong vài phút."
      copy="Form gửi đúng RegisterRequest của backend, nhưng được sắp xếp lại để người dùng thấy ít nặng nề hơn."
      benefits={[
        ["0đ", "Bắt đầu miễn phí"],
        ["Hồ sơ", "Lưu thông tin cơ bản"],
        ["Premium", "Nâng cấp khi cần phân tích sâu"],
      ]}
    >
      <div className="auth-card-header">
        <div>
          <p className="eyebrow">Tài khoản mới</p>
          <h2>Bắt đầu Freemium</h2>
        </div>
        <a href="/login">Đã có tài khoản</a>
      </div>

      <form className="clean-form" onSubmit={handleSubmit}>
        <ApiMessage message={message} />
        <div className="form-two-cols">
          <Field label="Email" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} autoComplete="email" required />
          <Field label="Tên đăng nhập" value={form.userName} onChange={(event) => update("userName", event.target.value)} autoComplete="username" required />
          <Field label="Tên hiển thị" value={form.displayName} onChange={(event) => update("displayName", event.target.value)} required />
          <Field label="Địa chỉ" value={form.address} onChange={(event) => update("address", event.target.value)} />
          <Field label="Mật khẩu" type="password" value={form.password} onChange={(event) => update("password", event.target.value)} autoComplete="new-password" required />
          <Field label="Nhập lại mật khẩu" type="password" value={form.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} autoComplete="new-password" required />
          <SelectField label="Giới tính" value={form.gender} onChange={(event) => update("gender", event.target.value)}>
            <option value="1">Nam</option>
            <option value="2">Nữ</option>
          </SelectField>
          <Field label="Ngày sinh" type="date" value={form.dateOfBirth} onChange={(event) => update("dateOfBirth", event.target.value)} />
        </div>

        <label className="api-check auth-consent">
          <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
          <span>Tôi đồng ý với điều khoản sử dụng và disclaimer y tế.</span>
        </label>

        <button className="btn btn-primary auth-submit" type="submit" disabled={submitting}>
          {submitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
        </button>
      </form>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await authApi.forgotPassword(email);
      setMessage({ type: "success", text: response.message || "Đã gửi yêu cầu khôi phục mật khẩu." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      mode="login"
      eyebrow="Khôi phục"
      title="Lấy OTP để đặt lại mật khẩu."
      copy="Nhập email tài khoản, sau đó dùng OTP ở bước đổi mật khẩu."
      benefits={[
        ["Bước 1", "Gửi email"],
        ["Bước 2", "Nhập OTP"],
        ["Bước 3", "Đăng nhập lại"],
      ]}
    >
      <div className="auth-card-header">
        <div>
          <p className="eyebrow">Mật khẩu</p>
          <h2>Quên mật khẩu</h2>
        </div>
        <a href="/login">Đăng nhập</a>
      </div>
      <form className="clean-form" onSubmit={handleSubmit}>
        <ApiMessage message={message} />
        <Field label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <button className="btn btn-primary auth-submit" type="submit" disabled={submitting}>
          {submitting ? "Đang gửi..." : "Gửi OTP"}
        </button>
        <div className="form-links">
          <a href="/change-password">Tôi đã có OTP</a>
        </div>
      </form>
    </AuthShell>
  );
}

export function ChangePasswordPage() {
  const [form, setForm] = useState({ email: "", otp: "", newPassword: "", confirmNewPassword: "" });
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await authApi.changePassword(form);
      setMessage({ type: "success", text: response.message || "Đổi mật khẩu thành công. Bạn có thể đăng nhập lại." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      mode="login"
      eyebrow="Đổi mật khẩu"
      title="Xác nhận OTP và đặt mật khẩu mới."
      copy="Form dùng endpoint /api/authentication/change-password theo Swagger."
      benefits={[
        ["OTP", "Mã xác thực"],
        ["Bảo mật", "Không lưu mật khẩu"],
        ["Hoàn tất", "Đăng nhập lại"],
      ]}
    >
      <div className="auth-card-header">
        <div>
          <p className="eyebrow">OTP</p>
          <h2>Đổi mật khẩu</h2>
        </div>
        <a href="/forgot-password">Gửi lại OTP</a>
      </div>
      <form className="clean-form" onSubmit={handleSubmit}>
        <ApiMessage message={message} />
        <Field label="Email" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} required />
        <Field label="OTP" value={form.otp} onChange={(event) => update("otp", event.target.value)} required />
        <Field label="Mật khẩu mới" type="password" value={form.newPassword} onChange={(event) => update("newPassword", event.target.value)} required />
        <Field label="Nhập lại mật khẩu mới" type="password" value={form.confirmNewPassword} onChange={(event) => update("confirmNewPassword", event.target.value)} required />
        <button className="btn btn-primary auth-submit" type="submit" disabled={submitting}>
          {submitting ? "Đang đổi..." : "Đổi mật khẩu"}
        </button>
      </form>
    </AuthShell>
  );
}
