import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
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

      {isAssignmentActive && countdown && (
        <div className={`doctor-detail-countdown ${countdown.remaining <= 0 ? "is-expired" : ""}`}>
          <Clock3 size={16} aria-hidden="true" />
          <span>Thời hạn xử lý: <strong>{countdown.label}</strong></span>
        </div>
      )}

      <dl className="doctor-detail-grid">
        <div>
          <dt>Ngày gửi yêu cầu</dt>
          <dd>{formatDate(request.requestedAt) || "Chưa cập nhật"}</dd>
        </div>
        <div>
          <dt>Ngày nhận</dt>
          <dd>{formatDate(request.acceptedAt) || "Chưa cập nhật"}</dd>
        </div>
        <div>
          <dt>Bắt đầu xem xét</dt>
          <dd>{formatDate(request.reviewStartedAt) || "Chưa bắt đầu"}</dd>
        </div>
        <div>
          <dt>Phiên bản dữ liệu</dt>
          <dd>#{request.version ?? 1}</dd>
        </div>
        <div className="doctor-detail-wide">
          <dt>Ghi chú từ bệnh nhân</dt>
          <dd>{request.requestNote || "Không có ghi chú."}</dd>
        </div>
        {request.status === "rejected" && (
          <div className="doctor-detail-wide doctor-detail-danger">
            <dt><AlertTriangle size={14} aria-hidden="true" /> Lý do từ chối</dt>
            <dd>
              {request.rejectionReasonCode && <span className="doctor-detail-reason-code">{request.rejectionReasonCode}</span>}
              {request.rejectionReason || "Không có mô tả."}
            </dd>
          </div>
        )}
      </dl>

      {request.status === "assigned" && (
        <ActionPanel>
          <div className="doctor-detail-actions-primary">
            <Button loading={actionBusy === "startReview"} loadingLabel="Đang bắt đầu…" onClick={handleStartReview}>
              <ClipboardCheck size={17} aria-hidden="true" /> Bắt đầu xem xét
            </Button>
            <Button tone="ghost" disabled={Boolean(actionBusy)} onClick={() => setReleaseOpen(true)}>
              <UndoDot size={17} aria-hidden="true" /> Trả lại hàng đợi
            </Button>
          </div>
          <button type="button" className="doctor-detail-action-reject" disabled={Boolean(actionBusy)} onClick={() => setRejectOpen(true)}>
            <XCircle size={16} aria-hidden="true" /> Từ chối yêu cầu
          </button>
        </ActionPanel>
      )}

      {request.status === "inReview" && (
        <ActionPanel>
          <div className="doctor-detail-actions-primary">
            <span className="doctor-detail-action-soon" title="Soạn kế hoạch phục hồi sẽ sớm ra mắt (FE2-06)">
              <FileText size={17} aria-hidden="true" /> Tạo kế hoạch <em>Sắp ra mắt</em>
            </span>
            <Button tone="ghost" disabled={Boolean(actionBusy)} onClick={() => setMoreInfoOpen(true)}>
              <MessageSquarePlus size={17} aria-hidden="true" /> Yêu cầu bổ sung thông tin
            </Button>
            <Button tone="ghost" disabled={Boolean(actionBusy)} onClick={() => setReleaseOpen(true)}>
              <UndoDot size={17} aria-hidden="true" /> Trả lại hàng đợi
            </Button>
          </div>
          <button type="button" className="doctor-detail-action-reject" disabled={Boolean(actionBusy)} onClick={() => setRejectOpen(true)}>
            <XCircle size={16} aria-hidden="true" /> Từ chối yêu cầu
          </button>
        </ActionPanel>
      )}

      {request.status === "needMoreInformation" && (
        <>
          <section className="doctor-detail-plan-note">
            <MessageSquarePlus size={16} aria-hidden="true" />
            <span>Đang chờ bệnh nhân bổ sung thông tin. Khi bệnh nhân cập nhật, yêu cầu sẽ tự quay lại "Đang xem xét".</span>
          </section>
          <ActionPanel>
            <div className="doctor-detail-actions-primary">
              <Button tone="ghost" disabled={Boolean(actionBusy)} onClick={() => setReleaseOpen(true)}>
                <UndoDot size={17} aria-hidden="true" /> Trả lại hàng đợi
              </Button>
            </div>
            <button type="button" className="doctor-detail-action-reject" disabled={Boolean(actionBusy)} onClick={() => setRejectOpen(true)}>
              <XCircle size={16} aria-hidden="true" /> Từ chối yêu cầu
            </button>
          </ActionPanel>
        </>
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

function ActionPanel({ children }) {
  return (
    <section className="doctor-detail-action-panel">
      <p className="doctor-detail-action-heading">Hành động</p>
      <div className="doctor-detail-actions">{children}</div>
    </section>
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
