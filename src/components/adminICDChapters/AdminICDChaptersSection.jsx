import {
  BookOpen,
  Braces,
  Eye,
  Filter,
  Hash,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Tags,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CustomSelect, Dialog, EmptyState, ErrorState, LoadingState, PAGE_SIZE_OPTIONS } from "../ui";

function Field({ label, children, help, className = "", required = false }) {
  return (
    <label className={`clean-field ${className}`.trim()}>
      <span>
        {label}
        {required && <small className="icd-required-note"> (bắt buộc)</small>}
      </span>
      {children}
      {help && <small>{help}</small>}
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

function getKeywords(chapter) {
  return Object.entries(chapter.keywordWeights ?? {});
}

export default function AdminICDChaptersSection({
  chapters,
  editingChapterId,
  error,
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
  const wasSavingRef = useRef(false);
  const codeInputRef = useRef(null);
  const dialogTriggerRef = useRef(null);

  useEffect(() => {
    if (formOpen && wasSavingRef.current && !saving && message?.type === "success") {
      setFormOpen(false);
    }
    wasSavingRef.current = saving;
  }, [formOpen, message, saving]);

  function rememberDialogTrigger() {
    dialogTriggerRef.current = document.activeElement;
  }

  function openCreateForm() {
    rememberDialogTrigger();
    onReset();
    setFormOpen(true);
  }

  function openEditForm(chapter) {
    rememberDialogTrigger();
    onEdit(chapter);
    setFormOpen(true);
  }

  async function openDetailForm(chapter) {
    rememberDialogTrigger();
    await onView(chapter);
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    onReset();
  }

  return (
    <section
      className="admin-panel ai-config-admin-panel icd-admin-panel icd-clinical-panel"
      aria-labelledby="admin-icd-title"
    >
      <header className="icd-clinical-heading">
        <div className="icd-clinical-heading-copy">
          <p className="eyebrow">Phân loại lâm sàng</p>
          <h2 id="admin-icd-title">Chương ICD trong hệ thống</h2>
          <p>Quản lý mã chương, tên chương và trọng số từ khóa do hệ thống sử dụng trong danh mục lâm sàng.</p>
        </div>
        <div className="icd-clinical-heading-actions">
          <div className="icd-clinical-context">
            <BookOpen size={18} aria-hidden="true" />
            <span>Danh mục dùng trong dữ liệu lâm sàng</span>
          </div>
          <button className="btn btn-ghost btn-small icd-reload-button" type="button" onClick={onReload}>
            <RefreshCw size={15} aria-hidden="true" /> Tải lại
          </button>
          <button className="btn btn-primary btn-small icd-create-button" type="button" onClick={openCreateForm}>
            <Plus size={15} aria-hidden="true" /> Tạo chương ICD
          </button>
        </div>
      </header>

      {message && (
        <div
          className={`api-message ${message.type}`}
          role={message.type === "error" ? "alert" : "status"}
          aria-live={message.type === "error" ? "assertive" : "polite"}
        >
          {message.text}
        </div>
      )}

      <section className="ai-config-filter-card icd-filter-card" aria-labelledby="icd-filter-title">
        <div className="ai-config-filter-card-header icd-filter-heading">
          <span aria-hidden="true"><Filter size={18} /></span>
          <div>
            <h3 id="icd-filter-title">Lọc danh mục chương ICD</h3>
            <p>Tìm theo mã chương, tên chương hoặc từ khóa đã được cấu hình.</p>
          </div>
        </div>

        <form className="ai-config-toolbar icd-filter-form" onSubmit={onApplyFilters}>
          <div className="ai-config-toolbar-row ai-config-toolbar-primary">
            <label className="icd-search-field">
              <span>Tìm chương ICD</span>
              <span className="icd-search-control">
                <Search size={17} aria-hidden="true" />
                <input
                  type="search"
                  autoComplete="off"
                  value={filters.search}
                  onChange={(event) => onFilterChange("search", event.target.value)}
                  placeholder="Mã chương, tên chương hoặc từ khóa"
                />
              </span>
            </label>
          </div>

          <div className="ai-config-toolbar-row ai-config-toolbar-filters">
            <div className="ai-config-filter-grid icd-filter-grid">
              <CustomSelect
                className="clean-field"
                label="Hiển thị"
                value={pageInfo.pageSize}
                options={PAGE_SIZE_OPTIONS}
                onChange={(nextPageSize) => onPageSizeChange(Number(nextPageSize))}
              />
            </div>

            <div className="ai-config-filter-actions">
              <button className="btn btn-primary btn-small" type="submit" disabled={loading}>
                <Filter size={14} aria-hidden="true" /> Áp dụng
              </button>
              <button className="btn btn-ghost btn-small" type="button" onClick={onClearFilters} disabled={loading}>
                <RotateCcw size={14} aria-hidden="true" /> Xóa lọc
              </button>
            </div>
          </div>
        </form>
      </section>

      {!loading && !error && (
        <div className="icd-result-summary" role="status" aria-live="polite">
          <BookOpen size={18} aria-hidden="true" />
          <p>
            <strong>{chapters.length} chương ICD đang hiển thị</strong>
            <span>{pageInfo.totalCount} chương phù hợp trong danh mục</span>
          </p>
        </div>
      )}

      <div className="icd-result-panel">
        {loading ? (
          <LoadingState
            label="Đang tải danh mục chương ICD..."
            description="Mã chương và trọng số từ khóa đang được đồng bộ."
          />
        ) : error ? (
          <ErrorState
            title="Không thể tải danh mục chương ICD"
            description={error}
            urgent
            action={(
              <button className="btn btn-primary btn-small" type="button" onClick={onReload}>
                <RefreshCw size={15} aria-hidden="true" /> Thử tải lại
              </button>
            )}
          />
        ) : (
          <div className="icd-card-list" role="list" aria-label="Danh mục chương ICD">
            {chapters.length === 0 && (
              <EmptyState
                title="Chưa có chương ICD phù hợp"
                description={filters.search
                  ? "Hãy điều chỉnh từ khóa hoặc xóa bộ lọc để xem lại toàn bộ danh mục."
                  : "Tạo chương ICD đầu tiên để bắt đầu quản lý danh mục lâm sàng."}
                action={filters.search
                  ? <button className="btn btn-ghost btn-small" type="button" onClick={onClearFilters}>Xóa bộ lọc</button>
                  : <button className="btn btn-primary btn-small" type="button" onClick={openCreateForm}>Tạo chương ICD</button>}
              />
            )}
            {chapters.map((chapter) => {
              const id = getChapterId(chapter);
              const code = getChapterCode(chapter);
              const name = getChapterName(chapter);
              const keywords = getKeywords(chapter);
              const accessibleName = code || name || "chưa đặt tên";

              return (
                <article className="icd-card" key={id || code} role="listitem">
                  <div className="icd-card-code" aria-label={`Mã chương ${code || "chưa có"}`}>
                    {code || "—"}
                  </div>
                  <div className="icd-card-content">
                    <strong>{name || "Chưa đặt tên chương"}</strong>
                    <dl className="icd-card-meta">
                      <div>
                        <dt><Tags size={13} aria-hidden="true" /> Từ khóa</dt>
                        <dd>{keywords.length} từ khóa đã cấu hình</dd>
                      </div>
                      <div>
                        <dt><Hash size={13} aria-hidden="true" /> Mã hệ thống</dt>
                        <dd>{id || "Không có dữ liệu"}</dd>
                      </div>
                    </dl>
                    <div className="icd-keyword-list" aria-label="Từ khóa và trọng số">
                      {keywords.length === 0 ? (
                        <span className="icd-keyword-empty">Chưa cấu hình từ khóa</span>
                      ) : (
                        <>
                          {keywords.slice(0, 4).map(([keyword, weight]) => (
                            <span className="icd-keyword" key={keyword}>
                              {keyword} <strong>{weight}</strong>
                            </span>
                          ))}
                          {keywords.length > 4 && (
                            <span className="icd-keyword-more">+{keywords.length - 4} từ khóa</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="record-actions icd-card-actions">
                    <button
                      className="btn btn-ghost btn-small"
                      type="button"
                      aria-label={`Tải chi tiết chương ICD ${accessibleName}`}
                      onClick={() => openDetailForm(chapter)}
                    >
                      <Eye size={15} aria-hidden="true" /> Chi tiết
                    </button>
                    <button
                      className="btn btn-ghost btn-small"
                      type="button"
                      aria-label={`Sửa chương ICD ${accessibleName}`}
                      onClick={() => openEditForm(chapter)}
                    >
                      <Pencil size={15} aria-hidden="true" /> Sửa
                    </button>
                    <button
                      className="btn btn-dark btn-small icd-delete-button"
                      type="button"
                      aria-label={`Xóa chương ICD ${accessibleName}`}
                      onClick={() => onDelete(chapter)}
                    >
                      <Trash2 size={15} aria-hidden="true" /> Xóa
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {!loading && !error && (
        <nav className="pagination-row icd-pagination" aria-label="Phân trang chương ICD">
          <button className="btn btn-ghost btn-small" type="button" disabled={pageInfo.pageNumber <= 1} onClick={() => onLoadPage(Math.max(1, pageInfo.pageNumber - 1))}>
            Trước
          </button>
          <span>Trang {pageInfo.pageNumber} / {pageInfo.totalPages || 1} · {chapters.length} / {pageInfo.totalCount} chương ICD</span>
          <button className="btn btn-ghost btn-small" type="button" disabled={pageInfo.pageNumber >= pageInfo.totalPages} onClick={() => onLoadPage(Math.min(pageInfo.totalPages || 1, pageInfo.pageNumber + 1))}>
            Sau
          </button>
        </nav>
      )}

      {formOpen && (
        <Dialog
          backdropClassName="doctor-modal-backdrop"
          className="doctor-modal facility-form-modal icd-chapter-modal"
          labelledBy="icd-chapter-modal-title"
          describedBy="icd-chapter-modal-description"
          onClose={closeForm}
          closeOnBackdrop={!saving}
          closeOnEscape={!saving}
          initialFocusRef={codeInputRef}
          restoreFocusRef={dialogTriggerRef}
        >
          <header className="doctor-modal-header">
            <div>
              <p className="eyebrow">{editingChapterId ? "Cập nhật" : "Tạo mới"}</p>
              <h2 id="icd-chapter-modal-title">{editingChapterId ? "Cập nhật chương ICD" : "Tạo chương ICD"}</h2>
              <p id="icd-chapter-modal-description">Nhập đúng mã chương, tên chương và trọng số từ khóa do hệ thống sử dụng.</p>
            </div>
            <button className="doctor-modal-close" type="button" aria-label="Đóng form" onClick={closeForm} disabled={saving}>×</button>
          </header>

          <form className="clean-form doctor-form facility-form icd-chapter-form" onSubmit={onSubmit}>
            <div className="facility-form-body">
              <section className="facility-form-card" aria-labelledby="icd-basic-section">
                <div className="facility-form-card-head">
                  <h3 id="icd-basic-section">Thông tin chương</h3>
                  <p>Mã và tên chương được lưu trong danh mục ICD của hệ thống.</p>
                </div>
                <div className="facility-form-grid">
                  <Field label="Mã chương" required>
                    <input
                      ref={codeInputRef}
                      value={form.chapterCode}
                      onChange={(event) => onFormChange("chapterCode", event.target.value)}
                      placeholder="Ví dụ: IX"
                      required
                    />
                  </Field>
                  <Field label="Tên chương" required>
                    <input
                      value={form.chapterName}
                      onChange={(event) => onFormChange("chapterName", event.target.value)}
                      placeholder="Ví dụ: Bệnh hệ tuần hoàn"
                      required
                    />
                  </Field>
                </div>
              </section>

              <section className="facility-form-card" aria-labelledby="icd-keywords-section">
                <div className="facility-form-card-head">
                  <h3 id="icd-keywords-section">Từ khóa và trọng số</h3>
                  <p>Nhập một đối tượng JSON; mỗi giá trị trọng số phải là số nguyên.</p>
                </div>
                <Field
                  label="Danh sách từ khóa"
                  help='Ví dụ: {"sốt": 5, "ho": 3}. Có thể để {} nếu chưa có từ khóa.'
                >
                  <textarea
                    rows={10}
                    value={form.keywordWeights}
                    onChange={(event) => onFormChange("keywordWeights", event.target.value)}
                    placeholder='{"sốt": 5, "ho": 3}'
                    spellCheck="false"
                  />
                </Field>
                <div className="icd-json-note">
                  <Braces size={16} aria-hidden="true" />
                  <span>Chỉ hỗ trợ cặp từ khóa và điểm số nguyên theo hợp đồng API hiện tại.</span>
                </div>
              </section>
            </div>
            <div className="doctor-modal-actions facility-form-actions">
              <button className="btn btn-ghost" type="button" onClick={closeForm} disabled={saving}>Hủy</button>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? "Đang lưu..." : editingChapterId ? "Lưu cập nhật" : "Tạo chương ICD"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </section>
  );
}
