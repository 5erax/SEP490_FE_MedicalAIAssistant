import { useEffect, useMemo, useState } from "react";
import { useFeedback } from "../components/feedback/feedbackContext";
import { Footer } from "../components/landing/PricingSection";
import { authApi, clearStoredAuth, getStoredAuth, medicalDepartmentsApi } from "../services/api";
import { hasRole, normalizeRoles } from "../utils/roles";
import "../styles/features/operator-workspace.css";

const EMPTY_DEPARTMENT = { departmentName: "", description: "" };

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

function EmptyAuth() {
  return (
    <main className="workspace-root">
      <section className="app-page">
        <div className="container app-empty">
          <p className="eyebrow">Không gian nhân sự</p>
          <h1>Bạn cần đăng nhập bằng tài khoản Staff hoặc Admin.</h1>
          <div className="hero-actions">
            <a className="btn btn-primary" href="/login">Đăng nhập</a>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

function AccessDenied({ roles }) {
  return (
    <main className="workspace-root">
      <section className="app-page">
        <div className="container app-empty">
          <p className="eyebrow">Không có quyền Staff</p>
          <h1>Tài khoản này không thể quản lý chuyên khoa.</h1>
          <p>Role hiện tại: {roles.length ? roles.join(", ") : "user"}.</p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="/dashboard">Mở Dashboard</a>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function StaffWorkspacePage() {
  const { confirmAction, showToast } = useFeedback();
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [profile, setProfile] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [departmentForm, setDepartmentForm] = useState(EMPTY_DEPARTMENT);
  const [editingDepartmentId, setEditingDepartmentId] = useState("");
  const [loading, setLoading] = useState(Boolean(auth));
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [savingDepartment, setSavingDepartment] = useState(false);
  const [message, setMessage] = useState(null);

  const roles = useMemo(() => normalizeRoles(profile?.roles ?? auth?.roles ?? []), [auth, profile]);
  const canManage = hasRole(roles, "staff") || hasRole(roles, "admin");
  const displayName = profile?.name || profile?.displayName || auth?.email?.split("@")[0] || "Staff";

  useEffect(() => {
    if (!auth) return;
    let active = true;

    Promise.allSettled([authApi.me(), medicalDepartmentsApi.list()])
      .then(([profileResult, departmentResult]) => {
        if (!active) return;

        if (profileResult.status === "fulfilled") {
          setProfile(profileResult.value.data ?? {});
        } else {
          setMessage({ type: "warning", text: profileResult.reason.message });
        }

        if (departmentResult.status === "fulfilled") {
          setDepartments(departmentResult.value.data ?? []);
        } else {
          setMessage({ type: "error", text: departmentResult.reason.message });
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

  if (!auth) return <EmptyAuth />;
  if (!loading && !canManage) return <AccessDenied roles={roles} />;

  async function loadDepartments() {
    setDepartmentsLoading(true);
    setMessage(null);
    try {
      const response = await medicalDepartmentsApi.list();
      setDepartments(response.data ?? []);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setDepartmentsLoading(false);
    }
  }

  function startEdit(department) {
    setEditingDepartmentId(department.id);
    setDepartmentForm({
      departmentName: department.departmentName ?? "",
      description: department.description ?? "",
    });
  }

  function resetForm() {
    setEditingDepartmentId("");
    setDepartmentForm(EMPTY_DEPARTMENT);
  }

  async function handleSaveDepartment(event) {
    event.preventDefault();
    setSavingDepartment(true);
    setMessage(null);
    try {
      const response = editingDepartmentId
        ? await medicalDepartmentsApi.update(editingDepartmentId, departmentForm)
        : await medicalDepartmentsApi.create(departmentForm);
      setMessage({
        type: "success",
        text: response.message || (editingDepartmentId ? "Đã cập nhật chuyên khoa." : "Đã tạo chuyên khoa."),
      });
      resetForm();
      await loadDepartments();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSavingDepartment(false);
    }
  }

  async function handleDeleteDepartment(id) {
    const confirmed = await confirmAction({
      title: "Xóa chuyên khoa?",
      message: "Chuyên khoa sẽ bị xóa khỏi danh mục và không còn xuất hiện trong luồng tư vấn.",
      confirmLabel: "Xóa chuyên khoa",
      tone: "danger",
    });
    if (!confirmed) return;
    setMessage(null);
    try {
      const response = await medicalDepartmentsApi.remove(id);
      setMessage({ type: "success", text: response.message || "Đã xóa chuyên khoa." });
      showToast({ type: "success", title: "Đã xóa chuyên khoa", message: response.message || "Danh mục đã được cập nhật." });
      await loadDepartments();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      // Keep local logout reliable when the server session has already expired.
    } finally {
      clearStoredAuth();
      setAuth(null);
      window.location.href = "/";
    }
  }

  return (
    <main className="operator-workspace staff-workspace">
      <section className="operator-page">
        <div className="container app-main operator-main">
          <header className="app-topbar">
            <div>
              <p className="eyebrow">Không gian nhân sự</p>
              <h1>Quản lý chuyên khoa</h1>
              <p className="muted-text">Xin chào {displayName}. Cập nhật danh mục chuyên khoa để người dùng tra cứu chính xác hơn.</p>
            </div>
            <div className="record-actions">
              {hasRole(roles, "admin") && <a className="btn btn-ghost btn-small" href="/app/admin">Quản trị</a>}
              <button className="btn btn-dark btn-small" type="button" onClick={handleLogout}>Đăng xuất</button>
            </div>
          </header>

          <ApiMessage message={message} />

          <div className="app-stats">
            <article>
              <span>Chuyên khoa</span>
              <strong>{departmentsLoading ? "..." : departments.length}</strong>
            </article>
            <article>
              <span>Role</span>
              <strong>{roles.length ? roles.join(", ") : "staff"}</strong>
            </article>
            <article>
              <span>Thao tác</span>
              <strong>Quản lý</strong>
            </article>
            <article>
              <span>Trạng thái</span>
              <strong>{loading ? "Đang tải" : "Sẵn sàng"}</strong>
            </article>
          </div>

          <div className="app-work-grid secondary">
            <section className="app-card">
              <div className="panel-title-row">
                <div>
                  <p className="eyebrow">Danh mục</p>
                  <h2>Chuyên khoa</h2>
                </div>
                <button className="btn btn-ghost btn-small" type="button" onClick={loadDepartments}>Tải lại</button>
              </div>
              {departmentsLoading ? (
                <p className="muted-text">Đang tải chuyên khoa...</p>
              ) : (
                <div className="record-list">
                  {departments.length === 0 && <p className="muted-text">Chưa có chuyên khoa.</p>}
                  {departments.map((department) => (
                    <article className="record-card" key={department.id}>
                      <div>
                        <strong>{department.departmentName || "Chưa đặt tên"}</strong>
                        <p>{department.description || "Chưa có mô tả."}</p>
                        <small>{department.id}</small>
                      </div>
                      <div className="record-actions">
                        <button className="btn btn-ghost btn-small" type="button" onClick={() => startEdit(department)}>Sửa</button>
                        <button className="btn btn-dark btn-small" type="button" onClick={() => handleDeleteDepartment(department.id)}>Xóa</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <form className="app-card clean-form" onSubmit={handleSaveDepartment}>
              <div className="panel-title-row">
                <div>
                  <p className="eyebrow">{editingDepartmentId ? "Update" : "Create"}</p>
                  <h2>{editingDepartmentId ? "Cập nhật chuyên khoa" : "Tạo chuyên khoa"}</h2>
                </div>
                {editingDepartmentId && <button className="btn btn-ghost btn-small" type="button" onClick={resetForm}>Hủy</button>}
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
                  placeholder="Mô tả chuyên khoa"
                />
              </Field>
              <button className="btn btn-primary" type="submit" disabled={savingDepartment}>
                {savingDepartment ? "Đang lưu..." : editingDepartmentId ? "Lưu cập nhật" : "Tạo chuyên khoa"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
