import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ClipboardPlus,
  Gauge,
  History,
  LoaderCircle,
  LocateFixed,
  RefreshCw,
  Send,
} from "lucide-react";
import { Alert, Button, Field, Textarea } from "../components/ui";
import { navigate, replaceRoute } from "../router/navigation";
import {
  getClinicalQuestionAnswerMode,
  getClinicalQuestionAnswerOptions,
  getClinicalQuestionBooleanPrompts,
  isClinicalQuestionAnswered,
  readSymptomAnalysisQuota,
  SYMPTOM_ANALYSIS_MESSAGES,
  medicalDepartmentsApi,
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
    confidenceScore: diagnosis.paGivenB
      ?? diagnosis.PAGivenB
      ?? diagnosis.confidenceScore
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

function normalizeSymptomAsDiagnosis(symptom, index) {
  if (!symptom || typeof symptom !== "object") return null;
  return normalizeDiagnosis({
    clinicalReasoning: symptom.extractedText
      ?? symptom.ExtractedText
      ?? symptom.clinicalReasoning
      ?? symptom.ClinicalReasoning,
    confidenceScore: symptom.paGivenB
      ?? symptom.PAGivenB
      ?? symptom.confidenceScore
      ?? symptom.ConfidenceScore,
    diseaseName: symptom.symptomName
      ?? symptom.SymptomName
      ?? symptom.diseaseName
      ?? symptom.DiseaseName
      ?? symptom.name,
    icd10Code: symptom.icd10Code ?? symptom.Icd10Code ?? symptom.ICD10Code,
    rank: index + 1,
  }, index);
}

function getDiagnosisKey(diagnosis, index) {
  return [
    diagnosis?.rank ?? index + 1,
    diagnosis?.icd10Code,
    diagnosis?.diseaseName,
  ].filter(Boolean).join(":") || `diagnosis-${index}`;
}

function getResultDiagnoses(result) {
  const root = result && typeof result === "object" ? result : {};
  const analysis = readAnalysisSource(result);
  const diagnosisItems = [
    root.diagnoses,
    root.Diagnoses,
    root.differentialDiagnoses,
    root.DifferentialDiagnoses,
    root.possibleDiagnoses,
    root.PossibleDiagnoses,
    root.suggestedDiagnoses,
    root.SuggestedDiagnoses,
    root.diagnosisSuggestions,
    root.DiagnosisSuggestions,
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
    root.primaryDiagnosis,
    root.PrimaryDiagnosis,
    root.diagnosis,
    root.Diagnosis,
    analysis.primaryDiagnosis,
    analysis.PrimaryDiagnosis,
    analysis.diagnosis,
    analysis.Diagnosis,
  ].find((item) => item && typeof item === "object");
  const source = diagnosisItems ?? (primaryDiagnosis ? [primaryDiagnosis] : []);
  const diagnoses = source
    .map(normalizeDiagnosis)
    .filter(Boolean)
    .sort((left, right) => left.rank - right.rank);
  if (diagnoses.length > 0) return diagnoses;

  const symptomItems = [
    root.symptoms,
    root.Symptoms,
    root.extractedSymptoms,
    root.ExtractedSymptoms,
    analysis.symptoms,
    analysis.Symptoms,
    analysis.extractedSymptoms,
    analysis.ExtractedSymptoms,
  ].find((items) => Array.isArray(items) && items.length > 0);

  return (symptomItems ?? [])
    .map(normalizeSymptomAsDiagnosis)
    .filter(Boolean)
    .sort((left, right) => {
      const leftConfidence = clinicalConfidencePercent(left.confidenceScore) ?? 0;
      const rightConfidence = clinicalConfidencePercent(right.confidenceScore) ?? 0;
      return rightConfidence - leftConfidence;
    })
    .map((diagnosis, index) => ({ ...diagnosis, rank: index + 1 }));
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
    recommendedDepartment: analysis.recommendedDepartment
      ?? analysis.RecommendedDepartment
      ?? analysis.recommendedDepartments?.[0]
      ?? analysis.RecommendedDepartments?.[0]
      ?? null,
    recommendedFacilities: getRecommendedFacilities(analysis),
    diagnoses: getResultDiagnoses(result),
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
    analysis?.recommendedDepartment
      ?? analysis?.RecommendedDepartment
      ?? analysis?.recommendedDepartments?.[0]
      ?? analysis?.RecommendedDepartments?.[0],
  );
  if (directDepartment) return directDepartment;
  return null;
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

const DASHBOARD_RETURN_RESULT_KEY = "medimate.dashboard.returnResult";

function consumeDashboardReturnResult() {
  if (typeof sessionStorage === "undefined") return EMPTY_HISTORICAL_RESULT;

  try {
    const rawSnapshot = sessionStorage.getItem(DASHBOARD_RETURN_RESULT_KEY);
    if (!rawSnapshot) return EMPTY_HISTORICAL_RESULT;
    sessionStorage.removeItem(DASHBOARD_RETURN_RESULT_KEY);
    const snapshot = JSON.parse(rawSnapshot);
    const nextResult = normalizeSpecialtyResult(snapshot?.result, snapshot?.sessionId, snapshot?.session);
    if (!nextResult) return EMPTY_HISTORICAL_RESULT;

    return {
      error: "",
      result: nextResult,
      session: snapshot?.session ?? null,
      sessionId: snapshot?.sessionId || nextResult.sessionId || "",
      status: "ready",
    };
  } catch {
    sessionStorage.removeItem(DASHBOARD_RETURN_RESULT_KEY);
    return EMPTY_HISTORICAL_RESULT;
  }
}

function rememberDashboardReturnResult({ result, session = null, sessionId = "" }) {
  if (typeof sessionStorage === "undefined" || !result) return;

  try {
    sessionStorage.setItem(DASHBOARD_RETURN_RESULT_KEY, JSON.stringify({
      result,
      session,
      sessionId,
    }));
  } catch {
    // Ignore storage failures; browser history fallback still applies.
  }
}

function rememberResultHistoryEntry(sessionId) {
  if (!sessionId) return;
  const params = new URLSearchParams(window.location.search);
  params.set("resultSessionId", sessionId);
  const search = params.toString();
  const nextLocation = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
  const currentLocation = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (nextLocation !== currentLocation) {
    window.history.pushState(null, "", nextLocation);
  }
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

function SpecialtyResultView({
  result,
  sessionId,
  symptomText,
  departmentDescription = "",
  loading = false,
  error = "",
  onOpenFacilities,
  onBack,
  backLabel = "Quay lại",
  onReset,
  onRetry,
}) {
  const backControl = onBack ? (
    <button type="button" className="specialty-result-back-button" onClick={onBack}>
      <ArrowLeft size={17} aria-hidden="true" />
      <span>{backLabel}</span>
    </button>
  ) : null;

  if (loading) {
    return (
      <section className="studio-result-panel specialty-result-page" aria-label="Đang tải kết quả gợi ý chuyên khoa">
        {backControl}
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
        {backControl}
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
  const departmentPercent = clinicalConfidencePercent(recommendedDepartment?.confidenceScore);
  const fallbackPercent = diagnoses
    .map((diagnosis) => clinicalConfidencePercent(diagnosis.confidenceScore))
    .find((confidence) => confidence !== null && confidence > 0);
  const percent = departmentPercent !== null && departmentPercent > 0
    ? departmentPercent
    : fallbackPercent ?? departmentPercent;
  const departmentName = recommendedDepartment?.departmentName || "Chưa xác định chuyên khoa";
  const reason = recommendedDepartment?.reason || "";
  const displayDepartmentDescription = departmentDescription || recommendedDepartment?.description || "";
  const displayedSymptom = getResultSymptomText(result, symptomText);
  const hasFacilities = facilities.length > 0;
  const hasPriority = hasClinicalPriority(recommendedDepartment);

  return (
    <section className="studio-result-panel specialty-result-page" aria-label="Kết quả định hướng chuyên khoa">
      {backControl}
      <section className="specialty-result-hero" aria-labelledby="specialty-result-title">
        <p className="specialty-result-complete">
          <span className="specialty-result-complete-mark" aria-hidden="true">✓</span>
          Đã hoàn thành phân tích
        </p>
        <h2 id="specialty-result-title" className="specialty-result-department">{departmentName}</h2>

        {displayDepartmentDescription && (
          <div className="specialty-result-department-info">
            <h3>Chuyên khoa này điều trị những gì?</h3>
            <p>{displayDepartmentDescription}</p>
          </div>
        )}

        <p className="specialty-result-hero-note">
          MediMate nhận thấy chuyên khoa này phù hợp nhất với các thông tin bạn đã cung cấp.
        </p>
        <details className="specialty-result-inline-help specialty-result-explanation-detail">
          <summary>Vì sao lại có kết quả này?</summary>
          <p>
            {reason || "MediMate đối chiếu mô tả triệu chứng và câu trả lời làm rõ với nhóm vấn đề thường được chuyên khoa này tiếp nhận."}
          </p>
          {displayedSymptom && <p>Triệu chứng đã ghi nhận: {displayedSymptom}</p>}
        </details>
        {hasPriority && (
          <p className="specialty-result-priority-note">{CLINICAL_NOTES.priority}</p>
        )}
      </section>

      <section className="specialty-result-block specialty-result-possibilities" aria-labelledby="specialty-result-possibilities-title">
        <h3 id="specialty-result-possibilities-title">Các khả năng được cân nhắc</h3>

        {diagnoses.length > 0 ? (
          <>
            <ol className="specialty-result-diagnosis-list">
              {diagnoses.map((diagnosis, index) => {
                const key = getDiagnosisKey(diagnosis, index);
                const confidence = clinicalConfidencePercent(diagnosis.confidenceScore);

                return (
                  <li className={index === 0 ? "is-primary" : undefined} key={key}>
                    <div className="specialty-result-diagnosis-row">
                      <div className="specialty-result-diagnosis-main">
                        <div className="specialty-result-diagnosis-title">
                          <span className="specialty-result-diagnosis-rank">{String(index + 1).padStart(2, "0")}</span>
                          <span className="specialty-result-diagnosis-name">{diagnosis.diseaseName || diagnosis.icd10Code || "Chẩn đoán tham khảo"}</span>
                        </div>
                        <details className="specialty-result-inline-help specialty-result-diagnosis-detail" open={index === 0}>
                          <summary>Vì sao AI đề xuất kết quả này?</summary>
                          <p>
                            {diagnosis.clinicalReasoning || "Kết quả này được cân nhắc vì có điểm trùng khớp với triệu chứng đã mô tả, câu trả lời khảo sát và phạm vi thường được chuyên khoa tiếp nhận."}
                          </p>
                          {diagnosis.icd10Code && <p>ICD-10 tham khảo: {diagnosis.icd10Code}</p>}
                        </details>
                      </div>
                      {confidence !== null && (
                        <p
                          className="specialty-result-diagnosis-score"
                          style={{ "--match-score": `${confidence}%` }}
                        >
                          <span>Khả năng mắc</span>
                          <strong>{confidence}%</strong>
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
            {percent !== null && (
              <details className="specialty-result-inline-help specialty-result-confidence-help">
                <summary>Khả năng mắc được tính như thế nào?</summary>
                <p>
                  <strong>Khả năng mắc bệnh</strong> được ước tính dựa trên mức độ phổ biến của bệnh trong cộng đồng và mức độ phù hợp giữa các triệu chứng bạn cung cấp với đặc điểm của bệnh.
                </p>
                <blockquote>
                  <strong>Lưu ý:</strong> Kết quả trên chỉ mang tính chất <strong>tham khảo</strong>, được tạo ra dựa trên thông tin và triệu chứng bạn cung cấp. Đây <strong>không phải là kết luận chẩn đoán bệnh</strong> và không thay thế cho việc thăm khám, xét nghiệm hoặc tư vấn từ bác sĩ.
                </blockquote>
              </details>
            )}
          </>
        ) : (
          <p className="specialty-result-empty">Phiên này chưa có danh sách chẩn đoán tham khảo từ hệ thống.</p>
        )}
      </section>

      <section className="specialty-result-next-step" aria-labelledby="specialty-result-next-title">
        <h3 id="specialty-result-next-title">Tiếp theo bạn nên làm gì?</h3>
        <p>
          Bạn đã có định hướng chuyên khoa. Bước tiếp theo không phải là đặt lịch ngay, mà là chọn một cơ sở y tế phù hợp để MediMate chuyển bạn sang luồng tư vấn trước khám.
        </p>
        <ol className="specialty-result-next-flow" aria-label="Quy trình tiếp theo">
          <li>
            <strong>Chọn cơ sở y tế</strong>
            <span>Tìm bệnh viện hoặc phòng khám có tiếp nhận chuyên khoa được đề xuất.</span>
          </li>
          <li>
            <strong>Mở tư vấn trước khám</strong>
            <span>Sau khi chọn cơ sở, MediMate sẽ tạo phiên chuẩn bị riêng cho buổi khám đó.</span>
          </li>
          <li>
            <strong>Chuẩn bị trước khi đi khám</strong>
            <span>Bạn sẽ nhận danh sách cần mang theo, lưu ý trước khám và câu hỏi nên trao đổi với bác sĩ.</span>
          </li>
        </ol>
        {!hasFacilities && (
          <small>Bạn vẫn có thể tìm theo chuyên khoa được đề xuất dù phiên này chưa có cơ sở gợi ý trực tiếp.</small>
        )}
        <div className="specialty-result-primary-action">
          <Button
            type="button"
            onClick={() => onOpenFacilities?.(result, sessionId, { useCurrentLocation: true })}
          >
            <LocateFixed size={18} aria-hidden="true" />
            Tìm bệnh viện gần bạn
          </Button>
        </div>
      </section>

    </section>
  );
}

export default function DashboardPage() {
  const { auth } = useAuthSession();
  const isAdminSession = hasAuthRole(auth, "admin");
  const resultSessionIdFromUrl = new URLSearchParams(window.location.search).get("resultSessionId") || "";
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
  const [historicalResult, setHistoricalResult] = useState(consumeDashboardReturnResult);
  const [symptomQuota, setSymptomQuota] = useState(null);
  const [quotaStatus, setQuotaStatus] = useState("loading");
  const [quotaError, setQuotaError] = useState("");
  const [departmentDescriptionCache, setDepartmentDescriptionCache] = useState({});
  const restoringResultSessionRef = useRef("");

  const hasHistoricalResultView = historicalResult.status === "loading"
    || historicalResult.status === "error"
    || Boolean(historicalResult.result);
  const displayedResult = historicalResult.result ?? normalizeSpecialtyResult(result, sessionId);
  const displayedSessionId = historicalResult.sessionId || displayedResult?.sessionId || sessionId;
  const displayedSymptomText = historicalResult.result
    ? getResultSymptomText(historicalResult.result, getHistoricalSessionTitle(historicalResult.session, ""))
    : input;
  const displayedDepartment = getRecommendedDepartment(displayedResult);
  const displayedDepartmentId = displayedDepartment?.departmentId || "";
  const displayedDepartmentDescription = displayedDepartmentId
    ? departmentDescriptionCache[displayedDepartmentId] || ""
    : "";

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

  useEffect(() => {
    if (showResultView || resultSessionIdFromUrl) return undefined;

    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      const restoredResult = consumeDashboardReturnResult();
      if (restoredResult.result) setHistoricalResult(restoredResult);
    });

    return () => {
      active = false;
    };
  }, [resultSessionIdFromUrl, showResultView]);

  useEffect(() => {
    if (
      !displayedDepartmentId
      || displayedDepartment?.description
      || Object.prototype.hasOwnProperty.call(departmentDescriptionCache, displayedDepartmentId)
    ) {
      return undefined;
    }

    let active = true;
    medicalDepartmentsApi.get(displayedDepartmentId)
      .then((response) => {
        if (!active) return;
        const department = unwrapPayload(response);
        setDepartmentDescriptionCache((current) => ({
          ...current,
          [displayedDepartmentId]: String(
            department?.description ?? department?.Description ?? "",
          ).trim(),
        }));
      })
      .catch(() => {
        if (!active) return;
        setDepartmentDescriptionCache((current) => ({
          ...current,
          [displayedDepartmentId]: "",
        }));
      });

    return () => {
      active = false;
    };
  }, [
    departmentDescriptionCache,
    displayedDepartment,
    displayedDepartmentId,
  ]);

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
    if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(DASHBOARD_RETURN_RESULT_KEY);
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

  useEffect(() => {
    if (!resultSessionIdFromUrl) {
      restoringResultSessionRef.current = "";
      return undefined;
    }
    if (status === "result" && sessionId === resultSessionIdFromUrl && result) return undefined;
    if (restoringResultSessionRef.current === resultSessionIdFromUrl) return undefined;

    let active = true;
    restoringResultSessionRef.current = resultSessionIdFromUrl;

    Promise.resolve()
      .then(() => {
        if (!active) return null;
        setHistoricalResult({
          error: "",
          result: null,
          session: null,
          sessionId: resultSessionIdFromUrl,
          status: "loading",
        });

        const cachedResult = symptomAnalysisApi.getCachedClinicalAnalysis(resultSessionIdFromUrl);
        if (cachedResult) {
          const normalizedCachedResult = normalizeSpecialtyResult(cachedResult, resultSessionIdFromUrl);
          if (normalizedCachedResult) {
            setHistoricalResult({
              error: "",
              result: normalizedCachedResult,
              session: null,
              sessionId: resultSessionIdFromUrl,
              status: "ready",
            });
            return null;
          }
        }

        return symptomAnalysisApi.get(resultSessionIdFromUrl);
      })
      .then((response) => {
        if (!active || !response) return;
        const detail = unwrapPayload(response) ?? response;
        const nextResult = normalizeSpecialtyResult(detail, resultSessionIdFromUrl);
        if (!nextResult) throw new Error("Phiên này chưa có kết quả chuyên khoa để hiển thị.");
        setHistoricalResult({
          error: "",
          result: nextResult,
          session: null,
          sessionId: resultSessionIdFromUrl,
          status: "ready",
        });
      })
      .catch((requestError) => {
        if (!active) return;
        restoringResultSessionRef.current = "";
        setHistoricalResult({
          error: requestError?.message || "Chưa thể mở lại kết quả chuyên khoa. Vui lòng thử lại.",
          result: null,
          session: null,
          sessionId: resultSessionIdFromUrl,
          status: "error",
        });
      });

    return () => {
      active = false;
    };
  }, [
    result,
    resultSessionIdFromUrl,
    sessionId,
    status,
  ]);

  function openFacilities(
    completedResult = result,
    completedSessionId = sessionId,
    options = {},
  ) {
    const normalizedResult = normalizeSpecialtyResult(completedResult, completedSessionId);
    const stableSessionId = completedSessionId || normalizedResult?.sessionId || "";
    const completedDepartment = getRecommendedDepartment(normalizedResult);
    const completedFacilities = getRecommendedFacilities(normalizedResult);
    const topFacility = completedFacilities[0] ?? null;
    const params = new URLSearchParams();
    const facilityId = getFacilityId(topFacility);
    const shouldUseCurrentLocation = Boolean(options.useCurrentLocation);

    params.set("source", "clinical");
    if (facilityId && !shouldUseCurrentLocation) params.set("facilityId", facilityId);
    if (completedDepartment?.departmentId) params.set("departmentId", completedDepartment.departmentId);
    if (stableSessionId) params.set("sessionId", stableSessionId);
    if (shouldUseCurrentLocation) params.set("useLocation", "1");

    rememberDashboardReturnResult({
      result: normalizedResult,
      session: historicalResult.session,
      sessionId: stableSessionId,
    });
    rememberResultHistoryEntry(stableSessionId);

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
    if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(DASHBOARD_RETURN_RESULT_KEY);
    setHistoricalResult(EMPTY_HISTORICAL_RESULT);
    if (resultSessionIdFromUrl) replaceRoute("/dashboard");
    resetDiagnosis(options);
  }

  function returnToHistoryFromResult() {
    if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(DASHBOARD_RETURN_RESULT_KEY);
    setHistoricalResult(EMPTY_HISTORICAL_RESULT);
    if (resultSessionIdFromUrl) replaceRoute("/dashboard");
    setHistoryPanelOpen(true);
  }

  function returnToIntakeFromResult() {
    if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(DASHBOARD_RETURN_RESULT_KEY);
    setHistoricalResult(EMPTY_HISTORICAL_RESULT);
    if (resultSessionIdFromUrl) replaceRoute("/dashboard");
    resetDiagnosis({ clearInput: false });
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
            departmentDescription={displayedDepartmentDescription}
            loading={historicalResult.status === "loading"}
            error={historicalResult.status === "error" ? historicalResult.error : ""}
            onOpenFacilities={openFacilities}
            onBack={historicalResult.session ? returnToHistoryFromResult : returnToIntakeFromResult}
            backLabel={historicalResult.session ? "Quay lại lịch sử" : "Quay lại mô tả"}
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
