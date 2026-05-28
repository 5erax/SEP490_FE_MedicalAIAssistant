import { Filter, RotateCcw, Search } from "lucide-react";

export default function DoctorFilters({
  filters,
  departments,
  facilities,
  pageSize,
  onChange,
  onPageSizeChange,
  onSubmit,
  onReset,
}) {
  return (
    <form className="doctor-filter-bar" onSubmit={onSubmit}>
      <div className="doctor-search-field">
        <Search size={16} />
        <input
          value={filters.search}
          onChange={(event) => onChange("search", event.target.value)}
          placeholder="Tìm theo họ tên bác sĩ..."
        />
      </div>
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
      <label className="clean-field">
        <span>Hiển thị</span>
        <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
          <option value="10">10 / trang</option>
          <option value="20">20 / trang</option>
          <option value="50">50 / trang</option>
        </select>
      </label>
      <div className="doctor-filter-actions">
        <button className="btn btn-primary btn-small" type="submit"><Filter size={14} /> Áp dụng</button>
        <button className="btn btn-ghost btn-small" type="button" onClick={onReset}><RotateCcw size={14} /> Xóa lọc</button>
      </div>
    </form>
  );
}
