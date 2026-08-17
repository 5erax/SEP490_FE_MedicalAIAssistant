import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Bold,
  CalendarCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileText,
  HeartPulse,
  Info,
  Italic,
  List,
  ListChecks,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  X,
  XCircle,
} from "lucide-react";
import FormattedRecoveryNote from "../components/recovery/FormattedRecoveryNote";
import RecoveryPlanFeedbackDialog from "../components/recovery/RecoveryPlanFeedbackDialog";
import { useFeedback } from "../components/feedback/feedbackContext";
import { Button, CustomSelect, Dialog, EmptyState, ErrorState, Field, LoadingState, Select, Textarea } from "../components/ui";
import { navigate } from "../router/navigation";
import { getApiErrorCode } from "../services/apiError";
import { getServiceCreditErrorPresentation } from "../services/serviceCredit";
import { useServiceCredit } from "../state/useServiceCredit";
import {
  recoveryPlanRequestsApi,
  recoveryPlansApi,
} from "../services/api";
import {
  ensureRecoveryPlanConnection,
  subscribeToRecoveryPlanEvents,
} from "../services/recoveryPlanRealtime";
import {
  findLatestRecoveryPlanAwaitingFeedback,
  recoveryPlanNeedsFeedback,
} from "../utils/recoveryPlanFeedback";
import "../styles/recovery-plan.css";
import "../styles/formatted-recovery-note.css";

const PAGE_SIZE = 10;
const CANCELLABLE_REQUEST_STATUSES = new Set(["waitingForDoctor", "assigned", "inReview", "needMoreInformation"]);
const DISEASE_GROUPS = [
  { value: "respiratory", label: "Hô hấp" },
  { value: "musculoskeletal", label: "Cơ xương khớp" },
  { value: "infectiousDisease", label: "Bệnh truyền nhiễm" },
];
const REQUEST_SORT_OPTIONS = [
  { value: "desc", label: "Mới nhất trước" },
  { value: "asc", label: "Cũ nhất trước" },
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
const HISTORICAL_PLAN_STATUSES = new Set(["cancelled", "completed", "superseded"]);
const RECOVERY_PLAN_CANCELLATION_REASONS = [
  { value: "NO_LONGER_NEEDED", label: "Không còn cần thiết" },
  { value: "HEALTH_CONDITION_CHANGED", label: "Tình trạng sức khỏe đã thay đổi" },
  { value: "PLAN_NOT_SUITABLE", label: "Kế hoạch không phù hợp" },
  { value: "UNABLE_TO_FOLLOW", label: "Không thể tiếp tục thực hiện" },
  { value: "STARTING_OTHER_TREATMENT", label: "Bắt đầu phương pháp điều trị khác" },
  { value: "OTHER", label: "Lý do khác" },
];
const BLOCKING_REQUEST_STATUSES = ["waitingForDoctor", "assigned", "inReview", "needMoreInformation"];
const BLOCKING_PLAN_STATUSES = ["readyToStart", "active"];
const PROFILE_READINESS_CODES = new Set([
  "PATIENT_PROFILE_REQUIRED",
  "HEIGHT_REQUIRED",
  "HEIGHT_INVALID",
  "WEIGHT_REQUIRED",
  "WEIGHT_INVALID",
]);
const READINESS_MESSAGES = {
  PATIENT_PROFILE_REQUIRED: "Bạn cần hoàn thành hồ sơ y tế trước khi gửi yêu cầu.",
  HEIGHT_REQUIRED: "Vui lòng cập nhật chiều cao trong hồ sơ y tế.",
  HEIGHT_INVALID: "Chiều cao trong hồ sơ y tế chưa hợp lệ.",
  WEIGHT_REQUIRED: "Vui lòng cập nhật cân nặng trong hồ sơ y tế.",
  WEIGHT_INVALID: "Cân nặng trong hồ sơ y tế chưa hợp lệ.",
  DISEASE_GROUP_REQUIRED: "Chọn nhóm bệnh cần hỗ trợ.",
  DISEASE_GROUP_INVALID: "Nhóm bệnh đã chọn không hợp lệ.",
  REQUEST_NOTE_REQUIRED: "Nhập thông tin bạn muốn bác sĩ lưu ý.",
  REQUEST_NOTE_TOO_LONG: "Nội dung không được vượt quá 2.000 ký tự.",
};

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

function getTimeMs(value) {
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
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
  const creditError = getServiceCreditErrorPresentation(error);
  if (creditError) return creditError;
  const code = getApiErrorCode(error);
  if (code === "NO_ACTIVE_SUBSCRIPTION") {
    return { code, action: "purchase", message: "Bạn cần mua gói lượt để yêu cầu kế hoạch phục hồi." };
  }
  if (code === "RECOVERY_PLAN_QUOTA_NOT_CONFIGURED") {
    return { code, action: "retry", message: "Lượt dịch vụ hiện chưa sẵn sàng. Vui lòng thử lại sau." };
  }
  if (code === "RECOVERY_PLAN_QUOTA_EXHAUSTED") {
    return { code, action: "purchase", message: "Bạn đã dùng hết lượt dịch vụ khả dụng." };
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
  if (code === "RECOVERY_PLAN_REQUEST_NOT_READY") {
    return { code, action: "profile", message: "Hồ sơ y tế hoặc thông tin yêu cầu chưa đủ. Vui lòng kiểm tra lại." };
  }
  if (code === "RECOVERY_PLAN_NOT_CANCELLABLE") {
    return { code, message: "Kế hoạch này không còn ở trạng thái có thể hủy." };
  }
  return { code, message: fallback };
}

function getReadinessMessage(issue) {
  return READINESS_MESSAGES[issue?.code] ?? "Thông tin yêu cầu chưa đủ. Vui lòng kiểm tra lại.";
}

function mapReadinessIssues(issues = []) {
  const nextErrors = {};
  const profileIssues = [];

  issues.forEach((issue) => {
    const message = getReadinessMessage(issue);
    if (issue?.code === "DISEASE_GROUP_REQUIRED" || issue?.code === "DISEASE_GROUP_INVALID") {
      nextErrors.diseaseGroup = message;
      return;
    }
    if (issue?.code === "REQUEST_NOTE_REQUIRED" || issue?.code === "REQUEST_NOTE_TOO_LONG") {
      nextErrors.requestNote = message;
      return;
    }
    if (PROFILE_READINESS_CODES.has(issue?.code)) {
      profileIssues.push(message);
      return;
    }
    profileIssues.push(message);
  });

  return { errors: nextErrors, profileIssues };
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
    return <LoadingState label="Đang kiểm tra lượt dịch vụ…" />;
  }

  if (error) {
    const needsPlan = error.action === "purchase"
      || error.code === "NO_ACTIVE_SUBSCRIPTION"
      || error.code === "RECOVERY_PLAN_QUOTA_EXHAUSTED";
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
  const limit = Math.max(0, Number(quota.grantedCount) || 0);
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
            <p className="recovery-eyebrow">Lượt dịch vụ dùng chung</p>
            <h2 id="recovery-quota-title">Còn {remaining} lượt có thể yêu cầu</h2>
            {remaining === 0 && (
              <Button size="sm" onClick={() => navigate("/pricing?view=upgrade&returnTo=%2Frecovery-plan")}>Mua thêm lượt</Button>
            )}
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
          <div><dt>Đã cấp</dt><dd>{limit}</dd></div>
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
  const [profileReadinessIssues, setProfileReadinessIssues] = useState([]);
  const submissionRef = useRef(null);
  const errorSummaryRef = useRef(null);
  const noteRef = useRef(null);

  function updateNoteFromToolbar(transform, fallbackText) {
    const textarea = noteRef.current;
    if (!textarea || disabled) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = requestNote.slice(start, end) || fallbackText;
    const replacement = transform(selectedText);
    const nextValue = `${requestNote.slice(0, start)}${replacement}${requestNote.slice(end)}`.slice(0, 2000);
    setRequestNote(nextValue);
    setErrors((current) => ({ ...current, requestNote: "" }));
    window.requestAnimationFrame(() => {
      textarea.focus();
      const selectionStart = start + replacement.indexOf(selectedText);
      textarea.setSelectionRange(selectionStart, Math.min(selectionStart + selectedText.length, nextValue.length));
    });
  }

  function toggleList(selectedText, ordered = false) {
    const lines = selectedText.split(/\r?\n/);
    const markerPattern = ordered ? /^\s*\d+[.)]\s+/ : /^\s*-\s+/;
    const shouldRemove = lines.every((line) => !line.trim() || markerPattern.test(line));
    return lines.map((line, index) => {
      if (!line.trim()) return line;
      if (shouldRemove) return line.replace(markerPattern, "");
      return `${ordered ? `${index + 1}.` : "-"} ${line.replace(/^\s*(?:-\s+|\d+[.)]\s+)/, "")}`;
    }).join("\n");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    const trimmedNote = requestNote.trim();
    if (!diseaseGroup) nextErrors.diseaseGroup = "Chọn nhóm bệnh cần hỗ trợ.";
    if (!trimmedNote) nextErrors.requestNote = "Nhập thông tin bạn muốn bác sĩ lưu ý.";
    else if (trimmedNote.length > 2000) nextErrors.requestNote = "Nội dung không được vượt quá 2.000 ký tự.";
    setErrors(nextErrors);
    setSubmitError(null);
    setProfileReadinessIssues([]);
    if (Object.keys(nextErrors).length) {
      window.setTimeout(() => errorSummaryRef.current?.focus(), 0);
      return;
    }

    const payload = {
      diseaseGroup,
      treatmentJourneyId: null,
      primaryLabTestSessionId: null,
      requestNote: trimmedNote,
    };
    const signature = JSON.stringify(payload);
    if (!submissionRef.current || submissionRef.current.signature !== signature) {
      submissionRef.current = { signature, key: createIdempotencyKey() };
    }

    setSubmitting(true);
    try {
      const readinessResponse = await recoveryPlanRequestsApi.readiness({ diseaseGroup, requestNote: trimmedNote });
      const readiness = readinessResponse?.data;
      if (readiness?.isReady !== true) {
        const mappedReadiness = mapReadinessIssues(readiness?.issues ?? []);
        setErrors(mappedReadiness.errors);
        setProfileReadinessIssues(mappedReadiness.profileIssues);
        setSubmitError({
          code: "RECOVERY_PLAN_REQUEST_NOT_READY",
          action: mappedReadiness.profileIssues.length ? "profile" : undefined,
          message: "Hồ sơ y tế hoặc thông tin yêu cầu chưa đủ. Vui lòng kiểm tra lại.",
        });
        window.setTimeout(() => errorSummaryRef.current?.focus(), 0);
        return;
      }

      const response = await recoveryPlanRequestsApi.create(payload, submissionRef.current.key);
      submissionRef.current = null;
      setDiseaseGroup("");
      setRequestNote("");
      setProfileReadinessIssues([]);
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
          <h2 id="recovery-create-title">Gửi thông tin cho bác sĩ</h2>
          <p>Chọn nhóm bệnh và ghi lại những điều bạn muốn bác sĩ lưu ý khi chuẩn bị kế hoạch.</p>
        </div>
        <div className="recovery-card-icon"><FileText size={22} aria-hidden="true" /></div>
      </div>

      {disabled && disabledMessage && <div className="recovery-form-blocked"><Info size={18} aria-hidden="true" /><span>{disabledMessage}</span></div>}

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
        {profileReadinessIssues.length > 0 && (
          <div className="recovery-profile-readiness" role="alert">
            <div className="recovery-form-warning">
              <Info size={18} aria-hidden="true" />
              <span>Hồ sơ y tế cần được cập nhật trước khi gửi yêu cầu.</span>
            </div>
            <ul>
              {profileReadinessIssues.map((message) => <li key={message}>{message}</li>)}
            </ul>
            <Button type="button" tone="secondary" onClick={() => navigate("/profile")}>Cập nhật hồ sơ y tế</Button>
          </div>
        )}
        <label className="recovery-field recovery-disease-field" htmlFor="recovery-diseaseGroup">
          <span><b className="recovery-field-step" aria-hidden="true">1</b> Nhóm bệnh <span className="recovery-required-marker" aria-hidden="true">*</span><span className="sr-only"> (bắt buộc)</span></span>
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
        <div className="recovery-field recovery-note-field">
          <label htmlFor="recovery-requestNote">
            <span>
              <b className="recovery-field-step" aria-hidden="true">2</b> Thông tin bạn muốn bác sĩ lưu ý{" "}
              <span className="recovery-required-marker" aria-hidden="true">*</span>
              <span className="sr-only"> (bắt buộc)</span>
            </span>
          </label>
          <div className="recovery-note-editor">
            <div className="recovery-note-toolbar" role="toolbar" aria-label="Định dạng nội dung ghi chú">
              <button type="button" aria-label="In đậm đoạn đã chọn" disabled={disabled} onClick={() => updateNoteFromToolbar((text) => `**${text}**`, "nội dung quan trọng")}><Bold size={16} aria-hidden="true" /></button>
              <button type="button" aria-label="In nghiêng đoạn đã chọn" disabled={disabled} onClick={() => updateNoteFromToolbar((text) => `_${text}_`, "nội dung nhấn mạnh")}><Italic size={16} aria-hidden="true" /></button>
              <span className="recovery-note-toolbar-divider" aria-hidden="true" />
              <button type="button" aria-label="Tạo danh sách gạch đầu dòng" disabled={disabled} onClick={() => updateNoteFromToolbar((text) => toggleList(text), "Nội dung cần lưu ý")}><List size={17} aria-hidden="true" /></button>
              <button type="button" className="recovery-note-ordered-list" aria-label="Tạo danh sách đánh số" disabled={disabled} onClick={() => updateNoteFromToolbar((text) => toggleList(text, true), "Nội dung cần lưu ý")}>1.</button>
            </div>
            <textarea
              ref={noteRef}
              id="recovery-requestNote"
              rows="5"
              maxLength="2000"
              required
              placeholder="Ví dụ: Tôi vẫn còn đau khi đi lại lâu và muốn biết những hoạt động nào nên hạn chế…"
              value={requestNote}
              disabled={disabled}
              aria-invalid={Boolean(errors.requestNote) || undefined}
              aria-describedby="recovery-requestNote-guidance recovery-requestNote-help"
              onChange={(event) => {
                setRequestNote(event.target.value);
                setErrors((current) => {
                  const next = { ...current };
                  delete next.requestNote;
                  return next;
                });
              }}
            />
          </div>
          <small id="recovery-requestNote-guidance" className="recovery-field-guidance">Ghi lại những thay đổi, khó khăn hoặc vấn đề bạn muốn bác sĩ xem xét.</small>
          <small id="recovery-requestNote-help" className={`recovery-character-count${errors.requestNote ? " recovery-field-error" : ""}`}>
            {errors.requestNote || `${requestNote.length} / 2.000 ký tự`}
          </small>
        </div>
        <div className="recovery-submit-row">
          <p role="status" aria-atomic="true">{submitError?.message ?? ""}</p>
          <Button type="submit" disabled={disabled} loading={submitting} loadingLabel="Đang gửi…">
            <Send size={17} aria-hidden="true" /> Gửi yêu cầu
          </Button>
        </div>
        {submitError?.action === "purchase" && (
          <Button tone="secondary" onClick={() => navigate("/pricing?returnTo=%2Frecovery-plan")}>Xem gói dịch vụ</Button>
        )}
        {submitError?.action === "profile" && profileReadinessIssues.length === 0 && (
          <Button type="button" tone="secondary" onClick={() => navigate("/profile")}>Cập nhật hồ sơ y tế</Button>
        )}
      </form>
    </section>
  );
}

function RequestDetail({ request, loading, onCancel, busy }) {
  if (loading) return <LoadingState label="Đang tải chi tiết yêu cầu…" />;
  if (!request) return null;
  const canCancel = CANCELLABLE_REQUEST_STATUSES.has(request.status);
  const needsInformation = request.status === "needMoreInformation";

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
        <div className="recovery-detail-wide"><dt>Nội dung hiện tại</dt><dd><FormattedRecoveryNote text={request.requestNote} fallback="Bạn chưa thêm ghi chú." /></dd></div>
        {request.rejectionReason && <div className="recovery-detail-wide is-danger"><dt>Lý do không thể tiếp nhận</dt><dd>{request.rejectionReason}</dd></div>}
      </dl>

      {needsInformation && (
        <div className="recovery-form-warning">
          <Info size={18} aria-hidden="true" />
          <span>Yêu cầu này thuộc quy trình bổ sung thông tin trước đây. Luồng bổ sung thông tin đã ngừng sử dụng, bạn có thể hủy yêu cầu hiện tại và gửi yêu cầu mới nếu cần.</span>
        </div>
      )}

      {canCancel && (
        <footer className="recovery-detail-actions">
          <Button tone="danger" disabled={busy} onClick={() => onCancel(request)}>Hủy yêu cầu</Button>
        </footer>
      )}
    </article>
  );
}

function RecoveryPlanFeedbackSummary({ plan, onFeedback }) {
  if (plan?.status !== "completed") return null;

  const needsFeedback = recoveryPlanNeedsFeedback(plan);
  const submitted = Boolean(plan.feedbackSubmittedAt);
  const rating = Number(plan.feedbackRating);
  const validRating = Number.isInteger(rating) && rating >= 1 && rating <= 5;

  return (
    <section className="recovery-completion-feedback" aria-labelledby={`recovery-feedback-summary-${plan.id}`}>
      <div className="recovery-completion-feedback__heading">
        <div>
          <p className="recovery-eyebrow">Hoàn tất kế hoạch</p>
          <h4 id={`recovery-feedback-summary-${plan.id}`}>Kế hoạch đã hoàn thành</h4>
        </div>
        <CalendarCheck size={22} aria-hidden="true" />
      </div>

      <dl className="recovery-completion-feedback__meta">
        <div>
          <dt>Hoàn thành</dt>
          <dd>{formatDate(plan.completedAt || plan.endDate, true)}</dd>
        </div>
        {submitted && (
          <div>
            <dt>Đánh giá lúc</dt>
            <dd>{formatDate(plan.feedbackSubmittedAt, true)}</dd>
          </div>
        )}
      </dl>

      {submitted ? (
        <div className="recovery-completion-feedback__submitted">
          <div className="recovery-completion-feedback__rating" aria-label={validRating ? `Bạn đã đánh giá ${rating} trên 5 sao` : "Bạn đã gửi đánh giá"}>
            <span aria-hidden="true">
              {[1, 2, 3, 4, 5].map((value) => (
                <Star key={value} size={19} className={validRating && value <= rating ? "is-filled" : ""} />
              ))}
            </span>
            <strong>{validRating ? `${rating}/5` : "Đã gửi đánh giá"}</strong>
          </div>
          {plan.feedbackNote && (
            <div className="recovery-completion-feedback__note">
              <strong>Ghi chú của bạn</strong>
              <p>{plan.feedbackNote}</p>
            </div>
          )}
        </div>
      ) : needsFeedback ? (
        <div className="recovery-completion-feedback__pending">
          <div>
            <strong>Bạn chưa đánh giá kế hoạch này.</strong>
            <p>Chia sẻ mức độ hài lòng sau khi hoàn thành để phản hồi trải nghiệm của bạn.</p>
          </div>
          <Button type="button" tone="secondary" onClick={() => onFeedback?.(plan)}>
            <Star size={17} aria-hidden="true" /> Đánh giá kế hoạch
          </Button>
        </div>
      ) : null}
    </section>
  );
}

export function PlanDetail({ plan, loading, onStart, onCancel, onExpand, onFeedback, busy }) {
  const isHistorical = plan ? HISTORICAL_PLAN_STATUSES.has(plan.status) : false;
  const shouldCollapseInitially = isHistorical && !recoveryPlanNeedsFeedback(plan);
  const [collapsed, setCollapsed] = useState(shouldCollapseInitially);

  useEffect(() => {
    queueMicrotask(() => setCollapsed(
      plan ? HISTORICAL_PLAN_STATUSES.has(plan.status) && !recoveryPlanNeedsFeedback(plan) : false,
    ));
  }, [plan?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <LoadingState label="Đang tải nội dung kế hoạch…" />;
  if (!plan) return null;
  const phases = [...(plan.phases ?? [])].sort((left, right) => Number(left.sortOrder) - Number(right.sortOrder));
  const canStart = plan.status === "readyToStart";
  const canCancel = Boolean(onCancel) && CANCELLABLE_PLAN_STATUSES.has(plan.status);

  function toggleCollapsed() {
    if (collapsed) onExpand?.();
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

          <RecoveryPlanFeedbackSummary plan={plan} onFeedback={onFeedback} />

          {canStart && (
            <div className="recovery-start-card">
              <CalendarCheck size={22} aria-hidden="true" />
              <div><strong>Sẵn sàng bắt đầu?</strong><p>Ngày bắt đầu và kết thúc sẽ được tính theo múi giờ trong tài khoản của bạn.</p></div>
              <Button loading={busy} loadingLabel="Đang bắt đầu…" onClick={() => onStart(plan.id)}>Bắt đầu kế hoạch</Button>
            </div>
          )}

          {phases.length > 0 && (
            <section className="recovery-phases" aria-labelledby={`recovery-phases-title-${plan.id}`}>
              <div className="recovery-section-heading">
                <div><p className="recovery-eyebrow">Lộ trình</p><h4 id={`recovery-phases-title-${plan.id}`}>Các giai đoạn thực hiện</h4></div>
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

const PHASE_COLORS = [
  { bg: "hsl(174, 48%, 72%)", text: "hsl(174, 60%, 20%)" },
  { bg: "hsl(206, 58%, 74%)", text: "hsl(206, 65%, 24%)" },
  { bg: "hsl(160, 42%, 70%)", text: "hsl(160, 50%, 20%)" },
  { bg: "hsl(230, 48%, 76%)", text: "hsl(230, 50%, 28%)" },
  { bg: "hsl(260, 42%, 78%)", text: "hsl(260, 40%, 30%)" },
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
    const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
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
  const {
    balance: quota,
    status: quotaStatus,
    error: serviceCreditError,
    refresh: refreshServiceCredit,
  } = useServiceCredit();
  const quotaLoading = quotaStatus === "idle" || quotaStatus === "loading";
  const quotaError = serviceCreditError
    ? getRecoveryError(serviceCreditError, "Chưa thể kiểm tra lượt dịch vụ. Vui lòng thử lại.")
    : null;
  const [requestPageNumber, setRequestPageNumber] = useState(1);
  const [allRequests, setAllRequests] = useState([]);
  const [requestSortDirection, setRequestSortDirection] = useState("desc");
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestDetailLoading, setRequestDetailLoading] = useState(false);
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
  const [feedbackPlan, setFeedbackPlan] = useState(null);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [dismissedFeedbackPlanIds, setDismissedFeedbackPlanIds] = useState(() => new Set());
  const autoFeedbackPromptedRef = useRef(false);
  const refetchTimerRef = useRef(null);

  const loadQuota = useCallback(async () => {
    try {
      await refreshServiceCredit();
    } catch {
      // Provider exposes the canonical error state to the quota card.
    }
  }, [refreshServiceCredit]);

  const loadRequests = useCallback(async (pageNumber = requestPageNumber, preferredId = "") => {
    setRequestsLoading(true);
    setRequestsError("");
    try {
      // The backend paginates oldest-first with no sort param, so the newest
      // request could be on any page - fetch every page once and sort/paginate
      // client-side instead, matching the "newest first" order this list needs.
      const firstResponse = await recoveryPlanRequestsApi.listMine({ pageNumber: 1, pageSize: PAGE_SIZE });
      const firstPage = normalizePaged(firstResponse, 1);
      const items = [...firstPage.items];
      for (let page = 2; page <= firstPage.totalPages; page += 1) {
        const response = await recoveryPlanRequestsApi.listMine({ pageNumber: page, pageSize: PAGE_SIZE });
        items.push(...normalizePaged(response, page).items);
      }
      setAllRequests(items);
      setRequestPageNumber(pageNumber);
      const sortedItems = [...items].sort((a, b) => {
        const diff = getTimeMs(a.requestedAt) - getTimeMs(b.requestedAt);
        return requestSortDirection === "asc" ? diff : -diff;
      });
      const nextSelected = sortedItems.find((item) => item.id === preferredId)
        ?? sortedItems.find((item) => item.id === selectedRequest?.id)
        ?? sortedItems[0]
        ?? null;
      setSelectedRequest(nextSelected);
      setStatusMessage(`Đã tải ${items.length} yêu cầu phục hồi.`);
    } catch {
      setAllRequests([]);
      setSelectedRequest(null);
      setRequestsError("Chưa thể tải các yêu cầu của bạn.");
    } finally {
      setRequestsLoading(false);
    }
  }, [requestPageNumber, requestSortDirection, selectedRequest?.id]);

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

  useEffect(() => {
    if (plansLoading || feedbackPlan || autoFeedbackPromptedRef.current) return;
    const candidate = findLatestRecoveryPlanAwaitingFeedback(planPage.items, dismissedFeedbackPlanIds);
    if (!candidate) return;
    const timer = window.setTimeout(() => {
      autoFeedbackPromptedRef.current = true;
      setFeedbackError("");
      setFeedbackPlan(candidate);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [dismissedFeedbackPlanIds, feedbackPlan, planPage.items, plansLoading]);

  function markFeedbackDismissed(planId) {
    if (!planId) return;
    setDismissedFeedbackPlanIds((previous) => {
      const next = new Set(previous);
      next.add(planId);
      return next;
    });
  }

  function openFeedbackDialog(plan) {
    if (!recoveryPlanNeedsFeedback(plan)) return;
    setFeedbackError("");
    setFeedbackPlan(plan);
  }

  function handleCloseFeedback() {
    markFeedbackDismissed(feedbackPlan?.id);
    setFeedbackError("");
    setFeedbackPlan(null);
  }

  async function handleSubmitFeedback({ rating, note }) {
    if (!feedbackPlan?.id) return;
    const numericRating = Number(rating);
    const trimmedNote = typeof note === "string" ? note.trim() : "";
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      setFeedbackError("Vui lòng chọn mức đánh giá từ 1 đến 5 sao.");
      return;
    }
    if (trimmedNote.length > 1000) {
      setFeedbackError("Ghi chú không được vượt quá 1.000 ký tự.");
      return;
    }

    const planId = feedbackPlan.id;
    setFeedbackSubmitting(true);
    setFeedbackError("");
    try {
      const response = await recoveryPlansApi.submitFeedback(planId, {
        rating: numericRating,
        note: trimmedNote || null,
      });
      const updatedPlan = response?.data ?? null;
      if (updatedPlan?.id) {
        setPlanPage((current) => ({
          ...current,
          items: current.items.map((item) => item.id === updatedPlan.id ? { ...item, ...updatedPlan } : item),
        }));
        setSelectedPlan((current) => current?.id === updatedPlan.id ? updatedPlan : current);
      }
      markFeedbackDismissed(planId);
      setFeedbackPlan(null);
      showToast({
        type: "success",
        title: "Cảm ơn bạn đã đánh giá",
        message: "Đánh giá kế hoạch phục hồi đã được ghi nhận.",
      });
      await loadPlans(planPageNumber, planId);
    } catch (error) {
      const code = getApiErrorCode(error);
      if (code === "RECOVERY_PLAN_FEEDBACK_ALREADY_SUBMITTED") {
        markFeedbackDismissed(planId);
        setFeedbackPlan(null);
        await loadPlans(planPageNumber, planId);
        showToast({ type: "info", title: "Đánh giá đã được ghi nhận", message: "Kế hoạch này đã được đánh giá trước đó." });
        return;
      }
      if (code === "RECOVERY_PLAN_NOT_COMPLETED") {
        markFeedbackDismissed(planId);
        setFeedbackPlan(null);
        await loadPlans(planPageNumber);
        showToast({ type: "error", title: "Chưa thể đánh giá", message: "Kế hoạch này chưa ở trạng thái hoàn thành nên chưa thể đánh giá." });
        return;
      }
      if (code === "NOT_FOUND" || error?.status === 404) {
        markFeedbackDismissed(planId);
        setFeedbackPlan(null);
        await loadPlans(planPageNumber);
        showToast({ type: "error", title: "Không tìm thấy kế hoạch", message: "Không tìm thấy kế hoạch phục hồi này." });
        return;
      }
      if (code === "INVALID_REQUEST" || error?.status === 400) {
        setFeedbackError("Thông tin đánh giá không hợp lệ. Vui lòng kiểm tra lại.");
        return;
      }
      setFeedbackError("Chưa thể gửi đánh giá lúc này. Vui lòng thử lại.");
    } finally {
      setFeedbackSubmitting(false);
    }
  }

  async function handleCreated(createdRequest) {
    showToast({ type: "success", title: "Đã gửi yêu cầu", message: "Bạn có thể theo dõi trạng thái ngay trên trang này." });
    void loadQuota();
    await Promise.allSettled([
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
      void loadQuota();
      await loadRequests(requestPageNumber, request.id);
    } catch (error) {
      const mapped = getRecoveryError(error, "Chưa thể hủy yêu cầu. Vui lòng thử lại.");
      showToast({ type: "error", title: "Không thể hủy yêu cầu", message: mapped.message });
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
      void loadQuota();
      await loadPlans(planPageNumber, planId);
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
        ? "Đang kiểm tra lượt dịch vụ của bạn."
        : quotaError?.message
          ?? (!quota ? "Chưa có thông tin lượt dịch vụ." : "Bạn chưa có lượt dịch vụ khả dụng.");
  const realtimeLabel = connectionStatus === "connected"
    ? "Cập nhật tự động đang bật"
    : connectionStatus === "reconnecting"
      ? "Đang nối lại cập nhật tự động"
      : "Bạn có thể dùng nút tải lại để xem thay đổi mới";

  const requestPage = useMemo(() => {
    const sorted = [...allRequests].sort((a, b) => {
      const diff = getTimeMs(a.requestedAt) - getTimeMs(b.requestedAt);
      return requestSortDirection === "asc" ? diff : -diff;
    });
    const totalCount = sorted.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    const pageNumber = Math.min(Math.max(1, requestPageNumber), totalPages);
    return {
      items: sorted.slice((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE),
      pageNumber,
      pageSize: PAGE_SIZE,
      totalCount,
      totalPages,
    };
  }, [allRequests, requestSortDirection, requestPageNumber]);
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
        {!workflowBlocked && (
          <div className="recovery-request-sidebar">
            <CreateRequestForm
              disabled={requestCreationDisabled}
              disabledMessage={requestDisabledMessage}
              onCreated={handleCreated}
              onWorkflowConflict={async () => {
                setWorkflowBlocked(true);
                await Promise.allSettled([loadRequests(1), loadPlans(1), loadWorkflowGuard()]);
              }}
            />
          </div>
        )}

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
              <div className="recovery-workspace-head-controls">
                <CustomSelect
                  label="Sắp xếp"
                  hideLabel
                  value={requestSortDirection}
                  options={REQUEST_SORT_OPTIONS}
                  onChange={(value) => { setRequestSortDirection(value); setRequestPageNumber(1); }}
                  className="recovery-request-sort-select"
                />
                <Button tone="secondary" size="sm" onClick={() => loadRequests(requestPageNumber, selectedRequest?.id)} disabled={requestsLoading}>
                  <RefreshCw size={16} aria-hidden="true" /> Tải lại
                </Button>
              </div>
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
                        onFeedback={openFeedbackDialog}
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

      {cancelPlan && (
        <CancelPlanDialog
          plan={cancelPlan}
          submitting={actionBusy}
          onClose={() => setCancelPlan(null)}
          onSubmit={handleCancelPlan}
        />
      )}

      {feedbackPlan && (
        <RecoveryPlanFeedbackDialog
          key={feedbackPlan.id}
          open
          plan={feedbackPlan}
          submitting={feedbackSubmitting}
          errorMessage={feedbackError}
          onClose={handleCloseFeedback}
          onSubmit={handleSubmitFeedback}
        />
      )}
    </div>
  );
}
