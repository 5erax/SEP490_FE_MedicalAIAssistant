import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ClipboardList, History, MapPin, Stethoscope } from "lucide-react";
import { Alert, Button, EmptyState, ErrorState, Field, LoadingState, Textarea, TextInput } from "../components/ui";
import { navigate } from "../router/navigation";
import { getStoredAuth } from "../services/api";
import { patientProfilesApi } from "../services/patientProfileService";
import {
  buildClinicalQuestionAnswerItems,
  getClinicalQuestionAnswerOptions,
  symptomAnalysisApi,
} from "../services/symptomAnalysisService";
import "../styles/medical-assessment.css";

const SESSION_KEY_PREFIX = "medimate.assessment.session.";
const assessmentSessionCache = new Map();
let assessmentDraftCache = null;

const RED_FLAGS = [
  "Dau nguc du doi",
  "Kho tho nang",
  "Ngat, co giat hoac mat y thuc",
  "Yeu hoac liet mot ben co the",
  "Meo mieng, noi kho",
  "Chay mau nhieu",
  "Dau dau du doi dot ngot",
  "Sung mat/moi kem kho tho hoac nghi phan ve",
];

const SEVERITY_OPTIONS = [
  ["mild", "Nhe"],
  ["moderate", "Vua"],
  ["severe", "Nang"],
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
  return questions.map((question, index) => ({
    ...question,
    questionId: getQuestionId(question, index),
    questionText: question?.questionVi || question?.questionText || question?.text || `Cau hoi lam sang ${index + 1}`,
  }));
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
  const steps = ["An toan", "Du lieu", "Cau hoi", "Ket qua"];
  return (
    <ol className="assessment-stepper" aria-label="Tien trinh danh gia">
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
      title="Phan tich lam sang va goi y chuyen khoa"
      description="MediMate giup ban mo ta van de suc khoe co cau truc, tra loi cau hoi lam sang va tim chuyen khoa phu hop de chuan bi buoc cham soc tiep theo."
    >
      <div className="assessment-grid">
        <article>
          <ClipboardList size={24} aria-hidden="true" />
          <h2>Luon bat dau bang an toan</h2>
          <p>Neu co dau hieu nguy hiem, ung dung se dung flow AI va huong dan ban tim cham soc khan cap.</p>
        </article>
        <article>
          <Stethoscope size={24} aria-hidden="true" />
          <h2>Hoi dap lam sang tung buoc</h2>
          <p>Backend chon cau hoi yes/no theo trieu chung ban nhap, sau do moi tao ket qua tham khao.</p>
        </article>
        <article>
          <MapPin size={24} aria-hidden="true" />
          <h2>Dieu huong co so y te</h2>
          <p>Khi co chuyen khoa goi y, MediMate tim co so y te active tu backend theo chuyen khoa do.</p>
        </article>
      </div>
      <div className="assessment-actions">
        <Button size="lg" onClick={() => navigate("/medical-assistant/safety")}>Bat dau phan tich lam sang</Button>
        <Button tone="secondary" onClick={() => navigate("/map")}>Tim co so y te</Button>
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
      eyebrow="Buoc 1"
      title="Truoc khi bat dau"
      description="Hay kiem tra nhanh cac dau hieu can cham soc y te khan cap. Neu co, khong nen tiep tuc tu danh gia bang AI."
    >
      <Stepper active={0} />
      <fieldset className="safety-checklist">
        <legend>Ban co dang gap mot trong cac dau hieu sau khong?</legend>
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
            <h2>Day co the la tinh huong can cham soc khan cap</h2>
            <p>Vui long goi cap cuu dia phuong, hoac den co so y te gan nhat. Khong tiep tuc tu danh gia bang AI trong tinh huong nay.</p>
            <div className="assessment-actions">
              <Button onClick={() => navigate("/map?search=cap%20cuu")}>Tim co so y te gan nhat</Button>
              <Button tone="secondary" onClick={() => navigate("/")}>Ve trang chu</Button>
            </div>
          </div>
        </section>
      )}

      {!hasRedFlag && (
        <div className="assessment-actions">
          <Button size="lg" onClick={() => navigate("/medical-assistant/intake")}>
            Khong, tiep tuc danh gia
          </Button>
          <Button tone="secondary" onClick={() => navigate("/medical-assistant")}>Quay lai</Button>
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
          profile.bloodType ? `Nhom mau ${profile.bloodType}` : "",
          profile.height ? `Chieu cao ${profile.height} cm` : "",
          profile.weight ? `Can nang ${profile.weight} kg` : "",
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
      if (!data.sessionId) throw new Error("Backend chua tra ve sessionId cho phien danh gia.");

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
        ? "AI tam thoi khong phan hoi. Vui long thu lai sau."
        : requestError.message || "Khong the tao cau hoi lam sang luc nay.");
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
  const answeredCount = Object.values(answers).filter(Boolean).length;
  const canSubmit = questions.length > 0 && answeredCount === questions.length && status !== "submitting";

  function updateAnswer(questionId, answerKey) {
    setSession((current) => {
      const next = { ...current, answers: { ...(current?.answers ?? {}), [questionId]: answerKey } };
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

      const next = { ...session, answers: Object.fromEntries(payload.map((item) => [item.questionId, item.answer])), result };
      saveSessionState(sessionId, next);
      navigate(`/assessment/${sessionId}/result`);
    } catch (requestError) {
      setError(requestError.status === 502
        ? "AI tam thoi khong phan hoi. Du lieu ban da nhap van duoc giu lai de thu lai."
        : requestError.message || "Khong the gui cau tra loi luc nay.");
      setStatus("idle");
    }
  }

  if (!session) {
    return (
      <AssessmentShell eyebrow="Phien danh gia" title="Khong tim thay cau hoi cua phien nay">
        <ErrorState
          title="Phien danh gia chua san sang"
          description="Hay bat dau lai tu form nhap trieu chung de backend tao sessionId va danh sach cau hoi."
          action={<Button onClick={() => navigate("/medical-assistant/intake")}>Nhap trieu chung</Button>}
        />
      </AssessmentShell>
    );
  }

  if (questions.length === 0) {
    return (
      <AssessmentShell eyebrow="Buoc 3" title="Chua co cau hoi phu hop">
        <Stepper active={2} />
        <EmptyState
          title="Backend chua tao duoc cau hoi lam sang"
          description="Hay bo sung trieu chung chinh, thoi gian bat dau, muc do, vi tri va trieu chung di kem."
          action={<Button onClick={() => navigate("/medical-assistant/intake")}>Quay lai bo sung thong tin</Button>}
        />
      </AssessmentShell>
    );
  }

  const question = questions[currentIndex];

  return (
    <AssessmentShell
      eyebrow="Buoc 3"
      title="Cau hoi lam sang"
      description="Tra loi tung cau hoi de MediMate hoan tat phan tich va tao goi y chuyen khoa."
    >
      <Stepper active={2} />
      <form className="question-panel" onSubmit={submit}>
        <div className="question-progress">
          <span>Cau {currentIndex + 1}/{questions.length}</span>
          <strong>{Math.round((answeredCount / questions.length) * 100)}%</strong>
        </div>
        <fieldset className="question-card">
          <legend>{question.questionText}</legend>
          <div>
            {getClinicalQuestionAnswerOptions(question).map(([answerKey, label]) => (
              <label key={answerKey}>
                <input
                  type="radio"
                  name={`answer-${question.questionId}`}
                  checked={answers[question.questionId] === answerKey}
                  onChange={() => updateAnswer(question.questionId, answerKey)}
                />
                {label}
              </label>
            ))}
          </div>
          {question.chapterCode && <small>Nhom ICD: {question.chapterCode}</small>}
        </fieldset>
        {error && <Alert tone="danger" live>{error}</Alert>}
        <div className="assessment-actions">
          <Button tone="secondary" disabled={currentIndex === 0} onClick={() => setCurrentIndex((index) => index - 1)}>Cau truoc</Button>
          {currentIndex < questions.length - 1 ? (
            <Button disabled={!answers[question.questionId]} onClick={() => setCurrentIndex((index) => index + 1)}>Cau tiep theo</Button>
          ) : (
            <Button type="submit" loading={status === "submitting"} loadingLabel="Dang phan tich..." disabled={!canSubmit}>Xem goi y</Button>
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
        if (active) setRemoteError(error.message || "Khong the tai ket qua phien danh gia.");
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
    return <AssessmentShell eyebrow="Ket qua" title="Dang tai ket qua"><LoadingState label="Dang tai phien danh gia..." /></AssessmentShell>;
  }

  if (!result) {
    return (
      <AssessmentShell eyebrow="Ket qua" title="Khong tim thay ket qua">
        <ErrorState
          title="Phien danh gia khong ton tai"
          description={remoteError || "Hay bat dau phien danh gia moi hoac mo lai tu lich su neu phien da duoc luu."}
          action={<Button onClick={() => navigate("/assessment/history")}>Xem lich su</Button>}
        />
      </AssessmentShell>
    );
  }

  return (
    <AssessmentShell
      eyebrow="Buoc 4"
      title="Goi y chuyen khoa"
      description="Tong hop ket qua phan tich lam sang, muc uu tien va co so y te lien quan."
    >
      <Stepper active={3} />
      <Alert tone={isEmergency ? "danger" : "info"} title={isEmergency ? "Can uu tien tham kham khan cap" : "Da tao goi y chuyen khoa"}>
        {isEmergency
          ? "Ket qua cho thay ban co the can duoc danh gia y te som. Hay lien he co so y te phu hop."
          : "Thong tin duoi day giup ban chon chuyen khoa va co so y te phu hop cho buoc tiep theo."}
      </Alert>
      <section className="result-grid">
        {department && (
          <article className="result-card priority">
            <span>Chuyen khoa goi y</span>
            <h2>{department.departmentName || "Chuyen khoa phu hop"}</h2>
            <p>{department.reason || "Backend de xuat dua tren trieu chung va cau tra loi lam sang."}</p>
            <strong>{confidencePercent(department.confidenceScore)}% phu hop</strong>
          </article>
        )}
        {primaryDiagnosis && (
          <article className="result-card">
            <span>Kha nang can bac si kiem tra</span>
            <h2>{primaryDiagnosis.diseaseName || "Nhan dinh tham khao"}</h2>
            {primaryDiagnosis.clinicalReasoning && <p>{primaryDiagnosis.clinicalReasoning}</p>}
            {primaryDiagnosis.icd10Code && <small>ICD-10: {primaryDiagnosis.icd10Code}</small>}
          </article>
        )}
        {diagnoses.length > 0 && (
          <article className="result-card">
            <span>Cac kha nang lien quan</span>
            <div className="diagnosis-stack">
              {diagnoses.slice(0, 4).map((diagnosis, index) => (
                <p key={`${diagnosis.rank || index}-${diagnosis.diseaseName}`}>
                  <strong>{diagnosis.rank || index + 1}. {diagnosis.diseaseName || "Nhan dinh"}</strong>
                  <small>{confidencePercent(diagnosis.paGivenB)}%</small>
                </p>
              ))}
            </div>
          </article>
        )}
        <article className="result-card facilities">
          <span>Co so y te lien quan</span>
          <h2>Uu tien co so co chuyen khoa phu hop</h2>
          {facilities.length === 0 ? (
            <p>Backend chua tra co so cu the cho phien nay. Ban co the mo ban do de loc theo chuyen khoa goi y.</p>
          ) : (
            <div className="facility-stack">
              {facilities.slice(0, 5).map((facility) => (
                <article key={facilityKey(facility)}>
                  <strong>{facility.facilityName || "Co so y te"}</strong>
                  <span>{facility.address || "Chua co dia chi"}</span>
                  {facility.phone && <a href={`tel:${facility.phone}`}>{facility.phone}</a>}
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
      <div className="assessment-actions">
        <Button onClick={openMap}><MapPin size={18} /> Xem tren ban do</Button>
        <Button tone="secondary" onClick={() => navigate("/assessment/history")}><History size={18} /> Xem lich su</Button>
        <Button tone="secondary" onClick={() => navigate("/medical-assistant/intake")}>Danh gia moi</Button>
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
        if (active) setError(requestError.message || "Khong the tai lich su danh gia.");
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
      eyebrow="Lich su"
      title="Lich su phien danh gia trieu chung"
      description="Du lieu lay tu endpoint my-sessions cua backend."
    >
      {status === "loading" && <LoadingState label="Dang tai lich su danh gia..." />}
      {error && <ErrorState title="Khong the tai lich su" description={error} action={<Button onClick={() => window.location.reload()}>Thu lai</Button>} />}
      {status !== "loading" && !error && sessions.length === 0 && (
        <EmptyState
          title="Chua co phien danh gia nao"
          description="Bat dau phien moi de MediMate tao cau hoi lam sang va luu lich su."
          action={<Button onClick={() => navigate("/medical-assistant/intake")}>Danh gia moi</Button>}
        />
      )}
      {sessions.length > 0 && (
        <div className="history-list">
          {sessions.map((session) => (
            <article key={session.sessionId}>
              <div>
                <strong>{session.inputText || "Phien danh gia"}</strong>
                <span>{session.createdAt ? new Date(session.createdAt).toLocaleString("vi-VN") : "Chua co ngay tao"}</span>
              </div>
              <small>{session.status || "Dang cap nhat"}</small>
              <Button tone="secondary" onClick={() => navigate(`/assessment/${session.sessionId}/result`)}>Xem chi tiet</Button>
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
