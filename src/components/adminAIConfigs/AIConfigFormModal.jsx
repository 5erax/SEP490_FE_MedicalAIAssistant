import { useState } from "react";
import { BrainCircuit } from "lucide-react";

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

export default function AIConfigFormModal({ mode, config, saving, onClose, onSubmit }) {
  const [form, setForm] = useState(() => toFormValue(config));
  const [errors, setErrors] = useState({});
  const title = mode === "edit" ? "Update AI Configuration" : "Create AI Configuration";

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onSubmit(buildPayload(form));
  }

  return (
    <div className="ai-config-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="ai-config-modal" role="dialog" aria-modal="true" aria-labelledby="ai-config-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="ai-config-modal-header">
          <span className="ai-config-modal-icon"><BrainCircuit size={22} /></span>
          <div>
            <p className="eyebrow">AI Platform Console</p>
            <h2 id="ai-config-modal-title">{title}</h2>
            <p>Điều chỉnh prompt, model và tham số runtime theo đúng API AIConfig của backend.</p>
          </div>
          <button className="doctor-modal-close" type="button" aria-label="Đóng form" onClick={onClose}>×</button>
        </header>

        <form className="clean-form ai-config-form" onSubmit={handleSubmit}>
          <div className="form-two-cols">
            <label className={`clean-field ${errors.taskType ? "ai-config-field-error" : ""}`}>
              <span>Feature Type / Task Type</span>
              <input value={form.taskType} onChange={(event) => update("taskType", event.target.value)} placeholder="symptom-analysis" />
              <small>{errors.taskType || "Backend dùng taskType để tìm config theo tính năng AI."}</small>
            </label>
            <label className={`clean-field ${errors.model ? "ai-config-field-error" : ""}`}>
              <span>AI Model</span>
              <input value={form.model} onChange={(event) => update("model", event.target.value)} placeholder="gpt-4o-mini, medimate-triage-v1..." />
              {errors.model && <small>{errors.model}</small>}
            </label>
            <label className={`clean-field ${errors.temperature ? "ai-config-field-error" : ""}`}>
              <span>Temperature</span>
              <input type="number" step="0.1" min="0" max="2" value={form.temperature} onChange={(event) => update("temperature", event.target.value)} />
              <small>{errors.temperature || "Giá trị thấp giúp phản hồi ổn định hơn trong ngữ cảnh y tế."}</small>
            </label>
            <label className={`clean-field ${errors.maxTokens ? "ai-config-field-error" : ""}`}>
              <span>Max Tokens</span>
              <input type="number" min="1" value={form.maxTokens} onChange={(event) => update("maxTokens", event.target.value)} />
              {errors.maxTokens && <small>{errors.maxTokens}</small>}
            </label>
          </div>

          <label className={`clean-field ${errors.systemPrompt ? "ai-config-field-error" : ""}`}>
            <span>Prompt / System Instruction</span>
            <textarea
              rows={9}
              value={form.systemPrompt}
              onChange={(event) => update("systemPrompt", event.target.value)}
              placeholder="Nhập system instruction định hướng hành vi AI, giới hạn an toàn và cách phản hồi cho bệnh nhân..."
            />
            <small>{errors.systemPrompt || "Nên mô tả vai trò, ranh giới y tế, tone phản hồi và điều kiện khuyến nghị gặp bác sĩ."}</small>
          </label>

          <label className="clean-field ai-config-status-field">
            <span>Status</span>
            <select value={form.isActive} onChange={(event) => update("isActive", event.target.value)}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </label>

          <div className="doctor-modal-actions">
            <button className="btn btn-ghost" type="button" onClick={onClose}>Hủy</button>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Đang lưu..." : mode === "edit" ? "Lưu cập nhật" : "Create Config"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
