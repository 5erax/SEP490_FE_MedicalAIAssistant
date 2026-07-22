import {
  Activity,
  BrainCircuit,
  ClipboardList,
  Cpu,
  RefreshCw,
} from "lucide-react";
import { Button, ErrorState, LoadingState } from "../ui";
import AIConfigTable from "./AIConfigTable";
import AIConfigToolbar from "./AIConfigToolbar";

export default function AdminAIConfigsSection({
  activeCount,
  configs,
  disabledCount,
  environments,
  error,
  featureCount,
  filters,
  loading,
  message,
  models,
  pageInfo,
  taskTypes,
  onCreate,
  onDelete,
  onEdit,
  onFilterChange,
  onFilterReset,
  onFilterSubmit,
  onLoadPage,
  onPageSizeChange,
  onToggleStatus,
  onView,
}) {
  return (
    <section className="admin-panel ai-config-admin-panel">
      <div className="panel-title-row ai-config-section-heading">
        <div>
          <p className="eyebrow">Nền tảng AI</p>
          <h2>Quản lý cấu hình AI</h2>
          <p className="muted-text">Quản lý prompt, model và hành vi AI trong hệ thống MediMate AI.</p>
        </div>
        <button className="btn btn-ghost btn-small" type="button" onClick={() => onLoadPage()}>
          <RefreshCw size={15} /> Đồng bộ cấu hình
        </button>
      </div>

      <section className="ai-config-kpi-grid">
        <article>
          <span><BrainCircuit size={16} /></span>
          <div>
            <small>Tổng cấu hình</small>
            <strong>{pageInfo.totalCount}</strong>
          </div>
        </article>
        <article>
          <span><Cpu size={16} /></span>
          <div>
            <small>Đang bật trên trang</small>
            <strong>{activeCount}</strong>
          </div>
        </article>
        <article>
          <span><Activity size={16} /></span>
          <div>
            <small>Đang tắt trên trang</small>
            <strong>{disabledCount}</strong>
          </div>
        </article>
        <article>
          <span><ClipboardList size={16} /></span>
          <div>
            <small>Tính năng trên trang</small>
            <strong>{featureCount}</strong>
          </div>
        </article>
      </section>

      {message && <div className={`api-message ${message.type}`}>{message.text}</div>}

      <AIConfigToolbar
        filters={filters}
        taskTypes={taskTypes}
        models={models}
        environments={environments}
        pageSize={pageInfo.pageSize}
        onChange={onFilterChange}
        onPageSizeChange={onPageSizeChange}
        onSubmit={onFilterSubmit}
        onReset={onFilterReset}
        onCreate={onCreate}
      />

      {loading ? (
        <LoadingState
          className="ai-config-empty-state"
          label="Đang tải danh sách cấu hình AI..."
          description="Các cấu hình mô hình và prompt đang được đồng bộ."
        />
      ) : error ? (
        <ErrorState
          className="ai-config-empty-state"
          title="Không thể tải danh sách cấu hình AI"
          description={error}
          action={(
            <Button onClick={() => onLoadPage()}>
              <RefreshCw size={15} aria-hidden="true" /> Thử tải lại
            </Button>
          )}
        />
      ) : (
        <AIConfigTable
          configs={configs}
          onView={onView}
          onEdit={onEdit}
          onToggleStatus={onToggleStatus}
          onDelete={onDelete}
          onCreate={onCreate}
        />
      )}

      {!error && (
        <div className="pagination-row">
          <button className="btn btn-ghost btn-small" type="button" disabled={pageInfo.pageNumber <= 1 || loading} onClick={() => onLoadPage(pageInfo.pageNumber - 1)}>
            Trước
          </button>
          <span>Trang {pageInfo.pageNumber} / {pageInfo.totalPages || 1} · {configs.length} / {pageInfo.totalCount} cấu hình</span>
          <button className="btn btn-ghost btn-small" type="button" disabled={pageInfo.pageNumber >= pageInfo.totalPages || loading} onClick={() => onLoadPage(pageInfo.pageNumber + 1)}>
            Sau
          </button>
        </div>
      )}
    </section>
  );
}
