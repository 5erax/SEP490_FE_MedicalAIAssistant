import { useState } from "react";
import { Navbar } from "../components/landing/Navbar";
import { Footer } from "../components/landing/PricingSection";
import { authApi } from "../services/api";

function ApiMessage({ message }) {
  if (!message) return null;
  return (
    <div className={`api-message ${message.type}`}>
      {message.text}
    </div>
  );
}

function AuthShell({ eyebrow, title, copy, children, sideItems }) {
  return (
    <main className="landing-page">
      <Navbar />
      <section className="api-page">
        <div className="container api-auth-grid">
          <div className="api-auth-copy">
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p>{copy}</p>
            <div className="auth-side-list">
              {sideItems.map((item) => (
                <article key={item[0]}>
                  <strong>{item[0]}</strong>
                  <span>{item[1]}</span>
                </article>
              ))}
            </div>
          </div>
          {children}
        </div>
      </section>
      <Footer />
    </main>
  );
}

function TextField({ label, ...props }) {
  return (
    <label>
      {label}
      <input {...props} />
    </label>
  );
}

function SelectField({ label, children, ...props }) {
  return (
    <label>
      {label}
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
      window.location.href = "/account";
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Đăng nhập"
      title="Vào Freemium để lưu hồ sơ và tiếp tục theo dõi."
      copy="Tài khoản dùng JWT từ backend. Sau khi đăng nhập, token được lưu cục bộ để gọi các API cần xác thực."
      sideItems={[
        ["Hồ sơ cá nhân", "Xem thông tin /api/users/me"],
        ["Chuyên khoa", "Tạo và quản lý medical departments"],
        ["Admin", "Duyệt người dùng nếu tài khoản có quyền"],
      ]}
    >
      <form className="api-panel api-form" onSubmit={handleSubmit}>
        <h2>Đăng nhập</h2>
        <ApiMessage message={message} />
        <TextField
          label="Email"
          type="email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          placeholder="you@example.com"
          required
        />
        <TextField
          label="Mật khẩu"
          type="password"
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          placeholder="••••••••"
          required
        />
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
        <div className="form-links">
          <a href="/forgot-password">Quên mật khẩu</a>
          <a href="/signup">Tạo tài khoản mới</a>
        </div>
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
      window.location.href = "/account";
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Dùng thử miễn phí"
      title="Tạo tài khoản Freemium bằng API register."
      copy="Form này gửi đúng RegisterRequest trong Swagger, gồm email, username, mật khẩu, tên hiển thị, địa chỉ, giới tính và ngày sinh."
      sideItems={[
        ["0đ", "Bắt đầu với gói Freemium"],
        ["JWT", "Nhận token sau đăng ký thành công"],
        ["Nâng cấp sau", "Khám phá Premium trên landing"],
      ]}
    >
      <form className="api-panel api-form" onSubmit={handleSubmit}>
        <h2>Tạo tài khoản</h2>
        <ApiMessage message={message} />
        <div className="form-two-cols">
          <TextField label="Email" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} required />
          <TextField label="Tên đăng nhập" value={form.userName} onChange={(event) => update("userName", event.target.value)} required />
          <TextField label="Tên hiển thị" value={form.displayName} onChange={(event) => update("displayName", event.target.value)} required />
          <TextField label="Địa chỉ" value={form.address} onChange={(event) => update("address", event.target.value)} />
          <TextField label="Mật khẩu" type="password" value={form.password} onChange={(event) => update("password", event.target.value)} required />
          <TextField label="Nhập lại mật khẩu" type="password" value={form.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} required />
          <SelectField label="Giới tính" value={form.gender} onChange={(event) => update("gender", event.target.value)}>
            <option value="1">Nam</option>
            <option value="2">Nữ</option>
          </SelectField>
          <TextField label="Ngày sinh" type="date" value={form.dateOfBirth} onChange={(event) => update("dateOfBirth", event.target.value)} />
        </div>
        <label className="api-check">
          <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
          <span>Tôi đồng ý với điều khoản sử dụng và disclaimer y tế.</span>
        </label>
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? "Đang tạo tài khoản..." : "Tạo tài khoản Freemium"}
        </button>
        <div className="form-links">
          <a href="/login">Đã có tài khoản</a>
          <a href="/medical-disclaimer">Đọc disclaimer y tế</a>
        </div>
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
      eyebrow="Khôi phục"
      title="Nhận OTP đổi mật khẩu qua backend."
      copy="Nhập email tài khoản. Backend sẽ xử lý OTP theo cấu hình hiện có."
      sideItems={[
        ["Bước 1", "Gửi email đến forgot-password"],
        ["Bước 2", "Nhập OTP ở trang đổi mật khẩu"],
        ["Bước 3", "Đăng nhập lại bằng mật khẩu mới"],
      ]}
    >
      <form className="api-panel api-form" onSubmit={handleSubmit}>
        <h2>Quên mật khẩu</h2>
        <ApiMessage message={message} />
        <TextField label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? "Đang gửi..." : "Gửi OTP"}
        </button>
        <div className="form-links">
          <a href="/change-password">Tôi đã có OTP</a>
          <a href="/login">Quay lại đăng nhập</a>
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
      eyebrow="Đổi mật khẩu"
      title="Xác nhận OTP và đặt mật khẩu mới."
      copy="Form này dùng endpoint /api/authentication/change-password theo Swagger."
      sideItems={[
        ["OTP", "Mã xác thực từ email"],
        ["Mật khẩu mới", "Gửi newPassword và confirmNewPassword"],
        ["Bảo mật", "Không lưu mật khẩu trên frontend"],
      ]}
    >
      <form className="api-panel api-form" onSubmit={handleSubmit}>
        <h2>Đổi mật khẩu</h2>
        <ApiMessage message={message} />
        <TextField label="Email" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} required />
        <TextField label="OTP" value={form.otp} onChange={(event) => update("otp", event.target.value)} required />
        <TextField label="Mật khẩu mới" type="password" value={form.newPassword} onChange={(event) => update("newPassword", event.target.value)} required />
        <TextField label="Nhập lại mật khẩu mới" type="password" value={form.confirmNewPassword} onChange={(event) => update("confirmNewPassword", event.target.value)} required />
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? "Đang đổi..." : "Đổi mật khẩu"}
        </button>
        <div className="form-links">
          <a href="/forgot-password">Gửi lại OTP</a>
          <a href="/login">Đăng nhập</a>
        </div>
      </form>
    </AuthShell>
  );
}
