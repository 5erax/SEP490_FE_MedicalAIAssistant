import { BrainCircuit, Filter, RotateCcw, Search } from "lucide-react";
import AdminFilterDisclosure from "../admin/AdminFilterDisclosure";
import { CustomSelect, PAGE_SIZE_OPTIONS } from "../ui";
import { formatEnvironment } from "./aiConfigUtils";
import AdminSearchDatalist from "../admin/AdminSearchDatalist";

export default function AIConfigToolbar({
  filters,
  taskTypes,
  models,
  environments,
  configs = [],
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
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <AdminFilterDisclosure
      className="ai-config-filter-card ai-config-clinical-filter-card"
      description="Lọc prompt, mô hình và tính năng đang vận hành trong MediMate AI."
      headingClassName="ai-config-filter-card-header ai-config-clinical-filter-heading"
      icon={<Filter size={18} />}
      summary={`${activeFilterCount} bộ lọc đang dùng`}
      title="Bộ lọc cấu hình AI"
      titleId="ai-config-filter-title"
    >
      <form className="ai-config-toolbar" onSubmit={onSubmit}>
        <div className="ai-config-toolbar-row ai-config-toolbar-primary">
          <label className="ai-config-search-field">
            <span>Tìm cấu hình</span>
            <span className="ai-config-search-control">
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                autoComplete="off"
                list="ai-config-search-options"
                value={filters.search}
                onChange={(event) => onChange("search", event.target.value)}
                placeholder="Tên tính năng, mô hình hoặc nội dung prompt"
              />
              <AdminSearchDatalist
                id="ai-config-search-options"
                values={configs.flatMap((config) => [
                  config.name,
                  config.configName,
                  config.featureName,
                  config.model,
                  config.modelName,
                  config.taskType,
                ])}
              />
            </span>
          </label>
          <button className="btn btn-primary btn-small ai-config-add-button" type="button" onClick={onCreate}>
            <BrainCircuit size={15} aria-hidden="true" /> Tạo cấu hình
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
            <button className="btn btn-primary btn-small" type="submit"><Filter size={14} aria-hidden="true" /> Áp dụng</button>
            <button className="btn btn-ghost btn-small" type="button" onClick={onReset}><RotateCcw size={14} aria-hidden="true" /> Xóa lọc</button>
          </div>
        </div>
      </form>
    </AdminFilterDisclosure>
  );
}
