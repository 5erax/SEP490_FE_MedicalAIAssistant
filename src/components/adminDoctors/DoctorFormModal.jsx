import { useMemo, useState } from "react";
import { uploadImageToCloudinary } from "../../services/cloudinaryUploadService";
import { Dialog } from "../ui";

const EMPTY_FORM = {
  facilityDepartmentId: "",
  fullName: "",
  specialty: "",
  academicTitle: "",
  imageUrl: "",
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

const GUID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

function toFormValue(doctor) {
  if (!doctor) return EMPTY_FORM;
  return {
    facilityDepartmentId: doctor.facilityDepartmentId ?? "",
    fullName: doctor.fullName ?? "",
    specialty: doctor.specialty ?? "",
    academicTitle: doctor.academicTitle ?? "",
    imageUrl: doctor.imageUrl ?? doctor.avatarUrl ?? doctor.photoUrl ?? "",
    departmentRole: String(doctor.departmentRole ?? 0),
    yearsOfExperience: doctor.yearsOfExperience ?? "",
    isActive: String(Boolean(doctor.isActive)),
  };
}

function validate(form, validFacilityDepartmentIds) {
  const errors = {};
  const facilityDepartmentId = form.facilityDepartmentId.trim();
  if (!facilityDepartmentId) {
    errors.facilityDepartmentId = "Vui lòng chọn cơ sở y tế và khoa công tác.";
  } else if (
    !GUID_PATTERN.test(facilityDepartmentId) ||
    !validFacilityDepartmentIds.has(facilityDepartmentId)
  ) {
    errors.facilityDepartmentId = "Cơ sở y tế và khoa công tác không hợp lệ. Vui lòng chọn lại từ danh sách.";
  }
  if (!form.fullName.trim()) errors.fullName = "Cần nhập họ tên bác sĩ.";
  if (form.yearsOfExperience !== "") {
    const years = Number(form.yearsOfExperience);
    if (!Number.isInteger(years) || years < 0) {
      errors.yearsOfExperience = "Số năm kinh nghiệm phải là số nguyên không âm.";
    }
  }
  const imageUrl = form.imageUrl.trim();
  if (imageUrl) {
    if (imageUrl.length > 2048) {
      errors.imageUrl = "URL ảnh bác sĩ không được vượt quá 2048 ký tự.";
    } else {
      try {
        const url = new URL(imageUrl);
        if (!["http:", "https:"].includes(url.protocol)) {
          errors.imageUrl = "URL ảnh bác sĩ phải bắt đầu bằng http hoặc https.";
        }
      } catch {
        errors.imageUrl = "URL ảnh bác sĩ không hợp lệ.";
      }
    }
  }
  return errors;
}

function buildDoctorPayload(form) {
  return {
    facilityDepartmentId: form.facilityDepartmentId.trim(),
    fullName: form.fullName.trim(),
    specialty: form.specialty.trim() || null,
    academicTitle: form.academicTitle.trim() || null,
    imageUrl: form.imageUrl.trim() || null,
    departmentRole: Number(form.departmentRole),
    yearsOfExperience: form.yearsOfExperience === "" ? null : Number(form.yearsOfExperience),
    isActive: form.isActive === "true",
  };
}

function getSafeImageUrl(value) {
  if (!value || typeof value !== "string") return "";

  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? value : "";
  } catch {
    return "";
  }
}

export default function DoctorFormModal({
  mode,
  doctor,
  facilityDepartmentOptions,
  saving,
  restoreFocusRef,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(() => toFormValue(doctor));
  const [errors, setErrors] = useState({});
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadMessage, setImageUploadMessage] = useState(null);
  const [selectedImageName, setSelectedImageName] = useState("");
  const title = mode === "edit" ? "Cập nhật bác sĩ" : "Thêm bác sĩ mới";
  const locked = saving || imageUploading;
  const currentImageUrl = getSafeImageUrl(form.imageUrl.trim());

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
    if (key === "imageUrl") setImageUploadMessage(null);
  }

  async function handleImageUpload(event) {
    const [file] = event.target.files ?? [];
    if (!file) return;

    setImageUploading(true);
    setImageUploadMessage(null);
    setSelectedImageName(file.name);
    setErrors((current) => ({ ...current, imageUrl: "" }));

    try {
      const { secureUrl } = await uploadImageToCloudinary(file);
      update("imageUrl", secureUrl);
      setImageUploadMessage({ type: "success", text: "Đã tải ảnh bác sĩ." });
    } catch (error) {
      setImageUploadMessage({ type: "error", text: error.message });
    } finally {
      setImageUploading(false);
      event.target.value = "";
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    const validFacilityDepartmentIds = new Set(options.map((option) => option.id));
    const nextErrors = validate(form, validFacilityDepartmentIds);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onSubmit(buildDoctorPayload(form));
  }

  function clearImage() {
    update("imageUrl", "");
    setSelectedImageName("");
    setImageUploadMessage(null);
  }

  return (
    <Dialog
      backdropClassName="doctor-modal-backdrop"
      className="doctor-modal facility-form-modal doctor-form-modal"
      labelledBy="doctor-modal-title"
      onClose={locked ? undefined : onClose}
      closeOnBackdrop={!locked}
      closeOnEscape={!locked}
      restoreFocusRef={restoreFocusRef}
    >
        <header className="doctor-modal-header">
          <div>
            <p className="eyebrow">Quản lý bác sĩ</p>
            <h2 id="doctor-modal-title">{title}</h2>
            <p>Điền thông tin hành chính và vị trí công tác của bác sĩ.</p>
          </div>
          <button className="doctor-modal-close" type="button" aria-label="Đóng form" onClick={onClose} disabled={locked}>×</button>
        </header>

        <form className="clean-form facility-form doctor-form" onSubmit={handleSubmit}>
          <div className="facility-form-body">
            <section className="facility-form-card" aria-labelledby="doctor-work-section">
              <div className="facility-form-card-head">
                <h3 id="doctor-work-section">Nơi công tác</h3>
                <p>Chọn cơ sở và khoa mà bác sĩ đang phụ trách.</p>
              </div>
              <label className={`clean-field ${errors.facilityDepartmentId ? "doctor-field-error" : ""}`}>
                <span>Cơ sở y tế - khoa</span>
                <select
                  value={form.facilityDepartmentId}
                  onChange={(event) => update("facilityDepartmentId", event.target.value)}
                  required
                  disabled={!options.length}
                  aria-invalid={errors.facilityDepartmentId ? "true" : undefined}
                  aria-describedby="facility-department-help"
                >
                  <option value="">
                    {options.length ? "Chọn cơ sở y tế và khoa" : "Chưa có khoa tại cơ sở y tế"}
                  </option>
                  {options.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
                <small id="facility-department-help" role={errors.facilityDepartmentId ? "alert" : undefined}>
                  {errors.facilityDepartmentId || (
                    options.length
                      ? "Chọn đúng khoa để hồ sơ bác sĩ hiển thị ở cơ sở phù hợp."
                      : "Hãy tạo cơ sở y tế và chuyên khoa trước khi thêm bác sĩ."
                  )}
                </small>
              </label>
            </section>

            <section className="facility-form-card" aria-labelledby="doctor-profile-section">
              <div className="facility-form-card-head">
                <h3 id="doctor-profile-section">Hồ sơ chuyên môn</h3>
                <p>Thông tin này giúp bệnh nhân nhận diện bác sĩ trong danh sách cơ sở y tế.</p>
              </div>
              <div className="facility-form-grid">
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
                  <span>Chuyên môn</span>
                  <input value={form.specialty} onChange={(event) => update("specialty", event.target.value)} placeholder="Ví dụ: Tim mạch can thiệp" />
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
            </section>

            <section className="facility-form-card" aria-labelledby="doctor-image-section">
              <div className="facility-form-card-head">
                <h3 id="doctor-image-section">Ảnh đại diện</h3>
                <p>Ảnh giúp hồ sơ bác sĩ rõ ràng hơn khi người dùng xem chi tiết cơ sở.</p>
              </div>
              <div className="facility-image-uploader">
                <div className={`facility-image-preview-shell ${currentImageUrl ? "has-image" : ""}`}>
                  {currentImageUrl ? (
                    <img
                      className="facility-image-preview doctor-image-preview"
                      src={currentImageUrl}
                      alt="Xem trước ảnh bác sĩ"
                    />
                  ) : (
                    <div className="facility-image-empty" aria-hidden="true">Chưa có ảnh</div>
                  )}
                </div>
                <div className="facility-image-controls">
                  <label className="clean-field">
                    <span>Ảnh bác sĩ</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={locked}
                    />
                    <small>Chọn file JPG, PNG hoặc WebP tối đa 5 MB.</small>
                  </label>
                  {selectedImageName && (
                    <p className="facility-selected-image" aria-live="polite">Đang dùng: {selectedImageName}</p>
                  )}
                  {imageUploadMessage && (
                    <p
                      className={`facility-upload-message ${imageUploadMessage.type}`}
                      role={imageUploadMessage.type === "error" ? "alert" : "status"}
                    >
                      {imageUploadMessage.text}
                    </p>
                  )}
                  <label className={`clean-field ${errors.imageUrl ? "doctor-field-error" : ""}`}>
                    <span>Đường dẫn ảnh bác sĩ</span>
                    <input
                      type="url"
                      value={form.imageUrl}
                      onChange={(event) => update("imageUrl", event.target.value)}
                      placeholder="https://..."
                      aria-invalid={errors.imageUrl ? "true" : undefined}
                      aria-describedby={errors.imageUrl ? "doctor-image-url-error" : undefined}
                    />
                    <small id={errors.imageUrl ? "doctor-image-url-error" : undefined} role={errors.imageUrl ? "alert" : undefined}>
                      {errors.imageUrl || "Bạn có thể dán link ảnh đã có hoặc để trống nếu chưa muốn hiển thị ảnh."}
                    </small>
                  </label>
                  {form.imageUrl && (
                    <div className="facility-image-action-row">
                      <button className="btn btn-ghost btn-small" type="button" onClick={clearImage}>
                        Gỡ ảnh
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          <div className="doctor-modal-actions facility-form-actions">
            <button className="btn btn-ghost" type="button" onClick={onClose} disabled={locked}>Hủy</button>
            <button className="btn btn-primary" type="submit" disabled={locked}>
              {imageUploading ? "Đang tải ảnh..." : saving ? "Đang lưu..." : mode === "edit" ? "Lưu cập nhật" : "Thêm bác sĩ"}
            </button>
          </div>
        </form>
    </Dialog>
  );
}
