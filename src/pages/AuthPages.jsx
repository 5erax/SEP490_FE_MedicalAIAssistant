import { useId, useRef, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import {
  ClipboardCheck,
  FileClock,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRoundCheck,
  UserRoundPlus,
} from "lucide-react";
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
    eyebrow: "Tài khoản MediMate",
    title: "Tạo tài khoản của bạn.",
    copy: "Thiết lập thông tin đăng nhập để lưu hồ sơ, xem lại lịch sử phiên và sử dụng các công cụ dành cho tài khoản.",
    sideEyebrow: "Bắt đầu với MediMate",
    sideTitle: "Thiết lập tài khoản rõ ràng, từng bước.",
    sideCopy: "Cung cấp thông tin cơ bản trước, sau đó hoàn thiện hồ sơ sức khỏe trong không gian cá nhân.",
    points: [
      { label: "Tạo thông tin đăng nhập", icon: UserRoundPlus },
      { label: "Hoàn thiện hồ sơ sau đăng ký", icon: ClipboardCheck },
      { label: "Xem lại phiên trên cùng tài khoản", icon: FileClock },
    ],
  },
  forgot: {
    eyebrow: "Bảo mật tài khoản",
    title: "Khôi phục quyền truy cập.",
    copy: "Nhập email gắn với tài khoản. Nếu thông tin hợp lệ, hệ thống sẽ gửi hướng dẫn khôi phục cho bạn.",
    sideEyebrow: "Khôi phục tài khoản",
    sideTitle: "Lấy lại tài khoản theo cách an toàn.",
    sideCopy: "Thực hiện từng bước để xác minh tài khoản mà không làm lộ thông tin đăng nhập.",
    privacyNote: "Thông báo gửi đi không xác nhận một email có tồn tại trên hệ thống hay không.",
    points: [
      { label: "Nhập email của tài khoản", icon: Mail },
      { label: "Nhận mã hoặc hướng dẫn xác thực", icon: KeyRound },
      { label: "Đặt lại mật khẩu ở bước tiếp theo", icon: LockKeyhole },
    ],
  },
  reset: {
    eyebrow: "Bảo mật tài khoản",
    title: "Đặt lại mật khẩu.",
    copy: "Nhập email, mã xác thực đã nhận và mật khẩu mới để hoàn tất khôi phục tài khoản.",
    sideEyebrow: "Bước xác thực",
    sideTitle: "Hoàn tất khôi phục tài khoản.",
    sideCopy: "Mã xác thực giúp hệ thống kiểm tra yêu cầu trước khi cập nhật mật khẩu mới.",
    privacyNote: "Không chia sẻ mã xác thực hoặc mật khẩu mới với bất kỳ ai.",
    points: [
      { label: "Xác nhận email của tài khoản", icon: Mail },
      { label: "Nhập mã xác thực đã nhận", icon: KeyRound },
      { label: "Tạo mật khẩu mới", icon: LockKeyhole },
    ],
  },
};

function AuthShell({ mode = "login", children }) {
  const content = authCopy[mode] ?? authCopy.login;
  const isLogin = mode === "login";
  const usesClinicalAuth = ["login", "signup", "forgot", "reset"].includes(mode);

  return (
    <main className={`landing-page auth-shell-page auth-mode-${mode}${usesClinicalAuth ? " auth-mode-clinical" : ""}`}>
      <Navbar variant={usesClinicalAuth ? "landing" : "default"} />
      <section className="auth-page">
        <div className="container auth-layout auth-layout-clean">
          <aside className="auth-side-panel">
            <a className="brand auth-brand" href="/">
              <span className="brand-mark" aria-hidden="true">
                {usesClinicalAuth ? <img src="/logo.svg" alt="" width="36" height="36" /> : "+"}
              </span>
              <span>MediMate AI</span>
            </a>
            <div>
              <p className="eyebrow">{content.sideEyebrow ?? content.eyebrow}</p>
              <h2 className="auth-side-title">{content.sideTitle}</h2>
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
            {usesClinicalAuth && (
              <p className="auth-privacy-note">
                {isLogin
                  ? <LockKeyhole size={17} aria-hidden="true" />
                  : <ShieldCheck size={17} aria-hidden="true" />}
                {isLogin
                  ? "Thông tin đăng nhập được truyền qua kết nối bảo mật."
                  : content.privacyNote ?? "Chỉ cung cấp thông tin cần thiết để tạo và bảo vệ tài khoản."}
              </p>
            )}
          </aside>

          <div className="auth-card auth-card-clean">
            <div className="auth-card-header auth-card-header-clean">
              <div>
                <p className="eyebrow">{content.eyebrow}</p>
                <h1 className="auth-card-title">{content.title}</h1>
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

function Field({ label, hint, error, inputRef, ...props }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="clean-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        ref={inputRef}
        aria-describedby={describedBy}
        aria-invalid={error ? "true" : undefined}
        {...props}
      />
      {hint && <small id={hintId}>{hint}</small>}
      {error && <small className="clean-field-error" id={errorId}>{error}</small>}
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
      const authData = await refreshAuthRoles(response.data ?? response);
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
          {submitting ? "Đang đăng nhập…" : "Đăng nhập"}
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
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const confirmPasswordRef = useRef(null);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: "" }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!accepted) {
      setMessage({
        type: "error",
        text: "Bạn cần xác nhận đã đọc thông tin quyền riêng tư và tuyên bố miễn trừ y tế.",
      });
      return;
    }
    if (form.password !== form.confirmPassword) {
      setMessage(null);
      setFieldErrors({ confirmPassword: "Mật khẩu nhập lại chưa khớp. Vui lòng kiểm tra lại." });
      window.requestAnimationFrame(() => confirmPasswordRef.current?.focus());
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
        <fieldset className="auth-field-group">
          <legend>Thông tin tài khoản</legend>
          <p>Dùng để nhận diện tài khoản và hiển thị trong không gian cá nhân.</p>
          <div className="form-two-cols">
            <Field label="Email" name="email" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} autoComplete="email" spellCheck={false} required />
            <Field label="Tên đăng nhập" name="userName" value={form.userName} onChange={(event) => update("userName", event.target.value)} autoComplete="username" spellCheck={false} required />
            <Field label="Tên hiển thị" name="displayName" value={form.displayName} onChange={(event) => update("displayName", event.target.value)} autoComplete="name" required />
            <Field label="Địa chỉ" name="address" value={form.address} onChange={(event) => update("address", event.target.value)} autoComplete="street-address" />
          </div>
        </fieldset>

        <fieldset className="auth-field-group">
          <legend>Bảo mật và thông tin cơ bản</legend>
          <p>Mật khẩu bảo vệ tài khoản; ngày sinh và giới tính có thể được bổ sung hoặc kiểm tra lại trong hồ sơ.</p>
          <div className="form-two-cols">
            <Field label="Mật khẩu" name="password" type="password" value={form.password} onChange={(event) => update("password", event.target.value)} autoComplete="new-password" hint={PASSWORD_HINT} required />
            <Field label="Nhập lại mật khẩu" name="confirmPassword" type="password" value={form.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} autoComplete="new-password" hint="Nhập lại đúng mật khẩu mới để tránh khóa nhầm tài khoản." error={fieldErrors.confirmPassword} inputRef={confirmPasswordRef} required />
            <SelectField label="Giới tính" name="gender" value={form.gender} onChange={(event) => update("gender", event.target.value)}>
              <option value="1">Nam</option>
              <option value="2">Nữ</option>
            </SelectField>
            <Field label="Ngày sinh" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={(event) => update("dateOfBirth", event.target.value)} autoComplete="bday" />
          </div>
        </fieldset>

        <label className="api-check auth-consent">
          <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} required />
          <span>
            Tôi đã đọc{" "}
            <a href="/privacy">thông tin quyền riêng tư</a>
            {" "}và hiểu nội dung MediMate chỉ mang tính tham khảo theo{" "}
            <a href="/medical-disclaimer">tuyên bố miễn trừ y tế</a>.
          </span>
        </label>

        <button className="btn btn-primary auth-submit" type="submit" disabled={submitting}>
          {submitting ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
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
    <AuthShell mode="forgot">
      <form className="clean-form auth-form-clean" onSubmit={handleSubmit}>
        <ApiMessage message={message} />
        <Field
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          spellCheck={false}
          required
        />
        <div className="auth-recovery-note">
          <KeyRound size={18} aria-hidden="true" />
          <p>Sau khi nhận hướng dẫn, dùng mã xác thực ở bước đặt lại mật khẩu.</p>
        </div>
        <button className="btn btn-primary auth-submit" type="submit" disabled={submitting}>
          {submitting ? "Đang gửi…" : "Gửi hướng dẫn"}
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
  const confirmPasswordRef = useRef(null);

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
      window.requestAnimationFrame(() => confirmPasswordRef.current?.focus());
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

  const passwordMismatch = message?.type === "error"
    && message.text === "Mật khẩu mới nhập lại chưa khớp.";

  return (
    <AuthShell mode="reset">
      <form className="clean-form auth-form-clean" onSubmit={handleSubmit}>
        <ApiMessage message={message} />
        <fieldset className="auth-field-group">
          <legend>Xác minh tài khoản</legend>
          <p>Dùng email của tài khoản và mã xác thực bạn đã nhận.</p>
          <div className="auth-reset-fields">
            <Field
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              spellCheck={false}
              required
            />
            <Field
              label="Mã xác thực"
              name="otp"
              value={form.otp}
              onChange={(event) => update("otp", event.target.value)}
              autoComplete="one-time-code"
              required
            />
          </div>
        </fieldset>

        <fieldset className="auth-field-group">
          <legend>Mật khẩu mới</legend>
          <p>Tạo mật khẩu mới và nhập lại chính xác để xác nhận.</p>
          <div className="auth-reset-fields">
            <Field
              label="Mật khẩu mới"
              name="newPassword"
              type="password"
              value={form.newPassword}
              onChange={(event) => update("newPassword", event.target.value)}
              autoComplete="new-password"
              hint={PASSWORD_HINT}
              required
            />
            <Field
              label="Nhập lại mật khẩu mới"
              name="confirmNewPassword"
              type="password"
              value={form.confirmNewPassword}
              onChange={(event) => update("confirmNewPassword", event.target.value)}
              autoComplete="new-password"
              inputRef={confirmPasswordRef}
              error={passwordMismatch ? message.text : undefined}
              required
            />
          </div>
        </fieldset>
        <button className="btn btn-primary auth-submit" type="submit" disabled={submitting}>
          {submitting ? "Đang đổi…" : "Đổi mật khẩu"}
        </button>
        <div className="auth-bottom-link">
          <a href="/forgot-password">Gửi lại mã</a>
          <a href="/login">Đăng nhập</a>
        </div>
      </form>
    </AuthShell>
  );
}
