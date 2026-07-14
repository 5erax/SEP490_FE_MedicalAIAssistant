import { cloneElement, useEffect, useId, useMemo, useRef, useState } from "react";
import { HeartPulse } from "lucide-react";
import { authApi, setStoredAuth } from "../../services/api";
import { findPatientProfileByUserId, savePatientProfileSetup } from "../../services/patientProfileSetup";
import { validateMedicalProfile, validatePersonalProfile } from "../../utils/profileValidation";
import { Dialog } from "../ui";

const BLOOD_TYPES = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const INITIAL_FORM = {
  displayName: "",
  dateOfBirth: "",
  gender: "1",
  phoneNumber: "",
  address: "",
  bloodType: "",
  allergyNote: "",
  chronicDiseaseNote: "",
  height: "",
  weight: "",
};

function getUserId(user, auth) {
  return user?.userId ?? user?.identityId ?? user?.id ?? auth?.userId ?? auth?.identityId ?? "";
}

function toDateInput(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function ApiMessage({ message }) {
  if (!message) return null;
  return (
    <div className={`api-message ${message.type}`} role={message.type === "error" ? "alert" : "status"}>
      {message.text}
    </div>
  );
}

function SetupField({ label, error, children }) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <label className={`patient-setup-modal-field ${error ? "has-error" : ""}`} htmlFor={id}>
      <span>{label}</span>
      {cloneElement(children, {
        id,
        "aria-invalid": Boolean(error),
        "aria-describedby": error ? errorId : undefined,
      })}
      {error && <small id={errorId}>{error}</small>}
    </label>
  );
}

export default function PatientProfileSetupModal({ auth, onComplete }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [errors, setErrors] = useState({});
  const [resolvedUserId, setResolvedUserId] = useState(auth?.userId ?? auth?.identityId ?? "");
  const firstFieldRef = useRef(null);

  const completedFields = useMemo(
    () => Object.entries({
      displayName: form.displayName,
      dateOfBirth: form.dateOfBirth,
      phoneNumber: form.phoneNumber,
      address: form.address,
      bloodType: form.bloodType,
      height: form.height,
      weight: form.weight,
    }).filter(([, value]) => String(value ?? "").trim()).length,
    [form],
  );
  const progress = Math.round((completedFields / 7) * 100);

  useEffect(() => {
    let active = true;

    async function loadProfileContext() {
      setLoading(true);
      setMessage(null);
      let resolvedUser = null;
      let resolvedUserId = auth?.userId ?? auth?.identityId ?? "";

      try {
        const userResult = await authApi.me();
        if (!active) return;
        resolvedUser = userResult.data ?? {};
        resolvedUserId = getUserId(resolvedUser, auth);
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
            patientOnboardingPending: auth?.patientOnboardingPending ?? true,
          };
          setStoredAuth(nextAuth);
          onComplete?.(nextAuth);
          return;
        }
      } catch (error) {
        if (!active) return;
        setMessage({ type: "warning", text: error.message });
      }

      if (!active) return;
      setResolvedUserId(resolvedUserId);
      setForm((current) => ({
        ...current,
        displayName: resolvedUser?.displayName ?? resolvedUser?.name ?? auth?.displayName ?? auth?.name ?? "",
        dateOfBirth: toDateInput(resolvedUser?.dateOfBirth),
        gender: String(resolvedUser?.gender ?? auth?.gender ?? "1"),
        phoneNumber: resolvedUser?.phoneNumber ?? auth?.phoneNumber ?? "",
        address: resolvedUser?.address ?? auth?.address ?? "",
      }));
      setLoading(false);
    }

    loadProfileContext();

    return () => {
      active = false;
    };
  }, [auth, onComplete]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
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
      return;
    }

    const userId = resolvedUserId || auth?.userId || auth?.identityId || "";
    if (!userId) {
      setMessage({ type: "error", text: "Không tìm thấy tài khoản trong phiên đăng nhập." });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      await savePatientProfileSetup({ userId, form });
      const nextAuth = {
        ...auth,
        firstLogin: false,
        isFirstLogin: false,
        isProfileCompleted: true,
        patientOnboardingPending: true,
      };
      setStoredAuth(nextAuth);
      onComplete?.(nextAuth);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      backdropClassName="patient-setup-modal-backdrop"
      className="patient-setup-modal"
      labelledBy="patient-setup-modal-title"
      describedBy="patient-setup-modal-description"
      closeOnBackdrop={false}
      closeOnEscape={false}
      initialFocusRef={firstFieldRef}
    >
      <header className="patient-setup-modal-header">
        <span className="patient-setup-modal-icon"><HeartPulse size={24} /></span>
        <div>
          <p className="eyebrow">Lần đăng nhập đầu tiên</p>
          <h2 id="patient-setup-modal-title">Hoàn thiện hồ sơ sức khỏe</h2>
          <p id="patient-setup-modal-description">
            Điền hồ sơ bệnh nhân trước khi vào trang chính để MediMate cá nhân hóa tư vấn cho bạn.
          </p>
        </div>
        <div className="patient-setup-modal-progress" aria-label={`Tiến độ hồ sơ ${progress}%`}>
          <strong>{progress}%</strong>
          <span><i style={{ width: `${progress}%` }} /></span>
        </div>
      </header>

      <form className="patient-setup-modal-form" onSubmit={handleSubmit} noValidate>
        <ApiMessage message={message} />
        <section className="patient-setup-modal-section">
          <div className="patient-setup-modal-section-title">
            <strong>Thông tin cá nhân</strong>
            <span>Bắt buộc</span>
          </div>
          <div className="patient-setup-modal-grid two">
            <SetupField label="Họ và tên" error={errors.displayName}>
              <input ref={firstFieldRef} value={form.displayName} onChange={(event) => updateField("displayName", event.target.value)} disabled={loading || submitting} />
            </SetupField>
            <SetupField label="Ngày sinh" error={errors.dateOfBirth}>
              <input type="date" value={form.dateOfBirth} onChange={(event) => updateField("dateOfBirth", event.target.value)} disabled={loading || submitting} />
            </SetupField>
            <SetupField label="Giới tính" error={errors.gender}>
              <select value={form.gender} onChange={(event) => updateField("gender", event.target.value)} disabled={loading || submitting}>
                <option value="1">Nam</option>
                <option value="2">Nữ</option>
              </select>
            </SetupField>
            <SetupField label="Số điện thoại" error={errors.phoneNumber}>
              <input type="tel" inputMode="tel" autoComplete="tel" value={form.phoneNumber} onChange={(event) => updateField("phoneNumber", event.target.value)} disabled={loading || submitting} />
            </SetupField>
          </div>
          <SetupField label="Địa chỉ" error={errors.address}>
            <input value={form.address} onChange={(event) => updateField("address", event.target.value)} disabled={loading || submitting} />
          </SetupField>
        </section>

        <section className="patient-setup-modal-section">
          <div className="patient-setup-modal-section-title">
            <strong>Thông tin sức khỏe</strong>
            <span>Nền tảng tư vấn</span>
          </div>
          <div className="patient-setup-modal-grid three">
            <SetupField label="Nhóm máu">
              <select value={form.bloodType} onChange={(event) => updateField("bloodType", event.target.value)} disabled={loading || submitting}>
                {BLOOD_TYPES.map((type) => (
                  <option key={type || "empty"} value={type}>{type || "Chưa rõ"}</option>
                ))}
              </select>
            </SetupField>
            <SetupField label="Chiều cao (cm)" error={errors.height}>
              <input type="number" min="40" max="250" step="0.1" value={form.height} onChange={(event) => updateField("height", event.target.value)} disabled={loading || submitting} />
            </SetupField>
            <SetupField label="Cân nặng (kg)" error={errors.weight}>
              <input type="number" min="2" max="500" step="0.1" value={form.weight} onChange={(event) => updateField("weight", event.target.value)} disabled={loading || submitting} />
            </SetupField>
          </div>
          <div className="patient-setup-modal-grid two">
            <SetupField label="Dị ứng" error={errors.allergyNote}>
              <textarea rows={4} maxLength={1000} value={form.allergyNote} onChange={(event) => updateField("allergyNote", event.target.value)} placeholder="Ví dụ: thuốc, thức ăn, phấn hoa..." disabled={loading || submitting} />
            </SetupField>
            <SetupField label="Bệnh nền" error={errors.chronicDiseaseNote}>
              <textarea rows={4} maxLength={1000} value={form.chronicDiseaseNote} onChange={(event) => updateField("chronicDiseaseNote", event.target.value)} placeholder="Ví dụ: hen suyễn, tăng huyết áp..." disabled={loading || submitting} />
            </SetupField>
          </div>
        </section>

        <footer className="patient-setup-modal-actions">
          <p>Thông tin này có thể chỉnh lại trong Hồ sơ cá nhân sau khi hoàn tất.</p>
          <button className="btn btn-primary" type="submit" disabled={loading || submitting}>
            {submitting ? "Đang lưu hồ sơ..." : "Hoàn tất và vào trang chính"}
          </button>
        </footer>
      </form>
    </Dialog>
  );
}
