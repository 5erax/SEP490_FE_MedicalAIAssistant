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
    { value: "active", label: "Đang bật" },
    { value: "inactive", label: "Đang tắt" },
  ];
  const taskTypeOptions = [
    { value: "", label: "Tất cả tính năng" },
    ...taskTypes.map((taskType) => ({ value: taskType, label: taskType })),
  ];
  const modelOptions = [
    { value: "", label: "Tất cả mô hình" },
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
          <strong>Bộ lọc cấu hình AI</strong>
          <p>Lọc prompt, mô hình và tính năng đang vận hành trong MediMate AI.</p>
        </div>
      </div>

      <form className="ai-config-toolbar" onSubmit={onSubmit}>
        <div className="ai-config-toolbar-row ai-config-toolbar-primary">
          <label className="ai-config-search-field">
            <Search size={16} />
            <span className="sr-only">Tìm cấu hình</span>
            <input
              type="search"
              autoComplete="off"
              value={filters.search}
              onChange={(event) => onChange("search", event.target.value)}
              placeholder="Tìm cấu hình, tính năng, mô hình hoặc nội dung prompt..."
            />
          </label>
          <button className="btn btn-primary btn-small ai-config-add-button" type="button" onClick={onCreate}>
            <BrainCircuit size={15} /> Thêm cấu hình
          </button>
        </div>

        <div className="ai-config-toolbar-row ai-config-toolbar-filters">
          <div className="ai-config-filter-grid">
            <CustomSelect
              className="clean-field"
              label="Trạng thái"
              value={filters.status}
              options={statusOptions}
              onChange={(nextValue) => onChange("status", nextValue)}
            />
            <CustomSelect
              className="clean-field"
              label="Tính năng"
              value={filters.taskType}
              options={taskTypeOptions}
              onChange={(nextValue) => onChange("taskType", nextValue)}
            />
            <CustomSelect
              className="clean-field"
              label="Mô hình AI"
              value={filters.model}
              options={modelOptions}
              onChange={(nextValue) => onChange("model", nextValue)}
            />
            <CustomSelect
              className="clean-field"
              label="Môi trường"
              value={filters.environment}
              options={environmentOptions}
              onChange={(nextValue) => onChange("environment", nextValue)}
            />
            <CustomSelect
              className="clean-field"
              label="Hiển thị"
              value={pageSize}
              options={PAGE_SIZE_OPTIONS}
              onChange={(nextPageSize) => onPageSizeChange(Number(nextPageSize))}
            />
          </div>

          <div className="ai-config-filter-actions">
            <button className="btn btn-primary btn-small" type="submit"><Filter size={14} /> Áp dụng</button>
            <button className="btn btn-ghost btn-small" type="button" onClick={onReset}><RotateCcw size={14} /> Xóa lọc</button>
          </div>
        </div>
      </form>
    </section>
  );
}
