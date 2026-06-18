import { RefreshCw } from "lucide-react";
import { Button, ErrorState, LoadingState } from "../ui";
import DoctorFilters from "./DoctorFilters";
import DoctorTable from "./DoctorTable";

export default function AdminDoctorsSection({
  departments,
  doctors,
  error,
  facilities,
  facilitiesLoading,
  filters,
  invitation,
  invitationMessage,
  lastInvitation,
  loading,
  pageInfo,
  savingInvitation,
  onCreate,
  onDelete,
  onEdit,
  onFilterChange,
  onFilterReset,
  onFilterSubmit,
  onInvitationChange,
  onInvitationSubmit,
  onLoad,
  onNavigatePage,
  onPageSizeChange,
  onRevokeInvitation,
  onToggleStatus,
}) {
  const availableDoctors = doctors.filter((doctor) => !doctor.userId);

  return (
    <section className="admin-panel doctor-admin-panel">
      <div className="panel-title-row doctor-section-heading">
        <div>
          <p className="eyebrow">Nhân sự y tế</p>
          <h2>Quản lý bác sĩ</h2>
          <p className="muted-text">Tạo, cập nhật, lọc và quản lý trạng thái bác sĩ theo cơ sở y tế và khoa công tác.</p>
        </div>
      </div>

      {invitationMessage && <div className={`api-message ${invitationMessage.type}`}>{invitationMessage.text}</div>}

      <form className="doctor-invitation-admin" onSubmit={onInvitationSubmit}>
        <div>
          <strong>Gửi lời mời đăng ký bác sĩ</strong>
          <p>Email là bắt buộc. Có thể chọn hồ sơ bác sĩ có sẵn để liên kết tài khoản.</p>
        </div>
        <label className="clean-field">
          <span>Email bác sĩ</span>
          <input
            type="email"
            autoComplete="email"
            value={invitation.email}
            onChange={(event) => onInvitationChange("email", event.target.value)}
            required
          />
        </label>
        <label className="clean-field">
          <span>Hồ sơ bác sĩ có sẵn (không bắt buộc)</span>
          <select value={invitation.doctorId} onChange={(event) => onInvitationChange("doctorId", event.target.value)}>
            <option value="">Tạo bác sĩ mới khi đăng ký</option>
            {availableDoctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.fullName || doctor.id}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-primary btn-small" type="submit" disabled={savingInvitation}>
          {savingInvitation ? "Đang gửi..." : "Gửi invitation"}
        </button>
        {lastInvitation && (
          <div className="doctor-invitation-latest" role="status">
            <span>
              {lastInvitation.email} · {lastInvitation.status || "Pending"}
              {lastInvitation.expiresAt && ` · hết hạn ${new Date(lastInvitation.expiresAt).toLocaleString("vi-VN")}`}
            </span>
            {String(lastInvitation.status).toLowerCase() !== "revoked" && (
              <button className="btn btn-ghost btn-small" type="button" onClick={onRevokeInvitation}>
                Thu hồi
              </button>
            )}
          </div>
        )}
      </form>

      <DoctorFilters
        filters={filters}
        departments={departments}
        facilities={facilities}
        pageSize={pageInfo.pageSize}
        onChange={onFilterChange}
        onPageSizeChange={onPageSizeChange}
        onSubmit={onFilterSubmit}
        onReset={onFilterReset}
        onCreate={onCreate}
      />

      {facilitiesLoading && <p className="muted-text">Đang đồng bộ danh sách bệnh viện cho bộ lọc...</p>}

      {loading ? (
        <LoadingState
          className="doctor-empty-state"
          label="Đang tải danh sách bác sĩ..."
          description="Dữ liệu nhân sự y tế đang được đồng bộ theo bộ lọc hiện tại."
        />
      ) : error ? (
        <ErrorState
          className="doctor-empty-state"
          title="Không thể tải danh sách bác sĩ"
          description={error}
          action={(
            <Button onClick={() => onLoad()}>
              <RefreshCw size={15} aria-hidden="true" /> Thử tải lại
            </Button>
          )}
        />
      ) : (
        <DoctorTable
          doctors={doctors}
          onEdit={onEdit}
          onToggleStatus={onToggleStatus}
          onDelete={onDelete}
          onCreate={onCreate}
        />
      )}

      {!error && (
        <div className="pagination-row">
          <button className="btn btn-ghost btn-small" type="button" disabled={pageInfo.pageNumber <= 1 || loading} onClick={() => onNavigatePage(pageInfo.pageNumber - 1)}>
            Trước
          </button>
          <span>Trang {pageInfo.pageNumber} / {pageInfo.totalPages || 1} · {pageInfo.totalCount} bác sĩ</span>
          <button className="btn btn-ghost btn-small" type="button" disabled={pageInfo.pageNumber >= pageInfo.totalPages || loading} onClick={() => onNavigatePage(pageInfo.pageNumber + 1)}>
            Sau
          </button>
        </div>
      )}
    </section>
  );
}
