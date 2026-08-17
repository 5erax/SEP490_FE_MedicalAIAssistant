import {
  Check,
  ClipboardCheck,
  Filter,
  HelpCircle,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFeedback } from "../feedback/feedbackContext";
import AdminPagination from "../admin/AdminPagination";
import AdminSearchDatalist from "../admin/AdminSearchDatalist";
import {
  checklistItemsApi,
  departmentConsultationQuestionsApi,
  getConsultationCatalogApiMessage,
  medicalDepartmentsApi,
  medicalFacilitiesApi,
} from "../../services/api";
import { DataTable, Dialog, EmptyState, ErrorState, LoadingState } from "../ui";
import "../../styles/admin/consultation-catalog.css";

const CATEGORY_OPTIONS = [
  { value: "diagnosis", label: "Chẩn đoán" },
  { value: "tests", label: "Xét nghiệm" },
  { value: "treatment", label: "Điều trị" },
  { value: "lifestyle", label: "Lối sống" },
  { value: "followUp", label: "Theo dõi" },
];

const EMPTY_QUESTION = {
  departmentId: "",
  category: "diagnosis",
  questionText: "",
  sortOrder: "0",
  isActive: true,
};

const EMPTY_CHECKLIST = {
  content: "",
  departmentId: "",
  facilityId: "",
  isMandatory: false,
};

const EMPTY_FILTERS = {
  questions: { search: "", departmentId: "", category: "", isActive: "" },
  checklist: { search: "", departmentId: "", facilityId: "", isMandatory: "" },
};

function unwrapData(response) {
  return response?.data?.data ?? response?.data ?? response;
}

function unwrapItems(response) {
  const data = unwrapData(response);
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.items) ? data.items : [];
}

function unwrapPage(response, fallbackPage, fallbackSize) {
  const data = unwrapData(response);
  const items = Array.isArray(data) ? data : data?.items ?? [];
  const totalCount = data?.totalCount ?? data?.totalItems ?? items.length;
  const pageSize = data?.pageSize ?? fallbackSize;
  return {
    pageNumber: data?.pageNumber ?? fallbackPage,
    pageSize,
    totalCount,
    totalPages: data?.totalPages ?? Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

function normalizeQuestion(item = {}) {
  return {
    departmentId: item.departmentId ?? "",
    category: item.category ?? "diagnosis",
    questionText: item.questionText ?? "",
    sortOrder: String(item.sortOrder ?? 0),
    isActive: item.isActive !== false,
  };
}

function normalizeChecklist(item = {}) {
  return {
    content: item.content ?? "",
    departmentId: item.departmentId ?? "",
    facilityId: item.facilityId ?? "",
    isMandatory: item.isMandatory === true,
  };
}

function questionPayload(form) {
  return {
    departmentId: form.departmentId,
    category: form.category,
    questionText: form.questionText.trim(),
    sortOrder: Number(form.sortOrder || 0),
    isActive: Boolean(form.isActive),
  };
}

function checklistPayload(form) {
  return {
    content: form.content.trim(),
    departmentId: form.departmentId || null,
    facilityId: form.facilityId || null,
    isMandatory: Boolean(form.isMandatory),
  };
}

function changedFields(current, initial) {
  return Object.fromEntries(Object.entries(current).filter(([key, value]) => (
    JSON.stringify(value) !== JSON.stringify(initial[key])
  )));
}

function formatDate(value) {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(date);
}

export default function AdminConsultationCatalogSection() {
  const { confirmAction, showToast } = useFeedback();
  const [activeTab, setActiveTab] = useState("questions");
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [pageInfo, setPageInfo] = useState({ pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 });
  const [departments, setDepartments] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [referenceError, setReferenceError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(EMPTY_QUESTION);
  const [initialForm, setInitialForm] = useState(EMPTY_QUESTION);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const createButtonRef = useRef(null);
  const firstFieldRef = useRef(null);
  const formTriggerRef = useRef(null);
  const errorRef = useRef(null);

  const departmentById = useMemo(
    () => new Map(departments.map((item) => [String(item.id), item.departmentName || item.name || "Chuyên khoa chưa đặt tên"])),
    [departments],
  );
  const facilityById = useMemo(
    () => new Map(facilities.map((item) => [String(item.id), item.facilityName || item.name || "Cơ sở chưa đặt tên"])),
    [facilities],
  );

  const loadReferences = useCallback(async () => {
    setReferenceError("");
    try {
      const [departmentResponse, facilityResponse] = await Promise.all([
        medicalDepartmentsApi.list(1, 100),
        medicalFacilitiesApi.list(1, 100),
      ]);
      setDepartments(unwrapItems(departmentResponse));
      setFacilities(unwrapItems(facilityResponse));
    } catch (error) {
      setReferenceError(getConsultationCatalogApiMessage(error, "Chưa thể tải danh mục chuyên khoa và cơ sở y tế."));
    }
  }, []);

  const loadItems = useCallback(async (pageNumber = 1, pageSize = pageInfo.pageSize, nextFilters = appliedFilters[activeTab]) => {
    setStatus("loading");
    setMessage("");
    try {
      const service = activeTab === "questions" ? departmentConsultationQuestionsApi : checklistItemsApi;
      const response = await service.list(pageNumber, pageSize, nextFilters);
      setItems(unwrapItems(response));
      setPageInfo(unwrapPage(response, pageNumber, pageSize));
      setStatus("ready");
    } catch (error) {
      setMessage(getConsultationCatalogApiMessage(error, "Không thể tải dữ liệu tư vấn. Vui lòng thử lại."));
      setStatus("error");
    }
  }, [activeTab, appliedFilters, pageInfo.pageSize]);

  useEffect(() => {
    queueMicrotask(() => void loadReferences());
  }, [loadReferences]);

  useEffect(() => {
    queueMicrotask(() => void loadItems(1, 10, appliedFilters[activeTab]));
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  function switchTab(tab) {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setItems([]);
    setPageInfo({ pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 });
    setMessage("");
  }

  function updateFilter(key, value) {
    setFilters((current) => ({
      ...current,
      [activeTab]: { ...current[activeTab], [key]: value },
    }));
  }

  function applyFilters(event) {
    event.preventDefault();
    const next = { ...appliedFilters, [activeTab]: { ...filters[activeTab] } };
    setAppliedFilters(next);
    void loadItems(1, pageInfo.pageSize, next[activeTab]);
  }

  function clearFilters() {
    const empty = { ...EMPTY_FILTERS[activeTab] };
    setFilters((current) => ({ ...current, [activeTab]: empty }));
    setAppliedFilters((current) => ({ ...current, [activeTab]: empty }));
    void loadItems(1, pageInfo.pageSize, empty);
  }

  function openCreate() {
    formTriggerRef.current = document.activeElement;
    const empty = activeTab === "questions" ? { ...EMPTY_QUESTION } : { ...EMPTY_CHECKLIST };
    setEditingId("");
    setForm(empty);
    setInitialForm(empty);
    setFormErrors({});
    setMessage("");
    setFormOpen(true);
  }

  async function openEdit(item) {
    formTriggerRef.current = document.activeElement;
    setStatus("loading-detail");
    try {
      const service = activeTab === "questions" ? departmentConsultationQuestionsApi : checklistItemsApi;
      const response = await service.get(item.id);
      const detail = unwrapData(response) ?? item;
      const normalized = activeTab === "questions" ? normalizeQuestion(detail) : normalizeChecklist(detail);
      setEditingId(item.id);
      setForm(normalized);
      setInitialForm(normalized);
      setFormErrors({});
      setMessage("");
      setFormOpen(true);
      setStatus("ready");
    } catch (error) {
      const text = getConsultationCatalogApiMessage(error, "Không thể tải chi tiết dữ liệu.");
      setStatus("ready");
      showToast({ type: "error", title: "Không mở được dữ liệu", message: text });
    }
  }

  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    setFormErrors({});
  }

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setFormErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function validateForm() {
    const errors = {};
    if (activeTab === "questions") {
      if (!form.departmentId) errors.departmentId = "Chuyên khoa là bắt buộc.";
      if (!form.questionText.trim()) errors.questionText = "Nội dung câu hỏi là bắt buộc.";
      const normalizedSortOrder = String(form.sortOrder ?? "").trim();
      if (!normalizedSortOrder) {
        errors.sortOrder = "Thứ tự hiển thị là bắt buộc.";
      } else if (!Number.isInteger(Number(normalizedSortOrder)) || Number(normalizedSortOrder) < 0) {
        errors.sortOrder = "Thứ tự hiển thị phải là số nguyên không âm.";
      }
    } else if (!form.content.trim()) {
      errors.content = "Nội dung checklist là bắt buộc.";
    }
    setFormErrors(errors);
    return errors;
  }

  async function submitForm(event) {
    event.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length) {
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }

    const service = activeTab === "questions" ? departmentConsultationQuestionsApi : checklistItemsApi;
    const fullPayload = activeTab === "questions" ? questionPayload(form) : checklistPayload(form);
    const initialPayload = activeTab === "questions" ? questionPayload(initialForm) : checklistPayload(initialForm);
    const payload = editingId ? changedFields(fullPayload, initialPayload) : fullPayload;
    if (editingId && Object.keys(payload).length === 0) {
      setFormErrors({ summary: "Không có trường nào để cập nhật." });
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }

    setSaving(true);
    try {
      const response = editingId
        ? await service.update(editingId, payload)
        : await service.create(payload);
      const fallback = editingId ? "Cập nhật thành công." : "Tạo mới thành công.";
      const text = getConsultationCatalogApiMessage(response, fallback);
      setFormOpen(false);
      setMessage(text);
      showToast({ type: "success", title: fallback, message: text });
      await loadItems(editingId ? pageInfo.pageNumber : 1, pageInfo.pageSize);
    } catch (error) {
      const text = getConsultationCatalogApiMessage(error, "Không thể lưu dữ liệu. Vui lòng kiểm tra và thử lại.");
      setFormErrors({ summary: text });
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setSaving(false);
    }
  }

  async function removeItem(item) {
    const label = activeTab === "questions" ? item.questionText : item.content;
    const confirmed = await confirmAction({
      title: activeTab === "questions" ? "Xóa câu hỏi tư vấn?" : "Xóa mục checklist?",
      message: `“${label || "Mục chưa có nội dung"}” sẽ bị xóa khỏi danh mục.`,
      confirmLabel: "Xóa",
      tone: "danger",
    });
    if (!confirmed) return;
    try {
      const service = activeTab === "questions" ? departmentConsultationQuestionsApi : checklistItemsApi;
      const response = await service.remove(item.id);
      const text = getConsultationCatalogApiMessage(response, "Xóa dữ liệu thành công.");
      showToast({ type: "success", title: "Đã xóa dữ liệu", message: text });
      await loadItems(items.length === 1 && pageInfo.pageNumber > 1 ? pageInfo.pageNumber - 1 : pageInfo.pageNumber, pageInfo.pageSize);
    } catch (error) {
      showToast({
        type: "error",
        title: "Không xóa được dữ liệu",
        message: getConsultationCatalogApiMessage(error, "Vui lòng thử lại."),
      });
    }
  }

  const currentFilters = filters[activeTab];
  const currentTitle = activeTab === "questions" ? "Câu hỏi tư vấn theo chuyên khoa" : "Checklist chuẩn bị tư vấn";
  const categoryLabel = (value) => CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? value ?? "Chưa phân loại";

  const columns = activeTab === "questions"
    ? [
      {
        key: "content",
        header: "Câu hỏi",
        render: (item) => <strong>{item.questionText || "Chưa có nội dung"}</strong>,
      },
      {
        key: "department",
        header: "Chuyên khoa",
        render: (item) => departmentById.get(String(item.departmentId)) || "Không xác định",
      },
      {
        key: "category",
        header: "Nhóm",
        render: (item) => categoryLabel(item.category),
      },
      {
        key: "status",
        header: "Hiển thị",
        render: (item) => <span className={`consultation-status ${item.isActive ? "is-active" : "is-inactive"}`}>{item.isActive ? "Đang dùng" : "Đã ẩn"}</span>,
      },
      { key: "order", header: "Thứ tự", render: (item) => item.sortOrder ?? 0 },
    ]
    : [
      {
        key: "content",
        header: "Nội dung checklist",
        render: (item) => <strong>{item.content || "Chưa có nội dung"}</strong>,
      },
      {
        key: "scope",
        header: "Phạm vi áp dụng",
        render: (item) => (
          <div className="consultation-scope">
            <span>{item.departmentId ? departmentById.get(String(item.departmentId)) || "Chuyên khoa không xác định" : "Mọi chuyên khoa"}</span>
            <small>{item.facilityId ? facilityById.get(String(item.facilityId)) || "Cơ sở không xác định" : "Mọi cơ sở"}</small>
          </div>
        ),
      },
      {
        key: "mandatory",
        header: "Mức độ",
        render: (item) => <span className={`consultation-status ${item.isMandatory ? "is-required" : "is-optional"}`}>{item.isMandatory ? "Bắt buộc" : "Khuyến nghị"}</span>,
      },
      { key: "updated", header: "Cập nhật", render: (item) => formatDate(item.updatedAt || item.createdAt) },
    ];

  columns.push({
    key: "actions",
    header: "Thao tác",
    render: (item) => (
      <div className="record-actions" aria-label={`Thao tác với ${activeTab === "questions" ? "câu hỏi" : "checklist"} ${item.questionText || item.content || "chưa có nội dung"}`}>
        <button className="btn btn-ghost btn-small" type="button" onClick={() => void openEdit(item)}>
          <Pencil size={14} aria-hidden="true" /> Sửa
        </button>
        <button className="btn btn-dark btn-small admin-danger-btn" type="button" onClick={() => void removeItem(item)}>
          <Trash2 size={14} aria-hidden="true" /> Xóa
        </button>
      </div>
    ),
  });

  return (
    <section className="consultation-catalog" aria-labelledby="consultation-catalog-title">
      <header className="consultation-catalog-header">
        <div>
          <p className="eyebrow">Nội dung tư vấn</p>
          <h2 id="consultation-catalog-title">Checklist và câu hỏi theo chuyên khoa</h2>
          <p>Quản lý các câu hỏi định hướng và mục cần kiểm tra trước khi tư vấn tại từng chuyên khoa, cơ sở.</p>
        </div>
        <button ref={createButtonRef} className="btn btn-primary" type="button" onClick={openCreate}>
          <Plus size={17} aria-hidden="true" /> {activeTab === "questions" ? "Tạo câu hỏi" : "Tạo checklist"}
        </button>
      </header>

      <div className="consultation-tabs" role="tablist" aria-label="Loại nội dung tư vấn">
        <button type="button" role="tab" aria-selected={activeTab === "questions"} className={activeTab === "questions" ? "is-active" : ""} onClick={() => switchTab("questions")}>
          <HelpCircle size={17} aria-hidden="true" /> Câu hỏi tư vấn
        </button>
        <button type="button" role="tab" aria-selected={activeTab === "checklist"} className={activeTab === "checklist" ? "is-active" : ""} onClick={() => switchTab("checklist")}>
          <ClipboardCheck size={17} aria-hidden="true" /> Checklist chuẩn bị
        </button>
      </div>

      {referenceError && <div className="api-message warning" role="status">{referenceError}</div>}
      {message && status !== "error" && <div className="api-message success" role="status" aria-live="polite">{message}</div>}

      <form className="consultation-filter-card" onSubmit={applyFilters}>
        <div className="consultation-filter-title">
          <Filter size={18} aria-hidden="true" />
          <div><h3>Lọc {currentTitle.toLowerCase()}</h3><p>Thu hẹp danh sách theo nội dung và phạm vi áp dụng.</p></div>
        </div>
        <div className="consultation-filter-grid">
          <label className="consultation-search">
            <span>Tìm nội dung</span>
            <span className="consultation-search-control"><Search size={16} aria-hidden="true" /><input type="search" list="consultation-search-options" value={currentFilters.search} onChange={(event) => updateFilter("search", event.target.value)} autoComplete="off" placeholder="Nhập từ khóa" /><AdminSearchDatalist id="consultation-search-options" values={items.flatMap((item) => [item.questionText, item.content, item.category])} /></span>
          </label>
          <label>
            <span>Chuyên khoa</span>
            <select value={currentFilters.departmentId} onChange={(event) => updateFilter("departmentId", event.target.value)}>
              <option value="">Tất cả chuyên khoa</option>
              {departments.map((item) => <option key={item.id} value={item.id}>{item.departmentName || item.name}</option>)}
            </select>
          </label>
          {activeTab === "questions" ? (
            <>
              <label><span>Nhóm câu hỏi</span><select value={currentFilters.category} onChange={(event) => updateFilter("category", event.target.value)}><option value="">Tất cả nhóm</option>{CATEGORY_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label><span>Trạng thái</span><select value={currentFilters.isActive} onChange={(event) => updateFilter("isActive", event.target.value)}><option value="">Tất cả trạng thái</option><option value="true">Đang dùng</option><option value="false">Đã ẩn</option></select></label>
            </>
          ) : (
            <>
              <label><span>Cơ sở y tế</span><select value={currentFilters.facilityId} onChange={(event) => updateFilter("facilityId", event.target.value)}><option value="">Tất cả cơ sở</option>{facilities.map((item) => <option key={item.id} value={item.id}>{item.facilityName || item.name}</option>)}</select></label>
              <label><span>Mức độ</span><select value={currentFilters.isMandatory} onChange={(event) => updateFilter("isMandatory", event.target.value)}><option value="">Tất cả mức độ</option><option value="true">Bắt buộc</option><option value="false">Khuyến nghị</option></select></label>
            </>
          )}
        </div>
        <div className="consultation-filter-actions">
          <button className="btn btn-primary btn-small" type="submit" disabled={status === "loading"}><Filter size={14} aria-hidden="true" /> Áp dụng</button>
          <button className="btn btn-ghost btn-small" type="button" onClick={clearFilters} disabled={status === "loading"}><RotateCcw size={14} aria-hidden="true" /> Xóa lọc</button>
          <button className="btn btn-ghost btn-small" type="button" onClick={() => void loadItems(pageInfo.pageNumber, pageInfo.pageSize)} disabled={status === "loading"}><RefreshCw size={14} aria-hidden="true" /> Tải lại</button>
        </div>
      </form>

      <div className="consultation-result-head" role="status" aria-live="polite">
        <div><strong>{currentTitle}</strong><span>{pageInfo.totalCount} mục phù hợp</span></div>
      </div>

      {status === "loading" && !items.length ? (
        <LoadingState label="Đang tải dữ liệu tư vấn..." description="Danh mục đang được đồng bộ từ hệ thống." />
      ) : status === "error" ? (
        <ErrorState title="Không thể tải danh mục" description={message} urgent action={<button className="btn btn-primary btn-small" type="button" onClick={() => void loadItems()}>Thử lại</button>} />
      ) : (
        <DataTable
          className="consultation-table-wrap"
          caption={currentTitle}
          rowHeaderKey="content"
          rows={items}
          getRowKey={(item) => item.id}
          columns={columns}
          emptyState={<EmptyState title="Chưa có dữ liệu phù hợp" description="Hãy điều chỉnh bộ lọc hoặc tạo mục đầu tiên cho danh mục này." action={<button className="btn btn-primary btn-small" type="button" onClick={openCreate}>Tạo mới</button>} />}
        />
      )}

      {(status !== "loading" || items.length > 0) && status !== "error" && (
        <AdminPagination
          ariaLabel={`Phân trang ${currentTitle.toLowerCase()}`}
          currentPage={pageInfo.pageNumber}
          totalPages={pageInfo.totalPages}
          totalCount={pageInfo.totalCount}
          pageSize={pageInfo.pageSize}
          itemCount={items.length}
          itemLabel={activeTab === "questions" ? "câu hỏi" : "mục checklist"}
          loading={status === "loading" || status === "saving"}
          onPageChange={(nextPage) => void loadItems(nextPage, pageInfo.pageSize)}
        />
      )}

      {formOpen && (
        <Dialog backdropClassName="doctor-modal-backdrop" className="doctor-modal consultation-modal" labelledBy="consultation-form-title" describedBy="consultation-form-description" onClose={closeForm} closeOnBackdrop={!saving} closeOnEscape={!saving} initialFocusRef={firstFieldRef} restoreFocusRef={formTriggerRef}>
          <header className="doctor-modal-header">
            <div>
              <p className="eyebrow">{editingId ? "Cập nhật" : "Tạo mới"}</p>
              <h2 id="consultation-form-title">{editingId ? "Cập nhật" : "Tạo"} {activeTab === "questions" ? "câu hỏi tư vấn" : "mục checklist"}</h2>
              <p id="consultation-form-description">Nhập nội dung và phạm vi áp dụng. Các trường bắt buộc được đánh dấu rõ ràng.</p>
            </div>
            <button className="doctor-modal-close" type="button" aria-label="Đóng biểu mẫu" onClick={closeForm} disabled={saving}>×</button>
          </header>
          <form className="clean-form consultation-form" onSubmit={submitForm} noValidate>
            {Object.keys(formErrors).length > 0 && (
              <div ref={errorRef} className="api-message error" role="alert" tabIndex={-1}>
                <strong>Chưa thể lưu dữ liệu.</strong>
                <ul>{Object.values(formErrors).map((error) => <li key={error}>{error}</li>)}</ul>
              </div>
            )}
            {activeTab === "questions" ? (
              <>
                <label><span>Chuyên khoa <em>(bắt buộc)</em></span><select ref={firstFieldRef} value={form.departmentId} onChange={(event) => updateForm("departmentId", event.target.value)} required aria-invalid={Boolean(formErrors.departmentId)} aria-describedby={formErrors.departmentId ? "consultation-department-error" : undefined}><option value="">Chọn chuyên khoa</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.departmentName || item.name}</option>)}</select>{formErrors.departmentId && <small id="consultation-department-error" className="field-error">{formErrors.departmentId}</small>}</label>
                <label><span>Nhóm câu hỏi <em>(bắt buộc)</em></span><select value={form.category} onChange={(event) => updateForm("category", event.target.value)} required>{CATEGORY_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                <label className="consultation-form-wide"><span>Nội dung câu hỏi <em>(bắt buộc)</em></span><textarea value={form.questionText} onChange={(event) => updateForm("questionText", event.target.value)} rows={4} required aria-invalid={Boolean(formErrors.questionText)} aria-describedby={formErrors.questionText ? "consultation-question-error" : undefined} />{formErrors.questionText && <small id="consultation-question-error" className="field-error">{formErrors.questionText}</small>}</label>
                <fieldset className="consultation-settings consultation-form-wide">
                  <legend>Thiết lập hiển thị</legend>
                  <div className="consultation-settings-grid">
                    <label>
                      <span>Thứ tự hiển thị <em>(bắt buộc)</em></span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={form.sortOrder}
                        onChange={(event) => updateForm("sortOrder", event.target.value)}
                        required
                        aria-invalid={Boolean(formErrors.sortOrder)}
                        aria-describedby={formErrors.sortOrder ? "consultation-order-error" : "consultation-order-help"}
                      />
                      <small id="consultation-order-help">Số nhỏ hơn sẽ được hiển thị trước.</small>
                      {formErrors.sortOrder && <small id="consultation-order-error" className="field-error">{formErrors.sortOrder}</small>}
                    </label>
                    <div className="consultation-status-field">
                      <span>Trạng thái sử dụng</span>
                      <label className="consultation-checkbox">
                        <input type="checkbox" checked={form.isActive} onChange={(event) => updateForm("isActive", event.target.checked)} />
                        <span>Đang sử dụng trong luồng tư vấn</span>
                      </label>
                    </div>
                  </div>
                </fieldset>
              </>
            ) : (
              <>
                <label className="consultation-form-wide"><span>Nội dung checklist <em>(bắt buộc)</em></span><textarea ref={firstFieldRef} value={form.content} onChange={(event) => updateForm("content", event.target.value)} rows={4} required aria-invalid={Boolean(formErrors.content)} aria-describedby={formErrors.content ? "checklist-content-error" : "checklist-content-help"} /><small id="checklist-content-help">Viết một hành động ngắn, rõ ràng mà người dùng cần kiểm tra hoặc chuẩn bị.</small>{formErrors.content && <small id="checklist-content-error" className="field-error">{formErrors.content}</small>}</label>
                <label><span>Chuyên khoa áp dụng</span><select value={form.departmentId} onChange={(event) => updateForm("departmentId", event.target.value)}><option value="">Mọi chuyên khoa</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.departmentName || item.name}</option>)}</select></label>
                <label><span>Cơ sở y tế áp dụng</span><select value={form.facilityId} onChange={(event) => updateForm("facilityId", event.target.value)}><option value="">Mọi cơ sở</option>{facilities.map((item) => <option key={item.id} value={item.id}>{item.facilityName || item.name}</option>)}</select></label>
                <label className="consultation-checkbox consultation-form-wide"><input type="checkbox" checked={form.isMandatory} onChange={(event) => updateForm("isMandatory", event.target.checked)} /><span>Đây là mục bắt buộc phải hoàn thành</span></label>
              </>
            )}
            <div className="doctor-modal-actions consultation-form-actions">
              <button className="btn btn-ghost" type="button" onClick={closeForm} disabled={saving}>Hủy</button>
              <button className="btn btn-primary" type="submit" disabled={saving}><Check size={16} aria-hidden="true" /> {saving ? "Đang lưu..." : editingId ? "Lưu cập nhật" : "Tạo mới"}</button>
            </div>
          </form>
        </Dialog>
      )}
    </section>
  );
}
