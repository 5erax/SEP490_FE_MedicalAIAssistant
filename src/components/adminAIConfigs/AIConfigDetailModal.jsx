import { BrainCircuit } from "lucide-react";
import { formatDateTime, formatEnvironment, getEnvironment } from "./aiConfigUtils";

export default function AIConfigDetailModal({ config, onClose }) {
  if (!config) return null;

  return (
    <div className="ai-config-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="ai-config-modal ai-config-detail-modal" role="dialog" aria-modal="true" aria-labelledby="ai-config-detail-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="ai-config-modal-header">
          <span className="ai-config-modal-icon"><BrainCircuit size={22} /></span>
          <div>
            <p className="eyebrow">AI Config Detail</p>
            <h2 id="ai-config-detail-title">{config.taskType || "AI configuration"}</h2>
            <p>{config.model || "Chưa chọn model"} · {config.isActive ? "Active" : "Inactive"}</p>
          </div>
          <button className="doctor-modal-close" type="button" aria-label="Đóng chi tiết" onClick={onClose}>×</button>
        </header>

        <div className="ai-config-detail-grid">
          <article>
            <span>Feature Type</span>
            <strong>{config.taskType || "Chưa cập nhật"}</strong>
          </article>
          <article>
            <span>Environment</span>
            <strong>{formatEnvironment(getEnvironment(config))}</strong>
          </article>
          <article>
            <span>Temperature</span>
            <strong>{config.temperature ?? "Auto"}</strong>
          </article>
          <article>
            <span>Max Tokens</span>
            <strong>{config.maxTokens ?? "Auto"}</strong>
          </article>
          <article>
            <span>Created</span>
            <strong>{formatDateTime(config.createdAt)}</strong>
          </article>
          <article>
            <span>Updated</span>
            <strong>{formatDateTime(config.updatedAt || config.createdAt)}</strong>
          </article>
        </div>

        <section className="ai-config-prompt-block">
          <span>Prompt / System Instruction</span>
          <pre>{config.systemPrompt || "Chưa có system prompt."}</pre>
        </section>
      </section>
    </div>
  );
}
