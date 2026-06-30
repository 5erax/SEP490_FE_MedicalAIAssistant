import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ClipboardList, History, MapPin, Stethoscope } from "lucide-react";
import { Alert, Button, EmptyState, ErrorState, Field, LoadingState, Textarea, TextInput } from "../components/ui";
import { navigate } from "../router/navigation";
import { getStoredAuth } from "../services/api";
import { patientProfilesApi } from "../services/patientProfileService";
import {
  buildClinicalQuestionAnswerItems,
  getClinicalQuestionAnswerMode,
  getClinicalQuestionBooleanPrompts,
  getClinicalQuestionAnswerOptions,
  isClinicalQuestionAnswered,
  symptomAnalysisApi,
  translateClinicalText,
} from "../services/symptomAnalysisService";
import "../styles/medical-assessment.css";

const SESSION_KEY_PREFIX = "medimate.assessment.session.";
const assessmentSessionCache = new Map();
let assessmentDraftCache = null;

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

const SEVERITY_OPTIONS = [
  ["mild", "Nhẹ"],
  ["moderate", "Vừa"],
  ["severe", "Nặng"],
];

const INTAKE_REQUIRED_FIELDS = {
  mainSymptom: "Vui lòng nhập triệu chứng chính.",
  description: "Vui lòng mô tả thêm bối cảnh và diễn tiến triệu chứng.",
};

function unwrapData(response) {
  return response?.data?.data ?? response?.data ?? response;
}

function getPagedItems(response) {
  const data = unwrapData(response);
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data)) return data;
  return [];
}

function getQuestionId(question, index) {
  return question?.questionId ?? question?.id ?? `question-${index + 1}`;
}

function normalizeQuestions(questions = []) {
  return questions.map((question, index) => {
    const sourceText = question?.questionVi || question?.questionText || question?.text || `Câu hỏi lâm sàng ${index + 1}`;
    const translatedText = translateClinicalText(sourceText);
    return {
      ...question,
      questionId: getQuestionId(question, index),
      questionText: translatedText,
      questionOriginalText: translatedText === sourceText ? "" : sourceText,
    };
  });
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readSuggestResponse(response) {
  const data = unwrapData(response) ?? {};
  return {
    sessionId: data.sessionId || "",
    questions: normalizeQuestions(Array.isArray(data.questions) ? data.questions : []),
  };
}

function confidencePercent(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric <= 1 ? numeric * 100 : numeric)));
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

function saveDraft(draft) {
  assessmentDraftCache = draft;
}

function buildUserInput(form) {
  return [
    `Trieu chung chinh: ${form.mainSymptom}`,
    form.description ? `Mo ta them: ${form.description}` : "",
    form.duration ? `Thoi gian bat dau: ${form.duration}` : "",
    form.severity ? `Muc do: ${form.severity}` : "",
    form.bodyLocation ? `Vi tri: ${form.bodyLocation}` : "",
    form.associatedSymptoms ? `Trieu chung di kem: ${form.associatedSymptoms}` : "",
    form.profileContext ? `Thong tin ho so suc khoe: ${form.profileContext}` : "",
    form.chronicDiseaseNote ? `Benh nen: ${form.chronicDiseaseNote}` : "",
    form.allergyNote ? `Di ung: ${form.allergyNote}` : "",
    form.medications ? `Thuoc dang dung: ${form.medications}` : "",
  ].filter(Boolean).join("\n");
}

function getRecommendedDepartment(result) {
  return result?.recommendedDepartment || result?.analysis?.recommendedDepartment || result?.recommendedDepartments?.[0] || null;
}

function getDiagnoses(result) {
  return result?.diagnoses || result?.analysis?.diagnoses || [];
}

function getPrimaryDiagnosis(result) {
  return result?.primaryDiagnosis || result?.analysis?.primaryDiagnosis || getDiagnoses(result)[0] || null;
}

function getFacilities(result) {
  return result?.recommendedFacilities || result?.analysis?.recommendedFacilities || [];
}

function facilityKey(facility) {
  return facility?.id || facility?.facilityId || facility?.facilityName;
}

function facilityId(facility) {
  return facility?.facilityId || facility?.id || "";
}

function AssessmentShell({ eyebrow, title, description, children }) {
  return (
    <main className="assessment-page">
      <section className="assessment-shell" aria-labelledby="assessment-title">
        <header className="assessment-header">
          <span className="assessment-icon" aria-hidden="true"><Stethoscope size={24} /></span>
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1 id="assessment-title">{title}</h1>
            {description && <p>{description}</p>}
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}

function Stepper({ active }) {
  const steps = ["An toàn", "Dữ liệu", "Câu hỏi", "Kết quả"];
  return (
    <ol className="assessment-stepper" aria-label="Tiến trình đánh giá">
      {steps.map((step, index) => (
        <li className={index === active ? "active" : index < active ? "complete" : ""} key={step} aria-current={index === active ? "step" : undefined}>
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
      eyebrow="MediMate AI"
      title="Phân tích lâm sàng và gợi ý chuyên khoa"
      description="MediMate giúp bạn mô tả vấn đề sức khỏe có cấu trúc, trả lời câu hỏi lâm sàng và tìm chuyên khoa phù hợp để chuẩn bị bước chăm sóc tiếp theo."
    >
      <div className="assessment-grid">
        <article>
          <ClipboardList size={24} aria-hidden="true" />
          <h2>Luôn bắt đầu bằng an toàn</h2>
          <p>Nếu có dấu hiệu nguy hiểm, ứng dụng sẽ dừng flow AI và hướng dẫn bạn tìm chăm sóc khẩn cấp.</p>
        </article>
        <article>
          <Stethoscope size={24} aria-hidden="true" />
          <h2>Hỏi đáp lâm sàng từng bước</h2>
          <p>Backend chọn câu hỏi Có/Không theo triệu chứng bạn nhập, sau đó mới tạo kết quả tham khảo.</p>
        </article>
        <article>
          <MapPin size={24} aria-hidden="true" />
          <h2>Điều hướng cơ sở y tế</h2>
          <p>Khi có chuyên khoa gợi ý, MediMate tìm cơ sở y tế active từ backend theo chuyên khoa đó.</p>
        </article>
      </div>
      <div className="assessment-actions">
        <Button size="lg" onClick={() => navigate("/medical-assistant/safety")}>Bắt đầu phân tích lâm sàng</Button>
        <Button tone="secondary" onClick={() => navigate("/map")}>Tìm cơ sở y tế</Button>
      </div>
    </AssessmentShell>
  );
}

function SafetyPage() {
  const [checked, setChecked] = useState([]);
  const hasRedFlag = checked.length > 0;

  function toggle(flag) {
    setChecked((current) => current.includes(flag)
      ? current.filter((item) => item !== flag)
      : [...current, flag]);
  }

  return (
    <AssessmentShell
      eyebrow="Bước 1"
      title="Trước khi bắt đầu"
      description="Hãy kiểm tra nhanh các dấu hiệu cần chăm sóc y tế khẩn cấp. Nếu có, không nên tiếp tục tự đánh giá bằng AI."
    >
      <Stepper active={0} />
      <fieldset className="safety-checklist">
        <legend>Bạn có đang gặp một trong các dấu hiệu sau không?</legend>
        {RED_FLAGS.map((flag) => (
          <label key={flag}>
            <input type="checkbox" checked={checked.includes(flag)} onChange={() => toggle(flag)} />
            <span>{flag}</span>
          </label>
        ))}
      </fieldset>

      {hasRedFlag && (
        <section className="emergency-panel" role="alert">
          <AlertTriangle size={28} aria-hidden="true" />
          <div>
            <h2>Đây có thể là tình huống cần chăm sóc khẩn cấp</h2>
            <p>Vui lòng gọi cấp cứu địa phương, hoặc đến cơ sở y tế gần nhất. Không tiếp tục tự đánh giá bằng AI trong tình huống này.</p>
            <div className="assessment-actions">
              <Button onClick={() => navigate("/map?search=cap%20cuu")}>Tìm cơ sở y tế gần nhất</Button>
              <Button tone="secondary" onClick={() => navigate("/")}>Về trang chủ</Button>
            </div>
          </div>
        </section>
      )}

      {!hasRedFlag && (
        <div className="assessment-actions">
          <Button size="lg" onClick={() => navigate("/medical-assistant/intake")}>
            Không, tiếp tục đánh giá
          </Button>
          <Button tone="secondary" onClick={() => navigate("/medical-assistant")}>Quay lại</Button>
        </div>
      )}
    </AssessmentShell>
  );
}

function IntakePage() {
  const auth = getStoredAuth();
  const errorSummaryRef = useRef(null);
  const [form, setForm] = useState(() => loadDraft() ?? {
    mainSymptom: "",
    description: "",
    duration: "",
    severity: "moderate",
    bodyLocation: "",
    associatedSymptoms: "",
    profileContext: "",
    allergyNote: "",
    chronicDiseaseNote: "",
    medications: "",
  });
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [profileStatus, setProfileStatus] = useState(() => (auth?.userId || auth?.identityId ? "loading" : "idle"));

  const requiredErrorEntries = Object.entries(fieldErrors);
  const showIntakeSidePanel = !auth || ["loading", "ready", "empty"].includes(profileStatus);

  useEffect(() => {
    const userId = auth?.userId || auth?.identityId;
    if (!userId) return;

    let active = true;

    patientProfilesApi.findByUserId(userId)
      .then((profile) => {
        if (!active) return;
        if (!profile) {
          setProfileStatus("empty");
          return;
        }

        const profileContext = [
          profile.bloodType ? `Nhóm máu ${profile.bloodType}` : "",
          profile.height ? `Chiều cao ${profile.height} cm` : "",
          profile.weight ? `Cân nặng ${profile.weight} kg` : "",
        ].filter(Boolean).join(", ");

        setForm((current) => {
          const next = {
            ...current,
            profileContext: current.profileContext || profileContext,
            allergyNote: current.allergyNote || profile.allergyNote || "",
            chronicDiseaseNote: current.chronicDiseaseNote || profile.chronicDiseaseNote || "",
          };
          saveDraft(next);
          return next;
        });
        setProfileStatus("ready");
      })
      .catch(() => {
        if (active) setProfileStatus("error");
      });

    return () => {
      active = false;
    };
  }, [auth?.identityId, auth?.userId]);

  function updateField(key, value) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      saveDraft(next);
      return next;
    });
    if (fieldErrors[key]) {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  }

  async function submit(event) {
    event.preventDefault();
    const nextFieldErrors = Object.fromEntries(
      Object.entries(INTAKE_REQUIRED_FIELDS)
        .filter(([field]) => !String(form[field] ?? "").trim()),
    );

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError("");
      window.setTimeout(() => errorSummaryRef.current?.focus(), 0);
      return;
    }

    setStatus("loading");
    setError("");
    setFieldErrors({});
    const userInput = buildUserInput(form);

    try {
      const response = await symptomAnalysisApi.suggestClinicalQuestions(userInput);
      const data = readSuggestResponse(response);
      if (!data.sessionId) throw new Error("Backend chưa trả về sessionId cho phiên đánh giá.");

      saveSessionState(data.sessionId, {
        sessionId: data.sessionId,
        userInput,
        form,
        questions: data.questions,
        answers: {},
      });
      navigate(`/assessment/${data.sessionId}`);
    } catch (requestError) {
      setError(requestError.status === 502
        ? "AI tạm thời không phản hồi. Vui lòng thử lại sau."
        : requestError.message || "Không thể tạo câu hỏi lâm sàng lúc này.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <AssessmentShell
      eyebrow="Bước 2"
      title="Phân tích lâm sàng"
      description="Nhập thông tin chính về tình trạng hiện tại để MediMate tạo bộ câu hỏi lâm sàng và chuẩn bị gợi ý chuyên khoa."
    >
      <Stepper active={1} />
      <section className="clinical-overview" aria-label="Tóm tắt phân tích lâm sàng">
        <article>
          <span>01</span>
          <strong>Dữ liệu đầu vào</strong>
          <p>Tập trung vào triệu chứng chính, diễn tiến và bối cảnh sức khỏe liên quan.</p>
        </article>
        <article>
          <span>02</span>
          <strong>Câu hỏi lâm sàng</strong>
          <p>Backend đề xuất câu hỏi tiếp theo dựa trên nội dung bạn cung cấp.</p>
        </article>
        <article>
          <span>03</span>
          <strong>Gợi ý chuyên khoa</strong>
          <p>Kết quả ưu tiên chuyên khoa và cơ sở y tế phù hợp để bạn tiếp tục xử lý.</p>
        </article>
      </section>
      <div className={`intake-layout ${showIntakeSidePanel ? "" : "intake-layout-single"}`.trim()}>
        <form className="assessment-form intake-form" onSubmit={submit} noValidate>
          {requiredErrorEntries.length > 0 && (
            <div className="assessment-error-summary" ref={errorSummaryRef} role="alert" tabIndex="-1">
              <strong>Cần bổ sung {requiredErrorEntries.length} thông tin</strong>
              <ul>
                {requiredErrorEntries.map(([field, message]) => (
                  <li key={field}>
                    <a href={`#intake-${field}`}>{message}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <fieldset className="intake-section">
            <legend>Thông tin lâm sàng chính</legend>
            <p>Hai thông tin này là nền cho bộ câu hỏi lâm sàng và gợi ý chuyên khoa.</p>
            <Field id="intake-mainSymptom" label="Triệu chứng chính" required error={fieldErrors.mainSymptom}>
              <TextInput
                value={form.mainSymptom}
                onChange={(event) => updateField("mainSymptom", event.target.value)}
                disabled={status === "loading"}
                autoComplete="off"
              />
            </Field>
            <Field id="intake-description" label="Mô tả thêm" hint="Ví dụ: diễn tiến, lúc nào nặng hơn, điều gì làm giảm triệu chứng." required error={fieldErrors.description}>
              <Textarea
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
                disabled={status === "loading"}
                rows={5}
              />
            </Field>
          </fieldset>

          <fieldset className="intake-section">
            <legend>Ngữ cảnh triệu chứng</legend>
            <div className="assessment-form-grid">
              <Field label="Thời gian bắt đầu" optional>
                <TextInput value={form.duration} onChange={(event) => updateField("duration", event.target.value)} disabled={status === "loading"} placeholder="Ví dụ: 2 ngày" />
              </Field>
              <Field label="Mức độ">
                <select value={form.severity} onChange={(event) => updateField("severity", event.target.value)} disabled={status === "loading"}>
                  {SEVERITY_OPTIONS.map(([value, label]) => <option key={value} value={label}>{label}</option>)}
                </select>
              </Field>
              <Field label="Vị trí đau/khó chịu" optional>
                <TextInput value={form.bodyLocation} onChange={(event) => updateField("bodyLocation", event.target.value)} disabled={status === "loading"} />
              </Field>
              <Field label="Triệu chứng đi kèm" optional>
                <TextInput value={form.associatedSymptoms} onChange={(event) => updateField("associatedSymptoms", event.target.value)} disabled={status === "loading"} />
              </Field>
            </div>
          </fieldset>

          <fieldset className="intake-section">
            <legend>Thông tin sức khỏe liên quan</legend>
            <p>Phần này có thể được điền sẵn từ hồ sơ, nhưng bạn vẫn chỉnh sửa được trước khi gửi.</p>
            <div className="assessment-form-grid">
              <Field label="Thông tin hồ sơ sức khỏe" hint="Tự động lấy nhóm máu, chiều cao, cân nặng nếu backend có dữ liệu." optional>
                <Textarea value={form.profileContext} onChange={(event) => updateField("profileContext", event.target.value)} disabled={status === "loading"} rows={3} />
              </Field>
              <Field label="Bệnh nền" optional>
                <Textarea value={form.chronicDiseaseNote} onChange={(event) => updateField("chronicDiseaseNote", event.target.value)} disabled={status === "loading"} rows={3} />
              </Field>
            </div>
            <div className="assessment-form-grid">
              <Field label="Dị ứng" optional>
                <Textarea value={form.allergyNote} onChange={(event) => updateField("allergyNote", event.target.value)} disabled={status === "loading"} rows={3} />
              </Field>
              <Field label="Thuốc đang dùng" optional>
                <TextInput value={form.medications} onChange={(event) => updateField("medications", event.target.value)} disabled={status === "loading"} />
              </Field>
            </div>
          </fieldset>

          {error && <Alert tone="danger" live>{error}</Alert>}
          <div className="assessment-actions intake-actions">
            <Button type="submit" size="lg" loading={status === "loading"} loadingLabel="Đang tạo câu hỏi...">Tạo bộ câu hỏi lâm sàng</Button>
            <Button tone="secondary" onClick={() => navigate("/medical-assistant/safety")}>Kiểm tra dấu hiệu khẩn cấp</Button>
          </div>
        </form>

        {showIntakeSidePanel && (
          <aside className="intake-side-panel" aria-label="Trạng thái hồ sơ đánh giá">
            {!auth && (
              <Alert tone="warning" title="Cần đăng nhập">
                Backend hiện yêu cầu token cho phiên đánh giá. Hãy đăng nhập để tiếp tục và lưu lịch sử phiên.
              </Alert>
            )}
            {auth && profileStatus === "loading" && (
              <Alert tone="info" live>Đang tải hồ sơ sức khỏe để điền sẵn thông tin nền nếu có.</Alert>
            )}
            {auth && profileStatus === "ready" && (
              <Alert tone="success" live>Đã điền sẵn thông tin hồ sơ sức khỏe có sẵn. Bạn có thể chỉnh sửa trước khi gửi.</Alert>
            )}
            {auth && profileStatus === "empty" && (
              <Alert tone="warning">Chưa tìm thấy hồ sơ sức khỏe. Bạn vẫn có thể nhập thủ công bệnh nền và dị ứng.</Alert>
            )}
          </aside>
        )}
      </div>
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
  const answeredCount = questions.filter((item) => isClinicalQuestionAnswered(item, answers[item.questionId])).length;
  const canSubmit = questions.length > 0 && answeredCount === questions.length && status !== "submitting";

  function updateAnswer(questionId, answerKey) {
    setSession((current) => {
      const next = { ...current, answers: { ...(current?.answers ?? {}), [questionId]: answerKey } };
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
      const next = { ...current, answers: { ...(current?.answers ?? {}), [questionId]: nextAnswer } };
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
      const recommendationResponse = await symptomAnalysisApi.submitClinicalQuestionAnswers(sessionId, payload);
      const recommendationData = unwrapData(recommendationResponse) ?? {};
      const diagnosisResponse = await symptomAnalysisApi.submitDiagnosis(sessionId, payload);
      const diagnosisData = unwrapData(diagnosisResponse) ?? {};

      const analysis = recommendationData.analysis || recommendationData;
      let result = {
        ...analysis,
        answers: recommendationData.answers ?? analysis.answers ?? payload,
        diagnoses: diagnosisData.diagnoses ?? analysis.diagnoses ?? [],
        primaryDiagnosis: diagnosisData.diagnoses?.[0] ?? analysis.primaryDiagnosis ?? null,
        diagnosisModel: diagnosisData.model ?? analysis.model ?? null,
      };

      const next = { ...session, answers, result };
      saveSessionState(sessionId, next);
      navigate(`/assessment/${sessionId}/result`);
    } catch (requestError) {
      setError(requestError.status === 502
        ? "AI tạm thời không phản hồi. Dữ liệu bạn đã nhập vẫn được giữ lại để thử lại."
        : requestError.message || "Không thể gửi câu trả lời lúc này.");
      setStatus("idle");
    }
  }

  if (!session) {
    return (
      <AssessmentShell eyebrow="Phiên đánh giá" title="Không tìm thấy câu hỏi của phiên này">
        <ErrorState
          title="Phiên đánh giá chưa sẵn sàng"
          description="Hãy bắt đầu lại từ form nhập triệu chứng để backend tạo sessionId và danh sách câu hỏi."
          action={<Button onClick={() => navigate("/medical-assistant/intake")}>Nhập triệu chứng</Button>}
        />
      </AssessmentShell>
    );
  }

  if (questions.length === 0) {
    return (
      <AssessmentShell eyebrow="Bước 3" title="Chưa có câu hỏi phù hợp">
        <Stepper active={2} />
        <EmptyState
          title="Backend chưa tạo được câu hỏi lâm sàng"
          description="Hãy bổ sung triệu chứng chính, thời gian bắt đầu, mức độ, vị trí và triệu chứng đi kèm."
          action={<Button onClick={() => navigate("/medical-assistant/intake")}>Quay lại bổ sung thông tin</Button>}
        />
      </AssessmentShell>
    );
  }

  const question = questions[currentIndex];
  const answerMode = getClinicalQuestionAnswerMode(question);
  const selectedAnswer = answers[question.questionId];
  const booleanPrompts = getClinicalQuestionBooleanPrompts(question);
  const questionComplete = isClinicalQuestionAnswered(question, selectedAnswer);

  return (
    <AssessmentShell
      eyebrow="Bước 3"
      title="Câu hỏi lâm sàng"
      description="Trả lời từng câu hỏi để MediMate hoàn tất phân tích và tạo gợi ý chuyên khoa."
    >
      <Stepper active={2} />
      <form className="question-panel" onSubmit={submit}>
        <div className="question-progress">
          <span>Câu {currentIndex + 1}/{questions.length}</span>
          <strong>{Math.round((answeredCount / questions.length) * 100)}%</strong>
        </div>
        <fieldset className="question-card">
          <legend>{question.questionText}</legend>
          {question.questionOriginalText && <p className="question-original">Gốc tiếng Anh: {question.questionOriginalText}</p>}
          {answerMode === "choice" ? (
            <div className="question-choice-grid">
              {getClinicalQuestionAnswerOptions(question).map(([answerKey, label]) => (
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
              {booleanPrompts.map((prompt, promptIndex) => {
                const selectedValue = isPlainObject(selectedAnswer) ? selectedAnswer[prompt.key] : undefined;
                const promptLabel = prompt.label === question.questionText ? "Câu trả lời của bạn" : prompt.label;
                const promptOriginal = prompt.original && prompt.original !== question.questionOriginalText ? prompt.original : "";
                return (
                  <section className="boolean-prompt" key={prompt.key} aria-labelledby={`clinical-prompt-${currentIndex}-${promptIndex}`}>
                    <div className="boolean-prompt-copy">
                      <span>Ý lâm sàng {promptIndex + 1}</span>
                      <strong id={`clinical-prompt-${currentIndex}-${promptIndex}`}>{promptLabel}</strong>
                      {promptOriginal && <small>Gốc tiếng Anh: {promptOriginal}</small>}
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
          {question.chapterCode && <small>Nhóm ICD: {question.chapterCode}</small>}
        </fieldset>
        {error && <Alert tone="danger" live>{error}</Alert>}
        <div className="assessment-actions">
          <Button tone="secondary" disabled={currentIndex === 0} onClick={() => setCurrentIndex((index) => index - 1)}>Câu trước</Button>
          {currentIndex < questions.length - 1 ? (
            <Button disabled={!questionComplete} onClick={() => setCurrentIndex((index) => index + 1)}>Câu tiếp theo</Button>
          ) : (
            <Button type="submit" loading={status === "submitting"} loadingLabel="Đang phân tích..." disabled={!canSubmit}>Xem gợi ý</Button>
          )}
        </div>
      </form>
    </AssessmentShell>
  );
}

function ResultPage({ sessionId }) {
  const [state, setState] = useState(() => loadSessionState(sessionId));
  const [remoteStatus, setRemoteStatus] = useState(() => loadSessionState(sessionId)?.result ? "idle" : "loading");
  const [remoteError, setRemoteError] = useState("");

  useEffect(() => {
    if (state?.result) return;
    let active = true;
    symptomAnalysisApi.get(sessionId)
      .then((response) => {
        if (!active) return;
        const data = unwrapData(response);
        const next = { ...(state ?? { sessionId }), result: data, userInput: data?.inputText };
        setState(next);
        saveSessionState(sessionId, next);
      })
      .catch((error) => {
        if (active) setRemoteError(error.message || "Không thể tải kết quả phiên đánh giá.");
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
  const facilities = getFacilities(result);
  const isEmergency = department?.isEmergencySuggested;

  function openMap() {
    const search = new URLSearchParams();
    const topFacility = facilities[0] ?? null;
    const topFacilityId = facilityId(topFacility);

    if (topFacilityId) search.set("facilityId", topFacilityId);
    if (department?.departmentId) search.set("departmentId", department.departmentId);
    if (topFacility?.facilityName || department?.departmentName) {
      search.set("search", topFacility?.facilityName || department.departmentName);
    }
    search.set("sessionId", sessionId);
    navigate(`/map?${search.toString()}`);
  }

  if (remoteStatus === "loading") {
    return <AssessmentShell eyebrow="Kết quả" title="Đang tải kết quả"><LoadingState label="Đang tải phiên đánh giá..." /></AssessmentShell>;
  }

  if (!result) {
    return (
      <AssessmentShell eyebrow="Kết quả" title="Không tìm thấy kết quả">
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
      eyebrow="Bước 4"
      title="Gợi ý chuyên khoa"
      description="Tổng hợp kết quả phân tích lâm sàng, mức ưu tiên và cơ sở y tế liên quan."
    >
      <Stepper active={3} />
      <Alert tone={isEmergency ? "danger" : "info"} title={isEmergency ? "Cần ưu tiên thăm khám khẩn cấp" : "Đã tạo gợi ý chuyên khoa"}>
        {isEmergency
          ? "Kết quả cho thấy bạn có thể cần được đánh giá y tế sớm. Hãy liên hệ cơ sở y tế phù hợp."
          : "Thông tin dưới đây giúp bạn chọn chuyên khoa và cơ sở y tế phù hợp cho bước tiếp theo."}
      </Alert>
      <section className="result-grid">
        {department && (
          <article className="result-card priority">
            <span>Chuyên khoa gợi ý</span>
            <h2>{department.departmentName || "Chuyên khoa phù hợp"}</h2>
            <p>{department.reason || "Backend đề xuất dựa trên triệu chứng và câu trả lời lâm sàng."}</p>
            <strong>{confidencePercent(department.confidenceScore)}% phù hợp</strong>
          </article>
        )}
        {primaryDiagnosis && (
          <article className="result-card">
            <span>Khả năng cần bác sĩ kiểm tra</span>
            <h2>{primaryDiagnosis.diseaseName || "Nhận định tham khảo"}</h2>
            {primaryDiagnosis.clinicalReasoning && <p>{primaryDiagnosis.clinicalReasoning}</p>}
            {primaryDiagnosis.icd10Code && <small>ICD-10: {primaryDiagnosis.icd10Code}</small>}
          </article>
        )}
        {diagnoses.length > 0 && (
          <article className="result-card">
            <span>Các khả năng liên quan</span>
            <div className="diagnosis-stack">
              {diagnoses.slice(0, 4).map((diagnosis, index) => (
                <p key={`${diagnosis.rank || index}-${diagnosis.diseaseName}`}>
                  <strong>{diagnosis.rank || index + 1}. {diagnosis.diseaseName || "Nhận định"}</strong>
                  <small>{confidencePercent(diagnosis.paGivenB)}%</small>
                </p>
              ))}
            </div>
          </article>
        )}
        <article className="result-card facilities">
          <span>Cơ sở y tế liên quan</span>
          <h2>Ưu tiên cơ sở có chuyên khoa phù hợp</h2>
          {facilities.length === 0 ? (
            <p>Backend chưa trả cơ sở cụ thể cho phiên này. Bạn có thể mở bản đồ để lọc theo chuyên khoa gợi ý.</p>
          ) : (
            <div className="facility-stack">
              {facilities.slice(0, 5).map((facility) => (
                <article key={facilityKey(facility)}>
                  <strong>{facility.facilityName || "Cơ sở y tế"}</strong>
                  <span>{facility.address || "Chưa có địa chỉ"}</span>
                  {facility.phone && <a href={`tel:${facility.phone}`}>{facility.phone}</a>}
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
      <div className="assessment-actions">
        <Button onClick={openMap}><MapPin size={18} /> Xem trên bản đồ</Button>
        <Button tone="secondary" onClick={() => navigate("/assessment/history")}><History size={18} /> Xem lịch sử</Button>
        <Button tone="secondary" onClick={() => navigate("/medical-assistant/intake")}>Đánh giá mới</Button>
      </div>
    </AssessmentShell>
  );
}

function HistoryPage() {
  const [sessions, setSessions] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    symptomAnalysisApi.listMySessions(1, 10)
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
  }, []);

  return (
    <AssessmentShell
      eyebrow="Lịch sử"
      title="Lịch sử phiên đánh giá triệu chứng"
      description="Dữ liệu lấy từ endpoint my-sessions của backend."
    >
      {status === "loading" && <LoadingState label="Đang tải lịch sử đánh giá..." />}
      {error && <ErrorState title="Không thể tải lịch sử" description={error} action={<Button onClick={() => window.location.reload()}>Thử lại</Button>} />}
      {status !== "loading" && !error && sessions.length === 0 && (
        <EmptyState
          title="Chưa có phiên đánh giá nào"
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
                <span>{session.createdAt ? new Date(session.createdAt).toLocaleString("vi-VN") : "Chưa có ngày tạo"}</span>
              </div>
              <small>{session.status || "Đang cập nhật"}</small>
              <Button tone="secondary" onClick={() => navigate(`/assessment/${session.sessionId}/result`)}>Xem chi tiết</Button>
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
