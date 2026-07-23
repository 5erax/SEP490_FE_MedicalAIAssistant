import { useId, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { FileClock, LockKeyhole, ShieldCheck, UserRoundCheck } from "lucide-react";
import { useFeedback } from "../components/feedback/feedbackContext";
import { Navbar } from "../components/landing/Navbar";
import { navigate } from "../router/navigation";
import { getPostAuthDestination, getReturnToFromSearch, withReturnTo } from "../router/returnIntent";
import { authApi, clearStoredAuth, setStoredAuth } from "../services/api";
import { isGoogleOAuthEnabledForCurrentOrigin } from "../services/googleOAuthConfig";
import { findPatientProfileByUserId } from "../services/patientProfileSetup";
import { getWorkspacePath, hasAuthRole } from "../utils/roles";
import "../styles/auth-refresh.css";

function ApiMessage({ message }) {
  if (!message) return null;
  return (
    <div
      className={`api-message ${message.type}`}
      role={message.type === "error" ? "alert" : "status"}
      aria-live={message.type === "error" ? "assertive" : "polite"}
    >
      {message.text}
    </div>
  );
}

function getAuthSwitchPath(path) {
  return withReturnTo(path, getReturnToFromSearch());
}

function getUserId(authOrUser) {
  return authOrUser?.userId ?? authOrUser?.identityId ?? authOrUser?.id ?? authOrUser?.data?.userId ?? authOrUser?.data?.identityId ?? authOrUser?.data?.id ?? "";
}

function getDoctorInvitationLoginContext() {
  const context = window.history.state?.doctorInvitation;
  if (!context || context.expectedRole !== "doctor") return null;

  const email = typeof context.email === "string" ? context.email.trim() : "";
  return { email };
}

function clearNavigationState() {
  window.history.replaceState(null, "", window.location.href);
}

async function getVerifiedGoogleLoginDestination(authOrUser) {
  const destination = getPostAuthDestination(authOrUser);
  const destinationUrl = new URL(destination, window.location.origin);
  if (destinationUrl.pathname !== "/patient/profile/setup") return destination;

  let userId = getUserId(authOrUser);
  if (!userId) {
    const meResponse = await authApi.me();
    userId = getUserId(meResponse.data);
  }

  const existingProfile = await findPatientProfileByUserId(userId);
  if (!existingProfile) return destination;

  const nextAuth = {
    ...authOrUser,
    firstLogin: false,
    isFirstLogin: false,
    isProfileCompleted: true,
  };
  setStoredAuth(nextAuth);
  return getReturnToFromSearch() || getWorkspacePath(nextAuth);
}

async function refreshAuthRoles(authOrUser) {
  if (!authOrUser?.accessToken) return authOrUser;

  try {
    const meResponse = await authApi.me();
    const user = meResponse.data ?? {};
    const nextAuth = {
      ...authOrUser,
      userId: authOrUser.userId ?? user.userId ?? user.id,
      identityId: authOrUser.identityId ?? user.identityId,
      email: user.email ?? authOrUser.email,
      username: user.username ?? authOrUser.username,
      displayName: user.displayName ?? user.name ?? authOrUser.displayName,
      fullName: user.fullName ?? authOrUser.fullName,
      name: user.name ?? authOrUser.name,
      avatarUrl: user.avatarUrl ?? authOrUser.avatarUrl,
      avatar: user.avatar ?? authOrUser.avatar,
      picture: user.picture ?? authOrUser.picture,
      photoUrl: user.photoUrl ?? authOrUser.photoUrl,
      imageUrl: user.imageUrl ?? authOrUser.imageUrl,
      profilePictureUrl: user.profilePictureUrl ?? authOrUser.profilePictureUrl,
      roles: user.roles ?? authOrUser.roles,
      role: user.role ?? authOrUser.role,
      isProfileCompleted: user.isProfileCompleted ?? authOrUser.isProfileCompleted,
    };
    setStoredAuth(nextAuth);
    return nextAuth;
  } catch {
    return authOrUser;
  }
}

function rejectDoctorInvitationLogin(setMessage) {
  clearStoredAuth();
  clearNavigationState();
  setMessage({
    type: "error",
    text: "Tài khoản đăng nhập chưa được cấp quyền Bác sĩ. Vui lòng liên hệ quản trị viên để kiểm tra lời mời.",
  });
}

const authCopy = {
  login: {
    eyebrow: "Tài khoản MediMate",
    title: "Chào mừng bạn quay lại.",
    copy: "Đăng nhập để tiếp tục với hồ sơ, lịch sử phiên và các công cụ được cấp cho tài khoản của bạn.",
    sideEyebrow: "Không gian cá nhân",
    sideTitle: "Thông tin của bạn, ở đúng nơi bạn cần.",
    sideCopy: "Một điểm truy cập thống nhất để bạn tiếp tục những nội dung đã lưu trên MediMate.",
    points: [
      { label: "Hồ sơ sức khỏe được bảo vệ", icon: ShieldCheck },
      { label: "Lịch sử phiên trong một tài khoản", icon: FileClock },
      { label: "Quyền truy cập theo đúng vai trò", icon: UserRoundCheck },
    ],
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
  const isLogin = mode === "login";

  return (
    <main className={`landing-page auth-shell-page auth-mode-${mode}`}>
      <Navbar variant={isLogin ? "landing" : "default"} />
      <section className="auth-page">
        <div className="container auth-layout auth-layout-clean">
          <aside className="auth-side-panel">
            <a className="brand auth-brand" href="/">
              <span className="brand-mark" aria-hidden="true">
                {isLogin ? <img src="/logo.svg" alt="" width="36" height="36" /> : "+"}
              </span>
              <span>MediMate AI</span>
            </a>
            <div>
              <p className="eyebrow">{content.sideEyebrow ?? content.eyebrow}</p>
              <h1>{content.sideTitle}</h1>
              <p>{content.sideCopy}</p>
            </div>
            <div className="auth-step-list">
              {content.points.map((point, index) => (
                <div key={typeof point === "string" ? point : point.label}>
                  <span>
                    {typeof point === "string"
                      ? String(index + 1).padStart(2, "0")
                      : <point.icon size={19} strokeWidth={1.8} aria-hidden="true" />}
                  </span>
                  <strong>{typeof point === "string" ? point : point.label}</strong>
                </div>
              ))}
            </div>
            {isLogin && (
              <p className="auth-privacy-note">
                <LockKeyhole size={17} aria-hidden="true" />
                Thông tin đăng nhập được truyền qua kết nối bảo mật.
              </p>
            )}
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
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="clean-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} aria-describedby={hintId} {...props} />
      {hint && <small id={hintId}>{hint}</small>}
    </div>
  );
}

function SelectField({ label, children, ...props }) {
  const id = useId();
  return (
    <div className="clean-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} {...props}>{children}</select>
    </div>
  );
}

const PASSWORD_HINT = "Tối thiểu 8 ký tự, nên có chữ hoa, chữ thường, số và ký tự đặc biệt.";

export function LoginPage() {
  const { showToast } = useFeedback();
  const [invitationContext] = useState(getDoctorInvitationLoginContext);
  const [form, setForm] = useState({ email: invitationContext?.email || "", password: "" });
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const googleLoginEnabled = isGoogleOAuthEnabledForCurrentOrigin();

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await authApi.login(form);
      const authData = response.data ?? response;
      if (invitationContext && !hasAuthRole(authData, "doctor")) {
        rejectDoctorInvitationLogin(setMessage);
        return;
      }

      clearNavigationState();
      showToast({ type: "success", title: "Đăng nhập thành công", message: "Đang mở không gian phù hợp với tài khoản của bạn." });
      navigate(getPostAuthDestination(authData));
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
      const authData = await refreshAuthRoles(response.data ?? response);
      if (invitationContext && !hasAuthRole(authData, "doctor")) {
        rejectDoctorInvitationLogin(setMessage);
        return;
      }

      clearNavigationState();
      navigate(await getVerifiedGoogleLoginDestination(authData));
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
        {googleLoginEnabled ? (
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
        ) : (
          <p className="auth-provider-note" role="status">
            Đăng nhập Google đang tắt cho domain này. Bạn vẫn có thể đăng nhập bằng email và mật khẩu.
          </p>
        )}
        <Field
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          placeholder="you@example.com"
          autoComplete="email"
          spellCheck={false}
          required
        />
        <Field
          label="Mật khẩu"
          name="password"
          type="password"
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          placeholder="Nhập mật khẩu…"
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
          <a href={getAuthSwitchPath("/signup")}>Tạo tài khoản miễn phí</a>
        </div>
      </form>
    </AuthShell>
  );

  return loginContent;
}

export function SignupPage() {
  const { showToast } = useFeedback();
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
    if (form.password !== form.confirmPassword) {
      setMessage({ type: "error", text: "Mật khẩu nhập lại chưa khớp. Vui lòng kiểm tra lại." });
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
      showToast({ type: "success", title: "Tạo tài khoản thành công", message: "Đang mở workspace của bạn." });
      navigate(getPostAuthDestination(response.data ?? response));
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
          <Field label="Email" name="email" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} autoComplete="email" spellCheck={false} required />
          <Field label="Tên đăng nhập" name="userName" value={form.userName} onChange={(event) => update("userName", event.target.value)} autoComplete="username" spellCheck={false} required />
          <Field label="Tên hiển thị" name="displayName" value={form.displayName} onChange={(event) => update("displayName", event.target.value)} autoComplete="name" required />
          <Field label="Địa chỉ" name="address" value={form.address} onChange={(event) => update("address", event.target.value)} autoComplete="street-address" />
          <Field label="Mật khẩu" name="password" type="password" value={form.password} onChange={(event) => update("password", event.target.value)} autoComplete="new-password" hint={PASSWORD_HINT} required />
          <Field label="Nhập lại mật khẩu" name="confirmPassword" type="password" value={form.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} autoComplete="new-password" hint="Nhập lại đúng mật khẩu mới để tránh khóa nhầm tài khoản." required />
          <SelectField label="Giới tính" name="gender" value={form.gender} onChange={(event) => update("gender", event.target.value)}>
            <option value="1">Nam</option>
            <option value="2">Nữ</option>
          </SelectField>
          <Field label="Ngày sinh" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={(event) => update("dateOfBirth", event.target.value)} autoComplete="bday" />
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
          <a href={getAuthSwitchPath("/login")}>Đăng nhập</a>
        </div>
      </form>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const { showToast } = useFeedback();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await authApi.forgotPassword(email);
      const text = response.message || "Nếu email hợp lệ, hướng dẫn khôi phục sẽ được gửi đến bạn.";
      setMessage({ type: "success", text });
      showToast({ type: "success", title: "Đã gửi hướng dẫn", message: text });
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
  const { showToast } = useFeedback();
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
    if (form.newPassword !== form.confirmNewPassword) {
      setMessage({ type: "error", text: "Mật khẩu mới nhập lại chưa khớp." });
      setSubmitting(false);
      return;
    }
    try {
      const response = await authApi.changePassword(form);
      const text = response.message || "Đổi mật khẩu thành công. Bạn có thể đăng nhập lại.";
      setMessage({ type: "success", text });
      showToast({ type: "success", title: "Đã đổi mật khẩu", message: text });
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
        <Field label="Mật khẩu mới" type="password" value={form.newPassword} onChange={(event) => update("newPassword", event.target.value)} hint={PASSWORD_HINT} required />
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
