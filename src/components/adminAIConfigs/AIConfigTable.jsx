import { BrainCircuit, Eye, Pencil, Power, Trash2 } from "lucide-react";
import { Badge, Button, EmptyState } from "../ui";
import { formatDateTime, getConfigName, truncatePrompt } from "./aiConfigUtils";

function formatNumber(value, fallback = "Tự động") {
  if (value === null || value === undefined || value === "") return fallback;
  return value;
}

export default function AIConfigTable({ configs, onView, onEdit, onToggleStatus, onDelete, onCreate }) {
  if (!configs.length) {
    return (
      <EmptyState
        className="ai-config-empty-state"
        icon={<BrainCircuit size={26} />}
        title="Chưa có cấu hình AI phù hợp"
        description="Tạo cấu hình prompt và mô hình đầu tiên để quản lý hành vi AI trong MediMate."
        action={(
          <Button onClick={onCreate}>
            <BrainCircuit size={15} aria-hidden="true" /> Thêm cấu hình
          </Button>
        )}
      />
    );
  }

  return (
    <div
      className="ai-config-table-region"
      role="region"
      aria-labelledby="ai-config-table-caption"
      tabIndex="0"
    >
      <table className="ai-config-table">
        <caption id="ai-config-table-caption" className="sr-only">Danh sách cấu hình AI</caption>
        <thead>
          <tr>
            <th scope="col">Cấu hình</th>
            <th scope="col">Vai trò hệ thống / Prompt</th>
            <th scope="col">Mô hình</th>
            <th scope="col">Trạng thái</th>
            <th scope="col">Cập nhật</th>
            <th scope="col">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {configs.map((config) => (
            <tr key={config.id}>
              <th scope="row" data-label="Cấu hình">
                <span className="ai-config-table-name">
                  <span className="ai-config-orb"><BrainCircuit size={18} aria-hidden="true" /></span>
                  <span>
                    <strong>{getConfigName(config)}</strong>
                    <small>{config.taskType || "Chưa cập nhật loại tính năng"}</small>
                  </span>
                </span>
              </th>
              <td data-label="Prompt">
                <p className="ai-config-prompt-preview">{truncatePrompt(config.systemPrompt)}</p>
              </td>
              <td data-label="Mô hình">
                <span className="ai-config-model-summary">
                  <strong>{config.model || "Chưa chọn mô hình"}</strong>
                  <small>Nhiệt độ {formatNumber(config.temperature)} · Token tối đa {formatNumber(config.maxTokens)}</small>
                </span>
              </td>
              <td data-label="Trạng thái">
                <Badge tone={config.isActive ? "success" : "warning"}>
                  {config.isActive ? "Đang bật" : "Đang tắt"}
                </Badge>
              </td>
              <td data-label="Cập nhật">
                <time className="ai-config-date" dateTime={config.updatedAt || config.createdAt || undefined}>
                  {formatDateTime(config.updatedAt || config.createdAt)}
                </time>
              </td>
              <td data-label="Thao tác">
                <div className="ai-config-table-actions">
                  <button className="btn btn-ghost btn-small" type="button" onClick={() => onView(config)}>
                    <Eye size={14} aria-hidden="true" /> Xem
                  </button>
                  <button className="btn btn-ghost btn-small" type="button" onClick={() => onEdit(config)}>
                    <Pencil size={14} aria-hidden="true" /> Sửa
                  </button>
                  <button className="btn btn-ghost btn-small" type="button" onClick={() => onToggleStatus(config)}>
                    <Power size={14} aria-hidden="true" /> {config.isActive ? "Tắt" : "Bật"}
                  </button>
                  <button className="btn btn-dark btn-small" type="button" onClick={() => onDelete(config)}>
                    <Trash2 size={14} aria-hidden="true" /> Xóa
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
