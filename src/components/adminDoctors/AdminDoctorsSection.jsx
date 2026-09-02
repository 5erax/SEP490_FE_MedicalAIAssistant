import {
  Clock3,
  MailPlus,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  UserRoundCheck,
} from "lucide-react";
import { Button, ErrorState, LoadingState } from "../ui";
import DoctorFilters from "./DoctorFilters";
import DoctorTable from "./DoctorTable";

const INVITATION_STATUS_LABELS = {
  pending: "Đang chờ đăng ký",
  accepted: "Đã đăng ký",
  expired: "Đã hết hạn",
  revoked: "Đã thu hồi",
};

function getInvitationStatusLabel(status) {
  const normalizedStatus = String(status || "pending").toLowerCase();
  return INVITATION_STATUS_LABELS[normalizedStatus] || status;
}

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
  const invitationStatus = String(lastInvitation?.status || "pending").toLowerCase();

  return (
    <section
      className="admin-panel doctor-admin-panel doctor-clinical-panel"
      aria-labelledby="admin-doctors-title"
    >
      <header className="doctor-clinical-heading">
        <div className="doctor-clinical-heading-copy">
          <p className="eyebrow">Đội ngũ chuyên môn</p>
          <h2 id="admin-doctors-title">Bác sĩ trong hệ thống</h2>
          <p>
            Quản lý hồ sơ công tác, trạng thái hiển thị và lời mời đăng ký dành
            cho bác sĩ.
          </p>
        </div>

        <div className="doctor-clinical-heading-meta" aria-label="Tóm tắt danh sách">
          <span>
            <Stethoscope size={17} aria-hidden="true" />
            <strong>{pageInfo.totalCount}</strong> hồ sơ theo bộ lọc
          </span>
          <span>
            <ShieldCheck size={17} aria-hidden="true" />
            Thao tác quản trị có xác nhận
          </span>
        </div>
      </header>

      {invitationMessage && (
        <div
          className={`api-message ${invitationMessage.type}`}
          role={invitationMessage.type === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {invitationMessage.text}
        </div>
      )}

      <section className="doctor-invitation-card" aria-labelledby="doctor-invitation-title">
        <div className="doctor-invitation-card-heading">
          <span aria-hidden="true"><MailPlus size={20} /></span>
          <div>
            <p className="eyebrow">Tài khoản đăng nhập</p>
            <h3 id="doctor-invitation-title">Mời bác sĩ tạo tài khoản</h3>
            <p>
              Gửi email đăng ký; thao tác này không tự tạo hồ sơ bác sĩ trong danh mục.
            </p>
          </div>
        </div>

        <form className="doctor-invitation-admin" onSubmit={onInvitationSubmit}>
          <label className="clean-field">
            <span>Email bác sĩ <small>(bắt buộc)</small></span>
            <input
              type="email"
              autoComplete="email"
              value={invitation.email}
              onChange={(event) => onInvitationChange("email", event.target.value)}
              placeholder="bacsi@example.com"
              required
            />
          </label>
          <label className="clean-field">
            <span>Hồ sơ liên kết <small>(không bắt buộc)</small></span>
            <select
              value={invitation.doctorId}
              onChange={(event) => onInvitationChange("doctorId", event.target.value)}
            >
              <option value="">Tạo hồ sơ mới sau khi đăng ký</option>
              {availableDoctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.fullName || doctor.id}
                </option>
              ))}
            </select>
          </label>
          <Button
            className="doctor-invitation-submit"
            tone="secondary"
            type="submit"
            disabled={savingInvitation}
          >
            <MailPlus size={16} aria-hidden="true" />
            {savingInvitation ? "Đang gửi lời mời..." : "Gửi lời mời đăng ký"}
          </Button>
        </form>

        {lastInvitation && (
          <div className="doctor-invitation-latest" role="status" aria-live="polite">
            <div>
              <UserRoundCheck size={18} aria-hidden="true" />
              <span>
                <strong>{lastInvitation.email}</strong>
                <small>{getInvitationStatusLabel(lastInvitation.status)}</small>
                {invitationStatus === "pending" && (
                  <small className="doctor-invitation-status-caveat">
                    Trạng thái tại thời điểm gửi — bác sĩ có thể đã hoàn tất đăng ký.
                  </small>
                )}
              </span>
            </div>
            {invitationStatus === "pending" && lastInvitation.expiresAt && (
              <span className="doctor-invitation-expiry">
                <Clock3 size={15} aria-hidden="true" />
                Hết hạn {new Date(lastInvitation.expiresAt).toLocaleString("vi-VN")}
              </span>
            )}
            {invitationStatus === "revoked" && (
              <span className="doctor-invitation-expiry is-revoked">
                <ShieldCheck size={15} aria-hidden="true" />
                Lời mời không còn hiệu lực
              </span>
            )}
            {invitationStatus !== "revoked" && (
              <Button tone="secondary" size="sm" type="button" onClick={onRevokeInvitation}>
                Thu hồi lời mời
              </Button>
            )}
          </div>
        )}
      </section>

      <DoctorFilters
        doctors={doctors}
        filters={filters}
        departments={departments}
        facilities={facilities}
        pageSize={pageInfo.pageSize}
        resultCount={doctors.length}
        totalCount={pageInfo.totalCount}
        onChange={onFilterChange}
        onPageSizeChange={onPageSizeChange}
        onSubmit={onFilterSubmit}
        onReset={onFilterReset}
        onCreate={onCreate}
      />

      {facilitiesLoading && (
        <p className="doctor-filter-sync" role="status">
          Đang đồng bộ danh sách bệnh viện cho bộ lọc...
        </p>
      )}

      {loading && !doctors.length ? (
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
        <nav className="pagination-row doctor-pagination" aria-label="Phân trang danh sách bác sĩ">
          <Button
            tone="secondary"
            size="sm"
            type="button"
            disabled={pageInfo.pageNumber <= 1 || loading}
            onClick={() => onNavigatePage(pageInfo.pageNumber - 1)}
          >
            Trước
          </Button>
          <span>
            Trang {pageInfo.pageNumber} / {pageInfo.totalPages || 1}
            <span aria-hidden="true"> · </span>
            {pageInfo.totalCount} bác sĩ
          </span>
          <Button
            tone="secondary"
            size="sm"
            type="button"
            disabled={pageInfo.pageNumber >= pageInfo.totalPages || loading}
            onClick={() => onNavigatePage(pageInfo.pageNumber + 1)}
          >
            Sau
          </Button>
        </nav>
      )}
    </section>
  );
}
