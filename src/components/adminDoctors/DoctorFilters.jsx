import { Filter, RotateCcw, Search, Stethoscope } from "lucide-react";
import { CustomSelect, PAGE_SIZE_OPTIONS } from "../ui";

export default function DoctorFilters({
  filters,
  departments,
  facilities,
  pageSize,
  onChange,
  onPageSizeChange,
  onSubmit,
  onReset,
  onCreate,
}) {
  const departmentOptions = [
    { value: "", label: "Tất cả chuyên khoa" },
    ...departments.map((department) => ({
      value: department.id,
      label: department.departmentName || "Chuyên khoa chưa đặt tên",
    })),
  ];
  const facilityOptions = [
    { value: "", label: "Tất cả bệnh viện" },
    ...facilities.map((facility) => ({
      value: facility.id,
      label: facility.facilityName || "Cơ sở y tế chưa đặt tên",
    })),
  ];
  const statusOptions = [
    { value: "", label: "Tất cả trạng thái" },
    { value: "true", label: "Đang hoạt động" },
    { value: "false", label: "Tạm ẩn" },
  ];

  return (
    <section className="doctor-filter-card">
      <div className="doctor-filter-card-header">
        <div>
          <strong>Bộ lọc bác sĩ</strong>
          <p>Tìm nhanh và thu hẹp danh sách theo chuyên khoa, bệnh viện hoặc trạng thái.</p>
        </div>
      </div>

      <form className="doctor-filter-bar" onSubmit={onSubmit}>
        <div className="doctor-toolbar-row doctor-toolbar-row-primary">
          <div className="doctor-search-field">
            <Search size={16} />
            <input
              value={filters.search}
              onChange={(event) => onChange("search", event.target.value)}
              placeholder="Tìm theo họ tên bác sĩ..."
            />
          </div>

          <button className="btn btn-primary btn-small doctor-add-button" type="button" onClick={onCreate}>
            <Stethoscope size={14} /> Thêm bác sĩ
          </button>
        </div>

        <div className="doctor-toolbar-row doctor-toolbar-row-filters">
          <div className="doctor-filter-grid">
            <CustomSelect
              className="clean-field"
              label="Chuyên khoa"
              value={filters.departmentId}
              options={departmentOptions}
              onChange={(nextValue) => onChange("departmentId", nextValue)}
            />
            <CustomSelect
              className="clean-field"
              label="Bệnh viện"
              value={filters.facilityId}
              options={facilityOptions}
              onChange={(nextValue) => onChange("facilityId", nextValue)}
            />
            <CustomSelect
              className="clean-field"
              label="Trạng thái"
              value={filters.isActive}
              options={statusOptions}
              onChange={(nextValue) => onChange("isActive", nextValue)}
            />
            <CustomSelect
              className="clean-field"
              label="Hiển thị"
              value={pageSize}
              options={PAGE_SIZE_OPTIONS}
              onChange={(nextPageSize) => onPageSizeChange(Number(nextPageSize))}
            />
          </div>

          <div className="doctor-filter-actions">
            <button className="btn btn-primary btn-small" type="submit"><Filter size={14} /> Áp dụng</button>
            <button className="btn btn-ghost btn-small" type="button" onClick={onReset}><RotateCcw size={14} /> Xóa lọc</button>
          </div>
        </div>
      </form>
    </section>
  );
}
