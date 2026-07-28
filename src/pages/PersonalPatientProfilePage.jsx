import { cloneElement, useEffect, useId, useMemo, useRef, useState } from "react";
import { Plus, ShieldCheck, Trash2 } from "lucide-react";
import { Navbar } from "../components/landing/Navbar";
import { Footer } from "../components/landing/PricingSection";
import { useUnsavedChangesWarning } from "../hooks/useUnsavedChangesWarning";
import { navigate } from "../router/navigation";
import { getReturnToFromSearch } from "../router/returnIntent";
import { authApi, getStoredAuth, setStoredAuth } from "../services/api";
import { findPatientProfileByUserId, savePatientProfileSetup } from "../services/patientProfileSetup";
import {
  validateMedicalProfile,
  validatePersonalProfile,
} from "../utils/profileValidation";
import { getWorkspacePath } from "../utils/roles";
import "../styles/profile-setup-clinical.css";

const BLOOD_TYPES = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const ERROR_FIELD_LABELS = {
  displayName: "Họ và tên",
  dateOfBirth: "Ngày sinh",
  gender: "Giới tính",
  phoneNumber: "Số điện thoại",
  address: "Địa chỉ",
  height: "Chiều cao",
  weight: "Cân nặng",
  allergyNote: "Dị ứng",
};

function createEmptyDisease() {
  return {
    localId: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    diseaseName: "",
    from: "",
    to: "",
    note: "",
  };
}

function createInitialForm() {
  return {
    displayName: "",
    dateOfBirth: "",
    gender: "1",
    phoneNumber: "",
    address: "",
    bloodType: "",
    allergyNote: "",
    height: "",
    weight: "",
    chronicDiseases: [createEmptyDisease()],
  };
}

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

function Field({ id: providedId, label, error, required = false, children }) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const errorId = `${id}-error`;
  const describedBy = [children.props["aria-describedby"], error ? errorId : ""].filter(Boolean).join(" ") || undefined;
  return (
    <label className={`clean-field profile-setup-field ${error ? "has-error" : ""}`} htmlFor={id}>
      <span>{label}{required ? " (bắt buộc)" : ""}</span>
      {cloneElement(children, {
        id,
        required: required || children.props.required,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })}
      {error && <small id={errorId}>{error}</small>}
    </label>
  );
}

function getErrorFieldId(errorKey) {
  const diseaseMatch = errorKey.match(/^chronicDiseases\.(\d+)\.(diseaseName|from|to|note)$/);
  if (diseaseMatch) return `patient-profile-disease-${diseaseMatch[1]}-${diseaseMatch[2]}`;
  return `patient-profile-${errorKey}`;
}

function getErrorFieldLabel(errorKey) {
  const diseaseMatch = errorKey.match(/^chronicDiseases\.(\d+)\.(diseaseName|from|to|note)$/);
  if (!diseaseMatch) return ERROR_FIELD_LABELS[errorKey] ?? errorKey;

  const labels = {
    diseaseName: "Tên bệnh",
    from: "Từ ngày",
    to: "Đến ngày",
    note: "Ghi chú",
  };
  return `Bệnh nền #${Number(diseaseMatch[1]) + 1} – ${labels[diseaseMatch[2]]}`;
}

function ErrorSummary({ errors, summaryRef }) {
  const entries = Object.entries(errors).filter(([, error]) => Boolean(error));
  if (entries.length === 0) return null;

  return (
    <div className="profile-setup-error-summary" role="alert" aria-labelledby="profile-setup-error-title" tabIndex="-1" ref={summaryRef}>
      <strong id="profile-setup-error-title">Có {entries.length} thông tin cần kiểm tra</strong>
      <ul>
        {entries.map(([key, error]) => {
          const fieldId = getErrorFieldId(key);
          return (
            <li key={key}>
              <a
                href={`#${fieldId}`}
                onClick={(event) => {
                  event.preventDefault();
                  document.getElementById(fieldId)?.focus();
                }}
              >
                {getErrorFieldLabel(key)}: {error}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function toDateInput(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function getUserId(user, auth) {
  return user?.userId ?? user?.identityId ?? user?.id ?? auth?.userId ?? auth?.identityId ?? "";
}

function EmptyAuth() {
  return (
    <main className="landing-page">
      <Navbar />
      <section className="app-page">
        <div className="container app-empty">
          <p className="eyebrow">Hồ sơ sức khỏe</p>
          <h1>Bạn cần đăng nhập để hoàn thiện hồ sơ bệnh nhân.</h1>
          <div className="hero-actions">
            <a className="btn btn-primary" href="/login">Đăng nhập</a>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

export default function PersonalPatientProfilePage() {
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [user, setUser] = useState(null);
  const [form, setForm] = useState(createInitialForm);
  const [loading, setLoading] = useState(Boolean(auth));
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [errors, setErrors] = useState({});
  const [dirty, setDirty] = useState(false);
  const errorSummaryRef = useRef(null);

  useUnsavedChangesWarning(dirty && !submitting);

  const currentUserId = useMemo(() => getUserId(user, auth), [auth, user]);
  const completedFields = Object.entries({
    displayName: form.displayName,
    dateOfBirth: form.dateOfBirth,
    phoneNumber: form.phoneNumber,
    address: form.address,
    bloodType: form.bloodType,
    height: form.height,
    weight: form.weight,
  }).filter(([, value]) => String(value ?? "").trim()).length;
  const progress = Math.round((completedFields / 7) * 100);

  useEffect(() => {
    if (!auth) return;
    let active = true;

    async function loadProfileContext() {
      setLoading(true);
      let resolvedUser = null;
      let resolvedUserId = auth.userId ?? auth.identityId ?? "";

      try {
        const userResult = await authApi.me();
        if (!active) return;

        resolvedUser = userResult.data ?? {};
        resolvedUserId = getUserId(resolvedUser, auth);
        setUser(resolvedUser);
      } catch (error) {
        if (!active) return;
        setMessage({ type: "warning", text: error.message });
      }

      try {
        const matchedProfile = await findPatientProfileByUserId(resolvedUserId);
        if (!active) return;

        if (matchedProfile) {
          const nextAuth = {
            ...auth,
            firstLogin: false,
            isFirstLogin: false,
            isProfileCompleted: true,
            patientOnboardingPending: auth.patientOnboardingPending ?? true,
          };
          setStoredAuth(nextAuth);
          setAuth(nextAuth);
          navigate(getReturnToFromSearch() || getWorkspacePath(nextAuth));
          return;
        }
      } catch (error) {
        if (!active) return;
        setMessage({ type: "warning", text: error.message });
      }

      setForm((current) => ({
        ...current,
        displayName: resolvedUser?.displayName ?? resolvedUser?.name ?? "",
        dateOfBirth: toDateInput(resolvedUser?.dateOfBirth),
        gender: String(resolvedUser?.gender ?? "1"),
        phoneNumber: resolvedUser?.phoneNumber ?? "",
        address: resolvedUser?.address ?? "",
      }));
      setLoading(false);
    }

    loadProfileContext();

    return () => {
      active = false;
    };
  }, [auth]);

  if (!auth) return <EmptyAuth />;

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  function addDisease() {
    const nextIndex = form.chronicDiseases.length;
    setForm((current) => ({
      ...current,
      chronicDiseases: [...current.chronicDiseases, createEmptyDisease()],
    }));
    setDirty(true);
    window.requestAnimationFrame(() => {
      document.getElementById(`patient-profile-disease-${nextIndex}-diseaseName`)?.focus();
    });
  }

  function updateDisease(index, key, value) {
    setForm((current) => ({
      ...current,
      chronicDiseases: current.chronicDiseases.map((disease, diseaseIndex) => (
        diseaseIndex === index ? { ...disease, [key]: value } : disease
      )),
    }));
    setDirty(true);
    setErrors((current) => ({ ...current, [`chronicDiseases.${index}.${key}`]: "" }));
  }

  function removeDisease(index) {
    setForm((current) => ({
      ...current,
      chronicDiseases: current.chronicDiseases.filter((_, diseaseIndex) => diseaseIndex !== index),
    }));
    setDirty(true);
    setErrors((current) => Object.fromEntries(
      Object.entries(current).filter(([key]) => !key.startsWith("chronicDiseases.")),
    ));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {
      ...validatePersonalProfile(form, { required: true }),
      ...validateMedicalProfile(form),
    };
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setMessage({ type: "error", text: "Vui lòng kiểm tra lại các thông tin bắt buộc." });
      window.requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return;
    }

    if (!currentUserId) {
      setMessage({ type: "error", text: "Không tìm thấy tài khoản trong phiên đăng nhập." });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      await savePatientProfileSetup({
        userId: currentUserId,
        form,
      });

      const nextAuth = {
        ...auth,
        firstLogin: false,
        isFirstLogin: false,
        isProfileCompleted: true,
        patientOnboardingPending: true,
      };
      setStoredAuth(nextAuth);
      setAuth(nextAuth);
      setDirty(false);
      setMessage({ type: "success", text: "Đã hoàn thiện hồ sơ sức khỏe. MediMate đang mở không gian cá nhân của bạn..." });

      window.setTimeout(() => {
        navigate(getReturnToFromSearch() || getWorkspacePath(nextAuth));
      }, 900);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="workspace-root profile-setup-root profile-setup-clinical">
      <section className="profile-setup-page">
        <div className="container profile-setup-shell">
          <aside className="profile-setup-intro">
            <a className="brand" href="/">
              <span className="brand-mark" aria-hidden="true">
                <img src="/logo.svg" alt="" width="36" height="36" />
              </span>
              <span>MediMate AI</span>
            </a>
            <div>
              <p className="eyebrow">Thiết lập hồ sơ</p>
              <h1>Hoàn thiện hồ sơ sức khỏe.</h1>
              <p>
                Chỉ nhập những thông tin bạn biết chính xác. Bạn có thể xem lại và cập nhật hồ sơ trong không gian cá nhân.
              </p>
            </div>
            <div className="profile-setup-privacy-note">
              <ShieldCheck size={20} aria-hidden="true" />
              <div>
                <strong>Dữ liệu sức khỏe nhạy cảm</strong>
                <span>Thông tin được dùng cho hồ sơ và các tính năng bạn chủ động sử dụng.</span>
              </div>
            </div>
            <div className="profile-setup-progress">
              <div>
                <span>Tiến độ hồ sơ · {completedFields}/7 mục cơ bản</span>
                <strong>{progress}%</strong>
              </div>
              <div
                className="profile-progress-bar"
                role="progressbar"
                aria-label="Tiến độ hoàn thiện hồ sơ"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={progress}
              >
                <span style={{ width: `${progress}%` }} />
              </div>
            </div>
          </aside>

          <form className="profile-setup-form" onSubmit={handleSubmit} noValidate>
            <div className="profile-setup-heading">
              <div>
                <p className="eyebrow">Hồ sơ lần đầu</p>
                <h2>Thông tin của bạn</h2>
                <p>Hoàn thành các mục bắt buộc trước khi lưu hồ sơ.</p>
              </div>
              <span className="soft-badge">{loading ? "Đang tải" : "Thiết lập ban đầu"}</span>
            </div>

            <div className="profile-setup-progress profile-setup-mobile-progress">
              <div>
                <span>Tiến độ · {completedFields}/7 mục cơ bản</span>
                <strong>{progress}%</strong>
              </div>
              <div
                className="profile-progress-bar"
                role="progressbar"
                aria-label="Tiến độ hoàn thiện hồ sơ trên di động"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={progress}
              >
                <span style={{ width: `${progress}%` }} />
              </div>
              <small>Các trường có nhãn “bắt buộc” cần được hoàn tất trước khi lưu.</small>
            </div>

            <ApiMessage message={message} />
            <ErrorSummary errors={errors} summaryRef={errorSummaryRef} />

            <fieldset className="profile-form-section">
              <legend className="profile-section-title">
                <span>Thông tin liên hệ</span>
                <strong>Bắt buộc</strong>
              </legend>
              <div className="form-two-cols">
                <Field id="patient-profile-displayName" label="Họ và tên" error={errors.displayName} required>
                  <input name="displayName" autoComplete="name" value={form.displayName} onChange={(event) => updateField("displayName", event.target.value)} disabled={loading || submitting} />
                </Field>
                <Field id="patient-profile-dateOfBirth" label="Ngày sinh" error={errors.dateOfBirth} required>
                  <input name="dateOfBirth" type="date" autoComplete="bday" value={form.dateOfBirth} onChange={(event) => updateField("dateOfBirth", event.target.value)} disabled={loading || submitting} />
                </Field>
                <Field id="patient-profile-gender" label="Giới tính" error={errors.gender} required>
                  <select name="gender" autoComplete="sex" value={form.gender} onChange={(event) => updateField("gender", event.target.value)} disabled={loading || submitting}>
                    <option value="1">Nam</option>
                    <option value="2">Nữ</option>
                  </select>
                </Field>
                <Field id="patient-profile-phoneNumber" label="Số điện thoại" error={errors.phoneNumber} required>
                  <input name="phoneNumber" type="tel" inputMode="tel" autoComplete="tel" value={form.phoneNumber} onChange={(event) => updateField("phoneNumber", event.target.value)} disabled={loading || submitting} />
                </Field>
              </div>
              <Field id="patient-profile-address" label="Địa chỉ" error={errors.address} required>
                <input name="address" autoComplete="street-address" value={form.address} onChange={(event) => updateField("address", event.target.value)} disabled={loading || submitting} />
              </Field>
            </fieldset>

            <fieldset className="profile-form-section">
              <legend className="profile-section-title">
                <span>Thông tin sức khỏe</span>
                <strong>Chỉ nhập khi biết rõ</strong>
              </legend>
              <div className="form-three-cols">
                <Field id="patient-profile-bloodType" label="Nhóm máu">
                  <select name="bloodType" value={form.bloodType} onChange={(event) => updateField("bloodType", event.target.value)} disabled={loading || submitting}>
                    {BLOOD_TYPES.map((type) => (
                      <option key={type || "empty"} value={type}>{type || "Chưa rõ"}</option>
                    ))}
                  </select>
                </Field>
                <Field id="patient-profile-height" label="Chiều cao (cm)" error={errors.height}>
                  <input name="height" type="number" inputMode="decimal" min="40" max="250" step="0.1" value={form.height} onChange={(event) => updateField("height", event.target.value)} disabled={loading || submitting} />
                </Field>
                <Field id="patient-profile-weight" label="Cân nặng (kg)" error={errors.weight}>
                  <input name="weight" type="number" inputMode="decimal" min="2" max="500" step="0.1" value={form.weight} onChange={(event) => updateField("weight", event.target.value)} disabled={loading || submitting} />
                </Field>
              </div>
              <Field id="patient-profile-allergyNote" label="Dị ứng" error={errors.allergyNote}>
                <textarea name="allergyNote" rows={4} maxLength={1000} value={form.allergyNote} onChange={(event) => updateField("allergyNote", event.target.value)} placeholder="Ví dụ: thuốc, thức ăn, phấn hoa…" disabled={loading || submitting} />
              </Field>
            </fieldset>

            <section className="profile-form-section profile-setup-disease-section" aria-labelledby="profile-setup-disease-title">
              <div className="profile-setup-disease-heading">
                <div>
                  <h3 id="profile-setup-disease-title">Bệnh nền</h3>
                  <p>Mỗi bệnh gồm tên bệnh, khoảng thời gian theo dõi và ghi chú riêng. Bạn có thể bỏ qua nếu không có.</p>
                </div>
                <button className="profile-setup-add-disease" type="button" onClick={addDisease} disabled={loading || submitting}>
                  <Plus size={17} aria-hidden="true" />
                  Thêm bệnh nền
                </button>
              </div>

              {form.chronicDiseases.length === 0 ? (
                <p className="profile-setup-disease-empty" role="status">Chưa ghi nhận bệnh nền.</p>
              ) : (
                <div className="profile-setup-disease-list">
                  {form.chronicDiseases.map((disease, index) => (
                    <fieldset className="profile-setup-disease-card" key={disease.localId ?? index}>
                      <legend>Bệnh nền #{index + 1}</legend>
                      <button
                        className="profile-setup-remove-disease"
                        type="button"
                        onClick={() => removeDisease(index)}
                        disabled={loading || submitting}
                        aria-label={`Xóa bệnh nền #${index + 1}`}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                        Xóa
                      </button>
                      <div className="profile-setup-disease-grid">
                        <Field
                          id={`patient-profile-disease-${index}-diseaseName`}
                          label="Tên bệnh"
                          error={errors[`chronicDiseases.${index}.diseaseName`]}
                        >
                          <input
                            name={`chronicDiseases[${index}].diseaseName`}
                            maxLength={160}
                            value={disease.diseaseName}
                            onChange={(event) => updateDisease(index, "diseaseName", event.target.value)}
                            placeholder="Ví dụ: tăng huyết áp"
                            disabled={loading || submitting}
                          />
                        </Field>
                        <Field
                          id={`patient-profile-disease-${index}-from`}
                          label="Từ ngày"
                          error={errors[`chronicDiseases.${index}.from`]}
                        >
                          <input name={`chronicDiseases[${index}].from`} type="date" value={disease.from} onChange={(event) => updateDisease(index, "from", event.target.value)} disabled={loading || submitting} />
                        </Field>
                        <Field
                          id={`patient-profile-disease-${index}-to`}
                          label="Đến ngày"
                          error={errors[`chronicDiseases.${index}.to`]}
                        >
                          <input name={`chronicDiseases[${index}].to`} type="date" value={disease.to} onChange={(event) => updateDisease(index, "to", event.target.value)} disabled={loading || submitting} />
                        </Field>
                        <Field
                          id={`patient-profile-disease-${index}-note`}
                          label="Ghi chú"
                          error={errors[`chronicDiseases.${index}.note`]}
                        >
                          <textarea
                            name={`chronicDiseases[${index}].note`}
                            rows={3}
                            maxLength={1000}
                            value={disease.note}
                            onChange={(event) => updateDisease(index, "note", event.target.value)}
                            placeholder="Ví dụ: đang dùng thuốc hằng ngày…"
                            disabled={loading || submitting}
                          />
                        </Field>
                      </div>
                    </fieldset>
                  ))}
                </div>
              )}
            </section>

            <div className="profile-setup-actions">
              <button className="btn btn-primary" type="submit" disabled={loading || submitting}>
                {submitting ? "Đang lưu hồ sơ…" : "Hoàn tất hồ sơ"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
