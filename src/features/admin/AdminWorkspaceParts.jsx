/* eslint-disable no-irregular-whitespace */
import { DataTable, EmptyState, LoadingState } from "../../components/ui";

export function ApiMessage({ message }) {
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

function formatRoles(roles) {
  return roles.length ? roles.join(", ") : "admin";
}

export function AdminSidebar({ activeSection, auth, roles, onLogout, onSectionChange }) {
  return (
    <aside className="admin-sidebar">
      <a className="brand" href="/">
        <span className="brand-mark">+</span>
        <span>MediMate AI</span>
      </a>

      <nav className="admin-nav" aria-label="Äiá»u hÆ°á»›ng admin">
        <button className={activeSection === "overview" ? "active" : ""} type="button" onClick={() => onSectionChange("overview")}>Tá»•ng quan</button>
        <button className={activeSection === "users" ? "active" : ""} type="button" onClick={() => onSectionChange("users")}>NgÆ°á»i dÃ¹ng</button>
        <button className={activeSection === "staff" ? "active" : ""} type="button" onClick={() => onSectionChange("staff")}>Táº¡o staff</button>
        <button className={activeSection === "departments" ? "active" : ""} type="button" onClick={() => onSectionChange("departments")}>ChuyÃªn khoa</button>
      </nav>

      <div className="admin-session-card">
        <span>PhiÃªn quáº£n trá»‹</span>
        <strong>{formatRoles(roles)}</strong>
        <small>{auth.email}</small>
        <button className="btn btn-dark btn-small" type="button" onClick={onLogout}>ÄÄƒng xuáº¥t</button>
      </div>
    </aside>
  );
}

export function AdminTopbar({ onRefresh }) {
  return (
    <header className="admin-topbar">
      <div>
        <p className="eyebrow">Admin Workspace</p>
        <h1>Quáº£n trá»‹ MediMate AI</h1>
        <p>Quáº£n lÃ½ tÃ i khoáº£n, nhÃ¢n sá»± há»— trá»£ vÃ  danh má»¥c chuyÃªn khoa trong má»™t nÆ¡i rÃµ rÃ ng.</p>
      </div>
      <div className="admin-top-actions">
        <a className="btn btn-ghost btn-small" href="/app/staff">Xem giao diá»‡n nhÃ¢n sá»±</a>
        <button className="btn btn-primary btn-small" type="button" onClick={onRefresh}>Äá»“ng bá»™ dá»¯ liá»‡u</button>
      </div>
    </header>
  );
}

export function AdminStats({ activeUsers, departments, departmentsLoading, pageInfo, pendingUsers, usersLoading }) {
  return (
    <section className="admin-stats">
      <article>
        <span>Tá»•ng user</span>
        <strong>{usersLoading ? "..." : pageInfo.totalCount}</strong>
        <small>Tá»•ng sá»‘ tÃ i khoáº£n</small>
      </article>
      <article>
        <span>Chá» duyá»‡t</span>
        <strong>{usersLoading ? "..." : pendingUsers}</strong>
        <small>Trong trang hiá»‡n táº¡i</small>
      </article>
      <article>
        <span>Äang hoáº¡t Ä‘á»™ng</span>
        <strong>{usersLoading ? "..." : activeUsers}</strong>
        <small>ChÆ°a bá»‹ xÃ³a má»m</small>
      </article>
      <article>
        <span>ChuyÃªn khoa</span>
        <strong>{departmentsLoading ? "..." : departments.length}</strong>
        <small>Danh má»¥c Ä‘ang dÃ¹ng</small>
      </article>
    </section>
  );
}

export function OverviewSection({ auth, departments, displayName, pendingUsers, profile, roles, onUsersOpen }) {
  return (
    <section className="admin-grid">
      <div className="admin-panel">
        <div className="panel-title-row">
          <div>
            <p className="eyebrow">Viá»‡c cáº§n chÃº Ã½</p>
            <h2>HÃ ng Ä‘á»£i quáº£n trá»‹</h2>
          </div>
          <button className="btn btn-ghost btn-small" type="button" onClick={onUsersOpen}>Xem user</button>
        </div>
        <div className="admin-task-list">
          <article>
            <strong>{pendingUsers} user chá» duyá»‡t</strong>
            <span>Duyá»‡t tÃ i khoáº£n Ä‘á»ƒ ngÆ°á»i dÃ¹ng cÃ³ thá»ƒ tiáº¿p tá»¥c dÃ¹ng workspace.</span>
          </article>
          <article>
            <strong>{departments.length} chuyÃªn khoa Ä‘ang cÃ³</strong>
            <span>Dá»¯ liá»‡u chuyÃªn khoa rÃµ rÃ ng giÃºp ngÆ°á»i dÃ¹ng chá»n Ä‘Ãºng nÆ¡i khÃ¡m hÆ¡n.</span>
          </article>
          <article>
            <strong>Váº­n hÃ nh á»•n Ä‘á»‹nh</strong>
            <span>Æ¯u tiÃªn duyá»‡t tÃ i khoáº£n, cáº­p nháº­t chuyÃªn khoa vÃ  giá»¯ dá»¯ liá»‡u nháº¥t quÃ¡n.</span>
          </article>
        </div>
      </div>

      <div className="admin-panel">
        <div className="panel-title-row">
          <div>
            <p className="eyebrow">ThÃ´ng tin phiÃªn</p>
            <h2>{displayName}</h2>
          </div>
          <span className="soft-badge">{formatRoles(roles)}</span>
        </div>
        <div className="profile-list">
          <div>
            <span>Email</span>
            <strong>{profile?.email || auth.email || "KhÃ´ng cÃ³ email"}</strong>
          </div>
          <div>
            <span>Tráº¡ng thÃ¡i</span>
            <strong>{profile?.status === 1 ? "ÄÃ£ duyá»‡t" : "Äang hoáº¡t Ä‘á»™ng"}</strong>
          </div>
          <div>
            <span>User ID</span>
            <strong>{profile?.userId || auth.userId || "KhÃ´ng cÃ³"}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

export function UsersSection({
  filteredUsers,
  pageInfo,
  search,
  userColumns,
  usersLoading,
  usersMessage,
  onPageSizeChange,
  onReload,
  onSearchChange,
  onUsersPageChange,
}) {
  return (
    <section className="admin-panel">
      <div className="panel-title-row">
        <div>
          <p className="eyebrow">TÃ i khoáº£n</p>
          <h2>Quáº£n lÃ½ ngÆ°á»i dÃ¹ng</h2>
        </div>
        <button className="btn btn-ghost btn-small" type="button" onClick={onReload}>Táº£i láº¡i</button>
      </div>
      <ApiMessage message={usersMessage} />
      <div className="admin-toolbar">
        <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="TÃ¬m theo email, tÃªn hoáº·c ID..." />
        <select value={pageInfo.pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
          <option value="10">10 / trang</option>
          <option value="20">20 / trang</option>
          <option value="50">50 / trang</option>
        </select>
      </div>

      {usersLoading ? (
        <LoadingState label="Äang táº£i danh sÃ¡ch ngÆ°á»i dÃ¹ng..." />
      ) : (
        <DataTable
          columns={userColumns}
          rows={filteredUsers}
          getRowKey={(item) => item.identityId}
          emptyState={<EmptyState title="KhÃ´ng tÃ¬m tháº¥y ngÆ°á»i dÃ¹ng" description="Thá»­ Ä‘á»•i tá»« khÃ³a tÃ¬m kiáº¿m hoáº·c táº£i láº¡i danh sÃ¡ch." />}
        />
      )}

      <div className="pagination-row">
        <button className="btn btn-ghost btn-small" type="button" disabled={pageInfo.pageNumber <= 1} onClick={() => onUsersPageChange(pageInfo.pageNumber - 1)}>TrÆ°á»›c</button>
        <span>Trang {pageInfo.pageNumber} / {pageInfo.totalPages || 1} Â· {pageInfo.totalCount} user</span>
        <button className="btn btn-ghost btn-small" type="button" disabled={pageInfo.pageNumber >= pageInfo.totalPages} onClick={() => onUsersPageChange(pageInfo.pageNumber + 1)}>Sau</button>
      </div>
    </section>
  );
}

export function StaffSection({ savingStaff, staffForm, staffMessage, onCreateStaff, onUpdateStaff }) {
  return (
    <section className="admin-panel">
      <div className="panel-title-row">
        <div>
          <p className="eyebrow">NhÃ¢n sá»±</p>
          <h2>Táº¡o tÃ i khoáº£n staff</h2>
        </div>
        <span className="soft-badge">TÃ i khoáº£n ná»™i bá»™</span>
      </div>
      <ApiMessage message={staffMessage} />
      <form className="clean-form" onSubmit={onCreateStaff}>
        <div className="form-two-cols">
          <Field label="Email">
            <input type="email" value={staffForm.email} onChange={(event) => onUpdateStaff("email", event.target.value)} required />
          </Field>
          <Field label="Username">
            <input value={staffForm.userName} onChange={(event) => onUpdateStaff("userName", event.target.value)} required />
          </Field>
          <Field label="TÃªn hiá»ƒn thá»‹">
            <input value={staffForm.displayName} onChange={(event) => onUpdateStaff("displayName", event.target.value)} required />
          </Field>
          <Field label="Äá»‹a chá»‰">
            <input value={staffForm.address} onChange={(event) => onUpdateStaff("address", event.target.value)} />
          </Field>
          <Field label="Máº­t kháº©u">
            <input type="password" value={staffForm.password} onChange={(event) => onUpdateStaff("password", event.target.value)} required />
          </Field>
          <Field label="Nháº­p láº¡i máº­t kháº©u">
            <input type="password" value={staffForm.confirmPassword} onChange={(event) => onUpdateStaff("confirmPassword", event.target.value)} required />
          </Field>
          <Field label="Giá»›i tÃ­nh">
            <select value={staffForm.gender} onChange={(event) => onUpdateStaff("gender", event.target.value)}>
              <option value="1">Nam</option>
              <option value="2">Ná»¯</option>
            </select>
          </Field>
          <Field label="NgÃ y sinh">
            <input type="date" value={staffForm.dateOfBirth} onChange={(event) => onUpdateStaff("dateOfBirth", event.target.value)} />
          </Field>
        </div>
        <button className="btn btn-primary" type="submit" disabled={savingStaff}>
          {savingStaff ? "Äang táº¡o..." : "Táº¡o tÃ i khoáº£n staff"}
        </button>
      </form>
    </section>
  );
}

export function DepartmentsSection({
  departmentForm,
  departmentMessage,
  departments,
  departmentsLoading,
  editingDepartmentId,
  savingDepartment,
  onDeleteDepartment,
  onDepartmentFormChange,
  onDepartmentsReload,
  onEditCancel,
  onEditDepartment,
  onSaveDepartment,
}) {
  return (
    <section className="admin-grid">
      <div className="admin-panel">
        <div className="panel-title-row">
          <div>
          <p className="eyebrow">ChuyÃªn khoa</p>
            <h2>Danh má»¥c chuyÃªn khoa</h2>
          </div>
          <button className="btn btn-ghost btn-small" type="button" onClick={onDepartmentsReload}>Táº£i láº¡i</button>
        </div>
        <ApiMessage message={departmentMessage} />
        {departmentsLoading ? (
          <p className="muted-text">Äang táº£i chuyÃªn khoa...</p>
        ) : (
          <div className="admin-table-list">
            {departments.length === 0 && <p className="muted-text">ChÆ°a cÃ³ chuyÃªn khoa.</p>}
            {departments.map((department) => (
              <article className="admin-user-row" key={department.id}>
                <div>
                  <strong>{department.departmentName || "ChÆ°a Ä‘áº·t tÃªn"}</strong>
                  <span>{department.description || "ChÆ°a cÃ³ mÃ´ táº£."}</span>
                  <small>{department.id}</small>
                </div>
                <div className="record-actions">
                  <button className="btn btn-ghost btn-small" type="button" onClick={() => onEditDepartment(department)}>Sá»­a</button>
                  <button className="btn btn-dark btn-small" type="button" onClick={() => onDeleteDepartment(department.id)}>XÃ³a</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <form className="admin-panel clean-form" onSubmit={onSaveDepartment}>
        <div className="panel-title-row">
          <div>
            <p className="eyebrow">{editingDepartmentId ? "Update" : "Create"}</p>
            <h2>{editingDepartmentId ? "Cáº­p nháº­t chuyÃªn khoa" : "Táº¡o chuyÃªn khoa"}</h2>
          </div>
          {editingDepartmentId && <button className="btn btn-ghost btn-small" type="button" onClick={onEditCancel}>Há»§y sá»­a</button>}
        </div>
        <Field label="TÃªn chuyÃªn khoa">
          <input
            value={departmentForm.departmentName}
            onChange={(event) => onDepartmentFormChange({ ...departmentForm, departmentName: event.target.value })}
            placeholder="VÃ­ dá»¥: Tim máº¡ch"
            required
          />
        </Field>
        <Field label="MÃ´ táº£">
          <textarea
            rows={6}
            value={departmentForm.description}
            onChange={(event) => onDepartmentFormChange({ ...departmentForm, description: event.target.value })}
            placeholder="MÃ´ táº£ chá»©c nÄƒng, nhÃ³m triá»‡u chá»©ng thÆ°á»ng gáº·p..."
          />
        </Field>
        <button className="btn btn-primary" type="submit" disabled={savingDepartment}>
          {savingDepartment ? "Äang lÆ°u..." : editingDepartmentId ? "LÆ°u cáº­p nháº­t" : "Táº¡o chuyÃªn khoa"}
        </button>
      </form>
    </section>
  );
}
