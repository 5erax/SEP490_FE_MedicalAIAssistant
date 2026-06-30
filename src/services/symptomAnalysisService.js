import { apiRequest } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

const FALLBACK_ANSWER_OPTIONS = [
  ["yes", "Có"],
  ["no", "Không"],
];

const BOOLEAN_CHOICE_PREFIX = "__medimate_boolean_choice__";

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
    .map(([key, label]) => [normalizeText(key), normalizeText(label || key)])
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

  submitClinicalQuestionAnswers(sessionId, answers) {
    return apiRequest(ENDPOINTS.SYMPTOM_ANALYSIS.SUBMIT_CLINICAL_QUESTION_ANSWERS, {
      method: "POST",
      body: {
        sessionId,
        answers: Array.isArray(answers) ? answers : [],
      },
      auth: true,
    });
  },

  submitDiagnosis(sessionId, answers) {
    return apiRequest(ENDPOINTS.SYMPTOM_ANALYSIS.SUBMIT_DIAGNOSIS, {
      method: "POST",
      body: {
        sessionId,
        answers: Array.isArray(answers) ? answers : [],
      },
      auth: true,
    });
  },

  listMySessions(pageNumber = 1, pageSize = 10) {
    const search = new URLSearchParams({
      PageNumber: String(pageNumber),
      PageSize: String(pageSize),
    }).toString();

    return apiRequest(`${ENDPOINTS.SYMPTOM_ANALYSIS.MY_SESSIONS}?${search}`, {
      auth: true,
    });
  },

  get(sessionId) {
    return apiRequest(ENDPOINTS.SYMPTOM_ANALYSIS.BY_SESSION(sessionId), {
      auth: true,
    });
  },
};