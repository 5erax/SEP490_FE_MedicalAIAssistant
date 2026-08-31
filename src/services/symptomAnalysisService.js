import { apiRequest } from "./apiClient";
import { ENDPOINTS } from "./endpoints";
import { readRankingScore } from "../utils/clinicalExplanation";

const FALLBACK_ANSWER_OPTIONS = [
  ["yes", "Có"],
  ["no", "Không"],
];

const BOOLEAN_CHOICE_PREFIX = "__medimate_boolean_choice__";
const CLINICAL_MAP_CACHE_KEY = "medimate.clinical-map.recommendation";
const clinicalAnalysisCache = new Map();

function firstMessage(value) {
  if (typeof value === "string") return value.trim();

  if (Array.isArray(value)) {
    for (const item of value) {
      const message = firstMessage(item);
      if (message) return message;
    }
  }

  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      const message = firstMessage(item);
      if (message) return message;
    }
  }

  return "";
}

export const SYMPTOM_ANALYSIS_MESSAGES = {
  inputRequired: "Nội dung triệu chứng là bắt buộc",
  inputTooLong: "Nội dung triệu chứng không được vượt quá 2000 ký tự",
  requestRequired: "Request body là bắt buộc",
  sessionIdRequired: "Id phiên phân tích triệu chứng là bắt buộc",
  sessionNotFound: "Không tìm thấy phiên phân tích triệu chứng",
  sessionInputMissing: "Nội dung triệu chứng của phiên không tồn tại",
  questionsNotFound: "Không tìm thấy câu hỏi lâm sàng cho phiên này",
  medGemmaJsonInvalid: "Không thể phân tích phản hồi JSON từ MedGemma",
};

export function getSymptomAnalysisApiMessage(source, fallback = "") {
  const payload = source?.payload ?? source;
  const detail = firstMessage(payload?.errors) || firstMessage(payload?.message);
  if (detail) return detail;
  if (source?.payload && fallback) return fallback;
  return firstMessage(source?.message) || fallback;
}

export function getSymptomInputError(value) {
  const input = normalizeText(value);
  if (!input) return SYMPTOM_ANALYSIS_MESSAGES.inputRequired;
  if (input.length > 2000) return SYMPTOM_ANALYSIS_MESSAGES.inputTooLong;
  return "";
}

const CLINICAL_TRANSLATIONS = new Map([
  [
    "do you have a persistent high fever that does not improve after taking fever-reducing medicine?",
    "Bạn có bị sốt cao kéo dài hoặc sốt không giảm sau khi dùng thuốc hạ sốt không?",
  ],
  ["do you have chest pain?", "Bạn có đau ngực không?"],
  ["do you have chest pain during exertion?", "Bạn có đau ngực khi gắng sức không?"],
  ["do you have shortness of breath?", "Bạn có khó thở không?"],
  ["do you have severe headache?", "Bạn có đau đầu dữ dội không?"],
  ["do you feel dizzy?", "Bạn có chóng mặt không?"],
  ["do you have nausea or vomiting?", "Bạn có buồn nôn hoặc nôn không?"],
  ["do you have abdominal pain?", "Bạn có đau bụng không?"],
  ["do you have a cough?", "Bạn có ho không?"],
  ["do you have a fever?", "Bạn có sốt không?"],
]);

const CLINICAL_PHRASES = [
  ["persistent high fever", "sốt cao kéo dài"],
  ["does not improve after taking fever-reducing medicine", "không giảm sau khi dùng thuốc hạ sốt"],
  ["fever-reducing medicine", "thuốc hạ sốt"],
  ["shortness of breath", "khó thở"],
  ["chest pain", "đau ngực"],
  ["during exertion", "khi gắng sức"],
  ["severe headache", "đau đầu dữ dội"],
  ["headache", "đau đầu"],
  ["dizziness", "chóng mặt"],
  ["dizzy", "chóng mặt"],
  ["nausea", "buồn nôn"],
  ["vomiting", "nôn"],
  ["abdominal pain", "đau bụng"],
  ["cough", "ho"],
  ["fever", "sốt"],
  ["rash", "phát ban"],
  ["swelling", "sưng"],
  ["bleeding", "chảy máu"],
  ["weakness", "yếu"],
  ["numbness", "tê bì"],
  ["pain", "đau"],
];

function normalizeText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeCoordinate(value) {
  if (value === null || value === undefined || value === "") return null;

  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
}

function createDepartmentSnapshot(department) {
  if (!isPlainObject(department)) return null;

  const departmentId = normalizeText(
    department.departmentId ?? department.DepartmentId ?? department.id,
  );
  const departmentName = normalizeText(
    department.departmentName ?? department.DepartmentName ?? department.name,
  );
  if (!departmentId && !departmentName) return null;

  return {
    confidenceScore: Number(
      department.confidenceScore ?? department.ConfidenceScore ?? 0,
    ) || 0,
    departmentId,
    departmentName,
    description: normalizeText(
      department.description
      ?? department.Description,
    ),
    icdChapterCode: normalizeText(
      department.icdChapterCode ?? department.IcdChapterCode,
    ),
    isEmergencySuggested: (
      department.isEmergencySuggested ?? department.IsEmergencySuggested
    ) === true,
    priorityRank: Number(department.priorityRank ?? department.PriorityRank ?? 0) || 0,
    reason: normalizeText(department.reason ?? department.Reason),
    sourceDiagnosisId: department.sourceDiagnosisId ?? department.SourceDiagnosisId ?? null,
  };
}

function createDiagnosisSnapshot(diagnosis, index = 0) {
  if (!isPlainObject(diagnosis)) return null;

  const diseaseName = normalizeText(
    diagnosis.diseaseName ?? diagnosis.DiseaseName ?? diagnosis.name,
  );
  const icd10Code = normalizeText(
    diagnosis.icd10Code ?? diagnosis.Icd10Code ?? diagnosis.icdCode,
  );
  if (!diseaseName && !icd10Code) return null;

  return {
    id: diagnosis.id ?? diagnosis.Id ?? diagnosis.diagnosisId ?? null,
    confidenceScore: readRankingScore(diagnosis),
    clinicalReasoning: normalizeText(
      diagnosis.clinicalReasoning ?? diagnosis.ClinicalReasoning,
    ),
    diseaseName,
    icd10Code,
    rank: Number(diagnosis.rank ?? diagnosis.Rank ?? index + 1) || index + 1,
  };
}

function createFacilitySnapshot(facility) {
  if (!isPlainObject(facility)) return null;

  const facilityId = normalizeText(
    facility.facilityId
    ?? facility.FacilityId
    ?? facility.medicalFacilityId
    ?? facility.id,
  );
  if (!facilityId) return null;

  const departmentItems = facility.departments ?? facility.Departments;
  const departments = (Array.isArray(departmentItems) ? departmentItems : [])
    .map(createDepartmentSnapshot)
    .filter(Boolean);

  return {
    address: normalizeText(facility.address ?? facility.Address),
    departments,
    facilityId,
    facilityName: normalizeText(
      facility.facilityName ?? facility.FacilityName ?? facility.name,
    ),
    facilityType: normalizeText(facility.facilityType ?? facility.FacilityType),
    imageUrl: normalizeText(facility.imageUrl ?? facility.ImageUrl),
    isActive: (facility.isActive ?? facility.IsActive) !== false,
    latitude: normalizeCoordinate(facility.latitude ?? facility.Latitude),
    longitude: normalizeCoordinate(facility.longitude ?? facility.Longitude),
    openingHours: normalizeText(facility.openingHours ?? facility.OpeningHours),
    phone: normalizeText(facility.phone ?? facility.Phone),
    website: normalizeText(facility.website ?? facility.Website),
  };
}

function createClinicalMapSnapshot(analysis, fallbackSessionId) {
  if (!isPlainObject(analysis)) return null;

  const diagnosisItems = analysis.diagnoses ?? analysis.Diagnoses;
  const primaryDiagnosis = analysis.primaryDiagnosis ?? analysis.PrimaryDiagnosis;
  const diagnoses = (
    Array.isArray(diagnosisItems) && diagnosisItems.length > 0
      ? diagnosisItems
      : primaryDiagnosis ? [primaryDiagnosis] : []
  )
    .map(createDiagnosisSnapshot)
    .filter(Boolean)
    .sort((left, right) => left.rank - right.rank);
  const facilityItems = analysis.recommendedFacilities ?? analysis.RecommendedFacilities;
  const recommendedFacilities = (
    Array.isArray(facilityItems) ? facilityItems : []
  )
    .map(createFacilitySnapshot)
    .filter(Boolean);
  const recommendedDepartment = createDepartmentSnapshot(
    analysis.recommendedDepartment ?? analysis.RecommendedDepartment,
  )
    ?? recommendedFacilities[0]?.departments?.[0]
    ?? null;

  if (!recommendedDepartment && recommendedFacilities.length === 0 && diagnoses.length === 0) {
    return null;
  }

  return {
    diagnoses,
    recommendedDepartment,
    recommendedFacilities,
    sessionId: normalizeText(analysis.sessionId ?? analysis.SessionId ?? fallbackSessionId),
  };
}

function createStoredClinicalMapSnapshot(snapshot) {
  return {
    sessionId: snapshot.sessionId,
    recommendedDepartment: snapshot.recommendedDepartment,
    recommendedFacilities: snapshot.recommendedFacilities.map((facility) => ({
      ...facility,
      departments: facility.departments.map((department) => ({
        departmentId: department.departmentId,
        departmentName: department.departmentName,
      })),
    })),
  };
}

function clearStoredClinicalMapSnapshot() {
  if (typeof sessionStorage === "undefined") return;

  try {
    sessionStorage.removeItem(CLINICAL_MAP_CACHE_KEY);
  } catch {
    // The in-memory cache still supports the current SPA navigation.
  }
}

function storeClinicalMapSnapshot(snapshot) {
  if (typeof sessionStorage === "undefined") return;

  try {
    sessionStorage.setItem(
      CLINICAL_MAP_CACHE_KEY,
      JSON.stringify(createStoredClinicalMapSnapshot(snapshot)),
    );
  } catch {
    // The in-memory cache still supports the current SPA navigation.
  }
}

function readStoredClinicalMapSnapshot(sessionId) {
  if (typeof sessionStorage === "undefined") {
    return { available: false, snapshot: null };
  }

  try {
    const raw = sessionStorage.getItem(CLINICAL_MAP_CACHE_KEY);
    if (!raw) return { available: true, snapshot: null };

    const parsed = JSON.parse(raw);
    const snapshot = createClinicalMapSnapshot(parsed, parsed?.sessionId);
    if (!snapshot || snapshot.sessionId !== sessionId) {
      return { available: true, snapshot: null };
    }

    return { available: true, snapshot };
  } catch {
    clearStoredClinicalMapSnapshot();
    return { available: true, snapshot: null };
  }
}

function normalizeLookup(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeForMatch(value) {
  return normalizeLookup(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function hasVietnameseText(value) {
  return /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(
    String(value ?? ""),
  );
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function looksLikeAffirmative(value) {
  const text = normalizeForMatch(value);
  return /\b(yes|true|co|dong y|1)\b/.test(text);
}

function looksLikeNegative(value) {
  const text = normalizeForMatch(value);
  return /\b(no|false|khong|0)\b/.test(text);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function makeBooleanChoiceKey(sourceKey, value) {
  return `${BOOLEAN_CHOICE_PREFIX}:${value ? "true" : "false"}:${encodeURIComponent(sourceKey)}`;
}

function parseBooleanChoiceKey(value) {
  const text = normalizeText(value);
  const prefix = `${BOOLEAN_CHOICE_PREFIX}:`;

  if (!text.startsWith(prefix)) return null;

  const [, booleanText, ...encodedKeyParts] = text.split(":");
  const encodedKey = encodedKeyParts.join(":");

  if (!["true", "false"].includes(booleanText) || !encodedKey) return null;

  try {
    return {
      sourceKey: decodeURIComponent(encodedKey),
      value: booleanText === "true",
    };
  } catch {
    return null;
  }
}

function areYesNoOptions(options) {
  if (options.length !== 2) return false;

  const normalized = options.map(([key, label]) => `${key} ${label}`);
  return normalized.some(looksLikeAffirmative) && normalized.some(looksLikeNegative);
}

function getQuestionId(question, index = 0) {
  if (typeof question === "string") return `question-${index + 1}`;

  return (
    question?.questionId
    ?? question?.id
    ?? question?.code
    ?? `question-${index + 1}`
  );
}

function getRawAnswerEntries(question) {
  const answers = question?.answers;

  if (!isPlainObject(answers)) return [];

  return Object.entries(answers)
    .map(([key, label]) => {
      const answerKey = normalizeText(key);
      const answerValue = normalizeText(label || key);
      const shouldDisplayKey = hasVietnameseText(answerKey) || answerKey.length > 20;

      return [answerKey, shouldDisplayKey ? answerKey : answerValue];
    })
    .filter(([key]) => Boolean(key));
}

function getPayloadAnswerOptions(question) {
  const rawEntries = getRawAnswerEntries(question);
  return rawEntries.length > 0 ? rawEntries : FALLBACK_ANSWER_OPTIONS;
}

function normalizeAnswerLabel(key, label, index) {
  const source = normalizeText(label || key);

  // Ưu tiên tuyệt đối label tiếng Việt backend trả về.
  if (hasVietnameseText(source)) return source;

  const combined = `${key} ${source}`;

  if (looksLikeAffirmative(combined)) return "Có";
  if (looksLikeNegative(combined)) return "Không";

  if (index === 0 && looksLikeAffirmative(source)) return "Có";
  if (index === 1 && looksLikeNegative(source)) return "Không";

  return translateClinicalText(source);
}

function shouldRenderSingleBackendPromptAsYesNo(entries) {
  if (entries.length !== 1) return false;

  const [key, label] = entries[0];
  const source = normalizeText(label || key);
  const keyText = normalizeText(key);
  const combined = `${keyText} ${source}`;

  // Nếu backend trả một label answer rõ ràng như "Có", "Không", "Yes", "No"
  // thì không coi đây là prompt cần tách thành Có/Không.
  if (looksLikeAffirmative(combined) || looksLikeNegative(combined)) return false;

  // Case backend trả answers chỉ có 1 key/value là một câu hỏi/prompt.
  // Ví dụ:
  // answers: {
  //   "Do you have a persistent high fever...?": "Do you have a persistent high fever...?"
  // }
  return (
    source.length > 20
    || keyText.length > 20
    || /[?？]$/.test(source)
    || /[?？]$/.test(keyText)
    || /^do you|^are you|^have you/i.test(source)
    || /^do you|^are you|^have you/i.test(keyText)
  );
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function getOriginalQuestionText(question, hasQuestionVi, rawQuestionText, translatedText) {
  if (hasQuestionVi) {
    const possibleOriginal = normalizeText(
      question?.englishPrefix
        || question?.questionText
        || question?.text
        || question?.content
        || "",
    );

    if (!possibleOriginal) return "";
    if (possibleOriginal === normalizeText(question.questionVi)) return "";
    if (hasVietnameseText(possibleOriginal)) return "";

    return possibleOriginal;
  }

  if (!hasVietnameseText(rawQuestionText) && translatedText !== rawQuestionText) {
    return rawQuestionText;
  }

  return "";
}

export function unwrapApiData(response) {
  return response?.data?.data ?? response?.data ?? response;
}

export function readSymptomAnalysisQuota(response) {
  const data = unwrapApiData(response) ?? {};

  return {
    businessDate: data.businessDate ?? data.BusinessDate ?? "",
    limitPerDay: Math.max(0, Number(data.limitPerDay ?? data.LimitPerDay) || 0),
    usedToday: Math.max(0, Number(data.usedToday ?? data.UsedToday) || 0),
    remainingToday: Math.max(0, Number(data.remainingToday ?? data.RemainingToday) || 0),
    isFreeTier: Boolean(data.isFreeTier ?? data.IsFreeTier),
    hasServiceCredit: Boolean(data.hasServiceCredit ?? data.HasServiceCredit),
  };
}

export function translateClinicalText(value) {
  const text = normalizeText(value);

  if (!text || hasVietnameseText(text)) return text;

  const exact = CLINICAL_TRANSLATIONS.get(normalizeLookup(text));
  if (exact) return exact;

  let translated = text
    .replace(/^do you have\s+/i, "Bạn có ")
    .replace(/^are you experiencing\s+/i, "Bạn có đang bị ")
    .replace(/^have you experienced\s+/i, "Bạn từng bị ")
    .replace(/\?$/, "");

  CLINICAL_PHRASES.forEach(([english, vietnamese]) => {
    translated = translated.replace(
      new RegExp(`\\b${escapeRegExp(english)}\\b`, "gi"),
      vietnamese,
    );
  });

  if (translated !== text) {
    const needsQuestion = /^Bạn\b/i.test(translated) && !/[?？]$/.test(translated);
    return `${translated}${needsQuestion ? " không?" : ""}`;
  }

  return text;
}

export function normalizeClinicalQuestion(question, index = 0) {
  if (typeof question === "string") {
    const questionText = translateClinicalText(question);

    return {
      questionId: getQuestionId(question, index),
      questionText,
      questionVi: questionText,
      questionOriginalText: questionText === question ? "" : question,
      chapterId: "",
      chapterCode: "",
      totalScore: 0,
      matchedKeywords: [],
      answers: {},
    };
  }

  const hasQuestionVi = Boolean(normalizeText(question?.questionVi));

  const rawQuestionText = normalizeText(
    question?.questionVi
      || question?.questionText
      || question?.text
      || question?.content
      || `Câu hỏi lâm sàng ${index + 1}`,
  );

  const translatedText = hasQuestionVi
    ? normalizeText(question.questionVi)
    : translateClinicalText(rawQuestionText);

  return {
    ...question,
    questionId: getQuestionId(question, index),
    questionText: translatedText,
    questionVi: question?.questionVi || translatedText,
    questionOriginalText: getOriginalQuestionText(
      question,
      hasQuestionVi,
      rawQuestionText,
      translatedText,
    ),
    chapterId: question?.chapterId || "",
    chapterCode: question?.chapterCode || "",
    totalScore: Number.isFinite(Number(question?.totalScore))
      ? Number(question.totalScore)
      : 0,
    matchedKeywords: normalizeStringList(question?.matchedKeywords),
    answers: isPlainObject(question?.answers) ? question.answers : {},
  };
}

export function readSuggestClinicalQuestionsPayload(response) {
  const data = unwrapApiData(response) ?? {};
  const rawQuestions = Array.isArray(data?.questions) ? data.questions : [];

  return {
    sessionId: data?.sessionId || "",
    questions: rawQuestions.map(normalizeClinicalQuestion),
  };
}

export function readAnalysisPayload(response) {
  const data = unwrapApiData(response);
  return data?.analysis ?? data?.result ?? data ?? null;
}

export function getClinicalQuestionAnswerOptions(question) {
  const entries = getRawAnswerEntries(question);

  /*
   * Case chuẩn từ backend:
   * answers: { yes: "Có", no: "Không" }
   * hoặc:
   * answers: { mild: "Nhẹ", moderate: "Vừa", severe: "Nặng" }
   *
   * Dùng trực tiếp label backend trả về.
   */
  if (entries.length > 1) {
    return entries.map(([key, label], index) => [
      key,
      normalizeAnswerLabel(key, label, index),
    ]);
  }

  /*
   * Case backend trả đúng dạng một prompt duy nhất trong answers.
   * Ta render UI thành Có/Không, nhưng khi submit vẫn map ngược về đúng key gốc.
   */
  if (shouldRenderSingleBackendPromptAsYesNo(entries)) {
    const [sourceKey] = entries[0];

    return [
      [makeBooleanChoiceKey(sourceKey, true), "Có"],
      [makeBooleanChoiceKey(sourceKey, false), "Không"],
    ];
  }

  /*
   * Case chỉ có 1 answer label thật sự. Không tự suy diễn quá mức.
   */
  if (entries.length === 1) {
    return entries.map(([key, label], index) => [
      key,
      normalizeAnswerLabel(key, label, index),
    ]);
  }

  return FALLBACK_ANSWER_OPTIONS;
}

export function getClinicalQuestionAnswerMode(question) {
  return areYesNoOptions(getClinicalQuestionAnswerOptions(question))
    ? "choice"
    : "boolean-list";
}

export function getClinicalQuestionBooleanPrompts(question) {
  const entries = getPayloadAnswerOptions(question);

  return entries.map(([key, label]) => {
    const source = normalizeText(label) || normalizeText(key);
    const translatedLabel = translateClinicalText(source);
    const original = hasVietnameseText(source) || translatedLabel === source ? "" : source;

    return {
      key,
      label: translatedLabel,
      original,
    };
  });
}

export function isClinicalQuestionAnswered(question, selected) {
  const options = getClinicalQuestionAnswerOptions(question);

  if (getClinicalQuestionAnswerMode(question) === "choice") {
    return typeof selected === "string" && options.some(([key]) => key === selected);
  }

  const payloadOptions = getPayloadAnswerOptions(question);

  return (
    isPlainObject(selected)
    && payloadOptions.every(([key]) => typeof selected[key] === "boolean")
  );
}

export function buildClinicalQuestionAnswerItems(questions = [], selectedAnswers = {}) {
  return questions.map((question, index) => {
    const questionId = getQuestionId(question, index);
    const selected = selectedAnswers[questionId];
    const payloadOptions = getPayloadAnswerOptions(question);
    const parsedBooleanChoice = parseBooleanChoiceKey(selected);

    return {
      questionId,
      answers: Object.fromEntries(
        payloadOptions.map(([key, label], optionIndex) => {
          if (parsedBooleanChoice) {
            return [
              key,
              key === parsedBooleanChoice.sourceKey ? parsedBooleanChoice.value : false,
            ];
          }

          if (isPlainObject(selected)) {
            return [key, selected[key] === true];
          }

          if (typeof selected === "boolean") {
            const normalized = `${key} ${label}`;
            const isPositive = looksLikeAffirmative(normalized) || optionIndex === 0;
            const isNegative = looksLikeNegative(normalized) || optionIndex === 1;

            return [key, selected ? isPositive : isNegative];
          }

          return [key, selected === key];
        }),
      ),
    };
  });
}

export const symptomAnalysisApi = {
  analyze(message) {
    return this.suggestClinicalQuestions(message);
  },

  suggestClinicalQuestions(userInput) {
    return apiRequest(ENDPOINTS.SYMPTOM_ANALYSIS.SUGGEST_CLINICAL_QUESTIONS, {
      method: "POST",
      body: {
        userInput: normalizeText(userInput),
      },
      auth: true,
    });
  },

  getQuota() {
    return apiRequest(ENDPOINTS.SYMPTOM_ANALYSIS.QUOTA, { auth: true });
  },

  async submitClinicalQuestionAnswers(sessionId, answers) {
    const response = await apiRequest(ENDPOINTS.SYMPTOM_ANALYSIS.SUBMIT_CLINICAL_QUESTION_ANSWERS, {
      method: "POST",
      body: {
        sessionId: normalizeText(sessionId),
        answers: Array.isArray(answers) ? answers : [],
      },
      auth: true,
    });
    const data = unwrapApiData(response) ?? {};
    const resolvedSessionId = String(data.sessionId ?? sessionId ?? "").trim();
    const analysis = createClinicalMapSnapshot(
      data.analysis ?? data.result ?? null,
      resolvedSessionId,
    );

    clinicalAnalysisCache.clear();
    clearStoredClinicalMapSnapshot();
    if (resolvedSessionId && analysis) {
      clinicalAnalysisCache.set(resolvedSessionId, analysis);
      storeClinicalMapSnapshot(analysis);
    }

    return response;
  },

  getCachedClinicalAnalysis(sessionId) {
    const resolvedSessionId = String(sessionId ?? "").trim();
    const inMemorySnapshot = clinicalAnalysisCache.get(resolvedSessionId);
    if (inMemorySnapshot) return inMemorySnapshot;

    const stored = readStoredClinicalMapSnapshot(resolvedSessionId);

    if (stored.available && !stored.snapshot) {
      clinicalAnalysisCache.clear();
      return null;
    }

    return stored.snapshot ?? null;
  },

  clearCachedClinicalAnalysis() {
    clinicalAnalysisCache.clear();
    clearStoredClinicalMapSnapshot();
  },

  submitDiagnosis(sessionId, answers) {
    return apiRequest(ENDPOINTS.SYMPTOM_ANALYSIS.SUBMIT_DIAGNOSIS, {
      method: "POST",
      body: {
        sessionId: normalizeText(sessionId),
        answers: Array.isArray(answers) ? answers : [],
      },
      auth: true,
    });
  },

  listMySessions(pageNumber = 1, pageSize = 10, sessionType = "") {
    const search = new URLSearchParams({
      PageNumber: String(pageNumber),
      PageSize: String(pageSize),
    });

    if (sessionType) search.set("sessionType", sessionType);

    return apiRequest(`${ENDPOINTS.SYMPTOM_ANALYSIS.MY_SESSIONS}?${search.toString()}`, {
      auth: true,
    });
  },

  async listAllMySessions(sessionType = "", pageSize = 50) {
    const firstResponse = await this.listMySessions(1, pageSize, sessionType);
    const firstPage = unwrapApiData(firstResponse) || {};
    const firstItems = Array.isArray(firstPage.items)
      ? firstPage.items
      : Array.isArray(firstPage.Items)
        ? firstPage.Items
        : Array.isArray(firstPage)
          ? firstPage
          : [];
    const totalPages = Math.max(
      1,
      Number(firstPage.totalPages ?? firstPage.TotalPages) || 1,
    );

    if (totalPages === 1) return firstItems;

    const remainingResponses = await Promise.all(
      Array.from(
        { length: totalPages - 1 },
        (_, index) => this.listMySessions(index + 2, pageSize, sessionType),
      ),
    );
    const allItems = remainingResponses.reduce((items, response) => {
      const page = unwrapApiData(response) || {};
      const pageItems = Array.isArray(page.items)
        ? page.items
        : Array.isArray(page.Items)
          ? page.Items
          : Array.isArray(page)
            ? page
            : [];
      return items.concat(pageItems);
    }, firstItems);
    const seenSessionIds = new Set();

    return allItems.filter((session) => {
      const sessionId = session?.sessionId || session?.id;
      if (!sessionId || !seenSessionIds.has(sessionId)) {
        if (sessionId) seenSessionIds.add(sessionId);
        return true;
      }
      return false;
    });
  },

  get(sessionId) {
    return apiRequest(ENDPOINTS.SYMPTOM_ANALYSIS.BY_SESSION(sessionId), {
      auth: true,
    });
  },

  // Admin-wide session listing (all users), unlike listMySessions above.
  adminSessions(pageNumber = 1, pageSize = 1, { status = "" } = {}) {
    const search = new URLSearchParams({
      PageNumber: String(pageNumber),
      PageSize: String(pageSize),
    });
    if (status) search.set("status", status);
    return apiRequest(`${ENDPOINTS.SYMPTOM_ANALYSIS.SESSIONS}?${search.toString()}`, {
      auth: true,
    });
  },
};
