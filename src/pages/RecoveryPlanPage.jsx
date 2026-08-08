import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  CalendarCheck,
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
} from "lucide-react";
import { useFeedback } from "../components/feedback/feedbackContext";
import { Button, EmptyState, ErrorState, LoadingState } from "../components/ui";
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
  waitingForDoctor: { label: "Đang chờ bác sĩ xem xét", tone: "waiting" },
  assigned: { label: "Bác sĩ đã tiếp nhận", tone: "progress" },
  inReview: { label: "Bác sĩ đang chuẩn bị kế hoạch", tone: "progress" },
  needMoreInformation: { label: "Cần bổ sung thông tin", tone: "attention" },
  published: { label: "Kế hoạch đã sẵn sàng", tone: "success" },
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
    return { code, message: "Bạn đã gửi hết số yêu cầu được phép trong chu kỳ hiện tại." };
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

function handleWorkspaceTabKeyDown(event) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;

  const tabs = Array.from(event.currentTarget.querySelectorAll('[role="tab"]'));
  const currentIndex = tabs.indexOf(document.activeElement);
  if (currentIndex < 0) return;

  event.preventDefault();
  const nextIndex = event.key === "Home"
    ? 0
    : event.key === "End"
      ? tabs.length - 1
      : event.key === "ArrowRight"
        ? (currentIndex + 1) % tabs.length
        : (currentIndex - 1 + tabs.length) % tabs.length;

  tabs[nextIndex]?.focus();
  tabs[nextIndex]?.click();
}

function QuotaCard({ quota, error, loading, onRetry }) {
  if (loading) {
    return (
      <section className="recovery-quota-card" aria-label="Đang kiểm tra số yêu cầu còn lại">
        <div className="recovery-card-icon"><ShieldCheck size={22} aria-hidden="true" /></div>
        <LoadingState label="Đang kiểm tra số yêu cầu còn lại…" />
      </section>
    );
  }

  if (error) {
    const needsPlan = error.code === "NO_ACTIVE_SUBSCRIPTION" || error.code === "RECOVERY_PLAN_QUOTA_EXHAUSTED";
    return (
      <section className="recovery-quota-card is-error" aria-labelledby="recovery-quota-title">
        <div className="recovery-card-icon"><ShieldCheck size={22} aria-hidden="true" /></div>
        <div>
          <p className="recovery-eyebrow">Yêu cầu còn lại</p>
          <h2 id="recovery-quota-title">{needsPlan ? "Chưa thể gửi yêu cầu mới" : "Chưa thể tải thông tin"}</h2>
          <p>{needsPlan ? error.message : "Vui lòng thử lại để kiểm tra số yêu cầu bạn còn có thể gửi."}</p>
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
            <p className="recovery-eyebrow">Yêu cầu còn lại</p>
            <h2 id="recovery-quota-title">Bạn có thể gửi thêm {remaining} yêu cầu</h2>
          </div>
          <strong>{remaining}/{limit}</strong>
        </div>
        <div
          className="recovery-quota-track"
          role="progressbar"
          aria-label="Số yêu cầu đã dùng hoặc đang chờ bác sĩ xem xét"
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

function CreateRequestForm({ disabled, disabledMessage, onCreated }) {
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
      setSubmitError(getRecoveryError(error, "Chưa thể gửi yêu cầu. Bạn có thể thử lại mà không tạo yêu cầu trùng."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="recovery-create-card" aria-labelledby="recovery-create-title">
      <div className="recovery-section-heading">
        <div>
          <p className="recovery-eyebrow">Yêu cầu mới</p>
          <h2 id="recovery-create-title">Gửi thông tin cho bác sĩ</h2>
          <p>Chọn nhóm bệnh và ghi lại những điều bạn muốn bác sĩ lưu ý khi chuẩn bị kế hoạch.</p>
        </div>
        <div className="recovery-card-icon"><FileText size={22} aria-hidden="true" /></div>
      </div>

      {disabled && disabledMessage && <div className="recovery-form-blocked"><Info size={18} aria-hidden="true" /><span>{disabledMessage}</span></div>}

      <form onSubmit={handleSubmit} noValidate>
        {Object.keys(errors).length > 0 && (
          <div ref={errorSummaryRef} className="recovery-error-summary" role="alert" tabIndex="-1">
            <strong>Kiểm tra lại thông tin yêu cầu:</strong>
            <ul>
              {Object.entries(errors).map(([field, message]) => <li key={field}><a href={`#recovery-${field}`}>{message}</a></li>)}
            </ul>
          </div>
        )}
        <label className="recovery-field recovery-disease-field" htmlFor="recovery-diseaseGroup">
          <span>Nhóm bệnh <span className="recovery-required-marker" aria-hidden="true">*</span><span className="sr-only"> (bắt buộc)</span></span>
          <select
            id="recovery-diseaseGroup"
            value={diseaseGroup}
            required
            disabled={disabled}
            aria-invalid={Boolean(errors.diseaseGroup) || undefined}
            aria-describedby={errors.diseaseGroup ? "recovery-diseaseGroup-error" : undefined}
            onChange={(event) => {
              setDiseaseGroup(event.target.value);
              setErrors((current) => ({ ...current, diseaseGroup: "" }));
            }}
          >
            <option value="">Chọn nhóm bệnh</option>
            {DISEASE_GROUPS.map((group) => <option key={group.value} value={group.value}>{group.label}</option>)}
          </select>
          {errors.diseaseGroup && <small id="recovery-diseaseGroup-error" className="recovery-field-error">{errors.diseaseGroup}</small>}
        </label>
        <label className="recovery-field recovery-note-field" htmlFor="recovery-requestNote">
          <span>Thông tin bạn muốn bác sĩ lưu ý</span>
          <textarea
            id="recovery-requestNote"
            rows="5"
            maxLength="2000"
            placeholder="Ví dụ: Tôi vẫn còn đau khi đi lại lâu và muốn biết những hoạt động nào nên hạn chế…"
            value={requestNote}
            disabled={disabled}
            aria-invalid={Boolean(errors.requestNote) || undefined}
            aria-describedby="recovery-requestNote-guidance recovery-requestNote-help"
            onChange={(event) => {
              setRequestNote(event.target.value);
              setErrors((current) => ({ ...current, requestNote: "" }));
            }}
          />
          <small id="recovery-requestNote-guidance" className="recovery-field-guidance">Ghi lại những thay đổi, khó khăn hoặc vấn đề bạn muốn bác sĩ xem xét.</small>
          <small id="recovery-requestNote-help" className={`recovery-character-count${errors.requestNote ? " recovery-field-error" : ""}`}>
            {errors.requestNote || `${requestNote.length} / 2.000 ký tự`}
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

export function PlanDetail({ plan, loading, onStart, busy }) {
  if (loading) return <LoadingState label="Đang tải nội dung kế hoạch…" />;
  if (!plan) return null;
  const phases = [...(plan.phases ?? [])].sort((left, right) => Number(left.sortOrder) - Number(right.sortOrder));
  const canStart = plan.status === "readyToStart";

  return (
    <article className="recovery-plan-detail">
      <header className="recovery-detail-header">
        <div>
          <p className="recovery-eyebrow">Kế hoạch đã nhận</p>
          <h3>{plan.planName || "Kế hoạch phục hồi"}</h3>
        </div>
        <StatusBadge map={PLAN_STATUS} value={plan.status} />
      </header>

      <p className="recovery-plan-summary">{plan.summary || "Nội dung tổng quan sẽ được cập nhật trong kế hoạch."}</p>
      <dl className="recovery-detail-grid">
        <div><dt>Thời lượng</dt><dd>{plan.durationDays || 0} ngày</dd></div>
        <div><dt>Thời gian thực hiện</dt><dd>{plan.startDate ? `${formatDate(plan.startDate)} – ${formatDate(plan.endDate)}` : "Bắt đầu khi bạn sẵn sàng"}</dd></div>
        {plan.recheckInstruction && <div className="recovery-detail-wide"><dt>Hướng dẫn tái khám</dt><dd>{plan.recheckInstruction}</dd></div>}
      </dl>

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
            {phases.map((phase) => (
              <article className="recovery-phase-card" key={phase.id}>
                <header>
                  <span>Ngày {phase.startDay}–{phase.endDay}</span>
                  <h5>{phase.phaseName}</h5>
                </header>
                {phase.instruction && <p>{phase.instruction}</p>}
                <dl className="recovery-phase-rest">
                  {phase.sleepHoursPerDay != null && <div><dt>Ngủ</dt><dd>{phase.sleepHoursPerDay} giờ/ngày</dd></div>}
                  {phase.restHoursPerDay != null && <div><dt>Nghỉ ngơi</dt><dd>{phase.restHoursPerDay} giờ/ngày</dd></div>}
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
    </article>
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
  const [planPageNumber, setPlanPageNumber] = useState(1);
  const [planPage, setPlanPage] = useState(() => normalizePaged(null, 1));
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [planDetailLoading, setPlanDetailLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [statusMessage, setStatusMessage] = useState("");
  const [activeTab, setActiveTab] = useState("requests");
  const refetchTimerRef = useRef(null);

  const loadQuota = useCallback(async () => {
    setQuotaLoading(true);
    setQuotaError(null);
    try {
      const response = await subscriptionUsageApi.me();
      setQuota(normalizeQuota(response));
    } catch (error) {
      setQuota(null);
      setQuotaError(getRecoveryError(error, "Chưa thể kiểm tra số yêu cầu còn lại. Vui lòng thử lại."));
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

  const refetchAll = useCallback(async () => {
    await Promise.allSettled([
      loadQuota(),
      loadRequests(requestPageNumber, selectedRequest?.id),
      loadPlans(planPageNumber, selectedPlan?.id),
    ]);
  }, [loadPlans, loadQuota, loadRequests, planPageNumber, requestPageNumber, selectedPlan?.id, selectedRequest?.id]);

  useEffect(() => {
    queueMicrotask(() => void Promise.allSettled([loadQuota(), loadRequests(1), loadPlans(1)]));
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
    showToast({ type: "success", title: "Đã gửi yêu cầu", message: "Bác sĩ có thể xem thông tin bạn vừa gửi để chuẩn bị kế hoạch." });
    await Promise.allSettled([
      loadQuota(),
      loadRequests(1, createdRequest?.id),
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
      if (mapped.code === "INVALID_REQUEST_STATE") await loadPlans(planPageNumber, planId);
    } finally {
      setActionBusy(false);
    }
  }

  const requestCreationDisabled = quotaLoading || Boolean(quotaError) || !quota || Number(quota.remainingCount) <= 0;
  const requestDisabledMessage = quotaLoading
    ? "Đang kiểm tra số yêu cầu còn lại."
    : quotaError
      ? null
      : (!quota ? "Chưa có thông tin về số yêu cầu còn lại." : "Bạn đã gửi hết số yêu cầu trong chu kỳ hiện tại.");
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
          <p className="recovery-eyebrow"><HeartPulse size={16} aria-hidden="true" /> Theo dõi sau điều trị</p>
          <h2>Kế hoạch phục hồi</h2>
          <p className="recovery-hero-copy">Theo dõi yêu cầu của bạn và xem kế hoạch sau khi bác sĩ hoàn tất.</p>
          <ol className="recovery-process" aria-label="Quy trình nhận kế hoạch phục hồi">
            <li><span>1</span><strong>Gửi yêu cầu</strong></li>
            <li><span>2</span><strong>Bác sĩ xem xét</strong></li>
            <li><span>3</span><strong>Nhận kế hoạch</strong></li>
          </ol>
        </div>
      </header>

      <p className="sr-only" role="status" aria-atomic="true">{statusMessage}</p>
      <p className="sr-only" role="status" aria-atomic="true">{realtimeLabel}</p>

      <div className="recovery-stats-row">
        <QuotaCard quota={quota} error={quotaError} loading={quotaLoading} onRetry={loadQuota} />
        <div className="recovery-overview-metrics" aria-label="Tổng quan kế hoạch phục hồi">
          <StatTile icon={ListChecks} label="Yêu cầu đã gửi" value={requestPage.totalCount} tone="warning" />
          <StatTile icon={FileText} label="Kế hoạch đã nhận" value={planPage.totalCount} tone="success" />
        </div>
      </div>

      <div className="recovery-workspace-layout">
        <div className="recovery-request-sidebar">
          <CreateRequestForm
            disabled={requestCreationDisabled}
            disabledMessage={requestDisabledMessage}
            onCreated={handleCreated}
          />
        </div>

        <div className="recovery-workspace-main">
          <div className="recovery-workspace-head">
            <div
              className="recovery-workspace-tabs"
              role="tablist"
              aria-label="Khu vực làm việc"
              onKeyDown={handleWorkspaceTabKeyDown}
            >
              <button
                id="recovery-tab-requests"
                type="button"
                role="tab"
                aria-selected={activeTab === "requests"}
                aria-controls="recovery-panel-requests"
                tabIndex={activeTab === "requests" ? 0 : -1}
                className={activeTab === "requests" ? "is-active" : ""}
                onClick={() => setActiveTab("requests")}
              >
                Yêu cầu đã gửi
                {requestPage.totalCount > 0 && <span className="recovery-tab-count">{requestPage.totalCount}</span>}
              </button>
              <button
                id="recovery-tab-plans"
                type="button"
                role="tab"
                aria-selected={activeTab === "plans"}
                aria-controls="recovery-panel-plans"
                tabIndex={activeTab === "plans" ? 0 : -1}
                className={activeTab === "plans" ? "is-active" : ""}
                onClick={() => setActiveTab("plans")}
              >
                Kế hoạch đã nhận
                {planPage.totalCount > 0 && <span className="recovery-tab-count">{planPage.totalCount}</span>}
              </button>
            </div>
            {activeTab === "requests" ? (
              <Button tone="secondary" size="sm" onClick={() => loadRequests(requestPageNumber, selectedRequest?.id)} disabled={requestsLoading}>
                <RefreshCw size={16} aria-hidden="true" /> Tải lại
              </Button>
            ) : (
              <Button tone="secondary" size="sm" onClick={() => loadPlans(planPageNumber, selectedPlan?.id)} disabled={plansLoading}>
                <RefreshCw size={16} aria-hidden="true" /> Tải lại
              </Button>
            )}
          </div>

          {activeTab === "requests" ? (
            <section
              id="recovery-panel-requests"
              className="recovery-workspace-panel"
              role="tabpanel"
              aria-labelledby="recovery-tab-requests"
              tabIndex="0"
            >
              {requestsLoading && requestItems.length === 0 ? (
                <LoadingState label="Đang tải yêu cầu…" />
              ) : requestsError ? (
                <ErrorState title="Không thể tải yêu cầu" description={requestsError} action={<Button onClick={() => loadRequests(requestPageNumber)}>Thử lại</Button>} />
              ) : requestItems.length === 0 ? (
                <EmptyState icon={<ListChecks size={26} aria-hidden="true" />} title="Bạn chưa gửi yêu cầu nào" description="Sau khi gửi, bạn có thể theo dõi trạng thái yêu cầu tại đây." />
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
          ) : (
            <section
              id="recovery-panel-plans"
              className="recovery-workspace-panel"
              role="tabpanel"
              aria-labelledby="recovery-tab-plans"
              tabIndex="0"
            >
              {plansLoading && planItems.length === 0 ? (
                <LoadingState label="Đang tải kế hoạch…" />
              ) : plansError ? (
                <ErrorState title="Không thể tải kế hoạch" description={plansError} action={<Button onClick={() => loadPlans(planPageNumber)}>Thử lại</Button>} />
              ) : planItems.length === 0 ? (
                <EmptyState icon={<FileText size={26} aria-hidden="true" />} title="Chưa có kế hoạch" description="Kế hoạch do bác sĩ hoàn tất sẽ được hiển thị tại đây." />
              ) : (
                <div className="recovery-plan-layout">
                  <div className="recovery-plan-tabs" role="group" aria-label="Danh sách kế hoạch">
                    {planItems.map((plan) => (
                      <button
                        type="button"
                        key={plan.id}
                        className={selectedPlan?.id === plan.id ? "is-selected" : ""}
                        aria-pressed={selectedPlan?.id === plan.id}
                        onClick={() => loadPlanDetail(plan.id, plan)}
                      >
                        <span><strong>{plan.planName || "Kế hoạch phục hồi"}</strong><small>{plan.durationDays || 0} ngày</small></span>
                        <StatusBadge map={PLAN_STATUS} value={plan.status} />
                        <ArrowRight size={17} aria-hidden="true" />
                      </button>
                    ))}
                    <Pagination
                      label="Phân trang kế hoạch phục hồi"
                      page={planPage}
                      loading={plansLoading}
                      onChange={(nextPage) => {
                        setPlanPageNumber(nextPage);
                        void loadPlans(nextPage);
                      }}
                    />
                  </div>
                  <PlanDetail plan={selectedPlan} loading={planDetailLoading} busy={actionBusy} onStart={handleStart} />
                </div>
              )}
            </section>
          )}
        </div>

        <div className="recovery-support-sidebar">
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
    </div>
  );
}
