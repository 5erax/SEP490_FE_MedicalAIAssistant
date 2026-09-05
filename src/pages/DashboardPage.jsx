import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ClipboardPlus, Gauge, History, LocateFixed, MapPinned, RefreshCw, Send } from "lucide-react";
import { Alert, Button, Field, Textarea } from "../components/ui";
import { navigate } from "../router/navigation";
import {
  getClinicalQuestionAnswerMode,
  getClinicalQuestionAnswerOptions,
  getClinicalQuestionBooleanPrompts,
  isClinicalQuestionAnswered,
  readSymptomAnalysisQuota,
  SYMPTOM_ANALYSIS_MESSAGES,
  symptomAnalysisApi,
} from "../services/api";
import AnalysisHistoryPanel, { ANALYSIS_HISTORY_PANEL_ID } from "../components/analysis/AnalysisHistoryPanel";
import { useSymptomIntake } from "../hooks/useSymptomIntake";
import { hasAuthRole } from "../utils/roles";
import { useAuthSession } from "../state/useAuthSession";
import PatientProfileNudge from "../components/workspace/PatientProfileNudge";
import ClinicalNote from "../components/clinical/ClinicalNote";
import ClinicalDisclosure from "../components/clinical/ClinicalDisclosure";
import DepartmentRecommendation from "../components/clinical/DepartmentRecommendation";
import ClinicalConfidenceGuide from "../components/clinical/ClinicalConfidenceGuide";
import { CLINICAL_NOTES } from "../content/clinicalNotes";
import { clinicalConfidencePercent, hasClinicalPriority } from "../utils/clinicalPresentation";
import "../styles/dashboard.css";
import "../styles/dashboard-clinical.css";

/* The service owns clinical question selection and specialty recommendation. */
function unwrapPayload(response) {
  return response?.data?.data ?? response?.data ?? response;
}

function getQuestionId(question, index) {
  if (typeof question === "string") return `question-${index + 1}`;
  return question.questionId ?? question.id ?? question.code ?? `question-${index + 1}`;
}

function normalizeQuestion(question, index) {
  if (typeof question === "string") {
    return {
      questionId: getQuestionId(question, index),
      questionText: question,
    };
  }

  return {
    ...question,
    questionId: getQuestionId(question, index),
    questionText: question.questionVi || question.questionText || question.text || question.content || `Câu hỏi lâm sàng ${index + 1}`,
  };
}

function looksLikeQuestion(item) {
  if (typeof item === "string") return item.trim().length > 0;
  if (!item || typeof item !== "object") return false;
  return Boolean(item.questionId || item.questionVi || item.questionText || item.text || item.content);
}

function findFirstByKeys(value, keys) {
  if (!value || typeof value !== "object") return undefined;

  for (const key of keys) {
    const directValue = value[key];
    if (Array.isArray(directValue) && directValue.some(looksLikeQuestion)) return directValue;
    if (directValue && typeof directValue === "object" && looksLikeQuestion(directValue)) return [directValue];
  }

  for (const nestedValue of Object.values(value)) {
    const found = findFirstByKeys(nestedValue, keys);
    if (found) return found;
  }

  return undefined;
}

function findFirstSessionId(value) {
  if (!value || typeof value !== "object") return "";
  const direct = value.sessionId ?? value.sessionID ?? value.session?.id ?? value.id;
  if (direct) return direct;

  for (const nestedValue of Object.values(value)) {
    const found = findFirstSessionId(nestedValue);
    if (found) return found;
  }

  return "";
}

function readQuestionsPayload(response) {
  const data = unwrapPayload(response) ?? {};
  const questionKeys = [
    "questions",
    "clinicalQuestions",
    "suggestedQuestions",
    "followUpQuestions",
    "clinicalQuestionSuggestions",
    "questionSuggestions",
    "items",
    "data",
  ];
  const questions = Array.isArray(data) && data.some(looksLikeQuestion)
    ? data
    : findFirstByKeys(data, questionKeys) ?? [];

  return {
    sessionId: findFirstSessionId(data),
    questions: Array.isArray(questions) ? questions.map(normalizeQuestion) : [],
  };
}

function readResultPayload(response) {
  const data = unwrapPayload(response);
  return data?.analysis ?? data?.result ?? data ?? null;
}

function getRecommendedDepartment(result) {
  function normalizeDepartment(department) {
    if (!department || typeof department !== "object") return null;
    const departmentId = String(
      department.departmentId
      ?? department.DepartmentId
      ?? department.id
      ?? "",
    ).trim();
    const departmentName = String(
      department.departmentName
      ?? department.DepartmentName
      ?? department.name
      ?? "",
    ).trim();
    if (!departmentId && !departmentName) return null;

    return {
      ...department,
      confidenceScore: department.confidenceScore ?? department.ConfidenceScore ?? null,
      departmentId,
      departmentName,
      description: String(
        department.description ?? department.Description ?? "",
      ).trim(),
      reason: String(department.reason ?? department.Reason ?? "").trim(),
      isEmergencySuggested: hasClinicalPriority(department),
      priorityRank: Number(
        department.priorityRank ?? department.PriorityRank ?? 0,
      ) || 0,
    };
  }

  const directDepartment = normalizeDepartment(
    result?.recommendedDepartment ?? result?.RecommendedDepartment,
  );
  if (directDepartment) return directDepartment;

  const facilities = result?.recommendedFacilities ?? result?.RecommendedFacilities;
  const departments = Array.isArray(facilities)
    ? facilities.flatMap((facility) => (
      Array.isArray(facility?.departments)
        ? facility.departments
        : Array.isArray(facility?.Departments) ? facility.Departments : []
    ))
    : [];

  return departments.map(normalizeDepartment).find(Boolean) ?? null;
}

function hasDepartmentMatch(facility, department) {
  if (!department) return false;
  const departmentId = String(department.departmentId || "");
  const departmentName = String(department.departmentName || "").toLowerCase();
  const departments = Array.isArray(facility.departments) ? facility.departments : [];

  return departments.some((item) => (
    (departmentId && String(item.departmentId) === departmentId)
    || (departmentName && String(item.departmentName || "").toLowerCase().includes(departmentName))
  ));
}

function coordinateOrNull(value, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < min || numeric > max) return null;
  return numeric;
}

function distanceKmBetween(first, second) {
  const radiusKm = 6371;
  const toRadians = (value) => (value * Math.PI) / 180;
  const deltaLat = toRadians(second.latitude - first.latitude);
  const deltaLon = toRadians(second.longitude - first.longitude);
  const lat1 = toRadians(first.latitude);
  const lat2 = toRadians(second.latitude);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getFacilityCoordinates(facility) {
  const latitude = coordinateOrNull(facility.latitude, -90, 90);
  const longitude = coordinateOrNull(facility.longitude, -180, 180);
  if (latitude == null || longitude == null) return null;
  return { latitude, longitude };
}

function getFacilityDistanceKm(facility, userLocation) {
  const facilityLocation = getFacilityCoordinates(facility);
  if (!facilityLocation || !userLocation) return null;
  return distanceKmBetween(userLocation, facilityLocation);
}

function getFacilityId(facility) {
  return facility?.facilityId || facility?.id || "";
}

function formatDistance(distanceKm) {
  if (distanceKm == null) return "";
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`;
}

function scoreFacility(facility, department, userLocation) {
  let score = 0;
  if (hasDepartmentMatch(facility, department)) score += 100;
  const distanceKm = getFacilityDistanceKm(facility, userLocation);
  if (distanceKm != null) score += Math.max(0, 60 - distanceKm * 4);
  else if (getFacilityCoordinates(facility)) score += 20;
  if (facility.rating || facility.averageRating) score += Number(facility.rating ?? facility.averageRating) * 3;
  if (facility.isActive) score += 12;
  if (facility.openingHours) score += 8;
  if (facility.phone) score += 6;
  if (facility.website) score += 4;
  return score;
}

function getFacilityRankingReason(facility, department, userLocation) {
  const reasons = [];
  const distanceKm = getFacilityDistanceKm(facility, userLocation);

  if (hasDepartmentMatch(facility, department)) {
    reasons.push("có chuyên khoa liên quan");
  }
  if (distanceKm != null) {
    reasons.push(`cách bạn khoảng ${formatDistance(distanceKm)}`);
  } else if (getFacilityCoordinates(facility)) {
    reasons.push("có tọa độ sẵn sàng điều hướng");
  }
  if (facility.rating || facility.averageRating) {
    reasons.push(`${facility.rating ?? facility.averageRating} sao đánh giá`);
  }
  if (facility.isActive) {
    reasons.push("đang hoạt động");
  }

  return reasons.length
    ? `Ưu tiên vì ${reasons.join(", ")}.`
    : "Nằm trong danh sách cơ sở được hệ thống gợi ý.";
}

function sortRecommendedFacilities(result, userLocation) {
  const department = getRecommendedDepartment(result);
  return [...(result?.recommendedFacilities ?? [])]
    .sort((left, right) => (
      scoreFacility(right, department, userLocation)
      - scoreFacility(left, department, userLocation)
    ));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

const FACILITY_PAGE_SIZE = 5;

function FacilityResultList({ facilities, recommendedDepartment, userLocation }) {
  const [pageNumber, setPageNumber] = useState(1);
  const totalPages = Math.max(1, Math.ceil(facilities.length / FACILITY_PAGE_SIZE));
  const pagedFacilities = facilities.slice(
    (pageNumber - 1) * FACILITY_PAGE_SIZE,
    pageNumber * FACILITY_PAGE_SIZE,
  );

  return (
    <>
      <div className="studio-facility-list">
        {pagedFacilities.map((facility, localIndex) => (
          <article key={facility.id || facility.facilityId || facility.facilityName}>
            <span>#{(pageNumber - 1) * FACILITY_PAGE_SIZE + localIndex + 1}</span>
            <div>
              <strong>{facility.facilityName || "Cơ sở y tế"}</strong>
              <p>{facility.address || "Chưa có địa chỉ"}</p>
              <small>{getFacilityRankingReason(facility, recommendedDepartment, userLocation)}</small>
            </div>
          </article>
        ))}
      </div>
      {totalPages > 1 && (
        <nav className="studio-facility-pagination" aria-label="Phân trang cơ sở y tế được gợi ý">
          <Button
            tone="ghost"
            size="sm"
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((current) => current - 1)}
          >
            <ChevronLeft size={16} aria-hidden="true" /> Trang trước
          </Button>
          <span>Trang {pageNumber}/{totalPages}</span>
          <Button
            tone="ghost"
            size="sm"
            disabled={pageNumber >= totalPages}
            onClick={() => setPageNumber((current) => current + 1)}
          >
            Trang sau <ChevronRight size={16} aria-hidden="true" />
          </Button>
        </nav>
      )}
    </>
  );
}

function SpecialtyQuotaBadge({ quota, status, error, onRetry }) {
  if (status === "loading") {
    return (
      <span className="specialty-quota-badge is-loading" aria-live="polite" aria-busy="true">
        <Gauge size={16} aria-hidden="true" /><strong>…</strong><span>lượt hôm nay</span>
      </span>
    );
  }

  if (status === "error") {
    return (
      <button
        className="specialty-quota-badge is-error"
        type="button"
        title={error}
        aria-label={`Tải lại hạn mức tư vấn. ${error}`}
        onClick={() => void onRetry()}
      >
        <RefreshCw size={15} aria-hidden="true" /><span>Tải lại hạn mức</span>
      </button>
    );
  }

  if (!quota) return null;
  const exhausted = quota.remainingToday <= 0;
  const dailyBenefitLabel = quota.isFreeTier ? "lượt miễn phí hôm nay" : "lượt hôm nay";
  const planLabel = quota.isFreeTier
    ? "Gói miễn phí"
    : quota.hasServiceCredit ? "Có lượt dịch vụ" : "Tài khoản hiện tại";

  return (
    <span
      className={`specialty-quota-badge ${exhausted ? "is-exhausted" : ""}`}
      aria-label={`Còn ${quota.remainingToday} trên ${quota.limitPerDay} lượt gợi ý chuyên khoa ${quota.isFreeTier ? "miễn phí " : ""}hôm nay. Hạn mức được làm mới mỗi ngày. Đã dùng ${quota.usedToday} lượt. ${planLabel}.`}
      title={`Làm mới mỗi ngày · Đã dùng ${quota.usedToday}/${quota.limitPerDay} lượt · ${planLabel}`}
    >
      <Gauge size={16} aria-hidden="true" />
      <strong>Còn {quota.remainingToday}/{quota.limitPerDay}</strong>
      <span>{dailyBenefitLabel}</span>
    </span>
  );
}

export default function DashboardPage() {
  const { auth } = useAuthSession();
  const isAdminSession = hasAuthRole(auth, "admin");
  const {
    answeredCount,
    answers,
    canSubmitAnswers,
    currentQuestionIndex,
    error,
    input,
    loading,
    questions,
    questionsPanelRef,
    resetDiagnosis,
    result,
    sessionId,
    setCurrentQuestionIndex,
    setInput,
    startDiagnosis,
    status,
    submitAnswers,
    updateAnswer,
  } = useSymptomIntake({
    onResult: handleDiagnosisResult,
    readQuestionsPayload,
    readResultPayload,
  });

  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle");
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const [symptomQuota, setSymptomQuota] = useState(null);
  const [quotaStatus, setQuotaStatus] = useState("loading");
  const [quotaError, setQuotaError] = useState("");

  const recommendedDepartment = getRecommendedDepartment(result);
  const sortedFacilities = sortRecommendedFacilities(result, userLocation);

  const activeStep = status === "result"
    ? 2
    : ["questions", "submitting"].includes(status) ? 1 : 0;

  const currentQuestion = questions[currentQuestionIndex] ?? null;
  const currentQuestionId = currentQuestion?.questionId ?? "";
  const currentAnswer = currentQuestionId ? answers[currentQuestionId] : undefined;
  const currentAnswerMode = currentQuestion ? getClinicalQuestionAnswerMode(currentQuestion) : "choice";
  const currentAnswerOptions = currentQuestion ? getClinicalQuestionAnswerOptions(currentQuestion) : [];
  const currentBooleanPrompts = currentQuestion ? getClinicalQuestionBooleanPrompts(currentQuestion) : [];
  const currentQuestionAnswered = currentQuestion
    ? isClinicalQuestionAnswered(currentQuestion, currentAnswer)
    : false;
  const questionProgressPercent = questions.length
    ? Math.round((answeredCount / questions.length) * 100)
    : 0;
  const showIntakeForm = ["idle", "loading-questions", "no-questions"].includes(status);
  const showQuestionFlow = ["questions", "submitting"].includes(status) && currentQuestion;
  const symptomInputError = [
    SYMPTOM_ANALYSIS_MESSAGES.inputRequired,
    SYMPTOM_ANALYSIS_MESSAGES.inputTooLong,
  ].includes(error) ? error : "";
  const quotaExhausted = quotaStatus === "ready" && symptomQuota?.remainingToday <= 0;

  async function refreshSymptomQuota() {
    setQuotaStatus("loading");
    setQuotaError("");
    try {
      const response = await symptomAnalysisApi.getQuota();
      setSymptomQuota(readSymptomAnalysisQuota(response));
      setQuotaStatus("ready");
    } catch (requestError) {
      setSymptomQuota(null);
      setQuotaError(requestError?.message || "Chưa tải được hạn mức tư vấn chuyên khoa.");
      setQuotaStatus("error");
    }
  }

  async function startSpecialtyAnalysis() {
    if (quotaExhausted) return;
    await startDiagnosis();
    void refreshSymptomQuota();
  }

  useEffect(() => {
    let active = true;
    symptomAnalysisApi.getQuota()
      .then((response) => {
        if (!active) return;
        setSymptomQuota(readSymptomAnalysisQuota(response));
        setQuotaStatus("ready");
      })
      .catch((requestError) => {
        if (!active) return;
        setQuotaError(requestError?.message || "Chưa tải được hạn mức tư vấn chuyên khoa.");
        setQuotaStatus("error");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isAdminSession) {
      navigate("/app/admin");
    }
  }, [isAdminSession]);

  function requestUserLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("unsupported");
      return;
    }

    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationStatus("ready");
      },
      () => {
        setLocationStatus("denied");
      },
      {
        enableHighAccuracy: false,
        maximumAge: 5 * 60 * 1000,
        timeout: 8000,
      },
    );
  }

  function openFacilities(
    completedResult = result,
    completedSessionId = sessionId,
  ) {
    const completedDepartment = getRecommendedDepartment(completedResult);
    const completedFacilities = completedResult?.recommendedFacilities ?? [];
    const topFacility = completedFacilities[0] ?? null;
    const params = new URLSearchParams();
    const facilityId = getFacilityId(topFacility);

    params.set("source", "clinical");
    if (facilityId) params.set("facilityId", facilityId);
    if (completedDepartment?.departmentId) params.set("departmentId", completedDepartment.departmentId);
    if (completedSessionId) params.set("sessionId", completedSessionId);

    const query = params.toString();
    navigate(query ? `/map?${query}` : "/map");
  }

  function handleDiagnosisResult({
    result: completedResult,
    sessionId: completedSessionId,
  }) {
    openFacilities(completedResult, completedSessionId);
  }

  function openHistoricalSuggestion({ sessionId: historicalSessionId }) {
    if (!historicalSessionId) return;
    setHistoryPanelOpen(false);
    openFacilities(null, historicalSessionId);
  }

  function goToPreviousQuestion() {
    setCurrentQuestionIndex((index) => Math.max(0, index - 1));
  }

  function goToNextQuestion() {
    setCurrentQuestionIndex((index) => Math.min(questions.length - 1, index + 1));
  }

  function updateBooleanAnswer(answerKey, value) {
    updateAnswer(currentQuestionId, {
      ...(isPlainObject(currentAnswer) ? currentAnswer : {}),
      [answerKey]: value,
    });
  }

  return (
    <section className="specialty-page specialty-clinical-page" aria-labelledby="specialty-intake-title">
      <section className="studio-center" aria-labelledby="specialty-intake-title">
        <PatientProfileNudge visible={showIntakeForm} />

        <div className="specialty-clinical-hero-shell">
        <header className="studio-heading specialty-clinical-heading">
          <div className="specialty-heading-main">
            <span className="studio-mark" aria-hidden="true"><ClipboardPlus size={24} /></span>
            <div>
              <p className="studio-eyebrow">Tư vấn chuyên khoa</p>
              <h2 id="specialty-intake-title">Gợi ý chuyên khoa qua triệu chứng</h2>
              <p>Mô tả dấu hiệu bạn đang gặp. MediMate sẽ hỏi thêm một số câu ngắn trước khi gợi ý chuyên khoa và cơ sở y tế phù hợp.</p>
            </div>
          </div>
          <div className="studio-heading-actions specialty-heading-aside">
            <Button
              type="button"
              tone="secondary"
              size="sm"
              className="analysis-history-button"
              aria-haspopup="dialog"
              aria-controls={ANALYSIS_HISTORY_PANEL_ID}
              aria-expanded={historyPanelOpen}
              onClick={() => setHistoryPanelOpen(true)}
            >
              <History size={16} />
              Lịch sử gợi ý chuyên khoa
            </Button>
          </div>
        </header>
        </div>

        <ClinicalNote title={CLINICAL_NOTES.scopeTitle}>{CLINICAL_NOTES.scope}</ClinicalNote>

        <ol className="studio-flow" aria-label="Tiến trình tư vấn">
          {["Mô tả", "Làm rõ", "Kết quả"].map((label, index) => (
            <li
              className={index === activeStep ? "active" : index < activeStep ? "complete" : ""}
              key={label}
              aria-current={index === activeStep ? "step" : undefined}
            >
              <span>{index + 1}</span>
              <strong>{label}</strong>
            </li>
          ))}
        </ol>

        {showIntakeForm && (
          <form className="studio-chatbox" noValidate onSubmit={(event) => {
            event.preventDefault();
            void startSpecialtyAnalysis();
          }}>
            <div className="studio-form-heading">
              <div>
                <span>Bước 1</span>
                <h3>Mô tả điều bạn đang cảm nhận</h3>
              </div>
              <div className="studio-form-meta">
                <SpecialtyQuotaBadge
                  quota={symptomQuota}
                  status={quotaStatus}
                  error={quotaError}
                  onRetry={refreshSymptomQuota}
                />
              </div>
            </div>

            <Field
              id="specialty-symptoms"
              label="Triệu chứng bạn đang gặp"
              hint={CLINICAL_NOTES.symptomHint}
              error={symptomInputError}
              required
            >
              <Textarea
                name="symptoms"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ví dụ: Tôi đau bụng âm ỉ sau bữa ăn, buồn nôn nhẹ..."
                rows={4}
                disabled={loading}
                aria-describedby="specialty-symptoms-limit"
              />
            </Field>

            <p id="specialty-symptoms-limit" className="clinical-character-limit">Tối đa 2.000 ký tự</p>

            <div className="studio-chat-actions">
              <span className="studio-status" aria-live="polite">
                {status === "loading-questions"
                  ? "AI đang chọn câu hỏi cần hỏi thêm..."
                  : quotaExhausted
                    ? <><strong>Đã hết lượt hôm nay.</strong> Bạn có thể quay lại vào ngày tiếp theo.</>
                    : <><strong>Sẵn sàng.</strong> MediMate sẽ hỏi thêm một số câu ngắn.</>}
              </span>
              <Button
                className="studio-submit-icon"
                size="lg"
                loading={loading}
                loadingLabel="Đang tạo câu hỏi..."
                disabled={loading || quotaExhausted}
                type="submit"
                aria-label="Gửi triệu chứng"
                title="Gửi triệu chứng"
              >
                <Send size={18} />
              </Button>
            </div>
          </form>
        )}

        {showIntakeForm && (
          <ClinicalNote tone="warning" title={CLINICAL_NOTES.emergencyTitle}>{CLINICAL_NOTES.emergency}</ClinicalNote>
        )}

        {error && !symptomInputError && (
          <Alert tone="danger" title="Không thể kết nối dịch vụ gợi ý chuyên khoa" live>
            {error}
          </Alert>
        )}
        {error && !symptomInputError && (
          <div className="studio-recovery-actions">
            <Button type="button" tone="secondary" onClick={() => resetDiagnosis()}>Quay lại biểu mẫu</Button>
            <Button type="button" onClick={() => void startSpecialtyAnalysis()}>Thử lại</Button>
          </div>
        )}

        {status === "no-questions" && (
          <Alert tone="warning" title="AI chưa có câu hỏi phù hợp" live>
            Hãy mô tả rõ hơn về thời gian xuất hiện, vị trí đau, mức độ và triệu chứng đi kèm.
          </Alert>
        )}
        {status === "no-questions" && (
          <div className="studio-recovery-actions">
            <Button type="button" tone="secondary" onClick={() => resetDiagnosis()}>Quay lại biểu mẫu</Button>
            <Button type="button" onClick={() => void startSpecialtyAnalysis()}>Thử lại với mô tả hiện tại</Button>
          </div>
        )}

        {showQuestionFlow && (
          <form
            className="studio-diagnosis-panel studio-question-focus specialty-question-flow"
            onSubmit={submitAnswers}
            ref={questionsPanelRef}
            tabIndex={-1}
            aria-live="polite"
          >
            <div className="specialty-question-topline">
              <span>Câu {currentQuestionIndex + 1}/{questions.length}</span>
              <strong>{questionProgressPercent}%</strong>
            </div>

            <div
              className="studio-answer-progress specialty-question-progress"
              role="progressbar"
              aria-label={`Đã trả lời ${answeredCount} trên ${questions.length} câu hỏi`}
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={questionProgressPercent}
            >
              <span className="studio-answer-track">
                <i style={{ width: `${questionProgressPercent}%` }} />
              </span>
            </div>

            <fieldset className="specialty-question-card">
              <legend>{currentQuestion.questionText}</legend>

              {currentAnswerMode === "boolean-list" ? (
                <div className="specialty-answer-list" aria-label={`Trả lời câu hỏi ${currentQuestionIndex + 1}`}>
                  {currentBooleanPrompts.map((prompt) => {
                    const selectedValue = isPlainObject(currentAnswer)
                      ? currentAnswer[prompt.key]
                      : undefined;

                    return (
                      <section className="specialty-answer-row" key={prompt.key}>
                        <strong>{prompt.label}</strong>
                        <div className="specialty-answer-grid" role="group" aria-label={`Trả lời ${prompt.label}`}>
                          <button
                            className={selectedValue === true ? "selected yes" : ""}
                            type="button"
                            aria-pressed={selectedValue === true}
                            onClick={() => updateBooleanAnswer(prompt.key, true)}
                          >
                            Có
                          </button>
                          <button
                            className={selectedValue === false ? "selected no" : ""}
                            type="button"
                            aria-pressed={selectedValue === false}
                            onClick={() => updateBooleanAnswer(prompt.key, false)}
                          >
                            Không
                          </button>
                        </div>
                      </section>
                    );
                  })}
                </div>
              ) : (
                <div className="specialty-answer-grid specialty-answer-choice-grid" role="group" aria-label={`Trả lời câu hỏi ${currentQuestionIndex + 1}`}>
                  {currentAnswerOptions.map(([answerKey, label], answerIndex) => (
                    <button
                      className={[
                        currentAnswer === answerKey ? "selected" : "",
                        answerIndex === 0 ? "yes" : "",
                        answerIndex === 1 ? "no" : "",
                      ].filter(Boolean).join(" ")}
                      type="button"
                      key={answerKey}
                      aria-pressed={currentAnswer === answerKey}
                      onClick={() => updateAnswer(currentQuestionId, answerKey)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </fieldset>

            <div className="studio-question-actions specialty-question-actions">
              <Button
                className="clinical-question-reset"
                type="button"
                tone="ghost"
                disabled={status === "submitting"}
                onClick={() => resetDiagnosis()}
              >
                Quay lại biểu mẫu
              </Button>

              <Button
                className="clinical-question-previous"
                type="button"
                tone="secondary"
                disabled={currentQuestionIndex === 0 || status === "submitting"}
                onClick={goToPreviousQuestion}
              >
                Câu trước
              </Button>

              {currentQuestionIndex < questions.length - 1 ? (
                <Button
                  className="clinical-question-next"
                  type="button"
                  disabled={!currentQuestionAnswered || status === "submitting"}
                  onClick={goToNextQuestion}
                >
                  Câu tiếp theo
                </Button>
              ) : (
                <Button
                  className="clinical-question-submit"
                  size="lg"
                  type="submit"
                  loading={status === "submitting"}
                  loadingLabel="Đang tạo gợi ý..."
                  disabled={!canSubmitAnswers}
                >
                  Xem gợi ý
                </Button>
              )}
            </div>
          </form>
        )}

        {status === "result" && (
          <section className="studio-result-panel" aria-label="Kết quả gợi ý chuyên khoa và cơ sở y tế">
            <article className="studio-result-card specialty">
              <DepartmentRecommendation key={sessionId || "current"} department={recommendedDepartment} />
              {clinicalConfidencePercent(recommendedDepartment?.confidenceScore) !== null && <ClinicalConfidenceGuide />}
              {Number(recommendedDepartment?.priorityRank) > 0 && (
                <div className="studio-result-meta">
                  <small>Thứ tự ưu tiên: {recommendedDepartment.priorityRank}</small>
                </div>
              )}
            </article>

            <article className="studio-result-card facilities">
              <div className="studio-panel-head compact">
                <div>
                  <span>Cơ sở y tế được gợi ý</span>
                  <h2>Những nơi có chuyên khoa phù hợp</h2>
                  <p className="clinical-guidance">Danh sách cơ sở từ kết quả tư vấn của bạn.</p>
                </div>
                <div className="facility-panel-actions">
                  <Button
                    type="button"
                    tone="secondary"
                    loading={locationStatus === "loading"}
                    loadingLabel="Đang lấy vị trí..."
                    onClick={requestUserLocation}
                    disabled={locationStatus === "ready"}
                  >
                    <LocateFixed size={18} aria-hidden="true" />
                    {locationStatus === "ready" ? "Đã có vị trí" : "Dùng vị trí của tôi"}
                  </Button>
                  <Button type="button" onClick={openFacilities}>
                    <MapPinned size={18} aria-hidden="true" />
                    Mở bản đồ
                  </Button>
                </div>
              </div>

              <ClinicalDisclosure title={CLINICAL_NOTES.distanceTitle}>
                <p className="clinical-guidance">{CLINICAL_NOTES.distance} Khoảng cách được hiển thị sau khi bạn cho phép sử dụng vị trí.</p>
              </ClinicalDisclosure>

              {locationStatus === "denied" && (
                <Alert tone="warning" live>
                  Trình duyệt chưa cấp quyền vị trí. Danh sách vẫn ưu tiên chuyên khoa, tọa độ hợp lệ và đánh giá thật khi có dữ liệu.
                </Alert>
              )}
              {locationStatus === "unsupported" && (
                <Alert tone="warning" live>
                  Trình duyệt không hỗ trợ định vị. Bạn vẫn có thể mở bản đồ và tìm theo chuyên khoa được đề xuất.
                </Alert>
              )}

              {sortedFacilities.length === 0 ? (
                <p className="clinical-guidance">Hệ thống chưa trả về cơ sở y tế cụ thể. Hãy thử lại với mô tả triệu chứng rõ hơn.</p>
              ) : (
                <FacilityResultList
                  key={sessionId}
                  facilities={sortedFacilities}
                  recommendedDepartment={recommendedDepartment}
                  userLocation={userLocation}
                />
              )}
            </article>
          </section>
        )}

        {status === "result" && (
          <div className="studio-recovery-actions">
            <Button type="button" tone="secondary" onClick={() => resetDiagnosis({ clearInput: true })}>Nhập triệu chứng mới</Button>
          </div>
        )}
      </section>

      <AnalysisHistoryPanel
        open={historyPanelOpen}
        onClose={() => setHistoryPanelOpen(false)}
        sessionType="department"
        onContinue={() => setHistoryPanelOpen(false)}
        onViewSession={openHistoricalSuggestion}
      />
    </section>
  );
}
