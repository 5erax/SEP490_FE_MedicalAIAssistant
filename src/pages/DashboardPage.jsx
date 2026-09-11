import { useEffect, useState } from "react";
import {
  ClipboardPlus,
  Gauge,
  History,
  LoaderCircle,
  MapPinned,
  RefreshCw,
  Send,
} from "lucide-react";
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

function readAnalysisSource(result) {
  if (!result || typeof result !== "object") return {};
  return result.analysis ?? result.Analysis ?? result.result ?? result.Result ?? result;
}

function getRecommendedFacilities(result) {
  const analysis = readAnalysisSource(result);
  const facilities = analysis.recommendedFacilities ?? analysis.RecommendedFacilities;
  return Array.isArray(facilities) ? facilities : [];
}

function normalizeDiagnosis(diagnosis, index) {
  if (!diagnosis || typeof diagnosis !== "object") return null;
  const diseaseName = String(
    diagnosis.diseaseName
    ?? diagnosis.DiseaseName
    ?? diagnosis.diagnosisName
    ?? diagnosis.DiagnosisName
    ?? diagnosis.disease
    ?? diagnosis.Disease
    ?? diagnosis.title
    ?? diagnosis.Title
    ?? diagnosis.name
    ?? "",
  ).trim();
  const icd10Code = String(
    diagnosis.icd10Code
    ?? diagnosis.Icd10Code
    ?? diagnosis.ICD10Code
    ?? diagnosis.icdCode
    ?? diagnosis.IcdCode
    ?? "",
  ).trim();
  const clinicalReasoning = String(
    diagnosis.clinicalReasoning
    ?? diagnosis.ClinicalReasoning
    ?? diagnosis.clinicalReason
    ?? diagnosis.ClinicalReason
    ?? diagnosis.reasoning
    ?? diagnosis.Reasoning
    ?? diagnosis.explanation
    ?? diagnosis.Explanation
    ?? diagnosis.reason
    ?? diagnosis.Reason
    ?? "",
  ).trim();
  if (!diseaseName && !icd10Code && !clinicalReasoning) return null;

  return {
    confidenceScore: diagnosis.confidenceScore
      ?? diagnosis.ConfidenceScore
      ?? diagnosis.matchScore
      ?? diagnosis.MatchScore
      ?? diagnosis.matchPercentage
      ?? diagnosis.MatchPercentage
      ?? diagnosis.confidence
      ?? diagnosis.Confidence
      ?? diagnosis.score
      ?? diagnosis.Score
      ?? null,
    diseaseName,
    icd10Code,
    clinicalReasoning,
    rank: Number(diagnosis.rank ?? diagnosis.Rank ?? index + 1) || index + 1,
  };
}

function getDiagnosisKey(diagnosis, index) {
  return [
    diagnosis?.rank ?? index + 1,
    diagnosis?.icd10Code,
    diagnosis?.diseaseName,
  ].filter(Boolean).join(":") || `diagnosis-${index}`;
}

function getResultDiagnoses(result) {
  const analysis = readAnalysisSource(result);
  const diagnosisItems = [
    analysis.diagnoses,
    analysis.Diagnoses,
    analysis.differentialDiagnoses,
    analysis.DifferentialDiagnoses,
    analysis.possibleDiagnoses,
    analysis.PossibleDiagnoses,
    analysis.suggestedDiagnoses,
    analysis.SuggestedDiagnoses,
    analysis.diagnosisSuggestions,
    analysis.DiagnosisSuggestions,
  ].find((items) => Array.isArray(items) && items.length > 0);
  const primaryDiagnosis = [
    analysis.primaryDiagnosis,
    analysis.PrimaryDiagnosis,
    analysis.diagnosis,
    analysis.Diagnosis,
  ].find((item) => item && typeof item === "object");
  const source = diagnosisItems ?? (primaryDiagnosis ? [primaryDiagnosis] : []);

  return source
    .map(normalizeDiagnosis)
    .filter(Boolean)
    .sort((left, right) => left.rank - right.rank);
}

function firstNonEmptyText(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function getResultSymptomText(result, fallback = "") {
  const root = result && typeof result === "object" ? result : {};
  const analysis = readAnalysisSource(result);
  return firstNonEmptyText(
    root.inputText,
    root.userInput,
    root.symptoms,
    root.Symptoms,
    root.UserInput,
    root.InputText,
    analysis.inputText,
    analysis.userInput,
    analysis.symptoms,
    analysis.Symptoms,
    analysis.UserInput,
    analysis.InputText,
    fallback,
  );
}

function getHistoricalSessionTitle(session, fallback = "") {
  return firstNonEmptyText(
    session?.inputText,
    session?.userInput,
    session?.symptoms,
    session?.Symptoms,
    fallback,
  );
}

function normalizeSpecialtyResult(result, fallbackSessionId = "", fallbackSession = null) {
  const root = result && typeof result === "object" ? result : {};
  const analysis = readAnalysisSource(result);
  if (!analysis || typeof analysis !== "object") return null;

  return {
    ...analysis,
    recommendedDepartment: analysis.recommendedDepartment ?? analysis.RecommendedDepartment ?? null,
    recommendedFacilities: getRecommendedFacilities(analysis),
    diagnoses: getResultDiagnoses(analysis),
    inputText: getResultSymptomText(result, getHistoricalSessionTitle(fallbackSession, "")),
    sessionId: String(
      analysis.sessionId
      ?? analysis.SessionId
      ?? root.sessionId
      ?? root.SessionId
      ?? fallbackSessionId
      ?? "",
    ).trim(),
  };
}

function getRecommendedDepartment(result) {
  const analysis = readAnalysisSource(result);
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
    analysis?.recommendedDepartment ?? analysis?.RecommendedDepartment,
  );
  if (directDepartment) return directDepartment;

  const facilities = getRecommendedFacilities(analysis);
  const departments = Array.isArray(facilities)
    ? facilities.flatMap((facility) => (
      Array.isArray(facility?.departments)
        ? facility.departments
        : Array.isArray(facility?.Departments) ? facility.Departments : []
    ))
    : [];

  return departments.map(normalizeDepartment).find(Boolean) ?? null;
}

function getFacilityId(facility) {
  return facility?.facilityId || facility?.id || "";
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

const EMPTY_HISTORICAL_RESULT = {
  error: "",
  result: null,
  session: null,
  sessionId: "",
  status: "idle",
};

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

function SpecialtyResultView({
  result,
  sessionId,
  symptomText,
  sourceLabel = "Kết quả hiện tại",
  loading = false,
  error = "",
  onOpenFacilities,
  onReset,
  onRetry,
}) {
  if (loading) {
    return (
      <section className="studio-result-panel specialty-result-page" aria-label="Đang tải kết quả gợi ý chuyên khoa">
        <article className="specialty-result-state">
          <LoaderCircle className="specialty-result-spinner" size={30} aria-hidden="true" />
          <div>
            <span>Đang mở kết quả</span>
            <h2>Đang tải lại định hướng chuyên khoa</h2>
            <p>Hệ thống đang lấy phiên đã lưu để hiển thị cùng giao diện kết quả.</p>
          </div>
        </article>
      </section>
    );
  }

  if (error) {
    return (
      <section className="studio-result-panel specialty-result-page" aria-label="Không thể tải kết quả gợi ý chuyên khoa">
        <Alert tone="danger" title="Không thể mở kết quả chuyên khoa" live>
          {error}
        </Alert>
        <div className="studio-recovery-actions specialty-result-recovery-actions">
          {onRetry && <Button type="button" tone="secondary" onClick={onRetry}>Thử lại</Button>}
          {onReset && <Button type="button" onClick={onReset}>Quay lại mô tả triệu chứng</Button>}
        </div>
      </section>
    );
  }

  const recommendedDepartment = getRecommendedDepartment(result);
  const diagnoses = getResultDiagnoses(result);
  const facilities = getRecommendedFacilities(result);
  const percent = clinicalConfidencePercent(recommendedDepartment?.confidenceScore);
  const departmentName = recommendedDepartment?.departmentName || "Chưa xác định chuyên khoa";
  const reason = recommendedDepartment?.reason || "";
  const displayedSymptom = getResultSymptomText(result, symptomText);
  const hasFacilities = facilities.length > 0;
  const hasPriority = hasClinicalPriority(recommendedDepartment);
  const diagnosisReasonItems = diagnoses.filter((diagnosis) => diagnosis.clinicalReasoning);

  return (
    <section className="studio-result-panel specialty-result-page" aria-label="Kết quả định hướng chuyên khoa">
      <section className="specialty-result-hero" aria-labelledby="specialty-result-title">
        <div className="specialty-result-hero-copy">
          <p className="specialty-result-kicker">{sourceLabel}</p>
          <h2 id="specialty-result-title">Kết quả tư vấn chuyên khoa</h2>
          <div>
            <span className="specialty-result-label">Chuyên khoa được đề xuất</span>
            <strong>{departmentName}</strong>
          </div>
          <p className="specialty-result-hero-note">
            MediMate gợi ý nơi bắt đầu phù hợp nhất dựa trên triệu chứng và câu trả lời bạn đã cung cấp.
          </p>
          {hasPriority && (
            <p className="specialty-result-priority-note">{CLINICAL_NOTES.priority}</p>
          )}
          <div className="specialty-result-hero-action">
            <Button type="button" onClick={() => onOpenFacilities?.(result, sessionId)}>
              <MapPinned size={18} aria-hidden="true" />
              Tìm cơ sở y tế
            </Button>
          </div>
        </div>

        <aside className="specialty-result-score" aria-label="Độ phù hợp">
          <span>Độ phù hợp</span>
          <strong>{percent === null ? "Chưa có điểm" : `${percent}%`}</strong>
          <small>
            {percent === null
              ? "Phiên này chưa có điểm phù hợp từ hệ thống."
              : "Mức phù hợp cao nhất trong các chuyên khoa được hệ thống cân nhắc."}
          </small>
          <details className="specialty-result-inline-help">
            <summary>Độ phù hợp là gì?</summary>
            <p>
              Độ phù hợp phản ánh mức độ trùng khớp giữa triệu chứng bạn mô tả, các câu trả lời khảo sát và phạm vi tiếp nhận của từng chuyên khoa. Đây là kết quả tham khảo nhằm hỗ trợ định hướng trước khi đến cơ sở y tế.
            </p>
          </details>
        </aside>
      </section>

      <section className="specialty-result-block specialty-result-explanation" aria-labelledby="specialty-result-explanation-title">
        <header>
          <div>
            <p className="specialty-result-kicker">Giải thích</p>
            <h3 id="specialty-result-explanation-title">Vì sao MediMate đưa ra kết quả này?</h3>
          </div>
        </header>

        <div className="specialty-result-method">
          <p>MediMate đã đối chiếu:</p>
          <ul>
            <li>Triệu chứng bạn mô tả</li>
            <li>Các câu trả lời khảo sát</li>
            <li>Phạm vi tiếp nhận của chuyên khoa</li>
          </ul>
        </div>

        <div className="specialty-result-diagnosis-summary">
          <p>Các chẩn đoán được cân nhắc</p>
          {diagnoses.length > 0 ? (
            <ol className="specialty-result-diagnosis-list">
              {diagnoses.map((diagnosis, index) => {
                const key = getDiagnosisKey(diagnosis, index);
                const confidence = clinicalConfidencePercent(diagnosis.confidenceScore);

                return (
                  <li key={key}>
                    <div className="specialty-result-diagnosis-row">
                      <span>{diagnosis.diseaseName || diagnosis.icd10Code || "Chẩn đoán tham khảo"}</span>
                      <strong>{confidence ? `${confidence}%` : "Đang cân nhắc"}</strong>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="specialty-result-empty">Phiên này chưa có danh sách chẩn đoán tham khảo từ hệ thống.</p>
          )}
        </div>

        <details className="specialty-result-inline-help specialty-result-explanation-detail">
          <summary>Xem giải thích chi tiết</summary>
          <p>
            {reason || "MediMate đối chiếu mô tả triệu chứng và câu trả lời làm rõ với nhóm vấn đề thường được chuyên khoa này tiếp nhận."}
          </p>
          <p>
            Các chẩn đoán dưới đây chỉ là những khả năng được hệ thống cân nhắc dựa trên thông tin hiện có và không thay thế kết luận của bác sĩ.
          </p>
          {diagnosisReasonItems.length > 0 && (
            <ul className="specialty-result-reason-list">
              {diagnosisReasonItems.map((diagnosis, index) => (
                <li key={getDiagnosisKey(diagnosis, index)}>
                  <strong>{diagnosis.diseaseName || diagnosis.icd10Code || "Chẩn đoán tham khảo"}:</strong>
                  <span>{diagnosis.clinicalReasoning}</span>
                  {diagnosis.icd10Code && <em>ICD-10: {diagnosis.icd10Code}</em>}
                </li>
              ))}
            </ul>
          )}
          <p>{displayedSymptom || "Phiên này chưa lưu lại mô tả triệu chứng ban đầu."}</p>
        </details>
      </section>

      <section className="specialty-result-next-step" aria-labelledby="specialty-result-next-title">
        <p className="specialty-result-kicker">Bước tiếp theo</p>
        <h3 id="specialty-result-next-title">Chọn cơ sở y tế phù hợp để chuẩn bị trước khi đi khám</h3>
        <p>
          Hãy dùng nút <strong>Tìm cơ sở y tế</strong> ở phần kết luận để mở bản đồ, chọn nơi khám phù hợp rồi tiếp tục sang tư vấn trước khám.
        </p>
        {!hasFacilities && (
          <small>Bạn vẫn có thể tìm theo chuyên khoa được đề xuất dù phiên này chưa có cơ sở gợi ý trực tiếp.</small>
        )}
      </section>

    </section>
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

  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const [historicalResult, setHistoricalResult] = useState(EMPTY_HISTORICAL_RESULT);
  const [symptomQuota, setSymptomQuota] = useState(null);
  const [quotaStatus, setQuotaStatus] = useState("loading");
  const [quotaError, setQuotaError] = useState("");

  const hasHistoricalResultView = historicalResult.status === "loading"
    || historicalResult.status === "error"
    || Boolean(historicalResult.result);
  const displayedResult = historicalResult.result ?? normalizeSpecialtyResult(result, sessionId);
  const displayedSessionId = historicalResult.sessionId || displayedResult?.sessionId || sessionId;
  const displayedSymptomText = historicalResult.result
    ? getResultSymptomText(historicalResult.result, getHistoricalSessionTitle(historicalResult.session, ""))
    : input;

  const activeStep = status === "result" || hasHistoricalResultView
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
  const showIntakeForm = !hasHistoricalResultView && ["idle", "loading-questions", "no-questions"].includes(status);
  const showQuestionFlow = !hasHistoricalResultView && ["questions", "submitting"].includes(status) && currentQuestion;
  const showResultView = status === "result" || hasHistoricalResultView;
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
    setHistoricalResult(EMPTY_HISTORICAL_RESULT);
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

  function openFacilities(
    completedResult = result,
    completedSessionId = sessionId,
  ) {
    const normalizedResult = normalizeSpecialtyResult(completedResult, completedSessionId);
    const completedDepartment = getRecommendedDepartment(normalizedResult);
    const completedFacilities = getRecommendedFacilities(normalizedResult);
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

  function handleDiagnosisResult() {
    setHistoricalResult(EMPTY_HISTORICAL_RESULT);
  }

  async function openHistoricalSuggestion({ sessionId: historicalSessionId, session }) {
    if (!historicalSessionId) return;
    setHistoryPanelOpen(false);
    setHistoricalResult({
      error: "",
      result: null,
      session,
      sessionId: historicalSessionId,
      status: "loading",
    });

    const cachedResult = symptomAnalysisApi.getCachedClinicalAnalysis(historicalSessionId);
    if (cachedResult) {
      const normalizedCachedResult = normalizeSpecialtyResult(cachedResult, historicalSessionId, session);
      if (normalizedCachedResult) {
        setHistoricalResult({
          error: "",
          result: normalizedCachedResult,
          session,
          sessionId: historicalSessionId,
          status: "ready",
        });
        return;
      }
    }

    try {
      const response = await symptomAnalysisApi.get(historicalSessionId);
      const detail = unwrapPayload(response) ?? response;
      const nextResult = normalizeSpecialtyResult(detail, historicalSessionId, session);
      if (!nextResult) throw new Error("Phiên này chưa có kết quả chuyên khoa để hiển thị.");
      setHistoricalResult({
        error: "",
        result: nextResult,
        session,
        sessionId: historicalSessionId,
        status: "ready",
      });
    } catch (requestError) {
      setHistoricalResult({
        error: requestError?.message || "Chưa thể mở chi tiết kết quả chuyên khoa. Vui lòng thử lại.",
        result: null,
        session,
        sessionId: historicalSessionId,
        status: "error",
      });
    }
  }

  function resetSpecialtyFlow(options) {
    setHistoricalResult(EMPTY_HISTORICAL_RESULT);
    resetDiagnosis(options);
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
              <h2 id="specialty-intake-title">Gợi ý chuyên khoa qua triệu chứng</h2>
              <p>Mô tả dấu hiệu bạn đang gặp. MediMate sẽ hỏi thêm một số câu ngắn trước khi đưa ra định hướng chuyên khoa phù hợp.</p>
            </div>
          </div>
          <div className="studio-heading-actions specialty-heading-aside">
            <ClinicalNote className="specialty-hero-note" title={CLINICAL_NOTES.scopeTitle}>{CLINICAL_NOTES.scope}</ClinicalNote>
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
                  ? "Đang tạo câu hỏi..."
                  : quotaExhausted
                    ? <><strong>Đã hết lượt hôm nay.</strong> Bạn có thể quay lại vào ngày tiếp theo.</>
                    : <><strong>Sẵn sàng.</strong> MediMate sẽ hỏi thêm một số câu ngắn.</>}
              </span>
              <Button
                className="studio-submit-icon"
                size="lg"
                loading={loading}
                loadingLabel=""
                disabled={loading || quotaExhausted}
                type="submit"
                aria-label={loading ? "Đang tạo câu hỏi..." : "Gửi triệu chứng"}
                title={loading ? "Đang tạo câu hỏi..." : "Gửi triệu chứng"}
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

        {showResultView && (
          <SpecialtyResultView
            result={displayedResult}
            sessionId={displayedSessionId}
            symptomText={displayedSymptomText}
            sourceLabel={historicalResult.result ? "Kết quả đã lưu" : "Kết quả hiện tại"}
            loading={historicalResult.status === "loading"}
            error={historicalResult.status === "error" ? historicalResult.error : ""}
            onOpenFacilities={openFacilities}
            onRetry={historicalResult.sessionId ? () => openHistoricalSuggestion({
              sessionId: historicalResult.sessionId,
              session: historicalResult.session,
            }) : undefined}
            onReset={() => resetSpecialtyFlow({ clearInput: true })}
          />
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
