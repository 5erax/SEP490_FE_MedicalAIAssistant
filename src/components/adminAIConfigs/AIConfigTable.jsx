import { Badge, Button, EmptyState } from "../ui";
import { BrainCircuit, Eye, Pencil, Power, Trash2 } from "lucide-react";
import { formatDateTime, getConfigName, truncatePrompt } from "./aiConfigUtils";

function formatNumber(value, fallback = "Auto") {
  if (value === null || value === undefined || value === "") return fallback;
  return value;
}

export default function AIConfigTable({ configs, onView, onEdit, onToggleStatus, onDelete, onCreate }) {
  if (!configs.length) {
    return (
      <EmptyState
        className="ai-config-empty-state"
        icon={<BrainCircuit size={26} />}
        title="Chưa có AI config phù hợp"
        description="Tạo prompt/model configuration đầu tiên để quản trị hành vi AI trong hệ thống MediMate AI."
        action={(
          <Button onClick={onCreate}>
            <BrainCircuit size={15} aria-hidden="true" /> Add Config
          </Button>
        )}
      />
    );
  }

  return (
    <div className="ai-config-card-list" role="list" aria-label="Danh sach cau hinh AI">
      <div className="ai-config-list-header" aria-hidden="true">
        <span>Config</span>
        <span>System role / Prompt</span>
        <span>Model</span>
        <span>Status</span>
        <span>Last updated</span>
        <span>Actions</span>
      </div>

      {configs.map((config) => (
        <article className="ai-config-card" key={config.id} role="listitem">
          <div className="ai-config-card-main">
            <div className="ai-config-primary-cell">
              <span className="ai-config-orb"><BrainCircuit size={18} /></span>
              <div>
                <strong>{getConfigName(config)}</strong>
                <span>{config.taskType || "Feature type chưa đặt"}</span>
              </div>
            </div>
          </div>

          <div className="ai-config-card-prompt">
            <small>System role / Prompt</small>
            <p>{truncatePrompt(config.systemPrompt)}</p>
          </div>

          <div className="ai-config-card-model">
            <small>Model</small>
            <strong>{config.model || "Chưa chọn model"}</strong>
            <span>Temperature {formatNumber(config.temperature)}</span>
            <span>Max tokens {formatNumber(config.maxTokens)}</span>
          </div>

          <div className="ai-config-card-status">
            <Badge tone={config.isActive ? "success" : "warning"}>
              {config.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>

          <div className="ai-config-card-date">
            <small>Last updated</small>
            <span className="ai-config-date">{formatDateTime(config.updatedAt || config.createdAt)}</span>
          </div>

          <div className="record-actions ai-config-card-actions">
            <button className="btn btn-ghost btn-small" type="button" onClick={() => onView(config)}>
              <Eye size={14} /> View
            </button>
            <button className="btn btn-ghost btn-small" type="button" onClick={() => onEdit(config)}>
              <Pencil size={14} /> Edit
            </button>
            <button className="btn btn-ghost btn-small" type="button" onClick={() => onToggleStatus(config)}>
              <Power size={14} /> {config.isActive ? "Disable" : "Enable"}
            </button>
            <button className="btn btn-dark btn-small" type="button" onClick={() => onDelete(config)}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
