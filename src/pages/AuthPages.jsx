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
import {
  getPostAuthDestination,
  getReturnToFromSearch,
  withReturnTo,
} from "../router/returnIntent";
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
  return (
    authOrUser?.userId ??
    authOrUser?.identityId ??
    authOrUser?.id ??
    authOrUser?.data?.userId ??
    authOrUser?.data?.identityId ??
    authOrUser?.data?.id ??
    ""
  );
}

function getDoctorInvitationLoginContext() {
  const context = window.history.state?.doctorInvitation;
  if (!context || context.expectedRole !== "doctor") return null;

  const email =
    typeof context.email === "string" ? context.email.trim() : "";

  return { email };
}

function clearNavigationState() {
  window.history.replaceState(null, "", window.location.href);
}

async function getVerifiedGoogleLoginDestination(authOrUser) {
  const destination = getPostAuthDestination(authOrUser);
  const destinationUrl = new URL(destination, window.location.origin);

  if (destinationUrl.pathname !== "/patient/profile/setup") {
    return destination;
  }

  let userId = getUserId(authOrUser);

  if (!userId) {
    const meResponse = await authApi.me();
    userId = getUserId(meResponse.data);
  }

  const existingProfile = await findPatientProfileByUserId(userId);

  if (!existingProfile) {
    return destination;
  }

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
      displayName:
        user.displayName ??
        user.name ??
        authOrUser.displayName,
      fullName: user.fullName ?? authOrUser.fullName,
      name: user.name ?? authOrUser.name,
      avatarUrl: user.avatarUrl ?? authOrUser.avatarUrl,
      avatar: user.avatar ?? authOrUser.avatar,
      picture: user.picture ?? authOrUser.picture,
      photoUrl: user.photoUrl ?? authOrUser.photoUrl,
      imageUrl: user.imageUrl ?? authOrUser.imageUrl,
      profilePictureUrl:
        user.profilePictureUrl ?? authOrUser.profilePictureUrl,
      roles: user.roles ?? authOrUser.roles,
      role: user.role ?? authOrUser.role,
      isProfileCompleted:
        user.isProfileCompleted ?? authOrUser.isProfileCompleted,
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
    text:
      "Tài khoản đăng nhập chưa được cấp quyền Bác sĩ. " +
      "Vui lòng liên hệ quản trị viên để kiểm tra lời mời.",
  });
}

const authCopy = {
  login: {
    eyebrow: "Tài khoản MediMate",
    title: "Chào mừng bạn quay lại.",
    copy:
      "Đăng nhập để tiếp tục với hồ sơ, lịch sử phiên và các công cụ " +
      "được cấp cho tài khoản của bạn.",
    sideEyebrow: "Không gian cá nhân",
    sideTitle: "Thông tin của bạn, ở đúng nơi bạn cần.",
    sideCopy:
      "Một điểm truy cập thống nhất để bạn tiếp tục những nội dung " +
      "đã lưu trên MediMate.",
    points: [
      { label: "Hồ sơ sức khỏe được bảo vệ", icon: ShieldCheck },
      { label: "Lịch sử phiên trong một tài khoản", icon: FileClock },
      { label: "Quyền truy cập theo đúng vai trò", icon: UserRoundCheck },
    ],
  },
  signup: {
    eyebrow: "Tài khoản MediMate",
    title: "Tạo tài khoản của bạn.",
    copy:
      "Thiết lập thông tin đăng nhập để lưu hồ sơ, xem lại lịch sử " +
      "phiên và sử dụng các công cụ dành cho tài khoản.",
    sideEyebrow: "Bắt đầu với MediMate",
    sideTitle: "Thiết lập tài khoản rõ ràng, từng bước.",
    sideCopy:
      "Cung cấp thông tin cơ bản trước, sau đó hoàn thiện hồ sơ sức khỏe " +
      "trong không gian cá nhân.",
    points: [
      { label: "Tạo thông tin đăng nhập", icon: UserRoundPlus },
      { label: "Hoàn thiện hồ sơ sau đăng ký", icon: ClipboardCheck },
      { label: "Xem lại phiên trên cùng tài khoản", icon: FileClock },
    ],
  },
  forgot: {
    eyebrow: "Quên mật khẩu",
    title: "Đặt lại mật khẩu",
    copy: "Nhập email đã đăng ký với MediMate để nhận mã xác thực.",
    sideEyebrow: "Khôi phục mật khẩu",
    sideTitle: "Đặt lại mật khẩu.",
    sideCopy: "Nhận mã xác thực qua email và tạo mật khẩu mới.",
    privacyNote:
      "Thông báo không xác nhận email có tồn tại trong hệ thống hay không.",
    points: [
      { label: "Nhập email đã đăng ký", icon: Mail },
      { label: "Nhận mã xác thực", icon: KeyRound },
      { label: "Tạo mật khẩu mới", icon: LockKeyhole },
    ],
  },
  reset: {
    eyebrow: "Bảo mật tài khoản",
    title: "Đặt lại mật khẩu.",
    copy:
      "Nhập email, mã xác thực đã nhận và mật khẩu mới để hoàn tất " +
      "khôi phục tài khoản.",
    sideEyebrow: "Bước xác thực",
    sideTitle: "Hoàn tất khôi phục tài khoản.",
    sideCopy:
      "Mã xác thực giúp hệ thống kiểm tra yêu cầu trước khi cập nhật " +
      "mật khẩu mới.",
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
  const usesClinicalAuth = [
    "login",
    "signup",
    "forgot",
    "reset",
  ].includes(mode);

  return (
    <main
      className={
        `landing-page auth-shell-page auth-mode-${mode}` +
        `${usesClinicalAuth ? " auth-mode-clinical" : ""}`
      }
    >
      <Navbar variant={usesClinicalAuth ? "landing" : "default"} />

      <section className="auth-page">
        <div className="container auth-layout auth-layout-clean">
          <aside className="auth-side-panel">
            <a className="brand auth-brand" href="/">
              <span className="brand-mark" aria-hidden="true">
                {usesClinicalAuth ? (
                  <img
                    src="/logo.svg"
                    alt=""
                    width="36"
                    height="36"
                  />
                ) : (
                  "+"
                )}
              </span>
              <span>MediMate AI</span>
            </a>

            <div>
              <p className="eyebrow">
                {content.sideEyebrow ?? content.eyebrow}
              </p>
              <h2 className="auth-side-title">
                {content.sideTitle}
              </h2>
              <p>{content.sideCopy}</p>
            </div>

            <div className="auth-step-list">
              {content.points.map((point, index) => (
                <div
                  key={
                    typeof point === "string"
                      ? point
                      : point.label
                  }
                >
                  <span>
                    {typeof point === "string"
                      ? String(index + 1).padStart(2, "0")
                      : (
                          <point.icon
                            size={19}
                            strokeWidth={1.8}
                            aria-hidden="true"
                          />
                        )}
                  </span>
                  <strong>
                    {typeof point === "string"
                      ? point
                      : point.label}
                  </strong>
                </div>
              ))}
            </div>

            {usesClinicalAuth && (
              <p className="auth-privacy-note">
                {isLogin ? (
                  <LockKeyhole size={17} aria-hidden="true" />
                ) : (
                  <ShieldCheck size={17} aria-hidden="true" />
                )}

                {isLogin
                  ? "Thông tin đăng nhập được truyền qua kết nối bảo mật."
                  : content.privacyNote ??
                    "Chỉ cung cấp thông tin cần thiết để tạo và bảo vệ tài khoản."}
              </p>
            )}
          </aside>

          <div className="auth-card auth-card-clean">
            <div className="auth-card-header auth-card-header-clean">
              <div>
                <p className="eyebrow">{content.eyebrow}</p>
                <h1 className="auth-card-title">
                  {content.title}
                </h1>
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

function Field({
  label,
  hint,
  error,
  inputRef,
  required = false,
  ...props
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy =
    [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`clean-field${error ? " has-error" : ""}`}>
      <label htmlFor={id}>
        <span>{label}</span>
        {required && (
          <span className="field-required" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <input
        id={id}
        ref={inputRef}
        required={required}
        aria-describedby={describedBy}
        aria-invalid={error ? "true" : undefined}
        {...props}
      />
      {hint && !error && <small id={hintId}>{hint}</small>}
      {error && (
        <small
          className="clean-field-error"
          id={errorId}
          role="alert"
        >
          {error}
        </small>
      )}
    </div>
  );
}

function SelectField({
  label,
  children,
  required = false,
  error,
  ...props
}) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={`clean-field${error ? " has-error" : ""}`}>
      <label htmlFor={id}>
        <span>{label}</span>
        {required && (
          <span className="field-required" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <select
        id={id}
        required={required}
        aria-describedby={errorId}
        aria-invalid={error ? "true" : undefined}
        {...props}
      >
        {children}
      </select>
      {error && (
        <small
          className="clean-field-error"
          id={errorId}
          role="alert"
        >
          {error}
        </small>
      )}
    </div>
  );
}

const PASSWORD_HINT =
  "Tối thiểu 8 ký tự, nên có chữ hoa, chữ thường, số và ký tự đặc biệt.";

const MIN_SIGNUP_AGE = 16;
const MAX_REASONABLE_AGE = 120;

function formatDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getEarliestBirthDateValue(today = new Date()) {
  const earliest = new Date(
    today.getFullYear() - MAX_REASONABLE_AGE,
    today.getMonth(),
    today.getDate(),
  );

  return formatDateInputValue(earliest);
}

function getLatestBirthDateValue(today = new Date()) {
  const latest = new Date(
    today.getFullYear() - MIN_SIGNUP_AGE,
    today.getMonth(),
    today.getDate(),
  );

  return formatDateInputValue(latest);
}

function isValidGmailAddress(value) {
  return /^[^\s@]+@gmail\.com$/i.test(
    String(value ?? "").trim(),
  );
}

function parseDateInputValue(value) {
  if (!value) return null;

  const parts = value.split("-").map(Number);
  if (parts.length !== 3) return null;

  const [year, month, day] = parts;

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function calculateAge(dateOfBirth, today = new Date()) {
  let age =
    today.getFullYear() - dateOfBirth.getFullYear();

  const hasNotHadBirthday =
    today.getMonth() < dateOfBirth.getMonth() ||
    (
      today.getMonth() === dateOfBirth.getMonth() &&
      today.getDate() < dateOfBirth.getDate()
    );

  if (hasNotHadBirthday) {
    age -= 1;
  }

  return age;
}

function validateDateOfBirth(value, today = new Date()) {
  if (!value) {
    return "Vui lòng nhập ngày sinh.";
  }

  const dateOfBirth = parseDateInputValue(value);

  if (!dateOfBirth) {
    return "Ngày sinh không hợp lệ. Vui lòng kiểm tra lại.";
  }

  if (dateOfBirth > today) {
    return "Ngày sinh không thể nằm trong tương lai.";
  }

  const age = calculateAge(dateOfBirth, today);

  if (age < MIN_SIGNUP_AGE) {
    return `Bạn phải đủ ${MIN_SIGNUP_AGE} tuổi để đăng ký tài khoản.`;
  }

  if (age > MAX_REASONABLE_AGE) {
    return "Ngày sinh không hợp lý. Vui lòng kiểm tra lại.";
  }

  return "";
}

function validateSignupForm(form, accepted) {
  const errors = {};

  if (!form.email.trim()) {
    errors.email = "Vui lòng nhập email.";
  } else if (!isValidGmailAddress(form.email)) {
    errors.email =
      "Vui lòng sử dụng địa chỉ Gmail có dạng tenban@gmail.com.";
  }

  if (!form.userName.trim()) {
    errors.userName = "Vui lòng nhập tên đăng nhập.";
  }

  if (!form.password) {
    errors.password = "Vui lòng nhập mật khẩu.";
  } else if (form.password.length < 8) {
    errors.password = "Mật khẩu phải có ít nhất 8 ký tự.";
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = "Vui lòng nhập lại mật khẩu.";
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword =
      "Mật khẩu nhập lại chưa khớp. Vui lòng kiểm tra lại.";
  }

  if (!form.gender) {
    errors.gender = "Vui lòng chọn giới tính.";
  }

  const dateOfBirthError = validateDateOfBirth(
    form.dateOfBirth,
  );
  if (dateOfBirthError) {
    errors.dateOfBirth = dateOfBirthError;
  }

  if (!accepted) {
    errors.accepted =
      "Vui lòng xác nhận thông tin quyền riêng tư và tuyên bố miễn trừ y tế.";
  }

  return errors;
}

export function LoginPage() {
  const { showToast } = useFeedback();
  const [invitationContext] = useState(
    getDoctorInvitationLoginContext,
  );
  const [form, setForm] = useState({
    email: invitationContext?.email || "",
    password: "",
  });
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const googleLoginEnabled =
    isGoogleOAuthEnabledForCurrentOrigin();

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const response = await authApi.login(form);
      const authData = await refreshAuthRoles(
        response.data ?? response,
      );

      if (
        invitationContext &&
        !hasAuthRole(authData, "doctor")
      ) {
        rejectDoctorInvitationLogin(setMessage);
        return;
      }

      clearNavigationState();

      showToast({
        type: "success",
        title: "Đăng nhập thành công",
        message:
          "Đang mở không gian phù hợp với tài khoản của bạn.",
      });

      navigate(getPostAuthDestination(authData));
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSuccess(credentialResponse) {
    const credential = credentialResponse?.credential;

    if (!credential) {
      setMessage({
        type: "error",
        text:
          "Google chưa trả thông tin đăng nhập. Vui lòng thử lại.",
      });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const response = await authApi.googleLogin(credential);
      const authData = await refreshAuthRoles(
        response.data ?? response,
      );

      if (
        invitationContext &&
        !hasAuthRole(authData, "doctor")
      ) {
        rejectDoctorInvitationLogin(setMessage);
        return;
      }

      clearNavigationState();

      navigate(
        await getVerifiedGoogleLoginDestination(authData),
      );
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const loginContent = (
    <AuthShell mode="login">
      <form
        className="clean-form auth-form-clean"
        onSubmit={handleSubmit}
      >
        <ApiMessage message={message} />

        {googleLoginEnabled ? (
          <>
            <div className="google-login-wrap">
              <GoogleLogin
                ux_mode="popup"
                use_fedcm_for_button
                onSuccess={handleGoogleSuccess}
                onError={() =>
                  setMessage({
                    type: "error",
                    text:
                      "Không thể đăng nhập bằng Google. Vui lòng thử lại.",
                  })
                }
              />
            </div>
            <div className="auth-divider">
              <span>hoặc</span>
            </div>
          </>
        ) : (
          <p
            className="auth-provider-note"
            role="status"
          >
            Đăng nhập Google đang tắt cho domain này.
            Bạn vẫn có thể đăng nhập bằng email và mật khẩu.
          </p>
        )}

        <Field
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={(event) =>
            setForm({
              ...form,
              email: event.target.value,
            })
          }
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
          onChange={(event) =>
            setForm({
              ...form,
              password: event.target.value,
            })
          }
          placeholder="Nhập mật khẩu…"
          autoComplete="current-password"
          required
        />

        <div className="auth-inline-row auth-link-row">
          <span>
            Thông tin đăng nhập chỉ được dùng để mở tài khoản
            của bạn.
          </span>
          <a href="/forgot-password">
            Quên mật khẩu?
          </a>
        </div>

        <button
          className="btn btn-primary auth-submit"
          type="submit"
          disabled={submitting}
        >
          {submitting
            ? "Đang đăng nhập…"
            : "Đăng nhập"}
        </button>

        <div className="auth-bottom-link">
          <span>Chưa có tài khoản?</span>
          <a href={getAuthSwitchPath("/signup")}>
            Tạo tài khoản miễn phí
          </a>
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
    otp: "",
  });
  const [accepted, setAccepted] = useState(false);
  const [message, setMessage] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [otpRequested, setOtpRequested] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const signupFormRef = useRef(null);
  const today = new Date();
  const earliestBirthDateValue =
    getEarliestBirthDateValue(today);
  const latestBirthDateValue =
    getLatestBirthDateValue(today);

  function update(key, value) {
    const emailChangedAfterOtp = key === "email" && otpRequested;

    setForm((current) => ({
      ...current,
      [key]: value,
      ...(emailChangedAfterOtp ? { otp: "" } : {}),
    }));

    setFieldErrors((current) => ({
      ...current,
      [key]: "",
    }));

    if (emailChangedAfterOtp) {
      setOtpRequested(false);
    }
  }

  function updateDateOfBirth(value) {
    setForm((current) => ({
      ...current,
      dateOfBirth: value,
    }));

    setFieldErrors((current) => ({
      ...current,
      dateOfBirth: "",
    }));
  }

  function focusFirstSignupError(errors) {
    const order = [
      "email",
      "userName",
      "password",
      "confirmPassword",
      "gender",
      "dateOfBirth",
      "accepted",
    ];

    const firstField = order.find((name) => errors[name]);
    if (!firstField) return;

    window.requestAnimationFrame(() => {
      signupFormRef.current
        ?.querySelector(`[name="${firstField}"]`)
        ?.focus();
    });
  }

  async function sendOtp() {
    setSendingOtp(true);
    setMessage(null);

    try {
      const email = form.email.trim().toLowerCase();
      const response = await authApi.sendRegisterOtp(email);
      const text = response.message || `Đã gửi mã xác thực đến ${email}.`;

      setOtpRequested(true);
      setMessage({ type: "success", text });
      showToast({
        type: "success",
        title: "Đã gửi mã xác thực",
        message: text,
      });

      window.requestAnimationFrame(() => {
        signupFormRef.current
          ?.querySelector('[name="otp"]')
          ?.focus();
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message,
      });
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const errors = validateSignupForm(form, accepted);

    if (Object.keys(errors).length > 0) {
      setMessage(null);
      setFieldErrors(errors);
      focusFirstSignupError(errors);
      return;
    }

    if (!otpRequested) {
      await sendOtp();
      return;
    }

    if (!form.otp.trim()) {
      setMessage(null);
      setFieldErrors((current) => ({
        ...current,
        otp: "Vui lòng nhập mã xác thực.",
      }));
      window.requestAnimationFrame(() => {
        signupFormRef.current
          ?.querySelector('[name="otp"]')
          ?.focus();
      });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const response = await authApi.register({
        ...form,
        email: form.email.trim().toLowerCase(),
        gender: Number(form.gender),
        dateOfBirth: form.dateOfBirth,
        otp: form.otp.trim(),
      });

      showToast({
        type: "success",
        title: "Tạo tài khoản thành công",
        message: "Đang mở workspace của bạn.",
      });

      navigate(
        getPostAuthDestination(response.data ?? response),
      );
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell mode="signup">
      <form
        ref={signupFormRef}
        className="clean-form auth-form-clean"
        onSubmit={handleSubmit}
        noValidate
      >
        <ApiMessage message={message} />

        <fieldset className="auth-field-group">
          <legend>Thông tin tài khoản</legend>
          <p>
            Thông tin dùng để đăng nhập và nhận diện tài khoản.
          </p>

          <div className="form-two-cols">
            <Field
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={(event) =>
                update("email", event.target.value)
              }
              onBlur={(event) => {
                const value = event.currentTarget.value.trim();

                setFieldErrors((current) => ({
                  ...current,
                  email: !value
                    ? "Vui lòng nhập email."
                    : isValidGmailAddress(value)
                      ? ""
                      : "Vui lòng sử dụng địa chỉ Gmail có dạng tenban@gmail.com.",
                }));
              }}
              placeholder="tenban@gmail.com"
              autoComplete="email"
              inputMode="email"
              spellCheck={false}
              error={fieldErrors.email}
              required
            />

            <Field
              label="Tên đăng nhập"
              name="userName"
              value={form.userName}
              onChange={(event) =>
                update("userName", event.target.value)
              }
              autoComplete="username"
              spellCheck={false}
              error={fieldErrors.userName}
              required
            />

            <Field
              label="Tên hiển thị"
              name="displayName"
              value={form.displayName}
              onChange={(event) =>
                update("displayName", event.target.value)
              }
              autoComplete="name"
            />

            <Field
              label="Địa chỉ"
              name="address"
              value={form.address}
              onChange={(event) =>
                update("address", event.target.value)
              }
              autoComplete="street-address"
            />
          </div>

          {otpRequested && (
            <div className="auth-otp-row">
              <Field
                label="Mã xác thực"
                name="otp"
                value={form.otp}
                onChange={(event) =>
                  update("otp", event.target.value)
                }
                autoComplete="one-time-code"
                inputMode="numeric"
                hint={`Mã đã được gửi đến ${form.email.trim()}.`}
                error={fieldErrors.otp}
                required
              />
              <button
                className="btn btn-ghost btn-small auth-otp-resend"
                type="button"
                onClick={sendOtp}
                disabled={sendingOtp}
              >
                {sendingOtp ? "Đang gửi lại…" : "Gửi lại mã"}
              </button>
            </div>
          )}
        </fieldset>

        <fieldset className="auth-field-group">
          <legend>Bảo mật và thông tin cơ bản</legend>
          <p>
            Thiết lập mật khẩu và cung cấp thông tin cơ bản
            để hoàn tất tài khoản.
          </p>

          <div className="form-two-cols">
            <Field
              label="Mật khẩu"
              name="password"
              type="password"
              value={form.password}
              onChange={(event) =>
                update("password", event.target.value)
              }
              autoComplete="new-password"
              hint={PASSWORD_HINT}
              error={fieldErrors.password}
              required
            />

            <Field
              label="Nhập lại mật khẩu"
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={(event) =>
                update(
                  "confirmPassword",
                  event.target.value,
                )
              }
              autoComplete="new-password"
              hint="Nhập lại đúng mật khẩu mới để tránh khóa nhầm tài khoản."
              error={fieldErrors.confirmPassword}
              required
            />

            <SelectField
              label="Giới tính"
              name="gender"
              value={form.gender}
              required
              error={fieldErrors.gender}
              onChange={(event) =>
                update("gender", event.target.value)
              }
            >
              <option value="1">Nam</option>
              <option value="2">Nữ</option>
            </SelectField>

            <Field
              label="Ngày sinh"
              name="dateOfBirth"
              type="date"
              value={form.dateOfBirth}
              onChange={(event) =>
                updateDateOfBirth(event.target.value)
              }
              onBlur={(event) => {
                const error = validateDateOfBirth(
                  event.currentTarget.value,
                );

                setFieldErrors((current) => ({
                  ...current,
                  dateOfBirth: error,
                }));
              }}
              min={earliestBirthDateValue}
              max={latestBirthDateValue}
              autoComplete="bday"
              error={fieldErrors.dateOfBirth}
              required
            />
          </div>
        </fieldset>

        <div
          className={
            `auth-consent-wrap${
              fieldErrors.accepted ? " has-error" : ""
            }`
          }
        >
          <label className="api-check auth-consent">
            <input
              name="accepted"
              type="checkbox"
              checked={accepted}
              onChange={(event) => {
                setAccepted(event.target.checked);
                setFieldErrors((current) => ({
                  ...current,
                  accepted: "",
                }));
              }}
              required
            />

            <span>
              Tôi đã đọc{" "}
              <a href="/privacy">
                thông tin quyền riêng tư
              </a>
              {" "}và hiểu nội dung MediMate chỉ mang tính
              tham khảo theo{" "}
              <a href="/medical-disclaimer">
                tuyên bố miễn trừ y tế
              </a>.
            </span>
          </label>

          {fieldErrors.accepted && (
            <small
              className="auth-consent-error"
              role="alert"
            >
              {fieldErrors.accepted}
            </small>
          )}
        </div>

        <button
          className="btn btn-primary auth-submit"
          type="submit"
          disabled={submitting || sendingOtp}
        >
          {submitting
            ? "Đang tạo tài khoản…"
            : sendingOtp
              ? "Đang gửi mã…"
              : otpRequested
                ? "Xác nhận và tạo tài khoản"
                : "Gửi mã xác thực"}
        </button>

        <div className="auth-bottom-link">
          <span>Đã có tài khoản?</span>
          <a href={getAuthSwitchPath("/login")}>
            Đăng nhập
          </a>
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

    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setMessage({
        type: "error",
        text: "Vui lòng nhập địa chỉ email.",
      });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      await authApi.forgotPassword(normalizedEmail);

      const successMessage =
        "Nếu email này tồn tại trong hệ thống, mã xác thực đã được gửi.";

      setMessage({
        type: "success",
        text: successMessage,
      });

      showToast({
        type: "success",
        title: "Đã gửi yêu cầu",
        message: successMessage,
      });
    } catch {
      setMessage({
        type: "error",
        text:
          "Chưa thể gửi mã xác thực. Vui lòng thử lại sau.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell mode="forgot">
      <form
        className="clean-form auth-form-clean auth-forgot-form"
        onSubmit={handleSubmit}
        aria-busy={submitting}
      >
        <ApiMessage message={message} />

        <Field
          label="Địa chỉ email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setMessage(null);
          }}
          placeholder="tenban@example.com"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          hint="Mã xác thực sẽ được gửi đến địa chỉ email này."
          disabled={submitting}
          required
        />

        <button
          className="btn btn-primary auth-submit"
          type="submit"
          disabled={submitting}
        >
          {submitting
            ? "Đang gửi mã…"
            : "Gửi mã xác thực"}
        </button>

        <div className="auth-forgot-actions">
          <p>
            Đã có mã xác thực?{" "}
            <a href="/change-password">
              Nhập mã
            </a>
          </p>

          <a
            className="auth-back-link"
            href="/login"
          >
            Quay lại đăng nhập
          </a>
        </div>
      </form>
    </AuthShell>
  );
}

export function ChangePasswordPage() {
  const { showToast } = useFeedback();
  const [form, setForm] = useState({
    email: "",
    otp: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const confirmPasswordRef = useRef(null);

  function update(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    if (
      form.newPassword !== form.confirmNewPassword
    ) {
      setMessage({
        type: "error",
        text: "Mật khẩu mới nhập lại chưa khớp.",
      });
      setSubmitting(false);

      window.requestAnimationFrame(() =>
        confirmPasswordRef.current?.focus()
      );

      return;
    }

    try {
      const response =
        await authApi.changePassword(form);

      const text =
        response.message ||
        "Đổi mật khẩu thành công. Bạn có thể đăng nhập lại.";

      setMessage({
        type: "success",
        text,
      });

      showToast({
        type: "success",
        title: "Đã đổi mật khẩu",
        message: text,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const passwordMismatch =
    message?.type === "error" &&
    message.text ===
      "Mật khẩu mới nhập lại chưa khớp.";

  return (
    <AuthShell mode="reset">
      <form
        className="clean-form auth-form-clean"
        onSubmit={handleSubmit}
      >
        <ApiMessage message={message} />

        <fieldset className="auth-field-group">
          <legend>Xác minh tài khoản</legend>
          <p>
            Dùng email của tài khoản và mã xác thực
            bạn đã nhận.
          </p>

          <div className="auth-reset-fields">
            <Field
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={(event) =>
                update("email", event.target.value)
              }
              placeholder="you@example.com"
              autoComplete="email"
              spellCheck={false}
              required
            />

            <Field
              label="Mã xác thực"
              name="otp"
              value={form.otp}
              onChange={(event) =>
                update("otp", event.target.value)
              }
              autoComplete="one-time-code"
              required
            />
          </div>
        </fieldset>

        <fieldset className="auth-field-group">
          <legend>Mật khẩu mới</legend>
          <p>
            Tạo mật khẩu mới và nhập lại chính xác
            để xác nhận.
          </p>

          <div className="auth-reset-fields">
            <Field
              label="Mật khẩu mới"
              name="newPassword"
              type="password"
              value={form.newPassword}
              onChange={(event) =>
                update(
                  "newPassword",
                  event.target.value,
                )
              }
              autoComplete="new-password"
              hint={PASSWORD_HINT}
              required
            />

            <Field
              label="Nhập lại mật khẩu mới"
              name="confirmNewPassword"
              type="password"
              value={form.confirmNewPassword}
              onChange={(event) =>
                update(
                  "confirmNewPassword",
                  event.target.value,
                )
              }
              autoComplete="new-password"
              inputRef={confirmPasswordRef}
              error={
                passwordMismatch
                  ? message.text
                  : undefined
              }
              required
            />
          </div>
        </fieldset>

        <button
          className="btn btn-primary auth-submit"
          type="submit"
          disabled={submitting}
        >
          {submitting
            ? "Đang đổi…"
            : "Đổi mật khẩu"}
        </button>

        <div className="auth-bottom-link">
          <a href="/forgot-password">
            Gửi lại mã
          </a>
          <a href="/login">
            Đăng nhập
          </a>
        </div>
      </form>
    </AuthShell>
  );
}