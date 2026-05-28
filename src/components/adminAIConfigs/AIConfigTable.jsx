import { Badge, DataTable } from "../ui";
import { BrainCircuit, Eye, Pencil, Power, Trash2 } from "lucide-react";
import { formatDateTime, getConfigName, truncatePrompt } from "./aiConfigUtils";

function formatNumber(value, fallback = "Auto") {
  if (value === null || value === undefined || value === "") return fallback;
  return value;
}

export default function AIConfigTable({ configs, onView, onEdit, onToggleStatus, onDelete, onCreate }) {
  const columns = [
    {
      key: "config",
      header: "Config",
      render: (config) => (
        <div className="ai-config-primary-cell">
          <span className="ai-config-orb"><BrainCircuit size={18} /></span>
          <div>
            <strong>{getConfigName(config)}</strong>
            <span>{config.taskType || "Feature type chưa đặt"}</span>
          </div>
        </div>
      ),
    },
    {
      key: "prompt",
      header: "System Role / Prompt",
      render: (config) => (
        <div className="ai-config-prompt-preview">
          {truncatePrompt(config.systemPrompt)}
        </div>
      ),
    },
    {
      key: "model",
      header: "Model",
      render: (config) => (
        <div className="table-primary-cell">
          <strong>{config.model || "Chưa chọn model"}</strong>
          <span>Temperature {formatNumber(config.temperature)}</span>
          <small>Max tokens {formatNumber(config.maxTokens)}</small>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (config) => (
        <Badge tone={config.isActive ? "success" : "warning"}>
          {config.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "updatedAt",
      header: "Last Updated",
      render: (config) => <span className="ai-config-date">{formatDateTime(config.updatedAt || config.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      render: (config) => (
        <div className="record-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={() => onView(config)}><Eye size={14} /> View</button>
          <button className="btn btn-ghost btn-small" type="button" onClick={() => onEdit(config)}><Pencil size={14} /> Edit</button>
          <button className="btn btn-ghost btn-small" type="button" onClick={() => onToggleStatus(config)}>
            <Power size={14} /> {config.isActive ? "Disable" : "Enable"}
          </button>
          <button className="btn btn-dark btn-small" type="button" onClick={() => onDelete(config)}><Trash2 size={14} /> Delete</button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={configs}
      getRowKey={(config) => config.id}
      emptyState={(
        <section className="ui-empty ai-config-empty-state">
          <span className="ai-config-empty-icon"><BrainCircuit size={26} /></span>
          <strong>Chưa có AI config phù hợp</strong>
          <p>Tạo prompt/model configuration đầu tiên để quản trị hành vi AI trong hệ thống MediMate AI.</p>
          <button className="btn btn-primary btn-small" type="button" onClick={onCreate}>
            <BrainCircuit size={15} /> Add Config
          </button>
        </section>
      )}
    />
  );
}
