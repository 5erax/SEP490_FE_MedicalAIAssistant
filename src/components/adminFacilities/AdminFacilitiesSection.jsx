import { Building2, ExternalLink, Filter, MapPin, Pencil, Plus, Power, RefreshCw, RotateCcw, Search, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { uploadImageToCloudinary, validateCloudinaryImage } from "../../services/cloudinaryUploadService";
import AdminActionDisclosure from "../admin/AdminActionDisclosure";
import AdminFilterDisclosure from "../admin/AdminFilterDisclosure";
import { Badge, Button, CustomSelect, Dialog, EmptyState, ErrorState, LoadingState, PAGE_SIZE_OPTIONS } from "../ui";

function ApiMessage({ message }) {
  if (!message) return null;
  return (
    <div
      className={`api-message ${message.type}`}
      role={message.type === "error" ? "alert" : "status"}
      aria-live={message.type === "error" ? "assertive" : "polite"}
    >
      {message.text}
    </div>
  );
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
  if (
    facility?.latitude === null
    || facility?.latitude === undefined
    || facility?.latitude === ""
    || facility?.longitude === null
    || facility?.longitude === undefined
    || facility?.longitude === ""
  ) {
    return false;
  }

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
      setImageUploadMessage({ type: "success", text: "Đã tải ảnh lên." });
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
  const visibleFacilityCount = facilities.length;
  const mappedFacilityCount = facilities.filter(hasValidCoordinatePair).length;
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <section
      className="admin-panel ai-config-admin-panel facility-admin-panel facility-clinical-panel"
      aria-labelledby="admin-facilities-title"
    >
      <header className="facility-clinical-heading">
        <div className="facility-clinical-heading-copy">
          <p className="eyebrow">Cơ sở y tế</p>
          <h2 id="admin-facilities-title">Cơ sở y tế trong hệ thống</h2>
          <p>Quản lý thông tin công khai, vị trí bản đồ và các chuyên khoa đang được liên kết với từng cơ sở.</p>
        </div>
        <div className="facility-clinical-heading-actions">
          <div className="facility-clinical-context" aria-label="Thông tin danh sách hiện tại">
            <ShieldCheck size={18} aria-hidden="true" />
            <span>Dữ liệu cơ sở dùng cho bản đồ và điều phối</span>
          </div>
          <button className="btn btn-ghost btn-small facility-reload-button" type="button" onClick={onReload}>
            <RefreshCw size={15} aria-hidden="true" /> Tải lại
          </button>
          <button className="btn btn-primary btn-small facility-create-button" type="button" onClick={openCreateForm}>
            <Plus size={15} /> Tạo cơ sở
          </button>
        </div>
      </header>
      <ApiMessage message={message} />

      <AdminFilterDisclosure
        className="ai-config-filter-card facility-filter-card"
        description="Lọc theo tên cơ sở, địa chỉ, chuyên khoa và trạng thái hiển thị."
        headingClassName="ai-config-filter-card-header facility-filter-heading"
        icon={<Filter size={18} />}
        summary={`${activeFilterCount} bộ lọc · ${pageInfo.totalCount} cơ sở`}
        title="Lọc danh sách cơ sở"
        titleId="facility-filter-title"
      >
        <form className="ai-config-toolbar facility-filter-form" onSubmit={onApplyFilters}>
          <div className="ai-config-toolbar-row ai-config-toolbar-primary">
            <label className="facility-search-field">
              <span>Tìm cơ sở</span>
              <span className="facility-search-control">
                <Search size={17} aria-hidden="true" />
                <input
                  type="search"
                  autoComplete="off"
                  value={filters.search}
                  onChange={(event) => onFilterChange("search", event.target.value)}
                  placeholder="Tên bệnh viện, phòng khám hoặc địa chỉ"
                />
              </span>
            </label>
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
                label="Hiển thị"
                value={pageInfo.pageSize}
                options={PAGE_SIZE_OPTIONS}
                onChange={(nextPageSize) => onPageSizeChange(Number(nextPageSize))}
              />
            </div>

            <div className="ai-config-filter-actions">
              <button className="btn btn-primary btn-small" type="submit" disabled={loading}>
                <Filter size={14} /> Áp dụng
              </button>
              <button className="btn btn-ghost btn-small" type="button" onClick={onClearFilters} disabled={loading}>
                <RotateCcw size={14} /> Xóa lọc
              </button>
            </div>
          </div>
        </form>
      </AdminFilterDisclosure>

      {!loading && !loadError && (
        <div className="facility-result-summary" role="status" aria-live="polite">
          <Building2 size={18} aria-hidden="true" />
          <p>
            <strong>{visibleFacilityCount} cơ sở đang hiển thị</strong>
            <span>
              {pageInfo.totalCount} cơ sở phù hợp
              {visibleFacilityCount > 0 ? ` · ${mappedFacilityCount} có tọa độ bản đồ` : ""}
            </span>
          </p>
        </div>
      )}

      <div className="facility-result-panel">
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
          <div className="facility-admin-list" role="list" aria-label="Danh sách cơ sở y tế">
            {facilities.length === 0 && (
              <EmptyState
                title="Chưa có cơ sở y tế"
                description="Tạo cơ sở và gán chuyên khoa trước khi thêm bác sĩ."
              />
            )}
            {facilities.map((facility) => {
              const linkedDepartments = Array.from(new Set([
                ...facilityDepartments
                  .filter((item) => String(item.facilityId) === String(facility.id))
                  .map((item) => item.departmentName),
                ...(Array.isArray(facility.departments)
                  ? facility.departments.map((item) => item?.departmentName ?? item?.name)
                  : []),
              ].filter(Boolean)));
              return (
                <article className="facility-admin-card" key={facility.id} role="listitem">
                  <header className="facility-admin-card-header">
                    <span className="facility-admin-thumbnail" aria-hidden="true">
                      {getSafeCurrentImageUrl(facility.imageUrl ?? facility.thumbnailUrl ?? facility.photoUrl)
                        ? (
                          <img
                            src={getSafeCurrentImageUrl(facility.imageUrl ?? facility.thumbnailUrl ?? facility.photoUrl)}
                            alt=""
                            width="52"
                            height="52"
                            loading="lazy"
                            decoding="async"
                          />
                        )
                        : <Building2 size={22} />}
                    </span>
                    <div>
                      <strong>{facility.facilityName || "Chưa đặt tên"}</strong>
                      <span><MapPin size={14} aria-hidden="true" /> {facility.address || "Chưa có địa chỉ."}</span>
                    </div>
                    <div className="facility-admin-badges">
                      <Badge tone={isFacilityActive(facility) ? "success" : "warning"}>
                        {isFacilityActive(facility) ? "Đang hoạt động" : "Đang tắt"}
                      </Badge>
                      <Badge tone={hasValidCoordinatePair(facility) ? "success" : "warning"}>
                        {hasValidCoordinatePair(facility) ? "Có tọa độ bản đồ" : "Thiếu tọa độ"}
                      </Badge>
                    </div>
                  </header>

                  <dl className="facility-admin-meta">
                    <div><dt>Loại cơ sở</dt><dd>{facility.facilityType || "Chưa cập nhật"}</dd></div>
                    <div><dt>Tọa độ</dt><dd>{formatCoordinatePair(facility)}</dd></div>
                    <div className="facility-admin-departments">
                      <dt>Chuyên khoa liên kết</dt>
                      <dd>
                        {linkedDepartments.length
                          ? linkedDepartments.map((department) => <span key={department}>{department}</span>)
                          : <em>Chưa liên kết chuyên khoa</em>}
                      </dd>
                    </div>
                  </dl>

                  <footer className="facility-admin-actions">
                    <button className="btn btn-ghost btn-small" type="button" onClick={() => openEditForm(facility)}><Pencil size={15} aria-hidden="true" /> Sửa</button>
                    <AdminActionDisclosure>
                      {hasValidCoordinatePair(facility) && (
                        <a
                          className="btn btn-ghost btn-small"
                          href={`https://www.openstreetmap.org/?mlat=${facility.latitude}&mlon=${facility.longitude}#map=16/${facility.latitude}/${facility.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Xem ${facility.facilityName || "cơ sở y tế"} trên OpenStreetMap`}
                        >
                          <ExternalLink size={15} aria-hidden="true" /> Bản đồ
                        </a>
                      )}
                      <button className="btn btn-ghost btn-small" type="button" onClick={() => onToggleStatus(facility)}>
                        <Power size={15} aria-hidden="true" /> {isFacilityActive(facility) ? "Tắt" : "Bật"}
                      </button>
                      <button className="btn btn-dark btn-small facility-delete-button" type="button" onClick={() => onDelete(facility)}><Trash2 size={15} aria-hidden="true" /> Xóa</button>
                    </AdminActionDisclosure>
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </div>
      {!loading && !loadError && (
        <nav className="pagination-row facility-pagination" aria-label="Phân trang cơ sở y tế">
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
        </nav>
      )}

      {formOpen && (
        <Dialog
          backdropClassName="doctor-modal-backdrop"
          className="doctor-modal facility-form-modal facility-clinical-modal"
          labelledBy="facility-modal-title"
          onClose={closeForm}
          closeOnBackdrop={!saving && !imageUploading}
          closeOnEscape={!saving && !imageUploading}
        >
          <header className="doctor-modal-header facility-clinical-modal-header">
            <span className="facility-clinical-modal-icon" aria-hidden="true"><Building2 size={22} /></span>
            <div>
              <p className="eyebrow">{editingFacilityId ? "Cập nhật" : "Tạo mới"}</p>
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
                  <p>Tên và loại hình của cơ sở trong hệ thống.</p>
                </div>
                <div className="facility-form-grid">
                  <Field label="Tên cơ sở y tế" className="facility-form-span-2">
                    <input
                      name="facilityName"
                      value={form.facilityName}
                      onChange={(event) => onFormChange("facilityName", event.target.value)}
                      placeholder="Ví dụ: Bệnh viện Đa khoa A"
                      autoComplete="organization"
                      required
                    />
                  </Field>
                  <Field label="Loại cơ sở" help="Ví dụ: Bệnh viện, phòng khám chuyên khoa, trung tâm y tế.">
                    <input
                      name="facilityType"
                      value={form.facilityType}
                      onChange={(event) => onFormChange("facilityType", event.target.value)}
                      placeholder="Bệnh viện"
                    />
                  </Field>
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
                      name="address"
                      value={form.address}
                      onChange={(event) => onFormChange("address", event.target.value)}
                      autoComplete="street-address"
                      required
                    />
                  </Field>
                  <Field label="Số điện thoại" help="Dùng số tổng đài hoặc số đặt lịch chính thức nếu có.">
                    <input
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={(event) => onFormChange("phone", event.target.value)}
                      autoComplete="tel"
                      placeholder="028 0000 0000"
                    />
                  </Field>
                  <Field label="Website" help="Nhập URL công khai của cơ sở, bắt đầu bằng https:// nếu có.">
                    <input
                      name="website"
                      type="url"
                      value={form.website}
                      onChange={(event) => onFormChange("website", event.target.value)}
                      placeholder="https://..."
                    />
                  </Field>
                  <Field label="Giờ mở cửa" className="facility-form-span-2" help="Ví dụ: Thứ 2 - Thứ 6, 07:00 - 17:00.">
                    <input
                      name="openingHours"
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
                      name="latitude"
                      type="text"
                      inputMode="decimal"
                      value={form.latitude}
                      onChange={(event) => onFormChange("latitude", event.target.value)}
                      placeholder="10.8491"
                    />
                  </Field>
                  <Field label="Kinh độ" help="Giá trị từ -180 đến 180. Ví dụ: 106.7715.">
                    <input
                      name="longitude"
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
                  <p>Chọn ảnh đại diện rõ ràng để người dùng dễ nhận diện cơ sở y tế.</p>
                </div>
                <div className="facility-image-uploader">
                  <div className={`facility-image-preview-shell ${currentImageUrl ? "has-image" : ""}`}>
                    {currentImageUrl ? (
                      <img
                        className="facility-image-preview"
                        src={currentImageUrl}
                        alt={`Ảnh xem trước của ${form.facilityName || "cơ sở y tế"}`}
                        width="640"
                        height="360"
                        decoding="async"
                      />
                    ) : (
                      <div className="facility-image-empty" aria-hidden="true">Chưa có ảnh</div>
                    )}
                  </div>
                  <div className="facility-image-controls">
                    <Field label="Ảnh cơ sở y tế" help="Chọn file JPG, PNG hoặc WebP tối đa 5 MB. Ảnh sẽ được tải lên ngay sau khi chọn.">
                      <input
                        name="facilityImage"
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
                    <Field label="Đường dẫn ảnh" help="Bạn có thể dán link ảnh đã có hoặc để trống nếu chưa muốn hiển thị ảnh.">
                      <input
                        name="imageUrl"
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
                            name="departmentIds"
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
