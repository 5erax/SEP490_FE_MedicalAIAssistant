import { useState } from "react";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { Navbar } from "../components/landing/Navbar";
import { authApi } from "../services/api";
import { getPostLoginPath, getWorkspacePath } from "../utils/roles";
import "../styles/auth-refresh.css";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const GOOGLE_LOGIN_ENABLED = Boolean(GOOGLE_CLIENT_ID.trim());

function ApiMessage({ message }) {
  if (!message) return null;
  return <div className={`api-message ${message.type}`}>{message.text}</div>;
}

const authCopy = {
  login: {
    eyebrow: "MediMate AI",
    title: "Đăng nhập để tiếp tục chăm sóc sức khỏe của bạn.",
    copy: "Mở hồ sơ cá nhân, xem lại thông tin đã lưu và tiếp tục các bước theo dõi phù hợp.",
    sideTitle: "Một nơi gọn gàng cho hành trình đi khám",
    sideCopy: "Nhập triệu chứng, lưu hồ sơ, xem chuyên khoa phù hợp và chuẩn bị tốt hơn trước khi đến cơ sở y tế.",
    points: ["Hồ sơ cá nhân", "Gợi ý chuyên khoa", "Theo dõi sau khám"],
  },
  signup: {
    eyebrow: "Tài khoản mới",
    title: "Tạo tài khoản để lưu hồ sơ và dùng thử miễn phí.",
    copy: "Chỉ cần vài thông tin cơ bản để MediMate AI cá nhân hóa trải nghiệm chăm sóc sức khỏe.",
    sideTitle: "Bắt đầu nhẹ nhàng",
    sideCopy: "Bạn có thể dùng các tính năng cơ bản trước, sau đó nâng cấp khi cần phân tích sâu hơn.",
    points: ["Bắt đầu miễn phí", "Lưu lịch sử sức khỏe", "Nâng cấp khi cần"],
  },
  recovery: {
    eyebrow: "Khôi phục",
    title: "Lấy lại quyền truy cập tài khoản.",
    copy: "Nhập email để nhận mã xác thực và đặt lại mật khẩu mới.",
    sideTitle: "Bảo vệ tài khoản của bạn",
    sideCopy: "Sau khi đổi mật khẩu, hãy đăng nhập lại để tiếp tục sử dụng MediMate AI.",
    points: ["Nhận mã xác thực", "Đặt mật khẩu mới", "Đăng nhập lại"],
  },
};

function AuthShell({ mode = "login", children }) {
  const content = authCopy[mode] ?? authCopy.login;

  return (
    <main className="landing-page auth-shell-page">
      <Navbar />
      <section className="auth-page">
        <div className="container auth-layout auth-layout-clean">
          <aside className="auth-side-panel">
            <a className="brand auth-brand" href="/">
              <span className="brand-mark">+</span>
              <span>MediMate AI</span>
            </a>
            <div>
              <p className="eyebrow">{content.eyebrow}</p>
              <h1>{content.sideTitle}</h1>
              <p>{content.sideCopy}</p>
            </div>
            <div className="auth-step-list">
              {content.points.map((point, index) => (
                <div key={point}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{point}</strong>
                </div>
              ))}
            </div>
          </aside>

          <div className="auth-card auth-card-clean">
            <div className="auth-card-header auth-card-header-clean">
              <div>
                <p className="eyebrow">{content.eyebrow}</p>
                <h2>{content.title}</h2>
                <p>{content.copy}</p>
              </div>
            </div>
            {children}
          </div>
        </div>
      </section>
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
      const response = await authApi.login(form);
      window.location.href = getPostLoginPath(response.data ?? response);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSuccess(credentialResponse) {
    const credential = credentialResponse?.credential;
    if (!credential) {
      setMessage({ type: "error", text: "Google chưa trả thông tin đăng nhập. Vui lòng thử lại." });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const response = await authApi.googleLogin(credential);
      window.location.href = getPostLoginPath(response.data ?? response);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  const loginContent = (
    <AuthShell mode="login">
      <form className="clean-form auth-form-clean" onSubmit={handleSubmit}>
        <ApiMessage message={message} />
        {GOOGLE_LOGIN_ENABLED && (
          <>
            <div className="google-login-wrap">
              <GoogleLogin
                ux_mode="popup"
                use_fedcm_for_button
                onSuccess={handleGoogleSuccess}
                onError={() => setMessage({ type: "error", text: "Không thể đăng nhập bằng Google. Vui lòng thử lại." })}
              />
            </div>
            <div className="auth-divider"><span>hoặc</span></div>
          </>
        )}
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
        <div className="auth-inline-row auth-link-row">
          <span>Thông tin đăng nhập chỉ được dùng để mở tài khoản của bạn.</span>
          <a href="/forgot-password">Quên mật khẩu?</a>
        </div>
        <button className="btn btn-primary auth-submit" type="submit" disabled={submitting}>
          {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
        <div className="auth-bottom-link">
          <span>Chưa có tài khoản?</span>
          <a href="/signup">Tạo tài khoản miễn phí</a>
        </div>
      </form>
    </AuthShell>
  );

  if (!GOOGLE_LOGIN_ENABLED) return loginContent;

  return (
    <GoogleOAuthProvider
      clientId={GOOGLE_CLIENT_ID}
      script_props={{
        async: true,
        defer: true,
        crossOrigin: "anonymous",
      }}
    >
      {loginContent}
    </GoogleOAuthProvider>
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
      setMessage({ type: "error", text: "Bạn cần đồng ý điều khoản sử dụng và lưu ý y tế." });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await authApi.register({
        ...form,
        gender: Number(form.gender),
        dateOfBirth: form.dateOfBirth || null,
      });
      window.location.href = getWorkspacePath(response.data ?? response);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell mode="signup">
      <form className="clean-form auth-form-clean" onSubmit={handleSubmit}>
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
          <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} required />
          <span>Tôi đồng ý với điều khoản sử dụng và hiểu MediMate AI không thay thế bác sĩ.</span>
        </label>

        <button className="btn btn-primary auth-submit" type="submit" disabled={submitting || !accepted}>
          {submitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
        </button>
        <div className="auth-bottom-link">
          <span>Đã có tài khoản?</span>
          <a href="/login">Đăng nhập</a>
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
      setMessage({ type: "success", text: response.message || "Nếu email hợp lệ, hướng dẫn khôi phục sẽ được gửi đến bạn." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell mode="recovery">
      <form className="clean-form auth-form-clean" onSubmit={handleSubmit}>
        <ApiMessage message={message} />
        <Field label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
        <button className="btn btn-primary auth-submit" type="submit" disabled={submitting}>
          {submitting ? "Đang gửi..." : "Gửi hướng dẫn"}
        </button>
        <div className="auth-bottom-link">
          <a href="/change-password">Tôi đã có mã xác thực</a>
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
    <AuthShell mode="recovery">
      <form className="clean-form auth-form-clean" onSubmit={handleSubmit}>
        <ApiMessage message={message} />
        <Field label="Email" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} required />
        <Field label="Mã xác thực" value={form.otp} onChange={(event) => update("otp", event.target.value)} required />
        <Field label="Mật khẩu mới" type="password" value={form.newPassword} onChange={(event) => update("newPassword", event.target.value)} required />
        <Field label="Nhập lại mật khẩu mới" type="password" value={form.confirmNewPassword} onChange={(event) => update("confirmNewPassword", event.target.value)} required />
        <button className="btn btn-primary auth-submit" type="submit" disabled={submitting}>
          {submitting ? "Đang đổi..." : "Đổi mật khẩu"}
        </button>
        <div className="auth-bottom-link">
          <a href="/forgot-password">Gửi lại mã</a>
          <a href="/login">Đăng nhập</a>
        </div>
      </form>
    </AuthShell>
  );
}
