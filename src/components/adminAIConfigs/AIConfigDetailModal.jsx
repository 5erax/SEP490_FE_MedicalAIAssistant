import { BrainCircuit, Gauge, ServerCog, ShieldCheck } from "lucide-react";
import { Badge, Dialog } from "../ui";
import { formatDateTime, formatEnvironment, getEnvironment } from "./aiConfigUtils";

export default function AIConfigDetailModal({ config, restoreFocusRef, onClose }) {
  if (!config) return null;

  return (
    <Dialog
      backdropClassName="ai-config-modal-backdrop"
      className="ai-config-modal ai-config-detail-modal"
      labelledBy="ai-config-detail-title"
      describedBy="ai-config-detail-description"
      onClose={onClose}
      restoreFocusRef={restoreFocusRef}
    >
        <header className="ai-config-modal-header">
          <span className="ai-config-modal-icon"><BrainCircuit size={22} aria-hidden="true" /></span>
          <div>
            <p className="eyebrow">Chi tiết cấu hình AI</p>
            <h2 id="ai-config-detail-title">{config.taskType || "AI configuration"}</h2>
            <p id="ai-config-detail-description">{config.model || "Chưa chọn mô hình"} · {config.isActive ? "Đang bật" : "Đang tắt"}</p>
          </div>
          <button className="doctor-modal-close" type="button" aria-label="Đóng chi tiết" onClick={onClose}>×</button>
        </header>

        <div className="ai-config-detail-status">
          <Badge tone={config.isActive ? "success" : "warning"}>
            {config.isActive ? "Đang bật" : "Đang tắt"}
          </Badge>
          <span><ShieldCheck size={15} aria-hidden="true" /> Chỉ hiển thị thông tin cấu hình hiện có</span>
        </div>

        <div className="ai-config-detail-grid">
          <article>
            <span><ServerCog size={14} aria-hidden="true" /> Loại tính năng</span>
            <strong>{config.taskType || "Chưa cập nhật"}</strong>
          </article>
          <article>
            <span>Môi trường</span>
            <strong>{formatEnvironment(getEnvironment(config))}</strong>
          </article>
          <article>
            <span><Gauge size={14} aria-hidden="true" /> Nhiệt độ</span>
            <strong>{config.temperature ?? "Tự động"}</strong>
          </article>
          <article>
            <span>Token tối đa</span>
            <strong>{config.maxTokens ?? "Tự động"}</strong>
          </article>
          <article>
            <span>Ngày tạo</span>
            <strong>{formatDateTime(config.createdAt)}</strong>
          </article>
          <article>
            <span>Cập nhật gần nhất</span>
            <strong>{formatDateTime(config.updatedAt || config.createdAt)}</strong>
          </article>
        </div>

        <section className="ai-config-prompt-block">
          <span>Prompt hệ thống</span>
          <pre>{config.systemPrompt || "Chưa có system prompt."}</pre>
        </section>
    </Dialog>
  );
}
