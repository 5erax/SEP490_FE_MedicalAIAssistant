import { useEffect, useRef, useState } from "react";
import {
  buildClinicalQuestionAnswerItems,
  isClinicalQuestionAnswered,
  symptomAnalysisApi,
} from "../services/api";
import { trackUxEvent } from "../utils/analytics";

const RESUMABLE_STATUSES = new Set(["idle", "questions", "no-questions", "result"]);
let intakeStateCache = null;

function readSymptomPrefill() {
  if (typeof sessionStorage === "undefined") return "";
  const prefill = sessionStorage.getItem("medimate.symptom.prefill") ?? "";
  if (prefill) sessionStorage.removeItem("medimate.symptom.prefill");
  return prefill;
}

function readStoredIntakeState() {
  return intakeStateCache;
}

function writeStoredIntakeState(state) {
  const hasMeaningfulState = Boolean(
    state.input?.trim()
    || state.sessionId
    || state.questions.length
    || state.result
    || state.status !== "idle",
  );

  intakeStateCache = hasMeaningfulState ? state : null;
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

export function useSymptomIntake({ onResult, readQuestionsPayload, readResultPayload }) {
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
  const answeredCount = questions.filter((question) => (
    isClinicalQuestionAnswered(question, answers[question.questionId])
  )).length;
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
      const payload = buildClinicalQuestionAnswerItems(questions, answers);
      const diagnosisResponse = await symptomAnalysisApi.submitDiagnosis(sessionId, payload);
      const diagnosis = readResultPayload(diagnosisResponse) ?? {};
      const diagnoses = Array.isArray(diagnosis.diagnoses)
        ? diagnosis.diagnoses
        : Array.isArray(diagnosis.Diagnoses) ? diagnosis.Diagnoses : [];
      const completedResult = {
        ...diagnosis,
        diagnoses,
        primaryDiagnosis: diagnoses[0] ?? diagnosis.primaryDiagnosis ?? diagnosis.PrimaryDiagnosis ?? null,
        diagnosisModel: diagnosis.model ?? diagnosis.Model ?? null,
      };
      writeStoredIntakeState({
        input,
        sessionId,
        questions,
        answers,
        currentQuestionIndex,
        result: completedResult,
        status: "result",
      });
      setResult(completedResult);
      setStatus("result");
      onResult?.({
        input,
        result: completedResult,
        sessionId,
      });
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
