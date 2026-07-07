import { BrainCircuit, Filter, RotateCcw, Search } from "lucide-react";
import { CustomSelect, PAGE_SIZE_OPTIONS } from "../ui";
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
  const statusOptions = [
    { value: "", label: "Tất cả trạng thái" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];
  const taskTypeOptions = [
    { value: "", label: "Tất cả feature" },
    ...taskTypes.map((taskType) => ({ value: taskType, label: taskType })),
  ];
  const modelOptions = [
    { value: "", label: "Tất cả model" },
    ...models.map((model) => ({ value: model, label: model })),
  ];
  const environmentOptions = [
    { value: "", label: "Tất cả môi trường" },
    ...environments.map((environment) => ({ value: environment, label: formatEnvironment(environment) })),
  ];

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
            <CustomSelect
              className="clean-field"
              label="Status"
              value={filters.status}
              options={statusOptions}
              onChange={(nextValue) => onChange("status", nextValue)}
            />
            <CustomSelect
              className="clean-field"
              label="Feature Type"
              value={filters.taskType}
              options={taskTypeOptions}
              onChange={(nextValue) => onChange("taskType", nextValue)}
            />
            <CustomSelect
              className="clean-field"
              label="AI Model"
              value={filters.model}
              options={modelOptions}
              onChange={(nextValue) => onChange("model", nextValue)}
            />
            <CustomSelect
              className="clean-field"
              label="Environment"
              value={filters.environment}
              options={environmentOptions}
              onChange={(nextValue) => onChange("environment", nextValue)}
            />
            <CustomSelect
              className="clean-field"
              label="Per page"
              value={pageSize}
              options={PAGE_SIZE_OPTIONS}
              onChange={(nextPageSize) => onPageSizeChange(Number(nextPageSize))}
            />
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
