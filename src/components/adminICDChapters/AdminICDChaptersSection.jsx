import { Filter, Plus, RotateCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Dialog } from "../ui";

const DEFAULT_FILTERS = {
  search: "",
  chapterCode: "",
  sort: "code-asc",
  pageSize: 10,
};

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

function sortChapters(chapters, sort) {
  const sorted = [...chapters];
  sorted.sort((left, right) => {
    const leftCode = getChapterCode(left);
    const rightCode = getChapterCode(right);
    const leftName = getChapterName(left);
    const rightName = getChapterName(right);

    if (sort === "code-desc") return rightCode.localeCompare(leftCode, "vi");
    if (sort === "name-asc") return leftName.localeCompare(rightName, "vi");
    if (sort === "name-desc") return rightName.localeCompare(leftName, "vi");
    if (sort === "keywords-desc") return getKeywordCount(right) - getKeywordCount(left);
    return leftCode.localeCompare(rightCode, "vi");
  });
  return sorted;
}

export default function AdminICDChaptersSection({
  chapters,
  editingChapterId,
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
  onView,
}) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [pageNumber, setPageNumber] = useState(1);
  const [formOpen, setFormOpen] = useState(false);

  const chapterCodeOptions = useMemo(() => {
    return Array.from(new Set(chapters.map(getChapterCode).filter(Boolean))).sort((left, right) => left.localeCompare(right, "vi"));
  }, [chapters]);

  const filteredChapters = useMemo(() => {
    const keyword = appliedFilters.search.trim().toLowerCase();
    const filtered = chapters.filter((chapter) => {
      const code = getChapterCode(chapter);
      const name = getChapterName(chapter);
      const keywordText = Object.keys(chapter.keywordWeights ?? {}).join(" ");
      const matchesSearch = !keyword || [code, name, keywordText]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
      const matchesCode = !appliedFilters.chapterCode || code === appliedFilters.chapterCode;
      return matchesSearch && matchesCode;
    });
    return sortChapters(filtered, appliedFilters.sort);
  }, [appliedFilters, chapters]);

  const totalPages = Math.max(1, Math.ceil(filteredChapters.length / appliedFilters.pageSize));
  const safePageNumber = Math.min(pageNumber, totalPages);
  const pagedChapters = filteredChapters.slice(
    (safePageNumber - 1) * appliedFilters.pageSize,
    safePageNumber * appliedFilters.pageSize,
  );

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function applyFilters(event) {
    event.preventDefault();
    setAppliedFilters(filters);
    setPageNumber(1);
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setPageNumber(1);
  }

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

        <form className="ai-config-toolbar" onSubmit={applyFilters}>
          <div className="ai-config-toolbar-row ai-config-toolbar-primary">
            <div className="ai-config-search-field">
              <Search size={16} />
              <input
                value={filters.search}
                onChange={(event) => updateFilter("search", event.target.value)}
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
                <span>ICD Code</span>
                <select value={filters.chapterCode} onChange={(event) => updateFilter("chapterCode", event.target.value)}>
                  <option value="">Tất cả ICD</option>
                  {chapterCodeOptions.map((code) => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </label>
              <label className="clean-field">
                <span>Sort</span>
                <select value={filters.sort} onChange={(event) => updateFilter("sort", event.target.value)}>
                  <option value="code-asc">Mã ICD A-Z</option>
                  <option value="code-desc">Mã ICD Z-A</option>
                  <option value="name-asc">Tên A-Z</option>
                  <option value="name-desc">Tên Z-A</option>
                  <option value="keywords-desc">Nhiều từ khóa nhất</option>
                </select>
              </label>
              <label className="clean-field">
                <span>Per page</span>
                <select value={filters.pageSize} onChange={(event) => updateFilter("pageSize", Number(event.target.value))}>
                  <option value="10">10 / trang</option>
                  <option value="20">20 / trang</option>
                  <option value="50">50 / trang</option>
                </select>
              </label>
            </div>

            <div className="ai-config-filter-actions">
              <button className="btn btn-primary btn-small" type="submit"><Filter size={14} /> Apply</button>
              <button className="btn btn-ghost btn-small" type="button" onClick={clearFilters}><RotateCcw size={14} /> Clear</button>
            </div>
          </div>
        </form>
      </section>

      {loading ? (
        <p className="muted-text">Đang tải ICD Chapter...</p>
      ) : (
        <div className="admin-table-list">
          {pagedChapters.length === 0 && <p className="muted-text">Chưa có ICD Chapter.</p>}
          {pagedChapters.map((chapter) => {
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
          <button className="btn btn-ghost btn-small" type="button" disabled={safePageNumber <= 1} onClick={() => setPageNumber((current) => Math.max(1, current - 1))}>
            Trước
          </button>
          <span>Trang {safePageNumber} / {totalPages} · {pagedChapters.length} / {filteredChapters.length} ICD Chapters</span>
          <button className="btn btn-ghost btn-small" type="button" disabled={safePageNumber >= totalPages} onClick={() => setPageNumber((current) => Math.min(totalPages, current + 1))}>
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
