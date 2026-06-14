import { useEffect, useMemo, useState } from "react";
import { Navbar } from "../components/landing/Navbar";
import { Footer } from "../components/landing/PricingSection";
import { navigate } from "../router/navigation";
import { getReturnToFromSearch } from "../router/returnIntent";
import { authApi, getStoredAuth, patientProfilesApi, setStoredAuth } from "../services/api";
import { savePatientProfileSetup } from "../services/patientProfileSetup";
import { getWorkspacePath } from "../utils/roles";

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

function ApiMessage({ message }) {
  if (!message) return null;
  return <div className={`api-message ${message.type}`}>{message.text}</div>;
}

function Field({ label, error, children }) {
  return (
    <label className={`clean-field profile-setup-field ${error ? "has-error" : ""}`}>
      <span>{label}</span>
      {children}
      {error && <small>{error}</small>}
    </label>
  );
}

function toDateInput(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function getUserId(user, auth) {
  return user?.userId ?? user?.identityId ?? user?.id ?? auth?.userId ?? auth?.identityId ?? "";
}

function toPatientForm(profile) {
  if (!profile) return {};
  return {
    bloodType: profile.bloodType ?? "",
    height: profile.height ?? "",
    weight: profile.weight ?? "",
    allergyNote: profile.allergyNote ?? "",
    chronicDiseaseNote: profile.chronicDiseaseNote ?? "",
  };
}

function validateForm(form) {
  const errors = {};
  if (!form.displayName.trim()) errors.displayName = "Vui lòng nhập họ và tên.";
  if (!form.dateOfBirth) errors.dateOfBirth = "Vui lòng chọn ngày sinh.";
  if (!form.phoneNumber.trim()) errors.phoneNumber = "Vui lòng nhập số điện thoại.";
  if (!form.address.trim()) errors.address = "Vui lòng nhập địa chỉ.";
  if (form.height && Number(form.height) <= 0) errors.height = "Chiều cao phải lớn hơn 0.";
  if (form.weight && Number(form.weight) <= 0) errors.weight = "Cân nặng phải lớn hơn 0.";
  return errors;
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
  const [patientProfile, setPatientProfile] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(Boolean(auth));
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [errors, setErrors] = useState({});

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
      const [userResult, profileResult] = await Promise.allSettled([
        authApi.me(),
        patientProfilesApi.list(1, 100),
      ]);

      if (!active) return;

      let resolvedUser = null;
      let resolvedUserId = auth.userId ?? auth.identityId ?? "";

      if (userResult.status === "fulfilled") {
        resolvedUser = userResult.value.data ?? {};
        resolvedUserId = getUserId(resolvedUser, auth);
        setUser(resolvedUser);
      } else {
        setMessage({ type: "warning", text: userResult.reason.message });
      }

      let matchedProfile = null;
      if (profileResult.status === "fulfilled") {
        const items = profileResult.value.data?.items ?? [];
        matchedProfile = items.find((item) => String(item.userId).toLowerCase() === String(resolvedUserId).toLowerCase()) ?? null;
        setPatientProfile(matchedProfile);
      }

      setForm((current) => ({
        ...current,
        displayName: resolvedUser?.displayName ?? resolvedUser?.name ?? auth.email?.split("@")[0] ?? "",
        dateOfBirth: toDateInput(resolvedUser?.dateOfBirth),
        gender: String(resolvedUser?.gender ?? "1"),
        phoneNumber: resolvedUser?.phoneNumber ?? "",
        address: resolvedUser?.address ?? "",
        ...toPatientForm(matchedProfile),
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
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setMessage({ type: "error", text: "Vui lòng kiểm tra lại các thông tin bắt buộc." });
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
        existingProfileId: patientProfile?.id,
        form,
      });

      const nextAuth = {
        ...auth,
        firstLogin: false,
        isFirstLogin: false,
        isProfileCompleted: true,
      };
      setStoredAuth(nextAuth);
      setAuth(nextAuth);
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
    <main className="workspace-root profile-setup-root">
      <section className="profile-setup-page">
        <div className="container profile-setup-shell">
          <aside className="profile-setup-intro">
            <a className="brand" href="/">
              <span className="brand-mark">+</span>
              <span>MediMate AI</span>
            </a>
            <div>
              <p className="eyebrow">First login</p>
              <h1>Hoàn thiện hồ sơ sức khỏe</h1>
              <p>
                Những thông tin này giúp MediMate cá nhân hóa tư vấn triệu chứng, gợi ý chuyên khoa và chuẩn bị dữ liệu nền trước khi bạn đi khám.
              </p>
            </div>
            <div className="profile-setup-progress">
              <div>
                <span>Tiến độ hồ sơ</span>
                <strong>{progress}%</strong>
              </div>
              <div className="profile-progress-bar">
                <span style={{ width: `${progress}%` }} />
              </div>
            </div>
          </aside>

          <form className="profile-setup-form" onSubmit={handleSubmit}>
            <div className="profile-setup-heading">
              <div>
                <p className="eyebrow">Bệnh nhân</p>
                <h2>Thông tin cá nhân</h2>
              </div>
              <span className="soft-badge">{loading ? "Đang tải" : "Bước 1/1"}</span>
            </div>

            <ApiMessage message={message} />

            <section className="profile-form-section">
              <div className="profile-section-title">
                <span>Thông tin liên hệ</span>
                <strong>Bắt buộc</strong>
              </div>
              <div className="form-two-cols">
                <Field label="Họ và tên" error={errors.displayName}>
                  <input value={form.displayName} onChange={(event) => updateField("displayName", event.target.value)} disabled={loading || submitting} />
                </Field>
                <Field label="Ngày sinh" error={errors.dateOfBirth}>
                  <input type="date" value={form.dateOfBirth} onChange={(event) => updateField("dateOfBirth", event.target.value)} disabled={loading || submitting} />
                </Field>
                <Field label="Giới tính">
                  <select value={form.gender} onChange={(event) => updateField("gender", event.target.value)} disabled={loading || submitting}>
                    <option value="1">Nam</option>
                    <option value="2">Nữ</option>
                  </select>
                </Field>
                <Field label="Số điện thoại" error={errors.phoneNumber}>
                  <input value={form.phoneNumber} onChange={(event) => updateField("phoneNumber", event.target.value)} disabled={loading || submitting} />
                </Field>
              </div>
              <Field label="Địa chỉ" error={errors.address}>
                <input value={form.address} onChange={(event) => updateField("address", event.target.value)} disabled={loading || submitting} />
              </Field>
            </section>

            <section className="profile-form-section">
              <div className="profile-section-title">
                <span>Thông tin sức khỏe</span>
                <strong>Nền tảng tư vấn</strong>
              </div>
              <div className="form-three-cols">
                <Field label="Nhóm máu">
                  <select value={form.bloodType} onChange={(event) => updateField("bloodType", event.target.value)} disabled={loading || submitting}>
                    {BLOOD_TYPES.map((type) => (
                      <option key={type || "empty"} value={type}>{type || "Chưa rõ"}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Chiều cao (cm)" error={errors.height}>
                  <input type="number" min="0" step="0.1" value={form.height} onChange={(event) => updateField("height", event.target.value)} disabled={loading || submitting} />
                </Field>
                <Field label="Cân nặng (kg)" error={errors.weight}>
                  <input type="number" min="0" step="0.1" value={form.weight} onChange={(event) => updateField("weight", event.target.value)} disabled={loading || submitting} />
                </Field>
              </div>
              <div className="form-two-cols">
                <Field label="Dị ứng">
                  <textarea rows={4} value={form.allergyNote} onChange={(event) => updateField("allergyNote", event.target.value)} placeholder="Ví dụ: thuốc, thức ăn, phấn hoa..." disabled={loading || submitting} />
                </Field>
                <Field label="Bệnh nền">
                  <textarea rows={4} value={form.chronicDiseaseNote} onChange={(event) => updateField("chronicDiseaseNote", event.target.value)} placeholder="Ví dụ: hen suyễn, tăng huyết áp..." disabled={loading || submitting} />
                </Field>
              </div>
            </section>

            <div className="profile-setup-actions">
              <button className="btn btn-primary" type="submit" disabled={loading || submitting}>
                {submitting ? "Đang lưu hồ sơ..." : "Hoàn tất hồ sơ"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
