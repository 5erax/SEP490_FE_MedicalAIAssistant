function Field({ label, children }) {
  return (
    <label className="clean-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function AdminDepartmentsSection({
  departments,
  editingDepartmentId,
  form,
  loading,
  message,
  saving,
  onDelete,
  onEdit,
  onFormChange,
  onReload,
  onReset,
  onSubmit,
}) {
  return (
    <section className="admin-grid">
      <div className="admin-panel">
        <div className="panel-title-row">
          <div>
            <p className="eyebrow">Chuyên khoa</p>
            <h2>Danh mục chuyên khoa</h2>
          </div>
          <button className="btn btn-ghost btn-small" type="button" onClick={onReload}>Tải lại</button>
        </div>
        {message && <div className={`api-message ${message.type}`}>{message.text}</div>}
        {loading ? (
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
                  <button className="btn btn-ghost btn-small" type="button" onClick={() => onEdit(department)}>Sửa</button>
                  <button className="btn btn-dark btn-small" type="button" onClick={() => onDelete(department.id)}>Xóa</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <form className="admin-panel clean-form" onSubmit={onSubmit}>
        <div className="panel-title-row">
          <div>
            <p className="eyebrow">{editingDepartmentId ? "Update" : "Create"}</p>
            <h2>{editingDepartmentId ? "Cập nhật chuyên khoa" : "Tạo chuyên khoa"}</h2>
          </div>
          {editingDepartmentId && <button className="btn btn-ghost btn-small" type="button" onClick={onReset}>Hủy sửa</button>}
        </div>
        <Field label="Tên chuyên khoa">
          <input
            value={form.departmentName}
            onChange={(event) => onFormChange("departmentName", event.target.value)}
            placeholder="Ví dụ: Tim mạch"
            required
          />
        </Field>
        <Field label="Mô tả">
          <textarea
            rows={6}
            value={form.description}
            onChange={(event) => onFormChange("description", event.target.value)}
            placeholder="Mô tả chức năng, nhóm triệu chứng thường gặp..."
          />
        </Field>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? "Đang lưu..." : editingDepartmentId ? "Lưu cập nhật" : "Tạo chuyên khoa"}
        </button>
      </form>
    </section>
  );
}
