import { useEffect, useMemo, useState } from "react";
import {
  CircleCheck,
  FileText,
  History,
  MapPin,
  Send,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { Alert, Button, EmptyState, ErrorState, LoadingState, Textarea } from "../components/ui";
import { navigate } from "../router/navigation";
import AnalysisHistoryPanel, { ANALYSIS_HISTORY_PANEL_ID } from "../components/analysis/AnalysisHistoryPanel";
import {
  buildClinicalQuestionAnswerItems,
  getClinicalQuestionAnswerMode,
  getClinicalQuestionBooleanPrompts,
  getClinicalQuestionAnswerOptions,
  isClinicalQuestionAnswered,
  readAnalysisPayload,
  readSuggestClinicalQuestionsPayload,
  symptomAnalysisApi,
  unwrapApiData,
} from "../services/symptomAnalysisService";
import "../styles/medical-assessment.css";
import "../styles/medical-assessment-clinical.css";

const SESSION_KEY_PREFIX = "medimate.assessment.session.";
const assessmentSessionCache = new Map();
let assessmentDraftCache = "";

function getPagedItems(response) {
  const data = unwrapApiData(response);
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data)) return data;
  return [];
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function confidencePercent(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric <= 1 ? numeric * 100 : numeric)));
}

function diagnosisField(diagnosis, camelKey, pascalKey, fallback = "") {
  return diagnosis?.[camelKey] ?? diagnosis?.[pascalKey] ?? fallback;
}

function diagnosisRank(diagnosis, index = 0) {
  return Number(diagnosisField(diagnosis, "rank", "Rank", index + 1)) || index + 1;
}

function diagnosisName(diagnosis) {
  return diagnosisField(diagnosis, "diseaseName", "DiseaseName", "Chưa xác định");
}

function diagnosisIcd(diagnosis) {
  return diagnosisField(diagnosis, "icd10Code", "Icd10Code", "");
}

function diagnosisKeyword(diagnosis) {
  return diagnosisField(diagnosis, "searchKeyword", "SearchKeyword", "");
}

function diagnosisReasoning(diagnosis) {
  return diagnosisField(diagnosis, "clinicalReasoning", "ClinicalReasoning", "");
}

function diagnosisPAGivenB(diagnosis) {
  return Number(diagnosisField(diagnosis, "paGivenB", "PAGivenB", 0)) || 0;
}

function loadSessionState(sessionId) {
  return assessmentSessionCache.get(`${SESSION_KEY_PREFIX}${sessionId}`) ?? null;
}

function saveSessionState(sessionId, state) {
  if (!sessionId) return;
  assessmentSessionCache.set(`${SESSION_KEY_PREFIX}${sessionId}`, state);
}

function loadDraft() {
  return assessmentDraftCache;
}

function saveDraft(value) {
  assessmentDraftCache = value;
}

function getRecommendedDepartment(result) {
  return result?.recommendedDepartment
    || result?.analysis?.recommendedDepartment
    || result?.recommendedDepartments?.[0]
    || null;
}

function getDiagnoses(result) {
  const diagnoses = result?.diagnoses
    || result?.Diagnoses
    || result?.analysis?.diagnoses
    || result?.analysis?.Diagnoses
    || [];
  return Array.isArray(diagnoses) ? diagnoses : [];
}

function getPrimaryDiagnosis(result) {
  return result?.primaryDiagnosis
    || result?.analysis?.primaryDiagnosis
    || getDiagnoses(result)[0]
    || null;
}

function getHistorySessionType() {
  if (typeof window === "undefined") return "diagnoses";
  const value = new URLSearchParams(window.location.search).get("sessionType");
  return value === "department" ? "department" : "diagnoses";
}

function sessionTypeCopy(sessionType) {
  return sessionType === "department"
    ? {
      title: "Lịch sử gợi ý chuyên khoa",
      description: "Các phiên gợi ý chuyên khoa và khoa khám gần đây.",
      empty: "Chưa có phiên gợi ý chuyên khoa nào",
    }
    : {
      title: "Lịch sử chuẩn đoán lâm sàng",
      description: "Các phiên chuẩn đoán lâm sàng gần đây của tài khoản này.",
      empty: "Chưa có phiên chuẩn đoán lâm sàng nào",
    };
}

function AssessmentShell({
  eyebrow,
  title,
  description,
  activeStep,
  showStepper = true,
  pageClassName = "",
  historyAction = {
    label: "Lịch sử phân tích",
    sessionType: "diagnoses",
    continueLabel: "Tiếp tục phân tích",
  },
  children,
}) {
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const opensHistoryPanel = !historyAction.to;

  return (
    <main className={`assessment-page clinical-page assessment-clinical-refresh ${pageClassName}`.trim()}>
      <section className="assessment-shell clinical-shell" aria-labelledby="assessment-title">
        <header className="assessment-header clinical-hero">
          <div className="assessment-heading-main">
            <span className="assessment-icon clinical-hero-icon" aria-hidden="true">
              <Stethoscope size={25} />
            </span>
            <div>
              <p className="eyebrow clinical-eyebrow">{eyebrow}</p>
              <h1 id="assessment-title">{title}</h1>
              {description && <p className="clinical-hero-description">{description}</p>}
            </div>
          </div>

          <div className="assessment-history-action assessment-heading-aside">
            <Button
              tone="secondary"
              size="sm"
              className="analysis-history-button"
              aria-haspopup={opensHistoryPanel ? "dialog" : undefined}
              aria-controls={opensHistoryPanel ? ANALYSIS_HISTORY_PANEL_ID : undefined}
              aria-expanded={opensHistoryPanel ? historyPanelOpen : undefined}
              onClick={() => {
                if (opensHistoryPanel) {
                  setHistoryPanelOpen(true);
                  return;
                }
                navigate(historyAction.to);
              }}
            >
              <History size={16} />
              {historyAction.label}
            </Button>
            <div className="assessment-scope-note">
              <ShieldCheck size={19} aria-hidden="true" />
              <p><strong>Kết quả để tham khảo</strong><span>Không thay thế chẩn đoán, kê đơn hoặc điều trị của bác sĩ.</span></p>
            </div>
          </div>
        </header>

        {showStepper && <Stepper active={activeStep} />}
        {children}
      </section>

      {opensHistoryPanel && (
        <AnalysisHistoryPanel
          open={historyPanelOpen}
          onClose={() => setHistoryPanelOpen(false)}
          sessionType={historyAction.sessionType || "diagnoses"}
          continueLabel={historyAction.continueLabel}
          onContinue={() => {
            setHistoryPanelOpen(false);
          }}
        />
      )}
    </main>
  );
}

function Stepper({ active }) {
  const steps = ["Mô tả", "Làm rõ", "Kết quả"];

  return (
    <ol className="assessment-stepper clinical-stepper" aria-label="Tiến trình phân tích lâm sàng">
      {steps.map((step, index) => (
        <li
          className={index === active ? "active" : index < active ? "complete" : ""}
          key={step}
          aria-current={index === active ? "step" : undefined}
        >
          <span>{index + 1}</span>
          <strong>{step}</strong>
        </li>
      ))}
    </ol>
  );
}

function EntryPage() {
  return (
    <AssessmentShell
      eyebrow="Hỗ trợ trước khi đi khám"
      title="Làm rõ triệu chứng trước khi đi khám"
      description="Mô tả dấu hiệu bằng lời của bạn để nhận thông tin tham khảo và chuẩn bị bước tiếp theo phù hợp."
      activeStep={0}
      showStepper={false}
      pageClassName="assessment-entry-page"
    >
      <section className="clinical-entry-overview" aria-labelledby="clinical-entry-title">
        <div className="clinical-entry-primary">
          <p className="clinical-entry-kicker">Bắt đầu phiên mới</p>
          <h2 id="clinical-entry-title">Điều gì đang khiến bạn lo lắng?</h2>
          <p className="clinical-entry-lead">
            Hãy mô tả triệu chứng chính, thời điểm bắt đầu và mức độ hiện tại.
            MediMate sẽ đặt thêm những câu hỏi cần thiết trước khi tổng hợp thông tin.
          </p>

          <ul className="clinical-entry-prompts" aria-label="Thông tin nên chuẩn bị">
            <li><CircleCheck size={18} aria-hidden="true" />Dấu hiệu bạn đang gặp</li>
            <li><CircleCheck size={18} aria-hidden="true" />Bắt đầu từ khi nào</li>
            <li><CircleCheck size={18} aria-hidden="true" />Mức độ và thay đổi gần đây</li>
          </ul>

          <div className="clinical-entry-actions">
            <Button size="lg" onClick={() => navigate("/medical-assistant/intake")}>
              Bắt đầu mô tả triệu chứng
            </Button>
            <Button tone="secondary" size="lg" onClick={() => navigate("/map")}>
              <MapPin size={18} aria-hidden="true" />
              Tìm cơ sở y tế
            </Button>
          </div>

          <p className="clinical-entry-privacy">
            <ShieldCheck size={18} aria-hidden="true" />
            Chỉ cung cấp thông tin cần thiết cho phiên phân tích; không nhập thông tin định danh không liên quan.
          </p>
        </div>

        <aside className="clinical-entry-outcome" aria-labelledby="clinical-outcome-title">
          <p className="clinical-entry-kicker">Thông tin bạn nhận được</p>
          <h2 id="clinical-outcome-title">Định hướng rõ ràng hơn cho bước tiếp theo</h2>

          <div className="clinical-outcome-list">
            <article>
              <span aria-hidden="true"><FileText size={21} /></span>
              <div>
                <h3>Nhận định tham khảo</h3>
                <p>Tổng hợp từ mô tả và câu trả lời trong phiên.</p>
              </div>
            </article>
            <article>
              <span aria-hidden="true"><Stethoscope size={21} /></span>
              <div>
                <h3>Chuyên khoa phù hợp</h3>
                <p>Gợi ý nơi nên bắt đầu thăm khám khi có dữ liệu phù hợp.</p>
              </div>
            </article>
            <article>
              <span aria-hidden="true"><MapPin size={21} /></span>
              <div>
                <h3>Cơ sở y tế liên quan</h3>
                <p>Tiếp tục tìm kiếm trên danh sách cơ sở đang có trong hệ thống.</p>
              </div>
            </article>
          </div>
        </aside>
      </section>
    </AssessmentShell>
  );
}

function IntakePage() {
  const [userInput, setUserInput] = useState(() => loadDraft() || "");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const trimmedInput = userInput.trim();
  const isSubmitting = status === "loading";

  function updateUserInput(value) {
    setUserInput(value);
    saveDraft(value);
    if (error) setError("");
  }

  async function submit(event) {
    event.preventDefault();

    if (!trimmedInput) {
      setError("Vui lòng mô tả triệu chứng hoặc tình trạng hiện tại.");
      return;
    }

    setStatus("loading");
    setError("");

    try {
      const response = await symptomAnalysisApi.suggestClinicalQuestions(trimmedInput);
      const data = readSuggestClinicalQuestionsPayload(response);

      if (!data.sessionId) {
        throw new Error("Chưa tạo được phiên đánh giá. Vui lòng thử lại.");
      }

      saveSessionState(data.sessionId, {
        sessionId: data.sessionId,
        userInput: trimmedInput,
        questions: data.questions,
        answers: {},
      });

      saveDraft("");
      navigate(`/assessment/${data.sessionId}`);
    } catch (requestError) {
      setError(
        requestError.status === 502
          ? "AI tạm thời không phản hồi. Vui lòng thử lại sau."
          : requestError.message || "Không thể tạo câu hỏi lâm sàng lúc này.",
      );
    } finally {
      setStatus("idle");
    }
  }

  return (
    <AssessmentShell
      eyebrow="Tư vấn lâm sàng"
      title="Phân tích lâm sàng qua triệu chứng"
      description="Mô tả dấu hiệu bạn đang gặp. MediMate sẽ hỏi thêm một số câu ngắn trước khi tổng hợp kết quả tham khảo."
      activeStep={0}
    >
      <form className="clinical-card clinical-intake-card" onSubmit={submit} noValidate>
        <div className="clinical-card-head">
          <div>
            <p className="clinical-step-label">Bước 1</p>
            <h2>Mô tả điều bạn đang cảm nhận</h2>
          </div>

          <div className="clinical-card-tags" aria-label="Đặc điểm bước nhập triệu chứng">
            <span>Tiếp nhận ban đầu</span>
            <span>Không thay thế chẩn đoán</span>
          </div>
        </div>

        <label className="simple-symptom-input" htmlFor="clinical-user-input">
          <span>Triệu chứng bạn đang gặp <strong aria-hidden="true">*</strong></span>
          <Textarea
            id="clinical-user-input"
            name="symptoms"
            value={userInput}
            onChange={(event) => updateUserInput(event.target.value)}
            disabled={isSubmitting}
            rows={6}
            placeholder="Ví dụ: Tôi đau bụng âm ỉ sau bữa ăn, buồn nôn nhẹ..."
            autoFocus
          />
          <small>Mô tả thời điểm bắt đầu, mức độ và dấu hiệu đi kèm để gợi ý phù hợp hơn.</small>
        </label>

        {error && <Alert tone="danger" live>{error}</Alert>}

        <div className="clinical-submit-row">
          <span><strong>Sẵn sàng.</strong> MediMate sẽ hỏi thêm một số câu ngắn ở bước tiếp theo.</span>
          <Button
            type="submit"
            size="lg"
            loading={isSubmitting}
            loadingLabel="Đang tạo câu hỏi..."
            disabled={!trimmedInput}
            aria-label="Tiếp tục phân tích lâm sàng"
            title="Tiếp tục phân tích lâm sàng"
          >
            <Send size={18} />
          </Button>
        </div>
      </form>
    </AssessmentShell>
  );
}

function QuestionsPage({ sessionId }) {
  const [session, setSession] = useState(() => loadSessionState(sessionId));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const questions = session?.questions ?? [];
  const answers = session?.answers ?? {};
  const answeredCount = questions.filter((item) => (
    isClinicalQuestionAnswered(item, answers[item.questionId])
  )).length;
  const canSubmit = questions.length > 0 && answeredCount === questions.length && status !== "submitting";

  function updateAnswer(questionId, answerKey) {
    setSession((current) => {
      const next = {
        ...current,
        answers: {
          ...(current?.answers ?? {}),
          [questionId]: answerKey,
        },
      };

      saveSessionState(sessionId, next);
      return next;
    });
  }

  function updateBooleanAnswer(questionId, answerKey, value) {
    setSession((current) => {
      const currentAnswer = current?.answers?.[questionId];
      const nextAnswer = {
        ...(isPlainObject(currentAnswer) ? currentAnswer : {}),
        [answerKey]: value,
      };

      const next = {
        ...current,
        answers: {
          ...(current?.answers ?? {}),
          [questionId]: nextAnswer,
        },
      };

      saveSessionState(sessionId, next);
      return next;
    });
  }

  async function submit(event) {
    event.preventDefault();
    if (!canSubmit) return;

    const payload = buildClinicalQuestionAnswerItems(questions, answers);

    setStatus("submitting");
    setError("");

    try {
      const diagnosisResponse = await symptomAnalysisApi.submitDiagnosis(sessionId, payload);

      const diagnosisData = readAnalysisPayload(diagnosisResponse) ?? {};

      const diagnosisItems = Array.isArray(diagnosisData?.diagnoses)
        ? diagnosisData.diagnoses
        : Array.isArray(diagnosisData?.Diagnoses) ? diagnosisData.Diagnoses : [];

      const result = {
        ...diagnosisData,
        answers: diagnosisData.answers ?? payload,
        diagnoses: diagnosisItems.length > 0 ? diagnosisItems : getDiagnoses(diagnosisData),
        primaryDiagnosis: diagnosisItems[0] ?? getPrimaryDiagnosis(diagnosisData),
        diagnosisModel: diagnosisData?.model ?? diagnosisData?.Model ?? null,
        diagnosisStatus: diagnosisData?.status ?? diagnosisData?.Status ?? null,
      };

      const next = { ...session, answers, result };

      saveSessionState(sessionId, next);
      navigate(`/assessment/${sessionId}/result`);
    } catch (requestError) {
      setError(
        requestError.status === 502
          ? "AI tạm thời không phản hồi. Dữ liệu bạn đã nhập vẫn được giữ lại để thử lại."
          : requestError.message || "Không thể gửi câu trả lời lúc này.",
      );
      setStatus("idle");
    }
  }

  if (!session) {
    return (
      <AssessmentShell
        eyebrow="Phiên đánh giá"
        title="Không tìm thấy câu hỏi"
        description="Hãy bắt đầu lại từ bước mô tả triệu chứng để tạo phiên đánh giá và danh sách câu hỏi."
        activeStep={1}
      >
        <ErrorState
          title="Phiên đánh giá chưa sẵn sàng"
          description="Hãy bắt đầu lại từ form nhập triệu chứng để tạo phiên đánh giá và danh sách câu hỏi."
          action={<Button onClick={() => navigate("/medical-assistant/intake")}>Nhập triệu chứng</Button>}
        />
      </AssessmentShell>
    );
  }

  if (questions.length === 0) {
    return (
      <AssessmentShell
        eyebrow="Bước 2"
        title="Chưa có câu hỏi phù hợp"
        description="Chưa tạo được câu hỏi lâm sàng cho mô tả hiện tại."
        activeStep={1}
      >
        <EmptyState
          title="Chưa tạo được câu hỏi lâm sàng"
          description="Hãy mô tả triệu chứng rõ hơn để hệ thống có đủ dữ liệu tạo câu hỏi."
          action={<Button onClick={() => navigate("/medical-assistant/intake")}>Quay lại nhập lại</Button>}
        />
      </AssessmentShell>
    );
  }

  const question = questions[currentIndex];
  const answerMode = getClinicalQuestionAnswerMode(question);
  const selectedAnswer = answers[question.questionId];
  const answerOptions = getClinicalQuestionAnswerOptions(question);
  const booleanPrompts = getClinicalQuestionBooleanPrompts(question);
  const questionComplete = isClinicalQuestionAnswered(question, selectedAnswer);
  const progressPercent = Math.round((answeredCount / questions.length) * 100);
  return (
    <AssessmentShell
      eyebrow="Làm rõ triệu chứng"
      title="Câu hỏi lâm sàng"
      description="Trả lời từng câu hỏi để MediMate hoàn tất phân tích và tạo chẩn đoán lâm sàng tham khảo."
      activeStep={1}
    >
      <form className="clinical-card question-panel" onSubmit={submit}>
        <div
          className="question-progress"
          role="progressbar"
          aria-label={`Đã trả lời ${answeredCount} trên ${questions.length} câu hỏi`}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={progressPercent}
        >
          <span>Câu {currentIndex + 1}/{questions.length}</span>
          <strong>{progressPercent}%</strong>
        </div>

        <fieldset className="question-card">
          <legend>{question.questionText}</legend>

          {answerMode === "choice" ? (
            <div className="question-choice-grid">
              {answerOptions.map(([answerKey, label]) => (
                <label key={answerKey}>
                  <input
                    type="radio"
                    name={`answer-${question.questionId}`}
                    checked={selectedAnswer === answerKey}
                    onChange={() => updateAnswer(question.questionId, answerKey)}
                  />
                  {label}
                </label>
              ))}
            </div>
          ) : (
            <div className="boolean-prompt-list">
              {booleanPrompts.map((prompt) => {
                const selectedValue = isPlainObject(selectedAnswer)
                  ? selectedAnswer[prompt.key]
                  : undefined;

                return (
                  <section
                    className="boolean-prompt"
                    key={prompt.key}
                    aria-labelledby={`clinical-prompt-${currentIndex}-${prompt.key}`}
                  >
                    <div className="boolean-prompt-copy">
                      <strong id={`clinical-prompt-${currentIndex}-${prompt.key}`}>
                        {prompt.label}
                      </strong>
                    </div>

                    <div className="boolean-answer-group" role="radiogroup" aria-label={prompt.label}>
                      <label>
                        <input
                          type="radio"
                          name={`answer-${question.questionId}-${prompt.key}`}
                          checked={selectedValue === true}
                          onChange={() => updateBooleanAnswer(question.questionId, prompt.key, true)}
                        />
                        <span>Có</span>
                      </label>

                      <label>
                        <input
                          type="radio"
                          name={`answer-${question.questionId}-${prompt.key}`}
                          checked={selectedValue === false}
                          onChange={() => updateBooleanAnswer(question.questionId, prompt.key, false)}
                        />
                        <span>Không</span>
                      </label>
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </fieldset>
        {error && <Alert tone="danger" live>{error}</Alert>}

        <div className="assessment-actions">
          <Button
            type="button"
            tone="ghost"
            onClick={() => navigate("/medical-assistant/intake")}
          >
            Quay lại biểu mẫu
          </Button>

          <Button
            type="button"
            tone="secondary"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((index) => index - 1)}
          >
            Câu trước
          </Button>

          {currentIndex < questions.length - 1 ? (
            <Button
              disabled={!questionComplete}
              onClick={() => setCurrentIndex((index) => index + 1)}
            >
              Câu tiếp theo
            </Button>
          ) : (
            <Button
              type="submit"
              loading={status === "submitting"}
              loadingLabel="Đang phân tích..."
              disabled={!canSubmit}
            >
              Xem gợi ý
            </Button>
          )}
        </div>
      </form>
    </AssessmentShell>
  );
}

function ResultPage({ sessionId }) {
  const [state, setState] = useState(() => loadSessionState(sessionId));
  const [remoteStatus, setRemoteStatus] = useState(() => (
    loadSessionState(sessionId)?.result ? "idle" : "loading"
  ));
  const [remoteError, setRemoteError] = useState("");

  useEffect(() => {
    if (state?.result) return;

    let active = true;

    symptomAnalysisApi.get(sessionId)
      .then((response) => {
        if (!active) return;

        const data = unwrapApiData(response);
        const analysis = readAnalysisPayload(response);
        const next = {
          ...(state ?? { sessionId }),
          result: analysis ?? data,
          userInput: data?.inputText,
        };

        setState(next);
        saveSessionState(sessionId, next);
      })
      .catch((error) => {
        if (active) {
          setRemoteError(error.message || "Không thể tải kết quả phiên đánh giá.");
        }
      })
      .finally(() => {
        if (active) setRemoteStatus("idle");
      });

    return () => {
      active = false;
    };
  }, [sessionId, state]);

  const result = state?.result;
  const department = getRecommendedDepartment(result);
  const diagnoses = getDiagnoses(result);
  const primaryDiagnosis = getPrimaryDiagnosis(result);
  const isEmergency = department?.isEmergencySuggested;
  const diagnosisRows = diagnoses.map((diagnosis, index) => ({
    rank: diagnosisRank(diagnosis, index),
    diseaseName: diagnosisName(diagnosis),
    icd10Code: diagnosisIcd(diagnosis),
    searchKeyword: diagnosisKeyword(diagnosis),
    clinicalReasoning: diagnosisReasoning(diagnosis),
    paGivenB: diagnosisPAGivenB(diagnosis),
    probability: confidencePercent(diagnosisPAGivenB(diagnosis)),
  }));

  if (remoteStatus === "loading") {
    return (
      <AssessmentShell
        eyebrow="Kết quả"
        title="Đang tải kết quả"
        description="MediMate đang lấy lại kết quả phiên đánh giá."
        activeStep={2}
      >
        <LoadingState label="Đang tải phiên đánh giá..." />
      </AssessmentShell>
    );
  }

  if (!result) {
    return (
      <AssessmentShell
        eyebrow="Kết quả"
        title="Không tìm thấy kết quả"
        description="Không thể tải dữ liệu cho phiên đánh giá này."
        activeStep={2}
      >
        <ErrorState
          title="Phiên đánh giá không tồn tại"
          description={remoteError || "Hãy bắt đầu phiên đánh giá mới hoặc mở lại từ lịch sử nếu phiên đã được lưu."}
          action={<Button onClick={() => navigate("/medical-assistant/intake")}>Bắt đầu đánh giá mới</Button>}
        />
      </AssessmentShell>
    );
  }

  return (
    <AssessmentShell
      eyebrow="Bước 3"
      title="Chẩn đoán lâm sàng"
      description="Tổng hợp kết quả từ mô hình Bayesian, thứ tự khả năng bệnh và xác suất P(A|B) tham khảo."
      activeStep={2}
    >
      <Alert
        tone={isEmergency ? "danger" : "info"}
        title={isEmergency ? "Cần ưu tiên thăm khám khẩn cấp" : "Đã tạo chẩn đoán lâm sàng tham khảo"}
      >
        {isEmergency
          ? "Kết quả cho thấy bạn có thể cần được đánh giá y tế sớm. Hãy liên hệ cơ sở y tế phù hợp."
          : "Kết quả dưới đây chỉ mang tính tham khảo, không thay thế chẩn đoán của bác sĩ."}
      </Alert>

      <section className="result-grid">
        {primaryDiagnosis && (
          <article className="result-card priority diagnosis-primary-card">
            <span>Chẩn đoán tham khảo ưu tiên</span>
            <h2>{diagnosisName(primaryDiagnosis)}</h2>
            {diagnosisReasoning(primaryDiagnosis) && <p>{diagnosisReasoning(primaryDiagnosis)}</p>}
            <div className="diagnosis-meta-row">
              {diagnosisIcd(primaryDiagnosis) && <small>ICD-10: {diagnosisIcd(primaryDiagnosis)}</small>}
              <strong>{confidencePercent(diagnosisPAGivenB(primaryDiagnosis))}% P(A|B)</strong>
              {diagnosisKeyword(primaryDiagnosis) && <small>{diagnosisKeyword(primaryDiagnosis)}</small>}
            </div>
          </article>
        )}

        {diagnosisRows.length > 0 && (
          <article className="result-card diagnosis-analytics-card">
            <div>
              <span>Thứ tự khả năng bệnh</span>
            </div>

            <div className="diagnosis-analytics-grid">
              <div className="diagnosis-bar-chart" aria-label="Biểu đồ cột xác suất chẩn đoán">
                {diagnosisRows.map((diagnosis) => (
                  <div className="diagnosis-bar-item" key={`${diagnosis.rank}-${diagnosis.diseaseName}`}>
                    <em>{diagnosis.probability}%</em>
                    <div className="diagnosis-bar-track">
                      <span style={{ height: `${Math.max(6, diagnosis.probability)}%` }} />
                    </div>
                    <strong>{diagnosis.rank}</strong>
                    <small>{diagnosis.diseaseName}</small>
                  </div>
                ))}
              </div>
            </div>
          </article>
        )}

      </section>
    </AssessmentShell>
  );
}

function HistoryPage() {
  const sessionType = getHistorySessionType();
  const copy = sessionTypeCopy(sessionType);
  const [sessions, setSessions] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    symptomAnalysisApi.listMySessions(1, 10, sessionType)
      .then((response) => {
        if (active) setSessions(getPagedItems(response));
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Không thể tải lịch sử đánh giá.");
      })
      .finally(() => {
        if (active) setStatus("idle");
      });

    return () => {
      active = false;
    };
  }, [sessionType]);

  return (
    <AssessmentShell
      eyebrow="Lịch sử"
      title={copy.title}
      description={copy.description}
      activeStep={2}
      historyAction={
        sessionType === "department"
          ? { label: "Tiếp tục tư vấn", to: "/dashboard" }
          : { label: "Tiếp tục chuẩn đoán", to: "/medical-assistant/intake" }
      }
    >
      {status === "loading" && (
        <LoadingState label="Đang tải lịch sử đánh giá..." />
      )}

      {error && (
        <ErrorState
          title="Không thể tải lịch sử"
          description={error}
          action={<Button onClick={() => window.location.reload()}>Thử lại</Button>}
        />
      )}

      {status !== "loading" && !error && sessions.length === 0 && (
        <EmptyState
          title={copy.empty}
          description="Bắt đầu phiên mới để MediMate tạo câu hỏi lâm sàng và lưu lịch sử."
          action={<Button onClick={() => navigate("/medical-assistant/intake")}>Đánh giá mới</Button>}
        />
      )}

      {sessions.length > 0 && (
        <div className="history-list">
          {sessions.map((session) => (
            <article key={session.sessionId}>
              <div>
                <strong>{session.inputText || "Phiên đánh giá"}</strong>
                <span>
                  {session.createdAt
                    ? new Date(session.createdAt).toLocaleString("vi-VN")
                    : "Chưa có ngày tạo"}
                </span>
              </div>

              <small>
                {session.sessionType || sessionType} · {session.status || "Đang cập nhật"}
              </small>

              <Button
                tone="secondary"
                onClick={() => navigate(`/assessment/${session.sessionId}/result`)}
              >
                Xem chi tiết
              </Button>
            </article>
          ))}
        </div>
      )}
    </AssessmentShell>
  );
}

export default function MedicalAssistantPage({ mode = "entry", sessionId = "" }) {
  const activeMode = useMemo(() => mode, [mode]);

  if (activeMode === "intake") return <IntakePage />;
  if (activeMode === "questions") return <QuestionsPage sessionId={sessionId} />;
  if (activeMode === "result") return <ResultPage sessionId={sessionId} />;
  if (activeMode === "history") return <HistoryPage />;

  return <EntryPage />;
}
