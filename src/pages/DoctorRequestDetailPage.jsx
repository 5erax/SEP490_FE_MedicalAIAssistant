import { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bone,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  FlaskConical,
  HeartPulse,
  History,
  Info,
  MessageSquarePlus,
  Milestone,
  Pill,
  RefreshCw,
  Ruler,
  Send,
  ShieldAlert,
  Thermometer,
  UndoDot,
  Wind,
  X,
  XCircle,
} from "lucide-react";
import { Badge, Button, Dialog, ErrorState, Field, LoadingState, Select, Textarea, TextInput } from "../components/ui";
import { useFeedback } from "../components/feedback/feedbackContext";
import { navigate } from "../router/navigation";
import { doctorRecoveryPlanRequestsApi, normalizeDoctorPlanDetail } from "../services/api";
import { getApiErrorCode } from "../services/apiError";
import { subscribeToRecoveryPlanEvents } from "../services/recoveryPlanRealtime";
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

// Vietnamese labels for RecoveryPlanStatus (the *plan's* own lifecycle,
// separate from the request's status above) - shown once a plan has been
// published, instead of the raw backend enum value.
const RECOVERY_PLAN_STATUS_META = {
  readyToStart: { label: "Sẵn sàng bắt đầu", tone: "success" },
  active: { label: "Đang thực hiện", tone: "info" },
  completed: { label: "Đã hoàn thành", tone: "success" },
  cancelled: { label: "Đã hủy", tone: "danger" },
  superseded: { label: "Đã thay thế", tone: "danger" },
};

function getRecoveryPlanStatusMeta(value) {
  return RECOVERY_PLAN_STATUS_META[value] ?? { label: value || "—", tone: "info" };
}

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

const TERMINAL_STATUSES = new Set(["published", "rejected", "cancelled", "expired"]);

function getStepIndex(status) {
  if (status === "assigned") return 1;
  if (status === "inReview" || status === "needMoreInformation") return 2;
  if (TERMINAL_STATUSES.has(status)) return 3;
  return 0;
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

function formatDateOnly(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

// The doctor clinical-context endpoint has no published response schema yet,
// so this accepts a few plausible key-name variants defensively instead of
// assuming one exact shape. Any block whose data is missing/misnamed simply
// falls back to its own empty state rather than breaking the page.
function normalizeClinicalContext(data) {
  if (!data || typeof data !== "object") {
    return { profile: null, medications: [], labSessions: [], chronicDiseases: [] };
  }
  const profile = data.patientProfile ?? data.profile ?? data.patient ?? null;
  return {
    profile,
    medications: toArray(data.medications ?? data.currentMedications ?? data.userMedications ?? profile?.medications),
    labSessions: toArray(data.labSessions ?? data.labTests ?? data.labResults ?? data.labTestSessions),
    chronicDiseases: toArray(profile?.chronicDiseases ?? data.chronicDiseases),
  };
}

function getBmi(height, weight) {
  if (!height || !weight) return null;
  const heightMeters = height / 100;
  if (!heightMeters) return null;
  return weight / (heightMeters * heightMeters);
}

function getBmiCategory(bmi) {
  if (bmi == null) return null;
  if (bmi < 18.5) return { label: "Thiếu cân", tone: "warning" };
  if (bmi < 23) return { label: "Bình thường", tone: "success" };
  if (bmi < 25) return { label: "Thừa cân", tone: "warning" };
  return { label: "Béo phì", tone: "danger" };
}

function buildJourneyEvents({ profile, medications, labSessions }) {
  const events = [];
  toArray(profile?.chronicDiseases).forEach((item) => {
    if (item.from) {
      events.push({ date: item.from, icon: HeartPulse, label: `Bắt đầu bệnh nền: ${item.diseaseName || "không rõ tên"}` });
    }
  });
  toArray(labSessions).forEach((session) => {
    const date = session.testDate ?? session.createdAt;
    if (date) {
      events.push({ date, icon: FlaskConical, label: `Xét nghiệm${session.facilityName ? ` tại ${session.facilityName}` : ""}` });
    }
  });
  toArray(medications).forEach((item) => {
    if (item.startDate) {
      events.push({ date: item.startDate, icon: Pill, label: `Bắt đầu dùng thuốc: ${item.medicineName || "không rõ tên"}` });
    }
  });
  return events
    .filter((event) => !Number.isNaN(new Date(event.date).getTime()))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
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
  const refetchTimerRef = useRef(null);

  async function refreshRequest() {
    // Silent background resync for realtime events - unlike load(), this
    // never toggles the full-page loading/error state, so a socket event
    // doesn't flash a spinner over the whole page the doctor is reading.
    try {
      const response = await doctorRecoveryPlanRequestsApi.get(requestId);
      setRequest(response?.data ?? null);
    } catch {
      // Ignored - the manual refresh button and next real navigation will
      // surface any persistent problem instead.
    }
  }

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

  useEffect(() => {
    const unsubscribe = subscribeToRecoveryPlanEvents((event) => {
      if (event.type === "request" || event.type === "plan" || event.refetch) {
        window.clearTimeout(refetchTimerRef.current);
        refetchTimerRef.current = window.setTimeout(() => {
          void refreshRequest();
        }, 250);
      }
    });

    return () => {
      unsubscribe();
      window.clearTimeout(refetchTimerRef.current);
    };
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
  const [createDraftOpen, setCreateDraftOpen] = useState(false);

  const [clinicalContext, setClinicalContext] = useState(null);
  const [clinicalLoading, setClinicalLoading] = useState(true);
  const [clinicalError, setClinicalError] = useState("");

  async function loadClinicalContext() {
    setClinicalLoading(true);
    setClinicalError("");
    try {
      const response = await doctorRecoveryPlanRequestsApi.getClinicalContext(request.id);
      setClinicalContext(normalizeClinicalContext(response?.data));
    } catch {
      setClinicalError("Chưa thể tải bối cảnh lâm sàng của bệnh nhân.");
    } finally {
      setClinicalLoading(false);
    }
  }

  useEffect(() => {
    // The backend only allows clinical-context reads while the request is in
    // an active review state (assigned/inReview/needMoreInformation) — it
    // returns 409 INVALID_REQUEST_STATE once published/rejected/cancelled/
    // expired, so don't even attempt the call outside that window.
    if (!ASSIGNMENT_ACTIVE_STATUSES.has(request.status)) {
      queueMicrotask(() => setClinicalLoading(false));
      return;
    }
    queueMicrotask(() => void loadClinicalContext());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.id, request.status]);

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

  async function handleCreateDraft(payload) {
    setActionBusy("createDraft");
    try {
      const response = await doctorRecoveryPlanRequestsApi.createDraft(request.id, payload);
      const { plan } = normalizeDoctorPlanDetail(response);
      setCreateDraftOpen(false);
      if (plan?.id) {
        navigate(`/app/staff/recovery-plans/${plan.id}`);
      } else {
        showToast({ type: "success", title: "Đã tạo bản nháp kế hoạch" });
        await onReload();
      }
    } catch (requestError) {
      const mapped = getActionErrorMessage(requestError, "Chưa thể tạo kế hoạch. Vui lòng thử lại.");
      showToast({ type: "error", title: "Không thể tạo kế hoạch", message: mapped.message });
      if (["ASSIGNMENT_EXPIRED", "INVALID_REQUEST_STATE", "NOT_FOUND"].includes(mapped.code)) {
        setCreateDraftOpen(false);
        await onReload();
      }
    } finally {
      setActionBusy("");
    }
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

      <ProgressSteps status={request.status} />

      <div className="doctor-detail-layout">
        <div className="doctor-detail-main">
          <section className="doctor-detail-card">
            <p className="doctor-detail-card-heading">Ghi chú từ bệnh nhân</p>
            <p className="doctor-detail-note-text">{request.requestNote || "Không có ghi chú."}</p>
          </section>

          {ASSIGNMENT_ACTIVE_STATUSES.has(request.status) && (
            <ClinicalContextSection
              loading={clinicalLoading}
              error={clinicalError}
              data={clinicalContext}
              onRetry={loadClinicalContext}
            />
          )}

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
            <section className="doctor-detail-success-card">
              <span className="doctor-detail-success-icon" aria-hidden="true"><CheckCircle2 size={24} /></span>
              <div>
                <p className="doctor-detail-success-eyebrow">Đã xuất bản thành công</p>
                <h2>Kế hoạch phục hồi đã được gửi tới bệnh nhân</h2>
                <div className="doctor-detail-success-status">
                  <span>Trạng thái kế hoạch:</span>
                  <Badge tone={getRecoveryPlanStatusMeta(request.recoveryPlanStatus).tone}>
                    {getRecoveryPlanStatusMeta(request.recoveryPlanStatus).label}
                  </Badge>
                </div>
                <p className="doctor-detail-success-note">
                  <FileText size={13} aria-hidden="true" /> Trang xem chi tiết kế hoạch đầy đủ sẽ sớm ra mắt tại đây.
                </p>
              </div>
            </section>
          )}

          {["cancelled", "expired"].includes(request.status) && (
            <section className="doctor-detail-plan-note is-muted">
              <CalendarClock size={16} aria-hidden="true" />
              <span>Yêu cầu này đã kết thúc và không còn thao tác nào khả dụng.</span>
            </section>
          )}

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
              {request.recoveryPlanId ? (
                <PrimaryActionCard
                  icon={FileText}
                  title="Tiếp tục soạn kế hoạch"
                  subtitle="Mở lại bản nháp kế hoạch phục hồi dinh dưỡng đang soạn cho bệnh nhân."
                  buttonLabel="Mở kế hoạch"
                  disabled={Boolean(actionBusy)}
                  onClick={() => navigate(`/app/staff/recovery-plans/${request.recoveryPlanId}`)}
                />
              ) : (
                <PrimaryActionCard
                  icon={FileText}
                  title="Tạo kế hoạch"
                  subtitle="Bắt đầu soạn kế hoạch phục hồi dinh dưỡng cho bệnh nhân dựa trên bối cảnh lâm sàng ở trên."
                  buttonLabel="Tạo kế hoạch"
                  loading={actionBusy === "createDraft"}
                  loadingLabel="Đang tạo…"
                  disabled={Boolean(actionBusy)}
                  onClick={() => setCreateDraftOpen(true)}
                />
              )}
              <div className="doctor-action-tiles">
                <ActionTile
                  icon={MessageSquarePlus}
                  title="Yêu cầu bổ sung thông tin"
                  subtitle="Gửi yêu cầu để bệnh nhân cung cấp thêm thông tin trước khi bạn tiếp tục xử lý."
                  disabled={Boolean(actionBusy)}
                  onClick={() => setMoreInfoOpen(true)}
                />
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
        </div>

        <aside className="doctor-detail-sidebar">
          <section className="doctor-detail-side-card">
            <p className="doctor-detail-side-heading">
              <Activity size={13} aria-hidden="true" /> Trạng thái
            </p>
            <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
            {isAssignmentActive && countdown && (
              <div className={`doctor-detail-countdown ${countdown.remaining <= 0 ? "is-expired" : ""}`}>
                <Clock3 size={16} aria-hidden="true" />
                <span>Thời hạn xử lý: <strong>{countdown.label}</strong></span>
              </div>
            )}
          </section>

          <section className="doctor-detail-side-card">
            <p className="doctor-detail-side-heading">
              <History size={13} aria-hidden="true" /> Dòng thời gian
            </p>
            <Timeline steps={timelineSteps} />
          </section>

          <section className="doctor-detail-side-card">
            <p className="doctor-detail-side-heading">
              <Info size={13} aria-hidden="true" /> Thông tin nhanh
            </p>
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

      {createDraftOpen && (
        <CreatePlanDialog
          submitting={actionBusy === "createDraft"}
          onClose={() => setCreateDraftOpen(false)}
          onSubmit={handleCreateDraft}
        />
      )}
    </>
  );
}

function ProgressSteps({ status }) {
  const stepIndex = getStepIndex(status);
  const isFailure = ["rejected", "cancelled", "expired"].includes(status);
  const finalLabel = status === "published" ? "Hoàn tất" : isFailure ? getStatusMeta(status).label : "Hoàn tất";
  const steps = [
    { label: "Đã gửi" },
    { label: "Đã tiếp nhận" },
    { label: "Đang xem xét" },
    { label: finalLabel, danger: isFailure },
  ];

  return (
    <ol className="doctor-detail-steps">
      {steps.map((step, index) => {
        const isLastStep = index === steps.length - 1;
        // Reaching the last step IS completion, not "in progress" - so it
        // should render as done (checkmark) the instant it's reached,
        // unlike the middle steps which stay a "current" ring until the
        // next step starts.
        const state = index < stepIndex || (index === stepIndex && isLastStep)
          ? "done"
          : index === stepIndex
            ? "current"
            : "pending";
        return (
          <li key={step.label} className={`is-${state}${step.danger && state !== "pending" ? " is-danger" : ""}`}>
            <span className="doctor-detail-step-dot" aria-hidden="true">
              {state === "done" ? <Check size={12} /> : index + 1}
            </span>
            <span className="doctor-detail-step-label">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function ClinicalContextSection({ loading, error, data, onRetry }) {
  if (loading) {
    return (
      <section className="doctor-clinical-section">
        <p className="doctor-detail-card-heading">Bối cảnh lâm sàng</p>
        <LoadingState label="Đang tải bối cảnh lâm sàng…" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="doctor-clinical-section">
        <p className="doctor-detail-card-heading">Bối cảnh lâm sàng</p>
        <ErrorState
          title="Không thể tải bối cảnh lâm sàng"
          description={error}
          action={<Button onClick={onRetry}><RefreshCw size={16} aria-hidden="true" /> Thử lại</Button>}
        />
      </section>
    );
  }

  const { profile, medications, labSessions, chronicDiseases } = data;
  const bmi = getBmi(profile?.height, profile?.weight);
  const bmiCategory = getBmiCategory(bmi);
  const journeyEvents = buildJourneyEvents({ profile, medications, labSessions });

  return (
    <section className="doctor-clinical-section">
      <p className="doctor-detail-card-heading">Bối cảnh lâm sàng</p>

      <div className="doctor-clinical-grid">
        <ClinicalBlock icon={Ruler} title="Chỉ số cơ thể">
          {profile?.height || profile?.weight ? (
            <>
              <div className="doctor-clinical-metrics">
                {profile?.height && <span><strong>{profile.height}</strong> cm</span>}
                {profile?.weight && <span><strong>{profile.weight}</strong> kg</span>}
              </div>
              {bmi != null && (
                <p className="doctor-clinical-bmi">
                  BMI <strong>{bmi.toFixed(1)}</strong>
                  <Badge tone={bmiCategory.tone}>{bmiCategory.label}</Badge>
                </p>
              )}
              {profile?.bloodType && <p className="doctor-clinical-meta">Nhóm máu: <strong>{profile.bloodType}</strong></p>}
            </>
          ) : (
            <EmptyBlockNote text="Bệnh nhân chưa cập nhật chiều cao/cân nặng." />
          )}
        </ClinicalBlock>

        <ClinicalBlock icon={ShieldAlert} title="Dị ứng">
          {profile?.allergyNote ? (
            <p className="doctor-clinical-text">{profile.allergyNote}</p>
          ) : (
            <EmptyBlockNote text="Không ghi nhận dị ứng." />
          )}
        </ClinicalBlock>

        <ClinicalBlock icon={HeartPulse} title="Bệnh nền">
          {chronicDiseases.length > 0 ? (
            <ul className="doctor-clinical-list">
              {chronicDiseases.map((item) => (
                <li key={item.id}>
                  <strong>{item.diseaseName || "Không rõ tên bệnh"}</strong>
                  <span>{formatDateOnly(item.from) || "?"} – {item.to ? formatDateOnly(item.to) : "hiện tại"}</span>
                  {item.note && <p>{item.note}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyBlockNote text="Không có bệnh nền được ghi nhận." />
          )}
        </ClinicalBlock>

        <ClinicalBlock icon={Pill} title="Thuốc đang sử dụng">
          {medications.length > 0 ? (
            <ul className="doctor-clinical-list">
              {medications.map((item) => (
                <li key={item.id}>
                  <strong>{item.medicineName || "Không rõ tên thuốc"}</strong>
                  {item.dosageInstruction && <p>{item.dosageInstruction}</p>}
                  <span>{formatDateOnly(item.startDate) || "?"}{item.endDate ? ` – ${formatDateOnly(item.endDate)}` : ""}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyBlockNote text="Bệnh nhân chưa khai báo thuốc đang dùng." />
          )}
        </ClinicalBlock>

        <ClinicalBlock icon={FlaskConical} title="Xét nghiệm gần đây">
          {labSessions.length > 0 ? (
            <ul className="doctor-clinical-list">
              {labSessions.slice(0, 5).map((session) => (
                <li key={session.sessionId}>
                  <strong>{formatDateOnly(session.testDate) || formatDateOnly(session.createdAt) || "Chưa rõ ngày"}</strong>
                  <span>{session.facilityName || "Không rõ cơ sở"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyBlockNote text="Chưa có phiếu xét nghiệm nào được ghi nhận." />
          )}
        </ClinicalBlock>

        <ClinicalBlock icon={Milestone} title="Hành trình điều trị">
          {journeyEvents.length > 0 ? (
            <ol className="doctor-clinical-journey">
              {journeyEvents.map((event, index) => (
                <li key={index}>
                  <span className="doctor-clinical-journey-icon" aria-hidden="true"><event.icon size={14} /></span>
                  <div>
                    <strong>{event.label}</strong>
                    <p>{formatDateOnly(event.date)}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyBlockNote text="Chưa có đủ dữ liệu để dựng hành trình điều trị." />
          )}
        </ClinicalBlock>
      </div>
    </section>
  );
}

function ClinicalBlock({ icon: Icon, title, children }) {
  return (
    <div className="doctor-clinical-block">
      <p className="doctor-clinical-block-heading">
        <Icon size={14} aria-hidden="true" /> {title}
      </p>
      {children}
    </div>
  );
}

function EmptyBlockNote({ text }) {
  return <p className="doctor-clinical-empty">{text}</p>;
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

function DangerZone({ children }) {
  return (
    <div className="doctor-action-danger-zone">
      <div className="doctor-action-danger-header">
        <AlertTriangle size={15} aria-hidden="true" />
        <div>
          <p className="doctor-action-danger-title">Vùng nguy hiểm</p>
          <p className="doctor-action-danger-desc">Hành động dưới đây sẽ đóng yêu cầu này và không thể hoàn tác.</p>
        </div>
      </div>
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

function CreatePlanDialog({ submitting, onClose, onSubmit }) {
  const [planName, setPlanName] = useState("");
  const [summary, setSummary] = useState("");
  const [durationDays, setDurationDays] = useState("14");
  const [recheckInstruction, setRecheckInstruction] = useState("");
  const [errors, setErrors] = useState({});

  function handleSubmit(event) {
    event.preventDefault();
    const trimmedName = planName.trim();
    const days = Number(durationDays);
    const nextErrors = {};
    if (!trimmedName) nextErrors.planName = "Tên kế hoạch là bắt buộc.";
    if (!Number.isInteger(days) || days <= 0) nextErrors.durationDays = "Số ngày phải là số nguyên dương.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onSubmit({
      planName: trimmedName,
      summary: summary.trim() || null,
      durationDays: days,
      recheckInstruction: recheckInstruction.trim() || null,
    });
  }

  return (
    <Dialog
      backdropClassName="doctor-action-modal-backdrop"
      className="doctor-action-modal"
      labelledBy="doctor-create-plan-title"
      onClose={submitting ? () => {} : onClose}
      closeOnBackdrop={!submitting}
      closeOnEscape={!submitting}
    >
      <header className="doctor-action-modal-header">
        <span aria-hidden="true"><FileText size={20} /></span>
        <h2 id="doctor-create-plan-title">Tạo kế hoạch phục hồi</h2>
        <button type="button" aria-label="Đóng" onClick={onClose} disabled={submitting}><X size={20} aria-hidden="true" /></button>
      </header>
      <form onSubmit={handleSubmit} noValidate>
        <Field label="Tên kế hoạch" required error={errors.planName}>
          <TextInput
            value={planName}
            maxLength={200}
            placeholder="Ví dụ: Kế hoạch phục hồi hô hấp 14 ngày"
            onChange={(event) => { setPlanName(event.target.value); setErrors((current) => ({ ...current, planName: "" })); }}
            autoFocus
          />
        </Field>
        <Field label="Tóm tắt" optional>
          <Textarea
            rows={3}
            maxLength={1000}
            value={summary}
            placeholder="Mô tả ngắn về mục tiêu và hướng tiếp cận của kế hoạch."
            onChange={(event) => setSummary(event.target.value)}
          />
        </Field>
        <Field label="Số ngày thực hiện" required error={errors.durationDays}>
          <TextInput
            type="number"
            min="1"
            value={durationDays}
            onChange={(event) => { setDurationDays(event.target.value); setErrors((current) => ({ ...current, durationDays: "" })); }}
          />
        </Field>
        <Field label="Hướng dẫn tái khám" optional>
          <Textarea
            rows={2}
            maxLength={500}
            value={recheckInstruction}
            placeholder="Ví dụ: Tái khám sau 14 ngày hoặc khi có dấu hiệu bất thường."
            onChange={(event) => setRecheckInstruction(event.target.value)}
          />
        </Field>
        <div className="doctor-action-modal-actions">
          <Button type="button" tone="secondary" onClick={onClose} disabled={submitting}>Hủy</Button>
          <Button type="submit" loading={submitting} loadingLabel="Đang tạo…">
            <Send size={16} aria-hidden="true" /> Tạo kế hoạch
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
