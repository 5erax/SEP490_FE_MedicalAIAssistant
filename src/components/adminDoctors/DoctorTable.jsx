import { Badge, Button, DataTable, EmptyState } from "../ui";
import { Pencil, Power, Stethoscope, Trash2, UserRoundPlus } from "lucide-react";

function getInitials(name = "") {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "DR";
  return words.slice(-2).map((word) => word[0]).join("").toUpperCase();
}

function DoctorAvatar({ doctor }) {
  const imageUrl = doctor.imageUrl || doctor.avatarUrl || doctor.photoUrl || "";
  const label = doctor.fullName ? `Ảnh bác sĩ ${doctor.fullName}` : "Ảnh bác sĩ";

  return (
    <span className={`doctor-avatar ${imageUrl ? "has-image" : ""}`}>
      {imageUrl ? <img src={imageUrl} alt={label} /> : getInitials(doctor.fullName)}
    </span>
  );
}

function formatExperience(years) {
  if (years === null || years === undefined || years === "") return "Chưa cập nhật";
  return `${years} năm`;
}

const DEPARTMENT_ROLE_LABELS = {
  0: "Bác sĩ",
  1: "Phó trưởng khoa",
  2: "Trưởng khoa",
  3: "Chuyên gia đầu ngành",
  4: "Cố vấn",
};

export default function DoctorTable({ doctors, onEdit, onToggleStatus, onDelete, onCreate }) {
  const columns = [
    {
      key: "doctor",
      header: "Bác sĩ",
      render: (doctor) => (
        <div className="doctor-primary-cell">
          <DoctorAvatar doctor={doctor} />
          <div>
            <strong>{doctor.fullName || "Bác sĩ chưa đặt tên"}</strong>
            <span>{doctor.academicTitle || "Chưa cập nhật học hàm/học vị"}</span>
          </div>
        </div>
      ),
    },
    {
      key: "department",
      header: "Khoa công tác",
      render: (doctor) => (
        <div className="table-primary-cell">
          <strong>{doctor.departmentName || "Chưa cập nhật khoa"}</strong>
          <small>{doctor.departmentRoleName || DEPARTMENT_ROLE_LABELS[doctor.departmentRole] || "Chưa cập nhật vai trò"}</small>
        </div>
      ),
    },
    {
      key: "hospital",
      header: "Bệnh viện",
      render: (doctor) => (
        <div className="table-primary-cell">
          <strong>{doctor.facilityName || "Chưa có bệnh viện"}</strong>
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
          <button className="btn btn-ghost btn-small" type="button" onClick={() => onEdit(doctor)}><Pencil size={14} /> Sửa</button>
          <button className="btn btn-ghost btn-small" type="button" onClick={() => onToggleStatus(doctor)}>
            <Power size={14} />
            {doctor.isActive ? "Tạm ẩn" : "Kích hoạt"}
          </button>
          <button className="btn btn-dark btn-small" type="button" onClick={() => onDelete(doctor)}><Trash2 size={14} /> Xóa</button>
        </div>
      ),
    },
  ];

  const emptyState = (
    <EmptyState
      className="doctor-empty-state"
      icon={<Stethoscope size={24} />}
      title="Chưa có bác sĩ phù hợp"
      description="Thử đổi bộ lọc hoặc thêm bác sĩ mới để bắt đầu quản lý danh sách nhân sự y tế."
      action={(
        <Button onClick={onCreate}>
          <UserRoundPlus size={15} /> Thêm bác sĩ
        </Button>
      )}
    />
  );

  if (!doctors.length) return emptyState;

  return (
    <>
      <DataTable
        caption="Danh sách bác sĩ theo bộ lọc hiện tại"
        className="doctor-table-wrap"
        columns={columns}
        rows={doctors}
        rowHeaderKey="doctor"
        getRowKey={(doctor) => doctor.id}
      />

      <div className="doctor-card-list" aria-label="Danh sách bác sĩ theo bộ lọc hiện tại">
        {doctors.map((doctor) => (
          <article className="doctor-responsive-card" key={doctor.id}>
            <header className="doctor-responsive-card-header">
              <div className="doctor-primary-cell">
                <DoctorAvatar doctor={doctor} />
                <div>
                  <strong>{doctor.fullName || "Bác sĩ chưa đặt tên"}</strong>
                  <span>{doctor.academicTitle || "Chưa cập nhật học hàm/học vị"}</span>
                </div>
              </div>
              <Badge tone={doctor.isActive ? "success" : "warning"}>
                {doctor.isActive ? "Đang hoạt động" : "Tạm ẩn"}
              </Badge>
            </header>

            <dl className="doctor-card-details">
              <div>
                <dt>Khoa công tác</dt>
                <dd>{doctor.departmentName || "Chưa cập nhật khoa"}</dd>
              </div>
              <div>
                <dt>Vai trò</dt>
                <dd>{doctor.departmentRoleName || DEPARTMENT_ROLE_LABELS[doctor.departmentRole] || "Chưa cập nhật"}</dd>
              </div>
              <div>
                <dt>Bệnh viện</dt>
                <dd>{doctor.facilityName || "Chưa có bệnh viện"}</dd>
              </div>
              <div>
                <dt>Kinh nghiệm</dt>
                <dd>{formatExperience(doctor.yearsOfExperience)}</dd>
              </div>
            </dl>

            <div className="record-actions doctor-card-actions" aria-label={`Thao tác với ${doctor.fullName || "bác sĩ"}`}>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => onEdit(doctor)}><Pencil size={14} /> Sửa</button>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => onToggleStatus(doctor)}>
                <Power size={14} />
                {doctor.isActive ? "Tạm ẩn" : "Kích hoạt"}
              </button>
              <button className="btn btn-dark btn-small" type="button" onClick={() => onDelete(doctor)}><Trash2 size={14} /> Xóa</button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
