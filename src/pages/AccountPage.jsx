import { useEffect, useMemo, useState } from "react";
import { Navbar } from "../components/landing/Navbar";
import { Footer } from "../components/landing/PricingSection";
import {
  authApi,
  clearStoredAuth,
  getStoredAuth,
  medicalDepartmentsApi,
} from "../services/api";

const SYMPTOM_SAMPLES = [
  "Đau đầu nhẹ, nghẹt mũi, mệt mỏi từ hôm qua, chưa sốt.",
  "Đau tức ngực khi leo cầu thang, hơi khó thở, tiền sử huyết áp.",
  "Đau bụng âm ỉ sau ăn, buồn nôn, không tiêu chảy.",
];

function ApiMessage({ message }) {
  if (!message) return null;
  return <div className={`api-message ${message.type}`}>{message.text}</div>;
}

function EmptyAuth() {
  return (
    <main className="landing-page">
      <Navbar />
      <section className="app-page">
        <div className="container app-empty">
          <p className="eyebrow">Workspace</p>
          <h1>Bạn cần đăng nhập để mở MediMate App.</h1>
          <p>Dashboard dùng JWT để đọc hồ sơ, quản lý chuyên khoa và chuẩn bị các tính năng Freemium.</p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="/login">Đăng nhập</a>
            <a className="btn btn-ghost" href="/signup">Tạo tài khoản</a>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

function analyzeSymptoms(text) {
  const value = text.toLowerCase();

  if (value.includes("ngực") || value.includes("khó thở") || value.includes("huyết áp")) {
    return {
      level: "Cần ưu tiên",
      department: "Tim mạch / Cấp cứu nếu nặng",
      note: "Nếu đau ngực dữ dội, khó thở tăng hoặc vã mồ hôi, hãy đi cấp cứu ngay.",
      questions: ["Cơn đau kéo dài bao lâu?", "Có lan ra tay/hàm/lưng không?", "Có tiền sử tim mạch không?"],
    };
  }

  if (value.includes("bụng") || value.includes("buồn nôn") || value.includes("tiêu chảy")) {
    return {
      level: "Theo dõi sớm",
      department: "Tiêu hóa",
      note: "Ghi lại thời điểm đau, liên quan bữa ăn và dấu hiệu mất nước nếu có.",
      questions: ["Đau vùng nào rõ nhất?", "Có sốt hoặc nôn nhiều không?", "Gần đây ăn món lạ không?"],
    };
  }

  return {
    level: "Theo dõi tại nhà",
    department: "Nội tổng quát",
    note: "Có thể theo dõi triệu chứng, nghỉ ngơi và đi khám nếu nặng lên hoặc kéo dài.",
    questions: ["Triệu chứng bắt đầu khi nào?", "Có sốt cao không?", "Đang dùng thuốc gì?"],
  };
}

export default function AccountPage() {
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [user, setUser] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [symptoms, setSymptoms] = useState(SYMPTOM_SAMPLES[0]);
  const [analysis, setAnalysis] = useState(() => analyzeSymptoms(SYMPTOM_SAMPLES[0]));
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    address: "",
    gender: "1",
    dateOfBirth: "",
    phoneNumber: "",
  });
  const [loading, setLoading] = useState(Boolean(auth));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!auth) return;
    let active = true;

    Promise.allSettled([authApi.me(), medicalDepartmentsApi.list()])
      .then(([profileResult, departmentResult]) => {
        if (!active) return;

        if (profileResult.status === "fulfilled") {
          const data = profileResult.value.data ?? {};
          setUser(data);
          setProfileForm((current) => ({
            ...current,
            displayName: data.name ?? auth.email ?? "",
          }));
        } else {
          setMessage({ type: "warning", text: profileResult.reason.message });
        }

        if (departmentResult.status === "fulfilled") {
          setDepartments(departmentResult.value.data ?? []);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [auth]);

  const displayName = useMemo(() => {
    return user?.name || auth?.email?.split("@")[0] || "bạn";
  }, [auth, user]);

  if (!auth) return <EmptyAuth />;

  function updateProfile(key, value) {
    setProfileForm((current) => ({ ...current, [key]: value }));
  }

  function handleAnalyze(event) {
    event.preventDefault();
    setAnalysis(analyzeSymptoms(symptoms));
  }

  async function handleSaveProfile(event) {
    event.preventDefault();
    const userId = user?.userId ?? auth?.userId;
    if (!userId) {
      setMessage({ type: "error", text: "Không tìm thấy userId để cập nhật hồ sơ." });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const response = await authApi.updateUser(userId, {
        ...profileForm,
        gender: Number(profileForm.gender),
        dateOfBirth: profileForm.dateOfBirth || null,
      });
      setMessage({ type: "success", text: response.message || "Đã cập nhật hồ sơ." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      // Local logout should still happen if the server session is already gone.
    } finally {
      clearStoredAuth();
      setAuth(null);
      window.location.href = "/";
    }
  }

  return (
    <main className="landing-page">
      <Navbar />
      <section className="app-page">
        <div className="container">
          <div className="app-shell">
            <aside className="app-sidebar">
              <a className="brand" href="/">
                <span className="brand-mark">+</span>
                <span>MediMate AI</span>
              </a>
              <nav className="app-menu" aria-label="Điều hướng ứng dụng">
                <a className="active" href="/app">Tổng quan</a>
                <a href="#symptom-check">Triệu chứng</a>
                <a href="/departments">Chuyên khoa</a>
                <a href="/admin/users">Người dùng</a>
                <a href="/pricing">Premium</a>
              </nav>
              <div className="plan-card">
                <span>Gói hiện tại</span>
                <strong>Freemium</strong>
                <p>Nâng cấp để mở báo cáo xu hướng và cảnh báo nâng cao.</p>
                <a className="btn btn-dark btn-small" href="/pricing">Xem Premium</a>
              </div>
            </aside>

            <div className="app-main">
              <header className="app-topbar">
                <div>
                  <p className="eyebrow">Workspace</p>
                  <h1>Chào {displayName}, hôm nay bạn muốn theo dõi gì?</h1>
                </div>
                <button className="btn btn-ghost" type="button" onClick={handleLogout}>Đăng xuất</button>
              </header>

              <ApiMessage message={message} />

              <div className="app-stats">
                <article>
                  <span>Hồ sơ</span>
                  <strong>{loading ? "..." : user?.status === 1 ? "Đã duyệt" : "Chờ duyệt"}</strong>
                </article>
                <article>
                  <span>Chuyên khoa</span>
                  <strong>{departments.length || "0"}</strong>
                </article>
                <article>
                  <span>Phiên JWT</span>
                  <strong>{auth.expiresAtUtc ? "Đang hoạt động" : "Đã lưu"}</strong>
                </article>
                <article>
                  <span>Gói</span>
                  <strong>Freemium</strong>
                </article>
              </div>

              <div className="app-work-grid">
                <section id="symptom-check" className="app-card symptom-workbench">
                  <div className="panel-title-row">
                    <div>
                      <p className="eyebrow">Demo trong app</p>
                      <h2>Nhập triệu chứng</h2>
                    </div>
                    <span className="soft-badge">Preview</span>
                  </div>

                  <form onSubmit={handleAnalyze}>
                    <textarea
                      value={symptoms}
                      onChange={(event) => setSymptoms(event.target.value)}
                      rows={6}
                      placeholder="Mô tả triệu chứng, thời điểm xuất hiện, mức độ và bệnh nền nếu có."
                    />
                    <div className="demo-samples app-samples">
                      {SYMPTOM_SAMPLES.map((sample) => (
                        <button type="button" key={sample} onClick={() => setSymptoms(sample)}>
                          {sample.slice(0, 34)}...
                        </button>
                      ))}
                    </div>
                    <button className="btn btn-primary" type="submit">Phân tích thử</button>
                  </form>
                </section>

                <section className="app-card analysis-result-card">
                  <p className="eyebrow">Kết quả tham khảo</p>
                  <h2>{analysis.department}</h2>
                  <div className="triage-level">{analysis.level}</div>
                  <p>{analysis.note}</p>
                  <ul>
                    {analysis.questions.map((question) => (
                      <li key={question}>{question}</li>
                    ))}
                  </ul>
                  <a href="/departments">Xem danh mục chuyên khoa</a>
                </section>
              </div>

              <div className="app-work-grid secondary">
                <section className="app-card">
                  <div className="panel-title-row">
                    <h2>Chuyên khoa từ backend</h2>
                    <a href="/departments">Quản lý</a>
                  </div>
                  <div className="mini-list">
                    {departments.slice(0, 4).map((department) => (
                      <article key={department.id}>
                        <strong>{department.departmentName || "Chưa đặt tên"}</strong>
                        <span>{department.description || "Chưa có mô tả."}</span>
                      </article>
                    ))}
                    {departments.length === 0 && <p className="muted-text">Chưa tải được danh mục chuyên khoa.</p>}
                  </div>
                </section>

                <form className="app-card clean-form profile-card" onSubmit={handleSaveProfile}>
                  <div className="panel-title-row">
                    <h2>Hồ sơ nhanh</h2>
                    <span className="soft-badge">/api/users/me</span>
                  </div>
                  <label className="clean-field">
                    <span>Tên hiển thị</span>
                    <input value={profileForm.displayName} onChange={(event) => updateProfile("displayName", event.target.value)} />
                  </label>
                  <label className="clean-field">
                    <span>Địa chỉ</span>
                    <input value={profileForm.address} onChange={(event) => updateProfile("address", event.target.value)} />
                  </label>
                  <div className="form-two-cols">
                    <label className="clean-field">
                      <span>Giới tính</span>
                      <select value={profileForm.gender} onChange={(event) => updateProfile("gender", event.target.value)}>
                        <option value="1">Nam</option>
                        <option value="2">Nữ</option>
                      </select>
                    </label>
                    <label className="clean-field">
                      <span>Số điện thoại</span>
                      <input value={profileForm.phoneNumber} onChange={(event) => updateProfile("phoneNumber", event.target.value)} />
                    </label>
                  </div>
                  <button className="btn btn-primary" type="submit" disabled={saving}>
                    {saving ? "Đang lưu..." : "Lưu hồ sơ"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
