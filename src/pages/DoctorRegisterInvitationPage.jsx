import { cloneElement, useCallback, useEffect, useRef, useState } from "react";
import {
  ClipboardCheck,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { Navbar } from "../components/landing/Navbar";
import { replaceRoute } from "../router/navigation";
import { withReturnTo } from "../router/returnIntent";
import { doctorInvitationsApi, facilityDepartmentsApi } from "../services/api";
import "../styles/doctor-invitation.css";

const INITIAL_FORM = {
  fullName: "",
  password: "",
  confirmPassword: "",
  phoneNumber: "",
  facilityDepartmentId: "",
  departmentRole: "0",
  qualification: "",
  yearsOfExperience: "",
};

const DEPARTMENT_ROLES = [
  { value: "0", label: "Bác sĩ" },
  { value: "1", label: "Phó khoa" },
  { value: "2", label: "Trưởng khoa" },
  { value: "3", label: "Chuyên gia đầu ngành" },
  { value: "4", label: "Cố vấn" },
];

const INVITATION_STEPS = [
  { label: "Xác thực lời mời", icon: ShieldCheck },
  { label: "Hoàn thiện thông tin", icon: ClipboardCheck },
  { label: "Sẵn sàng vào hệ thống", icon: Stethoscope },
];

function getToken() {
  return new URLSearchParams(window.location.search).get("token")?.trim() ?? "";
}

function formatCountdown(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function normalizeFacilityDepartments(response) {
  const data = response?.data;
  const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];

  return items
    .map((item) => ({
      id: item.id ?? item.facilityDepartmentId ?? "",
      label: [item.facilityName, item.departmentName].filter(Boolean).join(" - "),
    }))
    .filter((item) => item.id)
    .map((item) => ({ ...item, label: item.label || item.id }));
}

function validateForm(form, isLinkedProfile) {
  const errors = {};
  const password = form.password;

  if (!form.fullName.trim()) errors.fullName = "Vui lòng nhập họ và tên.";

  if (!password) {
    errors.password = "Vui lòng nhập mật khẩu.";
  } else {
    const missingRules = [];
    if (password.length < 8) missingRules.push("ít nhất 8 ký tự");
    if (!/[a-z]/.test(password)) missingRules.push("chữ thường");
    if (!/[A-Z]/.test(password)) missingRules.push("chữ hoa");
    if (!/\d/.test(password)) missingRules.push("chữ số");
    if (!/[^A-Za-z0-9]/.test(password)) missingRules.push("ký tự đặc biệt");
    if (missingRules.length) errors.password = `Mật khẩu cần có ${missingRules.join(", ")}.`;
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = "Vui lòng nhập lại mật khẩu.";
  } else if (form.confirmPassword !== password) {
    errors.confirmPassword = "Mật khẩu nhập lại chưa khớp.";
  }

  if (form.phoneNumber.trim()) {
    const phone = form.phoneNumber.trim();
    const digits = phone.replace(/\D/g, "");
    if (!/^\+?[\d\s().-]+$/.test(phone) || digits.length < 9 || digits.length > 15) {
      errors.phoneNumber = "Số điện thoại phải có từ 9 đến 15 chữ số.";
    }
  }

  if (!isLinkedProfile) {
    if (!form.facilityDepartmentId) {
      errors.facilityDepartmentId = "Vui lòng chọn cơ sở y tế và khoa.";
    }
    if (!DEPARTMENT_ROLES.some((role) => role.value === form.departmentRole)) {
      errors.departmentRole = "Vai trò trong khoa không hợp lệ.";
    }
    if (form.yearsOfExperience !== "") {
      const years = Number(form.yearsOfExperience);
      if (!Number.isInteger(years) || years < 0) {
        errors.yearsOfExperience = "Số năm kinh nghiệm phải là số nguyên không âm.";
      }
    }
  }

  return errors;
}

function buildPayload(token, form, isLinkedProfile) {
  const payload = {
    token,
    fullName: form.fullName.trim(),
    password: form.password,
    phoneNumber: form.phoneNumber.trim() || null,
  };

  if (isLinkedProfile) return payload;

  return {
    ...payload,
    facilityDepartmentId: form.facilityDepartmentId,
    departmentRole: Number(form.departmentRole),
    qualification: form.qualification.trim() || null,
    yearsOfExperience:
      form.yearsOfExperience === "" ? null : Number(form.yearsOfExperience),
  };
}

function getRawApiErrors(error) {
  const errors = error?.payload?.errors;
  if (Array.isArray(errors) && errors.length) return errors.filter(Boolean);
  if (typeof errors === "string" && errors) return [errors];
  if (errors && typeof errors === "object") {
    const messages = Object.values(errors)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter(Boolean);
    if (messages.length) return messages;
  }
  return [error?.message || "Không thể hoàn tất đăng ký. Vui lòng thử lại."];
}

function presentInvitationError(message) {
  const text = String(message ?? "").trim();
  const normalized = text.toLowerCase();

  if (!text) return "Không thể hoàn tất đăng ký. Vui lòng thử lại.";
  if (normalized.includes("invitation link has expired")) {
    return "Liên kết đăng ký đã hết hạn. Vui lòng đề nghị quản trị viên gửi lời mời mới.";
  }
  if (normalized.includes("invitation link has already been used")) {
    return "Liên kết đăng ký này đã được sử dụng. Hãy đăng nhập hoặc đề nghị quản trị viên kiểm tra lại.";
  }
  if (
    normalized.includes("invalid invitation")
    || normalized.includes("invitation link is invalid")
    || normalized.includes("invitation token")
    || normalized.includes("token is required")
  ) {
    return "Liên kết đăng ký không hợp lệ. Vui lòng mở đúng liên kết trong lời mời được gửi cho bạn.";
  }
  if (normalized.includes("passwords must be at least 8 characters")) {
    return "Mật khẩu cần có ít nhất 8 ký tự.";
  }
  if (normalized.includes("passwords must have at least one digit")) {
    return "Mật khẩu cần có ít nhất một chữ số.";
  }
  if (normalized.includes("passwords must have at least one uppercase")) {
    return "Mật khẩu cần có ít nhất một chữ hoa.";
  }
  if (normalized.includes("passwords must have at least one lowercase")) {
    return "Mật khẩu cần có ít nhất một chữ thường.";
  }
  if (
    normalized.includes("phone number is invalid")
    || normalized.includes("invalid phone")
  ) {
    return "Số điện thoại chưa đúng định dạng. Vui lòng kiểm tra lại.";
  }
  if (
    normalized.includes("failed to fetch")
    || normalized.includes("network")
    || normalized.includes("timeout")
  ) {
    return "Chưa thể kết nối để kiểm tra lời mời. Vui lòng thử lại.";
  }

  const containsVietnamese = /[À-ỹĐđ]/u.test(text);
  if (containsVietnamese && !/(token|exception|stack|bearer|request id)/i.test(text)) {
    return text;
  }

  return "Chưa thể hoàn tất đăng ký. Vui lòng kiểm tra thông tin và thử lại.";
}

function getApiErrors(error) {
  return [...new Set(getRawApiErrors(error).map(presentInvitationError))];
}

function isInvitationFailure(messages) {
  const text = messages.join(" ").toLowerCase();
  return (
    text.includes("invitation link has expired") ||
    text.includes("invitation link has already been used") ||
    text.includes("invalid invitation") ||
    text.includes("invitation link is invalid")
  );
}

function Field({ id, label, error, hint, required = false, children, className = "" }) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;
  const control = cloneElement(children, {
    id,
    "aria-describedby": describedBy,
    "aria-invalid": error ? "true" : undefined,
  });

  return (
    <div className={`clean-field doctor-invitation-field ${error ? "has-error" : ""} ${className}`.trim()}>
      <label htmlFor={id}>
        {label}
        {required && <span className="sr-only"> (bắt buộc)</span>}
      </label>
      {control}
      {error ? (
        <small id={errorId} className="field-error">{error}</small>
      ) : hint ? (
        <small id={hintId}>{hint}</small>
      ) : null}
    </div>
  );
}

function StatusPanel({ eyebrow, title, children, tone = "", headingRef }) {
  return (
    <section className={`doctor-invitation-status ${tone}`.trim()}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 ref={headingRef} tabIndex="-1">{title}</h2>
      {children}
    </section>
  );
}

function ErrorSummary({ errors, summaryRef }) {
  const entries = Object.entries(errors);
  if (!entries.length) return null;

  return (
    <div
      ref={summaryRef}
      className="doctor-error-summary"
      role="alert"
      aria-labelledby="doctor-error-summary-title"
      tabIndex="-1"
    >
      <strong id="doctor-error-summary-title">
        Vui lòng kiểm tra {entries.length} trường chưa hợp lệ:
      </strong>
      <ul>
        {entries.map(([field, message]) => (
          <li key={field}>
            <a href={`#doctor-${field}`}>{message}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DoctorRegisterInvitationPage() {
  const [token] = useState(() => getToken());
  const [status, setStatus] = useState("validating");
  const [invitation, setInvitation] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [apiErrors, setApiErrors] = useState([]);
  const [facilityDepartments, setFacilityDepartments] = useState([]);
  const [facilityError, setFacilityError] = useState("");
  const [facilityLoading, setFacilityLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const errorSummaryRef = useRef(null);
  const statusHeadingRef = useRef(null);
  const isLinkedProfile = Boolean(invitation?.isLinkedToExistingDoctorProfile);
  const loginPath = withReturnTo("/login", "/app/staff");

  const openDoctorLogin = useCallback(() => {
    replaceRoute(loginPath, {
      state: {
        doctorInvitation: {
          email: registeredEmail || invitation?.email || "",
          expectedRole: "doctor",
        },
      },
    });
  }, [invitation?.email, loginPath, registeredEmail]);

  const loadFacilityDepartments = useCallback(async () => {
    setFacilityLoading(true);
    setFacilityError("");
    try {
      const response = await facilityDepartmentsApi.active();
      const options = normalizeFacilityDepartments(response);
      setFacilityDepartments(options);
      if (!options.length) {
        setFacilityError(
          "Hệ thống chưa có dữ liệu khoa tại cơ sở y tế. Vui lòng thử lại sau hoặc liên hệ quản trị viên.",
        );
      }
    } catch {
      setFacilityDepartments([]);
      setFacilityError(
        "Chưa có danh sách khoa cho cơ sở y tế này. Vui lòng thử lại sau.",
      );
    } finally {
      setFacilityLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function validateInvitation() {
      if (!token) {
        setStatus("invalid");
        setApiErrors([
          "Liên kết đăng ký không đầy đủ. Vui lòng mở đúng liên kết trong lời mời được gửi cho bạn.",
        ]);
        return;
      }

      try {
        const response = await doctorInvitationsApi.validate(token);
        if (!active) return;
        const data = response?.data;

        if (!data?.isValid) {
          setStatus("invalid");
          setApiErrors([
            presentInvitationError(
              data?.message
                || "Liên kết đăng ký đã hết hạn hoặc không hợp lệ. Vui lòng liên hệ quản trị viên để nhận lời mời mới.",
            ),
          ]);
          return;
        }

        setInvitation(data);
        setForm((current) => ({
          ...current,
          fullName: data.suggestedFullName || data.doctorName || "",
        }));
        setStatus(data.isLinkedToExistingDoctorProfile ? "ready-linked" : "ready-new");

        if (!data.isLinkedToExistingDoctorProfile) {
          setFacilityLoading(true);
          try {
            const facilityResponse = await facilityDepartmentsApi.active();
            if (!active) return;
            const options = normalizeFacilityDepartments(facilityResponse);
            setFacilityDepartments(options);
            if (!options.length) {
              setFacilityError(
                "Hệ thống chưa có dữ liệu khoa tại cơ sở y tế. Vui lòng thử lại sau hoặc liên hệ quản trị viên.",
              );
            }
          } catch {
            if (!active) return;
            setFacilityDepartments([]);
            setFacilityError(
              "Chưa có danh sách khoa cho cơ sở y tế này. Vui lòng thử lại sau.",
            );
          } finally {
            if (active) setFacilityLoading(false);
          }
        }
      } catch (error) {
        if (!active) return;
        setStatus("invalid");
        setApiErrors(getApiErrors(error));
      }
    }

    validateInvitation();
    return () => {
      active = false;
    };
  }, [token]);

  // Invitation tokens are short-lived (BE hard-codes 2 minutes), so the form
  // counts down from expiresAt and moves to the "invalid" state on its own
  // instead of letting the doctor discover the token died at submit time.
  useEffect(() => {
    const expiresAtMs = invitation?.expiresAt ? new Date(invitation.expiresAt).getTime() : NaN;
    if (Number.isNaN(expiresAtMs)) {
      queueMicrotask(() => setRemainingSeconds(null));
      return undefined;
    }

    let intervalId;
    function tick() {
      const secondsLeft = Math.max(0, Math.round((expiresAtMs - Date.now()) / 1000));
      setRemainingSeconds(secondsLeft);
      if (secondsLeft <= 0) {
        window.clearInterval(intervalId);
        setStatus((current) => (["ready-new", "ready-linked"].includes(current) ? "invalid" : current));
        setApiErrors(["Liên kết đăng ký đã hết hạn. Vui lòng đề nghị quản trị viên gửi lời mời mới."]);
      }
    }

    tick();
    intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [invitation?.expiresAt]);

  useEffect(() => {
    if (status !== "success") return undefined;
    const timeoutId = window.setTimeout(() => {
      openDoctorLogin();
    }, 2500);
    return () => window.clearTimeout(timeoutId);
  }, [openDoctorLogin, status]);

  useEffect(() => {
    if (!["invalid", "success"].includes(status)) return;
    statusHeadingRef.current?.focus();
  }, [status]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setApiErrors([]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateForm(form, isLinkedProfile);
    setErrors(nextErrors);
    setApiErrors([]);

    if (Object.keys(nextErrors).length) {
      window.requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return;
    }

    if (!isLinkedProfile && !facilityDepartments.length) return;

    setStatus("submitting");
    try {
      const response = await doctorInvitationsApi.register(buildPayload(token, form, isLinkedProfile));
      setRegisteredEmail(response?.data?.email || invitation?.email || "");
      setStatus("success");
    } catch (error) {
      const rawMessages = getRawApiErrors(error);
      setApiErrors([...new Set(rawMessages.map(presentInvitationError))]);
      setStatus(isInvitationFailure(rawMessages) ? "invalid" : isLinkedProfile ? "ready-linked" : "ready-new");
    }
  }

  const submitDisabled =
    status === "submitting" ||
    (!isLinkedProfile && (facilityLoading || !facilityDepartments.length));
  const announcement = status === "validating"
    ? "Đang kiểm tra lời mời đăng ký."
    : status === "submitting"
      ? "Đang gửi thông tin đăng ký."
      : status === "success"
        ? "Đăng ký tài khoản bác sĩ thành công."
        : facilityLoading
          ? "Đang tải danh sách cơ sở y tế và khoa."
          : "";

  return (
    <main className="landing-page auth-shell-page auth-mode-clinical auth-mode-doctor doctor-invitation-page">
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
      <Navbar variant="landing" />
      <section className="auth-page">
        <div className="container auth-layout auth-layout-clean doctor-invitation-layout">
          <aside className="auth-side-panel">
            <a className="brand auth-brand" href="/">
              <span className="brand-mark" aria-hidden="true">
                <img src="/logo.svg" alt="" width="36" height="36" />
              </span>
              <span>MediMate AI</span>
            </a>
            <div>
              <p className="eyebrow">Dành cho bác sĩ được mời</p>
              <h1>Hoàn tất tài khoản bác sĩ.</h1>
              <p>
                Xác nhận lời mời và bổ sung thông tin cần thiết để truy cập không gian làm việc trên MediMate.
              </p>
            </div>
            <div className="auth-step-list">
              {INVITATION_STEPS.map((step) => (
                <div key={step.label}>
                  <span>
                    <step.icon size={19} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <strong>{step.label}</strong>
                </div>
              ))}
            </div>
            <p className="auth-privacy-note">
              <ShieldCheck size={17} aria-hidden="true" />
              Chỉ sử dụng liên kết lời mời do quản trị viên MediMate cung cấp.
            </p>
          </aside>

          <div className="auth-card auth-card-clean doctor-invitation-card">
            {status === "validating" && (
              <StatusPanel eyebrow="Đang xác thực" title="Đang kiểm tra lời mời đăng ký...">
                <div className="doctor-invitation-loader" aria-hidden="true" />
                <p>Quá trình này chỉ mất vài giây.</p>
              </StatusPanel>
            )}

            {status === "invalid" && (
              <StatusPanel
                eyebrow="Lời mời không khả dụng"
                title="Không thể tiếp tục đăng ký."
                tone="error"
                headingRef={statusHeadingRef}
              >
                <div className="doctor-api-errors">
                  {apiErrors.map((message) => <p key={message}>{message}</p>)}
                </div>
                <p>Vui lòng liên hệ quản trị viên để nhận lời mời mới.</p>
                <a className="btn btn-primary" href="/login">Đến trang đăng nhập</a>
              </StatusPanel>
            )}

            {status === "success" && (
              <StatusPanel
                eyebrow="Đăng ký thành công"
                title="Tài khoản bác sĩ đã sẵn sàng."
                tone="success"
                headingRef={statusHeadingRef}
              >
                <p>Đăng ký tài khoản bác sĩ thành công. Vui lòng đăng nhập để tiếp tục.</p>
                <p className="doctor-redirect-note">Bạn sẽ được chuyển đến trang đăng nhập trong giây lát.</p>
                <button className="btn btn-primary" type="button" onClick={openDoctorLogin}>
                  Đăng nhập ngay
                </button>
              </StatusPanel>
            )}

            {["ready-new", "ready-linked", "submitting"].includes(status) && (
              <>
                <header className="auth-card-header auth-card-header-clean">
                  <div>
                    <p className="eyebrow">{isLinkedProfile ? "Liên kết hồ sơ bác sĩ" : "Tài khoản bác sĩ mới"}</p>
                    <h2>{isLinkedProfile ? "Tạo tài khoản cho hồ sơ hiện có" : "Hoàn tất đăng ký tài khoản bác sĩ"}</h2>
                    <p>
                      {isLinkedProfile
                        ? "Thông tin chuyên môn hiện có sẽ được giữ nguyên."
                        : "Điền thông tin tài khoản và vị trí chuyên môn để hoàn tất đăng ký."}
                    </p>
                  </div>
                </header>

                {remainingSeconds != null && (
                  <div
                    className={`doctor-expiry-notice ${remainingSeconds <= 30 ? "is-urgent" : ""}`.trim()}
                    role="status"
                    aria-atomic="true"
                  >
                    <span>Lời mời còn hiệu lực</span>
                    <strong>{formatCountdown(remainingSeconds)}</strong>
                  </div>
                )}

                {apiErrors.length > 0 && (
                  <div className="doctor-api-errors" role="alert">
                    {apiErrors.map((message) => <p key={message}>{message}</p>)}
                  </div>
                )}

                {isLinkedProfile && invitation?.doctorName && (
                  <div className="doctor-profile-summary">
                    <span>Hồ sơ được liên kết</span>
                    <strong>{invitation.doctorName}</strong>
                  </div>
                )}

                <form
                  className="clean-form auth-form-clean doctor-invitation-form"
                  onSubmit={handleSubmit}
                  noValidate
                  aria-busy={status === "submitting"}
                >
                  <ErrorSummary errors={errors} summaryRef={errorSummaryRef} />
                  <fieldset className="doctor-form-group">
                    <legend>Thông tin tài khoản</legend>
                    <p>Email được xác định từ lời mời. Bạn bổ sung tên hiển thị, mật khẩu và số điện thoại nếu cần.</p>
                    <div className="form-two-cols">
                      <Field id="doctor-email" label="Email">
                        <input
                          name="email"
                          type="email"
                          value={invitation?.email || ""}
                          autoComplete="email"
                          readOnly
                          aria-readonly="true"
                        />
                      </Field>
                      <Field id="doctor-fullName" label="Họ và tên" error={errors.fullName} required>
                        <input
                          name="fullName"
                          value={form.fullName}
                          onChange={(event) => updateField("fullName", event.target.value)}
                          autoComplete="name"
                          required
                        />
                      </Field>
                      <Field
                        id="doctor-password"
                        label="Mật khẩu"
                        error={errors.password}
                        hint="Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt."
                        required
                      >
                        <input
                          name="password"
                          type="password"
                          value={form.password}
                          onChange={(event) => updateField("password", event.target.value)}
                          autoComplete="new-password"
                          required
                        />
                      </Field>
                      <Field
                        id="doctor-confirmPassword"
                        label="Nhập lại mật khẩu"
                        error={errors.confirmPassword}
                        required
                      >
                        <input
                          name="confirmPassword"
                          type="password"
                          value={form.confirmPassword}
                          onChange={(event) => updateField("confirmPassword", event.target.value)}
                          autoComplete="new-password"
                          required
                        />
                      </Field>
                      <Field
                        id="doctor-phoneNumber"
                        label="Số điện thoại"
                        error={errors.phoneNumber}
                        hint="Không bắt buộc."
                      >
                        <input
                          name="phoneNumber"
                          type="tel"
                          value={form.phoneNumber}
                          onChange={(event) => updateField("phoneNumber", event.target.value)}
                          autoComplete="tel"
                        />
                      </Field>
                    </div>
                  </fieldset>

                  {!isLinkedProfile && (
                    <fieldset className="doctor-form-group doctor-professional-section">
                      <legend>Thông tin chuyên môn</legend>
                      <p>Chọn đúng cơ sở, khoa và vai trò được ghi nhận trong lời mời của bạn.</p>

                      {facilityError && (
                        <div className="doctor-facility-warning" role="status" aria-atomic="true">
                          <p>{facilityError}</p>
                          <button className="btn btn-ghost" type="button" onClick={loadFacilityDepartments} disabled={facilityLoading}>
                            {facilityLoading ? "Đang tải..." : "Thử tải lại"}
                          </button>
                        </div>
                      )}

                      <div className="form-two-cols">
                        <Field
                          id="doctor-facilityDepartmentId"
                          label="Cơ sở y tế - khoa"
                          error={errors.facilityDepartmentId}
                          className="doctor-field-wide"
                          required
                        >
                          <select
                            name="facilityDepartmentId"
                            value={form.facilityDepartmentId}
                            onChange={(event) => updateField("facilityDepartmentId", event.target.value)}
                            disabled={facilityLoading || !facilityDepartments.length}
                            required
                          >
                            <option value="">
                              {facilityLoading ? "Đang tải danh sách..." : "Chọn cơ sở y tế và khoa"}
                            </option>
                            {facilityDepartments.map((option) => (
                              <option key={option.id} value={option.id}>{option.label}</option>
                            ))}
                          </select>
                        </Field>
                        <Field
                          id="doctor-departmentRole"
                          label="Vai trò trong khoa"
                          error={errors.departmentRole}
                          required
                        >
                          <select
                            name="departmentRole"
                            value={form.departmentRole}
                            onChange={(event) => updateField("departmentRole", event.target.value)}
                          >
                            {DEPARTMENT_ROLES.map((role) => (
                              <option key={role.value} value={role.value}>{role.label}</option>
                            ))}
                          </select>
                        </Field>
                        <Field id="doctor-qualification" label="Chuyên môn / bằng cấp">
                          <input
                            name="qualification"
                            value={form.qualification}
                            onChange={(event) => updateField("qualification", event.target.value)}
                            placeholder="Ví dụ: Bác sĩ chuyên khoa I"
                          />
                        </Field>
                        <Field
                          id="doctor-yearsOfExperience"
                          label="Số năm kinh nghiệm"
                          error={errors.yearsOfExperience}
                        >
                          <input
                            name="yearsOfExperience"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={form.yearsOfExperience}
                            onChange={(event) => updateField("yearsOfExperience", event.target.value)}
                          />
                        </Field>
                      </div>
                    </fieldset>
                  )}

                  <button className="btn btn-primary auth-submit" type="submit" disabled={submitDisabled}>
                    {status === "submitting" ? "Đang đăng ký..." : "Hoàn tất đăng ký"}
                  </button>
                  {!isLinkedProfile && !facilityDepartments.length && (
                    <p className="doctor-submit-note">
                      Chưa thể đăng ký bác sĩ mới cho đến khi có danh sách khoa tại cơ sở y tế.
                    </p>
                  )}
                </form>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
