import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bone,
  CalendarClock,
  ClipboardCheck,
  Clock3,
  FileText,
  MessageSquarePlus,
  RefreshCw,
  Send,
  Thermometer,
  UndoDot,
  Wind,
  X,
  XCircle,
} from "lucide-react";
import { Badge, Button, Dialog, ErrorState, Field, LoadingState, Select, Textarea } from "../components/ui";
import { useFeedback } from "../components/feedback/feedbackContext";
import { navigate } from "../router/navigation";
import { doctorRecoveryPlanRequestsApi } from "../services/api";
import { getApiErrorCode } from "../services/apiError";
import "../styles/doctor-request-detail.css";

const MAX_REASON_LENGTH = 2000;

const DISEASE_GROUPS = {
  respiratory: { label: "Hô hấp", icon: Wind },
  musculoskeletal: { label: "Cơ xương khớp", icon: Bone },
  infectiousDisease: { label: "Bệnh truyền nhiễm", icon: Thermometer },
};

const STATUS_META = {
  assigned: { label: "Đã nhận", tone: "info" },
  inReview: { label: "Đang xem xét", tone: "warning" },
  needMoreInformation: { label: "Cần bổ sung", tone: "warning" },
  published: { label: "Đã xuất bản", tone: "success" },
  rejected: { label: "Đã từ chối", tone: "danger" },
  cancelled: { label: "Đã hủy", tone: "danger" },
  expired: { label: "Hết hạn", tone: "danger" },
};

const REJECTION_REASON_CODES = [
  { value: "OUT_OF_SCOPE", label: "Ngoài phạm vi xử lý" },
  { value: "INSUFFICIENT_INFORMATION", label: "Thiếu thông tin cần thiết" },
  { value: "NOT_ELIGIBLE", label: "Không đủ điều kiện tạo kế hoạch" },
  { value: "DUPLICATE_REQUEST", label: "Yêu cầu trùng lặp" },
  { value: "OTHER", label: "Lý do khác" },
];

// Requests in these statuses still have an active doctor assignment, so the
// countdown and Release/Reject actions only make sense for them.
const ASSIGNMENT_ACTIVE_STATUSES = new Set(["assigned", "inReview", "needMoreInformation"]);

function getDiseaseInfo(value) {
  return DISEASE_GROUPS[value] ?? { label: "Chưa phân loại", icon: ClipboardCheck };
}

function getStatusMeta(value) {
  return STATUS_META[value] ?? { label: value || "—", tone: "info" };
}

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" });
}

function formatShortId(id) {
  return id ? `#${String(id).slice(0, 8).toUpperCase()}` : "—";
}

function formatRemaining(msRemaining) {
  if (msRemaining <= 0) return "Đã hết hạn";
  const totalMinutes = Math.floor(msRemaining / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const seconds = Math.floor((msRemaining % 60000) / 1000);
  if (hours > 0) return `còn ${hours} giờ ${minutes} phút`;
  if (minutes > 0) return `còn ${minutes} phút ${seconds} giây`;
  return `còn ${seconds} giây`;
}

function useCountdown(expiresAt, onExpire) {
  const [remaining, setRemaining] = useState(() => (
    expiresAt ? new Date(expiresAt).getTime() - Date.now() : null
  ));

  useEffect(() => {
    if (!expiresAt) {
      queueMicrotask(() => setRemaining(null));
      return undefined;
    }
    const compute = () => new Date(expiresAt).getTime() - Date.now();
    queueMicrotask(() => setRemaining(compute()));
    const timer = window.setInterval(() => {
      const next = compute();
      setRemaining(next);
      if (next <= 0) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  const isExpired = remaining !== null && remaining <= 0;
  useEffect(() => {
    if (isExpired) onExpire?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpired]);

  if (remaining === null) return null;
  return { remaining, label: formatRemaining(remaining) };
}

function getActionErrorMessage(error, fallbackMessage) {
  const code = getApiErrorCode(error);
  if (code === "ASSIGNMENT_EXPIRED") {
    return { code, message: "Thời hạn xử lý đã hết. Yêu cầu đã được trả lại hàng đợi." };
  }
  if (code === "INVALID_REQUEST_STATE") {
    return { code, message: "Trạng thái yêu cầu đã thay đổi. Đang tải lại thông tin mới nhất." };
  }
  if (code === "DOCTOR_NOT_ACTIVE") {
    return { code, message: "Tài khoản bác sĩ của bạn hiện chưa ở trạng thái hoạt động." };
  }
  if (code === "NOT_FOUND") {
    return { code, message: "Không tìm thấy yêu cầu này hoặc bạn không có quyền xử lý." };
  }
  return { code, message: fallbackMessage };
}

export default function DoctorRequestDetailPage({ requestId }) {
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    setNotFound(false);
    try {
      const response = await doctorRecoveryPlanRequestsApi.get(requestId);
      setRequest(response?.data ?? null);
    } catch (requestError) {
      if (requestError?.status === 404 || getApiErrorCode(requestError) === "NOT_FOUND") {
        setNotFound(true);
      } else {
        setError("Chưa thể tải chi tiết yêu cầu. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => void load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  return (
    <div className="doctor-detail-page">
      <button type="button" className="doctor-detail-back" onClick={() => navigate("/app/staff/recovery-plans/mine")}>
        <ArrowLeft size={16} aria-hidden="true" /> Yêu cầu của tôi
      </button>

      {loading ? (
        <LoadingState label="Đang tải chi tiết yêu cầu…" />
      ) : notFound ? (
        <ErrorState
          urgent
          title="Không tìm thấy yêu cầu này"
          description="Yêu cầu không tồn tại, hoặc không thuộc quyền xử lý của tài khoản này."
          action={<Button onClick={() => navigate("/app/staff/recovery-plans/mine")}>Về Yêu cầu của tôi</Button>}
        />
      ) : error ? (
        <ErrorState
          title="Không thể tải chi tiết"
          description={error}
          action={<Button onClick={load}><RefreshCw size={16} aria-hidden="true" /> Thử lại</Button>}
        />
      ) : request && (
        <DetailContent request={request} onReload={load} />
      )}
    </div>
  );
}

function DetailContent({ request, onReload }) {
  const { showToast } = useFeedback();
  const disease = getDiseaseInfo(request.diseaseGroup);
  const DiseaseIcon = disease.icon;
  const statusMeta = getStatusMeta(request.status);
  const [actionBusy, setActionBusy] = useState("");
  const [moreInfoOpen, setMoreInfoOpen] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const isAssignmentActive = ASSIGNMENT_ACTIVE_STATUSES.has(request.status);
  const countdown = useCountdown(
    isAssignmentActive ? request.assignmentExpiresAt : null,
    onReload,
  );

  const timelineSteps = [
    { label: "Gửi yêu cầu", timestamp: request.requestedAt },
    { label: "Đã nhận", timestamp: request.acceptedAt },
    { label: "Bắt đầu xem xét", timestamp: request.reviewStartedAt },
  ];
  const finalStepLabel = {
    published: "Đã xuất bản",
    rejected: "Đã từ chối",
    cancelled: "Đã hủy",
    expired: "Hết hạn",
  }[request.status];
  if (finalStepLabel) {
    timelineSteps.push({ label: finalStepLabel, timestamp: null, tone: statusMeta.tone, isFinal: true });
  }

  async function handleStartReview() {
    setActionBusy("startReview");
    try {
      await doctorRecoveryPlanRequestsApi.startReview(request.id);
      showToast({ type: "success", title: "Đã bắt đầu xem xét" });
      await onReload();
    } catch (requestError) {
      const mapped = getActionErrorMessage(requestError, "Chưa thể bắt đầu xem xét. Vui lòng thử lại.");
      showToast({ type: "error", title: "Không thể bắt đầu xem xét", message: mapped.message });
      if (["ASSIGNMENT_EXPIRED", "INVALID_REQUEST_STATE", "NOT_FOUND"].includes(mapped.code)) await onReload();
    } finally {
      setActionBusy("");
    }
  }

  async function handleMoreInformation(reason) {
    setActionBusy("moreInfo");
    try {
      await doctorRecoveryPlanRequestsApi.requestMoreInformation(request.id, reason);
      showToast({ type: "success", title: "Đã gửi yêu cầu bổ sung thông tin" });
      setMoreInfoOpen(false);
      await onReload();
    } catch (requestError) {
      const mapped = getActionErrorMessage(requestError, "Chưa thể gửi yêu cầu bổ sung. Vui lòng thử lại.");
      showToast({ type: "error", title: "Không thể gửi yêu cầu bổ sung", message: mapped.message });
      if (["ASSIGNMENT_EXPIRED", "INVALID_REQUEST_STATE", "NOT_FOUND"].includes(mapped.code)) {
        setMoreInfoOpen(false);
        await onReload();
      }
    } finally {
      setActionBusy("");
    }
  }

  async function handleRelease(reason) {
    setActionBusy("release");
    try {
      await doctorRecoveryPlanRequestsApi.release(request.id, reason || undefined);
      showToast({ type: "success", title: "Đã trả lại hàng đợi", message: "Yêu cầu đã quay về hàng đợi chung." });
      setReleaseOpen(false);
      navigate("/app/staff/recovery-plans/mine");
    } catch (requestError) {
      const mapped = getActionErrorMessage(requestError, "Chưa thể trả lại yêu cầu. Vui lòng thử lại.");
      showToast({ type: "error", title: "Không thể trả lại yêu cầu", message: mapped.message });
      if (["ASSIGNMENT_EXPIRED", "INVALID_REQUEST_STATE", "NOT_FOUND"].includes(mapped.code)) {
        setReleaseOpen(false);
        await onReload();
      }
    } finally {
      setActionBusy("");
    }
  }

  async function handleReject(reasonCode, reason) {
    setActionBusy("reject");
    try {
      await doctorRecoveryPlanRequestsApi.reject(request.id, reasonCode, reason);
      showToast({ type: "success", title: "Đã từ chối yêu cầu" });
      setRejectOpen(false);
      await onReload();
    } catch (requestError) {
      const mapped = getActionErrorMessage(requestError, "Chưa thể từ chối yêu cầu. Vui lòng thử lại.");
      showToast({ type: "error", title: "Không thể từ chối yêu cầu", message: mapped.message });
      if (["ASSIGNMENT_EXPIRED", "INVALID_REQUEST_STATE", "NOT_FOUND"].includes(mapped.code)) {
        setRejectOpen(false);
        await onReload();
      }
    } finally {
      setActionBusy("");
    }
  }

  return (
    <>
      <header className="doctor-detail-header">
        <span className="doctor-detail-icon" aria-hidden="true"><DiseaseIcon size={26} /></span>
        <div>
          <p className="doctor-detail-eyebrow">Chi tiết yêu cầu</p>
          <h1>{disease.label}</h1>
        </div>
        <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
        <button type="button" className="doctor-detail-refresh" aria-label="Tải lại" onClick={onReload}>
          <RefreshCw size={16} aria-hidden="true" />
        </button>
      </header>

      <div className="doctor-detail-layout">
        <div className="doctor-detail-main">
          <section className="doctor-detail-card">
            <p className="doctor-detail-card-heading">Ghi chú từ bệnh nhân</p>
            <p className="doctor-detail-note-text">{request.requestNote || "Không có ghi chú."}</p>
          </section>

          {request.status === "rejected" && (
            <section className="doctor-detail-card doctor-detail-card-danger">
              <p className="doctor-detail-card-heading">
                <AlertTriangle size={14} aria-hidden="true" /> Lý do từ chối
              </p>
              <p className="doctor-detail-note-text">
                {request.rejectionReasonCode && (
                  <span className="doctor-detail-reason-code">{request.rejectionReasonCode}</span>
                )}
                {request.rejectionReason || "Không có mô tả."}
              </p>
            </section>
          )}

          {request.status === "published" && (
            <section className="doctor-detail-plan-note">
              <FileText size={16} aria-hidden="true" />
              <span>
                Kế hoạch liên kết đang ở trạng thái <strong>{request.recoveryPlanStatus}</strong>. Trang xem kế hoạch sẽ sớm ra mắt.
              </span>
            </section>
          )}

          {["cancelled", "expired"].includes(request.status) && (
            <section className="doctor-detail-plan-note is-muted">
              <CalendarClock size={16} aria-hidden="true" />
              <span>Yêu cầu này đã kết thúc và không còn thao tác nào khả dụng.</span>
            </section>
          )}
        </div>

        <aside className="doctor-detail-sidebar">
          <section className="doctor-detail-side-card">
            <p className="doctor-detail-side-heading">Trạng thái</p>
            <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
            {isAssignmentActive && countdown && (
              <div className={`doctor-detail-countdown ${countdown.remaining <= 0 ? "is-expired" : ""}`}>
                <Clock3 size={16} aria-hidden="true" />
                <span>Thời hạn xử lý: <strong>{countdown.label}</strong></span>
              </div>
            )}
          </section>

          <section className="doctor-detail-side-card">
            <p className="doctor-detail-side-heading">Dòng thời gian</p>
            <Timeline steps={timelineSteps} />
          </section>

          <section className="doctor-detail-side-card">
            <p className="doctor-detail-side-heading">Thông tin nhanh</p>
            <dl className="doctor-detail-quick-info">
              <div>
                <dt>Mã yêu cầu</dt>
                <dd>{formatShortId(request.id)}</dd>
              </div>
              <div>
                <dt>Nhóm bệnh</dt>
                <dd>{disease.label}</dd>
              </div>
              <div>
                <dt>Phiên bản dữ liệu</dt>
                <dd>#{request.version ?? 1}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>

      {request.status === "assigned" && (
        <ActionArea>
          <PrimaryActionCard
            icon={ClipboardCheck}
            title="Bắt đầu xem xét"
            subtitle="Mở hồ sơ lâm sàng của bệnh nhân và bắt đầu tính thời hạn xử lý cho yêu cầu này."
            buttonLabel="Bắt đầu xem xét"
            loading={actionBusy === "startReview"}
            loadingLabel="Đang bắt đầu…"
            disabled={Boolean(actionBusy)}
            onClick={handleStartReview}
          />
          <div className="doctor-action-tiles">
            <ActionTile
              icon={UndoDot}
              title="Trả lại hàng đợi"
              subtitle="Chuyển yêu cầu về hàng đợi chung để bác sĩ khác có thể tiếp nhận."
              disabled={Boolean(actionBusy)}
              onClick={() => setReleaseOpen(true)}
            />
          </div>
          <DangerZone>
            <ActionTile
              tone="danger"
              icon={XCircle}
              title="Từ chối yêu cầu"
              subtitle="Đóng yêu cầu này và giải phóng lượt sử dụng đã giữ chỗ cho bệnh nhân."
              disabled={Boolean(actionBusy)}
              onClick={() => setRejectOpen(true)}
            />
          </DangerZone>
        </ActionArea>
      )}

      {request.status === "inReview" && (
        <ActionArea>
          <PrimaryActionCard
            icon={MessageSquarePlus}
            title="Yêu cầu bổ sung thông tin"
            subtitle="Gửi yêu cầu để bệnh nhân cung cấp thêm thông tin trước khi bạn tiếp tục xử lý."
            buttonLabel="Yêu cầu bổ sung"
            disabled={Boolean(actionBusy)}
            onClick={() => setMoreInfoOpen(true)}
          />
          <div className="doctor-action-tiles">
            <ActionTile
              icon={UndoDot}
              title="Trả lại hàng đợi"
              subtitle="Chuyển yêu cầu về hàng đợi chung để bác sĩ khác có thể tiếp nhận."
              disabled={Boolean(actionBusy)}
              onClick={() => setReleaseOpen(true)}
            />
            <ComingSoonTile
              icon={FileText}
              title="Tạo kế hoạch"
              subtitle="Soạn kế hoạch phục hồi dinh dưỡng cho bệnh nhân."
            />
          </div>
          <DangerZone>
            <ActionTile
              tone="danger"
              icon={XCircle}
              title="Từ chối yêu cầu"
              subtitle="Đóng yêu cầu này và giải phóng lượt sử dụng đã giữ chỗ cho bệnh nhân."
              disabled={Boolean(actionBusy)}
              onClick={() => setRejectOpen(true)}
            />
          </DangerZone>
        </ActionArea>
      )}

      {request.status === "needMoreInformation" && (
        <>
          <section className="doctor-detail-plan-note">
            <MessageSquarePlus size={16} aria-hidden="true" />
            <span>Đang chờ bệnh nhân bổ sung thông tin. Khi bệnh nhân cập nhật, yêu cầu sẽ tự quay lại "Đang xem xét".</span>
          </section>
          <ActionArea>
            <div className="doctor-action-tiles">
              <ActionTile
                icon={UndoDot}
                title="Trả lại hàng đợi"
                subtitle="Chuyển yêu cầu về hàng đợi chung để bác sĩ khác có thể tiếp nhận."
                disabled={Boolean(actionBusy)}
                onClick={() => setReleaseOpen(true)}
              />
            </div>
            <DangerZone>
              <ActionTile
                tone="danger"
                icon={XCircle}
                title="Từ chối yêu cầu"
                subtitle="Đóng yêu cầu này và giải phóng lượt sử dụng đã giữ chỗ cho bệnh nhân."
                disabled={Boolean(actionBusy)}
                onClick={() => setRejectOpen(true)}
              />
            </DangerZone>
          </ActionArea>
        </>
      )}

      {moreInfoOpen && (
        <ReasonDialog
          title="Yêu cầu bổ sung thông tin"
          icon={MessageSquarePlus}
          label="Nội dung cần bệnh nhân bổ sung"
          placeholder="Ví dụ: Vui lòng bổ sung kết quả xét nghiệm gần nhất."
          required
          submitLabel="Gửi yêu cầu"
          submitting={actionBusy === "moreInfo"}
          onClose={() => setMoreInfoOpen(false)}
          onSubmit={handleMoreInformation}
        />
      )}

      {releaseOpen && (
        <ReasonDialog
          title="Trả lại hàng đợi chung"
          icon={UndoDot}
          label="Lý do (không bắt buộc)"
          placeholder="Ví dụ: Không thể tiếp tục xử lý vào lúc này."
          required={false}
          submitLabel="Trả lại hàng đợi"
          submitting={actionBusy === "release"}
          onClose={() => setReleaseOpen(false)}
          onSubmit={handleRelease}
        />
      )}

      {rejectOpen && (
        <RejectDialog
          submitting={actionBusy === "reject"}
          onClose={() => setRejectOpen(false)}
          onSubmit={handleReject}
        />
      )}
    </>
  );
}

function Timeline({ steps }) {
  return (
    <ol className="doctor-detail-timeline">
      {steps.map((step) => (
        <li
          key={step.label}
          className={step.isFinal ? `is-final tone-${step.tone}` : step.timestamp ? "is-done" : "is-pending"}
        >
          <span className="doctor-detail-timeline-dot" aria-hidden="true" />
          <div>
            <strong>{step.label}</strong>
            {!step.isFinal && <p>{step.timestamp ? formatDate(step.timestamp) : "Chưa diễn ra"}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function ActionArea({ children }) {
  return (
    <section className="doctor-action-area">
      <p className="doctor-action-area-eyebrow">Hành động tiếp theo</p>
      {children}
    </section>
  );
}

function PrimaryActionCard({ icon: Icon, title, subtitle, buttonLabel, onClick, loading, loadingLabel, disabled }) {
  return (
    <div className="doctor-primary-action">
      <span className="doctor-primary-action-icon" aria-hidden="true"><Icon size={22} /></span>
      <div className="doctor-primary-action-body">
        <strong>{title}</strong>
        <p>{subtitle}</p>
      </div>
      <Button
        className="doctor-primary-action-cta"
        size="lg"
        loading={loading}
        loadingLabel={loadingLabel}
        disabled={disabled}
        onClick={onClick}
      >
        {buttonLabel}
      </Button>
    </div>
  );
}

function ActionTile({ tone = "default", icon: Icon, title, subtitle, onClick, disabled }) {
  return (
    <button type="button" className="doctor-action-tile" data-tone={tone} disabled={disabled} onClick={onClick}>
      <span className="doctor-action-tile-icon" aria-hidden="true"><Icon size={18} /></span>
      <span className="doctor-action-tile-body">
        <strong>{title}</strong>
        <p>{subtitle}</p>
      </span>
      <ArrowRight size={16} aria-hidden="true" className="doctor-action-tile-chevron" />
    </button>
  );
}

function ComingSoonTile({ icon: Icon, title, subtitle }) {
  return (
    <div className="doctor-action-tile is-coming-soon" title="Tính năng này sẽ sớm ra mắt">
      <span className="doctor-action-tile-icon" aria-hidden="true"><Icon size={18} /></span>
      <span className="doctor-action-tile-body">
        <strong>{title} <em className="doctor-action-tile-badge">Sắp ra mắt</em></strong>
        <p>{subtitle}</p>
      </span>
    </div>
  );
}

function DangerZone({ children }) {
  return (
    <div className="doctor-action-danger-zone">
      <p className="doctor-action-danger-label">Vùng nguy hiểm</p>
      {children}
    </div>
  );
}

function ReasonDialog({ title, icon: Icon, label, placeholder, required, submitLabel, submitting, onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = reason.trim();
    if (required && !trimmed) {
      setError("Nội dung là bắt buộc.");
      return;
    }
    if (trimmed.length > MAX_REASON_LENGTH) {
      setError(`Nội dung không được vượt quá ${MAX_REASON_LENGTH} ký tự.`);
      return;
    }
    onSubmit(trimmed);
  }

  return (
    <Dialog
      backdropClassName="doctor-action-modal-backdrop"
      className="doctor-action-modal"
      labelledBy="doctor-action-modal-title"
      onClose={submitting ? () => {} : onClose}
      closeOnBackdrop={!submitting}
      closeOnEscape={!submitting}
    >
      <header className="doctor-action-modal-header">
        <span aria-hidden="true"><Icon size={20} /></span>
        <h2 id="doctor-action-modal-title">{title}</h2>
        <button type="button" aria-label="Đóng" onClick={onClose} disabled={submitting}><X size={20} aria-hidden="true" /></button>
      </header>
      <form onSubmit={handleSubmit} noValidate>
        <Field label={label} required={required} error={error}>
          <Textarea
            rows={4}
            maxLength={MAX_REASON_LENGTH}
            value={reason}
            placeholder={placeholder}
            onChange={(event) => { setReason(event.target.value); setError(""); }}
            autoFocus
          />
        </Field>
        <div className="doctor-action-modal-actions">
          <Button type="button" tone="secondary" onClick={onClose} disabled={submitting}>Hủy</Button>
          <Button type="submit" loading={submitting} loadingLabel="Đang gửi…">
            <Send size={16} aria-hidden="true" /> {submitLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function RejectDialog({ submitting, onClose, onSubmit }) {
  const [reasonCode, setReasonCode] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState({});

  function handleSubmit(event) {
    event.preventDefault();
    const trimmedReason = reason.trim();
    const nextErrors = {};
    if (!reasonCode) nextErrors.reasonCode = "Vui lòng chọn mã lý do.";
    if (!trimmedReason) nextErrors.reason = "Mô tả lý do là bắt buộc.";
    if (trimmedReason.length > MAX_REASON_LENGTH) nextErrors.reason = `Không được vượt quá ${MAX_REASON_LENGTH} ký tự.`;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onSubmit(reasonCode, trimmedReason);
  }

  return (
    <Dialog
      backdropClassName="doctor-action-modal-backdrop"
      className="doctor-action-modal"
      labelledBy="doctor-reject-modal-title"
      onClose={submitting ? () => {} : onClose}
      closeOnBackdrop={!submitting}
      closeOnEscape={!submitting}
    >
      <header className="doctor-action-modal-header">
        <span aria-hidden="true"><XCircle size={20} /></span>
        <h2 id="doctor-reject-modal-title">Từ chối yêu cầu</h2>
        <button type="button" aria-label="Đóng" onClick={onClose} disabled={submitting}><X size={20} aria-hidden="true" /></button>
      </header>
      <form onSubmit={handleSubmit} noValidate>
        <Field label="Mã lý do" required error={errors.reasonCode}>
          <Select
            className="doctor-action-select"
            value={reasonCode}
            onChange={(event) => { setReasonCode(event.target.value); setErrors((current) => ({ ...current, reasonCode: "" })); }}
          >
            <option value="">Chọn mã lý do</option>
            {REJECTION_REASON_CODES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Mô tả chi tiết" required error={errors.reason}>
          <Textarea
            rows={4}
            maxLength={MAX_REASON_LENGTH}
            value={reason}
            placeholder="Giải thích ngắn gọn vì sao yêu cầu này bị từ chối."
            onChange={(event) => { setReason(event.target.value); setErrors((current) => ({ ...current, reason: "" })); }}
          />
        </Field>
        <div className="doctor-action-modal-actions">
          <Button type="button" tone="secondary" onClick={onClose} disabled={submitting}>Hủy</Button>
          <Button type="submit" tone="danger" loading={submitting} loadingLabel="Đang từ chối…">
            <XCircle size={16} aria-hidden="true" /> Từ chối yêu cầu
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
