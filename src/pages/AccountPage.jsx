import { useEffect, useMemo, useState } from "react";
import { Navbar } from "../components/landing/Navbar";
import { Footer } from "../components/landing/PricingSection";
import {
  authApi,
  clearStoredAuth,
  getStoredAuth,
  medicalDepartmentsApi,
  usersApi,
} from "../services/api";

const SYMPTOM_SAMPLES = [
  "Đau đầu nhẹ, nghẹt mũi, mệt mỏi từ hôm qua, chưa sốt.",
  "Đau tức ngực khi leo cầu thang, hơi khó thở, tiền sử huyết áp.",
  "Đau bụng âm ỉ sau ăn, buồn nôn, không tiêu chảy.",
];

const EMPTY_DEPARTMENT = { departmentName: "", description: "" };
const EMPTY_STAFF = {
  email: "",
  userName: "",
  password: "",
  confirmPassword: "",
  displayName: "",
  address: "",
  gender: "1",
  dateOfBirth: "",
};

function ApiMessage({ message }) {
  if (!message) return null;
  return <div className={`api-message ${message.type}`}>{message.text}</div>;
}

function normalizeRoles(roles = []) {
  return roles.map((role) => String(role).toLowerCase());
}

function hasRole(roles, role) {
  return roles.includes(role.toLowerCase());
}

function statusLabel(status) {
  return status === 1 ? "Đã duyệt" : "Chờ duyệt";
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

function EmptyAuth() {
  return (
    <main className="landing-page">
      <Navbar />
      <section className="app-page">
        <div className="container app-empty">
          <p className="eyebrow">Workspace</p>
          <h1>Bạn cần đăng nhập để mở MediMate App.</h1>
          <p>Dashboard dùng JWT để đọc hồ sơ, quản lý chuyên khoa, phê duyệt người dùng và tạo tài khoản staff theo quyền backend.</p>
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

function Field({ label, children }) {
  return (
    <label className="clean-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function RoleBadge({ roles }) {
  const label = roles.length ? roles.join(", ") : "User";
  return <span className="soft-badge">{label}</span>;
}

export default function AccountPage() {
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [user, setUser] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [pageInfo, setPageInfo] = useState({ pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 });
  const [activeActor, setActiveActor] = useState("user");
  const [symptoms, setSymptoms] = useState(SYMPTOM_SAMPLES[0]);
  const [analysis, setAnalysis] = useState(() => analyzeSymptoms(SYMPTOM_SAMPLES[0]));
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    address: "",
    gender: "1",
    dateOfBirth: "",
    phoneNumber: "",
  });
  const [departmentForm, setDepartmentForm] = useState(EMPTY_DEPARTMENT);
  const [editingDepartmentId, setEditingDepartmentId] = useState("");
  const [staffForm, setStaffForm] = useState(EMPTY_STAFF);
  const [loading, setLoading] = useState(Boolean(auth));
  const [usersLoading, setUsersLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingDepartment, setSavingDepartment] = useState(false);
  const [savingStaff, setSavingStaff] = useState(false);
  const [message, setMessage] = useState(null);
  const [departmentMessage, setDepartmentMessage] = useState(null);
  const [userMessage, setUserMessage] = useState(null);
  const [staffMessage, setStaffMessage] = useState(null);

  const roles = useMemo(() => normalizeRoles(user?.roles ?? auth?.roles ?? []), [auth, user]);
  const isStaff = hasRole(roles, "staff") || hasRole(roles, "admin");
  const isAdmin = hasRole(roles, "admin");
  const availableActors = useMemo(() => {
    const actors = ["user"];
    if (isStaff) actors.push("staff");
    if (isAdmin) actors.push("admin");
    return actors;
  }, [isAdmin, isStaff]);

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
        } else {
          setDepartmentMessage({ type: "error", text: departmentResult.reason.message });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [auth]);

  const currentActor = availableActors.includes(activeActor)
    ? activeActor
    : availableActors[availableActors.length - 1] ?? "user";

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;

    usersApi.list(1, pageInfo.pageSize)
      .then((response) => {
        if (!active) return;
        const data = response.data ?? {};
        setUsers(data.items ?? []);
        setPageInfo({
          pageNumber: data.pageNumber ?? 1,
          pageSize: data.pageSize ?? pageInfo.pageSize,
          totalCount: data.totalCount ?? 0,
          totalPages: data.totalPages ?? 1,
        });
      })
      .catch((error) => {
        if (active) setUserMessage({ type: "error", text: error.message });
      })
      .finally(() => {
        if (active) setUsersLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isAdmin, pageInfo.pageSize]);

  const displayName = useMemo(() => {
    return user?.name || auth?.email?.split("@")[0] || "bạn";
  }, [auth, user]);

  if (!auth) return <EmptyAuth />;

  async function loadDepartments() {
    setDepartmentMessage(null);
    try {
      const response = await medicalDepartmentsApi.list();
      setDepartments(response.data ?? []);
    } catch (error) {
      setDepartmentMessage({ type: "error", text: error.message });
    }
  }

  async function loadUsers(pageNumber = pageInfo.pageNumber) {
    setUsersLoading(true);
    setUserMessage(null);
    try {
      const response = await usersApi.list(pageNumber, pageInfo.pageSize);
      const data = response.data ?? {};
      setUsers(data.items ?? []);
      setPageInfo({
        pageNumber: data.pageNumber ?? pageNumber,
        pageSize: data.pageSize ?? pageInfo.pageSize,
        totalCount: data.totalCount ?? 0,
        totalPages: data.totalPages ?? 1,
      });
    } catch (error) {
      setUserMessage({ type: "error", text: error.message });
    } finally {
      setUsersLoading(false);
    }
  }

  function updateProfile(key, value) {
    setProfileForm((current) => ({ ...current, [key]: value }));
  }

  function updateStaff(key, value) {
    setStaffForm((current) => ({ ...current, [key]: value }));
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

    setSavingProfile(true);
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
      setSavingProfile(false);
    }
  }

  function startEditDepartment(department) {
    setEditingDepartmentId(department.id);
    setDepartmentForm({
      departmentName: department.departmentName ?? "",
      description: department.description ?? "",
    });
  }

  function resetDepartmentForm() {
    setEditingDepartmentId("");
    setDepartmentForm(EMPTY_DEPARTMENT);
  }

  async function handleSaveDepartment(event) {
    event.preventDefault();
    setSavingDepartment(true);
    setDepartmentMessage(null);
    try {
      const response = editingDepartmentId
        ? await medicalDepartmentsApi.update(editingDepartmentId, departmentForm)
        : await medicalDepartmentsApi.create(departmentForm);
      setDepartmentMessage({
        type: "success",
        text: response.message || (editingDepartmentId ? "Đã cập nhật chuyên khoa." : "Đã tạo chuyên khoa."),
      });
      resetDepartmentForm();
      await loadDepartments();
    } catch (error) {
      setDepartmentMessage({ type: "error", text: error.message });
    } finally {
      setSavingDepartment(false);
    }
  }

  async function handleDeleteDepartment(id) {
    setDepartmentMessage(null);
    try {
      const response = await medicalDepartmentsApi.remove(id);
      setDepartmentMessage({ type: "success", text: response.message || "Đã xóa chuyên khoa." });
      await loadDepartments();
    } catch (error) {
      setDepartmentMessage({ type: "error", text: error.message });
    }
  }

  async function handleApproveUser(userId) {
    setUserMessage(null);
    try {
      const response = await usersApi.approve(userId);
      setUserMessage({ type: "success", text: response.message || "Đã duyệt người dùng." });
      await loadUsers();
    } catch (error) {
      setUserMessage({ type: "error", text: error.message });
    }
  }

  async function handleDeleteUser(userId) {
    setUserMessage(null);
    try {
      const response = await usersApi.remove(userId);
      setUserMessage({ type: "success", text: response.message || "Đã xóa người dùng." });
      await loadUsers();
    } catch (error) {
      setUserMessage({ type: "error", text: error.message });
    }
  }

  async function handleCreateStaff(event) {
    event.preventDefault();
    setSavingStaff(true);
    setStaffMessage(null);
    try {
      const response = await authApi.registerStaff({
        ...staffForm,
        gender: Number(staffForm.gender),
        dateOfBirth: staffForm.dateOfBirth || null,
      });
      setStaffMessage({ type: "success", text: response.message || "Đã tạo tài khoản staff." });
      setStaffForm(EMPTY_STAFF);
      await loadUsers();
    } catch (error) {
      setStaffMessage({ type: "error", text: error.message });
    } finally {
      setSavingStaff(false);
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
                <a className={currentActor === "user" ? "active" : ""} href="#user" onClick={() => setActiveActor("user")}>User</a>
                <a className={currentActor === "staff" ? "active" : ""} href="#staff" onClick={() => isStaff && setActiveActor("staff")}>Staff</a>
                <a className={currentActor === "admin" ? "active" : ""} href="#admin" onClick={() => isAdmin && setActiveActor("admin")}>Admin</a>
                <a href="/departments">Danh mục chuyên khoa</a>
                <a href="/pricing">Premium</a>
              </nav>
              <div className="plan-card">
                <span>Vai trò hiện tại</span>
                <strong>{roles.length ? roles.join(", ") : "User"}</strong>
                <p>Backend quyết định quyền thao tác. Frontend chỉ bật đúng nhóm chức năng tương ứng.</p>
                <button className="btn btn-dark btn-small" type="button" onClick={handleLogout}>Đăng xuất</button>
              </div>
            </aside>

            <div className="app-main">
              <header className="app-topbar">
                <div>
                  <p className="eyebrow">Workspace</p>
                  <h1>Chào {displayName}, chọn vai trò để làm việc.</h1>
                </div>
                <RoleBadge roles={roles} />
              </header>

              <ApiMessage message={message} />

              <div className="actor-switcher">
                <button className={currentActor === "user" ? "active" : ""} type="button" onClick={() => setActiveActor("user")}>
                  <strong>User</strong>
                  <span>Hồ sơ, demo triệu chứng, xem chuyên khoa</span>
                </button>
                <button className={currentActor === "staff" ? "active" : ""} type="button" disabled={!isStaff} onClick={() => setActiveActor("staff")}>
                  <strong>Staff</strong>
                  <span>Quản lý medical departments</span>
                </button>
                <button className={currentActor === "admin" ? "active" : ""} type="button" disabled={!isAdmin} onClick={() => setActiveActor("admin")}>
                  <strong>Admin</strong>
                  <span>Duyệt/xóa user, tạo staff</span>
                </button>
              </div>

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
                  <span>Người dùng</span>
                  <strong>{isAdmin ? pageInfo.totalCount : "Role admin"}</strong>
                </article>
                <article>
                  <span>Phiên JWT</span>
                  <strong>{auth.expiresAtUtc ? "Đang hoạt động" : "Đã lưu"}</strong>
                </article>
              </div>

              {currentActor === "user" && (
                <>
                  <div className="app-work-grid">
                    <section id="user" className="app-card symptom-workbench">
                      <div className="panel-title-row">
                        <div>
                          <p className="eyebrow">User</p>
                          <h2>Nhập triệu chứng</h2>
                        </div>
                        <span className="soft-badge">Local preview</span>
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
                      <a href="#department-directory">Xem danh mục chuyên khoa</a>
                    </section>
                  </div>

                  <div className="app-work-grid secondary">
                    <section id="department-directory" className="app-card">
                      <div className="panel-title-row">
                        <h2>Danh mục chuyên khoa</h2>
                        <button className="btn btn-ghost btn-small" type="button" onClick={loadDepartments}>Tải lại</button>
                      </div>
                      <DepartmentList departments={departments} readonly />
                    </section>

                    <form className="app-card clean-form profile-card" onSubmit={handleSaveProfile}>
                      <div className="panel-title-row">
                        <h2>Hồ sơ cá nhân</h2>
                        <span className="soft-badge">PUT /api/users/:id</span>
                      </div>
                      <Field label="Tên hiển thị">
                        <input value={profileForm.displayName} onChange={(event) => updateProfile("displayName", event.target.value)} />
                      </Field>
                      <Field label="Địa chỉ">
                        <input value={profileForm.address} onChange={(event) => updateProfile("address", event.target.value)} />
                      </Field>
                      <div className="form-two-cols">
                        <Field label="Giới tính">
                          <select value={profileForm.gender} onChange={(event) => updateProfile("gender", event.target.value)}>
                            <option value="1">Nam</option>
                            <option value="2">Nữ</option>
                          </select>
                        </Field>
                        <Field label="Ngày sinh">
                          <input type="date" value={profileForm.dateOfBirth} onChange={(event) => updateProfile("dateOfBirth", event.target.value)} />
                        </Field>
                      </div>
                      <Field label="Số điện thoại">
                        <input value={profileForm.phoneNumber} onChange={(event) => updateProfile("phoneNumber", event.target.value)} />
                      </Field>
                      <button className="btn btn-primary" type="submit" disabled={savingProfile}>
                        {savingProfile ? "Đang lưu..." : "Lưu hồ sơ"}
                      </button>
                    </form>
                  </div>
                </>
              )}

              {currentActor === "staff" && (
                <section id="staff" className="actor-panel">
                  {!isStaff && <ApiMessage message={{ type: "warning", text: "Tài khoản hiện tại chưa có quyền Staff/Admin." }} />}
                  <div className="app-work-grid secondary">
                    <section className="app-card">
                      <div className="panel-title-row">
                        <div>
                          <p className="eyebrow">Staff</p>
                          <h2>Quản lý chuyên khoa</h2>
                        </div>
                        <button className="btn btn-ghost btn-small" type="button" onClick={loadDepartments}>Tải lại</button>
                      </div>
                      <ApiMessage message={departmentMessage} />
                      <DepartmentList
                        departments={departments}
                        onEdit={startEditDepartment}
                        onDelete={handleDeleteDepartment}
                      />
                    </section>

                    <form className="app-card clean-form" onSubmit={handleSaveDepartment}>
                      <div className="panel-title-row">
                        <h2>{editingDepartmentId ? "Cập nhật chuyên khoa" : "Tạo chuyên khoa"}</h2>
                        <span className="soft-badge">MedicalDepartments</span>
                      </div>
                      <Field label="Tên chuyên khoa">
                        <input
                          value={departmentForm.departmentName}
                          onChange={(event) => setDepartmentForm({ ...departmentForm, departmentName: event.target.value })}
                          placeholder="Ví dụ: Tim mạch"
                          required
                        />
                      </Field>
                      <Field label="Mô tả">
                        <textarea
                          rows={5}
                          value={departmentForm.description}
                          onChange={(event) => setDepartmentForm({ ...departmentForm, description: event.target.value })}
                          placeholder="Mô tả ngắn về chuyên khoa"
                        />
                      </Field>
                      <div className="record-actions">
                        <button className="btn btn-primary" type="submit" disabled={savingDepartment || !isStaff}>
                          {savingDepartment ? "Đang lưu..." : editingDepartmentId ? "Lưu cập nhật" : "Tạo mới"}
                        </button>
                        {editingDepartmentId && (
                          <button className="btn btn-ghost" type="button" onClick={resetDepartmentForm}>Hủy sửa</button>
                        )}
                      </div>
                    </form>
                  </div>
                </section>
              )}

              {currentActor === "admin" && (
                <section id="admin" className="actor-panel">
                  {!isAdmin && <ApiMessage message={{ type: "warning", text: "Tài khoản hiện tại chưa có quyền Admin." }} />}
                  <div className="app-work-grid secondary">
                    <section className="app-card">
                      <div className="panel-title-row">
                        <div>
                          <p className="eyebrow">Admin</p>
                          <h2>Người dùng</h2>
                        </div>
                        <button className="btn btn-ghost btn-small" type="button" disabled={!isAdmin} onClick={() => loadUsers()}>Tải lại</button>
                      </div>
                      <ApiMessage message={userMessage} />
                      {usersLoading ? (
                        <p className="muted-text">Đang tải người dùng...</p>
                      ) : (
                        <div className="user-table">
                          {users.length === 0 && <p className="muted-text">Chưa có dữ liệu người dùng.</p>}
                          {users.map((item) => (
                            <article className="user-row" key={item.identityId}>
                              <div>
                                <strong>{item.displayName || item.email || "Người dùng"}</strong>
                                <span>{item.email}</span>
                                <small>{item.identityId}</small>
                              </div>
                              <div className="user-meta">
                                <span>{statusLabel(item.status)}</span>
                                <span>{item.isDeleted ? "Đã xóa mềm" : "Đang hoạt động"}</span>
                              </div>
                              <div className="record-actions">
                                <button className="btn btn-ghost btn-small" type="button" onClick={() => handleApproveUser(item.identityId)}>Duyệt</button>
                                <button className="btn btn-dark btn-small" type="button" onClick={() => handleDeleteUser(item.identityId)}>Xóa</button>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                      <div className="pagination-row">
                        <button className="btn btn-ghost btn-small" type="button" disabled={pageInfo.pageNumber <= 1} onClick={() => loadUsers(pageInfo.pageNumber - 1)}>Trước</button>
                        <span>Trang {pageInfo.pageNumber} / {pageInfo.totalPages || 1} · {pageInfo.totalCount} người dùng</span>
                        <button className="btn btn-ghost btn-small" type="button" disabled={pageInfo.pageNumber >= pageInfo.totalPages} onClick={() => loadUsers(pageInfo.pageNumber + 1)}>Sau</button>
                      </div>
                    </section>

                    <form className="app-card clean-form" onSubmit={handleCreateStaff}>
                      <div className="panel-title-row">
                        <h2>Tạo tài khoản staff</h2>
                        <span className="soft-badge">POST /register/staff</span>
                      </div>
                      <ApiMessage message={staffMessage} />
                      <div className="form-two-cols">
                        <Field label="Email">
                          <input type="email" value={staffForm.email} onChange={(event) => updateStaff("email", event.target.value)} required />
                        </Field>
                        <Field label="Username">
                          <input value={staffForm.userName} onChange={(event) => updateStaff("userName", event.target.value)} required />
                        </Field>
                        <Field label="Tên hiển thị">
                          <input value={staffForm.displayName} onChange={(event) => updateStaff("displayName", event.target.value)} required />
                        </Field>
                        <Field label="Địa chỉ">
                          <input value={staffForm.address} onChange={(event) => updateStaff("address", event.target.value)} />
                        </Field>
                        <Field label="Mật khẩu">
                          <input type="password" value={staffForm.password} onChange={(event) => updateStaff("password", event.target.value)} required />
                        </Field>
                        <Field label="Nhập lại mật khẩu">
                          <input type="password" value={staffForm.confirmPassword} onChange={(event) => updateStaff("confirmPassword", event.target.value)} required />
                        </Field>
                        <Field label="Giới tính">
                          <select value={staffForm.gender} onChange={(event) => updateStaff("gender", event.target.value)}>
                            <option value="1">Nam</option>
                            <option value="2">Nữ</option>
                          </select>
                        </Field>
                        <Field label="Ngày sinh">
                          <input type="date" value={staffForm.dateOfBirth} onChange={(event) => updateStaff("dateOfBirth", event.target.value)} />
                        </Field>
                      </div>
                      <button className="btn btn-primary" type="submit" disabled={savingStaff || !isAdmin}>
                        {savingStaff ? "Đang tạo..." : "Tạo staff"}
                      </button>
                    </form>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

function DepartmentList({ departments, readonly = false, onEdit, onDelete }) {
  return (
    <div className="record-list">
      {departments.length === 0 && <p className="muted-text">Chưa có chuyên khoa nào.</p>}
      {departments.map((department) => (
        <article className="record-card" key={department.id}>
          <div>
            <strong>{department.departmentName || "Chưa đặt tên"}</strong>
            <p>{department.description || "Chưa có mô tả."}</p>
            <small>{department.id}</small>
          </div>
          {!readonly && (
            <div className="record-actions">
              <button className="btn btn-ghost btn-small" type="button" onClick={() => onEdit(department)}>Sửa</button>
              <button className="btn btn-dark btn-small" type="button" onClick={() => onDelete(department.id)}>Xóa</button>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
