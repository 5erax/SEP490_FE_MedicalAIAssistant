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
import { hasRole, normalizeRoles } from "../utils/roles";
import "../styles/operator-workspace.css";

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

function Field({ label, children }) {
  return (
    <label className="clean-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function statusLabel(status) {
  return Number(status) === 1 ? "Đã duyệt" : "Chờ duyệt";
}

function formatRoles(roles) {
  return roles.length ? roles.join(", ") : "admin";
}

function AccessDenied({ auth, roles }) {
  const path = hasRole(roles, "staff") ? "/app/staff" : "/dashboard";

  return (
    <main className="workspace-root admin-operator">
      <section className="app-page">
        <div className="container app-empty">
          <p className="eyebrow">Không có quyền Admin</p>
          <h1>Tài khoản này không thể mở Admin Workspace.</h1>
          <p>
            Phiên hiện tại là {auth?.email || "người dùng"} với role {formatRoles(roles)}. Hãy dùng tài khoản Admin hoặc quay về workspace phù hợp.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href={path}>Mở workspace của tôi</a>
            <a className="btn btn-ghost" href="/login">Đăng nhập tài khoản khác</a>
          </div>
        </div>
      </section>
    </main>
  );
}

function EmptyAuth() {
  return (
    <main className="landing-page">
      <Navbar />
      <section className="app-page">
        <div className="container app-empty">
          <p className="eyebrow">Admin</p>
          <h1>Bạn cần đăng nhập bằng tài khoản Admin.</h1>
          <div className="hero-actions">
            <a className="btn btn-primary" href="/login">Đăng nhập</a>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

export default function AdminWorkspacePage() {
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [profile, setProfile] = useState(null);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [pageInfo, setPageInfo] = useState({ pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 });
  const [activeSection, setActiveSection] = useState("overview");
  const [search, setSearch] = useState("");
  const [departmentForm, setDepartmentForm] = useState(EMPTY_DEPARTMENT);
  const [editingDepartmentId, setEditingDepartmentId] = useState("");
  const [staffForm, setStaffForm] = useState(EMPTY_STAFF);
  const [loading, setLoading] = useState(Boolean(auth));
  const [usersLoading, setUsersLoading] = useState(true);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [savingDepartment, setSavingDepartment] = useState(false);
  const [savingStaff, setSavingStaff] = useState(false);
  const [globalMessage, setGlobalMessage] = useState(null);
  const [usersMessage, setUsersMessage] = useState(null);
  const [departmentMessage, setDepartmentMessage] = useState(null);
  const [staffMessage, setStaffMessage] = useState(null);

  const roles = useMemo(() => normalizeRoles(profile?.roles ?? auth?.roles ?? []), [auth, profile]);
  const isAdmin = hasRole(roles, "admin");
  const displayName = profile?.name || profile?.displayName || auth?.email?.split("@")[0] || "Admin";

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return users;

    return users.filter((user) => {
      return [user.email, user.displayName, user.identityId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });
  }, [search, users]);

  const pendingUsers = users.filter((user) => Number(user.status) !== 1).length;
  const activeUsers = users.filter((user) => !user.isDeleted).length;

  useEffect(() => {
    if (!auth) return;
    let active = true;

    Promise.allSettled([authApi.me(), usersApi.list(1, pageInfo.pageSize), medicalDepartmentsApi.list()])
      .then(([profileResult, usersResult, departmentResult]) => {
        if (!active) return;

        if (profileResult.status === "fulfilled") {
          setProfile(profileResult.value.data ?? {});
        } else {
          setGlobalMessage({ type: "warning", text: profileResult.reason.message });
        }

        if (usersResult.status === "fulfilled") {
          const data = usersResult.value.data ?? {};
          setUsers(data.items ?? []);
          setPageInfo({
            pageNumber: data.pageNumber ?? 1,
            pageSize: data.pageSize ?? pageInfo.pageSize,
            totalCount: data.totalCount ?? 0,
            totalPages: data.totalPages ?? 1,
          });
        } else {
          setUsersMessage({ type: "error", text: usersResult.reason.message });
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
        setUsersLoading(false);
        setDepartmentsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [auth, pageInfo.pageSize]);

  if (!auth) return <EmptyAuth />;
  if (!loading && !isAdmin) return <AccessDenied auth={auth} roles={roles} />;

  async function loadUsers(pageNumber = pageInfo.pageNumber) {
    setUsersLoading(true);
    setUsersMessage(null);
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
      setUsersMessage({ type: "error", text: error.message });
    } finally {
      setUsersLoading(false);
    }
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

  async function handleApproveUser(userId) {
    setUsersMessage(null);
    try {
      const response = await usersApi.approve(userId);
      setUsersMessage({ type: "success", text: response.message || "Đã duyệt người dùng." });
      await loadUsers();
    } catch (error) {
      setUsersMessage({ type: "error", text: error.message });
    }
  }

  async function handleDeleteUser(userId) {
    if (!window.confirm("Xóa người dùng này?")) return;

    setUsersMessage(null);
    try {
      const response = await usersApi.remove(userId);
      setUsersMessage({ type: "success", text: response.message || "Đã xóa người dùng." });
      await loadUsers();
    } catch (error) {
      setUsersMessage({ type: "error", text: error.message });
    }
  }

  function startEditDepartment(department) {
    setEditingDepartmentId(department.id);
    setDepartmentForm({
      departmentName: department.departmentName ?? "",
      description: department.description ?? "",
    });
    setActiveSection("departments");
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
    if (!window.confirm("Xóa chuyên khoa này?")) return;

    setDepartmentMessage(null);
    try {
      const response = await medicalDepartmentsApi.remove(id);
      setDepartmentMessage({ type: "success", text: response.message || "Đã xóa chuyên khoa." });
      await loadDepartments();
    } catch (error) {
      setDepartmentMessage({ type: "error", text: error.message });
    }
  }

  function updateStaff(key, value) {
    setStaffForm((current) => ({ ...current, [key]: value }));
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
      // Keep local logout reliable when the server session is already gone.
    } finally {
      clearStoredAuth();
      setAuth(null);
      window.location.href = "/";
    }
  }

  return (
    <main className="workspace-root admin-operator">
      <section className="admin-page">
        <div className="container admin-shell">
          <aside className="admin-sidebar">
            <a className="brand" href="/">
              <span className="brand-mark">+</span>
              <span>MediMate AI</span>
            </a>

            <nav className="admin-nav" aria-label="Điều hướng admin">
              <button className={activeSection === "overview" ? "active" : ""} type="button" onClick={() => setActiveSection("overview")}>Tổng quan</button>
              <button className={activeSection === "users" ? "active" : ""} type="button" onClick={() => setActiveSection("users")}>Người dùng</button>
              <button className={activeSection === "staff" ? "active" : ""} type="button" onClick={() => setActiveSection("staff")}>Tạo staff</button>
              <button className={activeSection === "departments" ? "active" : ""} type="button" onClick={() => setActiveSection("departments")}>Chuyên khoa</button>
            </nav>

            <div className="admin-session-card">
              <span>Phiên quản trị</span>
              <strong>{formatRoles(roles)}</strong>
              <small>{auth.email}</small>
              <button className="btn btn-dark btn-small" type="button" onClick={handleLogout}>Đăng xuất</button>
            </div>
          </aside>

          <div className="admin-main">
            <header className="admin-topbar">
              <div>
                <p className="eyebrow">Admin Workspace</p>
                <h1>Quản trị MediMate AI</h1>
                <p>Quản lý tài khoản, nhân sự hỗ trợ và danh mục chuyên khoa trong một nơi rõ ràng.</p>
              </div>
              <div className="admin-top-actions">
                <a className="btn btn-ghost btn-small" href="/app/staff">Xem giao diện nhân sự</a>
                <button className="btn btn-primary btn-small" type="button" onClick={() => {
                  loadUsers();
                  loadDepartments();
                }}>Đồng bộ dữ liệu</button>
              </div>
            </header>

            <ApiMessage message={globalMessage} />

            <section className="admin-stats">
              <article>
                <span>Tổng user</span>
                <strong>{usersLoading ? "..." : pageInfo.totalCount}</strong>
                <small>Tổng số tài khoản</small>
              </article>
              <article>
                <span>Chờ duyệt</span>
                <strong>{usersLoading ? "..." : pendingUsers}</strong>
                <small>Trong trang hiện tại</small>
              </article>
              <article>
                <span>Đang hoạt động</span>
                <strong>{usersLoading ? "..." : activeUsers}</strong>
                <small>Chưa bị xóa mềm</small>
              </article>
              <article>
                <span>Chuyên khoa</span>
                <strong>{departmentsLoading ? "..." : departments.length}</strong>
                <small>Danh mục đang dùng</small>
              </article>
            </section>

            {activeSection === "overview" && (
              <section className="admin-grid">
                <div className="admin-panel">
                  <div className="panel-title-row">
                    <div>
                      <p className="eyebrow">Việc cần chú ý</p>
                      <h2>Hàng đợi quản trị</h2>
                    </div>
                    <button className="btn btn-ghost btn-small" type="button" onClick={() => setActiveSection("users")}>Xem user</button>
                  </div>
                  <div className="admin-task-list">
                    <article>
                      <strong>{pendingUsers} user chờ duyệt</strong>
                      <span>Duyệt tài khoản để người dùng có thể tiếp tục dùng workspace.</span>
                    </article>
                    <article>
                      <strong>{departments.length} chuyên khoa đang có</strong>
                      <span>Dữ liệu chuyên khoa rõ ràng giúp người dùng chọn đúng nơi khám hơn.</span>
                    </article>
                    <article>
                      <strong>Vận hành ổn định</strong>
                      <span>Ưu tiên duyệt tài khoản, cập nhật chuyên khoa và giữ dữ liệu nhất quán.</span>
                    </article>
                  </div>
                </div>

                <div className="admin-panel">
                  <div className="panel-title-row">
                    <div>
                      <p className="eyebrow">Thông tin phiên</p>
                      <h2>{displayName}</h2>
                    </div>
                    <span className="soft-badge">{formatRoles(roles)}</span>
                  </div>
                  <div className="profile-list">
                    <div>
                      <span>Email</span>
                      <strong>{profile?.email || auth.email || "Không có email"}</strong>
                    </div>
                    <div>
                      <span>Trạng thái</span>
                      <strong>{profile?.status === 1 ? "Đã duyệt" : "Đang hoạt động"}</strong>
                    </div>
                    <div>
                      <span>User ID</span>
                      <strong>{profile?.userId || auth.userId || "Không có"}</strong>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeSection === "users" && (
              <section className="admin-panel">
                <div className="panel-title-row">
                  <div>
                    <p className="eyebrow">Tài khoản</p>
                    <h2>Quản lý người dùng</h2>
                  </div>
                  <button className="btn btn-ghost btn-small" type="button" onClick={() => loadUsers()}>Tải lại</button>
                </div>
                <ApiMessage message={usersMessage} />
                <div className="admin-toolbar">
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo email, tên hoặc ID..." />
                  <select value={pageInfo.pageSize} onChange={(event) => setPageInfo((current) => ({ ...current, pageSize: Number(event.target.value) }))}>
                    <option value="10">10 / trang</option>
                    <option value="20">20 / trang</option>
                    <option value="50">50 / trang</option>
                  </select>
                </div>

                {usersLoading ? (
                  <p className="muted-text">Đang tải danh sách người dùng...</p>
                ) : (
                  <div className="admin-table-list">
                    {filteredUsers.length === 0 && <p className="muted-text">Không tìm thấy người dùng phù hợp.</p>}
                    {filteredUsers.map((user) => (
                      <article className="admin-user-row" key={user.identityId}>
                        <div>
                          <strong>{user.displayName || user.email || "Người dùng"}</strong>
                          <span>{user.email || "Chưa có email"}</span>
                          <small>{user.identityId}</small>
                        </div>
                        <div className="admin-badge-stack">
                          <span>{statusLabel(user.status)}</span>
                          <span>{user.isDeleted ? "Đã xóa" : "Hoạt động"}</span>
                        </div>
                        <div className="record-actions">
                          <button className="btn btn-ghost btn-small" type="button" onClick={() => handleApproveUser(user.identityId)}>Duyệt</button>
                          <button className="btn btn-dark btn-small" type="button" onClick={() => handleDeleteUser(user.identityId)}>Xóa</button>
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
            )}

            {activeSection === "staff" && (
              <section className="admin-panel">
                <div className="panel-title-row">
                  <div>
                    <p className="eyebrow">Nhân sự</p>
                    <h2>Tạo tài khoản staff</h2>
                  </div>
                  <span className="soft-badge">Tài khoản nội bộ</span>
                </div>
                <ApiMessage message={staffMessage} />
                <form className="clean-form" onSubmit={handleCreateStaff}>
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
                    {savingStaff ? "Đang tạo..." : "Tạo tài khoản staff"}
                  </button>
                </form>
              </section>
            )}

            {activeSection === "departments" && (
              <section className="admin-grid">
                <div className="admin-panel">
                  <div className="panel-title-row">
                    <div>
                    <p className="eyebrow">Chuyên khoa</p>
                      <h2>Danh mục chuyên khoa</h2>
                    </div>
                    <button className="btn btn-ghost btn-small" type="button" onClick={loadDepartments}>Tải lại</button>
                  </div>
                  <ApiMessage message={departmentMessage} />
                  {departmentsLoading ? (
                    <p className="muted-text">Đang tải chuyên khoa...</p>
                  ) : (
                    <div className="admin-table-list">
                      {departments.length === 0 && <p className="muted-text">Chưa có chuyên khoa.</p>}
                      {departments.map((department) => (
                        <article className="admin-user-row" key={department.id}>
                          <div>
                            <strong>{department.departmentName || "Chưa đặt tên"}</strong>
                            <span>{department.description || "Chưa có mô tả."}</span>
                            <small>{department.id}</small>
                          </div>
                          <div className="record-actions">
                            <button className="btn btn-ghost btn-small" type="button" onClick={() => startEditDepartment(department)}>Sửa</button>
                            <button className="btn btn-dark btn-small" type="button" onClick={() => handleDeleteDepartment(department.id)}>Xóa</button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                <form className="admin-panel clean-form" onSubmit={handleSaveDepartment}>
                  <div className="panel-title-row">
                    <div>
                      <p className="eyebrow">{editingDepartmentId ? "Update" : "Create"}</p>
                      <h2>{editingDepartmentId ? "Cập nhật chuyên khoa" : "Tạo chuyên khoa"}</h2>
                    </div>
                    {editingDepartmentId && <button className="btn btn-ghost btn-small" type="button" onClick={resetDepartmentForm}>Hủy sửa</button>}
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
                      placeholder="Mô tả chức năng, nhóm triệu chứng thường gặp..."
                    />
                  </Field>
                  <button className="btn btn-primary" type="submit" disabled={savingDepartment}>
                    {savingDepartment ? "Đang lưu..." : editingDepartmentId ? "Lưu cập nhật" : "Tạo chuyên khoa"}
                  </button>
                </form>
              </section>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
