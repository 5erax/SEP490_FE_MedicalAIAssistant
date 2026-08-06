import { Building2, Check, ImageIcon, UserRound } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { uploadImageToCloudinary } from "../../services/cloudinaryUploadService";
import { focusFirstInvalidField, getAdminFieldProps } from "../admin/adminFormUtils";
import { Dialog } from "../ui";

const DOCTOR_FORM_VALIDATION_STYLES = `
  .doctor-form-modal .doctor-form-error-summary {
    position: relative;
    z-index: 1;
    box-sizing: border-box;
    width: 100%;
    flex: 0 0 auto;
    margin: 0;
    border: 1px solid rgba(185, 48, 54, 0.28);
    border-left: 4px solid #a3262d;
    border-radius: 14px;
    background: #fff7f7;
    color: #7e1f25;
    padding: 14px 16px;
    box-shadow: 0 10px 28px rgba(126, 31, 37, 0.08);
    scroll-margin-top: 20px;
  }

  .doctor-form-modal .doctor-form-error-summary:focus {
    outline: none;
  }

  .doctor-form-modal .doctor-form-error-summary:focus-visible {
    outline: 3px solid var(--color-info);
    outline-offset: 3px;
  }

  .doctor-form-modal .doctor-form-error-summary strong {
    display: block;
    margin: 0;
    font-size: 14px;
    font-weight: 900;
    line-height: 1.4;
  }

  .doctor-form-modal .doctor-form-error-summary ul {
    display: grid;
    gap: 4px;
    margin: 7px 0 0;
    padding-left: 20px;
    font-size: 12px;
    font-weight: 700;
    line-height: 1.55;
  }

  .doctor-form-modal .doctor-form-error-summary li {
    margin: 0;
    padding: 0;
  }

  .doctor-form-modal .clean-field.doctor-field-error input,
  .doctor-form-modal .clean-field.doctor-field-error select,
  .doctor-form-modal .clean-field.doctor-field-error textarea {
    border-color: var(--color-danger, #a3262d);
    background: #fffafa;
    box-shadow: 0 0 0 3px rgba(163, 38, 45, 0.1);
  }

  .doctor-form-modal .doctor-field-error > small {
    color: var(--color-danger, #a3262d);
  }

  @media (max-width: 760px) {
    .doctor-form-modal .doctor-form-error-summary {
      border-radius: 12px;
      padding: 12px 14px;
    }
  }

  @media (forced-colors: active) {
    .doctor-form-modal .doctor-form-error-summary {
      border: 1px solid CanvasText;
    }

    .doctor-form-modal .clean-field.doctor-field-error input,
    .doctor-form-modal .clean-field.doctor-field-error select,
    .doctor-form-modal .clean-field.doctor-field-error textarea {
      border: 2px solid CanvasText;
    }
  }
`;

const EMPTY_FORM = {
  facilityDepartmentId: "",
  fullName: "",
  specialty: "",
  academicTitle: "",
  imageUrl: "",
  departmentRole: "doctor",
  yearsOfExperience: "",
  isActive: "true",
};

// Values must match the DepartmentRole string enum exactly.
// The API rejects a numeric departmentRole.
const ROLE_OPTIONS = [
  { value: "doctor", label: "Bác sĩ" },
  { value: "deputyHead", label: "Phó trưởng khoa" },
  { value: "head", label: "Trưởng khoa" },
  { value: "leadingExpert", label: "Chuyên gia đầu ngành" },
  { value: "consultant", label: "Cố vấn" },
];

const ROLE_VALUES = new Set(ROLE_OPTIONS.map((role) => role.value));
const GUID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

function toFormValue(doctor) {
  if (!doctor) return EMPTY_FORM;

  return {
    facilityDepartmentId: doctor.facilityDepartmentId ?? "",
    fullName: doctor.fullName ?? "",
    specialty: doctor.specialty ?? "",
    academicTitle: doctor.academicTitle ?? "",
    imageUrl: doctor.imageUrl ?? doctor.avatarUrl ?? doctor.photoUrl ?? "",
    departmentRole: doctor.departmentRole ?? "doctor",
    yearsOfExperience: doctor.yearsOfExperience ?? "",
    isActive: String(Boolean(doctor.isActive)),
  };
}

function validate(form, validFacilityDepartmentIds) {
  const errors = {};
  const facilityDepartmentId = form.facilityDepartmentId.trim();

  if (!facilityDepartmentId) {
    errors.facilityDepartmentId = "Vui lòng chọn cơ sở y tế và khoa.";
  } else if (
    !GUID_PATTERN.test(facilityDepartmentId) ||
    !validFacilityDepartmentIds.has(facilityDepartmentId)
  ) {
    errors.facilityDepartmentId =
      "Cơ sở y tế hoặc khoa đã chọn không hợp lệ hoặc không còn tồn tại.";
  }

  if (!form.fullName.trim()) {
    errors.fullName = "Vui lòng nhập họ và tên bác sĩ.";
  }

  if (form.yearsOfExperience !== "") {
    const years = Number(form.yearsOfExperience);

    if (!Number.isInteger(years) || years < 0) {
      errors.yearsOfExperience =
        "Số năm kinh nghiệm phải là số nguyên từ 0 trở lên.";
    }
  }

  const imageUrl = form.imageUrl.trim();

  if (imageUrl) {
    if (imageUrl.length > 2048) {
      errors.imageUrl =
        "Đường dẫn ảnh không hợp lệ hoặc vượt quá 2048 ký tự.";
    } else {
      try {
        const url = new URL(imageUrl);

        if (!["http:", "https:"].includes(url.protocol)) {
          errors.imageUrl = "Đường dẫn ảnh phải sử dụng HTTP hoặc HTTPS.";
        }
      } catch {
        errors.imageUrl = "Đường dẫn ảnh không hợp lệ.";
      }
    }
  }

  if (!ROLE_VALUES.has(form.departmentRole)) {
    errors.departmentRole = "Vai trò trong khoa không hợp lệ.";
  }

  return errors;
}

function normalizeDoctorErrorMessage(message) {
  const value = typeof message === "string" ? message.trim() : "";

  if (!value) {
    return "Không thể lưu hồ sơ bác sĩ. Vui lòng thử lại.";
  }

  if (
    /FacilityDepartmentId.*(required|bắt buộc)/i.test(value) ||
    /FacilityDepartment.*(required|bắt buộc)/i.test(value)
  ) {
    return "Vui lòng chọn cơ sở y tế và khoa.";
  }

  if (/FacilityDepartment/i.test(value)) {
    return "Cơ sở y tế hoặc khoa đã chọn không hợp lệ hoặc không còn tồn tại.";
  }

  if (/ImageUrl/i.test(value)) {
    return "Đường dẫn ảnh bác sĩ không hợp lệ hoặc quá dài.";
  }

  if (/DepartmentRole/i.test(value)) {
    return "Vai trò trong khoa không hợp lệ.";
  }

  return value;
}

function getDoctorFieldErrors(message) {
  if (
    message.startsWith("Vui lòng chọn cơ sở y tế") ||
    message.startsWith("Cơ sở y tế hoặc khoa") ||
    message.startsWith("FacilityDepartment")
  ) {
    return { facilityDepartmentId: message };
  }

  if (
    message.startsWith("Vui lòng nhập họ và tên") ||
    message.startsWith("Họ tên") ||
    message.startsWith("Bác sĩ cùng họ tên")
  ) {
    return { fullName: message };
  }

  if (message.startsWith("Số năm kinh nghiệm")) {
    return { yearsOfExperience: message };
  }

  if (
    message.startsWith("Đường dẫn ảnh") ||
    message.startsWith("ImageUrl")
  ) {
    return { imageUrl: message };
  }

  if (
    message.startsWith("Vai trò trong khoa") ||
    message.startsWith("DepartmentRole")
  ) {
    return { departmentRole: message };
  }

  return {};
}

function buildDoctorPayload(form) {
  return {
    facilityDepartmentId: form.facilityDepartmentId.trim(),
    fullName: form.fullName.trim(),
    specialty: form.specialty.trim() || null,
    academicTitle: form.academicTitle.trim() || null,
    imageUrl: form.imageUrl.trim() || null,
    departmentRole: form.departmentRole,
    yearsOfExperience:
      form.yearsOfExperience === ""
        ? null
        : Number(form.yearsOfExperience),
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
  facilityDepartmentOptions = [],
  saving = false,
  restoreFocusRef,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(() => toFormValue(doctor));
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadMessage, setImageUploadMessage] = useState(null);
  const [selectedImageName, setSelectedImageName] = useState("");

  const formRef = useRef(null);
  const errorSummaryRef = useRef(null);

  const title = mode === "edit" ? "Cập nhật bác sĩ" : "Thêm bác sĩ mới";
  const locked = saving || imageUploading;
  const currentImageUrl = getSafeImageUrl(form.imageUrl.trim());

  const summaryMessages = useMemo(
    () =>
      Array.from(
        new Set(
          [...Object.values(errors).filter(Boolean), submitError].filter(Boolean),
        ),
      ),
    [errors, submitError],
  );

  const hasErrors = summaryMessages.length > 0;

  const options = useMemo(() => {
    const current = doctor?.facilityDepartmentId
      ? [
          {
            id: doctor.facilityDepartmentId,
            label:
              doctor?.facilityName && doctor?.departmentName
                ? `${doctor.facilityName} - ${doctor.departmentName}`
                : doctor.facilityDepartmentId,
          },
        ]
      : [];

    const merged = [...current, ...facilityDepartmentOptions];

    return Array.from(
      new Map(merged.map((item) => [item.id, item])).values(),
    );
  }, [doctor, facilityDepartmentOptions]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setSubmitError("");

    if (key === "imageUrl") {
      setImageUploadMessage(null);
    }
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
      setImageUploadMessage({
        type: "success",
        text: "Đã tải ảnh bác sĩ.",
      });
    } catch (error) {
      setImageUploadMessage({
        type: "error",
        text: error?.message || "Không thể tải ảnh bác sĩ.",
      });
    } finally {
      setImageUploading(false);
      event.target.value = "";
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validFacilityDepartmentIds = new Set(
      options.map((option) => option.id),
    );
    const nextErrors = validate(form, validFacilityDepartmentIds);

    setErrors(nextErrors);
    setSubmitError("");

    if (Object.keys(nextErrors).length > 0) {
      focusFirstInvalidField(formRef, nextErrors);
      return;
    }

    const result = await onSubmit(buildDoctorPayload(form));

    if (result?.success === false) {
      const message = normalizeDoctorErrorMessage(result.message);
      const fieldErrors = getDoctorFieldErrors(message);

      setErrors(fieldErrors);
      setSubmitError(message);

      if (Object.keys(fieldErrors).length > 0) {
        focusFirstInvalidField(formRef, fieldErrors);
      } else {
        window.requestAnimationFrame(() => {
          errorSummaryRef.current?.focus();
        });
      }
    }
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
      <style>{DOCTOR_FORM_VALIDATION_STYLES}</style>

      <header className="doctor-modal-header">
        <div>
          <p className="eyebrow">Quản lý bác sĩ</p>
          <h2 id="doctor-modal-title">{title}</h2>
          <p>Điền thông tin hành chính và vị trí công tác của bác sĩ.</p>
        </div>

        <button
          className="doctor-modal-close"
          type="button"
          aria-label="Đóng form"
          onClick={onClose}
          disabled={locked}
        >
          ×
        </button>
      </header>

      <form
        ref={formRef}
        className="clean-form facility-form doctor-form"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="facility-form-body">
          {hasErrors && (
            <div
              ref={errorSummaryRef}
              className="doctor-form-error-summary"
              role="alert"
              tabIndex={-1}
            >
              <strong>Kiểm tra lại thông tin bác sĩ</strong>

              <ul>
                {summaryMessages.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <section
            className="facility-form-card"
            aria-labelledby="doctor-work-section"
          >
            <div className="facility-form-card-head">
              <span className="facility-form-card-icon" aria-hidden="true">
                <Building2 size={18} />
              </span>

              <div>
                <h3 id="doctor-work-section">Nơi công tác</h3>
                <p>Chọn cơ sở và khoa mà bác sĩ đang phụ trách.</p>
              </div>
            </div>

            <label
              className={`clean-field ${
                errors.facilityDepartmentId ? "doctor-field-error" : ""
              }`}
            >
              <span>Cơ sở y tế - khoa</span>

              <select
                {...getAdminFieldProps(
                  "facilityDepartmentId",
                  errors.facilityDepartmentId,
                  "facility-department-help",
                )}
                value={form.facilityDepartmentId}
                onChange={(event) =>
                  update("facilityDepartmentId", event.target.value)
                }
                required
                disabled={!options.length}
              >
                <option value="">
                  {options.length
                    ? "Chọn cơ sở y tế và khoa"
                    : "Chưa có khoa tại cơ sở y tế"}
                </option>

                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>

              <small
                id="facility-department-help"
                role={
                  errors.facilityDepartmentId ? "alert" : undefined
                }
              >
                {errors.facilityDepartmentId ||
                  (options.length
                    ? "Chọn đúng khoa để hồ sơ bác sĩ hiển thị ở cơ sở phù hợp."
                    : "Hãy tạo cơ sở y tế và chuyên khoa trước khi thêm bác sĩ.")}
              </small>
            </label>
          </section>

          <section
            className="facility-form-card"
            aria-labelledby="doctor-profile-section"
          >
            <div className="facility-form-card-head">
              <span className="facility-form-card-icon" aria-hidden="true">
                <UserRound size={18} />
              </span>

              <div>
                <h3 id="doctor-profile-section">Hồ sơ chuyên môn</h3>
                <p>
                  Thông tin này giúp bệnh nhân nhận diện bác sĩ trong danh sách
                  cơ sở y tế.
                </p>
              </div>
            </div>

            <div className="facility-form-grid">
              <label
                className={`clean-field ${
                  errors.fullName ? "doctor-field-error" : ""
                }`}
              >
                <span>Họ và tên bác sĩ</span>

                <input
                  {...getAdminFieldProps(
                    "fullName",
                    errors.fullName,
                    errors.fullName ? "doctor-full-name-error" : "",
                  )}
                  value={form.fullName}
                  onChange={(event) =>
                    update("fullName", event.target.value)
                  }
                  placeholder="Ví dụ: BS. Nguyễn Minh Anh"
                  autoComplete="name"
                  required
                />

                {errors.fullName && (
                  <small id="doctor-full-name-error" role="alert">
                    {errors.fullName}
                  </small>
                )}
              </label>

              <label className="clean-field">
                <span>Chuyên môn</span>

                <input
                  name="specialty"
                  value={form.specialty}
                  onChange={(event) =>
                    update("specialty", event.target.value)
                  }
                  placeholder="Ví dụ: Tim mạch can thiệp"
                />
              </label>

              <label className="clean-field">
                <span>Học hàm/học vị</span>

                <input
                  name="academicTitle"
                  value={form.academicTitle}
                  onChange={(event) =>
                    update("academicTitle", event.target.value)
                  }
                  placeholder="ThS.BS, CKI, CKII..."
                />
              </label>

              <label
                className={`clean-field ${
                  errors.yearsOfExperience ? "doctor-field-error" : ""
                }`}
              >
                <span>Số năm kinh nghiệm</span>

                <input
                  {...getAdminFieldProps(
                    "yearsOfExperience",
                    errors.yearsOfExperience,
                    errors.yearsOfExperience
                      ? "doctor-experience-error"
                      : "",
                  )}
                  type="text"
                  inputMode="numeric"
                  value={form.yearsOfExperience}
                  onChange={(event) =>
                    update("yearsOfExperience", event.target.value)
                  }
                  placeholder="Ví dụ: 8"
                />

                {errors.yearsOfExperience && (
                  <small id="doctor-experience-error" role="alert">
                    {errors.yearsOfExperience}
                  </small>
                )}
              </label>

              <label
                className={`clean-field ${
                  errors.departmentRole ? "doctor-field-error" : ""
                }`}
              >
                <span>Vai trò trong khoa</span>

                <select
                  {...getAdminFieldProps(
                    "departmentRole",
                    errors.departmentRole,
                    errors.departmentRole ? "doctor-role-error" : "",
                  )}
                  value={form.departmentRole}
                  onChange={(event) =>
                    update("departmentRole", event.target.value)
                  }
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>

                {errors.departmentRole && (
                  <small id="doctor-role-error" role="alert">
                    {errors.departmentRole}
                  </small>
                )}
              </label>

              <label className="clean-field">
                <span>Trạng thái</span>

                <select
                  name="isActive"
                  value={form.isActive}
                  onChange={(event) =>
                    update("isActive", event.target.value)
                  }
                >
                  <option value="true">Đang hoạt động</option>
                  <option value="false">Tạm ẩn</option>
                </select>
              </label>
            </div>
          </section>

          <section
            className="facility-form-card"
            aria-labelledby="doctor-image-section"
          >
            <div className="facility-form-card-head">
              <span className="facility-form-card-icon" aria-hidden="true">
                <ImageIcon size={18} />
              </span>

              <div>
                <h3 id="doctor-image-section">Ảnh đại diện</h3>
                <p>
                  Ảnh giúp hồ sơ bác sĩ rõ ràng hơn khi người dùng xem chi tiết
                  cơ sở.
                </p>
              </div>
            </div>

            <div className="facility-image-uploader">
              <div
                className={`facility-image-preview-shell ${
                  currentImageUrl ? "has-image" : ""
                }`}
              >
                {currentImageUrl ? (
                  <img
                    className="facility-image-preview doctor-image-preview"
                    src={currentImageUrl}
                    alt="Xem trước ảnh bác sĩ"
                    width="320"
                    height="320"
                    decoding="async"
                  />
                ) : (
                  <div className="facility-image-empty" aria-hidden="true">
                    Chưa có ảnh
                  </div>
                )}
              </div>

              <div className="facility-image-controls">
                <label className="clean-field">
                  <span>Ảnh bác sĩ</span>

                  <input
                    name="imageFile"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={locked}
                  />

                  <small>Chọn file JPG, PNG hoặc WebP tối đa 5 MB.</small>
                </label>

                {selectedImageName && (
                  <p
                    className="facility-selected-image"
                    aria-live="polite"
                  >
                    Đang dùng: {selectedImageName}
                  </p>
                )}

                {imageUploadMessage && (
                  <p
                    className={`facility-upload-message ${imageUploadMessage.type}`}
                    role={
                      imageUploadMessage.type === "error"
                        ? "alert"
                        : "status"
                    }
                  >
                    {imageUploadMessage.text}
                  </p>
                )}

                <label
                  className={`clean-field ${
                    errors.imageUrl ? "doctor-field-error" : ""
                  }`}
                >
                  <span>Đường dẫn ảnh bác sĩ</span>

                  <input
                    {...getAdminFieldProps(
                      "imageUrl",
                      errors.imageUrl,
                      errors.imageUrl ? "doctor-image-url-error" : "",
                    )}
                    type="url"
                    value={form.imageUrl}
                    onChange={(event) =>
                      update("imageUrl", event.target.value)
                    }
                    placeholder="https://..."
                  />

                  <small
                    id={
                      errors.imageUrl
                        ? "doctor-image-url-error"
                        : undefined
                    }
                    role={errors.imageUrl ? "alert" : undefined}
                  >
                    {errors.imageUrl ||
                      "Bạn có thể dán link ảnh đã có hoặc để trống nếu chưa muốn hiển thị ảnh."}
                  </small>
                </label>

                {form.imageUrl && (
                  <div className="facility-image-action-row">
                    <button
                      className="btn btn-ghost btn-small"
                      type="button"
                      onClick={clearImage}
                    >
                      Gỡ ảnh
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="doctor-modal-actions facility-form-actions">
          <button
            className="btn btn-ghost"
            type="button"
            onClick={onClose}
            disabled={locked}
          >
            Hủy
          </button>

          <button
            className="btn btn-primary"
            type="submit"
            disabled={locked}
          >
            <Check size={16} aria-hidden="true" />

            {imageUploading
              ? "Đang tải ảnh..."
              : saving
                ? "Đang lưu..."
                : mode === "edit"
                  ? "Lưu cập nhật"
                  : "Tạo hồ sơ bác sĩ"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}