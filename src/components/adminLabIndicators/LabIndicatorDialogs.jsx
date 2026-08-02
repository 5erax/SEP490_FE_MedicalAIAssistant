import { useMemo, useRef, useState } from "react";
import { Check, FlaskConical, Languages, Ruler, Sparkles, X } from "lucide-react";
import { Button, Dialog, Field, Select, Textarea, TextInput } from "../ui";

const EMPTY_INDICATOR_FORM = {
  symbol: "",
  fullName: "",
  unit: "",
  minReference: "",
  maxReference: "",
  description: "",
  category: "",
  isActive: true,
};

const EMPTY_ALIAS_FORM = { aliasText: "", language: "", isPrimary: false };
const EMPTY_RANGE_FORM = {
  gender: "",
  ageGroup: "",
  comparisonType: "",
  minValue: "",
  maxValue: "",
  unit: "",
  priority: "0",
};
const EMPTY_ADVICE_FORM = {
  status: "",
  displayTitle: "",
  summary: "",
  possibleCauses: "",
  lifestyleAdvice: "",
  nutritionalAdvice: "",
  urgencyLevel: "",
  severityLevel: "",
  warningSigns: "",
  followUpSuggestion: "",
  doctorQuestions: "",
};

const GENDER_OPTIONS = [
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
];

const AGE_GROUP_OPTIONS = [
  { value: "child", label: "Trẻ em" },
  { value: "adult", label: "Người lớn" },
];

const COMPARISON_OPTIONS = [
  { value: "between", label: "Trong khoảng" },
  { value: "lessThanOrEqual", label: "Nhỏ hơn hoặc bằng" },
  { value: "greaterThanOrEqual", label: "Lớn hơn hoặc bằng" },
];

const STATUS_OPTIONS = [
  { value: "unknown", label: "Chưa xác định" },
  { value: "normal", label: "Bình thường" },
  { value: "high", label: "Cao" },
  { value: "low", label: "Thấp" },
  { value: "criticalHigh", label: "Cao nguy cấp" },
  { value: "criticalLow", label: "Thấp nguy cấp" },
];

const SEVERITY_OPTIONS = [
  { value: "info", label: "Thông tin" },
  { value: "warning", label: "Cảnh báo" },
  { value: "critical", label: "Nguy cấp" },
];

const CHILD_DIALOG_META = {
  alias: {
    icon: Languages,
    eyebrow: "Tên gọi thay thế",
    noun: "bí danh",
  },
  range: {
    icon: Ruler,
    eyebrow: "Ngưỡng tham chiếu",
    noun: "khoảng tham chiếu",
  },
  advice: {
    icon: Sparkles,
    eyebrow: "Nội dung hướng dẫn",
    noun: "lời khuyên",
  },
};

function nullableText(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function nullableNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function indicatorToForm(indicator) {
  return {
    ...EMPTY_INDICATOR_FORM,
    symbol: indicator?.symbol ?? "",
    fullName: indicator?.fullName ?? "",
    unit: indicator?.unit ?? "",
    minReference: indicator?.minReference ?? "",
    maxReference: indicator?.maxReference ?? "",
    description: indicator?.description ?? "",
    category: indicator?.category ?? "",
    isActive: indicator?.isActive !== false,
  };
}

function childToForm(kind, item) {
  if (kind === "alias") {
    return {
      ...EMPTY_ALIAS_FORM,
      aliasText: item?.aliasText ?? "",
      language: item?.language ?? "",
      isPrimary: Boolean(item?.isPrimary),
    };
  }
  if (kind === "range") {
    return {
      ...EMPTY_RANGE_FORM,
      gender: item?.gender ?? "",
      ageGroup: item?.ageGroup ?? "",
      comparisonType: item?.comparisonType ?? "",
      minValue: item?.minValue ?? "",
      maxValue: item?.maxValue ?? "",
      unit: item?.unit ?? "",
      priority: item?.priority ?? "0",
    };
  }
  return {
    ...EMPTY_ADVICE_FORM,
    status: item?.status ?? "",
    displayTitle: item?.displayTitle ?? "",
    summary: item?.summary ?? "",
    possibleCauses: item?.possibleCauses ?? "",
    lifestyleAdvice: item?.lifestyleAdvice ?? "",
    nutritionalAdvice: item?.nutritionalAdvice ?? "",
    urgencyLevel: item?.urgencyLevel ?? "",
    severityLevel: item?.severityLevel ?? "",
    warningSigns: item?.warningSigns ?? "",
    followUpSuggestion: item?.followUpSuggestion ?? "",
    doctorQuestions: item?.doctorQuestions ?? "",
  };
}

function FormErrorSummary({ errors, summaryRef }) {
  const entries = Object.entries(errors).filter(([, message]) => message);
  if (!entries.length) return null;

  return (
    <section className="lab-form-error-summary" role="alert" tabIndex="-1" ref={summaryRef}>
      <strong>Vui lòng kiểm tra {entries.length} trường sau:</strong>
      <ul>
        {entries.map(([field, message]) => (
          <li key={field}>
            <a href={`#lab-${field}`}>{message}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function validateReferenceOrder(minValue, maxValue) {
  if (minValue === "" || maxValue === "") return "";
  return Number(minValue) <= Number(maxValue)
    ? ""
    : "Giá trị tối thiểu không được lớn hơn giá trị tối đa.";
}

export function LabIndicatorFormDialog({ indicator, saving, restoreFocusRef, onClose, onSubmit }) {
  const editing = Boolean(indicator);
  const [form, setForm] = useState(() => indicatorToForm(indicator));
  const [errors, setErrors] = useState({});
  const firstInputRef = useRef(null);
  const errorSummaryRef = useRef(null);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "", minReference: "" }));
  }

  async function submit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!form.symbol.trim()) nextErrors.symbol = "Nhập ký hiệu chỉ số.";
    if (!form.fullName.trim()) nextErrors.fullName = "Nhập tên đầy đủ của chỉ số.";
    const referenceOrderError = validateReferenceOrder(form.minReference, form.maxReference);
    if (referenceOrderError) nextErrors.minReference = referenceOrderError;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      window.requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return;
    }

    await onSubmit({
      symbol: nullableText(form.symbol),
      fullName: nullableText(form.fullName),
      unit: nullableText(form.unit),
      minReference: nullableNumber(form.minReference),
      maxReference: nullableNumber(form.maxReference),
      description: nullableText(form.description),
      category: nullableText(form.category),
      isActive: Boolean(form.isActive),
    });
  }

  return (
    <Dialog
      className="doctor-modal lab-dialog"
      backdropClassName="doctor-modal-backdrop"
      labelledBy="lab-indicator-dialog-title"
      describedBy="lab-indicator-dialog-description"
      initialFocusRef={firstInputRef}
      restoreFocusRef={restoreFocusRef}
      onClose={() => { if (!saving) onClose(); }}
    >
      <header className="doctor-modal-header lab-dialog-header">
        <span className="lab-dialog-icon" aria-hidden="true"><FlaskConical size={22} /></span>
        <div>
          <p>{editing ? "Cập nhật danh mục" : "Thêm vào danh mục"}</p>
          <h2 id="lab-indicator-dialog-title">{editing ? "Sửa chỉ số xét nghiệm" : "Tạo chỉ số xét nghiệm"}</h2>
          <small id="lab-indicator-dialog-description">Thông tin sẽ được lưu vào danh mục chỉ số xét nghiệm.</small>
        </div>
        <button className="doctor-modal-close" type="button" aria-label="Đóng form chỉ số" onClick={onClose} disabled={saving}>
          <X size={18} aria-hidden="true" />
        </button>
      </header>

      <form className="clean-form doctor-form lab-dialog-form lab-indicator-dialog-form" onSubmit={submit} noValidate>
        <FormErrorSummary errors={errors} summaryRef={errorSummaryRef} />
        <div className="lab-form-sections">
          <fieldset className="lab-form-section">
            <legend>
              <span>Thông tin định danh</span>
              <small>Tên và quy ước hiển thị của chỉ số.</small>
            </legend>
            <div className="lab-form-grid">
              <Field id="lab-symbol" label="Ký hiệu" required error={errors.symbol} hint="Ví dụ: WBC, HGB hoặc ALT.">
                <TextInput ref={firstInputRef} name="symbol" value={form.symbol} onChange={(event) => update("symbol", event.target.value)} />
              </Field>
              <Field id="lab-fullName" label="Tên đầy đủ" required error={errors.fullName}>
                <TextInput name="fullName" value={form.fullName} onChange={(event) => update("fullName", event.target.value)} />
              </Field>
              <Field id="lab-category" label="Nhóm chỉ số" optional>
                <TextInput name="category" value={form.category} onChange={(event) => update("category", event.target.value)} />
              </Field>
              <Field id="lab-unit" label="Đơn vị mặc định" optional>
                <TextInput name="unit" value={form.unit} onChange={(event) => update("unit", event.target.value)} />
              </Field>
            </div>
          </fieldset>

          <fieldset className="lab-form-section">
            <legend>
              <span>Khoảng tham chiếu mặc định</span>
              <small>Có thể để trống nếu chỉ số dùng các range chi tiết riêng.</small>
            </legend>
            <div className="lab-form-grid">
              <Field id="lab-minReference" label="Tham chiếu tối thiểu" optional error={errors.minReference}>
                <TextInput name="minReference" inputMode="decimal" value={form.minReference} onChange={(event) => update("minReference", event.target.value)} />
              </Field>
              <Field id="lab-maxReference" label="Tham chiếu tối đa" optional>
                <TextInput name="maxReference" inputMode="decimal" value={form.maxReference} onChange={(event) => update("maxReference", event.target.value)} />
              </Field>
            </div>
          </fieldset>

          <fieldset className="lab-form-section">
            <legend>
              <span>Hiển thị và trạng thái</span>
              <small>Bổ sung ngữ cảnh cho người quản trị và các luồng xét nghiệm.</small>
            </legend>
            <div className="lab-form-grid">
              <Field id="lab-description" label="Mô tả" optional className="lab-form-span-2">
                <Textarea name="description" rows="3" value={form.description} onChange={(event) => update("description", event.target.value)} />
              </Field>
              <label className="lab-checkbox lab-form-span-2" htmlFor="lab-isActive">
                <input id="lab-isActive" name="isActive" type="checkbox" checked={form.isActive} onChange={(event) => update("isActive", event.target.checked)} />
                <span>
                  <strong>Đang sử dụng</strong>
                  <small>Cho phép chỉ số xuất hiện trong các luồng xử lý xét nghiệm.</small>
                </span>
              </label>
            </div>
          </fieldset>
        </div>

        <div className="doctor-modal-actions lab-dialog-actions">
          <Button tone="secondary" type="button" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button type="submit" loading={saving} loadingLabel="Đang lưu…"><Check size={16} aria-hidden="true" /> {editing ? "Lưu thay đổi" : "Tạo chỉ số"}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function AliasFields({ form, errors, update, firstInputRef }) {
  return (
    <div className="lab-form-grid">
      <Field id="lab-aliasText" label="Tên bí danh" required error={errors.aliasText} className="lab-form-span-2">
        <TextInput ref={firstInputRef} name="aliasText" value={form.aliasText} onChange={(event) => update("aliasText", event.target.value)} />
      </Field>
      <Field id="lab-language" label="Ngôn ngữ" optional hint="Ví dụ: vi hoặc en.">
        <TextInput name="language" value={form.language} onChange={(event) => update("language", event.target.value)} />
      </Field>
      <label className="lab-checkbox" htmlFor="lab-isPrimary">
        <input id="lab-isPrimary" name="isPrimary" type="checkbox" checked={form.isPrimary} onChange={(event) => update("isPrimary", event.target.checked)} />
        <span><strong>Bí danh chính</strong><small>Đánh dấu tên gọi được ưu tiên hiển thị.</small></span>
      </label>
    </div>
  );
}

function RangeFields({ form, errors, update, firstInputRef }) {
  return (
    <div className="lab-form-grid">
      <Field id="lab-gender" label="Giới tính" required error={errors.gender}>
        <Select ref={firstInputRef} name="gender" value={form.gender} onChange={(event) => update("gender", event.target.value)}>
          <option value="">Chọn giới tính</option>
          {GENDER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
      </Field>
      <Field id="lab-ageGroup" label="Nhóm tuổi" required error={errors.ageGroup}>
        <Select name="ageGroup" value={form.ageGroup} onChange={(event) => update("ageGroup", event.target.value)}>
          <option value="">Chọn nhóm tuổi</option>
          {AGE_GROUP_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
      </Field>
      <Field id="lab-comparisonType" label="Kiểu so sánh" required error={errors.comparisonType} className="lab-form-span-2">
        <Select name="comparisonType" value={form.comparisonType} onChange={(event) => update("comparisonType", event.target.value)}>
          <option value="">Chọn kiểu so sánh</option>
          {COMPARISON_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
      </Field>
      <Field id="lab-minValue" label="Giá trị tối thiểu" optional error={errors.minValue}>
        <TextInput name="minValue" inputMode="decimal" value={form.minValue} onChange={(event) => update("minValue", event.target.value)} />
      </Field>
      <Field id="lab-maxValue" label="Giá trị tối đa" optional>
        <TextInput name="maxValue" inputMode="decimal" value={form.maxValue} onChange={(event) => update("maxValue", event.target.value)} />
      </Field>
      <Field id="lab-unit" label="Đơn vị" optional>
        <TextInput name="unit" value={form.unit} onChange={(event) => update("unit", event.target.value)} />
      </Field>
      <Field id="lab-priority" label="Độ ưu tiên" hint="Số nguyên; giá trị nhỏ hơn được ưu tiên trước.">
        <TextInput name="priority" inputMode="numeric" pattern="-?[0-9]*" value={form.priority} onChange={(event) => update("priority", event.target.value)} />
      </Field>
    </div>
  );
}

function AdviceFields({ form, errors, update, firstInputRef }) {
  return (
    <div className="lab-form-grid">
      <Field id="lab-status" label="Trạng thái kết quả" required error={errors.status}>
        <Select ref={firstInputRef} name="status" value={form.status} onChange={(event) => update("status", event.target.value)}>
          <option value="">Chọn trạng thái</option>
          {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
      </Field>
      <Field id="lab-severityLevel" label="Mức độ" required error={errors.severityLevel}>
        <Select name="severityLevel" value={form.severityLevel} onChange={(event) => update("severityLevel", event.target.value)}>
          <option value="">Chọn mức độ</option>
          {SEVERITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
      </Field>
      <Field id="lab-displayTitle" label="Tiêu đề hiển thị" optional className="lab-form-span-2">
        <TextInput name="displayTitle" value={form.displayTitle} onChange={(event) => update("displayTitle", event.target.value)} />
      </Field>
      <Field id="lab-summary" label="Tóm tắt" optional className="lab-form-span-2">
        <Textarea name="summary" rows="3" value={form.summary} onChange={(event) => update("summary", event.target.value)} />
      </Field>
      <Field id="lab-possibleCauses" label="Nguyên nhân có thể" optional>
        <Textarea name="possibleCauses" rows="4" value={form.possibleCauses} onChange={(event) => update("possibleCauses", event.target.value)} />
      </Field>
      <Field id="lab-warningSigns" label="Dấu hiệu cảnh báo" optional>
        <Textarea name="warningSigns" rows="4" value={form.warningSigns} onChange={(event) => update("warningSigns", event.target.value)} />
      </Field>
      <Field id="lab-lifestyleAdvice" label="Lời khuyên lối sống" optional>
        <Textarea name="lifestyleAdvice" rows="4" value={form.lifestyleAdvice} onChange={(event) => update("lifestyleAdvice", event.target.value)} />
      </Field>
      <Field id="lab-nutritionalAdvice" label="Lời khuyên dinh dưỡng" optional>
        <Textarea name="nutritionalAdvice" rows="4" value={form.nutritionalAdvice} onChange={(event) => update("nutritionalAdvice", event.target.value)} />
      </Field>
      <Field id="lab-urgencyLevel" label="Mức độ khẩn cấp" optional>
        <TextInput name="urgencyLevel" value={form.urgencyLevel} onChange={(event) => update("urgencyLevel", event.target.value)} />
      </Field>
      <Field id="lab-followUpSuggestion" label="Đề xuất theo dõi" optional>
        <Textarea name="followUpSuggestion" rows="3" value={form.followUpSuggestion} onChange={(event) => update("followUpSuggestion", event.target.value)} />
      </Field>
      <Field id="lab-doctorQuestions" label="Câu hỏi dành cho bác sĩ" optional className="lab-form-span-2">
        <Textarea name="doctorQuestions" rows="4" value={form.doctorQuestions} onChange={(event) => update("doctorQuestions", event.target.value)} />
      </Field>
    </div>
  );
}

function validateChildForm(kind, form) {
  const errors = {};
  if (kind === "alias" && !form.aliasText.trim()) errors.aliasText = "Nhập tên bí danh.";
  if (kind === "range") {
    if (!form.gender) errors.gender = "Chọn giới tính.";
    if (!form.ageGroup) errors.ageGroup = "Chọn nhóm tuổi.";
    if (!form.comparisonType) errors.comparisonType = "Chọn kiểu so sánh.";
    const referenceOrderError = validateReferenceOrder(form.minValue, form.maxValue);
    if (referenceOrderError) errors.minValue = referenceOrderError;
  }
  if (kind === "advice") {
    if (!form.status) errors.status = "Chọn trạng thái kết quả.";
    if (!form.severityLevel) errors.severityLevel = "Chọn mức độ lời khuyên.";
  }
  return errors;
}

function childPayload(kind, form) {
  if (kind === "alias") {
    return {
      aliasText: nullableText(form.aliasText),
      language: nullableText(form.language),
      isPrimary: Boolean(form.isPrimary),
    };
  }
  if (kind === "range") {
    return {
      gender: form.gender,
      ageGroup: form.ageGroup,
      comparisonType: form.comparisonType,
      minValue: nullableNumber(form.minValue),
      maxValue: nullableNumber(form.maxValue),
      unit: nullableText(form.unit),
      priority: Number.isFinite(Number(form.priority)) ? Number(form.priority) : 0,
    };
  }
  return {
    status: form.status,
    displayTitle: nullableText(form.displayTitle),
    summary: nullableText(form.summary),
    possibleCauses: nullableText(form.possibleCauses),
    lifestyleAdvice: nullableText(form.lifestyleAdvice),
    nutritionalAdvice: nullableText(form.nutritionalAdvice),
    urgencyLevel: nullableText(form.urgencyLevel),
    severityLevel: form.severityLevel,
    warningSigns: nullableText(form.warningSigns),
    followUpSuggestion: nullableText(form.followUpSuggestion),
    doctorQuestions: nullableText(form.doctorQuestions),
  };
}

export function LabIndicatorChildDialog({ kind, item, saving, restoreFocusRef, onClose, onSubmit }) {
  const editing = Boolean(item);
  const meta = CHILD_DIALOG_META[kind];
  const Icon = meta.icon;
  const [form, setForm] = useState(() => childToForm(kind, item));
  const [errors, setErrors] = useState({});
  const errorSummaryRef = useRef(null);
  const firstInputRef = useRef(null);

  const title = useMemo(
    () => `${editing ? "Sửa" : "Tạo"} ${meta.noun}`,
    [editing, meta.noun],
  );

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "", minValue: "" }));
  }

  async function submit(event) {
    event.preventDefault();
    const nextErrors = validateChildForm(kind, form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      window.requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return;
    }
    await onSubmit(childPayload(kind, form));
  }

  return (
    <Dialog
      className={`doctor-modal lab-dialog lab-child-dialog lab-child-dialog-${kind}`}
      backdropClassName="doctor-modal-backdrop"
      labelledBy="lab-child-dialog-title"
      describedBy="lab-child-dialog-description"
      initialFocusRef={firstInputRef}
      restoreFocusRef={restoreFocusRef}
      onClose={() => { if (!saving) onClose(); }}
    >
      <header className="doctor-modal-header lab-dialog-header">
        <span className="lab-dialog-icon" aria-hidden="true"><Icon size={22} /></span>
        <div>
          <p>{meta.eyebrow}</p>
          <h2 id="lab-child-dialog-title">{title}</h2>
          <small id="lab-child-dialog-description">Mục này luôn được lưu dưới indicator hiện tại.</small>
        </div>
        <button className="doctor-modal-close" type="button" aria-label={`Đóng form ${meta.noun}`} onClick={onClose} disabled={saving}>
          <X size={18} aria-hidden="true" />
        </button>
      </header>

      <form className="clean-form doctor-form lab-dialog-form" onSubmit={submit} noValidate>
        <FormErrorSummary errors={errors} summaryRef={errorSummaryRef} />
        {kind === "alias" && <AliasFields form={form} errors={errors} update={update} firstInputRef={firstInputRef} />}
        {kind === "range" && <RangeFields form={form} errors={errors} update={update} firstInputRef={firstInputRef} />}
        {kind === "advice" && <AdviceFields form={form} errors={errors} update={update} firstInputRef={firstInputRef} />}
        <div className="doctor-modal-actions lab-dialog-actions">
          <Button tone="secondary" type="button" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button type="submit" loading={saving} loadingLabel="Đang lưu…"><Check size={16} aria-hidden="true" /> {editing ? "Lưu thay đổi" : title}</Button>
        </div>
      </form>
    </Dialog>
  );
}
