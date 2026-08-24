import {
  Activity,
  BrainCircuit,
  ClipboardList,
  Cpu,
  RefreshCw,
  ShieldAlert,
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
    <section
      className="admin-panel ai-config-admin-panel ai-config-clinical-panel"
      aria-labelledby="admin-ai-config-title"
    >
      <header className="ai-config-clinical-heading">
        <div className="ai-config-clinical-heading-copy">
          <p className="eyebrow">Vận hành trí tuệ nhân tạo</p>
          <h2 id="admin-ai-config-title">Cấu hình AI trong hệ thống</h2>
          <p>Quản lý prompt hệ thống, mô hình và tham số phản hồi của các tính năng AI đang được MediMate sử dụng.</p>
        </div>
        <div className="ai-config-clinical-heading-actions">
          <span>
            <ShieldAlert size={18} aria-hidden="true" />
            Chỉ quản trị viên được thay đổi cấu hình
          </span>
          <div className="ai-config-clinical-heading-buttons">
            <button className="btn btn-primary btn-small" type="button" onClick={onCreate}>
              <BrainCircuit size={15} aria-hidden="true" /> Tạo cấu hình
            </button>
            <button className="btn btn-ghost btn-small" type="button" onClick={() => onLoadPage()}>
              <RefreshCw size={15} aria-hidden="true" /> Tải lại
            </button>
          </div>
        </div>
      </header>

      <aside className="ai-config-impact-note" aria-label="Lưu ý vận hành">
        <ShieldAlert size={19} aria-hidden="true" />
        <div>
          <strong>Thay đổi có thể ảnh hưởng phản hồi AI đang vận hành</strong>
          <p>Kiểm tra đúng tính năng, mô hình, prompt và trạng thái trước khi lưu hoặc bật cấu hình.</p>
        </div>
      </aside>

      <section className="ai-config-kpi-grid" aria-label="Tổng quan cấu hình trên trang hiện tại">
        <article>
          <span><BrainCircuit size={16} aria-hidden="true" /></span>
          <div>
            <small>Tổng cấu hình</small>
            <strong>{pageInfo.totalCount}</strong>
          </div>
        </article>
        <article>
          <span><Cpu size={16} aria-hidden="true" /></span>
          <div>
            <small>Đang bật trên trang</small>
            <strong>{activeCount}</strong>
          </div>
        </article>
        <article>
          <span><Activity size={16} aria-hidden="true" /></span>
          <div>
            <small>Đang tắt trên trang</small>
            <strong>{disabledCount}</strong>
          </div>
        </article>
        <article>
          <span><ClipboardList size={16} aria-hidden="true" /></span>
          <div>
            <small>Tính năng trên trang</small>
            <strong>{featureCount}</strong>
          </div>
        </article>
      </section>

      {message && (
        <div
          className={`api-message ${message.type}`}
          role={message.type === "error" ? "alert" : "status"}
          aria-live={message.type === "error" ? "assertive" : "polite"}
        >
          {message.text}
        </div>
      )}

      <AIConfigToolbar
        configs={configs}
        filters={filters}
        taskTypes={taskTypes}
        models={models}
        environments={environments}
        pageSize={pageInfo.pageSize}
        onChange={onFilterChange}
        onPageSizeChange={onPageSizeChange}
        onSubmit={onFilterSubmit}
        onReset={onFilterReset}
      />

      {!loading && !error && (
        <div className="ai-config-result-summary" role="status" aria-live="polite">
          <BrainCircuit size={18} aria-hidden="true" />
          <p>
            <strong>{configs.length} cấu hình đang hiển thị</strong>
            <span>{pageInfo.totalCount} cấu hình trong danh mục</span>
          </p>
        </div>
      )}

      {loading && !configs.length ? (
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

      {!loading && !error && (
        <nav className="pagination-row ai-config-pagination" aria-label="Phân trang cấu hình AI">
          <button className="btn btn-ghost btn-small" type="button" disabled={pageInfo.pageNumber <= 1 || loading} onClick={() => onLoadPage(pageInfo.pageNumber - 1)}>
            Trước
          </button>
          <span>Trang {pageInfo.pageNumber} / {pageInfo.totalPages || 1} · {configs.length} / {pageInfo.totalCount} cấu hình</span>
          <button className="btn btn-ghost btn-small" type="button" disabled={pageInfo.pageNumber >= pageInfo.totalPages || loading} onClick={() => onLoadPage(pageInfo.pageNumber + 1)}>
            Sau
          </button>
        </nav>
      )}
    </section>
  );
}
