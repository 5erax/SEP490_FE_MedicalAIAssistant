import { useEffect, useRef, useState } from "react";
import { symptomAnalysisApi } from "../services/api";
import { trackUxEvent } from "../utils/analytics";

const INTAKE_STATE_KEY = "medimate.specialty.intake";
const RESUMABLE_STATUSES = new Set(["idle", "questions", "no-questions", "result"]);

function readSymptomPrefill() {
  if (typeof sessionStorage === "undefined") return "";
  const prefill = sessionStorage.getItem("medimate.symptom.prefill") ?? "";
  if (prefill) sessionStorage.removeItem("medimate.symptom.prefill");
  return prefill;
}

function readStoredIntakeState() {
  if (typeof sessionStorage === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(INTAKE_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStoredIntakeState(state) {
  if (typeof sessionStorage === "undefined") return;

  const hasMeaningfulState = Boolean(
    state.input?.trim()
    || state.sessionId
    || state.questions.length
    || state.result
    || state.status !== "idle",
  );

  try {
    if (!hasMeaningfulState) {
      sessionStorage.removeItem(INTAKE_STATE_KEY);
      return;
    }

    sessionStorage.setItem(INTAKE_STATE_KEY, JSON.stringify(state));
  } catch {
    // Keep the in-memory flow usable if the browser blocks or fills sessionStorage.
  }
}

function normalizeInitialState(storedState, prefill) {
  const questions = Array.isArray(storedState?.questions) ? storedState.questions : [];
  const result = storedState?.result ?? null;
  const status = RESUMABLE_STATUSES.has(storedState?.status) ? storedState.status : "idle";
  const currentQuestionIndex = Math.max(
    0,
    Math.min(Number(storedState?.currentQuestionIndex) || 0, Math.max(questions.length - 1, 0)),
  );

  return {
    input: prefill || storedState?.input || "",
    sessionId: prefill ? "" : storedState?.sessionId || "",
    questions: prefill ? [] : questions,
    answers: prefill || !storedState?.answers || typeof storedState.answers !== "object" ? {} : storedState.answers,
    currentQuestionIndex: prefill ? 0 : currentQuestionIndex,
    result: prefill ? null : result,
    status: prefill || (status === "result" && !result) || (status === "questions" && questions.length === 0)
      ? "idle"
      : status,
  };
}

function readInitialIntakeState() {
  const prefill = readSymptomPrefill();
  return normalizeInitialState(prefill ? null : readStoredIntakeState(), prefill);
}

export function useSymptomIntake({ readQuestionsPayload, readResultPayload }) {
  const questionsPanelRef = useRef(null);
  const [initialState] = useState(readInitialIntakeState);
  const [input, setInput] = useState(initialState.input);
  const [sessionId, setSessionId] = useState(initialState.sessionId);
  const [questions, setQuestions] = useState(initialState.questions);
  const [answers, setAnswers] = useState(initialState.answers);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialState.currentQuestionIndex);
  const [result, setResult] = useState(initialState.result);
  const [status, setStatus] = useState(initialState.status);
  const [error, setError] = useState("");

  const loading = status === "loading-questions" || status === "submitting";
  const answeredCount = Object.values(answers).filter((value) => value === true || value === false).length;
  const canSubmitAnswers = questions.length > 0 && answeredCount === questions.length && status !== "submitting";

  useEffect(() => {
    if (!['questions', 'submitting'].includes(status) || questions.length === 0) return;
    const handle = window.setTimeout(() => {
      questionsPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      questionsPanelRef.current?.focus({ preventScroll: true });
    }, 80);
    return () => window.clearTimeout(handle);
  }, [questions.length, status]);

  useEffect(() => {
    writeStoredIntakeState({
      input,
      sessionId,
      questions,
      answers,
      currentQuestionIndex,
      result,
      status,
    });
  }, [answers, currentQuestionIndex, input, questions, result, sessionId, status]);

  function resetDiagnosis({ clearInput = false } = {}) {
    setError("");
    setResult(null);
    setQuestions([]);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setSessionId("");
    setStatus("idle");
    if (clearInput) setInput("");
  }

  async function startDiagnosis(textOverride) {
    const symptom = (textOverride ?? input).trim();
    if (!symptom || loading) return;
    setError("");
    setResult(null);
    setQuestions([]);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setSessionId("");
    setStatus("loading-questions");
    trackUxEvent("specialty_intake_submitted", { source: textOverride ? "quick_prompt" : "manual" });

    try {
      const response = await symptomAnalysisApi.suggestClinicalQuestions(symptom);
      const data = readQuestionsPayload(response);
      setSessionId(data.sessionId);
      setQuestions(data.questions);
      setStatus(data.questions.length ? "questions" : "no-questions");
    } catch (apiError) {
      setError(apiError.message || "Không thể tạo câu hỏi làm rõ. Vui lòng thử lại.");
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
      const [recommendationResponse, diagnosisResponse] = await Promise.all([
        symptomAnalysisApi.submitClinicalQuestionAnswers(sessionId, payload),
        symptomAnalysisApi.submitDiagnosis(sessionId, payload),
      ]);
      const recommendation = readResultPayload(recommendationResponse) ?? {};
      const diagnosis = readResultPayload(diagnosisResponse) ?? {};
      const diagnoses = Array.isArray(diagnosis.diagnoses) ? diagnosis.diagnoses : [];
      setResult({
        ...recommendation,
        diagnoses,
        primaryDiagnosis: diagnoses[0] ?? recommendation.primaryDiagnosis ?? null,
        diagnosisModel: diagnosis.model ?? null,
      });
      setStatus("result");
    } catch (apiError) {
      setError(apiError.message || "Không thể gửi câu trả lời. Vui lòng thử lại.");
      setStatus("questions");
    }
  }

  function updateAnswer(questionId, answer) {
    setAnswers((current) => ({ ...current, [questionId]: answer }));
  }

  return {
    answeredCount, answers, canSubmitAnswers, currentQuestionIndex, error, input, loading,
    questions, questionsPanelRef, resetDiagnosis, result, sessionId, setCurrentQuestionIndex, setInput,
    startDiagnosis, status, submitAnswers, updateAnswer,
  };
}
