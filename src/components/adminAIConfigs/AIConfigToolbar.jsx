import { BrainCircuit, Filter, RotateCcw, Search } from "lucide-react";
import { formatEnvironment } from "./aiConfigUtils";

export default function AIConfigToolbar({
  filters,
  taskTypes,
  models,
  environments,
  pageSize,
  onChange,
  onPageSizeChange,
  onSubmit,
  onReset,
  onCreate,
}) {
  return (
    <section className="ai-config-filter-card">
      <div className="ai-config-filter-card-header">
        <div>
          <strong>AI configuration filters</strong>
          <p>Lọc prompt, model và feature đang vận hành trong hệ thống MediMate AI.</p>
        </div>
      </div>

      <form className="ai-config-toolbar" onSubmit={onSubmit}>
        <div className="ai-config-toolbar-row ai-config-toolbar-primary">
          <div className="ai-config-search-field">
            <Search size={16} />
            <input
              value={filters.search}
              onChange={(event) => onChange("search", event.target.value)}
              placeholder="Tìm config, task type, model hoặc nội dung prompt..."
            />
          </div>
          <button className="btn btn-primary btn-small ai-config-add-button" type="button" onClick={onCreate}>
            <BrainCircuit size={15} /> Add Config
          </button>
        </div>

        <div className="ai-config-toolbar-row ai-config-toolbar-filters">
          <div className="ai-config-filter-grid">
            <label className="clean-field">
              <span>Status</span>
              <select value={filters.status} onChange={(event) => onChange("status", event.target.value)}>
                <option value="">Tất cả trạng thái</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="clean-field">
              <span>Feature Type</span>
              <select value={filters.taskType} onChange={(event) => onChange("taskType", event.target.value)}>
                <option value="">Tất cả feature</option>
                {taskTypes.map((taskType) => (
                  <option key={taskType} value={taskType}>{taskType}</option>
                ))}
              </select>
            </label>
            <label className="clean-field">
              <span>AI Model</span>
              <select value={filters.model} onChange={(event) => onChange("model", event.target.value)}>
                <option value="">Tất cả model</option>
                {models.map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </label>
            <label className="clean-field">
              <span>Environment</span>
              <select value={filters.environment} onChange={(event) => onChange("environment", event.target.value)}>
                <option value="">Tất cả môi trường</option>
                {environments.map((environment) => (
                  <option key={environment} value={environment}>{formatEnvironment(environment)}</option>
                ))}
              </select>
            </label>
            <label className="clean-field">
              <span>Per page</span>
              <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
                <option value="10">10 / trang</option>
                <option value="20">20 / trang</option>
                <option value="50">50 / trang</option>
              </select>
            </label>
          </div>

          <div className="ai-config-filter-actions">
            <button className="btn btn-primary btn-small" type="submit"><Filter size={14} /> Apply</button>
            <button className="btn btn-ghost btn-small" type="button" onClick={onReset}><RotateCcw size={14} /> Clear</button>
          </div>
        </div>
      </form>
    </section>
  );
}
