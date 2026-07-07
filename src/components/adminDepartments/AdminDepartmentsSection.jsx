import { Filter, Plus, RotateCcw, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog } from "../ui";

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
  const [formOpen, setFormOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const wasSavingRef = useRef(false);

  useEffect(() => {
    if (formOpen && wasSavingRef.current && !saving && message?.type === "success") {
      setFormOpen(false);
    }
    wasSavingRef.current = saving;
  }, [formOpen, message, saving]);

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

  function openCreateForm() {
    onReset();
    setFormOpen(true);
  }

  function openEditForm(department) {
    onEdit(department);
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    onReset();
  }

  return (
    <section className="admin-panel ai-config-admin-panel department-admin-panel">
      <div className="panel-title-row ai-config-section-heading">
        <div>
          <p className="eyebrow">Chuyên khoa</p>
          <h2>Danh mục chuyên khoa</h2>
          <p className="muted-text">Quản lý các chuyên khoa dùng trong bác sĩ, cơ sở y tế và luồng phân tích lâm sàng.</p>
        </div>
        <div className="facility-panel-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={onReload}>Tải lại</button>
          <button className="btn btn-primary btn-small" type="button" onClick={openCreateForm}>
            <Plus size={15} /> Tạo chuyên khoa
          </button>
        </div>
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

      <div className="admin-panel">
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
                  <button className="btn btn-ghost btn-small" type="button" onClick={() => openEditForm(department)}>Sửa</button>
                  <button className="btn btn-dark btn-small" type="button" onClick={() => onDelete(department.id)}>Xóa</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {formOpen && (
        <Dialog
          backdropClassName="doctor-modal-backdrop"
          className="doctor-modal facility-form-modal department-form-modal"
          labelledBy="department-modal-title"
          onClose={closeForm}
          closeOnBackdrop={!saving}
          closeOnEscape={!saving}
        >
          <header className="doctor-modal-header">
            <div>
              <p className="eyebrow">{editingDepartmentId ? "Update" : "Create"}</p>
              <h2 id="department-modal-title">{editingDepartmentId ? "Cập nhật chuyên khoa" : "Tạo chuyên khoa"}</h2>
              <p>Nhập tên, mô tả và mã chương ICD để dùng trong hệ thống điều phối lâm sàng.</p>
            </div>
            <button className="doctor-modal-close" type="button" aria-label="Đóng form" onClick={closeForm} disabled={saving}>×</button>
          </header>

          <form className="clean-form doctor-form facility-form department-form" onSubmit={onSubmit}>
            <div className="facility-form-body">
              <section className="facility-form-card" aria-labelledby="department-basic-section">
                <div className="facility-form-card-head">
                  <h3 id="department-basic-section">Thông tin chuyên khoa</h3>
                  <p>Thông tin này được dùng khi gán bác sĩ, cơ sở y tế và gợi ý chuyên khoa phù hợp.</p>
                </div>

                <div className="facility-form-grid department-form-grid">
                  <Field label="Tên chuyên khoa" className="facility-form-span-2">
                    <input
                      value={form.departmentName}
                      onChange={(event) => onFormChange("departmentName", event.target.value)}
                      placeholder="Ví dụ: Tim mạch"
                      autoFocus
                      required
                    />
                  </Field>

                  <Field label="Mô tả" className="facility-form-span-2">
                    <textarea
                      rows={5}
                      value={form.description}
                      onChange={(event) => onFormChange("description", event.target.value)}
                      placeholder="Mô tả chức năng, nhóm triệu chứng thường gặp..."
                    />
                  </Field>

                  <Field label="Mã chương ICD" className="facility-form-span-2">
                    <input
                      value={form.chapterCode}
                      onChange={(event) => onFormChange("chapterCode", event.target.value)}
                      placeholder="Ví dụ: IX"
                    />
                  </Field>
                </div>
              </section>
            </div>

            <div className="doctor-modal-actions facility-form-actions">
              <button className="btn btn-ghost" type="button" onClick={closeForm} disabled={saving}>Hủy</button>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? "Đang lưu..." : editingDepartmentId ? "Lưu cập nhật" : "Tạo chuyên khoa"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </section>
  );
}
