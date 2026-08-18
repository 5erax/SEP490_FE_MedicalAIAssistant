import { Filter, ListFilter, Plus, RotateCcw, Search, UsersRound } from "lucide-react";
import AdminFilterDisclosure from "../admin/AdminFilterDisclosure";
import { Button, CustomSelect, PAGE_SIZE_OPTIONS } from "../ui";
import AdminSearchDatalist from "../admin/AdminSearchDatalist";

export default function DoctorFilters({
  filters,
  departments,
  facilities,
  doctors = [],
  pageSize,
  resultCount,
  totalCount,
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
  const activeFilterCount = [
    filters.search,
    filters.departmentId,
    filters.facilityId,
    filters.isActive,
  ].filter(Boolean).length;

  return (
    <AdminFilterDisclosure
      className="doctor-filter-card"
      description="Thu hẹp danh sách theo chuyên khoa, bệnh viện hoặc trạng thái hiển thị."
      headingClassName="doctor-filter-card-header"
      icon={<ListFilter size={19} />}
      primaryAction={(
        <Button className="doctor-add-button" type="button" onClick={onCreate}>
          <Plus size={16} aria-hidden="true" /> Tạo hồ sơ
        </Button>
      )}
      summary={`${activeFilterCount} bộ lọc · ${totalCount} hồ sơ`}
      title="Bộ lọc hồ sơ bác sĩ"
      titleId="doctor-filter-title"
    >
      <form className="doctor-filter-bar" onSubmit={onSubmit}>
        <label className="doctor-search-label">
          <span>Tìm bác sĩ</span>
          <span className="doctor-search-field">
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              list="doctor-search-options"
              value={filters.search}
              onChange={(event) => onChange("search", event.target.value)}
              placeholder="Nhập họ tên bác sĩ"
              aria-describedby="doctor-filter-result-summary"
            />
            <AdminSearchDatalist
              id="doctor-search-options"
              values={doctors.flatMap((doctor) => [doctor.fullName, doctor.email, doctor.licenseNumber])}
            />
          </span>
        </label>

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

        <div className="doctor-filter-footer">
          <div
            className="doctor-filter-result-summary"
            id="doctor-filter-result-summary"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <UsersRound size={17} aria-hidden="true" />
            <span>
              <strong>{resultCount}</strong> đang hiển thị
              <span aria-hidden="true"> · </span>
              <strong>{totalCount}</strong> hồ sơ phù hợp
            </span>
          </div>
          <div className="doctor-filter-actions">
            <button className="btn btn-primary btn-small" type="submit">
              <Filter size={15} aria-hidden="true" /> Áp dụng
            </button>
            <button className="btn btn-ghost btn-small" type="button" onClick={onReset}>
              <RotateCcw size={15} aria-hidden="true" /> Xóa lọc
            </button>
          </div>
        </div>
      </form>
    </AdminFilterDisclosure>
  );
}
