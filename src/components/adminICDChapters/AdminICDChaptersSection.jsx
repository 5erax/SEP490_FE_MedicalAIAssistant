import { Filter, Plus, RotateCcw, Search } from "lucide-react";
import { useState } from "react";
import { Dialog } from "../ui";

function Field({ label, children }) {
  return (
    <label className="clean-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function getChapterId(chapter) {
  return chapter.id ?? chapter.icdChapterId ?? "";
}

function getChapterCode(chapter) {
  return chapter.chapterCode ?? chapter.code ?? chapter.icdCode ?? "";
}

function getChapterName(chapter) {
  return chapter.chapterName ?? chapter.name ?? chapter.title ?? "";
}

function getKeywordCount(chapter) {
  return Object.keys(chapter.keywordWeights ?? {}).length;
}

export default function AdminICDChaptersSection({
  chapters,
  editingChapterId,
  filters,
  form,
  loading,
  message,
  pageInfo,
  saving,
  onApplyFilters,
  onClearFilters,
  onDelete,
  onEdit,
  onFilterChange,
  onFormChange,
  onLoadPage,
  onPageSizeChange,
  onReload,
  onReset,
  onSubmit,
  onView,
}) {
  const [formOpen, setFormOpen] = useState(false);

  function openCreateForm() {
    onReset();
    setFormOpen(true);
  }

  function openEditForm(chapter) {
    onEdit(chapter);
    setFormOpen(true);
  }

  async function openDetailForm(chapter) {
    await onView(chapter);
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    onReset();
  }

  return (
    <section className="admin-panel ai-config-admin-panel">
      <div className="panel-title-row ai-config-section-heading">
        <div>
          <p className="eyebrow">ICD Chapter</p>
          <h2>Quản lý chương ICD</h2>
          <p className="muted-text">Quản lý danh mục ICD Chapter và trọng số từ khóa dùng trong dữ liệu lâm sàng.</p>
        </div>
        <button className="btn btn-ghost btn-small" type="button" onClick={onReload}>Tải lại</button>
      </div>

      {message && <div className={`api-message ${message.type}`}>{message.text}</div>}

      <section className="ai-config-filter-card">
        <div className="ai-config-filter-card-header">
          <div>
            <strong>ICD Chapter filters</strong>
            <p>Lọc theo mã ICD, tên chương hoặc từ khóa đang dùng trong hệ thống MediMate AI.</p>
          </div>
        </div>

        <form className="ai-config-toolbar" onSubmit={onApplyFilters}>
          <div className="ai-config-toolbar-row ai-config-toolbar-primary">
            <div className="ai-config-search-field">
              <Search size={16} />
              <input
                value={filters.search}
                onChange={(event) => onFilterChange("search", event.target.value)}
                placeholder="Tìm mã ICD, tên chương hoặc từ khóa..."
              />
            </div>
            <button className="btn btn-primary btn-small ai-config-add-button" type="button" onClick={openCreateForm}>
              <Plus size={15} /> Tạo ICD
            </button>
          </div>

          <div className="ai-config-toolbar-row ai-config-toolbar-filters">
            <div className="ai-config-filter-grid">
              <label className="clean-field">
                <span>Per page</span>
                <select value={pageInfo.pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
                  <option value="10">10 / trang</option>
                  <option value="20">20 / trang</option>
                  <option value="50">50 / trang</option>
                </select>
              </label>
            </div>

            <div className="ai-config-filter-actions">
              <button className="btn btn-primary btn-small" type="submit"><Filter size={14} /> Apply</button>
              <button className="btn btn-ghost btn-small" type="button" onClick={onClearFilters}><RotateCcw size={14} /> Clear</button>
            </div>
          </div>
        </form>
      </section>

      {loading ? (
        <p className="muted-text">Đang tải ICD Chapter...</p>
      ) : (
        <div className="admin-table-list">
          {chapters.length === 0 && <p className="muted-text">Chưa có ICD Chapter.</p>}
          {chapters.map((chapter) => {
            const id = getChapterId(chapter);
            return (
              <article className="admin-user-row" key={id || getChapterCode(chapter)}>
                <div>
                  <strong>{getChapterCode(chapter) || "Chưa có mã"}</strong>
                  <span>{getChapterName(chapter) || "Chưa đặt tên"}</span>
                  <small>{getKeywordCount(chapter)} từ khóa · {id}</small>
                </div>
                <div className="record-actions">
                  <button className="btn btn-ghost btn-small" type="button" onClick={() => openDetailForm(chapter)}>Chi tiết</button>
                  <button className="btn btn-ghost btn-small" type="button" onClick={() => openEditForm(chapter)}>Sửa</button>
                  <button className="btn btn-dark btn-small" type="button" onClick={() => onDelete(chapter)}>Xóa</button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!loading && (
        <div className="pagination-row">
          <button className="btn btn-ghost btn-small" type="button" disabled={pageInfo.pageNumber <= 1} onClick={() => onLoadPage(Math.max(1, pageInfo.pageNumber - 1))}>
            Trước
          </button>
          <span>Trang {pageInfo.pageNumber} / {pageInfo.totalPages || 1} · {chapters.length} / {pageInfo.totalCount} ICD Chapters</span>
          <button className="btn btn-ghost btn-small" type="button" disabled={pageInfo.pageNumber >= pageInfo.totalPages} onClick={() => onLoadPage(Math.min(pageInfo.totalPages || 1, pageInfo.pageNumber + 1))}>
            Sau
          </button>
        </div>
      )}

      {formOpen && (
        <Dialog
          backdropClassName="doctor-modal-backdrop"
          className="doctor-modal"
          labelledBy="icd-chapter-modal-title"
          onClose={closeForm}
          closeOnBackdrop={!saving}
          closeOnEscape={!saving}
        >
          <header className="doctor-modal-header">
            <div>
              <p className="eyebrow">{editingChapterId ? "Update" : "Create"}</p>
              <h2 id="icd-chapter-modal-title">{editingChapterId ? "Cập nhật ICD Chapter" : "Tạo ICD Chapter"}</h2>
              <p>Nhập mã chương, tên chương và trọng số từ khóa phục vụ phân loại dữ liệu lâm sàng.</p>
            </div>
            <button className="doctor-modal-close" type="button" aria-label="Đóng form" onClick={closeForm}>×</button>
          </header>

          <form className="clean-form doctor-form" onSubmit={onSubmit}>
            <Field label="Mã Chapter">
              <input
                value={form.chapterCode}
                onChange={(event) => onFormChange("chapterCode", event.target.value)}
                placeholder="Ví dụ: I"
                required
                disabled={Boolean(editingChapterId)}
              />
              {editingChapterId && (
                <small className="muted-text">Ma Chapter dang duoc dung lam khoa lien ket, chi doi khi Backend da ho tro migrate du lieu lien quan.</small>
              )}
            </Field>
            <Field label="Tên Chapter">
              <input
                value={form.chapterName}
                onChange={(event) => onFormChange("chapterName", event.target.value)}
                placeholder="Ví dụ: Bệnh hệ tuần hoàn"
                required
              />
            </Field>
            <Field label="Trọng số từ khóa (JSON)">
              <textarea
                rows={10}
                value={form.keywordWeights}
                onChange={(event) => onFormChange("keywordWeights", event.target.value)}
                placeholder={'{"sốt": 5, "ho": 3}'}
                spellCheck="false"
              />
            </Field>
            <div className="doctor-modal-actions">
              <button className="btn btn-ghost" type="button" onClick={closeForm}>Hủy</button>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? "Đang lưu..." : editingChapterId ? "Lưu cập nhật" : "Tạo ICD Chapter"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </section>
  );
}
