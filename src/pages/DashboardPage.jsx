import { useEffect, useRef, useState } from "react";
import { ClipboardPlus, MapPin, Send, UserRound } from "lucide-react";
import { Alert, Button, Field, Textarea } from "../components/ui";
import { navigate } from "../router/navigation";
import {
  clinicalQuestionsApi,
  getStoredAuth,
  medicalDepartmentsApi,
  medicalFacilitiesApi,
  symptomAnalysisApi,
} from "../services/api";
import { trackUxEvent } from "../utils/analytics";
import "../styles/dashboard.css";

const PROMPTS = [
  "Đau bụng âm ỉ sau bữa ăn, buồn nôn nhẹ",
  "Sốt nhẹ 2 ngày kèm đau họng",
  "Khó thở khi leo cầu thang, tim đập nhanh",
  "Đau đầu kéo dài và mất ngủ",
];

const FALLBACK_TRIAGE_GROUPS = [
  {
    id: "cardiology",
    keywords: ["đau ngực", "tim", "khó thở", "hồi hộp", "đánh trống ngực", "huyết áp"],
    departmentNames: ["Tim mạch", "Cấp cứu", "Nội tổng quát"],
    diseaseName: "Nhóm triệu chứng tim mạch cần được đánh giá",
    reasoning: "Mô tả có dấu hiệu liên quan tim mạch hoặc khó thở, nên ưu tiên cơ sở có chuyên khoa phù hợp.",
    questions: [
      "Triệu chứng có nặng hơn khi gắng sức hoặc leo cầu thang không?",
      "Bạn có đau tức ngực, vã mồ hôi, choáng hoặc khó thở tăng nhanh không?",
      "Bạn có tiền sử tăng huyết áp, bệnh tim mạch hoặc rối loạn mỡ máu không?",
    ],
  },
  {
    id: "respiratory",
    keywords: ["ho", "sốt", "đau họng", "khò khè", "khó thở", "sổ mũi", "nghẹt mũi"],
    departmentNames: ["Tai Mũi Họng", "Hô hấp", "Nội tổng quát"],
    diseaseName: "Nhóm triệu chứng hô hấp hoặc tai mũi họng",
    reasoning: "Mô tả có dấu hiệu đường hô hấp, nên khám chuyên khoa phù hợp nếu triệu chứng kéo dài hoặc nặng lên.",
    questions: [
      "Bạn có sốt từ 38 độ C trở lên hoặc rét run không?",
      "Bạn có ho đờm, đau họng nhiều hoặc khó nuốt không?",
      "Bạn có khó thở, thở rít hoặc đau ngực khi ho không?",
    ],
  },
  {
    id: "gastro",
    keywords: ["đau bụng", "buồn nôn", "nôn", "tiêu chảy", "đầy bụng", "ợ nóng", "dạ dày"],
    departmentNames: ["Tiêu hóa", "Nội tổng quát", "Cấp cứu"],
    diseaseName: "Nhóm triệu chứng tiêu hóa cần sàng lọc",
    reasoning: "Mô tả tập trung ở tiêu hóa, nên ưu tiên chuyên khoa tiêu hóa hoặc nội tổng quát.",
    questions: [
      "Cơn đau bụng có khu trú một vị trí rõ ràng hoặc tăng dần không?",
      "Bạn có nôn nhiều, tiêu chảy, phân đen hoặc đi ngoài ra máu không?",
      "Triệu chứng có xuất hiện sau ăn, dùng thuốc hoặc uống rượu bia không?",
    ],
  },
  {
    id: "neurology",
    keywords: ["đau đầu", "chóng mặt", "tê", "yếu", "mất ngủ", "co giật", "mờ mắt"],
    departmentNames: ["Thần kinh", "Nội tổng quát", "Cấp cứu"],
    diseaseName: "Nhóm triệu chứng thần kinh cần theo dõi",
    reasoning: "Mô tả có dấu hiệu thần kinh hoặc đau đầu kéo dài, cần đánh giá thêm mức độ nguy cơ.",
    questions: [
      "Bạn có yếu liệt, tê một bên người, nói khó hoặc nhìn mờ đột ngột không?",
      "Đau đầu có dữ dội bất thường hoặc xuất hiện sau chấn thương không?",
      "Bạn có chóng mặt nhiều, buồn nôn hoặc mất thăng bằng không?",
    ],
  },
];

const GENERIC_FALLBACK_QUESTIONS = [
  "Triệu chứng đã kéo dài hơn 48 giờ hoặc đang nặng lên không?",
  "Bạn có bệnh nền, đang mang thai hoặc đang dùng thuốc điều trị dài ngày không?",
  "Triệu chứng có ảnh hưởng đến ăn uống, đi lại, ngủ hoặc sinh hoạt thường ngày không?",
];

function confidencePercent(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric <= 1 ? numeric * 100 : numeric)));
}

function unwrapPayload(response) {
  return response?.data?.data ?? response?.data ?? response;
}

function readCollectionItems(response) {
  const data = unwrapPayload(response);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
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

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function scoreTriageGroup(group, symptom, questions = [], answers = {}) {
  const normalizedSymptom = normalizeSearchText(symptom);
  let score = group.keywords.reduce(
    (total, keyword) => total + (normalizedSymptom.includes(normalizeSearchText(keyword)) ? 3 : 0),
    0,
  );

  for (const question of questions) {
    if (question.triageGroup === group.id && answers[question.questionId] === true) score += 2;
  }

  return score;
}

function selectTriageGroup(symptom, questions = [], answers = {}) {
  return [...FALLBACK_TRIAGE_GROUPS]
    .sort((left, right) => scoreTriageGroup(right, symptom, questions, answers) - scoreTriageGroup(left, symptom, questions, answers))[0];
}

function buildFallbackQuestions(symptom) {
  const selectedGroup = selectTriageGroup(symptom);
  const questionTexts = [
    ...selectedGroup.questions,
    ...GENERIC_FALLBACK_QUESTIONS,
  ].slice(0, 5);

  return questionTexts.map((questionText, index) => ({
    questionId: `fallback-${selectedGroup.id}-${index + 1}`,
    questionText,
    triageGroup: index < selectedGroup.questions.length ? selectedGroup.id : "general",
    chapterCode: selectedGroup.id === "cardiology"
      ? "IX"
      : selectedGroup.id === "respiratory"
        ? "X"
        : selectedGroup.id === "gastro"
          ? "XI"
          : selectedGroup.id === "neurology"
            ? "VI"
            : "",
  }));
}

function findMatchingDepartment(departments, group) {
  const items = Array.isArray(departments) ? departments : [];
  return items.find((department) => {
    const departmentName = normalizeSearchText(department.departmentName);
    return group.departmentNames.some((name) => departmentName.includes(normalizeSearchText(name)));
  }) ?? null;
}

function buildLocalDiagnosisResult(symptom, questions, answers, departments = [], facilities = []) {
  const group = selectTriageGroup(symptom, questions, answers);
  const positiveAnswers = Object.values(answers).filter(Boolean).length;
  const confidenceScore = Math.min(0.76, 0.42 + positiveAnswers * 0.06);
  const matchedDepartment = findMatchingDepartment(departments, group);
  const recommendedDepartment = matchedDepartment
    ? {
      ...matchedDepartment,
      confidenceScore,
      reason: group.reasoning,
    }
    : {
      departmentName: group.departmentNames[0],
      confidenceScore,
      reason: group.reasoning,
    };

  return {
    primaryDiagnosis: {
      rank: 1,
      diseaseName: group.diseaseName,
      paGivenB: confidenceScore,
      clinicalReasoning: `${group.reasoning} Đây là nhận định dự phòng khi backend chưa trả đủ câu hỏi lâm sàng.`,
    },
    diagnoses: [
      {
        rank: 1,
        diseaseName: group.diseaseName,
        paGivenB: confidenceScore,
        clinicalReasoning: group.reasoning,
      },
      {
        rank: 2,
        diseaseName: "Cần bác sĩ khai thác thêm bệnh sử và khám trực tiếp",
        paGivenB: Math.max(0.24, confidenceScore - 0.2),
        clinicalReasoning: "Triệu chứng mô tả chưa đủ để kết luận bệnh cụ thể.",
      },
    ],
    recommendedDepartment,
    recommendedFacilities: Array.isArray(facilities) ? facilities : [],
  };
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
    : "Được backend đề xuất trong nhận định tham khảo.";
}

function readSymptomPrefill() {
  if (typeof sessionStorage === "undefined") return "";
  const prefill = sessionStorage.getItem("medimate.symptom.prefill") ?? "";
  if (prefill) sessionStorage.removeItem("medimate.symptom.prefill");
  return prefill;
}

function readProfilePromptDismissed() {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem("medimate.profile.prompt.dismissed") === "true";
}

export default function DashboardPage() {
  const auth = getStoredAuth();
  const questionsPanelRef = useRef(null);
  const [input, setInput] = useState(readSymptomPrefill);
  const [sessionId, setSessionId] = useState("");
  const [questions, setQuestions] = useState([]);
  const [questionSource, setQuestionSource] = useState("backend");
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [fallbackNotice, setFallbackNotice] = useState("");
  const [profilePromptVisible, setProfilePromptVisible] = useState(
    auth?.isProfileCompleted === false && !readProfilePromptDismissed(),
  );
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle");
  const loading = status === "loading-questions" || status === "submitting";
  const answeredCount = Object.values(answers).filter((value) => value === true || value === false).length;
  const canSubmitAnswers = questions.length > 0 && answeredCount === questions.length && status !== "submitting";
  const primaryDiagnosis = result?.primaryDiagnosis;
  const diagnoses = result?.diagnoses ?? [];
  const recommendedDepartment = result?.recommendedDepartment;
  const sortedFacilities = [...(result?.recommendedFacilities ?? [])]
    .sort((left, right) => scoreFacility(right, recommendedDepartment, userLocation) - scoreFacility(left, recommendedDepartment, userLocation));

  useEffect(() => {
    if (!["questions", "submitting"].includes(status) || questions.length === 0) return;

    const handle = window.setTimeout(() => {
      questionsPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      questionsPanelRef.current?.focus({ preventScroll: true });
    }, 80);

    return () => window.clearTimeout(handle);
  }, [questions.length, status]);

  function dismissProfilePrompt() {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("medimate.profile.prompt.dismissed", "true");
    }
    setProfilePromptVisible(false);
  }

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

  function resetDiagnosis({ clearInput = false } = {}) {
    setError("");
    setResult(null);
    setQuestions([]);
    setQuestionSource("backend");
    setAnswers({});
    setSessionId("");
    setFallbackNotice("");
    setStatus("idle");
    if (clearInput) setInput("");
  }

  async function buildLocalResultFromCurrentAnswers() {
    const [departmentsResult, facilitiesResult] = await Promise.allSettled([
      medicalDepartmentsApi.list(),
      medicalFacilitiesApi.list(1, 50),
    ]);
    const departments = departmentsResult.status === "fulfilled" ? readCollectionItems(departmentsResult.value) : [];
    const facilities = facilitiesResult.status === "fulfilled" ? readCollectionItems(facilitiesResult.value) : [];
    return buildLocalDiagnosisResult(input, questions, answers, departments, facilities);
  }

  async function startDiagnosis(textOverride) {
    const symptom = (textOverride ?? input).trim();
    if (!symptom || loading) return;

    setError("");
    setResult(null);
    setQuestions([]);
    setQuestionSource("backend");
    setAnswers({});
    setSessionId("");
    setFallbackNotice("");
    setStatus("loading-questions");
    trackUxEvent("specialty_intake_submitted", { source: textOverride ? "quick_prompt" : "manual" });

    let backendSessionId = "";
    let backendQuestions = [];
    let warning = "";
    let backendReturned = false;

    try {
      const response = await symptomAnalysisApi.suggestClinicalQuestions(symptom);
      const data = readQuestionsPayload(response);
      backendSessionId = data.sessionId;
      backendQuestions = data.questions;
      backendReturned = true;
    } catch (apiError) {
      setError(apiError.message || "Không thể tạo câu hỏi làm rõ. Vui lòng thử lại.");
      warning = apiError.message || "Backend chưa tạo được câu hỏi làm rõ.";
    }

    setError("");

    if (backendQuestions.length) {
      setSessionId(backendSessionId);
      setQuestions(backendQuestions);
      setQuestionSource("backend");
      setStatus("questions");
      return;
    }

    if (backendReturned) {
      setSessionId(backendSessionId);
      setStatus("no-questions");
      return;
    }

    try {
      const response = await clinicalQuestionsApi.list(1, 8);
      const questionBank = readCollectionItems(response).filter(looksLikeQuestion).map(normalizeQuestion);
      if (backendSessionId && questionBank.length) {
        setSessionId(backendSessionId);
        setQuestions(questionBank);
        setQuestionSource("clinical-bank");
        setFallbackNotice(
          warning
            ? `Backend chưa trả câu hỏi theo triệu chứng (${warning}). Tạm dùng ngân hàng câu hỏi lâm sàng.`
            : "Backend chưa trả câu hỏi theo triệu chứng. Tạm dùng ngân hàng câu hỏi lâm sàng.",
        );
        setStatus("questions");
        return;
      }
    } catch {
      // Keep the user in the diagnosis flow; the local fallback below is read-only.
    }

    setSessionId(backendSessionId || `local-${Date.now()}`);
    setQuestions(buildFallbackQuestions(symptom));
    setQuestionSource("local");
    setFallbackNotice(
      warning
        ? `Backend chưa trả được câu hỏi (${warning}). MediMate đang dùng bộ câu hỏi dự phòng để bạn tiếp tục sàng lọc.`
        : "Backend chưa có câu hỏi phù hợp. MediMate đang dùng bộ câu hỏi dự phòng để bạn tiếp tục sàng lọc.",
    );
    setStatus("questions");
  }

  async function submitAnswers(event) {
    event.preventDefault();
    if (!canSubmitAnswers) return;

    setError("");
    setStatus("submitting");

    const localPayload = questions.map((question) => ({
      questionId: question.questionId,
      answer: answers[question.questionId],
    }));

    if (questionSource === "local") {
      const localResult = await buildLocalResultFromCurrentAnswers();
      setResult(localResult);
      setStatus("result");
      return;
    }

    try {
      const response = await symptomAnalysisApi.submitClinicalQuestionAnswers(sessionId, localPayload);
      setResult(readResultPayload(response));
      setStatus("result");
    } catch (apiError) {
      if (questionSource === "clinical-bank") {
        const localResult = await buildLocalResultFromCurrentAnswers();
        setFallbackNotice(
          `Backend chưa nhận câu trả lời từ ngân hàng câu hỏi (${apiError.message || "không rõ lỗi"}). MediMate đang hiển thị nhận định dự phòng.`,
        );
        setResult(localResult);
        setStatus("result");
        return;
      }

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
          <p>Ghi lại triệu chứng như khi trao đổi ở quầy tiếp nhận. MediMate sẽ hỏi thêm yes/no trước khi đưa ra nhận định tham khảo và cơ sở phù hợp.</p>
        </div>

        {profilePromptVisible && (
          <section className="profile-nudge" aria-labelledby="profile-nudge-title">
            <span aria-hidden="true"><UserRound size={20} /></span>
            <div>
              <h2 id="profile-nudge-title">Hoàn thiện hồ sơ khi bạn sẵn sàng</h2>
              <p>Hồ sơ giúp gợi ý theo bối cảnh sức khỏe tốt hơn, nhưng bạn vẫn có thể dùng tư vấn chuyên khoa ngay.</p>
            </div>
            <div className="profile-nudge-actions">
              <Button type="button" tone="secondary" onClick={dismissProfilePrompt}>Để sau</Button>
              <Button type="button" onClick={() => navigate("/profile")}>Cập nhật hồ sơ</Button>
            </div>
          </section>
        )}

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
                : <><strong>Sẵn sàng.</strong> AI sẽ hỏi thêm yes/no rồi gợi ý nơi khám phù hợp.</>}
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
        {error && (
          <div className="studio-recovery-actions">
            <Button type="button" tone="secondary" onClick={() => resetDiagnosis()}>Quay lại biểu mẫu</Button>
            <Button type="button" onClick={() => startDiagnosis()}>Thử lại</Button>
          </div>
        )}

        {fallbackNotice && (
          <Alert tone="warning" title="Đang dùng luồng sàng lọc dự phòng" live>
            {fallbackNotice}
          </Alert>
        )}

        {status === "no-questions" && (
          <Alert tone="warning" title="AI chưa có câu hỏi phù hợp" live>
            Hãy mô tả rõ hơn về thời gian xuất hiện, vị trí đau, mức độ và triệu chứng đi kèm.
          </Alert>
        )}
        {status === "no-questions" && (
          <div className="studio-recovery-actions">
            <Button type="button" tone="secondary" onClick={() => resetDiagnosis()}>Quay lại biểu mẫu</Button>
            <Button type="button" onClick={() => startDiagnosis()}>Thử lại với mô tả hiện tại</Button>
          </div>
        )}

        {["questions", "submitting"].includes(status) && (
          <form
            className="studio-diagnosis-panel"
            onSubmit={submitAnswers}
            ref={questionsPanelRef}
            tabIndex={-1}
            aria-live="polite"
          >
            <div className="studio-panel-head">
              <div>
                <span>Câu hỏi làm rõ</span>
                <h2>AI cần hỏi thêm để sàng lọc phù hợp hơn</h2>
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
              Xem nhận định và bệnh viện phù hợp
            </Button>
          </form>
        )}

        {status === "result" && (
          <section className="studio-result-panel" aria-label="Nhận định tham khảo và gợi ý bệnh viện">
            <article className="studio-result-card primary">
              <span>Nhận định tham khảo</span>
              <h2>{primaryDiagnosis?.diseaseName || "Chưa có nhận định chính"}</h2>
              {primaryDiagnosis?.clinicalReasoning && <p>{primaryDiagnosis.clinicalReasoning}</p>}
              {primaryDiagnosis?.icd10Code && <small>ICD-10: {primaryDiagnosis.icd10Code}</small>}
              <small>Kết quả này không thay thế bác sĩ và cần được kiểm tra bởi chuyên gia y tế.</small>
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
                  <p>Khoảng cách chỉ được dùng khi bạn cho phép truy cập vị trí và cơ sở có tọa độ hợp lệ.</p>
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
                    <MapPin size={18} />
                    {locationStatus === "ready" ? "Đã có vị trí" : "Dùng vị trí của tôi"}
                  </Button>
                  <Button type="button" onClick={openFacilities}>
                    <MapPin size={18} />
                    Mở bản đồ
                  </Button>
                </div>
              </div>

              {locationStatus === "denied" && (
                <Alert tone="warning" live>
                  Trình duyệt chưa cấp quyền vị trí. Danh sách vẫn ưu tiên chuyên khoa, tọa độ hợp lệ và đánh giá thật nếu backend cung cấp.
                </Alert>
              )}
              {locationStatus === "unsupported" && (
                <Alert tone="warning" live>
                  Trình duyệt không hỗ trợ định vị. Bạn vẫn có thể mở bản đồ và tìm theo chuyên khoa được đề xuất.
                </Alert>
              )}

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
                        <small>{getFacilityRankingReason(facility, recommendedDepartment, userLocation)}</small>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </article>
          </section>
        )}
        {status === "result" && (
          <div className="studio-recovery-actions">
            <Button type="button" tone="secondary" onClick={() => resetDiagnosis({ clearInput: true })}>Nhập triệu chứng mới</Button>
          </div>
        )}

        <Alert className="studio-safety" tone="warning" title="Khi nào cần cấp cứu?">
          Nếu bạn khó thở nặng, đau ngực, bất tỉnh, co giật hoặc chảy máu nhiều, hãy gọi cấp cứu 115 ngay thay vì chờ kết quả AI.
        </Alert>
      </section>
    </main>
  );
}
