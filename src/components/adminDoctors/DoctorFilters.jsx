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
            <label className="clean-field">
              <span>Chuyên khoa</span>
              <select value={filters.departmentId} onChange={(event) => onChange("departmentId", event.target.value)}>
                <option value="">Tất cả chuyên khoa</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.departmentName || "Chuyên khoa chưa đặt tên"}
                  </option>
                ))}
              </select>
            </label>
            <label className="clean-field">
              <span>Bệnh viện</span>
              <select value={filters.facilityId} onChange={(event) => onChange("facilityId", event.target.value)}>
                <option value="">Tất cả bệnh viện</option>
                {facilities.map((facility) => (
                  <option key={facility.id} value={facility.id}>
                    {facility.facilityName || "Cơ sở y tế chưa đặt tên"}
                  </option>
                ))}
              </select>
            </label>
            <label className="clean-field">
              <span>Trạng thái</span>
              <select value={filters.isActive} onChange={(event) => onChange("isActive", event.target.value)}>
                <option value="">Tất cả trạng thái</option>
                <option value="true">Đang hoạt động</option>
                <option value="false">Tạm ẩn</option>
              </select>
            </label>
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
