import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileCheck2,
  FileScan,
  FlaskConical,
  HeartPulse,
  History,
  Hourglass,
  IdCard,
  ListChecks,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  UploadCloud,
  UserRound,
  VenusAndMars,
  X,
} from "lucide-react";
import LabTestTrendSection from "../components/lab-tests/LabTestTrendSection";
import { Button, ErrorState, LoadingState, useOverlayFocus } from "../components/ui";
import { useFeedback } from "../components/feedback/feedbackContext";
import { navigate } from "../router/navigation";
import { getServiceCreditErrorPresentation } from "../services/serviceCredit";
import { useServiceCredit } from "../state/useServiceCredit";
import { normalizeAsyncSessionStatus } from "../utils/asyncSessionStatus";
import {
  authApi,
  getLabTestApiMessage,
  labTestsApi,
} from "../services/api";
import {
  uploadMedicalDocumentToCloudinary,
  validateMedicalDocument,
} from "../services/cloudinaryUploadService";
import "../styles/analysis-history-panel.css";
import "../styles/user-workspace/medical-records.css";

const HISTORY_PAGE_SIZE = 8;
const STATUS_LABELS = {
  processing: "Đang phân tích",
  completed: "Đã hoàn tất",
  failed: "Không thành công",
};
const GENDER_LABELS = { male: "Nam", female: "Nữ" };

function unwrapData(response) {
  return response?.data ?? response?.Data ?? response;
}

function todayInputValue() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

function normalizeGender(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["male", "m", "nam", "1"].includes(normalized)) return "male";
  if (["female", "f", "nữ", "nu", "2"].includes(normalized)) return "female";
  return "";
}

function parseDateParts(value) {
  const [year, month, day] = String(value ?? "").slice(0, 10).split("-").map(Number);
  if (![year, month, day].every(Number.isInteger)) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) return null;
  return { year, month, day };
}

function calculateAgeAtTest(dateOfBirth, testDate) {
  const birth = parseDateParts(dateOfBirth);
  const test = parseDateParts(testDate);
  if (!birth || !test) return null;

  let age = test.year - birth.year;
  if (test.month < birth.month || (test.month === birth.month && test.day < birth.day)) age -= 1;
  return age >= 0 && age <= 130 ? age : null;
}

function formatDate(value, fallback = "Chưa cập nhật") {
  if (!value) return fallback;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? fallback : new Intl.DateTimeFormat("vi-VN").format(date);
}

function formatDateTime(value) {
  if (!value) return "Chưa có thời gian xử lý";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Chưa có thời gian xử lý"
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function getLabSessionDate(session) {
  return session?.testDate
    ?? session?.createdAt
    ?? session?.processedAt
    ?? session?.uploadedAt
    ?? session?.createdAtUtc;
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes)) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIdentity(file) {
  return file ? `${file.name}:${file.size}:${file.lastModified}` : "";
}

function isImageFile(file) {
  return Boolean(file && /^image\//.test(file.type));
}

function profileProblem(profile, profileStatus) {
  if (profileStatus === "error") return "Không thể tải hồ sơ cá nhân để chuẩn bị dữ liệu phân tích.";
  if (profileStatus !== "ready") return "Đang tải hồ sơ cá nhân.";
  if (!profile?.dateOfBirth) return "Hồ sơ cá nhân chưa có ngày sinh.";
  if (!normalizeGender(profile?.gender)) return "Giới tính trong hồ sơ chưa phù hợp với biểu mẫu phân tích hiện tại.";
  return "";
}

function LabTestHistoryPanel({
  open,
  onClose,
  sessions,
  status,
  error,
  historyInfo,
  historyPage,
  historyFilter,
  onFilterChange,
  onReload,
  onPageChange,
  onViewSession,
  onContinue,
}) {
  const panelRef = useRef(null);
  const closeButtonRef = useRef(null);

  useOverlayFocus({
    active: open,
    containerRef: panelRef,
    initialFocusRef: closeButtonRef,
    onClose,
  });

  if (!open) return null;

  return (
    <div className="analysis-history-drawer records-history-drawer">
      <div className="analysis-history-backdrop" onClick={onClose} aria-hidden="true" />
      <aside
        className="analysis-history-panel records-history-drawer-panel"
        id="records-history-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="records-history-panel-title"
        aria-busy={status === "loading"}
        tabIndex={-1}
      >
        <header className="analysis-history-panel-header">
          <div>
            <span><Clock3 size={15} aria-hidden="true" /> Lịch sử</span>
            <h2 id="records-history-panel-title">Lịch sử xét nghiệm</h2>
          </div>
          <button ref={closeButtonRef} type="button" className="analysis-history-close" onClick={onClose} aria-label="Đóng lịch sử xét nghiệm">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="analysis-history-panel-body">
          <div className="records-history-drawer-tools">
            <label className="records-history-filter" htmlFor="records-status-filter">
              <span>Trạng thái</span>
              <select id="records-status-filter" value={historyFilter} onChange={(event) => onFilterChange(event.target.value)}>
                <option value="">Tất cả phiên</option>
                <option value="processing">Đang phân tích</option>
                <option value="completed">Đã hoàn tất</option>
                <option value="failed">Không thành công</option>
              </select>
            </label>
            <button type="button" className="records-history-refresh" onClick={onReload} aria-label="Tải lại lịch sử xét nghiệm">
              <RefreshCw size={17} aria-hidden="true" />
            </button>
          </div>

          <p className="records-history-count" role="status">{historyInfo.totalCount} phiên xét nghiệm</p>

          {status === "loading" && (
            <div className="analysis-history-state">
              <RefreshCw className="analysis-history-spin" size={22} aria-hidden="true" />
              <p>Đang tải lịch sử...</p>
            </div>
          )}

          {status === "error" && (
            <div className="analysis-history-state error">
              <p>{error}</p>
              <Button type="button" tone="secondary" size="sm" onClick={onReload}>
                <RefreshCw size={16} aria-hidden="true" />
                Thử lại
              </Button>
            </div>
          )}

          {status === "ready" && sessions.length === 0 && (
            <div className="analysis-history-empty">
              <FileCheck2 size={24} aria-hidden="true" />
              <strong>Chưa có phiên xét nghiệm</strong>
              <p>Phiên mới sẽ xuất hiện tại đây sau khi bạn gửi phiếu phân tích.</p>
            </div>
          )}

          {status === "ready" && sessions.length > 0 && (
            <div className="analysis-history-list records-history-drawer-list">
              {sessions.map((session) => (
                <article key={session.sessionId || `${getLabSessionDate(session)}-${session.status}`}>
                  <div>
                    <strong>{formatDate(getLabSessionDate(session), "Chưa có ngày")}</strong>
                    <span>{session.facilityName || formatDateTime(session.processedAt || session.createdAt)}</span>
                    <small>
                      Phân tích xét nghiệm · {STATUS_LABELS[normalizeAsyncSessionStatus(session.status)] || "Đang cập nhật"}
                    </small>
                  </div>
                  <Button type="button" tone="secondary" size="sm" onClick={() => onViewSession(session.sessionId)}>
                    Chi tiết
                  </Button>
                </article>
              ))}
            </div>
          )}

          {status === "ready" && historyInfo.totalPages > 1 && (
            <nav className="records-pagination" aria-label="Phân trang lịch sử xét nghiệm">
              <button type="button" disabled={historyPage <= 1} onClick={() => onPageChange(historyPage - 1)} aria-label="Trang lịch sử trước"><ChevronLeft size={17} /></button>
              <span>Trang {historyPage} / {historyInfo.totalPages}</span>
              <button type="button" disabled={historyPage >= historyInfo.totalPages} onClick={() => onPageChange(historyPage + 1)} aria-label="Trang lịch sử sau"><ChevronRight size={17} /></button>
            </nav>
          )}
        </div>

        <footer className="analysis-history-panel-footer">
          <Button type="button" className="analysis-history-continue" onClick={onContinue}>
            Phân tích xét nghiệm mới
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </footer>
      </aside>
    </div>
  );
}

export default function MedicalRecordPage() {
  const { showToast } = useFeedback();
  const { refresh: refreshServiceCredit } = useServiceCredit();
  const [profile, setProfile] = useState(null);
  const [profileStatus, setProfileStatus] = useState("loading");
  const [profileReloadKey, setProfileReloadKey] = useState(0);
  const [documentFile, setDocumentFile] = useState(null);
  const [uploadedDocument, setUploadedDocument] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [submissionStatus, setSubmissionStatus] = useState("idle");
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [creditFailure, setCreditFailure] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [historyStatus, setHistoryStatus] = useState("loading");
  const [historyError, setHistoryError] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyFilter, setHistoryFilter] = useState("");
  const [historyInfo, setHistoryInfo] = useState({ totalCount: 0, totalPages: 1 });
  const [historyReloadKey, setHistoryReloadKey] = useState(0);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const [trendRefreshKey, setTrendRefreshKey] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [filePreviewUrl, setFilePreviewUrl] = useState("");
  const errorSummaryRef = useRef(null);
  const analyzeInFlightRef = useRef(false);

  const gender = normalizeGender(profile?.gender);
  const currentAge = useMemo(
    () => calculateAgeAtTest(profile?.dateOfBirth, todayInputValue()),
    [profile?.dateOfBirth],
  );
  const currentProfileProblem = profileProblem(profile, profileStatus);
  const isSubmitting = ["uploading", "analyzing"].includes(submissionStatus);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const response = await authApi.me();
        if (!active) return;
        setProfile(unwrapData(response) ?? null);
        setProfileStatus("ready");
      } catch {
        if (!active) return;
        setProfile(null);
        setProfileStatus("error");
      }
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [profileReloadKey]);

  useEffect(() => {
    if (!isImageFile(documentFile)) {
      setFilePreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(documentFile);
    setFilePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [documentFile]);

  const loadHistory = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setHistoryStatus("loading");
    setHistoryError("");
    try {
      const response = await labTestsApi.mySessions(historyPage, HISTORY_PAGE_SIZE, { status: historyFilter });
      const data = unwrapData(response) ?? {};
      setSessions(Array.isArray(data.items) ? data.items : []);
      setHistoryInfo({
        totalCount: Number(data.totalCount) || 0,
        totalPages: Math.max(1, Number(data.totalPages) || 1),
      });
      setHistoryStatus("ready");
    } catch (error) {
      const message = getLabTestApiMessage(
        error,
        "Chưa thể tải lịch sử xét nghiệm. Vui lòng thử lại.",
      );
      setHistoryError(message);
      setHistoryStatus("error");
      if (!quiet) {
        showToast({
          type: "error",
          title: "Không thể tải lịch sử xét nghiệm",
          message,
        });
      }
    }
  }, [historyFilter, historyPage, showToast]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadHistory(), 0);
    return () => window.clearTimeout(timer);
  }, [historyReloadKey, loadHistory]);

  function openHistorySession(sessionId) {
    if (!sessionId) return;
    navigate(`/records/${encodeURIComponent(sessionId)}`);
  }

  function selectFile(file) {
    try {
      validateMedicalDocument(file);
      setDocumentFile(file);
      setUploadedDocument(null);
      setFormErrors((current) => ({ ...current, document: "" }));
      setSubmissionMessage("");
    } catch (error) {
      setDocumentFile(null);
      setUploadedDocument(null);
      setFormErrors((current) => ({ ...current, document: error.message }));
    }
  }

  function handleFileChange(event) {
    selectFile(event.target.files?.[0] ?? null);
    event.target.value = "";
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragActive(false);
    selectFile(event.dataTransfer.files?.[0] ?? null);
  }

  function validateForm() {
    const nextErrors = {};
    if (currentProfileProblem) nextErrors.profile = currentProfileProblem;
    if (!documentFile) nextErrors.document = "Hãy chọn ảnh hoặc PDF phiếu xét nghiệm.";
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      window.requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return false;
    }
    return true;
  }

  async function submitAnalysis(event) {
    event.preventDefault();
    if (analyzeInFlightRef.current) return;
    if (!validateForm()) return;

    analyzeInFlightRef.current = true;
    setSubmissionMessage("");
    setCreditFailure(null);
    try {
      let documentUrl = uploadedDocument?.fileId === fileIdentity(documentFile)
        ? uploadedDocument.secureUrl
        : "";

      if (!documentUrl) {
        setSubmissionStatus("uploading");
        const upload = await uploadMedicalDocumentToCloudinary(documentFile);
        documentUrl = upload.secureUrl;
        setUploadedDocument({ fileId: fileIdentity(documentFile), secureUrl: documentUrl });
      }

      setSubmissionStatus("analyzing");
      const response = await labTestsApi.analyze({
        documentUrl,
        patientGenderAtTest: gender,
        patientAgeAtTest: currentAge,
      });
      const session = unwrapData(response) ?? null;
      if (!session?.sessionId) {
        throw new Error("Hệ thống chưa trả về mã phiên phân tích. Vui lòng thử lại.");
      }
      void refreshServiceCredit({ silent: true });
      setSubmissionStatus("success");
      const successMessage = getLabTestApiMessage(
        response,
        session?.status === "completed"
          ? "Đã nhận kết quả phân tích từ hệ thống."
          : "Phiếu xét nghiệm đã được tiếp nhận và đang được phân tích.",
      );
      setSubmissionMessage(successMessage);
      showToast({
        type: "success",
        title: "Đã gửi phiếu xét nghiệm",
        message: successMessage,
      });
      navigate(`/records/${encodeURIComponent(session.sessionId)}`);
    } catch (error) {
      const creditError = getServiceCreditErrorPresentation(error);
      setCreditFailure(creditError);
      const message = creditError?.message || getLabTestApiMessage(
        error,
        "Chưa thể xác nhận phiếu đã được tiếp nhận. Hãy kiểm tra lịch sử trước khi thử gửi lại.",
      );
      setSubmissionStatus("error");
      setSubmissionMessage(message);
      showToast({
        type: "error",
        title: creditError?.title || "Không thể phân tích phiếu xét nghiệm",
        message,
        action: creditError?.action === "purchase"
          ? { label: creditError.actionLabel || "Mua thêm lượt", onClick: () => navigate("/pricing?view=upgrade&returnTo=%2Frecords") }
          : creditError?.action === "retry"
            ? { label: creditError.actionLabel || "Thử lại", onClick: () => window.location.reload() }
            : undefined,
      });
    } finally {
      analyzeInFlightRef.current = false;
    }
  }

  function clearFile() {
    setDocumentFile(null);
    setUploadedDocument(null);
    setFormErrors((current) => ({ ...current, document: "" }));
  }

  const errorEntries = Object.entries(formErrors).filter(([, value]) => value);

  return (
    <div className="records-page lab-records-page">
      <header className="records-page-hero">
        <div>
          <p className="records-eyebrow"><FlaskConical size={16} aria-hidden="true" /> PHÂN TÍCH XÉT NGHIỆM</p>
          <h1>Đọc phiếu xét nghiệm<br />rõ ràng hơn</h1>
          <p>Tải ảnh hoặc PDF phiếu xét nghiệm. MediMate đối chiếu các chỉ số và cung cấp thông tin tham khảo.</p>
        </div>
        <div className="records-hero-actions">
          <Button
            type="button"
            tone="secondary"
            size="sm"
            className="analysis-history-button records-history-launch"
            aria-haspopup="dialog"
            aria-expanded={historyPanelOpen}
            aria-controls="records-history-panel"
            onClick={() => setHistoryPanelOpen(true)}
          >
            <History size={16} aria-hidden="true" />
            Lịch sử xét nghiệm
          </Button>
          <div className="records-hero-note">
            <ShieldCheck size={21} aria-hidden="true" />
            <div><strong>Dữ liệu sức khỏe nhạy cảm</strong><p>Chỉ tải tài liệu của bạn và kiểm tra kỹ trước khi gửi.</p></div>
          </div>
        </div>
      </header>

      <div className="records-content">
        <section className="records-upload-card" aria-labelledby="records-upload-title">
          <header>
            <div className="records-section-icon"><FileScan size={22} aria-hidden="true" /></div>
            <div><p>BẮT ĐẦU PHIÊN MỚI</p><h2 id="records-upload-title">Tải phiếu xét nghiệm sinh hóa</h2><span>Thông tin cá nhân được lấy từ hồ sơ; bạn chỉ cần tải phiếu xét nghiệm.</span></div>
          </header>

          <form onSubmit={submitAnalysis} noValidate aria-busy={isSubmitting}>
            {errorEntries.length > 0 && (
              <div className="records-error-summary" ref={errorSummaryRef} tabIndex="-1" role="alert" aria-labelledby="records-error-title">
                <strong id="records-error-title">Cần kiểm tra {errorEntries.length} mục trước khi gửi</strong>
                <ul>
                  {formErrors.document && <li><a href="#records-document">{formErrors.document}</a></li>}
                  {formErrors.profile && <li><a href="/profile">{formErrors.profile}</a></li>}
                </ul>
              </div>
            )}

            <div className="records-upload-grid">
              <section className="records-document-panel" aria-labelledby="records-document-title">
                <div
                  id="records-document"
                  className={`records-dropzone ${dragActive ? "is-dragging" : ""} ${formErrors.document ? "has-error" : ""} ${documentFile ? "has-file" : ""}`}
                  onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragActive(false); }}
                  onDrop={handleDrop}
                >
                  <div className="records-scan-frame" aria-hidden="true">
                    {filePreviewUrl ? (
                      <img className="records-preview-image" src={filePreviewUrl} alt="" />
                    ) : (
                      <>
                        <FileScan size={64} />
                        {!documentFile && <span className="records-scan-line" />}
                      </>
                    )}
                  </div>
                  <h3 id="records-document-title">Phiếu xét nghiệm</h3>
                  <p>Kéo thả tài liệu vào đây hoặc chọn file từ thiết bị.</p>
                  <label className="records-file-button">
                    <UploadCloud size={18} aria-hidden="true" />
                    <span>{documentFile ? "Chọn file khác" : "Chọn file để tải lên"}</span>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                      onChange={handleFileChange}
                      aria-describedby="records-file-hint records-document-error"
                      aria-invalid={Boolean(formErrors.document)}
                      disabled={isSubmitting}
                    />
                  </label>
                  <div id="records-file-hint" className="records-file-types">
                    <span className="records-file-chip">JPG</span>
                    <span className="records-file-chip">PNG</span>
                    <span className="records-file-chip">PDF</span>
                    <span className="records-file-types-note">tối đa 10 MB</span>
                  </div>
                </div>

                {documentFile && (
                  <div className="records-selected-file" role="status">
                    <FileCheck2 size={20} aria-hidden="true" />
                    <span><strong>{documentFile.name}</strong><small>{formatFileSize(documentFile.size)}</small></span>
                    <button type="button" onClick={clearFile} disabled={isSubmitting} aria-label={`Bỏ file ${documentFile.name}`}><X size={17} aria-hidden="true" /></button>
                  </div>
                )}
                {formErrors.document && <p id="records-document-error" className="records-field-error">{formErrors.document}</p>}
              </section>

              <section className="records-profile-panel" aria-labelledby="records-profile-title">
                <header>
                  <span><UserRound size={21} aria-hidden="true" /></span>
                  <div><h3 id="records-profile-title">Thông tin từ hồ sơ</h3><p>Không chỉnh sửa tại màn hình phân tích</p></div>
                </header>

                {profileStatus === "loading" && <LoadingState label="Đang tải hồ sơ cá nhân…" />}
                {profileStatus === "error" && (
                  <ErrorState
                    title="Không thể tải hồ sơ"
                    description="Thông tin hồ sơ là bắt buộc để phân tích đúng ngữ cảnh."
                    action={<Button type="button" onClick={() => { setProfileStatus("loading"); setProfileReloadKey((current) => current + 1); }}>Thử lại</Button>}
                  />
                )}
                {profileStatus === "ready" && (
                  <>
                    <dl className="records-profile-facts">
                      <div><dt><IdCard size={13} aria-hidden="true" /> Họ và tên</dt><dd>{profile?.displayName || profile?.name || "Chưa cập nhật"}</dd></div>
                      <div><dt><VenusAndMars size={13} aria-hidden="true" /> Giới tính</dt><dd>{GENDER_LABELS[gender] || "Chưa hỗ trợ"}</dd></div>
                      <div><dt><CalendarDays size={13} aria-hidden="true" /> Ngày sinh</dt><dd>{formatDate(profile?.dateOfBirth)}</dd></div>
                      <div>
                        <dt><Hourglass size={13} aria-hidden="true" /> Tuổi hiện tại</dt>
                        <dd aria-live="polite">{currentAge === null ? "Chưa thể tính" : `${currentAge} tuổi`}</dd>
                      </div>
                    </dl>
                    {currentProfileProblem && (
                      <div className="records-profile-warning" role="alert">
                        <AlertTriangle size={17} aria-hidden="true" />
                        <span>{currentProfileProblem} <button type="button" onClick={() => navigate("/profile")}>Cập nhật hồ sơ</button></span>
                      </div>
                    )}
                  </>
                )}

                <div className="records-actions">
                  {creditFailure?.action === "purchase" && (
                    <Button type="button" tone="secondary" onClick={() => navigate("/pricing?view=upgrade&returnTo=%2Frecords")}>Mua thêm lượt</Button>
                  )}
                  {creditFailure?.action === "retry" && (
                    <Button type="button" tone="secondary" onClick={() => window.location.reload()}>Thử lại</Button>
                  )}
                  <Button type="submit" disabled={isSubmitting || profileStatus === "loading"}>
                    {submissionStatus === "uploading" && <RefreshCw className="records-spin" size={17} aria-hidden="true" />}
                    {submissionStatus === "analyzing" && <RefreshCw className="records-spin" size={17} aria-hidden="true" />}
                    {!isSubmitting && <FileScan size={17} aria-hidden="true" />}
                    {submissionStatus === "uploading" ? "Đang tải tài liệu…" : submissionStatus === "analyzing" ? "Đang gửi phân tích…" : "Phân tích kết quả"}
                  </Button>
                </div>
              </section>
            </div>

            <footer className="records-submit-row">
              <div aria-live="polite" role={submissionStatus === "error" ? "alert" : "status"}>
                {submissionMessage || "Không tải tài liệu chứa giấy tờ tùy thân hoặc dữ liệu của người khác."}
              </div>
            </footer>
          </form>
        </section>

        <section className="records-guide" aria-labelledby="records-guide-title">
          <header>
            <p><ListChecks size={16} aria-hidden="true" /> HƯỚNG DẪN SỬ DỤNG</p>
            <h2 id="records-guide-title">4 bước để hiểu rõ kết quả xét nghiệm của bạn</h2>
          </header>
          <div className="records-guide-rail-wrap">
            <span className="records-guide-rail" aria-hidden="true" />
            <ol className="records-guide-steps">
              <li>
                <span className="records-guide-icon"><UploadCloud size={20} aria-hidden="true" /></span>
                <strong>Tải ảnh phiếu xét nghiệm</strong>
                <p>Chọn ảnh hoặc PDF phiếu xét nghiệm sinh hóa để bắt đầu.</p>
              </li>
              <li>
                <span className="records-guide-icon"><ScanSearch size={20} aria-hidden="true" /></span>
                <strong>Hệ thống phân tích chỉ số</strong>
                <p>Dữ liệu được chuẩn hoá và đối chiếu để đánh giá trạng thái từng chỉ số.</p>
              </li>
              <li>
                <span className="records-guide-icon"><HeartPulse size={20} aria-hidden="true" /></span>
                <strong>Nhận lời khuyên phù hợp</strong>
                <p>Xem thông tin cần thiết cùng gợi ý về dinh dưỡng, luyện tập.</p>
              </li>
              <li>
                <span className="records-guide-icon"><Bot size={20} aria-hidden="true" /></span>
                <strong>Tóm tắt nhanh với AI</strong>
                <p>Trò chuyện với AI để tóm tắt sơ bộ kết quả sau khi phân tích.</p>
              </li>
            </ol>
          </div>
        </section>

        <LabTestTrendSection
          refreshKey={trendRefreshKey}
          onOpenSession={openHistorySession}
        />
      </div>

      <LabTestHistoryPanel
        open={historyPanelOpen}
        onClose={() => setHistoryPanelOpen(false)}
        sessions={sessions}
        status={historyStatus}
        error={historyError}
        historyInfo={historyInfo}
        historyPage={historyPage}
        historyFilter={historyFilter}
        onFilterChange={(value) => {
          setHistoryFilter(value);
          setHistoryPage(1);
        }}
        onReload={() => {
          setHistoryReloadKey((current) => current + 1);
          setTrendRefreshKey((current) => current + 1);
        }}
        onPageChange={setHistoryPage}
        onViewSession={openHistorySession}
        onContinue={() => {
          setHistoryPanelOpen(false);
          window.requestAnimationFrame(() => {
            document.getElementById("records-upload-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
          });
        }}
      />
    </div>
  );
}
