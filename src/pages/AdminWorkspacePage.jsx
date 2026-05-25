import { useEffect, useMemo, useState } from "react";
import { Navbar } from "../components/landing/Navbar";
import { Footer } from "../components/landing/PricingSection";
import { useFeedback } from "../components/feedback/feedbackContext";
import { Badge } from "../components/ui";
import {
  AdminSidebar,
  AdminStats,
  AdminTopbar,
  ApiMessage,
  DepartmentsSection,
  OverviewSection,
  StaffSection,
  UsersSection,
} from "../features/admin/AdminWorkspaceParts";
import {
  authApi,
  clearStoredAuth,
  getStoredAuth,
  medicalDepartmentsApi,
  usersApi,
} from "../services/api";
import { hasRole, normalizeRoles } from "../utils/roles";
import "../styles/features/operator-workspace.css";

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
  const { confirmAction, showToast } = useFeedback();
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
    const confirmed = await confirmAction({
      title: "Xóa người dùng?",
      message: "Tài khoản này sẽ bị xóa khỏi danh sách quản trị. Hãy chắc chắn trước khi tiếp tục.",
      confirmLabel: "Xóa người dùng",
      tone: "danger",
    });
    if (!confirmed) return;

    setUsersMessage(null);
    try {
      const response = await usersApi.remove(userId);
      setUsersMessage({ type: "success", text: response.message || "Đã xóa người dùng." });
      showToast({ type: "success", title: "Đã xóa người dùng", message: response.message || "Danh sách đã được cập nhật." });
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
    const confirmed = await confirmAction({
      title: "Xóa chuyên khoa?",
      message: "Chuyên khoa sẽ bị xóa khỏi danh mục. Người dùng có thể không còn thấy lựa chọn này.",
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

  const userColumns = [
    {
      key: "user",
      header: "Người dùng",
      render: (item) => (
        <div className="table-primary-cell">
          <strong>{item.displayName || item.email || "Người dùng"}</strong>
          <span>{item.email || "Chưa có email"}</span>
          <small>{item.identityId}</small>
        </div>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (item) => (
        <div className="admin-badge-stack">
          <Badge tone={Number(item.status) === 1 ? "success" : "warning"}>{statusLabel(item.status)}</Badge>
          <Badge tone={item.isDeleted ? "danger" : "info"}>{item.isDeleted ? "Đã xóa" : "Hoạt động"}</Badge>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      render: (item) => (
        <div className="record-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={() => handleApproveUser(item.identityId)}>Duyệt</button>
          <button className="btn btn-dark btn-small" type="button" onClick={() => handleDeleteUser(item.identityId)}>Xóa</button>
        </div>
      ),
    },
  ];

  return (
    <main className="workspace-root admin-operator">
      <section className="admin-page">
        <div className="container admin-shell">
          <AdminSidebar
            activeSection={activeSection}
            auth={auth}
            roles={roles}
            onLogout={handleLogout}
            onSectionChange={setActiveSection}
          />

          <div className="admin-main">
            <AdminTopbar onRefresh={() => {
              loadUsers();
              loadDepartments();
            }} />

            <ApiMessage message={globalMessage} />

            <AdminStats
              activeUsers={activeUsers}
              departments={departments}
              departmentsLoading={departmentsLoading}
              pageInfo={pageInfo}
              pendingUsers={pendingUsers}
              usersLoading={usersLoading}
            />

            {activeSection === "overview" && (
              <OverviewSection
                auth={auth}
                departments={departments}
                displayName={displayName}
                pendingUsers={pendingUsers}
                profile={profile}
                roles={roles}
                onUsersOpen={() => setActiveSection("users")}
              />
            )}

            {activeSection === "users" && (
              <UsersSection
                filteredUsers={filteredUsers}
                pageInfo={pageInfo}
                search={search}
                userColumns={userColumns}
                usersLoading={usersLoading}
                usersMessage={usersMessage}
                onPageSizeChange={(pageSize) => setPageInfo((current) => ({ ...current, pageSize }))}
                onReload={() => loadUsers()}
                onSearchChange={setSearch}
                onUsersPageChange={loadUsers}
              />
            )}

            {activeSection === "staff" && (
              <StaffSection
                savingStaff={savingStaff}
                staffForm={staffForm}
                staffMessage={staffMessage}
                onCreateStaff={handleCreateStaff}
                onUpdateStaff={updateStaff}
              />
            )}

            {activeSection === "departments" && (
              <DepartmentsSection
                departmentForm={departmentForm}
                departmentMessage={departmentMessage}
                departments={departments}
                departmentsLoading={departmentsLoading}
                editingDepartmentId={editingDepartmentId}
                savingDepartment={savingDepartment}
                onDeleteDepartment={handleDeleteDepartment}
                onDepartmentFormChange={setDepartmentForm}
                onDepartmentsReload={loadDepartments}
                onEditCancel={resetDepartmentForm}
                onEditDepartment={startEditDepartment}
                onSaveDepartment={handleSaveDepartment}
              />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
