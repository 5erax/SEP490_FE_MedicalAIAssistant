import { FileText, Filter, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CustomSelect, Dialog, PAGE_SIZE_OPTIONS } from "../ui";

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

export default function AdminClinicalCatalogSection({ config, icdChapters = [], service }) {
  const emptyForm = createEmptyForm(config.fields);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [pageInfo, setPageInfo] = useState({ pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 });
  const [formOpen, setFormOpen] = useState(false);

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

  const filteredItems = useMemo(() => {
    return items;
  }, [items]);

  async function loadItems(pageNumber = pageInfo.pageNumber, pageSize = pageInfo.pageSize, activeFilters = appliedFilters) {
    setStatus("loading");
    setMessage("");
    try {
      const response = await service.list(pageNumber, pageSize, activeFilters);
      setItems(unwrapItems(response));
      setPageInfo(unwrapPageInfo(response, pageNumber, pageSize));
      setStatus("ready");
    } catch {
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
        setMessage(answerErrors.join(" "));
        setStatus("ready");
        return;
      }

      const payload = Object.fromEntries(config.fields.map((field) => [
        field.name,
        field.type === "answers"
          ? answersRowsToDictionary(form[field.name] ?? [])
          : field.serialize ? field.serialize(form[field.name]) : form[field.name],
      ]));
      if (editingId) await service.update(editingId, payload);
      else await service.create(payload);
      setMessage(editingId ? `Đã cập nhật ${config.singularLabel}.` : `Đã tạo ${config.singularLabel}.`);
      resetForm();
      setFormOpen(false);
      await loadItems(editingId ? pageInfo.pageNumber : 1, pageInfo.pageSize);
    } catch (error) {
      setMessage(error.message || `Không thể lưu ${config.singularLabel}.`);
      setStatus("ready");
    }
  }

  function edit(item) {
    setEditingId(item.id);
    setForm(Object.fromEntries(config.fields.map((field) => [
      field.name,
      field.type === "answers" ? answersDictionaryToRows(item[field.name]) : item[field.name] ?? "",
    ])));
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

  async function remove(item) {
    if (!window.confirm(`Xóa ${config.singularLabel} này?`)) return;
    try {
      await service.remove(item.id);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setPageInfo((current) => ({ ...current, totalCount: Math.max(0, current.totalCount - 1) }));
      setMessage(`Đã xóa ${config.singularLabel}.`);
      if (editingId === item.id) resetForm();
    } catch (error) {
      setMessage(error.message || `Không thể xóa ${config.singularLabel}.`);
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
    resetForm();
    setFormOpen(true);
  }

  function closeForm() {
    if (status === "saving") return;
    setFormOpen(false);
    resetForm();
  }

  const chapterField = config.fields.find((field) => field.name === "chapterId");
  const sortOrderField = config.fields.find((field) => field.name === "sortOrder");
  const questionViField = config.fields.find((field) => field.name === "questionVi");
  const englishPrefixField = config.fields.find((field) => field.name === "englishPrefix");
  const answersField = config.fields.find((field) => field.type === "answers");
  const chapterFilterOptions = [
    { value: "", label: "Tất cả ICD" },
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
          value={form[field.name]}
          required={field.required}
          onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}
        >
          <option value="">Chọn ICD Chapter</option>
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

  return (
    <section className="admin-panel ai-config-admin-panel">
      <div className="panel-title-row ai-config-section-heading">
        <div>
          <p className="eyebrow">Dữ liệu lâm sàng</p>
          <h2>{config.title}</h2>
          <p className="muted-text">Quản lý câu hỏi lâm sàng theo ICD Chapter, hỗ trợ tìm kiếm và phân trang từ backend.</p>
        </div>
        <button className="btn btn-ghost btn-small" type="button" onClick={() => loadItems()}>Tải lại</button>
      </div>
      {message && <div className="api-message" role="status">{message}</div>}

      <section className="ai-config-filter-card">
        <div className="ai-config-filter-card-header">
          <div>
            <strong>Clinical question filters</strong>
            <p>Lọc theo ICD Chapter hoặc nội dung câu hỏi đang dùng trong dữ liệu lâm sàng.</p>
          </div>
        </div>

        <form className="ai-config-toolbar" onSubmit={applyFilters}>
          <div className="ai-config-toolbar-row ai-config-toolbar-primary">
            <div className="ai-config-search-field">
              <Search size={16} />
              <input
                value={filters.search}
                onChange={(event) => updateFilter("search", event.target.value)}
                placeholder="Tìm câu hỏi tiếng Việt hoặc tiếng Anh..."
              />
            </div>
            <button className="btn btn-primary btn-small ai-config-add-button" type="button" onClick={openCreateForm}>
              <Plus size={15} /> Tạo câu hỏi
            </button>
          </div>

          <div className="ai-config-toolbar-row ai-config-toolbar-filters">
            <div className="ai-config-filter-grid">
              <CustomSelect
                className="clean-field"
                label="ICD Code"
                value={filters.chapterId}
                options={chapterFilterOptions}
                onChange={(nextValue) => updateFilter("chapterId", nextValue)}
              />
              <CustomSelect
                className="clean-field"
                label="Per page"
                value={pageInfo.pageSize}
                options={PAGE_SIZE_OPTIONS}
                onChange={(nextPageSize) => changePageSize(Number(nextPageSize))}
              />
            </div>

            <div className="ai-config-filter-actions">
              <button className="btn btn-primary btn-small" type="submit"><Filter size={14} /> Apply</button>
              <button className="btn btn-ghost btn-small" type="button" onClick={clearFilters}><RotateCcw size={14} /> Clear</button>
            </div>
          </div>
        </form>
      </section>

      {status === "loading" ? <p className="muted-text">Đang tải...</p> : (
          <div className="admin-table-list">
            {filteredItems.length === 0 && <p className="muted-text">Chưa có {config.pluralLabel}.</p>}
            {filteredItems.map((item) => {
              const chapterCode = getChapterCode(item, chapterById);
              const createdAt = formatDateTime(item.createdAt);
              return (
                <article className="admin-user-row" key={item.id}>
                  <div>
                    <div className="admin-badge-stack">
                      <span>{chapterCode || "Chưa có ICD"}</span>
                      {createdAt && <small>Created At: {createdAt}</small>}
                    </div>
                    <strong>{item[config.primaryField] || "Chưa có nội dung"}</strong>
                    <span>{item[config.secondaryField] || "Chưa có mô tả."}</span>
                  </div>
                  <div className="record-actions">
                    <button className="btn btn-ghost btn-small" type="button" onClick={() => edit(item)}>Sửa</button>
                    <button className="btn btn-dark btn-small" type="button" onClick={() => remove(item)}>Xóa</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {status !== "loading" && (
          <div className="pagination-row">
            <button
              className="btn btn-ghost btn-small"
              type="button"
              disabled={pageInfo.pageNumber <= 1 || status === "loading"}
              onClick={() => loadItems(Math.max(1, pageInfo.pageNumber - 1), pageInfo.pageSize)}
            >
              Trước
            </button>
            <span>Trang {pageInfo.pageNumber} / {pageInfo.totalPages || 1} · {filteredItems.length} / {pageInfo.totalCount} {config.pluralLabel}</span>
            <button
              className="btn btn-ghost btn-small"
              type="button"
              disabled={pageInfo.pageNumber >= pageInfo.totalPages || status === "loading"}
              onClick={() => loadItems(Math.min(pageInfo.totalPages || 1, pageInfo.pageNumber + 1), pageInfo.pageSize)}
            >
              Sau
            </button>
          </div>
        )}
      {formOpen && (
        <Dialog
          backdropClassName="doctor-modal-backdrop"
          className="doctor-modal clinical-question-modal"
          labelledBy="clinical-question-modal-title"
          onClose={closeForm}
          closeOnBackdrop={status !== "saving"}
          closeOnEscape={status !== "saving"}
        >
          <header className="doctor-modal-header">
            <div>
              <p className="eyebrow">{editingId ? "Update" : "Create"}</p>
              <h2 id="clinical-question-modal-title">
                {editingId ? "Cập nhật câu hỏi lâm sàng" : config.formTitle}
              </h2>
              <p>Chỉnh sửa câu hỏi dùng trong luồng AI phân tích triệu chứng.</p>
            </div>
            <button className="doctor-modal-close" type="button" aria-label="Đóng form" onClick={closeForm}>×</button>
          </header>

          <form className="clean-form doctor-form clinical-question-form" onSubmit={submit}>
            <section className="clinical-form-section">
              <div className="clinical-form-section-head">
                <strong>Thông tin câu hỏi</strong>
              </div>
              <div className="clinical-form-two-column">
                {[chapterField, sortOrderField].filter(Boolean).map((field) => (
                  <label className="clean-field" key={field.name}>
                    <span>{field.label}</span>
                    {renderFormControl(field)}
                  </label>
                ))}
              </div>
            </section>

            <section className="clinical-form-section">
              <div className="clinical-form-section-head">
                <strong>Nội dung câu hỏi</strong>
              </div>
              <div className="clinical-form-content-grid">
                {[questionViField, englishPrefixField].filter(Boolean).map((field) => (
                  <label className="clean-field" key={field.name}>
                    <span>{field.label}</span>
                    {renderFormControl(field)}
                  </label>
                ))}
              </div>
            </section>

            {answersField && (
              <section className="clinical-form-section clinical-answer-section">
                <div className="clinical-answer-editor">
                  <div className="clinical-answer-editor-head">
                    <div>
                      <div className="clinical-answer-editor-title">
                        <FileText size={18} aria-hidden="true" />
                        <strong>Danh sách đáp án</strong>
                      </div>
                      <p>Các đáp án mà người dùng có thể lựa chọn trong quá trình phân tích triệu chứng.</p>
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
                          <strong>Đáp án #{index + 1}</strong>
                        </div>
                      </div>
                      <div className="clinical-answer-fields">
                        <div className="clinical-answer-field">
                          <span>Tiếng Việt</span>
                          <input
                            value={row.vietnameseLabel}
                            onChange={(event) => updateAnswerRow(row.id, "vietnameseLabel", event.target.value)}
                            placeholder={`Nhập nội dung tiếng Việt ${index + 1}`}
                          />
                        </div>
                        <div className="clinical-answer-field">
                          <span>Tiếng Anh</span>
                          <input
                            value={row.englishLabel}
                            onChange={(event) => updateAnswerRow(row.id, "englishLabel", event.target.value)}
                            placeholder={`Nhập bản dịch tiếng Anh ${index + 1}`}
                          />
                        </div>
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
                      Chưa có đáp án nào. Thêm đáp án để hỗ trợ luồng câu hỏi lâm sàng.
                    </div>
                  )}
                </div>
              </section>
            )}

            <div className="doctor-modal-actions">
              <button className="btn btn-ghost" type="button" onClick={closeForm}>Hủy</button>
              <button className="btn btn-primary" type="submit" disabled={status === "saving"}>
                {status === "saving" ? "Đang lưu..." : editingId ? "Lưu cập nhật" : "Tạo mới"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </section>
  );
}
