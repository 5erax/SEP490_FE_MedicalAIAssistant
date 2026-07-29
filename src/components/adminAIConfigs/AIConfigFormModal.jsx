import { useRef, useState } from "react";
import { BrainCircuit, Check, MessageSquareText, ShieldAlert, SlidersHorizontal, ToggleLeft } from "lucide-react";
import { focusFirstInvalidField, getAdminFieldProps } from "../admin/adminFormUtils";
import { Dialog } from "../ui";

const EMPTY_FORM = {
  taskType: "",
  systemPrompt: "",
  model: "",
  temperature: "0.2",
  maxTokens: "1024",
  isActive: "true",
};

function toFormValue(config) {
  if (!config) return EMPTY_FORM;
  return {
    taskType: config.taskType ?? "",
    systemPrompt: config.systemPrompt ?? "",
    model: config.model ?? "",
    temperature: config.temperature ?? "",
    maxTokens: config.maxTokens ?? "",
    isActive: String(Boolean(config.isActive)),
  };
}

function validate(form) {
  const errors = {};
  const temperature = Number(form.temperature);
  const maxTokens = Number(form.maxTokens);

  if (!form.taskType.trim()) errors.taskType = "Cần nhập Feature Type / Task Type.";
  if (!form.systemPrompt.trim()) errors.systemPrompt = "Cần nhập Prompt/System Instruction.";
  if (!form.model.trim()) errors.model = "Cần nhập AI Model.";
  if (form.temperature !== "" && (Number.isNaN(temperature) || temperature < 0 || temperature > 2)) {
    errors.temperature = "Temperature nên nằm trong khoảng 0 đến 2.";
  }
  if (form.maxTokens !== "" && (!Number.isInteger(maxTokens) || maxTokens <= 0)) {
    errors.maxTokens = "Max Tokens phải là số nguyên dương.";
  }

  return errors;
}

function buildPayload(form) {
  return {
    taskType: form.taskType.trim(),
    systemPrompt: form.systemPrompt.trim(),
    model: form.model.trim(),
    temperature: form.temperature === "" ? null : Number(form.temperature),
    maxTokens: form.maxTokens === "" ? null : Number(form.maxTokens),
    isActive: form.isActive === "true",
  };
}

export default function AIConfigFormModal({
  mode,
  config,
  saving,
  restoreFocusRef,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(() => toFormValue(config));
  const [errors, setErrors] = useState({});
  const firstFieldRef = useRef(null);
  const errorSummaryRef = useRef(null);
  const formRef = useRef(null);
  const title = mode === "edit" ? "Cập nhật cấu hình AI" : "Tạo cấu hình AI";
  const hasErrors = Object.values(errors).some(Boolean);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      focusFirstInvalidField(formRef, nextErrors);
      return;
    }
    onSubmit(buildPayload(form));
  }

  return (
    <Dialog
      backdropClassName="ai-config-modal-backdrop"
      className="ai-config-modal"
      labelledBy="ai-config-modal-title"
      describedBy="ai-config-modal-description"
      onClose={onClose}
      closeOnBackdrop={!saving}
      closeOnEscape={!saving}
      initialFocusRef={firstFieldRef}
      restoreFocusRef={restoreFocusRef}
    >
        <header className="ai-config-modal-header">
          <span className="ai-config-modal-icon"><BrainCircuit size={22} aria-hidden="true" /></span>
          <div>
            <p className="eyebrow">Vận hành AI</p>
            <h2 id="ai-config-modal-title">{title}</h2>
            <p id="ai-config-modal-description">Điều chỉnh prompt, mô hình và tham số của một tính năng AI đã có trong hệ thống.</p>
          </div>
          <button className="doctor-modal-close" type="button" aria-label="Đóng form" onClick={onClose} disabled={saving}>×</button>
        </header>

        <form ref={formRef} className="clean-form ai-config-form" onSubmit={handleSubmit} noValidate>
          <aside className="ai-config-modal-warning">
            <ShieldAlert size={18} aria-hidden="true" />
            <p><strong>Kiểm tra kỹ trước khi lưu.</strong> Prompt, mô hình và trạng thái mới có thể ảnh hưởng phản hồi AI đang vận hành.</p>
          </aside>

          {hasErrors && (
            <div
              ref={errorSummaryRef}
              className="ai-config-error-summary"
              role="alert"
              tabIndex="-1"
            >
              <strong>Chưa thể lưu cấu hình</strong>
              <span>Kiểm tra các trường được đánh dấu bên dưới.</span>
            </div>
          )}

          <div className="ai-config-form-sections">
          <section className="ai-config-form-card" aria-labelledby="ai-config-operation-section">
            <div className="ai-config-form-card-head">
              <span><SlidersHorizontal size={18} aria-hidden="true" /></span>
              <div>
                <h3 id="ai-config-operation-section">Thiết lập vận hành</h3>
                <p>Định danh tính năng, model và giới hạn phản hồi cho cấu hình AI.</p>
              </div>
            </div>

          <div className="form-two-cols ai-config-form-grid">
            <label className={`clean-field ${errors.taskType ? "ai-config-field-error" : ""}`}>
              <span>Loại tính năng <small className="ai-config-required-note">(bắt buộc)</small></span>
              <input
                {...getAdminFieldProps("taskType", errors.taskType, "ai-config-task-help")}
                ref={firstFieldRef}
                value={form.taskType}
                onChange={(event) => update("taskType", event.target.value)}
                placeholder="Ví dụ: symptom-analysis"
                required
              />
              <small id="ai-config-task-help">{errors.taskType || "Định danh cấu hình theo tính năng AI của hệ thống."}</small>
            </label>
            <label className={`clean-field ${errors.model ? "ai-config-field-error" : ""}`}>
              <span>Mô hình AI <small className="ai-config-required-note">(bắt buộc)</small></span>
              <input
                {...getAdminFieldProps("model", errors.model, errors.model ? "ai-config-model-error" : "")}
                value={form.model}
                onChange={(event) => update("model", event.target.value)}
                placeholder="Tên mô hình theo cấu hình backend"
                required
              />
              {errors.model && <small id="ai-config-model-error">{errors.model}</small>}
            </label>
            <label className={`clean-field ${errors.temperature ? "ai-config-field-error" : ""}`}>
              <span>Nhiệt độ phản hồi</span>
              <input
                {...getAdminFieldProps("temperature", errors.temperature, "ai-config-temperature-help")}
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={form.temperature}
                onChange={(event) => update("temperature", event.target.value)}
              />
              <small id="ai-config-temperature-help">{errors.temperature || "Giá trị từ 0 đến 2; giá trị thấp cho phản hồi ổn định hơn."}</small>
            </label>
            <label className={`clean-field ${errors.maxTokens ? "ai-config-field-error" : ""}`}>
              <span>Token tối đa</span>
              <input
                {...getAdminFieldProps("maxTokens", errors.maxTokens, errors.maxTokens ? "ai-config-token-error" : "")}
                type="number"
                min="1"
                value={form.maxTokens}
                onChange={(event) => update("maxTokens", event.target.value)}
              />
              {errors.maxTokens && <small id="ai-config-token-error">{errors.maxTokens}</small>}
            </label>
          </div>
          </section>

          <section className="ai-config-form-card ai-config-prompt-card" aria-labelledby="ai-config-prompt-section">
            <div className="ai-config-form-card-head">
              <span><MessageSquareText size={18} aria-hidden="true" /></span>
              <div>
                <h3 id="ai-config-prompt-section">Prompt hệ thống</h3>
                <p>Thiết lập vai trò, ranh giới an toàn và cách AI phản hồi với người dùng.</p>
              </div>
            </div>

          <label className={`clean-field ${errors.systemPrompt ? "ai-config-field-error" : ""}`}>
            <span>Prompt hệ thống <small className="ai-config-required-note">(bắt buộc)</small></span>
            <textarea
              {...getAdminFieldProps("systemPrompt", errors.systemPrompt, "ai-config-prompt-help")}
              rows={9}
              value={form.systemPrompt}
              onChange={(event) => update("systemPrompt", event.target.value)}
              placeholder="Nhập system instruction định hướng hành vi AI, giới hạn an toàn và cách phản hồi cho bệnh nhân..."
              required
            />
            <small id="ai-config-prompt-help">{errors.systemPrompt || "Nêu rõ vai trò, ranh giới y tế, cách phản hồi và điều kiện khuyến nghị gặp người có chuyên môn."}</small>
          </label>
          </section>

          <section className="ai-config-form-card ai-config-status-card" aria-labelledby="ai-config-status-section">
            <div className="ai-config-form-card-head">
              <span><ToggleLeft size={18} aria-hidden="true" /></span>
              <div>
                <h3 id="ai-config-status-section">Trạng thái</h3>
                <p>Chọn cấu hình sẽ được bật hay tắt ngay sau khi lưu.</p>
              </div>
            </div>

          <label className="clean-field ai-config-status-field">
            <span>Trạng thái sau khi lưu</span>
            <select name="isActive" value={form.isActive} onChange={(event) => update("isActive", event.target.value)}>
              <option value="true">Đang bật</option>
              <option value="false">Đang tắt</option>
            </select>
          </label>
          </section>
          </div>

          <div className="doctor-modal-actions">
            <button className="btn btn-ghost" type="button" onClick={onClose} disabled={saving}>Hủy</button>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              <Check size={16} aria-hidden="true" />
              {saving ? "Đang lưu..." : mode === "edit" ? "Lưu cập nhật" : "Tạo cấu hình"}
            </button>
          </div>
        </form>
    </Dialog>
  );
}
