import {
  BrainCircuit,
  Eye,
  Pencil,
  Power,
  ServerCog,
  Trash2,
} from "lucide-react";
import { Badge, Button, DataTable, EmptyState } from "../ui";
import AdminActionDisclosure from "../admin/AdminActionDisclosure";
import {
  formatDateTime,
  formatEnvironment,
  getConfigName,
  getEnvironment,
} from "./aiConfigUtils";

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
        description="Điều chỉnh bộ lọc hoặc tạo cấu hình mới cho một tính năng AI đã có trong hệ thống."
        action={(
          <Button onClick={onCreate}>
            <BrainCircuit size={15} aria-hidden="true" /> Tạo cấu hình
          </Button>
        )}
      />
    );
  }

  return (
    <DataTable
      className="ai-config-table-wrap"
      caption="Danh sách cấu hình AI theo bộ lọc hiện tại"
      rowHeaderKey="config"
      getRowKey={(config) => config.id}
      rows={configs}
      columns={[
        {
          key: "config",
          header: "Cấu hình",
          render: (config) => (
            <div className="ai-config-primary-cell">
              <span className="ai-config-clinical-orb" aria-hidden="true">
                <BrainCircuit size={18} />
              </span>
              <div>
                <strong>{getConfigName(config)}</strong>
                <small>
                  <ServerCog size={12} aria-hidden="true" />
                  {formatEnvironment(getEnvironment(config))} · ID {config.id}
                </small>
              </div>
            </div>
          ),
        },
        {
          key: "model",
          header: "Mô hình",
          render: (config) => (
            <div className="table-primary-cell">
              <strong>{config.model || "Chưa chọn mô hình"}</strong>
              <small>Nhiệt độ {formatNumber(config.temperature)} · Token {formatNumber(config.maxTokens)}</small>
            </div>
          ),
        },
        {
          key: "updated",
          header: "Cập nhật",
          render: (config) => (
            <time dateTime={config.updatedAt || config.createdAt || undefined}>
              {formatDateTime(config.updatedAt || config.createdAt)}
            </time>
          ),
        },
        {
          key: "status",
          header: "Trạng thái",
          render: (config) => (
            <Badge tone={config.isActive ? "success" : "warning"}>{config.isActive ? "Đang bật" : "Đang tắt"}</Badge>
          ),
        },
        {
          key: "actions",
          header: "Thao tác",
          render: (config) => {
            const configName = getConfigName(config);
            return (
              <div className="record-actions" aria-label={`Thao tác với cấu hình ${configName}`}>
                <AdminActionDisclosure label="Mở rộng">
                  <button
                    className="btn btn-ghost btn-small"
                    type="button"
                    aria-label={`Xem chi tiết cấu hình ${configName}`}
                    onClick={() => onView(config)}
                  >
                    <Eye size={14} aria-hidden="true" /> Chi tiết
                  </button>
                  <button
                    className="btn btn-ghost btn-small"
                    type="button"
                    aria-label={`Sửa cấu hình ${configName}`}
                    onClick={() => onEdit(config)}
                  >
                    <Pencil size={14} aria-hidden="true" /> Sửa
                  </button>
                  <button
                    className="btn btn-ghost btn-small"
                    type="button"
                    aria-label={`${config.isActive ? "Tắt" : "Bật"} cấu hình ${configName}`}
                    onClick={() => onToggleStatus(config)}
                  >
                    <Power size={14} aria-hidden="true" /> {config.isActive ? "Tắt" : "Bật"}
                  </button>
                </AdminActionDisclosure>
                <button
                  className="btn btn-dark btn-small ai-config-delete-button"
                  type="button"
                  aria-label={`Xóa cấu hình ${configName}`}
                  onClick={() => onDelete(config)}
                >
                  <Trash2 size={14} aria-hidden="true" /> Xóa
                </button>
              </div>
            );
          },
        },
      ]}
    />
  );
}
