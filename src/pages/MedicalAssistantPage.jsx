import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ClipboardList, History, MapPin, Send, Stethoscope } from "lucide-react";
import { Alert, Button, EmptyState, ErrorState, LoadingState, Textarea } from "../components/ui";
import { navigate } from "../router/navigation";
import AnalysisHistoryPanel from "../components/analysis/AnalysisHistoryPanel";
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

const SESSION_KEY_PREFIX = "medimate.assessment.session.";
const assessmentSessionCache = new Map();
let assessmentDraftCache = "";

const RED_FLAGS = [
  "Đau ngực dữ dội",
  "Khó thở nặng",
  "Ngất, co giật hoặc mất ý thức",
  "Yếu hoặc liệt một bên cơ thể",
  "Méo miệng, nói khó",
  "Chảy máu nhiều",
  "Đau đầu dữ dội đột ngột",
  "Sưng mặt/môi kèm khó thở hoặc nghi phản vệ",
];

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
  historyAction = {
    label: "Lịch sử phân tích",
    sessionType: "diagnoses",
    continueLabel: "Tiáº¿p tá»¥c chuáº©n Ä‘oÃ¡n",
    continueTo: "/medical-assistant/intake",
  },
  children,
}) {
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const opensHistoryPanel = !historyAction.to;

  return (
    <main className="assessment-page clinical-page">
      <section className="assessment-shell clinical-shell" aria-labelledby="assessment-title">
        <div className="assessment-history-action">
          <Button
            tone="secondary"
            size="sm"
            className="analysis-history-button"
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
        </div>
        <header className="assessment-header clinical-hero">
          <span className="assessment-icon clinical-hero-icon" aria-hidden="true">
            <Stethoscope size={25} />
          </span>
          <p className="eyebrow clinical-eyebrow">{eyebrow}</p>
          <h1 id="assessment-title">{title}</h1>
          {description && <p className="clinical-hero-description">{description}</p>}
        </header>

        <Stepper active={activeStep} />
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
            navigate(historyAction.continueTo || "/medical-assistant/intake");
          }}
        />
      )}
    </main>
  );
}

function MobileHeroAction({ children }) {
  return <div className="clinical-mobile-hero-action">{children}</div>;
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
      eyebrow="Tư vấn lâm sàng"
      title="Phân tích lâm sàng qua triệu chứng"
      description="Ghi lại triệu chứng như khi trao đổi ở quầy tiếp nhận. MediMate sẽ hỏi thêm yes/no trước khi đưa ra nhận định tham khảo."
      activeStep={0}
    >
      <MobileHeroAction>
        <Button size="lg" onClick={() => navigate("/medical-assistant/intake")}>
          Bắt đầu phân tích
        </Button>
      </MobileHeroAction>

      <div className="clinical-entry-card">
        <article>
          <ClipboardList size={24} aria-hidden="true" />
          <h2>Một ô nhập duy nhất</h2>
          <p>Người dùng chỉ cần nhập mô tả triệu chứng, hệ thống sẽ tự chọn các câu hỏi làm rõ phù hợp.</p>
        </article>

        <article>
          <Stethoscope size={24} aria-hidden="true" />
          <h2>Làm rõ bằng câu hỏi</h2>
          <p>Hệ thống chọn câu hỏi lâm sàng phù hợp dựa trên nội dung người dùng cung cấp.</p>
        </article>

        <article>
          <MapPin size={24} aria-hidden="true" />
          <h2>Gợi ý bước tiếp theo</h2>
          <p>Kết quả gồm nhận định tham khảo, chuyên khoa và cơ sở y tế liên quan.</p>
        </article>
      </div>

      <div className="assessment-actions clinical-actions-center clinical-entry-actions">
        <Button size="lg" onClick={() => navigate("/medical-assistant/intake")}>
          Bắt đầu phân tích
        </Button>
        <Button tone="secondary" onClick={() => navigate("/map")}>
          Tìm cơ sở y tế
        </Button>
      </div>
    </AssessmentShell>
  );
}

function SafetyPage() {
  const [checked, setChecked] = useState([]);
  const hasRedFlag = checked.length > 0;

  function toggle(flag) {
    setChecked((current) => (
      current.includes(flag)
        ? current.filter((item) => item !== flag)
        : [...current, flag]
    ));
  }

  return (
    <AssessmentShell
      eyebrow="Kiểm tra an toàn"
      title="Trước khi bắt đầu"
      description="Nếu có dấu hiệu nguy hiểm, không nên tiếp tục tự đánh giá bằng AI. Hãy ưu tiên chăm sóc y tế khẩn cấp."
      activeStep={0}
    >
      <MobileHeroAction>
        <Button tone="secondary" onClick={() => document.getElementById("safety-checklist")?.scrollIntoView({ block: "start", behavior: "smooth" })}>
          Xem checklist an toàn
        </Button>
      </MobileHeroAction>

      <section className="clinical-card">
        <div className="clinical-card-head">
          <div>
            <p className="clinical-step-label">Sàng lọc an toàn</p>
            <h2>Bạn có đang gặp một trong các dấu hiệu sau không?</h2>
          </div>
          <span>Không thay thế cấp cứu</span>
        </div>

        <fieldset className="safety-checklist" id="safety-checklist">
          <legend className="sr-only">Dấu hiệu khẩn cấp</legend>
          {RED_FLAGS.map((flag) => (
            <label key={flag}>
              <input
                type="checkbox"
                checked={checked.includes(flag)}
                onChange={() => toggle(flag)}
              />
              <span>{flag}</span>
            </label>
          ))}
        </fieldset>

        {hasRedFlag && (
          <section className="emergency-panel" role="alert">
            <AlertTriangle size={28} aria-hidden="true" />
            <div>
              <h2>Đây có thể là tình huống cần chăm sóc khẩn cấp</h2>
              <p>
                Vui lòng gọi cấp cứu địa phương hoặc đến cơ sở y tế gần nhất.
                Không tiếp tục tự đánh giá bằng AI trong tình huống này.
              </p>
              <div className="assessment-actions">
                <Button onClick={() => navigate("/map?search=cap%20cuu")}>
                  Tìm cơ sở y tế gần nhất
                </Button>
                <Button tone="secondary" onClick={() => navigate("/")}>
                  Về trang chủ
                </Button>
              </div>
            </div>
          </section>
        )}

        {!hasRedFlag && (
          <div className="assessment-actions clinical-card-actions">
            <Button size="lg" onClick={() => navigate("/medical-assistant/intake")}>
              Không, tiếp tục đánh giá
            </Button>
            <Button tone="secondary" onClick={() => navigate("/medical-assistant")}>
              Quay lại
            </Button>
          </div>
        )}
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
      description="Ghi lại triệu chứng như khi trao đổi ở quầy tiếp nhận. MediMate sẽ hỏi thêm yes/no trước khi đưa ra nhận định tham khảo."
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
          <span>Sẵn sàng. Trả lời Yes/No ở bước tiếp theo.</span>
          <Button
            type="submit"
            size="lg"
            loading={isSubmitting}
            loadingLabel="Đang tạo câu hỏi..."
            disabled={!trimmedInput}
            aria-label="Tiếp tục phân tích lâm sàng"
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
        <div className="question-progress">
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
          action={<Button onClick={() => navigate("/assessment/history")}>Xem lịch sử</Button>}
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

  if (activeMode === "safety") return <SafetyPage />;
  if (activeMode === "intake") return <IntakePage />;
  if (activeMode === "questions") return <QuestionsPage sessionId={sessionId} />;
  if (activeMode === "result") return <ResultPage sessionId={sessionId} />;
  if (activeMode === "history") return <HistoryPage />;

  return <EntryPage />;
}
