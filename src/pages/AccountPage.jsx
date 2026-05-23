import { useEffect, useMemo, useState } from "react";
import { useFeedback } from "../components/feedback/feedbackContext";
import { Navbar } from "../components/landing/Navbar";
import { Footer } from "../components/landing/PricingSection";
import {
  authApi,
  clearStoredAuth,
  getStoredAuth,
  medicalDepartmentsApi,
  usersApi,
} from "../services/api";

const EMPTY_PROFILE = {
  displayName: "",
  address: "",
  gender: "1",
  dateOfBirth: "",
  phoneNumber: "",
};

const EMPTY_DEPARTMENT = {
  departmentName: "",
  description: "",
};

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

const NEXT_MODULES = [
  ["Phân tích triệu chứng AI", "Đang chờ API SymptomAnalysisSession trong ERD."],
  ["Gợi ý bệnh viện và bác sĩ", "Đang chờ API MedicalFacility, FacilityDepartment, Doctor."],
  ["Hồ sơ y tế và thuốc", "Đang chờ API MedicalRecord, MedicationScan, TreatmentJourney."],
];

function ApiMessage({ message }) {
  if (!message) return null;
  return <div className={`api-message ${message.type}`}>{message.text}</div>;
}

function Field({ label, children }) {
  return (
    <label className="clean-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function normalizeRoles(roles = []) {
  return roles.map((role) => String(role).trim().toLowerCase()).filter(Boolean);
}

function hasRole(roles, role) {
  const wanted = role.toLowerCase();
  return roles.some((current) => {
    if (current === wanted) return true;
    if (wanted === "admin") return ["administrator", "superadmin"].includes(current);
    if (wanted === "staff") return ["doctor", "clinician", "medicalstaff"].includes(current);
    return false;
  });
}

function getUserId(user, auth) {
  return user?.userId ?? user?.identityId ?? auth?.userId ?? auth?.identityId ?? "";
}

function statusLabel(status) {
  return Number(status) === 1 ? "Đã duyệt" : "Chờ duyệt";
}

function toDateInput(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function RoleBadge({ roles }) {
  return <span className="soft-badge">{roles.length ? roles.join(", ") : "user"}</span>;
}

function EmptyAuth() {
  return (
    <main className="landing-page">
      <Navbar />
      <section className="app-page">
        <div className="container app-empty">
          <p className="eyebrow">MediMate App</p>
          <h1>Bạn cần đăng nhập để mở workspace.</h1>
          <p>
            Sau khi đăng nhập, hệ thống sẽ mở giao diện theo quyền User, Staff hoặc Admin dựa trên JWT và role backend trả về.
          </p>
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

function DepartmentList({ departments, mode = "readonly", onEdit, onDelete }) {
  return (
    <div className="record-list">
      {departments.length === 0 && <p className="muted-text">Chưa có chuyên khoa nào từ backend.</p>}
      {departments.map((department) => (
        <article className="record-card" key={department.id}>
          <div>
            <strong>{department.departmentName || "Chưa đặt tên"}</strong>
            <p>{department.description || "Chưa có mô tả."}</p>
            <small>ID: {department.id}</small>
          </div>
          {mode === "manage" && (
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

function ComingSoonCard() {
  return (
    <section className="app-card">
      <div className="panel-title-row">
        <div>
          <p className="eyebrow">ERD modules</p>
          <h2>Các chức năng lớn chưa có trong Swagger hiện tại</h2>
        </div>
        <span className="soft-badge">Disabled</span>
      </div>
      <div className="mini-list">
        {NEXT_MODULES.map(([title, copy]) => (
          <article key={title}>
            <strong>{title}</strong>
            <span>{copy}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function AccountPage() {
  const { confirmAction, showToast } = useFeedback();
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [user, setUser] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [pageInfo, setPageInfo] = useState({ pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 });
  const [activeActor, setActiveActor] = useState("user");
  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE);
  const [departmentForm, setDepartmentForm] = useState(EMPTY_DEPARTMENT);
  const [editingDepartmentId, setEditingDepartmentId] = useState("");
  const [staffForm, setStaffForm] = useState(EMPTY_STAFF);
  const [loading, setLoading] = useState(Boolean(auth));
  const [usersLoading, setUsersLoading] = useState(true);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingDepartment, setSavingDepartment] = useState(false);
  const [savingStaff, setSavingStaff] = useState(false);
  const [globalMessage, setGlobalMessage] = useState(null);
  const [profileMessage, setProfileMessage] = useState(null);
  const [departmentMessage, setDepartmentMessage] = useState(null);
  const [adminMessage, setAdminMessage] = useState(null);
  const [staffMessage, setStaffMessage] = useState(null);

  const roles = useMemo(() => normalizeRoles(user?.roles ?? auth?.roles ?? []), [auth, user]);
  const isAdmin = hasRole(roles, "admin");
  const isStaff = isAdmin || hasRole(roles, "staff");
  const currentActor = (activeActor === "admin" && !isAdmin) || (activeActor === "staff" && !isStaff)
    ? "user"
    : activeActor;
  const displayName = user?.name || user?.displayName || auth?.email?.split("@")[0] || "bạn";
  const currentUserId = getUserId(user, auth);

  useEffect(() => {
    if (!auth) return;
    let active = true;

    Promise.allSettled([authApi.me(), medicalDepartmentsApi.list()])
      .then(([profileResult, departmentResult]) => {
        if (!active) return;

        if (profileResult.status === "fulfilled") {
          const data = profileResult.value.data ?? {};
          setUser(data);
          setProfileForm({
            displayName: data.name ?? data.displayName ?? auth.email ?? "",
            address: data.address ?? "",
            gender: String(data.gender ?? "1"),
            dateOfBirth: toDateInput(data.dateOfBirth),
            phoneNumber: data.phoneNumber ?? "",
          });
        } else {
          setGlobalMessage({ type: "warning", text: profileResult.reason.message });
        }

        if (departmentResult.status === "fulfilled") {
          setDepartments(departmentResult.value.data ?? []);
        } else {
          setDepartmentMessage({ type: "error", text: departmentResult.reason.message });
        }
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
        setDepartmentsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [auth]);

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
        if (active) setAdminMessage({ type: "error", text: error.message });
      })
      .finally(() => {
        if (active) setUsersLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isAdmin, pageInfo.pageSize]);

  if (!auth) return <EmptyAuth />;

  function updateProfile(key, value) {
    setProfileForm((current) => ({ ...current, [key]: value }));
  }

  function updateStaff(key, value) {
    setStaffForm((current) => ({ ...current, [key]: value }));
  }

  async function loadDepartments() {
    setDepartmentsLoading(true);
    setDepartmentMessage(null);
    try {
      const response = await medicalDepartmentsApi.list();
      setDepartments(response.data ?? []);
    } catch (error) {
      setDepartmentMessage({ type: "error", text: error.message });
    } finally {
      setDepartmentsLoading(false);
    }
  }

  async function loadUsers(pageNumber = pageInfo.pageNumber) {
    if (!isAdmin) return;
    setUsersLoading(true);
    setAdminMessage(null);
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
      setAdminMessage({ type: "error", text: error.message });
    } finally {
      setUsersLoading(false);
    }
  }

  async function handleSaveProfile(event) {
    event.preventDefault();
    if (!currentUserId) {
      setProfileMessage({ type: "error", text: "Không tìm thấy userId trong phiên đăng nhập." });
      return;
    }

    setSavingProfile(true);
    setProfileMessage(null);
    try {
      const response = await authApi.updateUser(currentUserId, {
        ...profileForm,
        gender: Number(profileForm.gender),
        dateOfBirth: profileForm.dateOfBirth || null,
      });
      setProfileMessage({ type: "success", text: response.message || "Đã cập nhật hồ sơ cá nhân." });
    } catch (error) {
      setProfileMessage({ type: "error", text: error.message });
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
      const action = editingDepartmentId
        ? medicalDepartmentsApi.update(editingDepartmentId, departmentForm)
        : medicalDepartmentsApi.create(departmentForm);
      const response = await action;
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
    const confirmed = await confirmAction({
      title: "Xóa chuyên khoa?",
      message: "Chuyên khoa sẽ bị xóa khỏi danh mục và không còn hiển thị cho người dùng.",
      confirmLabel: "Xóa chuyên khoa",
      tone: "danger",
    });
    if (!confirmed) return;
    setDepartmentMessage(null);
    try {
      const response = await medicalDepartmentsApi.remove(id);
      setDepartmentMessage({ type: "success", text: response.message || "Đã xóa chuyên khoa." });
      showToast({ type: "success", title: "Đã xóa chuyên khoa", message: response.message || "Danh mục đã được cập nhật." });
      await loadDepartments();
    } catch (error) {
      setDepartmentMessage({ type: "error", text: error.message });
    }
  }

  async function handleApproveUser(userId) {
    setAdminMessage(null);
    try {
      const response = await usersApi.approve(userId);
      setAdminMessage({ type: "success", text: response.message || "Đã duyệt người dùng." });
      await loadUsers();
    } catch (error) {
      setAdminMessage({ type: "error", text: error.message });
    }
  }

  async function handleDeleteUser(userId) {
    const confirmed = await confirmAction({
      title: "Xóa người dùng?",
      message: "Tài khoản này sẽ bị xóa khỏi danh sách. Hãy chắc chắn trước khi tiếp tục.",
      confirmLabel: "Xóa người dùng",
      tone: "danger",
    });
    if (!confirmed) return;
    setAdminMessage(null);
    try {
      const response = await usersApi.remove(userId);
      setAdminMessage({ type: "success", text: response.message || "Đã xóa người dùng." });
      showToast({ type: "success", title: "Đã xóa người dùng", message: response.message || "Danh sách đã được cập nhật." });
      await loadUsers();
    } catch (error) {
      setAdminMessage({ type: "error", text: error.message });
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
      // Local logout remains valid if the backend session has already expired.
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

              <nav className="app-menu" aria-label="Điều hướng dashboard">
                <button className={currentActor === "user" ? "active" : ""} type="button" onClick={() => setActiveActor("user")}>Patient / User</button>
                <button className={currentActor === "staff" ? "active" : ""} type="button" disabled={!isStaff} onClick={() => setActiveActor("staff")}>Staff</button>
                <button className={currentActor === "admin" ? "active" : ""} type="button" disabled={!isAdmin} onClick={() => setActiveActor("admin")}>Admin</button>
                <a href="/departments">Trang chuyên khoa</a>
                <a href="/pricing">Gói dịch vụ</a>
              </nav>

              <div className="plan-card">
                <span>Phiên hiện tại</span>
                <strong>{roles.length ? roles.join(", ") : "user"}</strong>
                <p>Giao diện chỉ bật các chức năng có API trong Swagger hiện tại và role backend cho phép.</p>
                <button className="btn btn-dark btn-small" type="button" onClick={handleLogout}>Đăng xuất</button>
              </div>
            </aside>

            <div className="app-main">
              <header className="app-topbar">
                <div>
                  <p className="eyebrow">Workspace</p>
                  <h1>Chào {displayName}</h1>
                  <p className="muted-text">Dashboard theo 3 actor, dùng các API hiện có: Auth, Users và MedicalDepartments.</p>
                </div>
                <RoleBadge roles={roles} />
              </header>

              <ApiMessage message={globalMessage} />

              <div className="actor-switcher">
                <button className={currentActor === "user" ? "active" : ""} type="button" onClick={() => setActiveActor("user")}>
                  <strong>Patient / User</strong>
                  <span>Hồ sơ cá nhân, xem danh mục chuyên khoa</span>
                </button>
                <button className={currentActor === "staff" ? "active" : ""} type="button" disabled={!isStaff} onClick={() => setActiveActor("staff")}>
                  <strong>Staff</strong>
                  <span>Quản lý chuyên khoa từ MedicalDepartments API</span>
                </button>
                <button className={currentActor === "admin" ? "active" : ""} type="button" disabled={!isAdmin} onClick={() => setActiveActor("admin")}>
                  <strong>Admin</strong>
                  <span>Quản lý user và tạo tài khoản staff</span>
                </button>
              </div>

              <div className="app-stats">
                <article>
                  <span>Tài khoản</span>
                  <strong>{loading ? "Đang tải" : statusLabel(user?.status)}</strong>
                </article>
                <article>
                  <span>Role</span>
                  <strong>{roles.length ? roles.join(", ") : "user"}</strong>
                </article>
                <article>
                  <span>Chuyên khoa</span>
                  <strong>{departmentsLoading ? "..." : departments.length}</strong>
                </article>
                <article>
                  <span>User backend</span>
                  <strong>{isAdmin ? pageInfo.totalCount : "Admin only"}</strong>
                </article>
              </div>

              {currentActor === "user" && (
                <section className="actor-panel">
                  <div className="app-work-grid">
                    <form className="app-card clean-form" onSubmit={handleSaveProfile}>
                      <div className="panel-title-row">
                        <div>
                          <p className="eyebrow">Patient / User</p>
                          <h2>Hồ sơ cá nhân</h2>
                        </div>
                        <span className="soft-badge">PUT /api/users/:userId</span>
                      </div>
                      <ApiMessage message={profileMessage} />
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

                    <section className="app-card">
                      <div className="panel-title-row">
                        <div>
                          <p className="eyebrow">Directory</p>
                          <h2>Danh mục chuyên khoa</h2>
                        </div>
                        <button className="btn btn-ghost btn-small" type="button" onClick={loadDepartments}>Tải lại</button>
                      </div>
                      <ApiMessage message={departmentMessage} />
                      {departmentsLoading ? <p className="muted-text">Đang tải chuyên khoa...</p> : <DepartmentList departments={departments} />}
                    </section>
                  </div>

                  <ComingSoonCard />
                </section>
              )}

              {currentActor === "staff" && (
                <section className="actor-panel">
                  <div className="app-work-grid secondary">
                    <section className="app-card">
                      <div className="panel-title-row">
                        <div>
                          <p className="eyebrow">Staff</p>
                          <h2>Danh sách chuyên khoa</h2>
                        </div>
                        <button className="btn btn-ghost btn-small" type="button" onClick={loadDepartments}>Tải lại</button>
                      </div>
                      <ApiMessage message={departmentMessage} />
                      {departmentsLoading ? (
                        <p className="muted-text">Đang tải chuyên khoa...</p>
                      ) : (
                        <DepartmentList
                          departments={departments}
                          mode="manage"
                          onEdit={startEditDepartment}
                          onDelete={handleDeleteDepartment}
                        />
                      )}
                    </section>

                    <form className="app-card clean-form" onSubmit={handleSaveDepartment}>
                      <div className="panel-title-row">
                        <div>
                          <p className="eyebrow">MedicalDepartments</p>
                          <h2>{editingDepartmentId ? "Cập nhật chuyên khoa" : "Tạo chuyên khoa"}</h2>
                        </div>
                        <span className="soft-badge">{editingDepartmentId ? "PUT" : "POST"}</span>
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
                          rows={6}
                          value={departmentForm.description}
                          onChange={(event) => setDepartmentForm({ ...departmentForm, description: event.target.value })}
                          placeholder="Mô tả ngắn về chuyên khoa"
                        />
                      </Field>
                      <div className="record-actions">
                        <button className="btn btn-primary" type="submit" disabled={savingDepartment}>
                          {savingDepartment ? "Đang lưu..." : editingDepartmentId ? "Lưu cập nhật" : "Tạo chuyên khoa"}
                        </button>
                        {editingDepartmentId && (
                          <button className="btn btn-ghost" type="button" onClick={resetDepartmentForm}>Hủy</button>
                        )}
                      </div>
                    </form>
                  </div>
                </section>
              )}

              {currentActor === "admin" && (
                <section className="actor-panel">
                  <div className="app-work-grid secondary">
                    <section className="app-card">
                      <div className="panel-title-row">
                        <div>
                          <p className="eyebrow">Admin</p>
                          <h2>Quản lý người dùng</h2>
                        </div>
                        <button className="btn btn-ghost btn-small" type="button" onClick={() => loadUsers()}>Tải lại</button>
                      </div>
                      <ApiMessage message={adminMessage} />
                      {usersLoading ? (
                        <p className="muted-text">Đang tải người dùng...</p>
                      ) : (
                        <div className="user-table">
                          {users.length === 0 && <p className="muted-text">Chưa có dữ liệu người dùng.</p>}
                          {users.map((item) => (
                            <article className="user-row" key={item.identityId}>
                              <div>
                                <strong>{item.displayName || item.email || "Người dùng"}</strong>
                                <span>{item.email || "Chưa có email"}</span>
                                <small>ID: {item.identityId}</small>
                              </div>
                              <div className="user-meta">
                                <span>{statusLabel(item.status)}</span>
                                <span>{item.isDeleted ? "Đã xóa" : "Hoạt động"}</span>
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
                        <span>Trang {pageInfo.pageNumber} / {pageInfo.totalPages || 1} · {pageInfo.totalCount} user</span>
                        <button className="btn btn-ghost btn-small" type="button" disabled={pageInfo.pageNumber >= pageInfo.totalPages} onClick={() => loadUsers(pageInfo.pageNumber + 1)}>Sau</button>
                      </div>
                    </section>

                    <form className="app-card clean-form" onSubmit={handleCreateStaff}>
                      <div className="panel-title-row">
                        <div>
                          <p className="eyebrow">Staff account</p>
                          <h2>Tạo tài khoản staff</h2>
                        </div>
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
                      <button className="btn btn-primary" type="submit" disabled={savingStaff}>
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
