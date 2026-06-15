import { useState } from "react";
import { ClipboardPlus, MapPin, Send } from "lucide-react";
import { Alert, Button, Field, Textarea } from "../components/ui";
import { navigate } from "../router/navigation";
import { symptomAnalysisApi } from "../services/api";
import { trackUxEvent } from "../utils/analytics";
import "../styles/dashboard.css";

const PROMPTS = [
  "Đau bụng âm ỉ sau bữa ăn, buồn nôn nhẹ",
  "Sốt nhẹ 2 ngày kèm đau họng",
  "Khó thở khi leo cầu thang, tim đập nhanh",
  "Đau đầu kéo dài và mất ngủ",
];

function confidencePercent(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric <= 1 ? numeric * 100 : numeric)));
}

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
  if (facility.rating || facility.averageRating) score += Number(facility.rating ?? facility.averageRating) * 3;
  if (facility.isActive) score += 12;
  if (facility.openingHours) score += 8;
  if (facility.phone) score += 6;
  if (facility.website) score += 4;
  return score;
}

export default function DashboardPage() {
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const loading = status === "loading-questions" || status === "submitting";
  const answeredCount = Object.values(answers).filter((value) => value === true || value === false).length;
  const canSubmitAnswers = questions.length > 0 && answeredCount === questions.length && status !== "submitting";
  const primaryDiagnosis = result?.primaryDiagnosis;
  const diagnoses = result?.diagnoses ?? [];
  const recommendedDepartment = result?.recommendedDepartment;
  const sortedFacilities = [...(result?.recommendedFacilities ?? [])]
    .sort((left, right) => scoreFacility(right, recommendedDepartment) - scoreFacility(left, recommendedDepartment));

  async function startDiagnosis(textOverride) {
    const symptom = (textOverride ?? input).trim();
    if (!symptom || loading) return;

    setError("");
    setResult(null);
    setQuestions([]);
    setAnswers({});
    setStatus("loading-questions");
    trackUxEvent("specialty_intake_submitted", { source: textOverride ? "quick_prompt" : "manual" });

    try {
      const response = await symptomAnalysisApi.suggestClinicalQuestions(symptom);
      const data = readQuestionsPayload(response);
      setSessionId(data.sessionId);
      setQuestions(data.questions);
      setStatus(data.questions.length ? "questions" : "no-questions");
    } catch (apiError) {
      setError(apiError.message || "Không thể tạo câu hỏi chẩn đoán. Vui lòng thử lại.");
      setStatus("idle");
    }
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
    } catch (apiError) {
      setError(apiError.message || "Không thể gửi câu trả lời. Vui lòng thử lại.");
      setStatus("questions");
    }
  }

  function updateAnswer(questionId, answer) {
    setAnswers((current) => ({ ...current, [questionId]: answer }));
  }

  function openFacilities() {
    const search = recommendedDepartment?.departmentName || primaryDiagnosis?.diseaseName || input;
    navigate(`/map?search=${encodeURIComponent(search)}`);
  }

  return (
    <main className="specialty-page">
      <section className="studio-center" aria-label="Gợi ý chuyên khoa qua triệu chứng">
        <div className="studio-heading">
          <span className="studio-mark"><ClipboardPlus size={28} /></span>
          <h1>Gợi ý chuyên khoa qua triệu chứng</h1>
          <p>Ghi lại triệu chứng như khi trao đổi ở quầy tiếp nhận. MediMate sẽ hỏi thêm yes/no trước khi gợi ý chẩn đoán và cơ sở phù hợp.</p>
        </div>

        <form className="studio-chatbox" onSubmit={(event) => {
          event.preventDefault();
          startDiagnosis();
        }}>
          <div className="clinical-strip">
            <span>Tiếp nhận ban đầu</span>
            <span>Không thay thế chẩn đoán</span>
          </div>
          <Field
            id="specialty-symptoms"
            label="Triệu chứng bạn đang gặp"
            hint="Mô tả thời điểm bắt đầu, mức độ và dấu hiệu đi kèm để gợi ý phù hợp hơn."
            required
          >
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ví dụ: Tôi đau bụng âm ỉ sau bữa ăn, buồn nôn nhẹ..."
              rows={4}
              disabled={loading}
            />
          </Field>
          <div className="studio-chat-actions">
            <span className="studio-status" aria-live="polite">
              {status === "loading-questions"
                ? "AI đang chọn câu hỏi cần hỏi thêm..."
                : <><strong>Sẵn sàng.</strong> AI sẽ hỏi thêm yes/no rồi gợi ý bệnh viện phù hợp.</>}
            </span>
            <Button
              size="lg"
              loading={loading}
              loadingLabel="Đang tạo câu hỏi..."
              disabled={!input.trim()}
              type="submit"
            >
              <Send size={18} />
              Gợi ý chuyên khoa
            </Button>
          </div>
        </form>

        <div className="studio-prompts" aria-label="Triệu chứng mẫu">
          {PROMPTS.map((prompt) => (
            <button key={prompt} type="button" disabled={loading} onClick={() => setInput(prompt)}>
              {prompt}
            </button>
          ))}
        </div>

        {error && (
          <Alert tone="danger" title="Không thể kết nối dịch vụ phân tích" live>
            {error}
          </Alert>
        )}

        {status === "no-questions" && (
          <Alert tone="warning" title="AI chưa có câu hỏi phù hợp" live>
            Hãy mô tả rõ hơn về thời gian xuất hiện, vị trí đau, mức độ và triệu chứng đi kèm.
          </Alert>
        )}

        {["questions", "submitting"].includes(status) && (
          <form className="studio-diagnosis-panel" onSubmit={submitAnswers}>
            <div className="studio-panel-head">
              <div>
                <span>Câu hỏi làm rõ</span>
                <h2>AI cần hỏi thêm để chẩn đoán chính xác hơn</h2>
              </div>
              <strong>{answeredCount}/{questions.length}</strong>
            </div>

            <div className="studio-question-list">
              {questions.map((question) => (
                <fieldset className="studio-question" key={question.questionId}>
                  <legend>{question.questionText}</legend>
                  <div>
                    <label>
                      <input
                        type="radio"
                        name={`answer-${question.questionId}`}
                        checked={answers[question.questionId] === true}
                        onChange={() => updateAnswer(question.questionId, true)}
                      />
                      Có
                    </label>
                    <label>
                      <input
                        type="radio"
                        name={`answer-${question.questionId}`}
                        checked={answers[question.questionId] === false}
                        onChange={() => updateAnswer(question.questionId, false)}
                      />
                      Không
                    </label>
                  </div>
                  {question.chapterCode && <small>Nhóm ICD: {question.chapterCode}</small>}
                </fieldset>
              ))}
            </div>

            <Button
              size="lg"
              type="submit"
              loading={status === "submitting"}
              loadingLabel="Đang phân tích..."
              disabled={!canSubmitAnswers}
            >
              Xem chẩn đoán và bệnh viện phù hợp
            </Button>
          </form>
        )}

        {status === "result" && (
          <section className="studio-result-panel" aria-label="Kết quả chẩn đoán và gợi ý bệnh viện">
            <article className="studio-result-card primary">
              <span>Kết quả chẩn đoán</span>
              <h2>{primaryDiagnosis?.diseaseName || "Chưa có chẩn đoán chính"}</h2>
              {primaryDiagnosis?.clinicalReasoning && <p>{primaryDiagnosis.clinicalReasoning}</p>}
              {primaryDiagnosis?.icd10Code && <small>ICD-10: {primaryDiagnosis.icd10Code}</small>}
            </article>

            {recommendedDepartment && (
              <article className="studio-result-card">
                <span>Chuyên khoa nên ưu tiên</span>
                <h2>{recommendedDepartment.departmentName || "Chuyên khoa phù hợp"}</h2>
                <p>{recommendedDepartment.reason || "AI đề xuất dựa trên triệu chứng và câu trả lời của bạn."}</p>
                <strong>{confidencePercent(recommendedDepartment.confidenceScore)}%</strong>
              </article>
            )}

            {diagnoses.length > 0 && (
              <article className="studio-result-card">
                <span>Khả năng liên quan</span>
                <div className="studio-diagnosis-list">
                  {diagnoses.map((diagnosis) => (
                    <p key={`${diagnosis.rank}-${diagnosis.diseaseName}`}>
                      <strong>{diagnosis.rank}. {diagnosis.diseaseName}</strong>
                      <small>{confidencePercent(diagnosis.paGivenB)}%</small>
                    </p>
                  ))}
                </div>
              </article>
            )}

            <article className="studio-result-card facilities">
              <div className="studio-panel-head compact">
                <div>
                  <span>Bệnh viện phù hợp</span>
                  <h2>Ưu tiên chuyên khoa liên quan, gần và có dữ liệu tốt</h2>
                </div>
                <Button type="button" onClick={openFacilities}>
                  <MapPin size={18} />
                  Mở bản đồ
                </Button>
              </div>

              {sortedFacilities.length === 0 ? (
                <p>AI chưa trả về cơ sở y tế cụ thể. Bạn có thể mở bản đồ để tìm theo chuyên khoa được đề xuất.</p>
              ) : (
                <div className="studio-facility-list">
                  {sortedFacilities.map((facility, index) => (
                    <article key={facility.id || facility.facilityId || facility.facilityName}>
                      <span>#{index + 1}</span>
                      <div>
                        <strong>{facility.facilityName || "Cơ sở y tế"}</strong>
                        <p>{facility.address || "Chưa có địa chỉ"}</p>
                        {(facility.rating || facility.averageRating) && <small>{facility.rating ?? facility.averageRating} sao đánh giá</small>}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </article>
          </section>
        )}

        <Alert className="studio-safety" tone="warning" title="Khi nào cần cấp cứu?">
          Nếu bạn khó thở nặng, đau ngực, bất tỉnh, co giật hoặc chảy máu nhiều, hãy gọi cấp cứu 115 ngay thay vì chờ kết quả AI.
        </Alert>
      </section>
    </main>
  );
}
