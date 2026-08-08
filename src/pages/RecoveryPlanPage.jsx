import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  CalendarCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileText,
  HeartPulse,
  Info,
  ListChecks,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import { useFeedback } from "../components/feedback/feedbackContext";
import { Button, Dialog, EmptyState, ErrorState, Field, LoadingState, Select, Textarea } from "../components/ui";
import { navigate } from "../router/navigation";
import { getApiErrorCode } from "../services/apiError";
import {
  recoveryPlanRequestsApi,
  recoveryPlansApi,
  subscriptionUsageApi,
} from "../services/api";
import {
  ensureRecoveryPlanConnection,
  subscribeToRecoveryPlanEvents,
} from "../services/recoveryPlanRealtime";
import "../styles/recovery-plan.css";

const PAGE_SIZE = 10;
const CANCELLABLE_REQUEST_STATUSES = new Set(["waitingForDoctor", "assigned", "inReview", "needMoreInformation"]);
const DISEASE_GROUPS = [
  { value: "respiratory", label: "Hô hấp" },
  { value: "musculoskeletal", label: "Cơ xương khớp" },
  { value: "infectiousDisease", label: "Bệnh truyền nhiễm" },
];
const REQUEST_STATUS = {
  waitingForDoctor: { label: "Đang chờ bác sĩ", tone: "waiting" },
  assigned: { label: "Bác sĩ đã tiếp nhận", tone: "progress" },
  inReview: { label: "Đang xem xét", tone: "progress" },
  needMoreInformation: { label: "Cần bổ sung thông tin", tone: "attention" },
  published: { label: "Đã có kế hoạch", tone: "success" },
  rejected: { label: "Không thể tiếp nhận", tone: "danger" },
  cancelled: { label: "Đã hủy", tone: "muted" },
  expired: { label: "Đã hết hạn", tone: "muted" },
};
const PLAN_STATUS = {
  readyToStart: { label: "Sẵn sàng bắt đầu", tone: "attention" },
  active: { label: "Đang thực hiện", tone: "progress" },
  completed: { label: "Đã hoàn thành", tone: "success" },
  cancelled: { label: "Đã hủy", tone: "muted" },
  superseded: { label: "Đã thay thế", tone: "muted" },
};
const CANCELLABLE_PLAN_STATUSES = new Set(["readyToStart", "active"]);
// Finished/inactive plans default to collapsed when shown in the plans
// list, since only the current readyToStart/active plan is actionable.
const HISTORICAL_PLAN_STATUSES = new Set(["cancelled", "completed", "superseded"]);
const RECOVERY_PLAN_CANCELLATION_REASONS = [
  { value: "NO_LONGER_NEEDED", label: "Không còn cần thiết" },
  { value: "HEALTH_CONDITION_CHANGED", label: "Tình trạng sức khỏe đã thay đổi" },
  { value: "PLAN_NOT_SUITABLE", label: "Kế hoạch không phù hợp" },
  { value: "UNABLE_TO_FOLLOW", label: "Không thể tiếp tục thực hiện" },
  { value: "STARTING_OTHER_TREATMENT", label: "Bắt đầu phương pháp điều trị khác" },
  { value: "OTHER", label: "Lý do khác" },
];
// Statuses that mean a user already has an open Recovery Plan workflow -
// mirrors the backend's single-active-workflow rule so the UI can hide/
// disable the "new request" form without waiting on a 409 first.
const BLOCKING_REQUEST_STATUSES = ["waitingForDoctor", "assigned", "inReview", "needMoreInformation"];
const BLOCKING_PLAN_STATUSES = ["readyToStart", "active"];

function getCancellationReasonLabel(code) {
  return RECOVERY_PLAN_CANCELLATION_REASONS.find((item) => item.value === code)?.label ?? code ?? "Không rõ lý do";
}

function normalizePaged(response, pageNumber) {
  const data = response?.data ?? {};
  if (Array.isArray(data)) {
    return {
      items: data,
      pageNumber,
      pageSize: data.length || PAGE_SIZE,
      totalCount: data.length,
      totalPages: 1,
    };
  }

  return {
    items: Array.isArray(data.items) ? data.items : [],
    pageNumber: Number(data.pageNumber) || pageNumber,
    pageSize: Number(data.pageSize) || PAGE_SIZE,
    totalCount: Number(data.totalCount) || 0,
    totalPages: Math.max(1, Number(data.totalPages) || 1),
  };
}

function normalizeQuota(response) {
  const data = response?.data;
  if (Array.isArray(data)) {
    return data.find((item) => String(item.quotaCode).toLowerCase().includes("recovery")) ?? data[0] ?? null;
  }
  return data ?? null;
}

function getDiseaseLabel(value) {
  return DISEASE_GROUPS.find((item) => item.value === value)?.label ?? "Chưa phân loại";
}

function formatDate(value, includeTime = false) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return includeTime
    ? date.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })
    : date.toLocaleDateString("vi-VN");
}

function getStatusDefinition(map, value) {
  return map[value] ?? { label: value || "Chưa cập nhật", tone: "muted" };
}

export function StatusBadge({ map, value }) {
  const definition = getStatusDefinition(map, value);
  return <span className={`recovery-status-badge is-${definition.tone}`}>{definition.label}</span>;
}

function createIdempotencyKey() {
  return crypto.randomUUID?.() ?? `recovery-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getRecoveryError(error, fallback) {
  const code = getApiErrorCode(error);
  if (code === "NO_ACTIVE_SUBSCRIPTION") {
    return { code, message: "Bạn cần một gói đang hoạt động để yêu cầu kế hoạch phục hồi." };
  }
  if (code === "RECOVERY_PLAN_QUOTA_NOT_CONFIGURED") {
    return { code, message: "Hạn mức kế hoạch phục hồi của gói hiện chưa sẵn sàng. Vui lòng thử lại sau." };
  }
  if (code === "RECOVERY_PLAN_QUOTA_EXHAUSTED") {
    return { code, message: "Bạn đã dùng hết lượt yêu cầu kế hoạch trong chu kỳ hiện tại." };
  }
  if (code === "INVALID_USER_TIME_ZONE") {
    return { code, message: "Múi giờ trong tài khoản chưa hợp lệ. Hãy cập nhật hồ sơ rồi thử lại." };
  }
  if (code === "INVALID_REQUEST_STATE") {
    return { code, message: "Thao tác này không còn phù hợp với trạng thái hiện tại. Dữ liệu sẽ được tải lại." };
  }
  if (code === "QUOTA_MUTATION_FAILED") {
    return { code, message: "Hạn mức chưa được cập nhật. Hãy tải lại trạng thái trước khi thử tiếp." };
  }
  if (code === "RECOVERY_PLAN_WORKFLOW_ALREADY_ACTIVE") {
    return { code, message: "Bạn đang có một yêu cầu hoặc kế hoạch phục hồi chưa kết thúc." };
  }
  if (code === "RECOVERY_PLAN_NOT_CANCELLABLE") {
    return { code, message: "Kế hoạch này không còn ở trạng thái có thể hủy." };
  }
  return { code, message: fallback };
}

function Pagination({ label, page, onChange, loading }) {
  if (page.totalPages <= 1) return null;
  return (
    <nav className="recovery-pagination" aria-label={label}>
      <Button
        tone="ghost"
        size="sm"
        disabled={loading || page.pageNumber <= 1}
        onClick={() => onChange(page.pageNumber - 1)}
      >
        <ChevronLeft size={16} aria-hidden="true" /> Trang trước
      </Button>
      <span>Trang {page.pageNumber}/{page.totalPages}</span>
      <Button
        tone="ghost"
        size="sm"
        disabled={loading || page.pageNumber >= page.totalPages}
        onClick={() => onChange(page.pageNumber + 1)}
      >
        Trang sau <ChevronRight size={16} aria-hidden="true" />
      </Button>
    </nav>
  );
}

function QuotaCard({ quota, error, loading, onRetry }) {
  if (loading) {
    return <LoadingState label="Đang kiểm tra lượt kế hoạch…" />;
  }

  if (error) {
    const needsPlan = error.code === "NO_ACTIVE_SUBSCRIPTION" || error.code === "RECOVERY_PLAN_QUOTA_EXHAUSTED";
    return (
      <section className="recovery-quota-card is-error" aria-labelledby="recovery-quota-title">
        <div className="recovery-card-icon"><ShieldCheck size={22} aria-hidden="true" /></div>
        <div>
          <p className="recovery-eyebrow">Lượt kế hoạch</p>
          <h2 id="recovery-quota-title">{needsPlan ? "Chưa thể tạo yêu cầu mới" : "Chưa tải được hạn mức"}</h2>
          <p>{error.message}</p>
          <div className="recovery-inline-actions">
            {needsPlan && <Button onClick={() => navigate("/pricing?returnTo=%2Frecovery-plan")}>Xem gói dịch vụ</Button>}
            <Button tone="secondary" onClick={onRetry}><RefreshCw size={16} aria-hidden="true" /> Thử lại</Button>
          </div>
        </div>
      </section>
    );
  }

  if (!quota) return null;
  const limit = Math.max(0, Number(quota.limitValue) || 0);
  const remaining = Math.max(0, Number(quota.remainingCount) || 0);
  const used = Math.max(0, Number(quota.usedCount) || 0);
  const reserved = Math.max(0, Number(quota.reservedCount) || 0);
  const percentage = limit ? Math.min(100, ((used + reserved) / limit) * 100) : 100;

  return (
    <section className="recovery-quota-card" aria-labelledby="recovery-quota-title">
      <div className="recovery-card-icon"><Sparkles size={22} aria-hidden="true" /></div>
      <div className="recovery-quota-content">
        <div className="recovery-quota-heading">
          <div>
            <p className="recovery-eyebrow">Lượt kế hoạch trong chu kỳ</p>
            <h2 id="recovery-quota-title">Còn {remaining} lượt có thể yêu cầu</h2>
          </div>
          <strong>{remaining}/{limit}</strong>
        </div>
        <div
          className="recovery-quota-track"
          role="progressbar"
          aria-label="Lượt kế hoạch đã dùng hoặc đang chờ xử lý"
          aria-valuemin="0"
          aria-valuemax={limit}
          aria-valuenow={used + reserved}
        >
          <span style={{ width: `${percentage}%` }} />
        </div>
        <dl className="recovery-quota-stats">
          <div><dt>Đã dùng</dt><dd>{used}</dd></div>
          <div><dt>Đang chờ xử lý</dt><dd>{reserved}</dd></div>
          <div><dt>Chu kỳ</dt><dd>{formatDate(quota.cycleStart)} – {formatDate(quota.cycleEnd)}</dd></div>
        </dl>
      </div>
    </section>
  );
}

function StatTile({ icon: Icon, label, value, tone = "info" }) {
  return (
    <div className={`recovery-stat-tile is-${tone}`}>
      <span className="recovery-stat-icon" aria-hidden="true"><Icon size={20} /></span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function CreateRequestForm({ disabled, disabledMessage, onCreated, onWorkflowConflict }) {
  const [diseaseGroup, setDiseaseGroup] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const submissionRef = useRef(null);
  const errorSummaryRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    const trimmedNote = requestNote.trim();
    if (!diseaseGroup) nextErrors.diseaseGroup = "Chọn nhóm bệnh cần hỗ trợ.";
    if (trimmedNote.length > 2000) nextErrors.requestNote = "Nội dung không được vượt quá 2.000 ký tự.";
    setErrors(nextErrors);
    setSubmitError(null);
    if (Object.keys(nextErrors).length) {
      window.setTimeout(() => errorSummaryRef.current?.focus(), 0);
      return;
    }

    const payload = {
      diseaseGroup,
      treatmentJourneyId: null,
      primaryLabTestSessionId: null,
      requestNote: trimmedNote || null,
    };
    const signature = JSON.stringify(payload);
    if (!submissionRef.current || submissionRef.current.signature !== signature) {
      submissionRef.current = { signature, key: createIdempotencyKey() };
    }

    setSubmitting(true);
    try {
      const response = await recoveryPlanRequestsApi.create(payload, submissionRef.current.key);
      submissionRef.current = null;
      setDiseaseGroup("");
      setRequestNote("");
      await onCreated(response?.data);
    } catch (error) {
      const mapped = getRecoveryError(error, "Chưa thể gửi yêu cầu. Bạn có thể thử lại mà không tạo yêu cầu trùng.");
      setSubmitError(mapped);
      if (mapped.code === "RECOVERY_PLAN_WORKFLOW_ALREADY_ACTIVE") {
        await onWorkflowConflict?.();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="recovery-create-card" aria-labelledby="recovery-create-title">
      <div className="recovery-section-heading">
        <div>
          <p className="recovery-eyebrow">Yêu cầu mới</p>
          <h2 id="recovery-create-title">Bạn muốn phục hồi sau nhóm bệnh nào?</h2>
          <p>Mô tả ngắn mục tiêu hoặc điều bạn muốn bác sĩ lưu ý khi xây dựng kế hoạch.</p>
        </div>
        <div className="recovery-card-icon"><FileText size={22} aria-hidden="true" /></div>
      </div>

      {disabled && <div className="recovery-form-blocked"><Info size={18} aria-hidden="true" /><span>{disabledMessage}</span></div>}

      <form onSubmit={handleSubmit} noValidate>
        {Object.entries(errors).filter(([, message]) => message).length > 0 && (
          <div ref={errorSummaryRef} className="recovery-error-summary" role="alert" tabIndex="-1">
            <strong>Kiểm tra lại thông tin yêu cầu:</strong>
            <ul>
              {Object.entries(errors)
                .filter(([, message]) => message)
                .map(([field, message]) => <li key={field}><a href={`#recovery-${field}`}>{message}</a></li>)}
            </ul>
          </div>
        )}
        <label className="recovery-field" htmlFor="recovery-diseaseGroup">
          <span>Nhóm bệnh <small>(bắt buộc)</small></span>
          <select
            id="recovery-diseaseGroup"
            value={diseaseGroup}
            required
            disabled={disabled}
            aria-invalid={Boolean(errors.diseaseGroup) || undefined}
            aria-describedby={errors.diseaseGroup ? "recovery-diseaseGroup-error" : undefined}
            onChange={(event) => {
              setDiseaseGroup(event.target.value);
              setErrors((current) => {
                const next = { ...current };
                delete next.diseaseGroup;
                return next;
              });
            }}
          >
            <option value="">Chọn nhóm bệnh</option>
            {DISEASE_GROUPS.map((group) => <option key={group.value} value={group.value}>{group.label}</option>)}
          </select>
          {errors.diseaseGroup && <small id="recovery-diseaseGroup-error" className="recovery-field-error">{errors.diseaseGroup}</small>}
        </label>
        <label className="recovery-field" htmlFor="recovery-requestNote">
          <span>Điều bạn muốn bác sĩ lưu ý</span>
          <textarea
            id="recovery-requestNote"
            rows="5"
            maxLength="2000"
            value={requestNote}
            disabled={disabled}
            aria-invalid={Boolean(errors.requestNote) || undefined}
            aria-describedby="recovery-requestNote-help"
            onChange={(event) => {
              setRequestNote(event.target.value);
              setErrors((current) => {
                const next = { ...current };
                delete next.requestNote;
                return next;
              });
            }}
          />
          <small id="recovery-requestNote-help" className={errors.requestNote ? "recovery-field-error" : ""}>
            {errors.requestNote || `${requestNote.length}/2.000 ký tự`}
          </small>
        </label>
        <div className="recovery-submit-row">
          <p role="status" aria-atomic="true">{submitError?.message ?? ""}</p>
          <Button type="submit" disabled={disabled} loading={submitting} loadingLabel="Đang gửi…">
            <Send size={17} aria-hidden="true" /> Gửi yêu cầu
          </Button>
        </div>
        {submitError?.code === "NO_ACTIVE_SUBSCRIPTION" && (
          <Button tone="secondary" onClick={() => navigate("/pricing?returnTo=%2Frecovery-plan")}>Xem gói dịch vụ</Button>
        )}
      </form>
    </section>
  );
}

function RequestDetail({ request, loading, onCancel, onProvideInformation, busy }) {
  const [additionalInformation, setAdditionalInformation] = useState(() => request?.requestNote ?? "");
  const [informationError, setInformationError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <LoadingState label="Đang tải chi tiết yêu cầu…" />;
  if (!request) return null;
  const canCancel = CANCELLABLE_REQUEST_STATUSES.has(request.status);
  const needsInformation = request.status === "needMoreInformation";

  async function submitInformation(event) {
    event.preventDefault();
    const trimmed = additionalInformation.trim();
    if (!trimmed) {
      setInformationError("Nhập thông tin bạn muốn gửi bổ sung.");
      return;
    }
    if (trimmed.length > 2000) {
      setInformationError("Nội dung không được vượt quá 2.000 ký tự.");
      return;
    }
    setSubmitting(true);
    try {
      await onProvideInformation(request.id, trimmed);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <article className="recovery-detail-card">
      <header className="recovery-detail-header">
        <div>
          <p className="recovery-eyebrow">Chi tiết yêu cầu</p>
          <h3>{getDiseaseLabel(request.diseaseGroup)}</h3>
        </div>
        <StatusBadge map={REQUEST_STATUS} value={request.status} />
      </header>
      <dl className="recovery-detail-grid">
        <div><dt>Ngày gửi</dt><dd>{formatDate(request.requestedAt, true)}</dd></div>
        <div><dt>Cập nhật gần nhất</dt><dd>{formatDate(request.reviewStartedAt || request.acceptedAt || request.requestedAt, true)}</dd></div>
        <div className="recovery-detail-wide"><dt>Nội dung hiện tại</dt><dd>{request.requestNote || "Bạn chưa thêm ghi chú."}</dd></div>
        {request.rejectionReason && <div className="recovery-detail-wide is-danger"><dt>Lý do không thể tiếp nhận</dt><dd>{request.rejectionReason}</dd></div>}
      </dl>

      {needsInformation && (
        <form className="recovery-information-form" onSubmit={submitInformation} noValidate>
          <div className="recovery-form-warning">
            <Info size={18} aria-hidden="true" />
            <span>Nội dung gửi đi sẽ thay thế phần ghi chú hiện tại, không tạo thành chuỗi trò chuyện.</span>
          </div>
          <label className="recovery-field" htmlFor={`recovery-information-${request.id}`}>
            <span>Thông tin bổ sung <small>(bắt buộc)</small></span>
            <textarea
              id={`recovery-information-${request.id}`}
              rows="4"
              maxLength="2000"
              required
              value={additionalInformation}
              aria-invalid={Boolean(informationError) || undefined}
              aria-describedby={informationError ? `recovery-information-error-${request.id}` : undefined}
              onChange={(event) => {
                setAdditionalInformation(event.target.value);
                setInformationError("");
              }}
            />
            {informationError && <small id={`recovery-information-error-${request.id}`} className="recovery-field-error">{informationError}</small>}
          </label>
          <Button type="submit" loading={submitting} loadingLabel="Đang gửi…">Gửi thông tin bổ sung</Button>
        </form>
      )}

      {canCancel && (
        <footer className="recovery-detail-actions">
          <Button tone="danger" disabled={busy} onClick={() => onCancel(request)}>Hủy yêu cầu</Button>
        </footer>
      )}
    </article>
  );
}

export function PlanDetail({ plan, loading, onStart, onCancel, onExpand, busy }) {
  const isHistorical = plan ? HISTORICAL_PLAN_STATUSES.has(plan.status) : false;
  const [collapsed, setCollapsed] = useState(isHistorical);

  useEffect(() => {
    queueMicrotask(() => setCollapsed(plan ? HISTORICAL_PLAN_STATUSES.has(plan.status) : false));
  }, [plan?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <LoadingState label="Đang tải nội dung kế hoạch…" />;
  if (!plan) return null;
  const phases = [...(plan.phases ?? [])].sort((left, right) => Number(left.sortOrder) - Number(right.sortOrder));
  const canStart = plan.status === "readyToStart";
  const canCancel = Boolean(onCancel) && CANCELLABLE_PLAN_STATUSES.has(plan.status);

  function toggleCollapsed() {
    if (collapsed) onExpand?.(); // was collapsed, now expanding
    setCollapsed((current) => !current);
  }

  return (
    <article className="recovery-plan-detail">
      <header className="recovery-detail-header">
        <div>
          <p className="recovery-eyebrow">Kế hoạch của bạn</p>
          <h3>{plan.planName || "Kế hoạch phục hồi"}</h3>
        </div>
        <StatusBadge map={PLAN_STATUS} value={plan.status} />
        {isHistorical && (
          <button
            type="button"
            className="recovery-plan-collapse-toggle"
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Mở rộng kế hoạch" : "Thu gọn kế hoạch"}
            onClick={toggleCollapsed}
          >
            <ChevronDown size={18} aria-hidden="true" />
          </button>
        )}
      </header>

      {(!isHistorical || !collapsed) && (
        <>
      <p className="recovery-plan-summary">{plan.summary || "Nội dung tổng quan sẽ được cập nhật trong kế hoạch."}</p>
      <dl className="recovery-detail-grid">
        <div><dt>Thời lượng</dt><dd>{plan.durationDays || 0} ngày</dd></div>
        <div><dt>Thời gian thực hiện</dt><dd>{plan.startDate ? `${formatDate(plan.startDate)} – ${formatDate(plan.endDate)}` : "Bắt đầu khi bạn sẵn sàng"}</dd></div>
        {plan.recheckInstruction && <div className="recovery-detail-wide"><dt>Hướng dẫn tái khám</dt><dd>{plan.recheckInstruction}</dd></div>}
      </dl>

      {plan.status === "cancelled" && (
        <section className="recovery-cancellation-detail">
          <strong>Kế hoạch đã được hủy</strong>
          <dl>
            <div>
              <dt>Thời điểm hủy</dt>
              <dd>{formatDate(plan.cancelledAt, true)}</dd>
            </div>
            <div>
              <dt>Lý do</dt>
              <dd>{getCancellationReasonLabel(plan.cancellationReasonCode)}</dd>
            </div>
            {plan.cancellationReason && (
              <div>
                <dt>Ghi chú</dt>
                <dd>{plan.cancellationReason}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {canStart && (
        <div className="recovery-start-card">
          <CalendarCheck size={22} aria-hidden="true" />
          <div><strong>Sẵn sàng bắt đầu?</strong><p>Ngày bắt đầu và kết thúc sẽ được tính theo múi giờ trong tài khoản của bạn.</p></div>
          <Button loading={busy} loadingLabel="Đang bắt đầu…" onClick={() => onStart(plan.id)}>Bắt đầu kế hoạch</Button>
        </div>
      )}

      {phases.length > 0 && (
        <section className="recovery-phases" aria-labelledby="recovery-phases-title">
          <div className="recovery-section-heading">
            <div><p className="recovery-eyebrow">Lộ trình</p><h4 id="recovery-phases-title">Các giai đoạn thực hiện</h4></div>
            <span>{phases.length} giai đoạn</span>
          </div>
          <div className="recovery-phase-list">
            {phases.map((phase, index) => (
              <article className="recovery-phase-card" key={phase.id}>
                <header>
                  <span className="recovery-phase-step" aria-hidden="true">{index + 1}</span>
                  <div className="recovery-phase-heading">
                    <span>Ngày {phase.startDay}–{phase.endDay}</span>
                    <h5>{phase.phaseName}</h5>
                  </div>
                </header>
                {phase.instruction && <p>{phase.instruction}</p>}
                <dl className="recovery-phase-rest">
                  {phase.sleepAndRestHoursPerDay != null && (
                    <div><dt>Ngủ nghỉ</dt><dd>{phase.sleepAndRestHoursPerDay} giờ/ngày</dd></div>
                  )}
                </dl>
                {(phase.nutrientTargets ?? []).length > 0 && (
                  <div className="recovery-nutrients">
                    <p className="recovery-subsection-label">Dinh dưỡng gợi ý</p>
                    <div className="recovery-nutrient-list">
                      {(phase.nutrientTargets ?? []).sort((left, right) => Number(left.sortOrder) - Number(right.sortOrder)).map((nutrient) => (
                        <div className="recovery-nutrient" key={nutrient.id}>
                          <div><span>{nutrient.nutrientName}</span><b>{nutrient.amountPerDay} {nutrient.unit}/ngày</b></div>
                          {nutrient.instruction && <p>{nutrient.instruction}</p>}
                          {(nutrient.foodSources ?? []).length > 0 && (
                            <>
                              <p className="recovery-food-list-label">Bạn có thể lựa chọn một trong các thực phẩm sau:</p>
                              <ul className="recovery-food-list">
                                {(nutrient.foodSources ?? []).sort((left, right) => Number(left.sortOrder) - Number(right.sortOrder)).map((food) => (
                                  <li className="recovery-food-item" key={food.id}>
                                    <strong>{food.foodName}</strong>
                                    {(food.suggestedServing || food.note) && (
                                      <span>{[food.suggestedServing, food.note].filter(Boolean).join(" — ")}</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {canCancel && (
        <footer className="recovery-detail-actions">
          <Button tone="danger" disabled={busy} onClick={() => onCancel(plan)}>Hủy kế hoạch</Button>
        </footer>
      )}
        </>
      )}
    </article>
  );
}

function CancelPlanDialog({ plan, submitting, onClose, onSubmit }) {
  const [reasonCode, setReasonCode] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState({});

  function handleSubmit(event) {
    event.preventDefault();
    const trimmedReason = reason.trim();
    const nextErrors = {};
    if (!reasonCode) nextErrors.reasonCode = "Vui lòng chọn lý do hủy.";
    if (reasonCode === "OTHER" && !trimmedReason) nextErrors.reason = "Vui lòng mô tả lý do khi chọn \"Lý do khác\".";
    if (trimmedReason.length > 2000) nextErrors.reason = "Ghi chú không được vượt quá 2.000 ký tự.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onSubmit(plan.id, reasonCode, trimmedReason);
  }

  return (
    <Dialog
      backdropClassName="recovery-cancel-modal-backdrop"
      className="recovery-cancel-modal"
      labelledBy="recovery-cancel-modal-title"
      onClose={submitting ? () => {} : onClose}
      closeOnBackdrop={!submitting}
      closeOnEscape={!submitting}
    >
      <header className="recovery-cancel-modal-header">
        <span aria-hidden="true"><XCircle size={20} /></span>
        <h2 id="recovery-cancel-modal-title">Hủy kế hoạch phục hồi</h2>
        <button type="button" aria-label="Đóng" onClick={onClose} disabled={submitting}><X size={20} aria-hidden="true" /></button>
      </header>
      <form onSubmit={handleSubmit} noValidate>
        <div className="recovery-form-warning">
          <Info size={18} aria-hidden="true" />
          <span>Lượt kế hoạch đã sử dụng không được hoàn lại. Kế hoạch vẫn được lưu trong lịch sử của bạn.</span>
        </div>
        <Field label="Lý do hủy" required error={errors.reasonCode}>
          <Select
            value={reasonCode}
            onChange={(event) => {
              setReasonCode(event.target.value);
              setErrors((current) => {
                const next = { ...current };
                delete next.reasonCode;
                return next;
              });
            }}
          >
            <option value="">Chọn lý do</option>
            {RECOVERY_PLAN_CANCELLATION_REASONS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Ghi chú" optional={reasonCode !== "OTHER"} required={reasonCode === "OTHER"} error={errors.reason}>
          <Textarea
            rows={4}
            maxLength={2000}
            value={reason}
            placeholder="Chia sẻ thêm lý do bạn muốn hủy kế hoạch này."
            onChange={(event) => {
              setReason(event.target.value);
              setErrors((current) => {
                const next = { ...current };
                delete next.reason;
                return next;
              });
            }}
          />
        </Field>
        <div className="recovery-cancel-modal-actions">
          <Button type="button" tone="secondary" onClick={onClose} disabled={submitting}>Đóng</Button>
          <Button type="submit" tone="danger" loading={submitting} loadingLabel="Đang hủy…">
            <XCircle size={16} aria-hidden="true" /> Hủy kế hoạch
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

const WEEKDAY_LABELS = ["Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy", "Chủ nhật"];

function parseDateOnly(value) {
  if (!value) return null;
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date, amount) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Phases store startDay/endDay as 1-based offsets from the plan's start
// date, not absolute dates - this turns each phase into a real [from, to]
// calendar range so it can be painted onto a month grid.
function getPhaseTimeline(plan) {
  const start = parseDateOnly(plan?.startDate);
  if (!start) return [];

  return [...(plan.phases ?? [])]
    .sort((left, right) => Number(left.sortOrder) - Number(right.sortOrder))
    .map((phase, index) => ({
      phase,
      index,
      from: addDays(start, Math.max(0, Number(phase.startDay) - 1)),
      to: addDays(start, Math.max(0, Number(phase.endDay) - 1)),
    }));
}

// Soft, cool-toned pastel hues (teal through violet) so adjacent phases
// stay visually distinguishable without feeling harsh - fits the calmer
// tone expected on a medical page. Cycles if a plan ever has more phases
// than colors. Each stop pairs a light background with a darker text of
// the same hue, same pattern as the app's existing tone badges.
const PHASE_COLORS = [
  { bg: "hsl(174, 48%, 72%)", text: "hsl(174, 60%, 20%)" }, // teal
  { bg: "hsl(206, 58%, 74%)", text: "hsl(206, 65%, 24%)" }, // blue
  { bg: "hsl(160, 42%, 70%)", text: "hsl(160, 50%, 20%)" }, // mint
  { bg: "hsl(230, 48%, 76%)", text: "hsl(230, 50%, 28%)" }, // indigo
  { bg: "hsl(260, 42%, 78%)", text: "hsl(260, 40%, 30%)" }, // violet
];

function getPhaseColor(index) {
  return PHASE_COLORS[index % PHASE_COLORS.length];
}

function RecoveryTimelineCalendar({ plan, loading }) {
  const timeline = useMemo(() => getPhaseTimeline(plan), [plan]);
  const [monthCursor, setMonthCursor] = useState(() => {
    const anchor = timeline[0]?.from ?? new Date();
    return new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  });

  useEffect(() => {
    const anchor = getPhaseTimeline(plan)[0]?.from ?? new Date();
    queueMicrotask(() => setMonthCursor(new Date(anchor.getFullYear(), anchor.getMonth(), 1)));
  }, [plan?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const weeks = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // Monday = 0
    const gridStart = addDays(firstOfMonth, -firstWeekday);
    const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
    const result = [];
    for (let i = 0; i < days.length; i += 7) result.push(days.slice(i, i + 7));
    return result;
  }, [monthCursor]);

  if (loading) return <LoadingState label="Đang tải lộ trình…" />;
  if (!plan) return null;

  if (plan.status === "cancelled") {
    return (
      <div className="recovery-timeline">
        <div className="recovery-timeline-intro">
          <p className="recovery-eyebrow">Lộ trình</p>
          <h4>{plan.planName || "Kế hoạch phục hồi"}</h4>
        </div>
        <EmptyState
          className="recovery-timeline-empty"
          icon={<CalendarCheck size={26} aria-hidden="true" />}
          title="Lộ trình không còn hiệu lực"
          description="Kế hoạch này đã bị hủy nên các mốc thời gian không còn được áp dụng."
        />
      </div>
    );
  }

  const today = new Date();
  const monthLabel = `Tháng ${monthCursor.getMonth() + 1} - ${monthCursor.getFullYear()}`;

  function findPhase(date) {
    const key = toDateKey(date);
    return timeline.find((entry) => key >= toDateKey(entry.from) && key <= toDateKey(entry.to)) ?? null;
  }

  return (
    <div className="recovery-timeline">
      <div className="recovery-timeline-intro">
        <p className="recovery-eyebrow">Lộ trình</p>
        <h4>{plan.planName || "Kế hoạch phục hồi"}</h4>
        <p>Mỗi màu tương ứng với một giai đoạn trong kế hoạch của bạn.</p>
      </div>

      <div className="recovery-timeline-calendar">
        <div className="recovery-timeline-header">
          <button
            type="button"
            onClick={() => setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
            aria-label="Tháng trước"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <strong>{monthLabel}</strong>
          <button
            type="button"
            onClick={() => setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
            aria-label="Tháng sau"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="recovery-timeline-weekdays" aria-hidden="true">
          {WEEKDAY_LABELS.map((label) => <span key={label}>{label}</span>)}
        </div>

        <div className="recovery-timeline-grid" role="grid" aria-label={monthLabel}>
          {weeks.map((week) => (
            <div className="recovery-timeline-week" role="row" key={toDateKey(week[0])}>
              {week.map((date) => {
                const entry = findPhase(date);
                const inMonth = date.getMonth() === monthCursor.getMonth();
                const isToday = toDateKey(date) === toDateKey(today);
                return (
                  <div
                    role="gridcell"
                    key={toDateKey(date)}
                    className={`recovery-timeline-day ${inMonth ? "" : "is-outside"} ${isToday ? "is-today" : ""}`.trim()}
                    style={entry ? { background: getPhaseColor(entry.index).bg, color: getPhaseColor(entry.index).text } : undefined}
                    title={entry ? `${entry.phase.phaseName || `Giai đoạn ${entry.index + 1}`} (Giai đoạn ${entry.index + 1})` : undefined}
                  >
                    {date.getDate()}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {timeline.length > 0 && (
        <div className="recovery-timeline-legend">
          {timeline.map((entry) => (
            <div className="recovery-timeline-legend-item" key={entry.phase.id}>
              <span className="recovery-timeline-swatch" style={{ background: getPhaseColor(entry.index).bg }} aria-hidden="true" />
              <div>
                <strong>Giai đoạn {entry.index + 1}{entry.phase.phaseName ? `: ${entry.phase.phaseName}` : ""}</strong>
                <small>{formatDate(entry.from)} – {formatDate(entry.to)}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RecoveryPlanPage() {
  const { confirmAction, showToast } = useFeedback();
  const [quota, setQuota] = useState(null);
  const [quotaError, setQuotaError] = useState(null);
  const [quotaLoading, setQuotaLoading] = useState(true);
  const [requestPageNumber, setRequestPageNumber] = useState(1);
  const [requestPage, setRequestPage] = useState(() => normalizePaged(null, 1));
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestDetailLoading, setRequestDetailLoading] = useState(false);
  // Plans are always shown as a single current-plan detail view (no
  // selector/pagination UI), so this never changes - kept as a named
  // constant rather than inlining `1` everywhere loadPlans is called.
  const planPageNumber = 1;
  const [planPage, setPlanPage] = useState(() => normalizePaged(null, 1));
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [planDetailLoading, setPlanDetailLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [statusMessage, setStatusMessage] = useState("");
  const [activeTab, setActiveTab] = useState("requests");
  const [workflowBlocked, setWorkflowBlocked] = useState(false);
  const [workflowGuardLoading, setWorkflowGuardLoading] = useState(true);
  const [cancelPlan, setCancelPlan] = useState(null);
  const refetchTimerRef = useRef(null);

  const loadQuota = useCallback(async () => {
    setQuotaLoading(true);
    setQuotaError(null);
    try {
      const response = await subscriptionUsageApi.me();
      setQuota(normalizeQuota(response));
    } catch (error) {
      setQuota(null);
      setQuotaError(getRecoveryError(error, "Chưa thể kiểm tra lượt kế hoạch. Vui lòng thử lại."));
    } finally {
      setQuotaLoading(false);
    }
  }, []);

  const loadRequests = useCallback(async (pageNumber = requestPageNumber, preferredId = "") => {
    setRequestsLoading(true);
    setRequestsError("");
    try {
      const response = await recoveryPlanRequestsApi.listMine({ pageNumber, pageSize: PAGE_SIZE });
      const nextPage = normalizePaged(response, pageNumber);
      setRequestPage(nextPage);
      const nextSelected = nextPage.items.find((item) => item.id === preferredId)
        ?? nextPage.items.find((item) => item.id === selectedRequest?.id)
        ?? nextPage.items[0]
        ?? null;
      setSelectedRequest(nextSelected);
      setStatusMessage(`Đã tải ${nextPage.items.length} yêu cầu phục hồi.`);
    } catch {
      setRequestPage(normalizePaged(null, pageNumber));
      setSelectedRequest(null);
      setRequestsError("Chưa thể tải các yêu cầu của bạn.");
    } finally {
      setRequestsLoading(false);
    }
  }, [requestPageNumber, selectedRequest?.id]);

  async function loadPlanDetail(planId, fallback) {
    setSelectedPlan(fallback ?? selectedPlan);
    setPlanDetailLoading(true);
    try {
      const response = await recoveryPlansApi.get(planId);
      setSelectedPlan(response?.data ?? fallback);
    } catch (error) {
      if (error?.status === 404 || getApiErrorCode(error) === "NOT_FOUND") {
        setSelectedPlan(null);
      } else {
        showToast({ type: "error", title: "Không tải được kế hoạch", message: "Vui lòng thử lại sau." });
      }
    } finally {
      setPlanDetailLoading(false);
    }
  }

  const loadPlans = useCallback(async (pageNumber = planPageNumber, preferredId = "") => {
    setPlansLoading(true);
    setPlansError("");
    try {
      const response = await recoveryPlansApi.listMine({ pageNumber, pageSize: PAGE_SIZE });
      const nextPage = normalizePaged(response, pageNumber);
      setPlanPage(nextPage);
      const nextSelected = nextPage.items.find((item) => item.id === preferredId)
        ?? nextPage.items.find((item) => item.id === selectedPlan?.id)
        ?? nextPage.items[0]
        ?? null;
      if (nextSelected?.id) {
        await loadPlanDetail(nextSelected.id, nextSelected);
      } else {
        setSelectedPlan(null);
      }
    } catch {
      setPlanPage(normalizePaged(null, pageNumber));
      setSelectedPlan(null);
      setPlansError("Chưa thể tải các kế hoạch của bạn.");
    } finally {
      setPlansLoading(false);
    }
  }, [planPageNumber, selectedPlan?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Only one Recovery Plan workflow (request or plan) can be open per user.
  // The backend is the source of truth (every mutating call still handles a
  // 409), but probing these blocking statuses up front lets the UI hide/
  // disable the "new request" form instead of always failing the request.
  async function loadWorkflowGuard() {
    setWorkflowGuardLoading(true);
    try {
      const responses = await Promise.all([
        ...BLOCKING_REQUEST_STATUSES.map((status) => recoveryPlanRequestsApi.listMine({ pageNumber: 1, pageSize: 1, status })),
        ...BLOCKING_PLAN_STATUSES.map((status) => recoveryPlansApi.listMine({ pageNumber: 1, pageSize: 1, status })),
      ]);
      const blocked = responses.some((response) => {
        const page = normalizePaged(response, 1);
        return page.totalCount > 0 || page.items.length > 0;
      });
      setWorkflowBlocked(blocked);
      return blocked;
    } finally {
      setWorkflowGuardLoading(false);
    }
  }

  async function loadRequestDetail(requestId, fallback) {
    setSelectedRequest(fallback ?? selectedRequest);
    setRequestDetailLoading(true);
    try {
      const response = await recoveryPlanRequestsApi.get(requestId);
      setSelectedRequest(response?.data ?? fallback);
    } catch (error) {
      if (error?.status === 404 || getApiErrorCode(error) === "NOT_FOUND") {
        await loadRequests(requestPageNumber);
      } else {
        showToast({ type: "error", title: "Không tải được yêu cầu", message: "Vui lòng thử lại sau." });
      }
    } finally {
      setRequestDetailLoading(false);
    }
  }

  const refetchAll = useCallback(async () => {
    await Promise.allSettled([
      loadQuota(),
      loadRequests(requestPageNumber, selectedRequest?.id),
      loadPlans(planPageNumber, selectedPlan?.id),
      loadWorkflowGuard(),
    ]);
  }, [loadPlans, loadQuota, loadRequests, planPageNumber, requestPageNumber, selectedPlan?.id, selectedRequest?.id]);

  useEffect(() => {
    queueMicrotask(() => void Promise.allSettled([loadQuota(), loadRequests(1), loadPlans(1), loadWorkflowGuard()]));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const unsubscribe = subscribeToRecoveryPlanEvents((event) => {
      if (event.type === "connection") {
        setConnectionStatus(event.status);
      }
      if (event.type === "request" || event.type === "plan" || event.refetch) {
        window.clearTimeout(refetchTimerRef.current);
        refetchTimerRef.current = window.setTimeout(() => {
          void refetchAll();
        }, 250);
      }
    });

    ensureRecoveryPlanConnection().then(setConnectionStatus);
    return () => {
      unsubscribe();
      window.clearTimeout(refetchTimerRef.current);
    };
  }, [refetchAll]);

  async function handleCreated(createdRequest) {
    showToast({ type: "success", title: "Đã gửi yêu cầu", message: "Bạn có thể theo dõi trạng thái ngay trên trang này." });
    await Promise.allSettled([
      loadQuota(),
      loadRequests(1, createdRequest?.id),
      loadWorkflowGuard(),
    ]);
    setRequestPageNumber(1);
  }

  async function handleCancel(request) {
    const confirmed = await confirmAction({
      title: "Hủy yêu cầu kế hoạch?",
      message: "Lượt đang giữ chỗ sẽ được trả lại nếu yêu cầu chưa được xuất bản.",
      confirmLabel: "Hủy yêu cầu",
      tone: "danger",
    });
    if (!confirmed) return;
    setActionBusy(true);
    try {
      await recoveryPlanRequestsApi.cancel(request.id);
      showToast({ type: "success", title: "Đã hủy yêu cầu", message: "Hạn mức đang được cập nhật lại." });
      await Promise.allSettled([loadQuota(), loadRequests(requestPageNumber, request.id)]);
    } catch (error) {
      const mapped = getRecoveryError(error, "Chưa thể hủy yêu cầu. Vui lòng thử lại.");
      showToast({ type: "error", title: "Không thể hủy yêu cầu", message: mapped.message });
      if (["INVALID_REQUEST_STATE", "NOT_FOUND"].includes(mapped.code)) await loadRequests(requestPageNumber);
    } finally {
      setActionBusy(false);
    }
  }

  async function handleProvideInformation(requestId, additionalInformation) {
    setActionBusy(true);
    try {
      const response = await recoveryPlanRequestsApi.provideInformation(requestId, additionalInformation);
      setSelectedRequest(response?.data ?? selectedRequest);
      showToast({ type: "success", title: "Đã gửi thông tin", message: "Yêu cầu đã được chuyển lại để xem xét." });
      await loadRequests(requestPageNumber, requestId);
    } catch (error) {
      const mapped = getRecoveryError(error, "Chưa thể gửi thông tin bổ sung. Vui lòng thử lại.");
      showToast({ type: "error", title: "Không thể gửi thông tin", message: mapped.message });
      if (["INVALID_REQUEST_STATE", "NOT_FOUND"].includes(mapped.code)) await loadRequests(requestPageNumber);
    } finally {
      setActionBusy(false);
    }
  }

  async function handleStart(planId) {
    setActionBusy(true);
    try {
      await recoveryPlansApi.start(planId);
      showToast({ type: "success", title: "Kế hoạch đã bắt đầu", message: "Ngày thực hiện đã được tính theo múi giờ tài khoản của bạn." });
      await Promise.allSettled([loadPlans(planPageNumber, planId), loadQuota()]);
    } catch (error) {
      const mapped = getRecoveryError(error, "Chưa thể bắt đầu kế hoạch. Vui lòng thử lại.");
      showToast({ type: "error", title: "Không thể bắt đầu kế hoạch", message: mapped.message });
      if (["INVALID_REQUEST_STATE", "RECOVERY_PLAN_WORKFLOW_ALREADY_ACTIVE"].includes(mapped.code)) {
        await Promise.allSettled([loadPlans(planPageNumber, planId), loadWorkflowGuard()]);
      }
    } finally {
      setActionBusy(false);
    }
  }

  async function handleCancelPlan(planId, reasonCode, reason) {
    setActionBusy(true);
    try {
      const response = await recoveryPlansApi.cancel(planId, {
        cancellationReasonCode: reasonCode,
        cancellationReason: reason.trim() || null,
      });
      setSelectedPlan(response?.data ?? null);
      setCancelPlan(null);
      showToast({
        type: "success",
        title: "Đã hủy kế hoạch",
        message: "Kế hoạch vẫn được lưu trong lịch sử. Lượt đã dùng không được hoàn lại.",
      });
      await Promise.allSettled([loadPlans(planPageNumber, planId), loadWorkflowGuard()]);
    } catch (error) {
      const mapped = getRecoveryError(error, "Chưa thể hủy kế hoạch. Vui lòng thử lại.");
      showToast({ type: "error", title: "Không thể hủy kế hoạch", message: mapped.message });
      if (["NOT_FOUND", "RECOVERY_PLAN_NOT_CANCELLABLE"].includes(mapped.code)) {
        setCancelPlan(null);
        await loadPlans(planPageNumber);
      }
    } finally {
      setActionBusy(false);
    }
  }

  const requestCreationDisabled = workflowGuardLoading
    || workflowBlocked
    || quotaLoading
    || Boolean(quotaError)
    || !quota
    || Number(quota.remainingCount) <= 0;
  const requestDisabledMessage = workflowBlocked
    ? "Bạn đang có một yêu cầu hoặc kế hoạch phục hồi chưa kết thúc."
    : workflowGuardLoading
      ? "Đang kiểm tra trạng thái kế hoạch của bạn."
      : quotaLoading
        ? "Đang kiểm tra lượt kế hoạch của bạn."
        : quotaError?.message
          ?? (!quota ? "Chưa có thông tin lượt kế hoạch." : "Bạn đã dùng hết lượt trong chu kỳ hiện tại.");
  const realtimeLabel = connectionStatus === "connected"
    ? "Cập nhật tự động đang bật"
    : connectionStatus === "reconnecting"
      ? "Đang nối lại cập nhật tự động"
      : "Bạn có thể dùng nút tải lại để xem thay đổi mới";

  const requestItems = useMemo(() => requestPage.items, [requestPage.items]);
  const planItems = useMemo(() => planPage.items, [planPage.items]);

  return (
    <div className="recovery-page">
      <header className="recovery-page-header">
        <HeartPulse className="recovery-hero-icon" size={160} strokeWidth={1.3} aria-hidden="true" />
        <div>
          <p className="recovery-eyebrow"><HeartPulse size={16} aria-hidden="true" /> Đồng hành sau điều trị</p>
          <h1>Kế hoạch phục hồi của bạn</h1>
          <p>Gửi yêu cầu, theo dõi quá trình xây dựng kế hoạch và bắt đầu khi nội dung đã sẵn sàng.</p>
        </div>
        <div className={`recovery-realtime-status is-${connectionStatus}`}>
          <span aria-hidden="true" />
          <p role="status" aria-atomic="true">{realtimeLabel}</p>
        </div>
      </header>

      <p className="sr-only" role="status" aria-atomic="true">{statusMessage}</p>

      <div className="recovery-stats-row">
        <QuotaCard quota={quota} error={quotaError} loading={quotaLoading} onRetry={loadQuota} />
        <StatTile icon={ListChecks} label="Tổng yêu cầu đã gửi" value={requestPage.totalCount} tone="warning" />
        <StatTile icon={FileText} label="Tổng kế hoạch đã nhận" value={planPage.totalCount} tone="success" />
      </div>

      <div className="recovery-workspace-layout">
        <div className="recovery-workspace-main">
          <div className="recovery-workspace-head">
            <div className="recovery-workspace-tabs" role="tablist" aria-label="Khu vực làm việc">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "requests"}
                className={activeTab === "requests" ? "is-active" : ""}
                onClick={() => setActiveTab("requests")}
              >
                Yêu cầu của bạn
                {requestPage.totalCount > 0 && <span className="recovery-tab-count">{requestPage.totalCount}</span>}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "plans"}
                className={activeTab === "plans" ? "is-active" : ""}
                onClick={() => setActiveTab("plans")}
              >
                Kế hoạch của bạn
                {planPage.totalCount > 0 && <span className="recovery-tab-count">{planPage.totalCount}</span>}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "timeline"}
                className={activeTab === "timeline" ? "is-active" : ""}
                onClick={() => setActiveTab("timeline")}
              >
                Lộ trình của bạn
              </button>
            </div>
            {activeTab === "requests" ? (
              <Button tone="secondary" size="sm" onClick={() => loadRequests(requestPageNumber, selectedRequest?.id)} disabled={requestsLoading}>
                <RefreshCw size={16} aria-hidden="true" /> Tải lại
              </Button>
            ) : activeTab === "plans" ? (
              <Button tone="secondary" size="sm" onClick={() => loadPlans(planPageNumber, selectedPlan?.id)} disabled={plansLoading}>
                <RefreshCw size={16} aria-hidden="true" /> Tải lại
              </Button>
            ) : null}
          </div>

          {activeTab === "requests" ? (
            <section className="recovery-workspace-panel" role="tabpanel" aria-label="Yêu cầu của bạn">
              {requestsLoading && requestItems.length === 0 ? (
                <LoadingState label="Đang tải yêu cầu…" />
              ) : requestsError ? (
                <ErrorState title="Không thể tải yêu cầu" description={requestsError} action={<Button onClick={() => loadRequests(requestPageNumber)}>Thử lại</Button>} />
              ) : requestItems.length === 0 ? (
                <EmptyState icon={<ListChecks size={26} aria-hidden="true" />} title="Chưa có yêu cầu phục hồi" description="Yêu cầu mới của bạn sẽ xuất hiện tại đây." />
              ) : (
                <div className="recovery-split-view">
                  <div className="recovery-item-list" role="group" aria-label="Danh sách yêu cầu phục hồi">
                    {requestItems.map((request) => (
                      <button
                        type="button"
                        key={request.id}
                        className={`recovery-item-button ${selectedRequest?.id === request.id ? "is-selected" : ""}`}
                        aria-pressed={selectedRequest?.id === request.id}
                        onClick={() => loadRequestDetail(request.id, request)}
                      >
                        <span><strong>{getDiseaseLabel(request.diseaseGroup)}</strong><small>{formatDate(request.requestedAt, true)}</small></span>
                        <StatusBadge map={REQUEST_STATUS} value={request.status} />
                      </button>
                    ))}
                    <Pagination
                      label="Phân trang yêu cầu phục hồi"
                      page={requestPage}
                      loading={requestsLoading}
                      onChange={(nextPage) => {
                        setRequestPageNumber(nextPage);
                        void loadRequests(nextPage);
                      }}
                    />
                  </div>
                  <RequestDetail
                    key={selectedRequest?.id || "empty-request"}
                    request={selectedRequest}
                    loading={requestDetailLoading}
                    busy={actionBusy}
                    onCancel={handleCancel}
                    onProvideInformation={handleProvideInformation}
                  />
                </div>
              )}
            </section>
          ) : activeTab === "plans" ? (
            <section className="recovery-workspace-panel" role="tabpanel" aria-label="Kế hoạch của bạn">
              {plansLoading && planItems.length === 0 ? (
                <LoadingState label="Đang tải kế hoạch…" />
              ) : plansError ? (
                <ErrorState title="Không thể tải kế hoạch" description={plansError} action={<Button onClick={() => loadPlans(planPageNumber)}>Thử lại</Button>} />
              ) : planItems.length === 0 ? (
                <EmptyState icon={<FileText size={26} aria-hidden="true" />} title="Chưa có kế hoạch được xuất bản" description="Khi yêu cầu được hoàn tất, kế hoạch sẽ xuất hiện tại đây để bạn xem và bắt đầu." />
              ) : (
                // Stacked list, no selector bar - PlanDetail already renders
                // its own name/duration/status header, so a bar above it
                // would just repeat the same line twice. Historical plans
                // (cancelled/completed/superseded) collapse by default; the
                // one matching selectedPlan already has full detail loaded,
                // others only have summary data until expanded.
                <div className="recovery-plan-list">
                  {planItems.map((item) => {
                    const isSelected = item.id === selectedPlan?.id;
                    return (
                      <PlanDetail
                        key={item.id}
                        plan={isSelected ? selectedPlan : item}
                        loading={isSelected && planDetailLoading}
                        busy={actionBusy}
                        onStart={handleStart}
                        onCancel={setCancelPlan}
                        onExpand={isSelected ? undefined : () => loadPlanDetail(item.id, item)}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          ) : (
            <section className="recovery-workspace-panel" role="tabpanel" aria-label="Lộ trình của bạn">
              {planItems.length === 0 ? (
                <EmptyState icon={<CalendarCheck size={26} aria-hidden="true" />} title="Chưa có lộ trình để hiển thị" description="Lộ trình sẽ hiện ra dưới dạng lịch khi bạn có kế hoạch phục hồi." />
              ) : (
                <RecoveryTimelineCalendar plan={selectedPlan} loading={planDetailLoading} />
              )}
            </section>
          )}
        </div>

        <div className="recovery-workspace-sidebar">
          {!workflowBlocked && (
            <CreateRequestForm
              disabled={requestCreationDisabled}
              disabledMessage={requestDisabledMessage}
              onCreated={handleCreated}
              onWorkflowConflict={async () => {
                setWorkflowBlocked(true);
                await Promise.allSettled([loadRequests(1), loadPlans(1), loadWorkflowGuard()]);
              }}
            />
          )}
          <section className="recovery-guidance-card" aria-labelledby="recovery-guidance-title">
            <p className="recovery-eyebrow">Trong thời gian chờ</p>
            <h2 id="recovery-guidance-title">Chuẩn bị thông tin để kế hoạch sát với bạn hơn</h2>
            <ul>
              <li><ClipboardCheck size={19} aria-hidden="true" /><span><strong>Giữ lại hướng dẫn sau khám</strong><small>Đơn thuốc, lịch hẹn và các chỉ dẫn đã nhận.</small></span></li>
              <li><Activity size={19} aria-hidden="true" /><span><strong>Ghi nhận thay đổi đáng chú ý</strong><small>Thời điểm, mức độ và diễn biến gần đây.</small></span></li>
              <li><CalendarCheck size={19} aria-hidden="true" /><span><strong>Theo dõi mốc tái khám</strong><small>Chuẩn bị câu hỏi cho lần trao đổi tiếp theo.</small></span></li>
            </ul>
          </section>

          <section className="recovery-medical-note">
            <ShieldCheck size={21} aria-hidden="true" />
            <div><strong>Thông tin hỗ trợ, không thay thế chăm sóc y tế</strong><p>Nếu có dấu hiệu nghiêm trọng hoặc diễn biến bất thường, hãy liên hệ cơ sở y tế hoặc dịch vụ cấp cứu phù hợp.</p></div>
          </section>
        </div>
      </div>

      {cancelPlan && (
        <CancelPlanDialog
          plan={cancelPlan}
          submitting={actionBusy}
          onClose={() => setCancelPlan(null)}
          onSubmit={handleCancelPlan}
        />
      )}
    </div>
  );
}
