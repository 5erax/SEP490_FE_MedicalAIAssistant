import { Badge, DataTable, EmptyState } from "../ui";

function getInitials(name = "") {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "DR";
  return words.slice(-2).map((word) => word[0]).join("").toUpperCase();
}

function formatExperience(years) {
  if (years === null || years === undefined || years === "") return "Chưa cập nhật";
  return `${years} năm`;
}

export default function DoctorTable({ doctors, onEdit, onToggleStatus, onDelete }) {
  const columns = [
    {
      key: "doctor",
      header: "Bác sĩ",
      render: (doctor) => (
        <div className="doctor-primary-cell">
          <span className="doctor-avatar">{getInitials(doctor.fullName)}</span>
          <div>
            <strong>{doctor.fullName || "Bác sĩ chưa đặt tên"}</strong>
            <span>{doctor.academicTitle || "Chưa cập nhật học hàm/học vị"}</span>
          </div>
        </div>
      ),
    },
    {
      key: "specialty",
      header: "Chuyên môn",
      render: (doctor) => (
        <div className="table-primary-cell">
          <strong>{doctor.specialty || doctor.departmentName || "Chưa cập nhật"}</strong>
          <span>{doctor.departmentName || "Chưa có chuyên khoa"}</span>
          <small>{doctor.departmentRoleName || `DepartmentRole ${doctor.departmentRole ?? 0}`}</small>
        </div>
      ),
    },
    {
      key: "hospital",
      header: "Bệnh viện",
      render: (doctor) => (
        <div className="table-primary-cell">
          <strong>{doctor.facilityName || "Chưa có bệnh viện"}</strong>
          <small>{doctor.facilityDepartmentId}</small>
        </div>
      ),
    },
    {
      key: "experience",
      header: "Kinh nghiệm",
      render: (doctor) => <span className="doctor-experience">{formatExperience(doctor.yearsOfExperience)}</span>,
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (doctor) => (
        <Badge tone={doctor.isActive ? "success" : "warning"}>
          {doctor.isActive ? "Đang hoạt động" : "Tạm ẩn"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      render: (doctor) => (
        <div className="record-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={() => onEdit(doctor)}>Sửa</button>
          <button className="btn btn-ghost btn-small" type="button" onClick={() => onToggleStatus(doctor)}>
            {doctor.isActive ? "Tạm ẩn" : "Kích hoạt"}
          </button>
          <button className="btn btn-dark btn-small" type="button" onClick={() => onDelete(doctor)}>Xóa</button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={doctors}
      getRowKey={(doctor) => doctor.id}
      emptyState={(
        <EmptyState
          title="Chưa có bác sĩ phù hợp"
          description="Thử đổi bộ lọc hoặc thêm bác sĩ mới để bắt đầu quản lý danh sách nhân sự y tế."
        />
      )}
    />
  );
}
