import { Plus, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge, Button, Dialog, EmptyState, ErrorState, LoadingState } from "../ui";

function ApiMessage({ message }) {
  if (!message) return null;
  return <div className={`api-message ${message.type}`}>{message.text}</div>;
}

function Field({ label, children }) {
  return (
    <label className="clean-field">
      <span>{label}</span>
      {children}
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

export default function AdminFacilitiesSection({
  departments,
  editingFacilityId,
  facilities,
  facilityDepartments,
  form,
  loadError,
  loading,
  message,
  saving,
  onDelete,
  onEdit,
  onFormChange,
  onReload,
  onReset,
  onSubmit,
  onToggleDepartment,
  onToggleStatus,
}) {
  const [formOpen, setFormOpen] = useState(false);
  const wasSavingRef = useRef(false);

  useEffect(() => {
    if (formOpen && wasSavingRef.current && !saving && message?.type === "success") {
      setFormOpen(false);
    }
    wasSavingRef.current = saving;
  }, [formOpen, message, saving]);

  function openCreateForm() {
    onReset();
    setFormOpen(true);
  }

  function openEditForm(facility) {
    onEdit(facility);
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    onReset();
  }

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

      {formOpen && (
        <Dialog
          backdropClassName="doctor-modal-backdrop"
          className="doctor-modal facility-form-modal"
          labelledBy="facility-modal-title"
          onClose={closeForm}
          closeOnBackdrop={!saving}
          closeOnEscape={!saving}
        >
          <header className="doctor-modal-header">
            <div>
              <p className="eyebrow">{editingFacilityId ? "Update" : "Create"}</p>
              <h2 id="facility-modal-title">{editingFacilityId ? "Cập nhật cơ sở y tế" : "Tạo cơ sở y tế"}</h2>
              <p>Nhập thông tin cơ sở và chọn chuyên khoa để dùng trong danh sách điều phối.</p>
            </div>
            <button className="doctor-modal-close" type="button" aria-label="Đóng form" onClick={closeForm}>×</button>
          </header>

          <form className="clean-form doctor-form" onSubmit={onSubmit}>
            <div className="facility-form-section">
              <Field label="Tên cơ sở y tế">
                <input
                  value={form.facilityName}
                  onChange={(event) => onFormChange("facilityName", event.target.value)}
                  placeholder="Ví dụ: Bệnh viện Đa khoa A"
                  required
                />
              </Field>
              <Field label="Địa chỉ">
                <input
                  value={form.address}
                  onChange={(event) => onFormChange("address", event.target.value)}
                  required
                />
              </Field>
              <div className="clean-form-grid">
                <Field label="Vĩ độ">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="-90"
                    max="90"
                    value={form.latitude}
                    onChange={(event) => onFormChange("latitude", event.target.value)}
                    placeholder="10.8491"
                  />
                </Field>
                <Field label="Kinh độ">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="-180"
                    max="180"
                    value={form.longitude}
                    onChange={(event) => onFormChange("longitude", event.target.value)}
                    placeholder="106.7715"
                  />
                </Field>
              </div>
            </div>

            <div className="clean-form-grid">
              <Field label="Số điện thoại">
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) => onFormChange("phone", event.target.value)}
                />
              </Field>
              <Field label="Loại cơ sở">
                <input
                  value={form.facilityType}
                  onChange={(event) => onFormChange("facilityType", event.target.value)}
                  placeholder="Bệnh viện, phòng khám..."
                />
              </Field>
              <Field label="Website">
                <input
                  type="url"
                  value={form.website}
                  onChange={(event) => onFormChange("website", event.target.value)}
                  placeholder="https://..."
                />
              </Field>
              <Field label="Giờ mở cửa">
                <input
                  value={form.openingHours}
                  onChange={(event) => onFormChange("openingHours", event.target.value)}
                  placeholder="07:00 - 17:00"
                />
              </Field>
            </div>

            <label className="clean-checkbox">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => onFormChange("isActive", event.target.checked)}
              />
              <span>Cho phép cơ sở này xuất hiện trong danh sách active sau khi backend lưu trạng thái.</span>
            </label>
            <fieldset className="facility-department-picker">
              <legend>Chuyên khoa tại cơ sở</legend>
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
            <div className="doctor-modal-actions">
              <button className="btn btn-ghost" type="button" onClick={closeForm}>Hủy</button>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={saving || departments.length === 0}
              >
                {saving ? "Đang lưu..." : editingFacilityId ? "Lưu cập nhật" : "Tạo cơ sở"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </section>
  );
}
