import { BookOpen, Check, Filter, Pencil, Plus, RefreshCw, RotateCcw, Search, Stethoscope, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CustomSelect, DataTable, Dialog, EmptyState, ErrorState, LoadingState, PAGE_SIZE_OPTIONS } from "../ui";
import AdminSearchDatalist from "../admin/AdminSearchDatalist";
import AdminFilterDisclosure from "../admin/AdminFilterDisclosure";

function Field({ label, children, className = "", error, errorId, help, helpId, required = false }) {
  return (
    <label className={`clean-field ${error ? "department-field-error" : ""} ${className}`.trim()}>
      <span>
        {label}
        {required && <small className="department-required-note"> (bắt buộc)</small>}
      </span>
      {children}
      {help && <small id={helpId}>{help}</small>}
      {error && <small className="department-field-error-message" id={errorId}>{error}</small>}
    </label>
  );
}

export default function AdminDepartmentsSection({
  allDepartmentsCount,
  departments,
  editingDepartmentId,
  error,
  filters,
  form,
  formErrors,
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
}) {
  const [formOpen, setFormOpen] = useState(false);
  const wasSavingRef = useRef(false);
  const nameInputRef = useRef(null);
  const dialogTriggerRef = useRef(null);
  const formMessageRef = useRef(null);

  useEffect(() => {
    if (formOpen && wasSavingRef.current && !saving && message?.type === "success") {
      setFormOpen(false);
    }
    wasSavingRef.current = saving;
  }, [formOpen, message, saving]);

  useEffect(() => {
    if (formOpen && message?.type === "error") {
      formMessageRef.current?.focus();
    }
  }, [formOpen, message]);

  function openCreateForm() {
    dialogTriggerRef.current = document.activeElement;
    onReset();
    setFormOpen(true);
  }

  function openEditForm(department) {
    dialogTriggerRef.current = document.activeElement;
    onEdit(department);
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    onReset();
  }

  return (
    <section
      className="admin-panel ai-config-admin-panel department-admin-panel department-clinical-panel"
      aria-labelledby="admin-departments-title"
    >
      <header className="department-clinical-heading">
        <div className="department-clinical-heading-copy">
          <p className="eyebrow">Chuyên khoa</p>
          <h2 id="admin-departments-title">Chuyên khoa trong hệ thống</h2>
          <p>Quản lý danh mục dùng để liên kết bác sĩ, cơ sở y tế và kết quả định hướng chuyên khoa.</p>
        </div>
        <div className="department-clinical-heading-actions">
          <div className="department-clinical-context">
            <Stethoscope size={18} aria-hidden="true" />
            <span>Dữ liệu dùng xuyên suốt luồng điều hướng y tế</span>
          </div>
          <button className="btn btn-ghost btn-small department-reload-button" type="button" onClick={onReload}>
            <RefreshCw size={15} aria-hidden="true" /> Tải lại
          </button>
          <button className="btn btn-primary btn-small department-create-button" type="button" onClick={openCreateForm}>
            <Plus size={15} aria-hidden="true" /> Tạo chuyên khoa
          </button>
        </div>
      </header>

      {message && !formOpen && (
        <div
          className={`api-message ${message.type}`}
          role={message.type === "error" ? "alert" : "status"}
          aria-live={message.type === "error" ? "assertive" : "polite"}
        >
          {message.text}
        </div>
      )}

      <AdminFilterDisclosure
        className="ai-config-filter-card department-filter-card"
        description="Tìm kiếm chuyên khoa và chọn số dòng hiển thị."
        headingClassName="ai-config-filter-card-header department-filter-heading"
        icon={<Filter size={18} />}
        summary={`${filters.search ? 1 : 0} bộ lọc · ${allDepartmentsCount} chuyên khoa`}
        title="Bộ lọc chuyên khoa"
        titleId="department-filter-title"
      >
        <form className="ai-config-toolbar department-filter-form" onSubmit={onApplyFilters}>
          <div className="ai-config-toolbar-row ai-config-toolbar-primary">
            <label className="department-search-field">
              <span>Tìm chuyên khoa</span>
              <span className="department-search-control">
                <Search size={17} aria-hidden="true" />
                <input
                  type="search"
                  autoComplete="off"
                  list="department-search-options"
                  value={filters.search}
                  onChange={(event) => onFilterChange("search", event.target.value)}
                  placeholder="Tên hoặc mã ICD"
                />
                <AdminSearchDatalist
                  id="department-search-options"
                  values={departments.flatMap((department) => [
                    department.departmentName,
                    department.chapterCode,
                    department.id,
                  ])}
                />
              </span>
            </label>
          </div>

          <div className="ai-config-toolbar-row ai-config-toolbar-filters">
            <div className="ai-config-filter-grid department-filter-grid">
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
        <div className="department-result-summary" role="status" aria-live="polite">
          <BookOpen size={18} aria-hidden="true" />
          <p>
            <strong>{departments.length} chuyên khoa đang hiển thị</strong>
            <span>{allDepartmentsCount} chuyên khoa phù hợp trong danh mục</span>
          </p>
        </div>
      )}

      <div className="department-result-panel">
        {loading && !departments.length ? (
          <LoadingState
            label="Đang tải danh mục chuyên khoa..."
            description="Dữ liệu chuyên khoa và mã chương ICD đang được đồng bộ."
          />
        ) : error ? (
          <ErrorState
            title="Không thể tải danh mục chuyên khoa"
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
            className="department-table-wrap"
            caption="Danh mục chuyên khoa theo bộ lọc hiện tại"
            rowHeaderKey="department"
            getRowKey={(department) => department.id}
            rows={departments}
            emptyState={(
              <EmptyState
                title="Chưa có chuyên khoa phù hợp"
                description={filters.search
                  ? "Hãy điều chỉnh từ khóa hoặc xóa bộ lọc để xem lại toàn bộ danh mục."
                  : "Tạo chuyên khoa đầu tiên để liên kết với bác sĩ và cơ sở y tế."}
                action={filters.search
                  ? <button className="btn btn-ghost btn-small" type="button" onClick={onClearFilters}>Xóa bộ lọc</button>
                  : <button className="btn btn-primary btn-small" type="button" onClick={openCreateForm}>Tạo chuyên khoa</button>}
              />
            )}
            columns={[
              {
                key: "department",
                header: "Chuyên khoa",
                render: (department) => (
                  <div className="department-primary-cell">
                    <span className="department-primary-icon" aria-hidden="true"><Stethoscope size={18} /></span>
                    <div>
                      <strong>{department.departmentName || "Chưa đặt tên"}</strong>
                      <small>{department.description || "Chưa có mô tả cho chuyên khoa này."}</small>
                    </div>
                  </div>
                ),
              },
              {
                key: "icd",
                header: "Chương ICD",
                render: (department) => (
                  <div className="table-primary-cell">
                    <strong>{department.chapterCode || "Chưa liên kết"}</strong>
                    <small>Mã hệ thống · {department.id || "Không có dữ liệu"}</small>
                  </div>
                ),
              },
              {
                key: "actions",
                header: "Thao tác",
                render: (department) => (
                  <div className="record-actions" aria-label={`Thao tác với chuyên khoa ${department.departmentName || "chưa đặt tên"}`}>
                    <button
                      className="btn btn-ghost btn-small"
                      type="button"
                      aria-label={`Sửa chuyên khoa ${department.departmentName || "chưa đặt tên"}`}
                      onClick={() => openEditForm(department)}
                    >
                      <Pencil size={14} aria-hidden="true" /> Sửa
                    </button>
                    <button
                      className="btn btn-dark btn-small department-delete-button"
                      type="button"
                      aria-label={`Xóa chuyên khoa ${department.departmentName || "chưa đặt tên"}`}
                      onClick={() => onDelete(department.id)}
                    >
                      <Trash2 size={14} aria-hidden="true" /> Xóa
                    </button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </div>

      {!loading && !error && (
        <nav className="pagination-row department-pagination" aria-label="Phân trang chuyên khoa">
          <button className="btn btn-ghost btn-small" type="button" disabled={pageInfo.pageNumber <= 1} onClick={() => onLoadPage(Math.max(1, pageInfo.pageNumber - 1))}>
            Trước
          </button>
          <span>Trang {pageInfo.pageNumber} / {pageInfo.totalPages || 1} · {departments.length} / {allDepartmentsCount} chuyên khoa</span>
          <button className="btn btn-ghost btn-small" type="button" disabled={pageInfo.pageNumber >= pageInfo.totalPages} onClick={() => onLoadPage(Math.min(pageInfo.totalPages || 1, pageInfo.pageNumber + 1))}>
            Sau
          </button>
        </nav>
      )}

      {formOpen && (
        <Dialog
          backdropClassName="doctor-modal-backdrop"
          className="doctor-modal facility-form-modal department-form-modal"
          labelledBy="department-modal-title"
          onClose={closeForm}
          closeOnBackdrop={!saving}
          closeOnEscape={!saving}
          initialFocusRef={nameInputRef}
          restoreFocusRef={dialogTriggerRef}
        >
          <header className="doctor-modal-header">
            <span className="department-modal-icon" aria-hidden="true">
              <BookOpen size={26} />
            </span>
            <div>
              <p className="eyebrow">{editingDepartmentId ? "Cập nhật" : "Tạo mới"}</p>
              <h2 id="department-modal-title">{editingDepartmentId ? "Cập nhật chuyên khoa" : "Tạo chuyên khoa"}</h2>
              <p>Thông tin được dùng khi liên kết bác sĩ, cơ sở y tế và kết quả định hướng chuyên khoa.</p>
            </div>
            <button className="doctor-modal-close" type="button" aria-label="Đóng form" onClick={closeForm} disabled={saving}>×</button>
          </header>

          <form className="clean-form doctor-form facility-form department-form" onSubmit={onSubmit} noValidate>
            {message?.type === "error" && (
              <div
                ref={formMessageRef}
                className="api-message error department-form-message"
                role="alert"
                tabIndex={-1}
              >
                {message.text}
              </div>
            )}
            <div className="facility-form-body">
              <section className="facility-form-card" aria-labelledby="department-basic-section">
                <div className="facility-form-card-head">
                  <span className="facility-form-card-icon" aria-hidden="true"><Stethoscope size={18} /></span>
                  <div>
                    <h3 id="department-basic-section">Thông tin chuyên khoa</h3>
                    <p>Thông tin này được dùng khi gán bác sĩ, cơ sở y tế và gợi ý chuyên khoa phù hợp.</p>
                  </div>
                </div>

                <div className="facility-form-grid department-form-grid">
                  <Field
                    label="Tên chuyên khoa"
                    className="facility-form-span-2"
                    error={formErrors.departmentName}
                    errorId="department-name-error"
                    required
                  >
                    <input
                      ref={nameInputRef}
                      value={form.departmentName}
                      onChange={(event) => onFormChange("departmentName", event.target.value)}
                      placeholder="Ví dụ: Tim mạch"
                      aria-invalid={Boolean(formErrors.departmentName)}
                      aria-describedby={formErrors.departmentName ? "department-name-error" : undefined}
                      required
                    />
                  </Field>

                  <Field
                    label="Mô tả"
                    className="facility-form-span-2"
                    helpId="department-description-help"
                    help="Mô tả ngắn phạm vi chuyên môn hoặc nhóm vấn đề thường được tiếp nhận."
                  >
                    <textarea
                      rows={5}
                      value={form.description}
                      onChange={(event) => onFormChange("description", event.target.value)}
                      placeholder="Mô tả chức năng, nhóm triệu chứng thường gặp..."
                      aria-describedby="department-description-help"
                    />
                  </Field>
                </div>
              </section>

              <section className="facility-form-card" aria-labelledby="department-icd-section">
                <div className="facility-form-card-head">
                  <span className="facility-form-card-icon" aria-hidden="true"><BookOpen size={18} /></span>
                  <div>
                    <h3 id="department-icd-section">Liên kết ICD</h3>
                    <p>Gắn chuyên khoa với đúng chương ICD để hệ thống định hướng phân tích triệu chứng.</p>
                  </div>
                </div>

                <div className="facility-form-grid department-form-grid">
                  <Field
                    label="Mã chương ICD"
                    className="facility-form-span-2"
                    error={formErrors.chapterCode}
                    errorId="department-chapter-code-error"
                    helpId="department-chapter-code-help"
                    help="Nhập mã chương ICD đang áp dụng cho chuyên khoa này, nếu có."
                  >
                    <input
                      value={form.chapterCode}
                      onChange={(event) => onFormChange("chapterCode", event.target.value)}
                      placeholder="Ví dụ: IX"
                      aria-invalid={Boolean(formErrors.chapterCode)}
                      aria-describedby={formErrors.chapterCode
                        ? "department-chapter-code-help department-chapter-code-error"
                        : "department-chapter-code-help"}
                    />
                  </Field>
                </div>
              </section>
            </div>

            <div className="doctor-modal-actions facility-form-actions">
              <button className="btn btn-ghost" type="button" onClick={closeForm} disabled={saving}>Hủy</button>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                <Check size={16} aria-hidden="true" />
                {saving ? "Đang lưu..." : editingDepartmentId ? "Lưu cập nhật" : "Tạo chuyên khoa"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </section>
  );
}
