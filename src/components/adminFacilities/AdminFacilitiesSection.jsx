import { Filter, Plus, RefreshCw, RotateCcw, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { uploadImageToCloudinary, validateCloudinaryImage } from "../../services/cloudinaryUploadService";
import { Badge, Button, CustomSelect, Dialog, EmptyState, ErrorState, LoadingState, PAGE_SIZE_OPTIONS } from "../ui";

function ApiMessage({ message }) {
  if (!message) return null;
  return <div className={`api-message ${message.type}`}>{message.text}</div>;
}

function Field({ label, children, help, className = "" }) {
  return (
    <label className={`clean-field ${className}`.trim()}>
      <span>{label}</span>
      {children}
      {help && <small>{help}</small>}
    </label>
  );
}

function hasValidCoordinatePair(facility) {
  const latitude = Number(facility?.latitude);
  const longitude = Number(facility?.longitude);
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180;
}

function isFacilityActive(facility) {
  return facility?.isActive !== false;
}

function formatCoordinatePair(facility) {
  if (!hasValidCoordinatePair(facility)) return "Chưa có tọa độ hợp lệ";
  return `${Number(facility.latitude).toFixed(5)}, ${Number(facility.longitude).toFixed(5)}`;
}

function isSafeImageSource(value) {
  if (!value || typeof value !== "string") return false;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getSafeCurrentImageUrl(imageUrl) {
  const normalizedImageUrl = (imageUrl || "").trim();
  return isSafeImageSource(normalizedImageUrl) ? normalizedImageUrl : "";
}

export default function AdminFacilitiesSection({
  departments,
  editingFacilityId,
  facilities,
  facilityDepartments,
  filters,
  form,
  loadError,
  loading,
  message,
  pageInfo,
  saving,
  onDelete,
  onEdit,
  onApplyFilters,
  onClearFilters,
  onFilterChange,
  onFormChange,
  onLoadPage,
  onPageSizeChange,
  onReload,
  onReset,
  onSubmit,
  onToggleDepartment,
  onToggleStatus,
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadMessage, setImageUploadMessage] = useState(null);
  const [imageOriginalUrl, setImageOriginalUrl] = useState("");
  const [selectedImageName, setSelectedImageName] = useState("");
  const wasSavingRef = useRef(false);

  useEffect(() => {
    if (formOpen && wasSavingRef.current && !saving && message?.type === "success") {
      setFormOpen(false);
    }
    wasSavingRef.current = saving;
  }, [formOpen, message, saving]);

  function openCreateForm() {
    onReset();
    setImageUploadMessage(null);
    setImageOriginalUrl("");
    setSelectedImageName("");
    setFormOpen(true);
  }

  function openEditForm(facility) {
    const currentImageUrl = facility.imageUrl ?? facility.thumbnailUrl ?? facility.photoUrl ?? "";
    onEdit(facility);
    setImageUploadMessage(null);
    setImageOriginalUrl(currentImageUrl);
    setSelectedImageName("");
    setFormOpen(true);
  }

  function closeForm() {
    if (saving || imageUploading) return;
    setFormOpen(false);
    setImageUploadMessage(null);
    setSelectedImageName("");
    onReset();
  }

  async function handleImageUpload(event) {
    const [file] = event.target.files ?? [];
    if (!file) return;

    try {
      validateCloudinaryImage(file);
    } catch (error) {
      setImageUploadMessage({ type: "error", text: error.message });
      event.target.value = "";
      return;
    }

    setSelectedImageName(file.name);
    setImageUploading(true);
    setImageUploadMessage(null);

    try {
      const { secureUrl } = await uploadImageToCloudinary(file);
      onFormChange("imageUrl", secureUrl);
      setImageUploadMessage({ type: "success", text: "Đã tải ảnh lên Cloudinary." });
    } catch (error) {
      setImageUploadMessage({ type: "error", text: error.message });
    } finally {
      setImageUploading(false);
      event.target.value = "";
    }
  }

  function handleImageUrlChange(value) {
    onFormChange("imageUrl", value);
    setSelectedImageName(value && value !== imageOriginalUrl ? "URL nhập thủ công" : "");
    setImageUploadMessage(null);
  }

  function restoreOriginalImage() {
    onFormChange("imageUrl", imageOriginalUrl);
    setSelectedImageName("");
    setImageUploadMessage(null);
  }

  function clearSelectedImage() {
    onFormChange("imageUrl", "");
    setSelectedImageName("");
    setImageUploadMessage(null);
  }

  const currentImageUrl = getSafeCurrentImageUrl(form.imageUrl);
  const hasUploadError = imageUploadMessage?.type === "error";
  const imageChanged = (form.imageUrl || "") !== imageOriginalUrl;
  const statusOptions = [
    { value: "", label: "Tất cả" },
    { value: "true", label: "Đang hoạt động" },
    { value: "false", label: "Đã vô hiệu hóa" },
  ];
  const departmentOptions = [
    { value: "", label: "Tất cả chuyên khoa" },
    ...departments.map((department) => ({
      value: department.id,
      label: department.departmentName || department.name || "Chuyên khoa chưa đặt tên",
    })),
  ];

  return (
    <section className="admin-panel ai-config-admin-panel facility-admin-panel">
      <div className="panel-title-row ai-config-section-heading">
        <div>
          <p className="eyebrow">Cơ sở y tế</p>
          <h2>Danh sách cơ sở</h2>
          <p className="muted-text">Quản lý bệnh viện, phòng khám và chuyên khoa liên kết dùng cho điều phối bác sĩ.</p>
        </div>
        <div className="facility-panel-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={onReload}>Tải lại</button>
          <button className="btn btn-primary btn-small" type="button" onClick={openCreateForm}>
            <Plus size={15} /> Tạo cơ sở
          </button>
        </div>
      </div>
      <ApiMessage message={message} />

      <section className="ai-config-filter-card">
        <div className="ai-config-filter-card-header">
          <div>
            <strong>Medical facility filters</strong>
            <p>Lọc theo tên cơ sở, địa chỉ và trạng thái đang được backend hỗ trợ.</p>
          </div>
        </div>

        <form className="ai-config-toolbar" onSubmit={onApplyFilters}>
          <div className="ai-config-toolbar-row ai-config-toolbar-primary">
            <div className="ai-config-search-field">
              <Search size={16} />
              <input
                value={filters.search}
                onChange={(event) => onFilterChange("search", event.target.value)}
                placeholder="Tìm tên bệnh viện, địa chỉ hoặc chuyên khoa..."
              />
            </div>
          </div>

          <div className="ai-config-toolbar-row ai-config-toolbar-filters">
            <div className="ai-config-filter-grid facility-filter-grid">
              <CustomSelect
                className="clean-field"
                label="Trạng thái"
                value={filters.isActive}
                options={statusOptions}
                onChange={(nextValue) => onFilterChange("isActive", nextValue)}
              />
              <CustomSelect
                className="clean-field"
                label="Chuyên khoa"
                value={filters.departmentId}
                options={departmentOptions}
                onChange={(nextValue) => onFilterChange("departmentId", nextValue)}
              />
              <CustomSelect
                className="clean-field"
                label="Per page"
                value={pageInfo.pageSize}
                options={PAGE_SIZE_OPTIONS}
                onChange={(nextPageSize) => onPageSizeChange(Number(nextPageSize))}
              />
            </div>

            <div className="ai-config-filter-actions">
              <button className="btn btn-primary btn-small" type="submit" disabled={loading}>
                <Filter size={14} /> Apply
              </button>
              <button className="btn btn-ghost btn-small" type="button" onClick={onClearFilters} disabled={loading}>
                <RotateCcw size={14} /> Clear
              </button>
            </div>
          </div>
        </form>
      </section>

      <div className="admin-panel">
        {loading ? (
          <LoadingState
            label="Đang tải danh sách cơ sở y tế..."
            description="Dữ liệu cơ sở và liên kết chuyên khoa đang được đồng bộ."
          />
        ) : loadError ? (
          <ErrorState
            title="Không thể tải danh sách cơ sở y tế"
            description={loadError}
            action={(
              <Button onClick={onReload}>
                <RefreshCw size={16} aria-hidden="true" /> Thử tải lại
              </Button>
            )}
          />
        ) : (
          <div className="admin-table-list">
            {facilities.length === 0 && (
              <EmptyState
                title="Chưa có cơ sở y tế"
                description="Tạo cơ sở và gán chuyên khoa trước khi thêm bác sĩ."
              />
            )}
            {facilities.map((facility) => {
              const linkedDepartments = facilityDepartments
                .filter((item) => item.facilityId === facility.id)
                .map((item) => item.departmentName)
                .filter(Boolean);
              return (
                <article className="admin-user-row facility-admin-row" key={facility.id}>
                  <div className="facility-admin-info">
                    <strong>{facility.facilityName || "Chưa đặt tên"}</strong>
                    <span>{facility.address || "Chưa có địa chỉ."}</span>
                    <small>{formatCoordinatePair(facility)}</small>
                    <small>
                      {linkedDepartments.length
                        ? `Chuyên khoa: ${linkedDepartments.join(", ")}`
                        : "Chưa liên kết chuyên khoa."}
                    </small>
                  </div>
                  <div className="record-actions">
                    <Badge tone={isFacilityActive(facility) ? "success" : "warning"}>
                      {isFacilityActive(facility) ? "Đang hoạt động" : "Đang tắt"}
                    </Badge>
                    <Badge tone={hasValidCoordinatePair(facility) ? "success" : "warning"}>
                      {hasValidCoordinatePair(facility) ? "Đủ dữ liệu bản đồ" : "Thiếu tọa độ"}
                    </Badge>
                    <button className="btn btn-ghost btn-small" type="button" onClick={() => openEditForm(facility)}>Sửa</button>
                    <button className="btn btn-ghost btn-small" type="button" onClick={() => onToggleStatus(facility)}>
                      {isFacilityActive(facility) ? "Tắt" : "Bật"}
                    </button>
                    <button className="btn btn-dark btn-small" type="button" onClick={() => onDelete(facility)}>Xóa</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
      {!loading && !loadError && (
        <div className="pagination-row">
          <button
            className="btn btn-ghost btn-small"
            type="button"
            disabled={pageInfo.pageNumber <= 1 || loading}
            onClick={() => onLoadPage(Math.max(1, pageInfo.pageNumber - 1))}
          >
            Trước
          </button>
          <span>Trang {pageInfo.pageNumber} / {pageInfo.totalPages || 1} · {facilities.length} / {pageInfo.totalCount} cơ sở y tế</span>
          <button
            className="btn btn-ghost btn-small"
            type="button"
            disabled={pageInfo.pageNumber >= pageInfo.totalPages || loading}
            onClick={() => onLoadPage(Math.min(pageInfo.totalPages || 1, pageInfo.pageNumber + 1))}
          >
            Sau
          </button>
        </div>
      )}

      {formOpen && (
        <Dialog
          backdropClassName="doctor-modal-backdrop"
          className="doctor-modal facility-form-modal"
          labelledBy="facility-modal-title"
          onClose={closeForm}
          closeOnBackdrop={!saving && !imageUploading}
          closeOnEscape={!saving && !imageUploading}
        >
          <header className="doctor-modal-header">
            <div>
              <p className="eyebrow">{editingFacilityId ? "Update" : "Create"}</p>
              <h2 id="facility-modal-title">{editingFacilityId ? "Cập nhật cơ sở y tế" : "Tạo cơ sở y tế"}</h2>
              <p>Nhập thông tin cơ sở và chọn chuyên khoa để dùng trong danh sách điều phối.</p>
            </div>
            <button className="doctor-modal-close" type="button" aria-label="Đóng form" onClick={closeForm} disabled={saving || imageUploading}>×</button>
          </header>

          <form className="clean-form doctor-form facility-form" onSubmit={onSubmit}>
            <div className="facility-form-body">
              <section className="facility-form-card" aria-labelledby="facility-basic-section">
                <div className="facility-form-card-head">
                  <h3 id="facility-basic-section">Thông tin cơ bản</h3>
                  <p>Tên, loại hình và trạng thái xuất hiện của cơ sở trong hệ thống.</p>
                </div>
                <div className="facility-form-grid">
                  <Field label="Tên cơ sở y tế" className="facility-form-span-2">
                    <input
                      value={form.facilityName}
                      onChange={(event) => onFormChange("facilityName", event.target.value)}
                      placeholder="Ví dụ: Bệnh viện Đa khoa A"
                      autoComplete="organization"
                      required
                    />
                  </Field>
                  <Field label="Loại cơ sở" help="Ví dụ: Bệnh viện, phòng khám chuyên khoa, trung tâm y tế.">
                    <input
                      value={form.facilityType}
                      onChange={(event) => onFormChange("facilityType", event.target.value)}
                      placeholder="Bệnh viện"
                    />
                  </Field>
                  <label className="clean-checkbox facility-status-checkbox">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(event) => onFormChange("isActive", event.target.checked)}
                    />
                    <span>Hiển thị cơ sở này trong danh sách active sau khi backend lưu trạng thái.</span>
                  </label>
                </div>
              </section>

              <section className="facility-form-card" aria-labelledby="facility-contact-section">
                <div className="facility-form-card-head">
                  <h3 id="facility-contact-section">Liên hệ và vận hành</h3>
                  <p>Thông tin giúp bệnh nhân kiểm tra địa chỉ, website và giờ mở cửa trước khi đến khám.</p>
                </div>
                <div className="facility-form-grid">
                  <Field label="Địa chỉ" className="facility-form-span-2" help="Nên nhập địa chỉ đầy đủ để hiển thị tốt trên bản đồ và danh sách đề xuất.">
                    <input
                      value={form.address}
                      onChange={(event) => onFormChange("address", event.target.value)}
                      autoComplete="street-address"
                      required
                    />
                  </Field>
                  <Field label="Số điện thoại" help="Dùng số tổng đài hoặc số đặt lịch chính thức nếu có.">
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(event) => onFormChange("phone", event.target.value)}
                      autoComplete="tel"
                      placeholder="028 0000 0000"
                    />
                  </Field>
                  <Field label="Website" help="Nhập URL công khai của cơ sở, bắt đầu bằng https:// nếu có.">
                    <input
                      type="url"
                      value={form.website}
                      onChange={(event) => onFormChange("website", event.target.value)}
                      placeholder="https://..."
                    />
                  </Field>
                  <Field label="Giờ mở cửa" className="facility-form-span-2" help="Ví dụ: Thứ 2 - Thứ 6, 07:00 - 17:00.">
                    <input
                      value={form.openingHours}
                      onChange={(event) => onFormChange("openingHours", event.target.value)}
                      placeholder="07:00 - 17:00"
                    />
                  </Field>
                </div>
              </section>

              <section className="facility-form-card" aria-labelledby="facility-location-section">
                <div className="facility-form-card-head">
                  <h3 id="facility-location-section">Tọa độ bản đồ</h3>
                  <p>Tọa độ hợp lệ giúp cơ sở xuất hiện đúng vị trí và bật được chức năng chỉ đường.</p>
                </div>
                <div className="facility-form-grid">
                  <Field label="Vĩ độ" help="Giá trị từ -90 đến 90. Ví dụ: 10.8491.">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.latitude}
                      onChange={(event) => onFormChange("latitude", event.target.value)}
                      placeholder="10.8491"
                    />
                  </Field>
                  <Field label="Kinh độ" help="Giá trị từ -180 đến 180. Ví dụ: 106.7715.">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.longitude}
                      onChange={(event) => onFormChange("longitude", event.target.value)}
                      placeholder="106.7715"
                    />
                  </Field>
                </div>
              </section>

              <section className="facility-form-card" aria-labelledby="facility-image-section">
                <div className="facility-form-card-head">
                  <h3 id="facility-image-section">Hình ảnh hiển thị</h3>
                  <p>Ảnh được tải lên Cloudinary, backend chỉ nhận URL ảnh trong trường imageUrl.</p>
                </div>
                <div className="facility-image-uploader">
                  <div className={`facility-image-preview-shell ${currentImageUrl ? "has-image" : ""}`}>
                    {currentImageUrl ? (
                      <img
                        className="facility-image-preview"
                        src={currentImageUrl}
                        alt={`Ảnh xem trước của ${form.facilityName || "cơ sở y tế"}`}
                      />
                    ) : (
                      <div className="facility-image-empty" aria-hidden="true">Chưa có ảnh</div>
                    )}
                  </div>
                  <div className="facility-image-controls">
                    <Field label="Ảnh cơ sở y tế" help="Chọn file JPG, PNG hoặc WebP tối đa 5 MB. Ảnh sẽ upload lên Cloudinary ngay sau khi chọn.">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={saving || imageUploading}
                      />
                    </Field>
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
                    <Field label="Cloudinary image URL" help="Có thể giữ URL hiện tại, thay bằng ảnh mới hoặc xóa để gửi imageUrl rỗng.">
                      <input
                        type="url"
                        value={form.imageUrl}
                        onChange={(event) => handleImageUrlChange(event.target.value)}
                        placeholder="https://res.cloudinary.com/..."
                        aria-invalid={hasUploadError ? "true" : undefined}
                      />
                    </Field>
                    <div className="facility-image-action-row">
                      {imageOriginalUrl && imageChanged && (
                        <button className="btn btn-ghost btn-small" type="button" onClick={restoreOriginalImage}>
                          Giữ ảnh hiện tại
                        </button>
                      )}
                      {(currentImageUrl || hasUploadError) && (
                        <button className="btn btn-ghost btn-small" type="button" onClick={clearSelectedImage}>
                          Gỡ ảnh
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section className="facility-form-card" aria-labelledby="facility-department-section">
                <fieldset className="facility-department-picker">
                  <legend id="facility-department-section">Chuyên khoa tại cơ sở</legend>
                  <p>Chọn ít nhất một chuyên khoa. Đây là dữ liệu form thêm bác sĩ sử dụng.</p>
                  {departments.length === 0 ? (
                    <p className="muted-text">Hãy tạo chuyên khoa trước.</p>
                  ) : (
                    <div className="facility-department-options">
                      {departments.map((department) => (
                        <label key={department.id}>
                          <input
                            type="checkbox"
                            checked={form.departmentIds.includes(department.id)}
                            onChange={() => onToggleDepartment(department.id)}
                          />
                          <span>{department.departmentName}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </fieldset>
              </section>
            </div>

            <div className="doctor-modal-actions facility-form-actions">
              <button className="btn btn-ghost" type="button" onClick={closeForm}>Hủy</button>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={saving || imageUploading || hasUploadError || departments.length === 0}
              >
                {imageUploading ? "Đang tải ảnh..." : hasUploadError ? "Xử lý lỗi upload trước" : saving ? "Đang lưu..." : editingFacilityId ? "Lưu cập nhật" : "Tạo cơ sở"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </section>
  );
}
