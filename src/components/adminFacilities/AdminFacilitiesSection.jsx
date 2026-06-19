import { RefreshCw } from "lucide-react";
import { Badge, Button, EmptyState, ErrorState, LoadingState } from "../ui";

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
  return (
    <section className="admin-grid facility-admin-grid">
      <div className="admin-panel">
        <div className="panel-title-row">
          <div>
            <p className="eyebrow">Cơ sở y tế</p>
            <h2>Danh sách cơ sở</h2>
          </div>
          <button className="btn btn-ghost btn-small" type="button" onClick={onReload}>Tải lại</button>
        </div>
        <ApiMessage message={message} />
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
                    <button className="btn btn-ghost btn-small" type="button" onClick={() => onEdit(facility)}>Sửa</button>
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

      <form className="admin-panel clean-form" onSubmit={onSubmit}>
        <div className="panel-title-row">
          <div>
            <p className="eyebrow">{editingFacilityId ? "Update" : "Create"}</p>
            <h2>{editingFacilityId ? "Cập nhật cơ sở y tế" : "Tạo cơ sở y tế"}</h2>
          </div>
          {editingFacilityId && <button className="btn btn-ghost btn-small" type="button" onClick={onReset}>Hủy sửa</button>}
        </div>
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
        <button
          className="btn btn-primary"
          type="submit"
          disabled={saving || departments.length === 0}
        >
          {saving ? "Đang lưu..." : editingFacilityId ? "Lưu cập nhật cơ sở" : "Tạo cơ sở và liên kết chuyên khoa"}
        </button>
      </form>
    </section>
  );
}
