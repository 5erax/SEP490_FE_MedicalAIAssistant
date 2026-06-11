import { useCallback, useEffect, useState } from "react";
import { Navbar } from "../components/landing/Navbar";
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
  { value: "0", label: "Nhân viên (Staff)" },
  { value: "1", label: "Phó khoa (Deputy Head)" },
  { value: "2", label: "Trưởng khoa (Head)" },
  { value: "3", label: "Chuyên gia đầu ngành (Leading Expert)" },
  { value: "4", label: "Cố vấn (Consultant)" },
];

function getToken() {
  return new URLSearchParams(window.location.search).get("token")?.trim() ?? "";
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

function getApiErrors(error) {
  const errors = error?.payload?.errors;
  if (Array.isArray(errors) && errors.length) return errors.filter(Boolean);
  if (typeof errors === "string" && errors) return [errors];
  return [error?.message || "Không thể hoàn tất đăng ký. Vui lòng thử lại."];
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

function Field({ label, error, hint, children, className = "" }) {
  return (
    <label className={`clean-field doctor-invitation-field ${error ? "has-error" : ""} ${className}`.trim()}>
      <span>{label}</span>
      {children}
      {error ? <small className="field-error">{error}</small> : hint ? <small>{hint}</small> : null}
    </label>
  );
}

function StatusPanel({ eyebrow, title, children, tone = "" }) {
  return (
    <section className={`doctor-invitation-status ${tone}`.trim()}>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {children}
    </section>
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
  const isLinkedProfile = Boolean(invitation?.isLinkedToExistingDoctorProfile);

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
        "Backend chưa cung cấp danh sách khoa tại cơ sở y tế cho trang đăng ký công khai.",
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
        setApiErrors(["Link đăng ký thiếu invitation token."]);
        return;
      }

      try {
        const response = await doctorInvitationsApi.validate(token);
        if (!active) return;
        const data = response?.data;

        if (!data?.isValid) {
          setStatus("invalid");
          setApiErrors([
            data?.message ||
              "Link đăng ký đã hết hạn hoặc không hợp lệ. Vui lòng liên hệ quản trị viên để nhận lời mời mới.",
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
              "Backend chưa cung cấp danh sách khoa tại cơ sở y tế cho trang đăng ký công khai.",
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

  useEffect(() => {
    if (status !== "success") return undefined;
    const timeoutId = window.setTimeout(() => {
      window.location.replace("/login");
    }, 2500);
    return () => window.clearTimeout(timeoutId);
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

    if (Object.keys(nextErrors).length || (!isLinkedProfile && !facilityDepartments.length)) return;

    setStatus("submitting");
    try {
      await doctorInvitationsApi.register(buildPayload(token, form, isLinkedProfile));
      setStatus("success");
    } catch (error) {
      const messages = getApiErrors(error);
      setApiErrors(messages);
      setStatus(isInvitationFailure(messages) ? "invalid" : isLinkedProfile ? "ready-linked" : "ready-new");
    }
  }

  const submitDisabled =
    status === "submitting" ||
    (!isLinkedProfile && (facilityLoading || !facilityDepartments.length));

  return (
    <main className="landing-page auth-shell-page doctor-invitation-page">
      <Navbar />
      <section className="auth-page">
        <div className="container auth-layout auth-layout-clean doctor-invitation-layout">
          <aside className="auth-side-panel">
            <a className="brand auth-brand" href="/">
              <span className="brand-mark">+</span>
              <span>MediMate AI</span>
            </a>
            <div>
              <p className="eyebrow">Doctor Invitation</p>
              <h1>Hoàn tất tài khoản bác sĩ của bạn.</h1>
              <p>
                Lời mời xác nhận đúng email và hồ sơ được quản trị viên chuẩn bị trước khi tạo tài khoản đăng nhập.
              </p>
            </div>
            <div className="auth-step-list">
              {["Kiểm tra lời mời", "Hoàn thiện thông tin", "Đăng nhập hệ thống"].map((step, index) => (
                <div key={step}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{step}</strong>
                </div>
              ))}
            </div>
          </aside>

          <div className="auth-card auth-card-clean doctor-invitation-card">
            {status === "validating" && (
              <StatusPanel eyebrow="Đang xác thực" title="Đang kiểm tra lời mời đăng ký...">
                <div className="doctor-invitation-loader" aria-label="Đang tải" />
                <p>Quá trình này chỉ mất vài giây.</p>
              </StatusPanel>
            )}

            {status === "invalid" && (
              <StatusPanel eyebrow="Lời mời không khả dụng" title="Không thể tiếp tục đăng ký." tone="error">
                <div className="doctor-api-errors" role="alert">
                  {apiErrors.map((message) => <p key={message}>{message}</p>)}
                </div>
                <p>Vui lòng liên hệ quản trị viên để nhận lời mời mới.</p>
                <a className="btn btn-primary" href="/login">Đến trang đăng nhập</a>
              </StatusPanel>
            )}

            {status === "success" && (
              <StatusPanel eyebrow="Đăng ký thành công" title="Tài khoản bác sĩ đã sẵn sàng." tone="success">
                <p>Đăng ký tài khoản bác sĩ thành công. Vui lòng đăng nhập để tiếp tục.</p>
                <p className="doctor-redirect-note">Bạn sẽ được chuyển đến trang đăng nhập trong giây lát.</p>
                <button className="btn btn-primary" type="button" onClick={() => window.location.replace("/login")}>
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

                <form className="clean-form auth-form-clean doctor-invitation-form" onSubmit={handleSubmit} noValidate>
                  <div className="form-two-cols">
                    <Field label="Email">
                      <input type="email" value={invitation?.email || ""} readOnly aria-readonly="true" />
                    </Field>
                    <Field label="Họ và tên" error={errors.fullName}>
                      <input
                        value={form.fullName}
                        onChange={(event) => updateField("fullName", event.target.value)}
                        autoComplete="name"
                        required
                      />
                    </Field>
                    <Field label="Mật khẩu" error={errors.password} hint="Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.">
                      <input
                        type="password"
                        value={form.password}
                        onChange={(event) => updateField("password", event.target.value)}
                        autoComplete="new-password"
                        required
                      />
                    </Field>
                    <Field label="Nhập lại mật khẩu" error={errors.confirmPassword}>
                      <input
                        type="password"
                        value={form.confirmPassword}
                        onChange={(event) => updateField("confirmPassword", event.target.value)}
                        autoComplete="new-password"
                        required
                      />
                    </Field>
                    <Field label="Số điện thoại" error={errors.phoneNumber} hint="Không bắt buộc.">
                      <input
                        type="tel"
                        value={form.phoneNumber}
                        onChange={(event) => updateField("phoneNumber", event.target.value)}
                        autoComplete="tel"
                      />
                    </Field>
                  </div>

                  {!isLinkedProfile && (
                    <section className="doctor-professional-section">
                      <div className="doctor-section-heading">
                        <strong>Thông tin chuyên môn</strong>
                        <span>Dành cho hồ sơ bác sĩ mới</span>
                      </div>

                      {facilityError && (
                        <div className="doctor-facility-warning" role="alert">
                          <p>{facilityError}</p>
                          <button className="btn btn-ghost" type="button" onClick={loadFacilityDepartments} disabled={facilityLoading}>
                            {facilityLoading ? "Đang tải..." : "Thử tải lại"}
                          </button>
                        </div>
                      )}

                      <div className="form-two-cols">
                        <Field label="Cơ sở y tế - khoa" error={errors.facilityDepartmentId} className="doctor-field-wide">
                          <select
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
                        <Field label="Vai trò trong khoa" error={errors.departmentRole}>
                          <select
                            value={form.departmentRole}
                            onChange={(event) => updateField("departmentRole", event.target.value)}
                          >
                            {DEPARTMENT_ROLES.map((role) => (
                              <option key={role.value} value={role.value}>{role.label}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Chuyên môn / bằng cấp">
                          <input
                            value={form.qualification}
                            onChange={(event) => updateField("qualification", event.target.value)}
                            placeholder="Ví dụ: Bác sĩ chuyên khoa I"
                          />
                        </Field>
                        <Field label="Số năm kinh nghiệm" error={errors.yearsOfExperience}>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={form.yearsOfExperience}
                            onChange={(event) => updateField("yearsOfExperience", event.target.value)}
                          />
                        </Field>
                      </div>
                    </section>
                  )}

                  <button className="btn btn-primary auth-submit" type="submit" disabled={submitDisabled}>
                    {status === "submitting" ? "Đang đăng ký..." : "Hoàn tất đăng ký"}
                  </button>
                  {!isLinkedProfile && !facilityDepartments.length && (
                    <p className="doctor-submit-note">
                      Chưa thể đăng ký bác sĩ mới cho đến khi backend cung cấp danh sách khoa tại cơ sở y tế.
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
