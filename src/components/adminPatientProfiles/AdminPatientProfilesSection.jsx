import {
  Activity,
  AlertTriangle,
  Droplets,
  Filter,
  HeartPulse,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Ruler,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Weight,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, CustomSelect, Dialog, EmptyState, ErrorState, LoadingState, PAGE_SIZE_OPTIONS } from "../ui";

const BLOOD_TYPE_OPTIONS = [
  { value: "", label: "Chưa xác định" },
  { value: "A+", label: "A+" },
  { value: "A-", label: "A-" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B-" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB-" },
  { value: "O+", label: "O+" },
  { value: "O-", label: "O-" },
];

function Field({ label, children, help, className = "", required = false }) {
  return (
    <label className={`clean-field ${className}`.trim()}>
      <span>
        {label}
        {required && <small className="patient-profile-required-note"> (bắt buộc)</small>}
      </span>
      {children}
      {help && <small>{help}</small>}
    </label>
  );
}

function formatDateTime(value) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return date.toLocaleDateString("vi-VN");
}

function getProfileStatus(profile) {
  if (profile.isDeleted) return { label: "Đã xóa", tone: "danger" };
  if (profile.isProfileCompleted) return { label: "Hoàn tất", tone: "success" };
  return { label: "Chưa hoàn tất", tone: "warning" };
}

export default function AdminPatientProfilesSection({
  editingProfileId,
  error,
  form,
  loading,
  message,
  pageInfo,
  profiles,
  saving,
  search,
  onAddDisease,
  onCreate,
  onDelete,
  onEdit,
  onFieldChange,
  onLoadPage,
  onPageSizeChange,
  onReload,
  onRemoveDisease,
  onReset,
  onSearchChange,
  onSubmit,
  onUpdateDisease,
}) {
  const [formOpen, setFormOpen] = useState(false);
  const wasSavingRef = useRef(false);
  const firstFieldRef = useRef(null);
  const dialogTriggerRef = useRef(null);

  useEffect(() => {
    if (formOpen && wasSavingRef.current && !saving && message?.type === "success") {
      setFormOpen(false);
    }
    wasSavingRef.current = saving;
  }, [formOpen, message, saving]);

  function openCreateForm() {
    dialogTriggerRef.current = document.activeElement;
    onCreate();
    setFormOpen(true);
  }

  function openEditForm(profile) {
    dialogTriggerRef.current = document.activeElement;
    onEdit(profile);
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    onReset();
  }

  const normalizedSearch = search.trim().toLowerCase();
  const visibleProfiles = useMemo(() => {
    if (!normalizedSearch) return profiles;
    return profiles.filter((profile) => [
      profile.id,
      profile.userId,
      profile.bloodType,
      profile.allergyNote,
      ...(profile.chronicDiseases ?? []).map((disease) => disease.diseaseName),
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedSearch)));
  }, [normalizedSearch, profiles]);

  return (
    <section
      className="admin-panel ai-config-admin-panel patient-profile-admin-panel patient-profile-clinical-panel"
      aria-labelledby="admin-patient-profile-title"
    >
      <header className="patient-profile-clinical-heading">
        <div className="patient-profile-clinical-heading-copy">
          <p className="eyebrow">Dữ liệu sức khỏe</p>
          <h2 id="admin-patient-profile-title">Hồ sơ bệnh nhân trong hệ thống</h2>
          <p>Quản lý nhóm máu, chỉ số cơ thể, ghi chú dị ứng và bệnh nền đã được lưu trong hồ sơ người dùng.</p>
        </div>
        <div className="patient-profile-clinical-heading-actions">
          <div className="patient-profile-clinical-context">
            <ShieldCheck size={18} aria-hidden="true" />
            <span>Dữ liệu sức khỏe nhạy cảm · Chỉ dành cho quản trị viên</span>
          </div>
          <button className="btn btn-ghost btn-small patient-profile-reload-button" type="button" onClick={onReload}>
            <RefreshCw size={15} aria-hidden="true" /> Tải lại
          </button>
          <button className="btn btn-primary btn-small patient-profile-create-button" type="button" onClick={openCreateForm}>
            <Plus size={15} aria-hidden="true" /> Tạo hồ sơ
          </button>
        </div>
      </header>

      {message && (
        <div
          className={`api-message ${message.type}`}
          role={message.type === "error" ? "alert" : "status"}
          aria-live={message.type === "error" ? "assertive" : "polite"}
        >
          {message.text}
        </div>
      )}

      <section className="ai-config-filter-card patient-profile-filter-card" aria-labelledby="patient-profile-filter-title">
        <div className="ai-config-filter-card-header patient-profile-filter-heading">
          <span aria-hidden="true"><Filter size={18} /></span>
          <div>
            <h3 id="patient-profile-filter-title">Tìm hồ sơ trên trang hiện tại</h3>
            <p>Tìm theo ID hồ sơ, ID người dùng, nhóm máu, dị ứng hoặc bệnh nền trên trang hiện tại.</p>
          </div>
        </div>

        <form
          className="ai-config-toolbar patient-profile-filter-form"
          onSubmit={(event) => {
            event.preventDefault();
            onLoadPage(1);
          }}
        >
          <div className="ai-config-toolbar-row ai-config-toolbar-primary">
            <label className="patient-profile-search-field">
              <span>Tìm hồ sơ bệnh nhân</span>
              <span className="patient-profile-search-control">
                <Search size={17} aria-hidden="true" />
                <input
                  type="search"
                  autoComplete="off"
                  value={search}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="ID người dùng, nhóm máu, dị ứng hoặc bệnh nền"
                />
              </span>
            </label>
          </div>

          <div className="ai-config-toolbar-row ai-config-toolbar-filters">
            <div className="ai-config-filter-grid patient-profile-filter-grid">
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
                <Filter size={14} aria-hidden="true" /> Áp dụng
              </button>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => onSearchChange("")} disabled={loading}>
                <RotateCcw size={14} aria-hidden="true" /> Xóa lọc
              </button>
            </div>
          </div>
        </form>
      </section>

      {!loading && !error && (
        <div className="patient-profile-result-summary" role="status" aria-live="polite">
          <HeartPulse size={18} aria-hidden="true" />
          <p>
            <strong>{visibleProfiles.length} hồ sơ đang hiển thị</strong>
            <span>{pageInfo.totalCount} hồ sơ trong danh sách hiện tại</span>
          </p>
        </div>
      )}

      <div className="patient-profile-result-panel">
        {loading ? (
          <LoadingState
            label="Đang tải hồ sơ bệnh nhân..."
            description="Thông tin sức khỏe đang được đồng bộ từ hệ thống."
          />
        ) : error ? (
          <ErrorState
            title="Không thể tải hồ sơ bệnh nhân"
            description={error}
            action={<Button onClick={onReload}>Thử tải lại</Button>}
          />
        ) : visibleProfiles.length === 0 ? (
          <EmptyState
            title="Không có hồ sơ phù hợp"
            description={search
              ? "Hãy điều chỉnh từ khóa hoặc xóa bộ lọc để xem lại danh sách."
              : "Tạo hồ sơ đầu tiên để bắt đầu quản lý dữ liệu sức khỏe."}
            action={search
              ? <button className="btn btn-ghost btn-small" type="button" onClick={() => onSearchChange("")}>Xóa bộ lọc</button>
              : <button className="btn btn-primary btn-small" type="button" onClick={openCreateForm}>Tạo hồ sơ</button>}
          />
        ) : (
          <div className="patient-profile-card-list" role="list" aria-label="Danh sách hồ sơ bệnh nhân">
            {visibleProfiles.map((profile) => {
              const status = getProfileStatus(profile);
              const displayName = profile.userDisplayName || profile.fullName || `Người dùng ${String(profile.userId).slice(0, 8)}`;
              return (
                <article className="patient-profile-card" key={profile.id} role="listitem">
                  <div className="patient-profile-card-identity">
                    <span className="patient-profile-avatar" aria-hidden="true"><UserRound size={22} /></span>
                    <div>
                      <strong>{displayName}</strong>
                      <span>ID người dùng · {profile.userId || "Không có dữ liệu"}</span>
                      <small>ID hồ sơ · {profile.id}</small>
                    </div>
                  </div>

                  <div className="patient-profile-card-status">
                    <div className="admin-badge-stack">
                      <span className={`status-pill ${status.tone}`}>{status.label}</span>
                      <span className="status-pill neutral">{profile.chronicDiseases?.length ?? 0} bệnh nền</span>
                    </div>
                    <p>
                      <AlertTriangle size={14} aria-hidden="true" />
                      <span>{profile.allergyNote || "Chưa ghi nhận dị ứng"}</span>
                    </p>
                  </div>

                  <dl className="patient-profile-card-metrics">
                    <div>
                      <dt><Droplets size={14} aria-hidden="true" /> Nhóm máu</dt>
                      <dd>{profile.bloodType || "Chưa xác định"}</dd>
                    </div>
                    <div>
                      <dt><Ruler size={14} aria-hidden="true" /> Chiều cao</dt>
                      <dd>{profile.height != null ? `${profile.height} cm` : "Chưa cập nhật"}</dd>
                    </div>
                    <div>
                      <dt><Weight size={14} aria-hidden="true" /> Cân nặng</dt>
                      <dd>{profile.weight != null ? `${profile.weight} kg` : "Chưa cập nhật"}</dd>
                    </div>
                    <div>
                      <dt><Activity size={14} aria-hidden="true" /> Cập nhật</dt>
                      <dd>{formatDateTime(profile.updatedAt ?? profile.createdAt)}</dd>
                    </div>
                  </dl>

                  <div className="record-actions patient-profile-card-actions">
                    <button
                      className="btn btn-ghost btn-small"
                      type="button"
                      aria-label={`Sửa hồ sơ của ${displayName}`}
                      onClick={() => openEditForm(profile)}
                    >
                      <Pencil size={15} aria-hidden="true" /> Sửa
                    </button>
                    <button
                      className="btn btn-dark btn-small patient-profile-delete-button"
                      type="button"
                      aria-label={`Xóa hồ sơ của ${displayName}`}
                      onClick={() => onDelete(profile)}
                    >
                      <Trash2 size={15} aria-hidden="true" /> Xóa
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {!loading && !error && (
        <nav className="pagination-row patient-profile-pagination" aria-label="Phân trang hồ sơ bệnh nhân">
          <button className="btn btn-ghost btn-small" type="button" disabled={pageInfo.pageNumber <= 1 || loading} onClick={() => onLoadPage(Math.max(1, pageInfo.pageNumber - 1))}>
            Trước
          </button>
          <span>Trang {pageInfo.pageNumber} / {pageInfo.totalPages || 1} · {visibleProfiles.length}/{pageInfo.totalCount} hồ sơ</span>
          <button className="btn btn-ghost btn-small" type="button" disabled={pageInfo.pageNumber >= pageInfo.totalPages || loading} onClick={() => onLoadPage(Math.min(pageInfo.totalPages || 1, pageInfo.pageNumber + 1))}>
            Sau
          </button>
        </nav>
      )}

      {formOpen && (
        <Dialog
          backdropClassName="doctor-modal-backdrop"
          className="doctor-modal facility-form-modal patient-profile-form-modal"
          labelledBy="patient-profile-modal-title"
          describedBy="patient-profile-modal-description"
          onClose={closeForm}
          closeOnBackdrop={!saving}
          closeOnEscape={!saving}
          initialFocusRef={firstFieldRef}
          restoreFocusRef={dialogTriggerRef}
        >
          <header className="doctor-modal-header patient-profile-modal-header">
            <span className="patient-profile-modal-icon" aria-hidden="true"><HeartPulse size={22} /></span>
            <div>
              <p className="eyebrow">{editingProfileId ? "Cập nhật" : "Tạo mới"}</p>
              <h2 id="patient-profile-modal-title">{editingProfileId ? "Cập nhật hồ sơ bệnh nhân" : "Tạo hồ sơ bệnh nhân"}</h2>
              <p id="patient-profile-modal-description">Chỉ nhập thông tin sức khỏe đã được người dùng cung cấp và xác nhận.</p>
            </div>
            <button className="doctor-modal-close" type="button" aria-label="Đóng form" onClick={closeForm} disabled={saving}>×</button>
          </header>

          <form className="clean-form doctor-form facility-form patient-profile-form" onSubmit={onSubmit}>
            <div className="facility-form-body">
              <section className="facility-form-card">
                <div className="facility-form-card-head">
                  <h3>Thông tin cơ bản</h3>
                  <p>User ID chỉ cần nhập khi tạo hồ sơ mới.</p>
                </div>
                <div className="facility-form-grid">
                  {!editingProfileId && (
                    <Field label="ID người dùng" className="facility-form-span-2" help="GUID người dùng sở hữu hồ sơ." required>
                      <input
                        ref={firstFieldRef}
                        value={form.userId}
                        onChange={(event) => onFieldChange("userId", event.target.value)}
                        placeholder="Ví dụ: 3fa85f64-5717-4562-b3fc-2c963f66afa6"
                        required
                      />
                    </Field>
                  )}
                  <CustomSelect
                    className="clean-field"
                    label="Nhóm máu"
                    value={form.bloodType}
                    options={BLOOD_TYPE_OPTIONS}
                    onChange={(value) => onFieldChange("bloodType", value)}
                  />
                  <Field label="Chiều cao (cm)">
                    <input
                      ref={editingProfileId ? firstFieldRef : undefined}
                      type="number"
                      min="0"
                      step="0.1"
                      value={form.height}
                      onChange={(event) => onFieldChange("height", event.target.value)}
                      placeholder="Ví dụ: 170"
                    />
                  </Field>
                  <Field label="Cân nặng (kg)">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={form.weight}
                      onChange={(event) => onFieldChange("weight", event.target.value)}
                      placeholder="Ví dụ: 60"
                    />
                  </Field>
                  <Field label="Ghi chú dị ứng" className="facility-form-span-2">
                    <textarea
                      rows={4}
                      value={form.allergyNote}
                      onChange={(event) => onFieldChange("allergyNote", event.target.value)}
                      placeholder="Ví dụ: Dị ứng penicillin, hải sản..."
                    />
                  </Field>
                </div>
              </section>

              <section className="facility-form-card">
                <div className="facility-form-card-head patient-profile-disease-head">
                  <div>
                    <h3>Bệnh nền</h3>
                    <p>Chỉ thêm bệnh mạn tính hoặc tình trạng sức khỏe đã được xác nhận.</p>
                  </div>
                  <button className="btn btn-primary btn-small" type="button" onClick={onAddDisease}>
                    <Plus size={14} /> Thêm bệnh nền
                  </button>
                </div>

                <div className="patient-profile-disease-list">
                  {form.chronicDiseases.length === 0 && (
                    <p className="muted-text">Chưa có bệnh nền nào được ghi nhận.</p>
                  )}
                  {form.chronicDiseases.map((disease, index) => (
                    <article className="patient-profile-disease-card" key={disease.localId ?? disease.id ?? index}>
                      <div className="patient-profile-disease-card-head">
                        <strong>Bệnh nền #{index + 1}</strong>
                        <button className="btn btn-ghost btn-small" type="button" onClick={() => onRemoveDisease(index)} aria-label={`Xóa bệnh nền số ${index + 1}`}>
                          <Trash2 size={14} /> Xóa
                        </button>
                      </div>
                      <div className="facility-form-grid">
                        <Field label="Tên bệnh" className="facility-form-span-2">
                          <input
                            value={disease.diseaseName}
                            onChange={(event) => onUpdateDisease(index, "diseaseName", event.target.value)}
                            placeholder="Ví dụ: Tăng huyết áp"
                          />
                        </Field>
                        <Field label="Từ ngày">
                          <input
                            type="date"
                            value={disease.from ?? ""}
                            onChange={(event) => onUpdateDisease(index, "from", event.target.value)}
                          />
                        </Field>
                        <Field label="Đến ngày">
                          <input
                            type="date"
                            value={disease.to ?? ""}
                            onChange={(event) => onUpdateDisease(index, "to", event.target.value)}
                          />
                        </Field>
                        <Field label="Ghi chú" className="facility-form-span-2">
                          <textarea
                            rows={3}
                            value={disease.note ?? ""}
                            onChange={(event) => onUpdateDisease(index, "note", event.target.value)}
                            placeholder="Ghi chú điều trị, mức độ hoặc lưu ý theo dõi..."
                          />
                        </Field>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <div className="doctor-modal-actions facility-form-actions">
              <button className="btn btn-ghost" type="button" onClick={closeForm} disabled={saving}>Hủy</button>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? "Đang lưu..." : editingProfileId ? "Lưu cập nhật" : "Tạo hồ sơ"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </section>
  );
}
