import { Filter, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
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

function Field({ label, children, help, className = "" }) {
  return (
    <label className={`clean-field ${className}`.trim()}>
      <span>{label}</span>
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

  useEffect(() => {
    if (formOpen && wasSavingRef.current && !saving && message?.type === "success") {
      setFormOpen(false);
    }
    wasSavingRef.current = saving;
  }, [formOpen, message, saving]);

  function openCreateForm() {
    onCreate();
    setFormOpen(true);
  }

  function openEditForm(profile) {
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
    <section className="admin-panel ai-config-admin-panel patient-profile-admin-panel">
      <div className="panel-title-row ai-config-section-heading">
        <div>
          <p className="eyebrow">Patient Profile</p>
          <h2>Hồ sơ bệnh nhân</h2>
          <p className="muted-text">Quản lý hồ sơ sức khỏe, chỉ số cơ bản và bệnh nền của người dùng trong hệ thống.</p>
        </div>
        <div className="facility-panel-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={onReload}>Tải lại</button>
          <button className="btn btn-primary btn-small" type="button" onClick={openCreateForm}>
            <Plus size={15} /> Tạo hồ sơ
          </button>
        </div>
      </div>

      {message && <div className={`api-message ${message.type}`}>{message.text}</div>}

      <section className="ai-config-filter-card">
        <div className="ai-config-filter-card-header">
          <div>
            <strong>Bộ lọc hồ sơ bệnh nhân</strong>
            <p>Tìm theo ID hồ sơ, ID người dùng, nhóm máu, dị ứng hoặc bệnh nền trên trang hiện tại.</p>
          </div>
        </div>

        <div className="ai-config-toolbar">
          <div className="ai-config-toolbar-row ai-config-toolbar-primary">
            <div className="ai-config-search-field">
              <Search size={16} />
              <input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Tìm ID người dùng, nhóm máu, dị ứng hoặc bệnh nền..."
              />
            </div>
          </div>

          <div className="ai-config-toolbar-row ai-config-toolbar-filters">
            <div className="ai-config-filter-grid department-filter-grid">
              <CustomSelect
                className="clean-field"
                label="Per page"
                value={pageInfo.pageSize}
                options={PAGE_SIZE_OPTIONS}
                onChange={(nextPageSize) => onPageSizeChange(Number(nextPageSize))}
              />
            </div>

            <div className="ai-config-filter-actions">
              <button className="btn btn-primary btn-small" type="button" onClick={() => onLoadPage(1)} disabled={loading}>
                <Filter size={14} /> Apply
              </button>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => onSearchChange("")} disabled={loading}>
                <RotateCcw size={14} /> Clear
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="admin-panel">
        {loading ? (
          <LoadingState label="Đang tải hồ sơ bệnh nhân..." />
        ) : error ? (
          <ErrorState
            title="Không thể tải hồ sơ bệnh nhân"
            description={error}
            action={<Button onClick={onReload}>Thử tải lại</Button>}
          />
        ) : visibleProfiles.length === 0 ? (
          <EmptyState title="Không có hồ sơ phù hợp" description="Thử đổi từ khóa tìm kiếm hoặc tạo hồ sơ mới." />
        ) : (
          <div className="admin-table-list patient-profile-list">
            {visibleProfiles.map((profile) => {
              const status = getProfileStatus(profile);
              return (
                <article className="admin-user-row patient-profile-row" key={profile.id}>
                  <div className="patient-profile-row-main">
                    <strong>{profile.userDisplayName || profile.fullName || `User ${String(profile.userId).slice(0, 8)}`}</strong>
                    <span>{profile.allergyNote || "Chưa ghi nhận dị ứng."}</span>
                    <small>{profile.id}</small>
                    <div className="admin-badge-stack">
                      <span className={`status-pill ${status.tone}`}>{status.label}</span>
                      <span className="status-pill neutral">Nhóm máu {profile.bloodType || "N/A"}</span>
                      <span className="status-pill neutral">{profile.chronicDiseases?.length ?? 0} bệnh nền</span>
                    </div>
                  </div>
                  <div className="patient-profile-metrics">
                    <span><strong>{profile.height ?? "--"}</strong><small>cm</small></span>
                    <span><strong>{profile.weight ?? "--"}</strong><small>kg</small></span>
                    <span><strong>{formatDateTime(profile.updatedAt ?? profile.createdAt)}</strong><small>Cập nhật</small></span>
                  </div>
                  <div className="record-actions">
                    <button className="btn btn-ghost btn-small" type="button" onClick={() => openEditForm(profile)}>Sửa</button>
                    <button className="btn btn-dark btn-small" type="button" onClick={() => onDelete(profile)}>Xóa</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {!error && (
        <div className="pagination-row">
          <button className="btn btn-ghost btn-small" type="button" disabled={pageInfo.pageNumber <= 1 || loading} onClick={() => onLoadPage(Math.max(1, pageInfo.pageNumber - 1))}>
            Trước
          </button>
          <span>Trang {pageInfo.pageNumber} / {pageInfo.totalPages || 1} · {visibleProfiles.length}/{pageInfo.totalCount} hồ sơ</span>
          <button className="btn btn-ghost btn-small" type="button" disabled={pageInfo.pageNumber >= pageInfo.totalPages || loading} onClick={() => onLoadPage(Math.min(pageInfo.totalPages || 1, pageInfo.pageNumber + 1))}>
            Sau
          </button>
        </div>
      )}

      {formOpen && (
        <Dialog
          backdropClassName="doctor-modal-backdrop"
          className="doctor-modal facility-form-modal patient-profile-form-modal"
          labelledBy="patient-profile-modal-title"
          onClose={closeForm}
          closeOnBackdrop={!saving}
          closeOnEscape={!saving}
        >
          <header className="doctor-modal-header">
            <div>
              <p className="eyebrow">{editingProfileId ? "Update" : "Create"}</p>
              <h2 id="patient-profile-modal-title">{editingProfileId ? "Cập nhật hồ sơ bệnh nhân" : "Tạo hồ sơ bệnh nhân"}</h2>
              <p>Quản lý thông tin sức khỏe cơ bản và bệnh nền dùng cho luồng chăm sóc cá nhân.</p>
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
                    <Field label="User ID" className="facility-form-span-2" help="GUID người dùng sở hữu hồ sơ.">
                      <input
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
                    <p>Thêm các bệnh mạn tính hoặc tình trạng sức khỏe cần theo dõi.</p>
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
                        <button className="btn btn-ghost btn-small" type="button" onClick={() => onRemoveDisease(index)} aria-label="Xóa bệnh nền">
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
