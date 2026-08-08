import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileCheck2,
  FileScan,
  FlaskConical,
  History,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react";
import { Button, EmptyState, ErrorState, LoadingState } from "../components/ui";
import { useFeedback } from "../components/feedback/feedbackContext";
import LabTestResultPage from "./LabTestResultPage";
import { navigate } from "../router/navigation";
import {
  authApi,
  getLabTestApiMessage,
  labTestsApi,
} from "../services/api";
import {
  uploadMedicalDocumentToCloudinary,
  validateMedicalDocument,
} from "../services/cloudinaryUploadService";
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

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes)) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIdentity(file) {
  return file ? `${file.name}:${file.size}:${file.lastModified}` : "";
}

function profileProblem(profile, profileStatus) {
  if (profileStatus === "error") return "Không thể tải hồ sơ cá nhân để chuẩn bị dữ liệu phân tích.";
  if (profileStatus !== "ready") return "Đang tải hồ sơ cá nhân.";
  if (!profile?.dateOfBirth) return "Hồ sơ cá nhân chưa có ngày sinh.";
  if (!normalizeGender(profile?.gender)) return "Giới tính trong hồ sơ chưa phù hợp với biểu mẫu phân tích hiện tại.";
  return "";
}

function SessionStatus({ status }) {
  const normalized = String(status ?? "processing");
  return (
    <span className={`records-status-pill is-${normalized}`}>
      {normalized === "processing" && <Clock3 size={13} aria-hidden="true" />}
      {normalized === "completed" && <CheckCircle2 size={13} aria-hidden="true" />}
      {normalized === "failed" && <AlertTriangle size={13} aria-hidden="true" />}
      {STATUS_LABELS[normalized] || normalized}
    </span>
  );
}

export default function MedicalRecordPage() {
  const { showToast } = useFeedback();
  const [profile, setProfile] = useState(null);
  const [profileStatus, setProfileStatus] = useState("loading");
  const [profileReloadKey, setProfileReloadKey] = useState(0);
  const [testDate, setTestDate] = useState("");
  const [documentFile, setDocumentFile] = useState(null);
  const [uploadedDocument, setUploadedDocument] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [submissionStatus, setSubmissionStatus] = useState("idle");
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [sessions, setSessions] = useState([]);
  const [historyStatus, setHistoryStatus] = useState("loading");
  const [historyError, setHistoryError] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyFilter, setHistoryFilter] = useState("");
  const [historyInfo, setHistoryInfo] = useState({ totalCount: 0, totalPages: 1 });
  const [historyReloadKey, setHistoryReloadKey] = useState(0);
  const [activeHistorySessionId, setActiveHistorySessionId] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const errorSummaryRef = useRef(null);
  const historyDialogRef = useRef(null);
  const historyTriggerRef = useRef(null);

  const gender = normalizeGender(profile?.gender);
  const currentAge = useMemo(
    () => calculateAgeAtTest(profile?.dateOfBirth, todayInputValue()),
    [profile?.dateOfBirth],
  );
  const ageAtTest = useMemo(
    () => calculateAgeAtTest(profile?.dateOfBirth, testDate),
    [profile?.dateOfBirth, testDate],
  );
  const displayedAge = testDate ? ageAtTest : currentAge;
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

  useEffect(() => {
    const dialog = historyDialogRef.current;
    if (!dialog) return;

    if (activeHistorySessionId && !dialog.open) {
      dialog.showModal();
    } else if (!activeHistorySessionId && dialog.open) {
      dialog.close();
    }
  }, [activeHistorySessionId]);

  const handleHistoryResponse = useCallback((response) => {
    if (!response?.message || response.message === "OK") return;
    showToast({
      type: "info",
      title: "Trạng thái phân tích xét nghiệm",
      message: getLabTestApiMessage(response),
    });
  }, [showToast]);

  const handleHistorySessionUpdate = useCallback((session) => {
    if (!session?.sessionId) return;
    setSessions((current) => current.map((item) => (
      item.sessionId === session.sessionId
        ? { ...item, ...session }
        : item
    )));
  }, []);

  function openHistorySession(sessionId, trigger) {
    if (!sessionId) return;
    historyTriggerRef.current = trigger;
    setActiveHistorySessionId(sessionId);
  }

  function closeHistorySession() {
    const dialog = historyDialogRef.current;
    if (dialog?.open) dialog.close();
    else setActiveHistorySessionId("");
  }

  function handleHistoryDialogClosed() {
    setActiveHistorySessionId("");
    window.requestAnimationFrame(() => historyTriggerRef.current?.focus());
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
    if (!testDate) nextErrors.testDate = "Hãy nhập ngày xét nghiệm.";
    else if (testDate > todayInputValue()) nextErrors.testDate = "Ngày xét nghiệm không được ở tương lai.";
    else if (ageAtTest === null) nextErrors.testDate = "Ngày xét nghiệm phải sau ngày sinh trong hồ sơ.";
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      window.requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return false;
    }
    return true;
  }

  async function submitAnalysis(event) {
    event.preventDefault();
    if (!validateForm()) return;

    setSubmissionMessage("");
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
        patientAgeAtTest: ageAtTest,
        testDate,
      });
      const session = unwrapData(response) ?? null;
      if (!session?.sessionId) {
        throw new Error("Hệ thống chưa trả về mã phiên phân tích. Vui lòng thử lại.");
      }
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
      const message = getLabTestApiMessage(
        error,
        "Chưa thể gửi phiếu xét nghiệm để phân tích. Vui lòng thử lại.",
      );
      setSubmissionStatus("error");
      setSubmissionMessage(message);
      showToast({
        type: "error",
        title: "Không thể phân tích phiếu xét nghiệm",
        message,
      });
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
          <h1>Đọc phiếu xét nghiệm rõ ràng hơn</h1>
          <p>Tải ảnh hoặc PDF phiếu xét nghiệm. MediMate đối chiếu các chỉ số và cung cấp thông tin tham khảo.</p>
        </div>
        <div className="records-hero-note">
          <ShieldCheck size={21} aria-hidden="true" />
          <div><strong>Dữ liệu sức khỏe nhạy cảm</strong><p>Chỉ tải tài liệu của bạn và kiểm tra kỹ trước khi gửi.</p></div>
        </div>
      </header>

      <div className="records-content">
        <section className="records-upload-card" aria-labelledby="records-upload-title">
          <header>
            <div className="records-section-icon"><FileScan size={22} aria-hidden="true" /></div>
            <div><p>BẮT ĐẦU PHIÊN MỚI</p><h2 id="records-upload-title">Tải phiếu xét nghiệm sinh hóa</h2><span>Thông tin cá nhân được lấy từ hồ sơ; bạn chỉ cần nhập ngày xét nghiệm.</span></div>
          </header>

          <form onSubmit={submitAnalysis} noValidate aria-busy={isSubmitting}>
            {errorEntries.length > 0 && (
              <div className="records-error-summary" ref={errorSummaryRef} tabIndex="-1" role="alert" aria-labelledby="records-error-title">
                <strong id="records-error-title">Cần kiểm tra {errorEntries.length} mục trước khi gửi</strong>
                <ul>
                  {formErrors.document && <li><a href="#records-document">{formErrors.document}</a></li>}
                  {formErrors.testDate && <li><a href="#records-test-date">{formErrors.testDate}</a></li>}
                  {formErrors.profile && <li><a href="/profile">{formErrors.profile}</a></li>}
                </ul>
              </div>
            )}

            <div className="records-upload-grid">
              <section className="records-document-panel" aria-labelledby="records-document-title">
                <div
                  id="records-document"
                  className={`records-dropzone ${dragActive ? "is-dragging" : ""} ${formErrors.document ? "has-error" : ""}`}
                  onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragActive(false); }}
                  onDrop={handleDrop}
                >
                  <div className="records-scan-frame" aria-hidden="true"><FileScan size={64} /></div>
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
                  <small id="records-file-hint">Hỗ trợ JPG, PNG, PDF · tối đa 10 MB</small>
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
                      <div><dt>Họ và tên</dt><dd>{profile?.displayName || profile?.name || "Chưa cập nhật"}</dd></div>
                      <div><dt>Giới tính</dt><dd>{GENDER_LABELS[gender] || "Chưa hỗ trợ"}</dd></div>
                      <div><dt>Ngày sinh</dt><dd>{formatDate(profile?.dateOfBirth)}</dd></div>
                      <div>
                        <dt>{testDate ? "Tuổi tại ngày xét nghiệm" : "Tuổi hiện tại"}</dt>
                        <dd aria-live="polite">{displayedAge === null ? "Chưa thể tính" : `${displayedAge} tuổi`}</dd>
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

                <label className="records-date-field" htmlFor="records-test-date">
                  <span>Ngày xét nghiệm <b>(bắt buộc)</b></span>
                  <span className="records-date-control">
                    <CalendarDays size={18} aria-hidden="true" />
                    <input
                      id="records-test-date"
                      type="date"
                      value={testDate}
                      max={todayInputValue()}
                      onChange={(event) => { setTestDate(event.target.value); setFormErrors((current) => ({ ...current, testDate: "" })); }}
                      aria-invalid={Boolean(formErrors.testDate)}
                      aria-describedby={formErrors.testDate ? "records-test-date-error" : "records-test-date-hint"}
                      required
                      disabled={isSubmitting}
                    />
                  </span>
                  <small id="records-test-date-hint">Nhập đúng ngày được in trên phiếu xét nghiệm.</small>
                </label>
                {formErrors.testDate && <p id="records-test-date-error" className="records-field-error">{formErrors.testDate}</p>}
              </section>
            </div>

            <footer className="records-submit-row">
              <div aria-live="polite" role={submissionStatus === "error" ? "alert" : "status"}>
                {submissionMessage || "Không tải tài liệu chứa giấy tờ tùy thân hoặc dữ liệu của người khác."}
              </div>
              <div className="records-actions">
                <Button type="submit" disabled={isSubmitting || profileStatus === "loading"}>
                  {submissionStatus === "uploading" && <RefreshCw className="records-spin" size={17} aria-hidden="true" />}
                  {submissionStatus === "analyzing" && <RefreshCw className="records-spin" size={17} aria-hidden="true" />}
                  {!isSubmitting && <FileScan size={17} aria-hidden="true" />}
                  {submissionStatus === "uploading" ? "Đang tải tài liệu…" : submissionStatus === "analyzing" ? "Đang gửi phân tích…" : "Phân tích kết quả"}
                </Button>
              </div>
            </footer>
          </form>
        </section>

        <section className="records-library" aria-labelledby="records-history-title">
          <div className="records-history-panel">
            <header>
              <div><History size={19} aria-hidden="true" /><span><p>PHIÊN CỦA BẠN</p><h2 id="records-history-title">Lịch sử phân tích</h2></span></div>
              <button type="button" onClick={() => setHistoryReloadKey((current) => current + 1)} aria-label="Tải lại lịch sử xét nghiệm"><RefreshCw size={17} aria-hidden="true" /></button>
            </header>

            <label className="records-history-filter" htmlFor="records-status-filter">
              <span>Trạng thái</span>
              <select id="records-status-filter" value={historyFilter} onChange={(event) => { setHistoryFilter(event.target.value); setHistoryPage(1); }}>
                <option value="">Tất cả phiên</option>
                <option value="processing">Đang phân tích</option>
                <option value="completed">Đã hoàn tất</option>
                <option value="failed">Không thành công</option>
              </select>
            </label>

            <p className="records-history-count" role="status">{historyInfo.totalCount} phiên xét nghiệm</p>
            {historyStatus === "loading" && <LoadingState label="Đang tải lịch sử…" />}
            {historyStatus === "error" && <ErrorState title="Không thể tải lịch sử" description={historyError} action={<Button onClick={() => loadHistory()}>Thử lại</Button>} />}
            {historyStatus === "ready" && sessions.length === 0 && (
              <EmptyState title="Chưa có phiên xét nghiệm" description="Phiên mới sẽ xuất hiện ở đây sau khi bạn gửi phiếu phân tích." />
            )}
            {historyStatus === "ready" && sessions.length > 0 && (
              <div className="records-history-list">
                {sessions.map((session) => (
                  <button
                    className={activeHistorySessionId === session.sessionId ? "is-selected" : ""}
                    type="button"
                    key={session.sessionId}
                    onClick={(event) => openHistorySession(session.sessionId, event.currentTarget)}
                    aria-haspopup="dialog"
                  >
                    <span><strong>{formatDate(session.testDate, "Ngày chưa xác định")}</strong><small>{session.facilityName || formatDateTime(session.processedAt || session.createdAt)}</small></span>
                    <SessionStatus status={session.status} />
                  </button>
                ))}
              </div>
            )}

            {historyStatus === "ready" && historyInfo.totalPages > 1 && (
              <nav className="records-pagination" aria-label="Phân trang lịch sử xét nghiệm">
                <button type="button" disabled={historyPage <= 1} onClick={() => setHistoryPage((current) => current - 1)} aria-label="Trang lịch sử trước"><ChevronLeft size={17} /></button>
                <span>Trang {historyPage} / {historyInfo.totalPages}</span>
                <button type="button" disabled={historyPage >= historyInfo.totalPages} onClick={() => setHistoryPage((current) => current + 1)} aria-label="Trang lịch sử sau"><ChevronRight size={17} /></button>
              </nav>
            )}
          </div>

        </section>
      </div>

      <dialog
        ref={historyDialogRef}
        className="records-history-dialog"
        aria-label="Chi tiết kết quả xét nghiệm"
        onClose={handleHistoryDialogClosed}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeHistorySession();
        }}
      >
        <div className="records-history-dialog__surface">
          <div className="records-history-dialog__toolbar">
            <div>
              <p>LỊCH SỬ PHÂN TÍCH</p>
              <strong>Chi tiết kết quả xét nghiệm</strong>
            </div>
            <button type="button" onClick={closeHistorySession} aria-label="Đóng chi tiết kết quả xét nghiệm">
              <X size={21} aria-hidden="true" />
            </button>
          </div>
          {activeHistorySessionId && (
            <LabTestResultPage
              sessionId={activeHistorySessionId}
              embedded
              onResponse={handleHistoryResponse}
              onSessionUpdate={handleHistorySessionUpdate}
            />
          )}
        </div>
      </dialog>
    </div>
  );
}
