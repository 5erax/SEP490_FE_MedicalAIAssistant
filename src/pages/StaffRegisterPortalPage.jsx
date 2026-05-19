import { useMemo, useState } from "react";
import { Navbar } from "../components/landing/Navbar";
import { Footer } from "../components/landing/PricingSection";
import { registerStaffApplication } from "../services/staffRegistration";

const INITIAL_FORM = {
  email: "",
  userName: "",
  password: "",
  confirmPassword: "",
  displayName: "",
  address: "",
  gender: "1",
  dateOfBirth: "",
};

const FLOW_STEPS = [
  "Thông tin tài khoản",
  "Hồ sơ nhân sự",
  "Chờ Admin duyệt",
];

function ApiMessage({ message }) {
  if (!message) return null;
  return <div className={`api-message ${message.type}`}>{message.text}</div>;
}

function Field({ label, error, hint, children }) {
  return (
    <label className={`clean-field staff-register-field ${error ? "has-error" : ""}`}>
      <span>{label}</span>
      {children}
      {error ? <small>{error}</small> : hint ? <small>{hint}</small> : null}
    </label>
  );
}

function buildPayload(form) {
  return {
    email: form.email.trim(),
    userName: form.userName.trim(),
    password: form.password,
    confirmPassword: form.confirmPassword,
    displayName: form.displayName.trim(),
    address: form.address.trim() || null,
    gender: Number(form.gender),
    dateOfBirth: form.dateOfBirth || null,
  };
}

function validateForm(form) {
  const errors = {};
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!form.email.trim()) errors.email = "Cần nhập email.";
  else if (!emailPattern.test(form.email.trim())) errors.email = "Email chưa đúng định dạng.";

  if (!form.userName.trim()) errors.userName = "Cần nhập tên đăng nhập.";
  if (!form.displayName.trim()) errors.displayName = "Cần nhập họ tên hiển thị.";
  if (!form.password) errors.password = "Cần nhập mật khẩu.";
  else if (form.password.length < 6) errors.password = "Mật khẩu nên có ít nhất 6 ký tự.";

  if (!form.confirmPassword) errors.confirmPassword = "Cần nhập lại mật khẩu.";
  else if (form.confirmPassword !== form.password) {
    errors.confirmPassword = "Mật khẩu nhập lại chưa khớp.";
  }

  if (![1, 2].includes(Number(form.gender))) errors.gender = "Giới tính không hợp lệ.";

  return errors;
}

export default function StaffRegisterPortalPage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(null);

  const completion = useMemo(() => {
    const requiredFields = ["email", "userName", "password", "confirmPassword", "displayName"];
    const done = requiredFields.filter((key) => form[key].trim()).length;
    return Math.round((done / requiredFields.length) * 100);
  }, [form]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      setMessage({ type: "error", text: "Vui lòng kiểm tra lại các trường bắt buộc." });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const response = await registerStaffApplication(buildPayload(form));
      const data = response.data ?? {};
      setRegistered({
        email: data.email || form.email,
        userId: data.userId,
        message:
          response.message ||
          "Đã gửi đăng ký staff. Tài khoản sẽ được kích hoạt sau khi Admin duyệt.",
      });
      setForm(INITIAL_FORM);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="landing-page staff-register-root">
      <Navbar />
      <section className="staff-register-page">
        <div className="container staff-register-shell">
          <aside className="staff-register-intro">
            <a className="brand" href="/">
              <span className="brand-mark">+</span>
              <span>MediMate AI</span>
            </a>

            <div>
              <p className="eyebrow">Staff Register Portal</p>
              <h1>Đăng ký tài khoản nhân sự y tế.</h1>
              <p>
                Gửi thông tin cơ bản để đội ngũ quản trị MediMate AI xác minh và kích hoạt quyền truy cập Staff Workspace.
              </p>
            </div>

            <div className="staff-register-progress">
              <div>
                <span>Mức độ hoàn thiện</span>
                <strong>{completion}%</strong>
              </div>
              <div className="profile-progress-bar" aria-hidden="true">
                <span style={{ width: `${completion}%` }} />
              </div>
            </div>

            <div className="staff-register-step-list">
              {FLOW_STEPS.map((step, index) => (
                <div key={step}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{step}</strong>
                </div>
              ))}
            </div>
          </aside>

          <section className="staff-register-card">
            {registered ? (
              <div className="staff-register-success">
                <p className="eyebrow">Đăng ký thành công</p>
                <h2>Hồ sơ staff đã được gửi.</h2>
                <p>{registered.message}</p>
                <div className="staff-register-summary">
                  <div>
                    <span>Email</span>
                    <strong>{registered.email}</strong>
                  </div>
                  {registered.userId && (
                    <div>
                      <span>User ID</span>
                      <strong>{registered.userId}</strong>
                    </div>
                  )}
                  <div>
                    <span>Trạng thái</span>
                    <strong>Chờ Admin duyệt</strong>
                  </div>
                </div>
                <div className="staff-register-actions">
                  <a className="btn btn-primary" href="/login">Đến trang đăng nhập</a>
                  <button className="btn btn-ghost" type="button" onClick={() => setRegistered(null)}>
                    Đăng ký hồ sơ khác
                  </button>
                </div>
              </div>
            ) : (
              <>
                <header className="staff-register-heading">
                  <div>
                    <p className="eyebrow">Hồ sơ staff</p>
                    <h2>Tạo yêu cầu đăng ký</h2>
                    <p>
                      Form này bám đúng model RegisterRequest của backend: chưa thu thêm chứng chỉ, khoa phòng hoặc giấy phép hành nghề khi API chưa hỗ trợ.
                    </p>
                  </div>
                  <span className="soft-badge">API thật</span>
                </header>

                <ApiMessage message={message} />

                <form className="clean-form staff-register-form" onSubmit={handleSubmit} noValidate>
                  <section className="profile-form-section">
                    <div className="profile-section-title">
                      <span>Thông tin tài khoản</span>
                      <strong>Bắt buộc</strong>
                    </div>
                    <div className="form-two-cols">
                      <Field label="Email" error={errors.email}>
                        <input
                          type="email"
                          value={form.email}
                          onChange={(event) => updateField("email", event.target.value)}
                          placeholder="staff@medimate.vn"
                          autoComplete="email"
                          required
                        />
                      </Field>
                      <Field label="Tên đăng nhập" error={errors.userName}>
                        <input
                          value={form.userName}
                          onChange={(event) => updateField("userName", event.target.value)}
                          placeholder="staff.nguyen"
                          autoComplete="username"
                          required
                        />
                      </Field>
                    </div>
                  </section>

                  <section className="profile-form-section">
                    <div className="profile-section-title">
                      <span>Thông tin nhân sự</span>
                      <strong>RegisterRequest</strong>
                    </div>
                    <div className="form-two-cols">
                      <Field label="Họ và tên hiển thị" error={errors.displayName}>
                        <input
                          value={form.displayName}
                          onChange={(event) => updateField("displayName", event.target.value)}
                          placeholder="Nguyễn Văn Staff"
                          required
                        />
                      </Field>
                      <Field label="Giới tính" error={errors.gender}>
                        <select value={form.gender} onChange={(event) => updateField("gender", event.target.value)}>
                          <option value="1">Nam</option>
                          <option value="2">Nữ</option>
                        </select>
                      </Field>
                      <Field label="Ngày sinh" hint="Backend nhận định dạng yyyy-mm-dd.">
                        <input
                          type="date"
                          value={form.dateOfBirth}
                          onChange={(event) => updateField("dateOfBirth", event.target.value)}
                        />
                      </Field>
                      <Field label="Địa chỉ">
                        <input
                          value={form.address}
                          onChange={(event) => updateField("address", event.target.value)}
                          placeholder="Hà Nội"
                        />
                      </Field>
                    </div>
                  </section>

                  <section className="profile-form-section">
                    <div className="profile-section-title">
                      <span>Bảo mật</span>
                      <strong>Cần khớp mật khẩu</strong>
                    </div>
                    <div className="form-two-cols">
                      <Field label="Mật khẩu" error={errors.password}>
                        <input
                          type="password"
                          value={form.password}
                          onChange={(event) => updateField("password", event.target.value)}
                          placeholder="Tối thiểu 6 ký tự"
                          autoComplete="new-password"
                          required
                        />
                      </Field>
                      <Field label="Nhập lại mật khẩu" error={errors.confirmPassword}>
                        <input
                          type="password"
                          value={form.confirmPassword}
                          onChange={(event) => updateField("confirmPassword", event.target.value)}
                          placeholder="Nhập lại mật khẩu"
                          autoComplete="new-password"
                          required
                        />
                      </Field>
                    </div>
                  </section>

                  <div className="staff-register-note">
                    <strong>Lưu ý:</strong>
                    <span>
                      Sau khi gửi, tài khoản staff cần được Admin duyệt bằng API approve-staff trước khi vận hành nội bộ.
                    </span>
                  </div>

                  <div className="staff-register-actions">
                    <a className="btn btn-ghost" href="/login">Đã có tài khoản</a>
                    <button className="btn btn-primary" type="submit" disabled={submitting}>
                      {submitting ? "Đang gửi đăng ký..." : "Gửi đăng ký staff"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      </section>
      <Footer />
    </main>
  );
}
