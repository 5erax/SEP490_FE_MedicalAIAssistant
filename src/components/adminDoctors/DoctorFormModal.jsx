import { useMemo, useState } from "react";

const EMPTY_FORM = {
  facilityDepartmentId: "",
  fullName: "",
  academicTitle: "",
  departmentRole: "0",
  yearsOfExperience: "",
  isActive: "true",
};

const ROLE_OPTIONS = [
  { value: 0, label: "Bác sĩ" },
  { value: 1, label: "Phó trưởng khoa" },
  { value: 2, label: "Trưởng khoa" },
  { value: 3, label: "Chuyên gia đầu ngành" },
  { value: 4, label: "Cố vấn" },
];

function toFormValue(doctor) {
  if (!doctor) return EMPTY_FORM;
  return {
    facilityDepartmentId: doctor.facilityDepartmentId ?? "",
    fullName: doctor.fullName ?? "",
    academicTitle: doctor.academicTitle ?? "",
    departmentRole: String(doctor.departmentRole ?? 0),
    yearsOfExperience: doctor.yearsOfExperience ?? "",
    isActive: String(Boolean(doctor.isActive)),
  };
}

function validate(form) {
  const errors = {};
  if (!form.facilityDepartmentId.trim()) errors.facilityDepartmentId = "Vui lòng chọn cơ sở y tế và khoa công tác.";
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
            <p className="eyebrow">Quản lý bác sĩ</p>
            <h2 id="doctor-modal-title">{title}</h2>
            <p>Điền thông tin hành chính và vị trí công tác của bác sĩ.</p>
          </div>
          <button className="doctor-modal-close" type="button" aria-label="Đóng form" onClick={onClose}>×</button>
        </header>

        <form className="clean-form doctor-form" onSubmit={handleSubmit}>
          <label className={`clean-field ${errors.facilityDepartmentId ? "doctor-field-error" : ""}`}>
            <span>Cơ sở y tế - khoa</span>
            <input
              list="facility-department-options"
              value={form.facilityDepartmentId}
              onChange={(event) => update("facilityDepartmentId", event.target.value)}
              placeholder="Chọn cơ sở y tế và khoa"
              required
              aria-invalid={errors.facilityDepartmentId ? "true" : undefined}
              aria-describedby="facility-department-help"
            />
            {options.length > 0 && (
              <datalist id="facility-department-options">
                {options.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </datalist>
            )}
            <small id="facility-department-help" role={errors.facilityDepartmentId ? "alert" : undefined}>
              {errors.facilityDepartmentId || "Chọn khoa mà bác sĩ đang công tác tại cơ sở y tế."}
            </small>
          </label>

          <div className="form-two-cols">
            <label className={`clean-field ${errors.fullName ? "doctor-field-error" : ""}`}>
              <span>Họ và tên bác sĩ</span>
              <input
                value={form.fullName}
                onChange={(event) => update("fullName", event.target.value)}
                placeholder="Ví dụ: BS. Nguyễn Minh Anh"
                autoComplete="name"
                required
                aria-invalid={errors.fullName ? "true" : undefined}
                aria-describedby={errors.fullName ? "doctor-full-name-error" : undefined}
              />
              {errors.fullName && <small id="doctor-full-name-error" role="alert">{errors.fullName}</small>}
            </label>
            <label className="clean-field">
              <span>Học hàm/học vị</span>
              <input value={form.academicTitle} onChange={(event) => update("academicTitle", event.target.value)} placeholder="ThS.BS, CKI, CKII..." />
            </label>
            <label className={`clean-field ${errors.yearsOfExperience ? "doctor-field-error" : ""}`}>
              <span>Số năm kinh nghiệm</span>
              <input
                min="0"
                step="1"
                type="number"
                value={form.yearsOfExperience}
                onChange={(event) => update("yearsOfExperience", event.target.value)}
                placeholder="Ví dụ: 8"
                aria-invalid={errors.yearsOfExperience ? "true" : undefined}
                aria-describedby={errors.yearsOfExperience ? "doctor-experience-error" : undefined}
              />
              {errors.yearsOfExperience && <small id="doctor-experience-error" role="alert">{errors.yearsOfExperience}</small>}
            </label>
            <label className="clean-field">
              <span>Vai trò trong khoa</span>
              <select value={form.departmentRole} onChange={(event) => update("departmentRole", event.target.value)}>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value}>{role.label}</option>
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
