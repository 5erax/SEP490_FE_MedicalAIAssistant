import {
  BrainCircuit,
  Clock3,
  Eye,
  Gauge,
  Pencil,
  Power,
  ServerCog,
  Trash2,
} from "lucide-react";
import { Badge, Button, EmptyState } from "../ui";
import AdminActionDisclosure from "../admin/AdminActionDisclosure";
import {
  formatDateTime,
  formatEnvironment,
  getConfigName,
  getEnvironment,
  truncatePrompt,
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
    <div className="ai-config-clinical-list" role="list" aria-label="Danh sách cấu hình AI">
      {configs.map((config) => {
        const configName = getConfigName(config);
        const statusLabel = config.isActive ? "Đang bật" : "Đang tắt";

        return (
          <article className="ai-config-clinical-card" key={config.id} role="listitem">
            <div className="ai-config-clinical-card-main">
              <span className="ai-config-clinical-orb" aria-hidden="true">
                <BrainCircuit size={21} />
              </span>
              <div>
                <strong>{configName}</strong>
                <span>
                  <ServerCog size={13} aria-hidden="true" />
                  {formatEnvironment(getEnvironment(config))}
                </span>
                <small>ID cấu hình · {config.id}</small>
              </div>
            </div>

            <section className="ai-config-clinical-prompt" aria-label={`Prompt của ${configName}`}>
              <span>Prompt hệ thống</span>
              <p>{truncatePrompt(config.systemPrompt, 180)}</p>
            </section>

            <dl className="ai-config-clinical-metrics">
              <div>
                <dt><ServerCog size={14} aria-hidden="true" /> Mô hình</dt>
                <dd>{config.model || "Chưa chọn mô hình"}</dd>
              </div>
              <div>
                <dt><Gauge size={14} aria-hidden="true" /> Tham số</dt>
                <dd>Nhiệt độ {formatNumber(config.temperature)} · Token {formatNumber(config.maxTokens)}</dd>
              </div>
              <div>
                <dt><Clock3 size={14} aria-hidden="true" /> Cập nhật</dt>
                <dd>
                  <time dateTime={config.updatedAt || config.createdAt || undefined}>
                    {formatDateTime(config.updatedAt || config.createdAt)}
                  </time>
                </dd>
              </div>
            </dl>

            <div className="ai-config-clinical-status">
              <Badge tone={config.isActive ? "success" : "warning"}>{statusLabel}</Badge>
            </div>

            <div className="ai-config-clinical-actions">
              <button
                className="btn btn-ghost btn-small"
                type="button"
                aria-label={`Xem chi tiết cấu hình ${configName}`}
                onClick={() => onView(config)}
              >
                <Eye size={15} aria-hidden="true" /> Chi tiết
              </button>
              <AdminActionDisclosure>
                <button
                  className="btn btn-ghost btn-small"
                  type="button"
                  aria-label={`Sửa cấu hình ${configName}`}
                  onClick={() => onEdit(config)}
                >
                  <Pencil size={15} aria-hidden="true" /> Sửa
                </button>
                <button
                  className="btn btn-ghost btn-small"
                  type="button"
                  aria-label={`${config.isActive ? "Tắt" : "Bật"} cấu hình ${configName}`}
                  onClick={() => onToggleStatus(config)}
                >
                  <Power size={15} aria-hidden="true" /> {config.isActive ? "Tắt" : "Bật"}
                </button>
                <button
                  className="btn btn-dark btn-small ai-config-delete-button"
                  type="button"
                  aria-label={`Xóa cấu hình ${configName}`}
                  onClick={() => onDelete(config)}
                >
                  <Trash2 size={15} aria-hidden="true" /> Xóa
                </button>
              </AdminActionDisclosure>
            </div>
          </article>
        );
      })}
    </div>
  );
}
