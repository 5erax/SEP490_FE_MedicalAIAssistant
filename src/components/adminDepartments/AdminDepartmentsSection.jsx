import { Filter, RotateCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";

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
  const [searchDraft, setSearchDraft] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const filteredDepartments = useMemo(() => {
    const query = appliedSearch.trim().toLowerCase();
    if (!query) return departments;

    return departments.filter((department) => (
      [
        department.departmentName,
        department.description,
        department.chapterCode,
        department.id,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    ));
  }, [appliedSearch, departments]);

  function applySearch(event) {
    event.preventDefault();
    setAppliedSearch(searchDraft);
  }

  function clearSearch() {
    setSearchDraft("");
    setAppliedSearch("");
  }

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

        <section className="ai-config-filter-card">
          <div className="ai-config-filter-card-header">
            <div>
              <strong>Bộ lọc chuyên khoa</strong>
              <p>Tìm theo tên chuyên khoa, mô tả, mã chương ICD hoặc ID trong hệ thống MediMate AI.</p>
            </div>
          </div>

          <form className="ai-config-toolbar" onSubmit={applySearch}>
            <div className="ai-config-toolbar-row ai-config-toolbar-primary">
              <div className="ai-config-search-field">
                <Search size={16} />
                <input
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder="Tìm tên chuyên khoa, mô tả hoặc mã ICD..."
                />
              </div>
            </div>

            <div className="ai-config-toolbar-row ai-config-toolbar-filters">
              <div className="ai-config-filter-summary">
                <strong>{filteredDepartments.length}</strong>
                <span>/ {departments.length} chuyên khoa</span>
              </div>

              <div className="ai-config-filter-actions">
                <button className="btn btn-primary btn-small" type="submit"><Filter size={14} /> Apply</button>
                <button className="btn btn-ghost btn-small" type="button" onClick={clearSearch}>
                  <RotateCcw size={14} /> Clear
                </button>
              </div>
            </div>
          </form>
        </section>

        {loading ? (
          <p className="muted-text">Đang tải chuyên khoa...</p>
        ) : (
          <div className="admin-table-list">
            {departments.length === 0 && <p className="muted-text">Chưa có chuyên khoa.</p>}
            {departments.length > 0 && filteredDepartments.length === 0 && (
              <p className="muted-text">Không tìm thấy chuyên khoa phù hợp.</p>
            )}
            {filteredDepartments.map((department) => (
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
        <Field label="Mã chương ICD">
          <input
            value={form.chapterCode}
            onChange={(event) => onFormChange("chapterCode", event.target.value)}
            placeholder="Ví dụ: IX"
          />
        </Field>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? "Đang lưu..." : editingDepartmentId ? "Lưu cập nhật" : "Tạo chuyên khoa"}
        </button>
      </form>
    </section>
  );
}
