import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  Bold,
  CalendarCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileImage,
  FileText,
  FlaskConical,
  Info,
  Italic,
  List,
  RefreshCw,
  Send,
  ShieldCheck,
  Star,
  X,
  XCircle,
} from "lucide-react";
import FormattedRecoveryNote from "../components/recovery/FormattedRecoveryNote";
import RecoveryPlanFeedbackDialog from "../components/recovery/RecoveryPlanFeedbackDialog";
import LabTestResultPage from "./LabTestResultPage";
import { useFeedback } from "../components/feedback/feedbackContext";
import { Button, Dialog, EmptyState, ErrorState, Field, LoadingState, Select, Textarea } from "../components/ui";
import { navigate, getLocationSnapshot, subscribeToLocation } from "../router/navigation";
import { getApiErrorCode } from "../services/apiError";
import { getServiceCreditErrorPresentation } from "../services/serviceCredit";
import { useServiceCredit } from "../state/useServiceCredit";
import {
  labTestsApi,
  recoveryPlanRequestsApi,
  recoveryPlansApi,
} from "../services/api";
import { uploadImageToCloudinary, validateCloudinaryImage } from "../services/cloudinaryUploadService";
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
import "../styles/recovery-workspace.css";

const PAGE_SIZE = 5;
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

function getLabSessionLabel(session) {
  const dateLabel = formatDate(session?.testDate ?? session?.processedAt ?? session?.createdAt);
  const facilityLabel = session?.facilityName ? ` - ${session.facilityName}` : "";
  return `${dateLabel}${facilityLabel}`;
}

function getLabSessionId(session) {
  return session?.sessionId ?? session?.testSessionId ?? session?.id ?? "";
}

function getLabSessionSortTime(session) {
  const ms = getTimeMs(session?.createdAt ?? session?.processedAt ?? session?.testDate);
  return Number.isNaN(ms) ? 0 : ms;
}

function normalizeCompletedLabSessions(response) {
  const data = response?.data;
  const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
  return items
    .filter((session) => {
      const status = String(session?.status ?? "completed").toLowerCase();
      return getLabSessionId(session) && status === "completed";
    })
    .sort((left, right) => getLabSessionSortTime(right) - getLabSessionSortTime(left));
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

function normalizeHistorySearch(value) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase().trim();
}

function RecoveryCreditNotice({ returnTo = "/recovery-plan" }) {
  return <section className="recovery-credit-notice" aria-label="Lượt sử dụng đã hết">
    <span className="recovery-credit-notice-icon" aria-hidden="true"><Info size={24} /></span>
    <div>
      <h3>Bạn đã hết lượt sử dụng</h3>
      <p>Mua thêm lượt để gửi yêu cầu kế hoạch phục hồi cho bác sĩ.</p>
      <small>Bạn vẫn có thể xem kế hoạch và lịch sử đã có.</small>
    </div>
    <Button onClick={() => navigate(`/pricing?view=upgrade&returnTo=${encodeURIComponent(returnTo)}`)}>Mua thêm lượt</Button>
  </section>;
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
  const remaining = Math.max(0, Number(quota.remainingCount) || 0);
  return <section className="recovery-quota-card recovery-quota-inline" aria-labelledby="recovery-quota-title">
    <h2 id="recovery-quota-title">Còn {remaining} lượt có thể yêu cầu</h2>
    {remaining === 0 && <Button size="sm" onClick={() => navigate("/pricing?view=upgrade&returnTo=%2Frecovery-plan")}>Mua thêm lượt</Button>}
  </section>;
}

function CreateRequestForm({ disabled, disabledMessage, onCreated, onWorkflowConflict, quotaContent }) {
  const [diseaseGroup, setDiseaseGroup] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [prescriptionImageUrl, setPrescriptionImageUrl] = useState("");
  const [prescriptionUploading, setPrescriptionUploading] = useState(false);
  const [prescriptionUploadError, setPrescriptionUploadError] = useState("");
  const [prescriptionPreviewUrl, setPrescriptionPreviewUrl] = useState("");
  const [labSessions, setLabSessions] = useState([]);
  const [primaryLabTestSessionId, setPrimaryLabTestSessionId] = useState("");
  const [activeLabResultSessionId, setActiveLabResultSessionId] = useState("");
  const [labSessionsLoading, setLabSessionsLoading] = useState(false);
  const [labSessionsError, setLabSessionsError] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [profileReadinessIssues, setProfileReadinessIssues] = useState([]);
  const submissionRef = useRef(null);
  const submittingRef = useRef(false);
  const errorSummaryRef = useRef(null);
  const noteRef = useRef(null);
  const labResultDialogRef = useRef(null);
  const labPickerTriggerRef = useRef(null);
  const returnToLabPickerRef = useRef(false);
  const [labPickerOpen, setLabPickerOpen] = useState(false);
  const [pendingLabId, setPendingLabId] = useState("");
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const prescriptionInputRef = useRef(null);
  const selectedLabSession = useMemo(
    () => labSessions.find((session) => getLabSessionId(session) === primaryLabTestSessionId) ?? null,
    [labSessions, primaryLabTestSessionId],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadCompletedLabSessions() {
      setLabSessionsLoading(true);
      setLabSessionsError("");
      try {
        const response = await labTestsApi.mySessions(1, 20, { status: "completed" });
        if (cancelled) return;
        const items = normalizeCompletedLabSessions(response);
        setLabSessions(items);
      } catch {
        if (!cancelled) {
          setLabSessions([]);
          setPrimaryLabTestSessionId("");
          setLabSessionsError("Không thể tải danh sách xét nghiệm. Bạn vẫn có thể gửi yêu cầu mà không đính kèm.");
        }
      } finally {
        if (!cancelled) setLabSessionsLoading(false);
      }
    }

    loadCompletedLabSessions();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => () => {
    if (prescriptionPreviewUrl) URL.revokeObjectURL(prescriptionPreviewUrl);
  }, [prescriptionPreviewUrl]);

  function clearPrescriptionPreview() {
    if (prescriptionPreviewUrl) URL.revokeObjectURL(prescriptionPreviewUrl);
    setPrescriptionPreviewUrl("");
  }

  function handlePrescriptionFileChange(event) {
    const file = event.target.files?.[0] ?? null;
    setPrescriptionUploadError("");
    setPrescriptionImageUrl("");

    if (!file) {
      setPrescriptionFile(null);
      clearPrescriptionPreview();
      return;
    }

    try {
      validateCloudinaryImage(file);
    } catch (validationError) {
      setPrescriptionFile(null);
      clearPrescriptionPreview();
      setPrescriptionUploadError(validationError?.message || "Vui lòng chọn file ảnh hợp lệ.");
      if (prescriptionInputRef.current) prescriptionInputRef.current.value = "";
      return;
    }

    setPrescriptionFile(file);
    clearPrescriptionPreview();
    setPrescriptionPreviewUrl(URL.createObjectURL(file));
  }

  function handleRemovePrescription() {
    setPrescriptionFile(null);
    setPrescriptionImageUrl("");
    setPrescriptionUploadError("");
    clearPrescriptionPreview();
    if (prescriptionInputRef.current) prescriptionInputRef.current.value = "";
  }

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

  useEffect(() => {
    const dialog = labResultDialogRef.current;
    if (!dialog) return;

    if (activeLabResultSessionId && !dialog.open) {
      dialog.showModal();
    } else if (!activeLabResultSessionId && dialog.open) {
      dialog.close();
    }
  }, [activeLabResultSessionId]);

  function closeLabResultPreview() {
    const dialog = labResultDialogRef.current;
    if (dialog?.open) dialog.close();
    else setActiveLabResultSessionId("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current || disabled) return;
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

    submittingRef.current = true;
    setSubmitting(true);
    setPrescriptionUploadError("");
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

      let uploadedPrescriptionUrl = prescriptionImageUrl || null;
      if (prescriptionFile && !uploadedPrescriptionUrl) {
        setPrescriptionUploading(true);
        try {
          const uploadResult = await uploadImageToCloudinary(prescriptionFile);
          uploadedPrescriptionUrl = uploadResult?.secureUrl ?? uploadResult?.secure_url ?? null;
          if (!uploadedPrescriptionUrl) throw new Error("Không thể lấy URL ảnh đơn thuốc.");
          setPrescriptionImageUrl(uploadedPrescriptionUrl);
        } catch (uploadError) {
          prescriptionInputRef.current?.scrollIntoView({ block: "center" });
          setPrescriptionUploadError(
            uploadError?.message
              || "Không thể tải ảnh đơn thuốc lên. Vui lòng thử lại hoặc xóa ảnh để tiếp tục mà không gửi đơn thuốc.",
          );
          return;
        } finally {
          setPrescriptionUploading(false);
        }
      }

      const payload = {
        diseaseGroup,
        treatmentJourneyId: null,
        primaryLabTestSessionId: primaryLabTestSessionId || null,
        requestNote: trimmedNote,
        prescriptionImageUrl: uploadedPrescriptionUrl || null,
      };
      const signature = JSON.stringify(payload);
      if (!submissionRef.current || submissionRef.current.signature !== signature) {
        submissionRef.current = { signature, key: createIdempotencyKey() };
      }

      const response = await recoveryPlanRequestsApi.create(payload, submissionRef.current.key);
      submissionRef.current = null;
      setDiseaseGroup("");
      setPrimaryLabTestSessionId("");
      setRequestNote("");
      setPrescriptionFile(null);
      setPrescriptionImageUrl("");
      setPrescriptionUploadError("");
      clearPrescriptionPreview();
      if (prescriptionInputRef.current) prescriptionInputRef.current.value = "";
      setProfileReadinessIssues([]);
      await onCreated(response?.data);
    } catch (error) {
      const mapped = getRecoveryError(error, "Chưa thể gửi yêu cầu. Bạn có thể thử lại mà không tạo yêu cầu trùng.");
      setSubmitError(mapped);
      if (mapped.code === "RECOVERY_PLAN_WORKFLOW_ALREADY_ACTIVE") {
        await onWorkflowConflict?.();
      }
    } finally {
      setPrescriptionUploading(false);
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <section className="recovery-create-card" aria-labelledby="recovery-create-title">
      {disabled && disabledMessage && <div className="recovery-form-blocked"><Info size={18} aria-hidden="true" /><span>{disabledMessage}</span></div>}

      <form onSubmit={handleSubmit} noValidate className="recovery-compose-grid">
        <fieldset className="recovery-compose-fields" disabled={disabled || submitting || prescriptionUploading}>
        <legend className="sr-only" id="recovery-create-title">Thông tin gửi bác sĩ</legend>
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
              rows="4"
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
          <div className="recovery-note-help">
            <small id="recovery-requestNote-guidance" className="recovery-field-guidance">Ghi lại những thay đổi, khó khăn hoặc vấn đề bạn muốn bác sĩ xem xét.</small>
            <small id="recovery-requestNote-help" className={`recovery-character-count${errors.requestNote ? " recovery-field-error" : ""}`}>
              {errors.requestNote || `${requestNote.length} / 2.000 ký tự`}
            </small>
          </div>
        </div>
        <section className="recovery-evidence" aria-labelledby="recovery-evidence-title">
          <h3 id="recovery-evidence-title">Tài liệu đính kèm <small>Không bắt buộc</small></h3>
          <div className="recovery-evidence-actions">
            <Button ref={labPickerTriggerRef} type="button" tone="secondary" onClick={() => { setPendingLabId(primaryLabTestSessionId); setLabPickerOpen(true); }}>
              <FlaskConical size={18} /> {selectedLabSession ? "Đổi kết quả xét nghiệm" : "Chọn kết quả xét nghiệm"}
            </Button>
            <Button type="button" tone="secondary" onClick={() => prescriptionInputRef.current?.click()}>
              <FileImage size={18} /> {prescriptionFile ? "Đổi ảnh đơn thuốc" : "Thêm ảnh đơn thuốc"}
            </Button>
          </div>
          <input ref={prescriptionInputRef} id="recovery-prescriptionImage" className="recovery-prescription-native-input" type="file" accept="image/*"
            aria-label="Ảnh đơn thuốc" onChange={handlePrescriptionFileChange} />
          {selectedLabSession && <div className="recovery-evidence-row">
            <FlaskConical size={20} /><strong>{getLabSessionLabel(selectedLabSession)}</strong>
            <Button type="button" tone="ghost" onClick={() => setActiveLabResultSessionId(primaryLabTestSessionId)}>Xem lại kết quả</Button>
            <Button type="button" tone="ghost" onClick={() => setPrimaryLabTestSessionId("")}>Bỏ đính kèm</Button>
          </div>}
          {prescriptionFile && <div className="recovery-evidence-row">
            <FileImage size={20} /><strong>{prescriptionFile.name}</strong>
            <Button type="button" tone="ghost" onClick={() => setImagePreviewOpen(true)}>Xem ảnh</Button>
            <Button type="button" tone="ghost" onClick={handleRemovePrescription}>Xóa ảnh</Button>
          </div>}
          <small>Ảnh tối đa 5 MB. Tài liệu chỉ được gửi khi bạn xác nhận yêu cầu.</small>
          {prescriptionUploadError && <p className="recovery-field-error" role="alert">{prescriptionUploadError}</p>}
        </section>
        </fieldset>
        <aside className="recovery-confirmation" aria-labelledby="recovery-confirm-title">
          <h3 id="recovery-confirm-title">Kiểm tra trước khi gửi</h3>
          {quotaContent}
          <dl className="recovery-confirm-summary">
            <div><dt>Nhóm bệnh</dt><dd>{diseaseGroup ? getDiseaseLabel(diseaseGroup) : "Chưa chọn"}</dd></div>
            <div><dt>Tài liệu</dt><dd>{Number(Boolean(primaryLabTestSessionId)) + Number(Boolean(prescriptionFile))} đính kèm</dd></div>
          </dl>
          <p>Bác sĩ sẽ xem thông tin bạn cung cấp để chuẩn bị kế hoạch phục hồi.</p>
        <div className="recovery-submit-row">
          <p role="status" aria-atomic="true">{submitError?.message ?? ""}</p>
          <Button
            type="submit"
            disabled={disabled || prescriptionUploading}
            loading={submitting || prescriptionUploading}
            loadingLabel={prescriptionUploading ? "Đang tải ảnh..." : "Đang gửi…"}
          >
            <Send size={17} aria-hidden="true" /> Gửi yêu cầu
          </Button>
        </div>
        {submitError?.action === "purchase" && (
          <Button tone="secondary" onClick={() => navigate("/pricing?returnTo=%2Frecovery-plan")}>Xem gói dịch vụ</Button>
        )}
        {submitError?.action === "profile" && profileReadinessIssues.length === 0 && (
          <Button type="button" tone="secondary" onClick={() => navigate("/profile")}>Cập nhật hồ sơ y tế</Button>
        )}
        </aside>
      </form>
      {labPickerOpen && <Dialog className="recovery-picker-panel recovery-focused" backdropClassName="recovery-drawer-backdrop"
        labelledBy="recovery-lab-picker-title" restoreFocusRef={labPickerTriggerRef} onClose={() => setLabPickerOpen(false)}>
        <header className="recovery-history-header"><h2 id="recovery-lab-picker-title">Chọn kết quả xét nghiệm</h2>
          <Button tone="secondary" onClick={() => setLabPickerOpen(false)}>Đóng</Button></header>
        <p>Chọn một phiếu đã phân tích để gửi cho bác sĩ.</p>
        {labSessionsLoading ? <LoadingState label="Đang tải xét nghiệm…" /> : labSessionsError ? <p role="alert">{labSessionsError}</p>
          : !labSessions.length ? <EmptyState title="Chưa có kết quả đã phân tích" description="Bạn vẫn có thể gửi yêu cầu mà không đính kèm." />
          : <div className="recovery-lab-options">
            {labSessions.map((session) => {
              const id = getLabSessionId(session);
              return <div className="recovery-lab-option" key={id}>
                <label><input type="radio" name="recovery-lab-selection" value={id} checked={pendingLabId === id} onChange={() => setPendingLabId(id)} />
                  <span>{getLabSessionLabel(session)}</span></label>
                <Button tone="ghost" onClick={() => {
                  returnToLabPickerRef.current = true;
                  setLabPickerOpen(false);
                  setActiveLabResultSessionId(id);
                }}>Xem kết quả</Button>
              </div>;
            })}
          </div>}
        <footer className="recovery-picker-footer">
          <Button tone="secondary" onClick={() => setLabPickerOpen(false)}>Hủy chọn</Button>
          <Button disabled={!pendingLabId || disabled || submitting} onClick={() => { setPrimaryLabTestSessionId(pendingLabId); setLabPickerOpen(false); }}>Đính kèm kết quả</Button>
        </footer>
      </Dialog>}
      {imagePreviewOpen && prescriptionPreviewUrl && <Dialog className="recovery-picker-panel recovery-focused" backdropClassName="recovery-drawer-backdrop"
        labelledBy="recovery-image-title" onClose={() => setImagePreviewOpen(false)}>
        <header className="recovery-history-header"><h2 id="recovery-image-title">Ảnh đơn thuốc</h2>
          <Button tone="secondary" onClick={() => setImagePreviewOpen(false)}>Đóng ảnh</Button></header>
        <img className="recovery-image-full" src={prescriptionPreviewUrl} alt="Xem trước đơn thuốc" />
      </Dialog>}
      <dialog
        ref={labResultDialogRef}
        className="recovery-lab-result-dialog"
        aria-label="Kết quả xét nghiệm"
        onClose={() => {
          setActiveLabResultSessionId("");
          if (returnToLabPickerRef.current) {
            returnToLabPickerRef.current = false;
            setLabPickerOpen(true);
          }
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeLabResultPreview();
        }}
      >
        <div className="recovery-lab-result-dialog__surface">
          <div className="recovery-lab-result-dialog__toolbar">
            <div>
              <p>Xem trước xét nghiệm đính kèm</p>
              <strong id="recovery-lab-result-modal-title">Kết quả xét nghiệm</strong>
            </div>
            <button type="button" aria-label="Đóng kết quả xét nghiệm" onClick={closeLabResultPreview}>
              <X size={22} aria-hidden="true" />
            </button>
          </div>
          {activeLabResultSessionId && (
            <LabTestResultPage sessionId={activeLabResultSessionId} embedded />
          )}
        </div>
      </dialog>
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
        {request.prescriptionImageUrl && (
          <div className="recovery-detail-wide">
            <dt>Đơn thuốc đã gửi</dt>
            <dd>
              <a href={request.prescriptionImageUrl} target="_blank" rel="noopener noreferrer">Mở ảnh đơn thuốc</a>
            </dd>
          </div>
        )}
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

function RecoveryPhaseContent({ phase, index }) {
  return (
                  <article className="recovery-phase-card" >
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
                          {[...(phase.nutrientTargets ?? [])].sort((left, right) => Number(left.sortOrder) - Number(right.sortOrder)).map((nutrient) => (
                            <div className="recovery-nutrient" key={nutrient.id}>
                              <div><span>{nutrient.nutrientName}</span><b>{nutrient.amountPerDay} {nutrient.unit}/ngày</b></div>
                              {nutrient.instruction && <p>{nutrient.instruction}</p>}
                              {(nutrient.foodSources ?? []).length > 0 && (
                                <>
                                  <p className="recovery-food-list-label">Bạn có thể lựa chọn một trong các thực phẩm sau:</p>
                                  <ul className="recovery-food-list">
                                    {[...(nutrient.foodSources ?? [])].sort((left, right) => Number(left.sortOrder) - Number(right.sortOrder)).map((food) => (
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
  );
}

function RecoveryPhaseWorkspace({ plan, phases }) {
  const [today, setToday] = useState(() => toDateKey(new Date()));
  useEffect(() => {
    const timer = window.setInterval(() => setToday(toDateKey(new Date())), 60000);
    return () => window.clearInterval(timer);
  }, []);
  const currentIndex = plan.status === "active"
    ? getPhaseTimeline(plan).findIndex((entry) => today >= toDateKey(entry.from) && today <= toDateKey(entry.to)) : -1;
  const [chosen, setChosen] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const selectedIndex = Math.min(chosen ?? Math.max(0, currentIndex), phases.length - 1);
  return <section className="recovery-phase-workspace" aria-label="Hướng dẫn theo giai đoạn">
    <div className="recovery-phase-toolbar">
      <div><h4>Các giai đoạn thực hiện</h4><p>{currentIndex >= 0
        ? `Giai đoạn ${currentIndex + 1} theo lịch hiện tại · Không phản ánh mức độ hoàn thành.`
        : "Chọn giai đoạn để xem hướng dẫn của bác sĩ."}</p></div>
      <Button tone="secondary" aria-pressed={showAll} onClick={() => setShowAll(!showAll)}>{showAll ? "Xem từng giai đoạn" : "Xem toàn bộ kế hoạch"}</Button>
    </div>
    <div className={showAll ? "recovery-all-phases" : "recovery-phase-columns"}>
      {!showAll && <>
        <nav className="recovery-phase-nav" aria-label="Giai đoạn phục hồi">
          {phases.map((phase, index) => <button type="button" key={phase.id ?? index}
            aria-pressed={index === selectedIndex} onClick={() => setChosen(index)}>
            <small>Giai đoạn {index + 1} · Ngày {phase.startDay}–{phase.endDay}</small>
            <strong>{phase.phaseName}</strong>{currentIndex === index && <span>Theo lịch hiện tại</span>}
          </button>)}
        </nav>
        <label className="recovery-phase-mobile">Giai đoạn
          <select value={selectedIndex} onChange={(event) => setChosen(Number(event.target.value))}>
            {phases.map((phase, index) => <option key={phase.id ?? index} value={index}>{index + 1}. {phase.phaseName} · Ngày {phase.startDay}–{phase.endDay}</option>)}
          </select>
        </label>
      </>}
      <div className="recovery-selected-phase">
        {phases.map((phase, index) => (showAll || index === selectedIndex) && <RecoveryPhaseContent key={phase.id ?? index} phase={phase} index={index} />)}
        {!showAll && <div className="recovery-phase-pagination">
          <Button tone="secondary" disabled={selectedIndex === 0} onClick={() => setChosen(selectedIndex - 1)}>Giai đoạn trước</Button>
          <span>{selectedIndex + 1}/{phases.length}</span>
          <Button tone="secondary" disabled={selectedIndex === phases.length - 1} onClick={() => setChosen(selectedIndex + 1)}>Giai đoạn tiếp</Button>
        </div>}
      </div>
    </div>
  </section>;
}

export function PlanDetail({ plan, loading, onStart, onCancel, onExpand, onFeedback, busy, focused = false }) {
  const isHistorical = plan ? HISTORICAL_PLAN_STATUSES.has(plan.status) : false;
  const shouldCollapseInitially = !focused && isHistorical && !recoveryPlanNeedsFeedback(plan);
  const [collapsed, setCollapsed] = useState(shouldCollapseInitially);

  useEffect(() => {
    queueMicrotask(() => setCollapsed(
      plan ? !focused && HISTORICAL_PLAN_STATUSES.has(plan.status) && !recoveryPlanNeedsFeedback(plan) : false,
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
        {isHistorical && !focused && (
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

      {(focused || !isHistorical || !collapsed) && (
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

          {phases.length > 0 && (focused ? <RecoveryPhaseWorkspace key={`${plan.id}-${plan.startDate || "not-started"}`} plan={plan} phases={phases} /> : (
            <section className="recovery-phases" aria-labelledby={`recovery-phases-title-${plan.id}`}>
              <div className="recovery-section-heading">
                <div><p className="recovery-eyebrow">Lộ trình</p><h4 id={`recovery-phases-title-${plan.id}`}>Các giai đoạn thực hiện</h4></div>
                <span>{phases.length} giai đoạn</span>
              </div>
              <div className="recovery-phase-list">
                {phases.map((phase, index) => (
                  <RecoveryPhaseContent key={phase.id ?? index} phase={phase} index={index} />
                ))}
              </div>
            </section>
          ))}

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
  const [planDetailError, setPlanDetailError] = useState("");
  const planDetailSequenceRef = useRef(0);
  const [actionBusy, setActionBusy] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [statusMessage, setStatusMessage] = useState("");
  const [activeTab, setActiveTab] = useState("requests");
  const location = useSyncExternalStore(subscribeToLocation, getLocationSnapshot);
  const creating = new URLSearchParams(location.split("?")[1] || "").get("view") === "request";
  const [composeVisited, setComposeVisited] = useState(creating);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyDetail, setHistoryDetail] = useState(null);
  const [historySearch, setHistorySearch] = useState("");
  const historyContentRef = useRef(null);
  useEffect(() => {
    if (historyOpen) historyContentRef.current?.focus();
  }, [historyDetail]); // eslint-disable-line react-hooks/exhaustive-deps

  const [planView, setPlanView] = useState("instructions");
  const headingRef = useRef(null);
  useEffect(() => {
    headingRef.current?.focus();
    if (creating) queueMicrotask(() => setComposeVisited(true));
  }, [creating]);
  const [workflowBlocked, setWorkflowBlocked] = useState(false);
  const [workflowGuardLoading, setWorkflowGuardLoading] = useState(true);
  const [workflowGuardError, setWorkflowGuardError] = useState(false);
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
    const sequence = ++planDetailSequenceRef.current;
    setSelectedPlan(fallback ?? selectedPlan);
    setPlanDetailLoading(true);
    setPlanDetailError("");
    try {
      const response = await recoveryPlansApi.get(planId);
      if (sequence !== planDetailSequenceRef.current) return;
      setSelectedPlan(response?.data ?? fallback);
    } catch (error) {
      if (sequence !== planDetailSequenceRef.current) return;
      setPlanDetailError("Chưa tải được đầy đủ hướng dẫn của bác sĩ. Vui lòng thử lại.");
      if (error?.status === 404 || getApiErrorCode(error) === "NOT_FOUND") {
        setSelectedPlan(null);
      } else {
        showToast({ type: "error", title: "Không tải được kế hoạch", message: "Vui lòng thử lại sau." });
      }
    } finally {
      if (sequence === planDetailSequenceRef.current) setPlanDetailLoading(false);
    }
  }

  const loadPlans = useCallback(async (pageNumber = planPageNumber, preferredId = "") => {
    setPlansLoading(true);
    setPlansError("");
    try {
      const response = await recoveryPlansApi.listMine({ pageNumber, pageSize: PAGE_SIZE });
      const nextPage = normalizePaged(response, pageNumber);
      for (let page = 2; page <= nextPage.totalPages; page += 1) {
        const extra = await recoveryPlansApi.listMine({ pageNumber: page, pageSize: PAGE_SIZE });
        nextPage.items.push(...normalizePaged(extra, page).items);
      }
      nextPage.items.sort((a, b) => Number(BLOCKING_PLAN_STATUSES.includes(b.status)) - Number(BLOCKING_PLAN_STATUSES.includes(a.status))
        || getTimeMs(b.publishedAt) - getTimeMs(a.publishedAt));
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
    setWorkflowGuardError(false);
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
    } catch {
      setWorkflowGuardError(true);
      return true;
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
    navigate("/recovery-plan");
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
      await Promise.allSettled([
        loadRequests(requestPageNumber, request.id),
        loadWorkflowGuard(),
      ]);
    } catch (error) {
      const mapped = getRecoveryError(error, "Chưa thể hủy yêu cầu. Vui lòng thử lại.");
      showToast({ type: "error", title: "Không thể hủy yêu cầu", message: mapped.message });
      if (["INVALID_REQUEST_STATE", "NOT_FOUND"].includes(mapped.code)) {
        await Promise.allSettled([loadRequests(requestPageNumber), loadWorkflowGuard()]);
      }
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

  const noCredits = !quotaLoading && (
    (!quotaError && quota && Number(quota.remainingCount) <= 0)
    || quotaError?.action === "purchase"
  );
  const requestCreationDisabled = workflowGuardError || workflowGuardLoading
    || workflowBlocked
    || quotaLoading
    || Boolean(quotaError)
    || !quota
    || Number(quota.remainingCount) <= 0;
  const requestDisabledMessage = workflowGuardError
    ? "Chưa thể kiểm tra trạng thái yêu cầu. Hãy tải lại trước khi gửi." : workflowBlocked
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
    const term = normalizeHistorySearch(historySearch);
    const sorted = allRequests.filter((item) => normalizeHistorySearch(
      `${getDiseaseLabel(item.diseaseGroup)} ${REQUEST_STATUS[item.status]?.label || ""}`
    ).includes(term)).sort((a, b) => {
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
  }, [allRequests, requestSortDirection, requestPageNumber, historySearch]);
  const requestItems = useMemo(() => requestPage.items, [requestPage.items]);
  const planItems = useMemo(() => planPage.items, [planPage.items]);

  const historyPlans = [...planItems].filter((item) => normalizeHistorySearch(
    `${item.planName || "Kế hoạch phục hồi"} ${PLAN_STATUS[item.status]?.label || ""}`
  ).includes(normalizeHistorySearch(historySearch))).sort((a, b) => {
    const diff = getTimeMs(a.publishedAt) - getTimeMs(b.publishedAt);
    return requestSortDirection === "asc" ? diff : -diff;
  });
  const currentPlanItem = planItems[0] ?? null;
  const currentPlan = selectedPlan?.id === currentPlanItem?.id ? selectedPlan : currentPlanItem;
  const currentRequestItem = [...allRequests].sort((a, b) =>
    Number(BLOCKING_REQUEST_STATUSES.includes(b.status)) - Number(BLOCKING_REQUEST_STATUSES.includes(a.status))
    || getTimeMs(b.requestedAt) - getTimeMs(a.requestedAt))[0] ?? null;
  const currentRequest = selectedRequest?.id === currentRequestItem?.id ? selectedRequest : currentRequestItem;
  const showCurrentRequest = currentRequest && BLOCKING_REQUEST_STATUSES.includes(currentRequest.status);
  const initialLoading = (requestsLoading && !allRequests.length) || (plansLoading && !planItems.length) || workflowGuardLoading;
  const openRequest = () => navigate("/recovery-plan?view=request");
  function closeHistory() {
    setHistoryOpen(false);
    setHistoryDetail(null);
    if (currentPlanItem && selectedPlan?.id !== currentPlanItem.id) void loadPlanDetail(currentPlanItem.id, currentPlanItem);
  }

  return (
    <div className="recovery-page recovery-focused">
      <header className="recovery-page-header recovery-focused-header">
        <div>
          {creating && <Button tone="ghost" onClick={() => navigate("/recovery-plan")}><ChevronLeft size={18} /> Về theo dõi phục hồi</Button>}
          <p className="recovery-eyebrow">{creating ? "Yêu cầu mới" : "Chăm sóc sau khám"}</p>
          <h2 ref={headingRef} tabIndex={-1}>{creating ? "Gửi yêu cầu cho bác sĩ" : "Kế hoạch phục hồi"}</h2>
          <p>{creating ? "Chia sẻ thông tin để bác sĩ chuẩn bị kế hoạch phù hợp." : "Theo dõi yêu cầu và hướng dẫn phục hồi của bạn."}</p>
        </div>
        {!creating && <div className="recovery-header-actions">
          <Button tone="secondary" onClick={() => setHistoryOpen(true)}>Lịch sử</Button>
          <Button tone="ghost" disabled={requestsLoading || plansLoading} onClick={refetchAll}><RefreshCw size={16} /> Tải lại</Button>
          {!workflowBlocked && !initialLoading && !noCredits && (requestCreationDisabled
            ? <Button tone="secondary" loading={quotaLoading} loadingLabel="Đang kiểm tra lượt…" onClick={refetchAll}>Kiểm tra lượt sử dụng</Button>
            : <Button onClick={openRequest}>Gửi yêu cầu mới</Button>)}
        </div>}
      </header>
      <p className="sr-only" role="status" aria-atomic="true">{statusMessage}</p>
      <p className="sr-only" role="status" aria-atomic="true">{realtimeLabel}</p>
      {/* Keep this page's draft mounted across its views; never persist health data in storage. */}
      {(creating || composeVisited) && <div hidden={!creating} className="recovery-request-screen">
        {noCredits && <RecoveryCreditNotice returnTo="/recovery-plan?view=request" />}
        <div hidden={Boolean(noCredits)}>
        <CreateRequestForm disabled={requestCreationDisabled} disabledMessage={requestDisabledMessage}
          quotaContent={<QuotaCard quota={quota} error={quotaError} loading={quotaLoading} onRetry={loadQuota} />}
          onCreated={handleCreated} onWorkflowConflict={async () => { setWorkflowBlocked(true); await refetchAll(); }} />
        <p className="recovery-draft-note">Thông tin đang nhập được giữ khi chuyển giữa hai màn hình này, nhưng không được lưu khi tải lại hoặc rời trang.</p>
        </div>
      </div>}
      {!creating && <section className="recovery-tracking" aria-label="Theo dõi phục hồi" id="recovery-workspace" tabIndex={-1}>
        {!initialLoading && noCredits && <RecoveryCreditNotice />}
        {initialLoading ? <LoadingState label="Đang tải tình trạng phục hồi…" />
          : requestsError || plansError || workflowGuardError ? <ErrorState title="Chưa tải được tình trạng phục hồi"
            description={requestsError || plansError || requestDisabledMessage} action={<Button onClick={refetchAll}>Thử lại</Button>} />
          : showCurrentRequest ? <RequestDetail request={currentRequest} loading={requestDetailLoading} busy={actionBusy} onCancel={handleCancel} />
          : currentPlan ? <>
            <div className="recovery-view-switch" role="group" aria-label="Cách xem kế hoạch">
              <Button tone={planView === "instructions" ? "primary" : "secondary"} aria-pressed={planView === "instructions"} onClick={() => setPlanView("instructions")}>Hướng dẫn phục hồi</Button>
              <Button tone={planView === "calendar" ? "primary" : "secondary"} aria-pressed={planView === "calendar"} onClick={() => setPlanView("calendar")}>Lịch thực hiện</Button>
            </div>
            {planDetailError ? <ErrorState title="Không thể tải hướng dẫn" description={planDetailError} action={<Button onClick={() => loadPlanDetail(currentPlan.id, currentPlan)}>Thử lại</Button>} /> : planView === "instructions" ? <PlanDetail focused key={currentPlan.id} plan={currentPlan} loading={planDetailLoading}
              busy={actionBusy} onStart={handleStart} onCancel={setCancelPlan} onFeedback={openFeedbackDialog} />
              : <RecoveryTimelineCalendar plan={currentPlan} loading={planDetailLoading} />}
          </> : currentRequest ? <section className="recovery-recent-request" aria-label="Yêu cầu gần nhất">
            <div><p className="recovery-eyebrow">Yêu cầu gần nhất</p><h3>{getDiseaseLabel(currentRequest.diseaseGroup)}</h3>
              <p>{formatDate(currentRequest.requestedAt, true)}</p></div>
            <StatusBadge map={REQUEST_STATUS} value={currentRequest.status} />
            <Button tone="secondary" onClick={() => { setActiveTab("requests"); setHistoryDetail("requests"); void loadRequestDetail(currentRequest.id, currentRequest); setHistoryOpen(true); }}>Xem chi tiết</Button>
          </section>
          : <EmptyState icon={<FileText size={26} />} title="Bắt đầu kế hoạch phục hồi của bạn"
            description="Gửi thông tin sau khám để bác sĩ xem xét và chuẩn bị kế hoạch."
            action={!requestCreationDisabled ? <Button onClick={openRequest}>Tạo yêu cầu phục hồi</Button> : undefined} />}
        {!initialLoading && requestCreationDisabled && !workflowBlocked && !noCredits && <div className="recovery-access-note">
          <p>{requestDisabledMessage}</p>
          <p>Bạn vẫn có thể xem các yêu cầu và kế hoạch đã có.</p>
        </div>}
      </section>}
      {historyOpen && <Dialog className="recovery-history-panel recovery-focused" backdropClassName="recovery-drawer-backdrop"
        labelledBy="recovery-history-title" onClose={closeHistory}>
        <header className="recovery-history-header">
          <div><p className="recovery-eyebrow">Hồ sơ phục hồi</p><h2 id="recovery-history-title">Lịch sử</h2></div>
          <Button tone="secondary" onClick={closeHistory}><X size={18} aria-hidden="true" /> Đóng lịch sử</Button>
        </header>
        {historyDetail ? <div className="recovery-history-detail-view" ref={historyContentRef} tabIndex={-1}>
          <Button className="recovery-history-back" tone="secondary" onClick={() => setHistoryDetail(null)}>
            <ChevronLeft size={18} aria-hidden="true" /> Về danh sách {historyDetail === "requests" ? "yêu cầu" : "kế hoạch"}
          </Button>
          {historyDetail === "requests" ? <RequestDetail request={selectedRequest} loading={requestDetailLoading}
            busy={actionBusy} onCancel={(request) => { closeHistory(); void handleCancel(request); }} />
            : planDetailError ? <ErrorState title="Không thể tải hướng dẫn" description={planDetailError}
              action={<Button onClick={() => loadPlans(1)}>Thử lại</Button>} />
            : <PlanDetail focused key={selectedPlan?.id} plan={selectedPlan} loading={planDetailLoading} busy={actionBusy}
              onStart={handleStart} onCancel={(plan) => { closeHistory(); setCancelPlan(plan); }}
              onFeedback={(plan) => { closeHistory(); openFeedbackDialog(plan); }} />}
        </div> : <div className="recovery-history-list-view" ref={historyContentRef} tabIndex={-1}>
          <div className="recovery-history-tabs" role="group" aria-label="Loại lịch sử">
            <Button tone={activeTab === "requests" ? "primary" : "secondary"} aria-pressed={activeTab === "requests"}
              onClick={() => { setActiveTab("requests"); setHistorySearch(""); setRequestPageNumber(1); }}>Yêu cầu của bạn</Button>
            <Button tone={activeTab === "plans" ? "primary" : "secondary"} aria-pressed={activeTab === "plans"}
              onClick={() => { setActiveTab("plans"); setHistorySearch(""); setRequestPageNumber(1); }}>Kế hoạch của bạn</Button>
          </div>
          <div className="recovery-history-controls">
            <Field label="Tìm trong lịch sử">
              <input type="search" value={historySearch} placeholder={activeTab === "requests" ? "Nhóm bệnh hoặc trạng thái" : "Tên kế hoạch hoặc trạng thái"}
                onChange={(event) => { setHistorySearch(event.target.value); setRequestPageNumber(1); }} />
            </Field>
            <Field label="Sắp xếp">
              <Select value={requestSortDirection} onChange={(event) => { setRequestSortDirection(event.target.value); setRequestPageNumber(1); }}>
                {REQUEST_SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
            </Field>
          </div>
          <p className="recovery-history-count" role="status">{activeTab === "requests" ? requestPage.totalCount : historyPlans.length} {activeTab === "requests" ? "yêu cầu" : "kế hoạch"}{historySearch ? " phù hợp" : ""}</p>
          {activeTab === "requests" ? <section aria-label="Lịch sử yêu cầu">
            {requestsLoading ? <LoadingState label="Đang tải yêu cầu…" /> : requestsError ? <ErrorState title="Không thể tải yêu cầu" description={requestsError} action={<Button onClick={() => loadRequests(1)}>Thử lại</Button>} />
              : !requestItems.length ? <EmptyState title={historySearch ? "Không tìm thấy yêu cầu phù hợp" : "Chưa có yêu cầu phục hồi"}
                action={historySearch ? <Button tone="secondary" onClick={() => setHistorySearch("")}>Xóa tìm kiếm</Button> : undefined} /> : <>
              <div className="recovery-history-rows">
                {requestItems.map((item) => <button type="button" key={item.id} className="recovery-history-row"
                  onClick={() => { setHistoryDetail("requests"); void loadRequestDetail(item.id, item); }}>
                  <span className="recovery-history-row-main"><strong>{getDiseaseLabel(item.diseaseGroup)}</strong><small>{formatDate(item.requestedAt, true)}</small></span>
                  <StatusBadge map={REQUEST_STATUS} value={item.status} />
                  <ChevronRight size={20} aria-hidden="true" />
                </button>)}
              </div>
              <Pagination label="Phân trang yêu cầu phục hồi" page={requestPage} loading={requestsLoading} onChange={setRequestPageNumber} />
            </>}
          </section> : <section aria-label="Lịch sử kế hoạch">
            {plansLoading ? <LoadingState label="Đang tải kế hoạch…" /> : plansError ? <ErrorState title="Không thể tải kế hoạch" description={plansError} action={<Button onClick={() => loadPlans(1)}>Thử lại</Button>} />
              : !historyPlans.length ? <EmptyState title={historySearch ? "Không tìm thấy kế hoạch phù hợp" : "Chưa có kế hoạch được xuất bản"}
                action={historySearch ? <Button tone="secondary" onClick={() => setHistorySearch("")}>Xóa tìm kiếm</Button> : undefined} />
              : <div className="recovery-history-rows">{historyPlans.map((item) => <button type="button" key={item.id} className="recovery-history-row"
                onClick={() => { setHistoryDetail("plans"); void loadPlanDetail(item.id, item); }}>
                <span className="recovery-history-row-main"><strong>{item.planName || "Kế hoạch phục hồi"}</strong><small>{formatDate(item.publishedAt)}</small></span>
                <StatusBadge map={PLAN_STATUS} value={item.status} /><ChevronRight size={20} aria-hidden="true" />
              </button>)}</div>}
          </section>}
        </div>}
      </Dialog>}

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
