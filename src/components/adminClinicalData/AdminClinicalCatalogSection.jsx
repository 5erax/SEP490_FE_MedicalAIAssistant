import {
  CalendarDays,
  CircleHelp,
  FileText,
  Filter,
  Hash,
  Languages,
  ListChecks,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CustomSelect, Dialog, EmptyState, LoadingState, PAGE_SIZE_OPTIONS } from "../ui";

const DEFAULT_FILTERS = {
  search: "",
  chapterId: "",
};

function unwrapItems(response) {
  const data = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(data)) return data;
  return data?.items ?? [];
}

function unwrapPageInfo(response, fallbackPageNumber, fallbackPageSize) {
  const data = response?.data?.data ?? response?.data ?? response;
  const items = Array.isArray(data) ? data : data?.items ?? [];
  const totalCount = data?.totalCount ?? data?.totalItems ?? items.length;
  const pageSize = data?.pageSize ?? fallbackPageSize;

  return {
    pageNumber: data?.pageNumber ?? fallbackPageNumber,
    pageSize,
    totalCount,
    totalPages: data?.totalPages ?? Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getChapterCode(item, chapterById) {
  return item.chapterCode || chapterById.get(item.chapterId)?.chapterCode || "";
}

function createEmptyForm(fields) {
  return Object.fromEntries(fields.map((field) => [field.name, field.type === "answers" ? [] : ""]));
}

function answersDictionaryToRows(answers) {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) return [];
  return Object.entries(answers).map(([vietnameseLabel, englishLabel]) => ({
    id: crypto.randomUUID(),
    vietnameseLabel,
    englishLabel,
  }));
}

function answersRowsToDictionary(rows) {
  return rows.reduce((result, row) => {
    const vietnameseLabel = row.vietnameseLabel.trim();
    const englishLabel = row.englishLabel.trim();
    if (vietnameseLabel || englishLabel) {
      result[vietnameseLabel] = englishLabel;
    }
    return result;
  }, {});
}

function getAnswerValidationErrors(rows) {
  const errors = [];
  const seenLabels = new Set();

  rows.forEach((row, index) => {
    const vietnameseLabel = row.vietnameseLabel.trim();
    const englishLabel = row.englishLabel.trim();
    if (!vietnameseLabel && !englishLabel) return;
    if (!vietnameseLabel) errors.push(`Đáp án ${index + 1}: nhãn tiếng Việt không được rỗng.`);
    if (!englishLabel) errors.push(`Đáp án ${index + 1}: nhãn tiếng Anh không được rỗng.`);
    if (vietnameseLabel) {
      const normalizedLabel = vietnameseLabel.toLowerCase();
      if (seenLabels.has(normalizedLabel)) {
        errors.push(`Đáp án ${index + 1}: nhãn tiếng Việt bị trùng.`);
      }
      seenLabels.add(normalizedLabel);
    }
  });

  return errors;
}

function getAnswerCount(item) {
  if (!item.answers || typeof item.answers !== "object" || Array.isArray(item.answers)) return 0;
  return Object.keys(item.answers).length;
}

export default function AdminClinicalCatalogSection({ config, icdChapters = [], service }) {
  const emptyForm = createEmptyForm(config.fields);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("info");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [pageInfo, setPageInfo] = useState({ pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 });
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const createButtonRef = useRef(null);
  const chapterSelectRef = useRef(null);
  const formTriggerRef = useRef(null);
  const formErrorRef = useRef(null);
  const deleteConfirmRef = useRef(null);
  const deleteTriggerRef = useRef(null);
  const focusCreateAfterDeleteRef = useRef(false);

  useEffect(() => {
    if (!deleteTarget && focusCreateAfterDeleteRef.current) {
      focusCreateAfterDeleteRef.current = false;
      window.requestAnimationFrame(() => createButtonRef.current?.focus());
    }
  }, [deleteTarget]);

  const chapterById = useMemo(() => {
    return new Map(icdChapters.map((chapter) => [chapter.id, chapter]));
  }, [icdChapters]);

  const icdOptions = useMemo(() => {
    return icdChapters
      .filter((chapter) => chapter.id && chapter.chapterCode)
      .map((chapter) => ({
        id: chapter.id,
        code: chapter.chapterCode,
        label: chapter.chapterName || chapter.chapterCode,
      }))
      .sort((left, right) => left.code.localeCompare(right.code, "vi"));
  }, [icdChapters]);

  async function loadItems(pageNumber = pageInfo.pageNumber, pageSize = pageInfo.pageSize, activeFilters = appliedFilters) {
    setStatus("loading");
    setMessage("");
    try {
      const response = await service.list(pageNumber, pageSize, activeFilters);
      setItems(unwrapItems(response));
      setPageInfo(unwrapPageInfo(response, pageNumber, pageSize));
      setStatus("ready");
    } catch {
      setMessageTone("error");
      setMessage(`Không thể tải ${config.pluralLabel}. Vui lòng thử lại.`);
      setStatus("error");
    }
  }

  useEffect(() => {
    const handle = window.setTimeout(loadItems, 0);
    return () => window.clearTimeout(handle);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function resetForm() {
    setEditingId("");
    setForm(emptyForm);
  }

  async function submit(event) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");
    try {
      const answerRows = form.answers ?? [];
      const answerErrors = getAnswerValidationErrors(answerRows);
      if (answerErrors.length > 0) {
        setMessageTone("error");
        setMessage(answerErrors.join(" "));
        setStatus("ready");
        window.requestAnimationFrame(() => formErrorRef.current?.focus());
        return;
      }

      const payload = Object.fromEntries(config.fields.map((field) => [
        field.name,
        field.type === "answers"
          ? answersRowsToDictionary(form[field.name] ?? [])
          : field.serialize ? field.serialize(form[field.name]) : form[field.name],
      ]));
      const wasEditing = Boolean(editingId);
      if (wasEditing) await service.update(editingId, payload);
      else await service.create(payload);
      const successMessage = wasEditing
        ? `Đã cập nhật ${config.singularLabel}.`
        : `Đã tạo ${config.singularLabel}.`;
      const targetPage = wasEditing ? pageInfo.pageNumber : 1;
      resetForm();
      setFormOpen(false);
      await loadItems(targetPage, pageInfo.pageSize);
      setMessageTone("success");
      setMessage(successMessage);
    } catch (error) {
      setMessageTone("error");
      setMessage(error.message || `Không thể lưu ${config.singularLabel}.`);
      setStatus("ready");
      window.requestAnimationFrame(() => formErrorRef.current?.focus());
    }
  }

  function edit(item) {
    formTriggerRef.current = document.activeElement;
    setEditingId(item.id);
    setForm(Object.fromEntries(config.fields.map((field) => [
      field.name,
      field.type === "answers" ? answersDictionaryToRows(item[field.name]) : item[field.name] ?? "",
    ])));
    setMessage("");
    setFormOpen(true);
  }

  function addAnswerRow() {
    setForm((current) => ({
      ...current,
      answers: [
        ...(current.answers ?? []),
        { id: crypto.randomUUID(), vietnameseLabel: "", englishLabel: "" },
      ],
    }));
  }

  function updateAnswerRow(rowId, key, value) {
    setForm((current) => ({
      ...current,
      answers: (current.answers ?? []).map((row) => (
        row.id === rowId ? { ...row, [key]: value } : row
      )),
    }));
  }

  function removeAnswerRow(rowId) {
    setForm((current) => ({
      ...current,
      answers: (current.answers ?? []).filter((row) => row.id !== rowId),
    }));
  }

  function requestRemove(item) {
    deleteTriggerRef.current = document.activeElement;
    setDeleteTarget(item);
  }

  async function confirmRemove() {
    if (!deleteTarget) return;
    setStatus("saving");
    setMessage("");
    try {
      await service.remove(deleteTarget.id);
      setItems((current) => current.filter((entry) => entry.id !== deleteTarget.id));
      setPageInfo((current) => ({ ...current, totalCount: Math.max(0, current.totalCount - 1) }));
      setMessageTone("success");
      setMessage(`Đã xóa ${config.singularLabel}.`);
      if (editingId === deleteTarget.id) resetForm();
      focusCreateAfterDeleteRef.current = true;
      setDeleteTarget(null);
      setStatus("ready");
    } catch (error) {
      setMessageTone("error");
      setMessage(error.message || `Không thể xóa ${config.singularLabel}.`);
      setDeleteTarget(null);
      setStatus("ready");
    }
  }

  function changePageSize(value) {
    setPageInfo((current) => ({ ...current, pageSize: value, pageNumber: 1 }));
    loadItems(1, value);
  }

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function applyFilters(event) {
    event.preventDefault();
    setAppliedFilters(filters);
    setPageInfo((current) => ({ ...current, pageNumber: 1 }));
    loadItems(1, pageInfo.pageSize, filters);
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setPageInfo((current) => ({ ...current, pageNumber: 1 }));
    loadItems(1, pageInfo.pageSize, DEFAULT_FILTERS);
  }

  function openCreateForm() {
    formTriggerRef.current = document.activeElement;
    resetForm();
    setMessage("");
    setFormOpen(true);
  }

  function closeForm() {
    if (status === "saving") return;
    setFormOpen(false);
    setMessage("");
    resetForm();
  }

  const chapterField = config.fields.find((field) => field.name === "chapterId");
  const sortOrderField = config.fields.find((field) => field.name === "sortOrder");
  const questionViField = config.fields.find((field) => field.name === "questionVi");
  const englishPrefixField = config.fields.find((field) => field.name === "englishPrefix");
  const answersField = config.fields.find((field) => field.type === "answers");
  const chapterFilterOptions = [
    { value: "", label: "Tất cả chương ICD" },
    ...icdOptions.map((option) => ({
      value: option.id,
      label: `${option.code} - ${option.label}`,
    })),
  ];

  function renderFormControl(field) {
    if (!field) return null;

    if (field.type === "icd-select") {
      return (
        <select
          ref={chapterSelectRef}
          value={form[field.name]}
          required={field.required}
          onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}
        >
          <option value="">Chọn chương ICD</option>
          {icdOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.code} - {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (field.multiline) {
      return (
        <textarea
          rows={5}
          value={form[field.name]}
          required={field.required}
          onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}
        />
      );
    }

    return (
      <input
        type={field.type || "text"}
        min={field.min}
        step={field.step}
        value={form[field.name]}
        required={field.required}
        onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}
      />
    );
  }

  function renderField(field) {
    if (!field) return null;
    return (
      <label className="clean-field" key={field.name}>
        <span>
          {field.label}
          {field.required && <small className="clinical-required-note"> (bắt buộc)</small>}
        </span>
        {renderFormControl(field)}
      </label>
    );
  }

  return (
    <section
      className="admin-panel ai-config-admin-panel clinical-catalog-panel"
      aria-labelledby="admin-clinical-questions-title"
    >
      <header className="clinical-catalog-heading">
        <div className="clinical-catalog-heading-copy">
          <p className="eyebrow">Dữ liệu lâm sàng</p>
          <h2 id="admin-clinical-questions-title">Câu hỏi lâm sàng trong hệ thống</h2>
          <p>Quản lý câu hỏi song ngữ, chương ICD, thứ tự hiển thị và các lựa chọn trả lời.</p>
        </div>
        <div className="clinical-catalog-heading-actions">
          <div className="clinical-catalog-context">
            <CircleHelp size={18} aria-hidden="true" />
            <span>Danh mục dùng trong luồng phân tích triệu chứng</span>
          </div>
          <button className="btn btn-ghost btn-small clinical-catalog-reload" type="button" onClick={() => loadItems()}>
            <RefreshCw size={15} aria-hidden="true" /> Tải lại
          </button>
          <button ref={createButtonRef} className="btn btn-primary btn-small clinical-catalog-create" type="button" onClick={openCreateForm}>
            <Plus size={15} aria-hidden="true" /> Tạo câu hỏi
          </button>
        </div>
      </header>

      {!formOpen && message && (
        <div
          className={`api-message ${messageTone}`}
          role={messageTone === "error" ? "alert" : "status"}
          aria-live={messageTone === "error" ? "assertive" : "polite"}
        >
          {message}
        </div>
      )}

      <section className="ai-config-filter-card clinical-catalog-filter-card" aria-labelledby="clinical-question-filter-title">
        <div className="ai-config-filter-card-header clinical-catalog-filter-heading">
          <span aria-hidden="true"><Filter size={18} /></span>
          <div>
            <h3 id="clinical-question-filter-title">Lọc danh mục câu hỏi</h3>
            <p>Tìm theo nội dung tiếng Việt, tiếng Anh hoặc giới hạn theo chương ICD.</p>
          </div>
        </div>

        <form className="ai-config-toolbar clinical-catalog-filter-form" onSubmit={applyFilters}>
          <div className="ai-config-toolbar-row ai-config-toolbar-primary">
            <label className="clinical-catalog-search-field">
              <span>Tìm câu hỏi</span>
              <span className="clinical-catalog-search-control">
                <Search size={17} aria-hidden="true" />
                <input
                  type="search"
                  autoComplete="off"
                  value={filters.search}
                  onChange={(event) => updateFilter("search", event.target.value)}
                  placeholder="Nội dung tiếng Việt hoặc tiếng Anh"
                />
              </span>
            </label>
          </div>

          <div className="ai-config-toolbar-row ai-config-toolbar-filters">
            <div className="ai-config-filter-grid clinical-catalog-filter-grid">
              <CustomSelect
                className="clean-field"
                label="Chương ICD"
                value={filters.chapterId}
                options={chapterFilterOptions}
                onChange={(nextValue) => updateFilter("chapterId", nextValue)}
              />
              <CustomSelect
                className="clean-field"
                label="Hiển thị"
                value={pageInfo.pageSize}
                options={PAGE_SIZE_OPTIONS}
                onChange={(nextPageSize) => changePageSize(Number(nextPageSize))}
              />
            </div>

            <div className="ai-config-filter-actions">
              <button className="btn btn-primary btn-small" type="submit" disabled={status === "loading"}>
                <Filter size={14} aria-hidden="true" /> Áp dụng
              </button>
              <button className="btn btn-ghost btn-small" type="button" onClick={clearFilters} disabled={status === "loading"}>
                <RotateCcw size={14} aria-hidden="true" /> Xóa lọc
              </button>
            </div>
          </div>
        </form>
      </section>

      {status !== "loading" && status !== "saving" && (
        <div className="clinical-catalog-result-summary" role="status" aria-live="polite">
          <ListChecks size={18} aria-hidden="true" />
          <p>
            <strong>{items.length} câu hỏi đang hiển thị</strong>
            <span>{pageInfo.totalCount} câu hỏi phù hợp trong danh mục</span>
          </p>
        </div>
      )}

      <div className="clinical-catalog-result-panel">
        {status === "loading" ? (
          <LoadingState
            label="Đang tải câu hỏi lâm sàng..."
            description="Nội dung câu hỏi và liên kết chương ICD đang được đồng bộ."
          />
        ) : (
          <div className="clinical-question-card-list" role="list" aria-label="Danh mục câu hỏi lâm sàng">
            {items.length === 0 && (
              <EmptyState
                title="Chưa có câu hỏi lâm sàng phù hợp"
                description={filters.search || filters.chapterId
                  ? "Hãy điều chỉnh điều kiện hoặc xóa bộ lọc để xem lại toàn bộ danh mục."
                  : "Tạo câu hỏi đầu tiên để bắt đầu xây dựng danh mục lâm sàng."}
                action={filters.search || filters.chapterId
                  ? <button className="btn btn-ghost btn-small" type="button" onClick={clearFilters}>Xóa bộ lọc</button>
                  : <button className="btn btn-primary btn-small" type="button" onClick={openCreateForm}>Tạo câu hỏi</button>}
              />
            )}
            {items.map((item) => {
              const chapterCode = getChapterCode(item, chapterById);
              const createdAt = formatDateTime(item.createdAt);
              const answerCount = getAnswerCount(item);
              const questionName = item[config.primaryField] || "chưa có nội dung";

              return (
                <article className="clinical-question-card" key={item.id} role="listitem">
                  <div className="clinical-question-card-code" aria-label={`Chương ICD ${chapterCode || "chưa liên kết"}`}>
                    {chapterCode || "—"}
                  </div>
                  <div className="clinical-question-card-content">
                    <strong>{questionName}</strong>
                    <p className="clinical-question-translation">
                      <Languages size={14} aria-hidden="true" />
                      <span>{item[config.secondaryField] || "Chưa có nội dung tiếng Anh."}</span>
                    </p>
                    <dl className="clinical-question-card-meta">
                      <div>
                        <dt><Hash size={13} aria-hidden="true" /> Thứ tự</dt>
                        <dd>{item.sortOrder ?? "Chưa có"}</dd>
                      </div>
                      <div>
                        <dt><ListChecks size={13} aria-hidden="true" /> Đáp án</dt>
                        <dd>{answerCount} lựa chọn</dd>
                      </div>
                      {createdAt && (
                        <div>
                          <dt><CalendarDays size={13} aria-hidden="true" /> Ngày tạo</dt>
                          <dd>{createdAt}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                  <div className="record-actions clinical-question-card-actions">
                    <button
                      className="btn btn-ghost btn-small"
                      type="button"
                      aria-label={`Sửa câu hỏi ${questionName}`}
                      onClick={() => edit(item)}
                    >
                      <Pencil size={15} aria-hidden="true" /> Sửa
                    </button>
                    <button
                      className="btn btn-dark btn-small clinical-question-delete"
                      type="button"
                      aria-label={`Xóa câu hỏi ${questionName}`}
                      onClick={() => requestRemove(item)}
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

      {status !== "loading" && (
        <nav className="pagination-row clinical-catalog-pagination" aria-label="Phân trang câu hỏi lâm sàng">
          <button
            className="btn btn-ghost btn-small"
            type="button"
            disabled={pageInfo.pageNumber <= 1 || status === "saving"}
            onClick={() => loadItems(Math.max(1, pageInfo.pageNumber - 1), pageInfo.pageSize)}
          >
            Trước
          </button>
          <span>Trang {pageInfo.pageNumber} / {pageInfo.totalPages || 1} · {items.length} / {pageInfo.totalCount} {config.pluralLabel}</span>
          <button
            className="btn btn-ghost btn-small"
            type="button"
            disabled={pageInfo.pageNumber >= pageInfo.totalPages || status === "saving"}
            onClick={() => loadItems(Math.min(pageInfo.totalPages || 1, pageInfo.pageNumber + 1), pageInfo.pageSize)}
          >
            Sau
          </button>
        </nav>
      )}

      {formOpen && (
        <Dialog
          backdropClassName="doctor-modal-backdrop"
          className="doctor-modal clinical-question-modal"
          labelledBy="clinical-question-modal-title"
          describedBy="clinical-question-modal-description"
          onClose={closeForm}
          closeOnBackdrop={status !== "saving"}
          closeOnEscape={status !== "saving"}
          initialFocusRef={chapterSelectRef}
          restoreFocusRef={formTriggerRef}
        >
          <header className="doctor-modal-header clinical-question-modal-header">
            <span className="clinical-question-modal-icon" aria-hidden="true"><CircleHelp size={22} /></span>
            <div>
              <p className="eyebrow">{editingId ? "Cập nhật" : "Tạo mới"}</p>
              <h2 id="clinical-question-modal-title">
                {editingId ? "Cập nhật câu hỏi lâm sàng" : "Tạo câu hỏi lâm sàng"}
              </h2>
              <p id="clinical-question-modal-description">Nhập câu hỏi song ngữ, thứ tự hiển thị và các lựa chọn trả lời tương ứng.</p>
            </div>
            <button className="doctor-modal-close" type="button" aria-label="Đóng form" onClick={closeForm} disabled={status === "saving"}>×</button>
          </header>

          <form className="clean-form doctor-form clinical-question-form" onSubmit={submit}>
            {message && (
              <div
                ref={formErrorRef}
                className={`api-message ${messageTone}`}
                role={messageTone === "error" ? "alert" : "status"}
                tabIndex={messageTone === "error" ? -1 : undefined}
              >
                {message}
              </div>
            )}

            <section className="clinical-form-section" aria-labelledby="clinical-question-info-title">
              <div className="clinical-form-section-head">
                <div>
                  <strong id="clinical-question-info-title">Thông tin phân loại</strong>
                  <p>Chọn chương ICD và vị trí hiển thị của câu hỏi.</p>
                </div>
              </div>
              <div className="clinical-form-two-column">
                {[chapterField, sortOrderField].filter(Boolean).map(renderField)}
              </div>
            </section>

            <section className="clinical-form-section" aria-labelledby="clinical-question-content-title">
              <div className="clinical-form-section-head">
                <div>
                  <strong id="clinical-question-content-title">Nội dung song ngữ</strong>
                  <p>Cung cấp đầy đủ câu hỏi tiếng Việt và bản tiếng Anh tương ứng.</p>
                </div>
              </div>
              <div className="clinical-form-content-grid">
                {[questionViField, englishPrefixField].filter(Boolean).map(renderField)}
              </div>
            </section>

            {answersField && (
              <section className="clinical-form-section clinical-answer-section" aria-labelledby="clinical-answer-title">
                <div className="clinical-answer-editor">
                  <div className="clinical-answer-editor-head">
                    <div>
                      <div className="clinical-answer-editor-title">
                        <FileText size={18} aria-hidden="true" />
                        <strong id="clinical-answer-title">Danh sách đáp án</strong>
                      </div>
                      <p>Các lựa chọn song ngữ được gửi đúng theo cấu trúc đáp án của API.</p>
                    </div>
                    <button className="clinical-answer-add" type="button" onClick={addAnswerRow}>
                      <Plus size={16} aria-hidden="true" />
                      <span>Thêm đáp án</span>
                    </button>
                  </div>
                  {(form.answers ?? []).map((row, index) => (
                    <article className="clinical-answer-card" key={row.id}>
                      <div className="clinical-answer-card-head">
                        <div className="clinical-answer-card-title">
                          <FileText size={16} aria-hidden="true" />
                          <strong>Đáp án {index + 1}</strong>
                        </div>
                      </div>
                      <div className="clinical-answer-fields">
                        <label className="clinical-answer-field">
                          <span>Tiếng Việt</span>
                          <input
                            value={row.vietnameseLabel}
                            onChange={(event) => updateAnswerRow(row.id, "vietnameseLabel", event.target.value)}
                            placeholder={`Nhập nội dung tiếng Việt ${index + 1}`}
                          />
                        </label>
                        <label className="clinical-answer-field">
                          <span>Tiếng Anh</span>
                          <input
                            value={row.englishLabel}
                            onChange={(event) => updateAnswerRow(row.id, "englishLabel", event.target.value)}
                            placeholder={`Nhập bản dịch tiếng Anh ${index + 1}`}
                          />
                        </label>
                      </div>
                      <div className="clinical-answer-card-actions">
                        <button
                          className="clinical-answer-remove"
                          type="button"
                          aria-label={`Xóa đáp án ${index + 1}`}
                          onClick={() => removeAnswerRow(row.id)}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                          <span>Xóa</span>
                        </button>
                      </div>
                    </article>
                  ))}
                  {(form.answers ?? []).length === 0 && (
                    <div className="clinical-answer-empty">
                      Chưa có đáp án. Có thể lưu câu hỏi không kèm lựa chọn nếu dữ liệu hiện tại không yêu cầu.
                    </div>
                  )}
                </div>
              </section>
            )}

            <div className="doctor-modal-actions">
              <button className="btn btn-ghost" type="button" onClick={closeForm} disabled={status === "saving"}>Hủy</button>
              <button className="btn btn-primary" type="submit" disabled={status === "saving"}>
                {status === "saving" ? "Đang lưu..." : editingId ? "Lưu cập nhật" : "Tạo câu hỏi"}
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {deleteTarget && (
        <Dialog
          backdropClassName="doctor-modal-backdrop"
          className="doctor-modal clinical-delete-modal"
          labelledBy="clinical-delete-title"
          describedBy="clinical-delete-description"
          onClose={() => status !== "saving" && setDeleteTarget(null)}
          closeOnBackdrop={status !== "saving"}
          closeOnEscape={status !== "saving"}
          initialFocusRef={deleteConfirmRef}
          restoreFocusRef={deleteTriggerRef}
        >
          <header className="doctor-modal-header">
            <div>
              <p className="eyebrow">Xác nhận xóa</p>
              <h2 id="clinical-delete-title">Xóa câu hỏi lâm sàng?</h2>
              <p id="clinical-delete-description">
                Câu hỏi “{deleteTarget[config.primaryField] || "chưa có nội dung"}” sẽ bị xóa khỏi danh mục.
              </p>
            </div>
            <button className="doctor-modal-close" type="button" aria-label="Đóng xác nhận" onClick={() => setDeleteTarget(null)} disabled={status === "saving"}>×</button>
          </header>
          <div className="doctor-modal-actions clinical-delete-actions">
            <button className="btn btn-ghost" type="button" onClick={() => setDeleteTarget(null)} disabled={status === "saving"}>Giữ lại</button>
            <button ref={deleteConfirmRef} className="btn btn-dark clinical-delete-confirm" type="button" onClick={confirmRemove} disabled={status === "saving"}>
              {status === "saving" ? "Đang xóa..." : "Xóa câu hỏi"}
            </button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
