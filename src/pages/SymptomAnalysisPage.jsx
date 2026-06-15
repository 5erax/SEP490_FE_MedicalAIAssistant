import { useState } from "react";
import { navigate as goTo } from "../router/navigation";
import { symptomAnalysisApi } from "../services/api";

const QUICK_SYMPTOMS = ["Đau đầu", "Sốt", "Ho", "Đau bụng", "Mệt mỏi", "Khó thở", "Đau họng", "Chóng mặt"];

function confidencePercent(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric <= 1 ? numeric * 100 : numeric)));
}

function formatQuestion(question, index) {
  return question.questionVi || question.questionText || question.text || question.content || `Câu hỏi lâm sàng ${index + 1}`;
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

  const questionId = getQuestionId(question, index);
  return {
    ...question,
    questionId,
  };
}

function unwrapPayload(response) {
  return response?.data?.data ?? response?.data ?? response;
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

function facilityId(facility) {
  return facility.id || facility.facilityId || facility.facilityName;
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

function scoreFacility(facility, department) {
  let score = 0;
  if (hasDepartmentMatch(facility, department)) score += 100;
  if (facility.latitude != null && facility.longitude != null) score += 20;
  if (facility.isActive) score += 12;
  if (facility.openingHours) score += 8;
  if (facility.phone) score += 6;
  if (facility.website) score += 4;
  return score;
}

function sortFacilities(facilities, department) {
  return [...facilities].sort((left, right) => scoreFacility(right, department) - scoreFacility(left, department));
}

function getFacilityReason(facility, department) {
  const reasons = [];
  if (hasDepartmentMatch(facility, department)) reasons.push("có chuyên khoa liên quan");
  if (facility.latitude != null && facility.longitude != null) reasons.push("có tọa độ để tìm đường");
  if (facility.isActive) reasons.push("đang hoạt động");
  if (facility.openingHours) reasons.push("có giờ mở cửa");
  if (facility.phone) reasons.push("có số liên hệ");
  return reasons.length ? reasons.join(", ") : "backend đề xuất cho phiên chẩn đoán này";
}

function getAnalysis(response) {
  return response?.analysis ?? response?.result ?? response;
}

export default function SymptomAnalysisPage() {
  const [userInput, setUserInput] = useState(() => {
    const prefill = sessionStorage.getItem("medimate.symptom.prefill");
    if (prefill) sessionStorage.removeItem("medimate.symptom.prefill");
    return prefill || "";
  });
  const [sessionId, setSessionId] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const answeredCount = Object.values(answers).filter((value) => value === true || value === false).length;
  const canSubmitAnswers = questions.length > 0 && answeredCount === questions.length && status !== "submitting";
  const analysis = getAnalysis(result);
  const primaryDiagnosis = analysis?.primaryDiagnosis;
  const diagnoses = analysis?.diagnoses ?? [];
  const recommendedDepartment = analysis?.recommendedDepartment;
  const sortedFacilities = sortFacilities(analysis?.recommendedFacilities ?? [], recommendedDepartment);

  function appendSymptom(label) {
    setUserInput((current) => {
      if (!current.trim()) return label;
      if (current.toLowerCase().includes(label.toLowerCase())) return current;
      return `${current}, ${label.toLowerCase()}`;
    });
  }

  async function startDiagnosis(event) {
    event.preventDefault();
    const symptomText = userInput.trim();
    if (!symptomText) return;

    setError("");
    setResult(null);
    setQuestions([]);
    setAnswers({});
    setStatus("loading-questions");

    try {
      const response = await symptomAnalysisApi.suggestClinicalQuestions(symptomText);
      const data = readQuestionsPayload(response);
      setSessionId(data.sessionId);
      setQuestions(data.questions);
      setStatus(data.questions.length ? "questions" : "no-questions");
    } catch (requestError) {
      setError(requestError.message || "Không thể tạo câu hỏi làm rõ. Vui lòng thử lại.");
      setStatus("idle");
    }
  }

  function updateAnswer(questionId, answer) {
    setAnswers((current) => ({ ...current, [questionId]: answer }));
  }

  async function submitAnswers(event) {
    event.preventDefault();
    if (!canSubmitAnswers) return;

    setError("");
    setStatus("submitting");

    try {
      const payload = questions.map((question) => ({
        questionId: question.questionId,
        answer: answers[question.questionId],
      }));
      const response = await symptomAnalysisApi.submitClinicalQuestionAnswers(sessionId, payload);
      setResult(readResultPayload(response));
      setStatus("result");
    } catch (requestError) {
      setError(requestError.message || "Không thể gửi câu trả lời. Vui lòng thử lại.");
      setStatus("questions");
    }
  }

  function openFacilities() {
    const search = recommendedDepartment?.departmentName || primaryDiagnosis?.diseaseName || userInput;
    goTo(`/map?search=${encodeURIComponent(search)}`);
  }

  return (
    <main className="symptom-page">
      <style>{styles}</style>
      <section className="symptom-shell">
        <header className="symptom-hero">
          <p className="mini-label">Sàng lọc định hướng</p>
          <h1>Mô tả triệu chứng, trả lời vài câu hỏi yes/no.</h1>
          <p>
            MediMate dùng câu hỏi lâm sàng từ backend để định hướng chuyên khoa và cơ sở y tế phù hợp.
            Kết quả chỉ mang tính hỗ trợ, không thay thế bác sĩ.
          </p>
        </header>

        <ol className="diagnosis-steps" aria-label="Tiến trình sàng lọc">
          {[
            ["Nhập triệu chứng", ["idle", "loading-questions", "no-questions"].includes(status)],
            ["Trả lời yes/no", ["questions", "submitting"].includes(status)],
            ["Xem nhận định", status === "result"],
          ].map(([label, active], index) => (
            <li className={active ? "active" : ""} key={label}>
              <span>{index + 1}</span>
              {label}
            </li>
          ))}
        </ol>

        <form className="symptom-card" onSubmit={startDiagnosis}>
          <label className="symptom-input" htmlFor="symptom-input">
            <span>Triệu chứng của bạn</span>
            <textarea
              id="symptom-input"
              value={userInput}
              onChange={(event) => setUserInput(event.target.value)}
              placeholder="Ví dụ: Tôi bị đau đầu 3 ngày, sốt nhẹ, mệt mỏi và buồn nôn..."
              rows={5}
              disabled={status === "loading-questions" || status === "submitting"}
            />
          </label>
          <div className="chip-row" aria-label="Triệu chứng nhanh">
            {QUICK_SYMPTOMS.map((item) => (
              <button type="button" key={item} onClick={() => appendSymptom(item)}>
                {item}
              </button>
            ))}
          </div>
          <button className="primary-action" type="submit" disabled={!userInput.trim() || status === "loading-questions"}>
            {status === "loading-questions" ? "Đang tạo câu hỏi..." : "Bắt đầu sàng lọc"}
          </button>
        </form>

        {error && <div className="diagnosis-alert" role="alert">{error}</div>}

        {status === "loading-questions" && (
          <section className="symptom-card status-card" role="status">
            <div className="large-spinner" />
            <h2>Backend đang chọn câu hỏi phù hợp.</h2>
            <p>Quá trình này giúp kết quả bám sát triệu chứng bạn mô tả hơn.</p>
          </section>
        )}

        {status === "no-questions" && (
          <section className="symptom-card status-card" role="status">
            <h2>Chưa có câu hỏi phù hợp.</h2>
            <p>Hãy mô tả rõ hơn về thời gian, vị trí đau, mức độ và triệu chứng đi kèm.</p>
          </section>
        )}

        {["questions", "submitting"].includes(status) && (
          <form className="symptom-card question-card" onSubmit={submitAnswers}>
            <div className="question-card-head">
              <div>
                <p className="mini-label">Câu hỏi lâm sàng</p>
                <h2>Trả lời yes/no để hoàn tất sàng lọc</h2>
              </div>
              <span>{answeredCount}/{questions.length}</span>
            </div>

            <div className="question-list">
              {questions.map((question, index) => {
                const questionText = formatQuestion(question, index);
                const questionId = question.questionId;
                return (
                  <fieldset className="diagnosis-question" key={questionId}>
                    <legend>{questionText}</legend>
                    <div>
                      <label>
                        <input
                          type="radio"
                          name={`answer-${questionId}`}
                          checked={answers[questionId] === true}
                          onChange={() => updateAnswer(questionId, true)}
                        />
                        Có
                      </label>
                      <label>
                        <input
                          type="radio"
                          name={`answer-${questionId}`}
                          checked={answers[questionId] === false}
                          onChange={() => updateAnswer(questionId, false)}
                        />
                        Không
                      </label>
                    </div>
                    {question.chapterCode && <small>Nhóm ICD: {question.chapterCode}</small>}
                  </fieldset>
                );
              })}
            </div>

            <button className="primary-action" type="submit" disabled={!canSubmitAnswers}>
              {status === "submitting" ? "Đang phân tích..." : "Xem nhận định tham khảo"}
            </button>
          </form>
        )}

        {status === "result" && (
          <section className="result-layout">
            <div className="diagnosis-alert medical" role="note">
              Kết quả này chỉ giúp định hướng. Nếu đau ngực, khó thở, yếu liệt, lơ mơ, chảy máu nhiều
              hoặc triệu chứng nặng nhanh, hãy liên hệ cấp cứu hoặc đến cơ sở y tế gần nhất.
            </div>

            <article className="symptom-card diagnosis-summary">
              <p className="mini-label">Nhận định tham khảo</p>
              <h2>{primaryDiagnosis?.diseaseName || "Chưa có nhận định chính"}</h2>
              {primaryDiagnosis?.clinicalReasoning && <p>{primaryDiagnosis.clinicalReasoning}</p>}
              {primaryDiagnosis?.icd10Code && <span className="soft-badge">ICD-10: {primaryDiagnosis.icd10Code}</span>}
            </article>

            {recommendedDepartment && (
              <article className="symptom-card department-card">
                <p className="mini-label">Chuyên khoa đề xuất</p>
                <h2>{recommendedDepartment.departmentName || "Chuyên khoa phù hợp"}</h2>
                <p>{recommendedDepartment.reason || "Backend đề xuất chuyên khoa dựa trên câu trả lời của bạn."}</p>
                <div className="confidence-line">
                  <span>{confidencePercent(recommendedDepartment.confidenceScore)}%</span>
                  <i style={{ width: `${confidencePercent(recommendedDepartment.confidenceScore)}%` }} />
                </div>
                {recommendedDepartment.isEmergencySuggested && (
                  <strong className="emergency-badge">Nên ưu tiên thăm khám khẩn cấp</strong>
                )}
              </article>
            )}

            {diagnoses.length > 0 && (
              <article className="symptom-card">
                <p className="mini-label">Khả năng khác</p>
                <div className="diagnosis-list">
                  {diagnoses.map((diagnosis) => (
                    <div key={`${diagnosis.rank}-${diagnosis.diseaseName}`}>
                      <strong>{diagnosis.rank}. {diagnosis.diseaseName || "Nhận định"}</strong>
                      <span>{confidencePercent(diagnosis.paGivenB)}%</span>
                      {diagnosis.clinicalReasoning && <p>{diagnosis.clinicalReasoning}</p>}
                    </div>
                  ))}
                </div>
              </article>
            )}

            <article className="symptom-card">
              <div className="question-card-head">
                <div>
                  <p className="mini-label">Cơ sở y tế liên quan</p>
                  <h2>Ưu tiên theo chuyên khoa, tọa độ và dữ liệu thật</h2>
                </div>
                <button className="outline-action" type="button" onClick={openFacilities}>
                  Mở bản đồ
                </button>
              </div>
              {sortedFacilities.length === 0 ? (
                <p className="soft-empty">Backend chưa trả cơ sở y tế cho phiên này. Bạn vẫn có thể mở bản đồ để tìm theo chuyên khoa.</p>
              ) : (
                <div className="facility-list">
                  {sortedFacilities.map((facility, index) => (
                    <article key={facilityId(facility)}>
                      <span>#{index + 1}</span>
                      <div>
                        <strong>{facility.facilityName || "Cơ sở y tế"}</strong>
                        <p>{facility.address || "Chưa có địa chỉ"}</p>
                        <small>{getFacilityReason(facility, recommendedDepartment)}</small>
                      </div>
                      {facility.phone && <a href={`tel:${facility.phone}`}>{facility.phone}</a>}
                    </article>
                  ))}
                </div>
              )}
            </article>

            <div className="result-actions">
              <button className="primary-action" type="button" onClick={openFacilities}>Tìm bệnh viện liên quan</button>
              <button className="outline-action" type="button" onClick={() => setStatus("questions")}>Xem lại câu trả lời</button>
              <button className="outline-action" type="button" onClick={() => {
                setStatus("idle");
                setQuestions([]);
                setAnswers({});
                setResult(null);
                setSessionId("");
              }}>
                Sàng lọc mới
              </button>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

const styles = `
.symptom-page { min-height: 100svh; background: var(--bg); color: var(--ink); padding: 24px; }
.symptom-shell { width: min(1080px, 100%); margin: 0 auto; display: grid; gap: 18px; }
.symptom-hero { border: 1.5px solid var(--ink); border-radius: 18px; background: #fff; padding: clamp(22px, 4vw, 38px); box-shadow: 4px 4px 0 var(--ink); }
.mini-label { display: inline-flex; align-items: center; gap: 9px; margin: 0 0 10px; color: var(--lime-dark); font-size: 11px; font-weight: 950; letter-spacing: .12em; text-transform: uppercase; }
.mini-label::before { content: ""; width: 12px; height: 2px; background: currentColor; }
.symptom-hero h1, .symptom-card h2 { margin: 0; font-family: var(--display); letter-spacing: 0; line-height: 1.06; }
.symptom-hero h1 { max-width: 760px; font-size: clamp(34px, 5vw, 58px); }
.symptom-hero p, .symptom-card p { color: var(--muted); line-height: 1.65; }
.diagnosis-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 0; padding: 0; list-style: none; }
.diagnosis-steps li { display: flex; align-items: center; gap: 10px; min-height: 52px; border: 1px solid var(--line-strong); border-radius: 14px; background: rgba(255,255,255,.76); padding: 8px 12px; color: var(--muted); font-weight: 950; }
.diagnosis-steps span { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 50%; background: #fff; border: 1.5px solid var(--ink); color: var(--ink); }
.diagnosis-steps .active { color: var(--ink); background: var(--mint); }
.diagnosis-steps .active span { background: var(--lime); }
.symptom-card { border: 1.5px solid var(--ink); border-radius: 18px; background: var(--paper); padding: clamp(18px, 3vw, 28px); box-shadow: 4px 4px 0 var(--ink); }
.symptom-input { display: grid; gap: 8px; font-size: 13px; font-weight: 950; color: var(--ink); }
.symptom-input textarea { width: 100%; min-height: 150px; resize: vertical; border: 1.5px solid var(--ink); border-radius: 12px; background: var(--paper-soft); padding: 14px; color: var(--ink); font: inherit; line-height: 1.65; }
.symptom-input textarea:focus, .diagnosis-question input:focus-visible { outline: 3px solid rgba(8,127,140,.35); outline-offset: 2px; }
.chip-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0 18px; }
.chip-row button, .outline-action { min-height: 42px; border: 1.5px solid var(--ink); border-radius: 999px; background: #fff; color: var(--ink); padding: 0 13px; font-weight: 900; }
.primary-action { min-height: 48px; border: 1.5px solid var(--ink); border-radius: 12px; background: var(--lime); color: var(--ink); padding: 0 18px; font-weight: 950; box-shadow: 3px 3px 0 var(--ink); }
.primary-action:disabled { cursor: not-allowed; opacity: .48; box-shadow: none; }
.diagnosis-alert { border: 1px solid rgba(185,28,28,.3); border-radius: 14px; background: rgba(254,226,226,.72); color: #7f1d1d; padding: 13px 14px; font-weight: 850; line-height: 1.55; }
.diagnosis-alert.medical { border-color: rgba(217,119,6,.35); background: rgba(245,158,11,.14); color: #7c3f00; }
.status-card { min-height: 260px; display: grid; place-items: center; align-content: center; gap: 12px; text-align: center; }
.large-spinner { width: 62px; height: 62px; border: 6px solid rgba(17,20,18,.1); border-top-color: var(--lime); border-radius: 50%; animation: spin .8s linear infinite; }
.question-card-head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 16px; }
.question-card-head h2 { font-size: clamp(24px, 3vw, 36px); }
.question-card-head > span, .soft-badge, .emergency-badge { display: inline-flex; width: fit-content; border-radius: 999px; background: var(--mint); color: var(--teal); padding: 6px 10px; font-size: 12px; font-weight: 950; }
.question-list { display: grid; gap: 12px; }
.diagnosis-question { min-width: 0; border: 1px solid var(--line-strong); border-radius: 14px; background: var(--paper-soft); padding: 14px; }
.diagnosis-question legend { color: var(--ink); font-weight: 950; line-height: 1.45; }
.diagnosis-question div { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
.diagnosis-question label { display: inline-flex; align-items: center; gap: 8px; min-height: 42px; border: 1px solid var(--line-strong); border-radius: 999px; background: #fff; padding: 0 14px; font-weight: 900; }
.diagnosis-question small { display: inline-block; margin-top: 9px; color: var(--muted); font-weight: 800; }
.result-layout { display: grid; gap: 16px; }
.diagnosis-summary h2, .department-card h2 { font-size: clamp(28px, 4vw, 44px); }
.confidence-line { position: relative; height: 12px; overflow: hidden; border: 1px solid var(--line-strong); border-radius: 999px; background: #e9eee1; margin-top: 14px; }
.confidence-line span { position: absolute; right: 0; bottom: 16px; color: var(--ink); font-size: 12px; font-weight: 950; }
.confidence-line i { display: block; height: 100%; background: linear-gradient(90deg, var(--lime), var(--teal)); }
.emergency-badge { margin-top: 12px; background: rgba(239,111,97,.15); color: #b42318; }
.diagnosis-list, .facility-list { display: grid; gap: 10px; }
.diagnosis-list > div, .facility-list article { border: 1px solid var(--line); border-radius: 14px; background: var(--paper-soft); padding: 14px; }
.diagnosis-list > div { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; }
.diagnosis-list p { grid-column: 1 / -1; margin: 0; }
.diagnosis-list span { font-weight: 950; color: var(--teal); }
.facility-list article { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 12px; align-items: center; }
.facility-list article > span { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 50%; background: var(--ink); color: var(--lime); font-size: 12px; font-weight: 950; }
.facility-list strong, .facility-list p, .facility-list small { display: block; min-width: 0; }
.facility-list p { margin: 4px 0; color: var(--muted); }
.facility-list small { color: var(--teal); font-weight: 850; }
.facility-list a { color: var(--ink); font-weight: 950; }
.soft-empty { color: var(--muted); line-height: 1.6; }
.result-actions { display: flex; flex-wrap: wrap; gap: 10px; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 760px) {
  .symptom-page { padding: 14px; }
  .diagnosis-steps, .diagnosis-list > div, .facility-list article { grid-template-columns: 1fr; }
  .question-card-head { display: grid; }
  .result-actions, .result-actions button, .outline-action, .primary-action { width: 100%; }
}
`;
