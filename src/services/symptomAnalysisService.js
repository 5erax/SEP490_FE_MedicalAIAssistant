import { apiRequest } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

const FALLBACK_ANSWER_OPTIONS = [
  ["yes", "Có"],
  ["no", "Không"],
];

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

function hasVietnameseText(value) {
  return /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(String(value ?? ""));
}

function looksLikeAffirmative(value) {
  return /\byes\b|\btrue\b|\bcó\b|\bco\b/.test(normalizeLookup(value));
}

function looksLikeNegative(value) {
  return /\bno\b|\bfalse\b|\bkhông\b|\bkhong\b/.test(normalizeLookup(value));
}

function areYesNoOptions(options) {
  if (options.length !== 2) return false;
  const normalized = options.map(([key, label]) => `${key} ${label}`);
  return normalized.some(looksLikeAffirmative) && normalized.some(looksLikeNegative);
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
    translated = translated.replace(new RegExp(`\\b${english}\\b`, "gi"), vietnamese);
  });

  if (translated !== text) {
    const needsQuestion = /^Bạn\b/i.test(translated) && !/[?？]$/.test(translated);
    return `${translated}${needsQuestion ? " không?" : ""}`;
  }

  return text;
}

export function getClinicalQuestionAnswerOptions(question) {
  const entries = Object.entries(question?.answers ?? {})
    .filter(([key]) => Boolean(normalizeText(key)));

  if (entries.length > 0) {
    return entries.map(([key, label]) => [key, normalizeText(label || key)]);
  }

  return FALLBACK_ANSWER_OPTIONS;
}

export function getClinicalQuestionAnswerMode(question) {
  return areYesNoOptions(getClinicalQuestionAnswerOptions(question)) ? "choice" : "boolean-list";
}

export function getClinicalQuestionBooleanPrompts(question) {
  return getClinicalQuestionAnswerOptions(question).map(([key, label]) => {
    const source = normalizeText(label) || normalizeText(key);
    const original = hasVietnameseText(source) ? "" : source;
    return {
      key,
      label: translateClinicalText(source),
      original,
    };
  });
}

export function isClinicalQuestionAnswered(question, selected) {
  const options = getClinicalQuestionAnswerOptions(question);
  if (getClinicalQuestionAnswerMode(question) === "choice") {
    return typeof selected === "string" && options.some(([key]) => key === selected);
  }

  return Boolean(selected)
    && typeof selected === "object"
    && options.every(([key]) => typeof selected[key] === "boolean");
}

export function buildClinicalQuestionAnswerItems(questions = [], selectedAnswers = {}) {
  return questions.map((question) => {
    const selected = selectedAnswers[question.questionId];
    const options = getClinicalQuestionAnswerOptions(question);

    return {
      questionId: question.questionId,
      answers: Object.fromEntries(options.map(([key, label], index) => {
        if (selected && typeof selected === "object" && !Array.isArray(selected)) {
          return [key, selected[key] === true];
        }

        if (typeof selected === "boolean") {
          const normalized = `${key} ${label}`;
          const isPositive = looksLikeAffirmative(normalized) || index === 0;
          const isNegative = looksLikeNegative(normalized) || index === 1;
          return [key, selected ? isPositive : isNegative];
        }

        return [key, selected === key];
      })),
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
      body: { userInput },
      auth: true,
    });
  },

  submitClinicalQuestionAnswers(sessionId, answers) {
    return apiRequest(ENDPOINTS.SYMPTOM_ANALYSIS.SUBMIT_CLINICAL_QUESTION_ANSWERS, {
      method: "POST",
      body: { sessionId, answers },
      auth: true,
    });
  },

  submitDiagnosis(sessionId, answers) {
    return apiRequest(ENDPOINTS.SYMPTOM_ANALYSIS.SUBMIT_DIAGNOSIS, {
      method: "POST",
      body: { sessionId, answers },
      auth: true,
    });
  },

  listMySessions(pageNumber = 1, pageSize = 10) {
    const search = new URLSearchParams({
      PageNumber: String(pageNumber),
      PageSize: String(pageSize),
    }).toString();
    return apiRequest(`${ENDPOINTS.SYMPTOM_ANALYSIS.MY_SESSIONS}?${search}`, { auth: true });
  },

  get(sessionId) {
    return apiRequest(ENDPOINTS.SYMPTOM_ANALYSIS.BY_SESSION(sessionId), { auth: true });
  },
};
