import { useMemo, useState } from "react";

const EMPTY_FORM = {
  facilityDepartmentId: "",
  fullName: "",
  specialty: "",
  academicTitle: "",
  departmentRole: "0",
  yearsOfExperience: "",
  isActive: "true",
};

const ROLE_OPTIONS = [0, 1, 2, 3, 4];

function toFormValue(doctor) {
  if (!doctor) return EMPTY_FORM;
  return {
    facilityDepartmentId: doctor.facilityDepartmentId ?? "",
    fullName: doctor.fullName ?? "",
    specialty: doctor.specialty ?? "",
    academicTitle: doctor.academicTitle ?? "",
    departmentRole: String(doctor.departmentRole ?? 0),
    yearsOfExperience: doctor.yearsOfExperience ?? "",
    isActive: String(Boolean(doctor.isActive)),
  };
}

function validate(form) {
  const errors = {};
  if (!form.facilityDepartmentId.trim()) errors.facilityDepartmentId = "Cần nhập facilityDepartmentId theo backend.";
  if (!form.fullName.trim()) errors.fullName = "Cần nhập họ tên bác sĩ.";
  if (form.yearsOfExperience !== "" && Number(form.yearsOfExperience) < 0) {
    errors.yearsOfExperience = "Số năm kinh nghiệm không được âm.";
  }
  return errors;
}

function buildDoctorPayload(form) {
  return {
    facilityDepartmentId: form.facilityDepartmentId.trim(),
    fullName: form.fullName.trim(),
    specialty: form.specialty.trim() || null,
    academicTitle: form.academicTitle.trim() || null,
    departmentRole: Number(form.departmentRole),
    yearsOfExperience: form.yearsOfExperience === "" ? null : Number(form.yearsOfExperience),
    isActive: form.isActive === "true",
  };
}

export default function DoctorFormModal({ mode, doctor, facilityDepartmentOptions, saving, onClose, onSubmit }) {
  const [form, setForm] = useState(() => toFormValue(doctor));
  const [errors, setErrors] = useState({});
  const title = mode === "edit" ? "Cập nhật bác sĩ" : "Thêm bác sĩ mới";

  const options = useMemo(() => {
    const current = form.facilityDepartmentId
      ? [{
          id: form.facilityDepartmentId,
          label: doctor?.facilityName && doctor?.departmentName
            ? `${doctor.facilityName} - ${doctor.departmentName}`
            : form.facilityDepartmentId,
        }]
      : [];

    const merged = [...current, ...facilityDepartmentOptions];
    return Array.from(new Map(merged.map((item) => [item.id, item])).values());
  }, [doctor, facilityDepartmentOptions, form.facilityDepartmentId]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onSubmit(buildDoctorPayload(form));
  }

  return (
    <div className="doctor-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="doctor-modal" role="dialog" aria-modal="true" aria-labelledby="doctor-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="doctor-modal-header">
          <div>
            <p className="eyebrow">Doctor Management</p>
            <h2 id="doctor-modal-title">{title}</h2>
            <p>Thông tin được gửi theo đúng CreateDoctorRequest/UpdateDoctorRequest của backend.</p>
          </div>
          <button className="doctor-modal-close" type="button" aria-label="Đóng form" onClick={onClose}>×</button>
        </header>

        <form className="clean-form doctor-form" onSubmit={handleSubmit}>
          <label className={`clean-field ${errors.facilityDepartmentId ? "doctor-field-error" : ""}`}>
            <span>Liên kết bệnh viện - chuyên khoa</span>
            <input
              list="facility-department-options"
              value={form.facilityDepartmentId}
              onChange={(event) => update("facilityDepartmentId", event.target.value)}
              placeholder="Nhập hoặc chọn UUID facilityDepartmentId"
            />
            {options.length > 0 && (
              <datalist id="facility-department-options">
                {options.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </datalist>
            )}
            <small>{errors.facilityDepartmentId || "Backend hiện yêu cầu facilityDepartmentId để gắn bác sĩ vào bệnh viện/chuyên khoa."}</small>
          </label>

          <div className="form-two-cols">
            <label className={`clean-field ${errors.fullName ? "doctor-field-error" : ""}`}>
              <span>Họ và tên bác sĩ</span>
              <input value={form.fullName} onChange={(event) => update("fullName", event.target.value)} placeholder="Ví dụ: BS. Nguyễn Minh Anh" />
              {errors.fullName && <small>{errors.fullName}</small>}
            </label>
            <label className="clean-field">
              <span>Học hàm/học vị</span>
              <input value={form.academicTitle} onChange={(event) => update("academicTitle", event.target.value)} placeholder="ThS.BS, CKI, CKII..." />
            </label>
            <label className="clean-field">
              <span>Chuyên môn</span>
              <input value={form.specialty} onChange={(event) => update("specialty", event.target.value)} placeholder="Tim mạch, Nội tổng quát..." />
            </label>
            <label className={`clean-field ${errors.yearsOfExperience ? "doctor-field-error" : ""}`}>
              <span>Số năm kinh nghiệm</span>
              <input min="0" type="number" value={form.yearsOfExperience} onChange={(event) => update("yearsOfExperience", event.target.value)} placeholder="Ví dụ: 8" />
              {errors.yearsOfExperience && <small>{errors.yearsOfExperience}</small>}
            </label>
            <label className="clean-field">
              <span>DepartmentRole</span>
              <select value={form.departmentRole} onChange={(event) => update("departmentRole", event.target.value)}>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>Vai trò {role}</option>
                ))}
              </select>
            </label>
            <label className="clean-field">
              <span>Trạng thái</span>
              <select value={form.isActive} onChange={(event) => update("isActive", event.target.value)}>
                <option value="true">Đang hoạt động</option>
                <option value="false">Tạm ẩn</option>
              </select>
            </label>
          </div>

          <div className="doctor-modal-actions">
            <button className="btn btn-ghost" type="button" onClick={onClose}>Hủy</button>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Đang lưu..." : mode === "edit" ? "Lưu cập nhật" : "Thêm bác sĩ"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
