import {
  BookOpen,
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
import AdminFilterDisclosure from "../admin/AdminFilterDisclosure";
import { focusFirstInvalidField, getAdminFieldProps } from "../admin/adminFormUtils";
import { CustomSelect, DataTable, Dialog, EmptyState, ErrorState, LoadingState, PAGE_SIZE_OPTIONS } from "../ui";
import KeywordWeightEditor from "./KeywordWeightEditor";

function Field({
  label,
  children,
  help,
  helpId,
  className = "",
  error = "",
  required = false,
}) {
  return (
    <label className={`clean-field ${error ? "icd-field-error" : ""} ${className}`.trim()}>
      <span>
        {label}
        {required && <small className="icd-required-note"> (bắt buộc)</small>}
      </span>
      {children}
      {(error || help) && (
        <small id={helpId} role={error ? "alert" : undefined}>
          {error || help}
        </small>
      )}
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
  const formRef = useRef(null);
  const codeInputRef = useRef(null);
  const dialogTriggerRef = useRef(null);
  const keywordEditorRef = useRef(null);
  const [fieldErrors, setFieldErrors] = useState({});

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
    setFieldErrors({});
    setFormOpen(true);
  }

  function openEditForm(chapter) {
    rememberDialogTrigger();
    onEdit(chapter);
    setFieldErrors({});
    setFormOpen(true);
  }

  async function openDetailForm(chapter) {
    rememberDialogTrigger();
    await onView(chapter);
    setFieldErrors({});
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    setFieldErrors({});
    onReset();
  }

  function handleFormSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!form.chapterCode.trim()) nextErrors.chapterCode = "Vui lòng nhập mã chương ICD.";
    if (!form.chapterName.trim()) nextErrors.chapterName = "Vui lòng nhập tên chương ICD.";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      focusFirstInvalidField(formRef, nextErrors);
      return;
    }

    const keywordWeights = keywordEditorRef.current?.validate();
    if (!keywordWeights) return;
    onSubmit(event, keywordWeights);
  }

  function handleBasicFieldChange(field, value) {
    onFormChange(field, value);
    setFieldErrors((current) => ({ ...current, [field]: "" }));
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

      <AdminFilterDisclosure
        className="ai-config-filter-card icd-filter-card"
        description="Tìm theo mã chương, tên chương hoặc từ khóa đã được cấu hình."
        headingClassName="ai-config-filter-card-header icd-filter-heading"
        icon={<Filter size={18} />}
        summary={`${filters.search ? 1 : 0} bộ lọc · ${pageInfo.totalCount} chương`}
        title="Lọc danh mục chương ICD"
        titleId="icd-filter-title"
      >
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
      </AdminFilterDisclosure>

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
          <DataTable
            className="icd-table-wrap"
            caption="Danh mục chương ICD theo bộ lọc hiện tại"
            rowHeaderKey="chapter"
            getRowKey={(chapter) => getChapterId(chapter) || getChapterCode(chapter)}
            rows={chapters}
            emptyState={(
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
            columns={[
              {
                key: "chapter",
                header: "Chương ICD",
                render: (chapter) => (
                  <div className="icd-primary-cell">
                    <span className="icd-primary-code">{getChapterCode(chapter) || "—"}</span>
                    <div>
                      <strong>{getChapterName(chapter) || "Chưa đặt tên chương"}</strong>
                      <small>Mã hệ thống · {getChapterId(chapter) || "Không có dữ liệu"}</small>
                    </div>
                  </div>
                ),
              },
              {
                key: "keywords",
                header: "Từ khóa",
                render: (chapter) => {
                  const keywords = getKeywords(chapter);
                  if (keywords.length === 0) return <span className="icd-keyword-empty">Chưa cấu hình từ khóa</span>;
                  return (
                    <div className="icd-keyword-list" aria-label="Từ khóa và trọng số">
                      {keywords.slice(0, 4).map(([keyword, weight]) => (
                        <span className="icd-keyword" key={keyword}>
                          {keyword} <strong>{weight}</strong>
                        </span>
                      ))}
                      {keywords.length > 4 && (
                        <span className="icd-keyword-more">+{keywords.length - 4} từ khóa</span>
                      )}
                    </div>
                  );
                },
              },
              {
                key: "actions",
                header: "Thao tác",
                render: (chapter) => {
                  const accessibleName = getChapterCode(chapter) || getChapterName(chapter) || "chưa đặt tên";
                  return (
                    <div className="record-actions" aria-label={`Thao tác với chương ICD ${accessibleName}`}>
                      <button
                        className="btn btn-ghost btn-small"
                        type="button"
                        aria-label={`Tải chi tiết chương ICD ${accessibleName}`}
                        onClick={() => openDetailForm(chapter)}
                      >
                        <Eye size={14} aria-hidden="true" /> Chi tiết
                      </button>
                      <button
                        className="btn btn-ghost btn-small"
                        type="button"
                        aria-label={`Sửa chương ICD ${accessibleName}`}
                        onClick={() => openEditForm(chapter)}
                      >
                        <Pencil size={14} aria-hidden="true" /> Sửa
                      </button>
                      <button
                        className="btn btn-dark btn-small icd-delete-button"
                        type="button"
                        aria-label={`Xóa chương ICD ${accessibleName}`}
                        onClick={() => onDelete(chapter)}
                      >
                        <Trash2 size={14} aria-hidden="true" /> Xóa
                      </button>
                    </div>
                  );
                },
              },
            ]}
          />
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
          <header className="doctor-modal-header icd-chapter-modal-header">
            <span className="icd-chapter-modal-icon" aria-hidden="true"><BookOpen size={22} /></span>
            <div>
              <p className="eyebrow">{editingChapterId ? "Cập nhật" : "Tạo mới"}</p>
              <h2 id="icd-chapter-modal-title">{editingChapterId ? "Cập nhật chương ICD" : "Tạo chương ICD"}</h2>
              <p id="icd-chapter-modal-description">Nhập đúng mã chương, tên chương và trọng số từ khóa do hệ thống sử dụng.</p>
            </div>
            <button className="doctor-modal-close" type="button" aria-label="Đóng form" onClick={closeForm} disabled={saving}>×</button>
          </header>

          <form ref={formRef} className="clean-form doctor-form facility-form icd-chapter-form" onSubmit={handleFormSubmit} noValidate>
            <div className="facility-form-body">
              <section className="facility-form-card" aria-labelledby="icd-basic-section">
                <div className="facility-form-card-head">
                  <span className="facility-form-card-icon" aria-hidden="true"><Hash size={18} /></span>
                  <div>
                    <h3 id="icd-basic-section">Thông tin chương</h3>
                    <p>Mã và tên chương được lưu trong danh mục ICD của hệ thống.</p>
                  </div>
                </div>
                <div className="facility-form-grid">
                  <Field
                    label="Mã chương"
                    required
                    error={fieldErrors.chapterCode}
                    helpId="icd-chapter-code-error"
                  >
                    <input
                      {...getAdminFieldProps(
                        "chapterCode",
                        fieldErrors.chapterCode,
                        fieldErrors.chapterCode ? "icd-chapter-code-error" : "",
                      )}
                      name="chapterCode"
                      ref={codeInputRef}
                      value={form.chapterCode}
                      onChange={(event) => handleBasicFieldChange("chapterCode", event.target.value)}
                      placeholder="Ví dụ: IX"
                      required
                    />
                  </Field>
                  <Field
                    label="Tên chương"
                    required
                    error={fieldErrors.chapterName}
                    helpId="icd-chapter-name-error"
                  >
                    <input
                      {...getAdminFieldProps(
                        "chapterName",
                        fieldErrors.chapterName,
                        fieldErrors.chapterName ? "icd-chapter-name-error" : "",
                      )}
                      name="chapterName"
                      value={form.chapterName}
                      onChange={(event) => handleBasicFieldChange("chapterName", event.target.value)}
                      placeholder="Ví dụ: Bệnh hệ tuần hoàn"
                      required
                    />
                  </Field>
                </div>
              </section>

              <section className="facility-form-card" aria-labelledby="icd-keywords-section">
                <div className="facility-form-card-head">
                  <span className="facility-form-card-icon" aria-hidden="true"><Tags size={18} /></span>
                  <div>
                    <h3 id="icd-keywords-section">Từ khóa và trọng số</h3>
                    <p>Thêm các từ khóa liên quan để hệ thống tự động nhận diện chương bệnh khi phân tích triệu chứng.</p>
                  </div>
                </div>
                <KeywordWeightEditor
                  ref={keywordEditorRef}
                  value={form.keywordWeights}
                  onChange={(value) => onFormChange("keywordWeights", value)}
                />
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
