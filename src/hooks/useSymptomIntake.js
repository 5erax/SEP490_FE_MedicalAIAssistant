import { useEffect, useRef, useState } from "react";
import {
  buildClinicalQuestionAnswerItems,
  getSymptomAnalysisApiMessage,
  getSymptomInputError,
  isClinicalQuestionAnswered,
  symptomAnalysisApi,
} from "../services/api";
import { trackUxEvent } from "../utils/analytics";

const RESUMABLE_STATUSES = new Set(["idle", "questions", "no-questions", "result"]);
const SYMPTOM_PREFILL_KEY = "medimate.symptom.prefill";
const ANALYSIS_POLL_INTERVAL_MS = 300;
const ANALYSIS_POLL_TIMEOUT_MS = 3 * 60 * 1000;
const ANALYSIS_TIMEOUT_MESSAGE = "AI đang xử lý, vui lòng quay lại sau";
let intakeStateCache = null;

function getRecommendationErrorMessage(apiError) {
  return getSymptomAnalysisApiMessage(
    apiError,
    "Không thể gửi câu trả lời. Vui lòng thử lại.",
  );
}

function readSymptomPrefill() {
  if (typeof sessionStorage === "undefined") return "";
  return sessionStorage.getItem(SYMPTOM_PREFILL_KEY) ?? "";
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

function normalizeAnalysisStatus(value) {
  return String(value ?? "").trim().toLowerCase();
}

function readSessionId(value, fallback = "") {
  return String(
    value?.sessionId
    ?? value?.SessionId
    ?? value?.id
    ?? fallback
    ?? "",
  ).trim();
}

function createCompletedResult({ detail, input, sessionId, submitPayload }) {
  const symptomItems = [
    detail?.symptoms,
    detail?.Symptoms,
    detail?.extractedSymptoms,
    detail?.ExtractedSymptoms,
  ].find((items) => Array.isArray(items) && items.length > 0);

  return {
    ...detail,
    inputText: detail?.inputText ?? detail?.InputText ?? detail?.userInput ?? input,
    sessionId,
    diagnoses: symptomItems ?? [],
    symptoms: symptomItems ?? [],
    rawDetail: detail,
    rawRecommendation: submitPayload,
    recommendedDepartment: detail?.recommendedDepartment
      ?? detail?.RecommendedDepartment
      ?? detail?.recommendedDepartments?.[0]
      ?? detail?.RecommendedDepartments?.[0]
      ?? null,
    recommendedFacilities: [],
  };
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
  const pollTimerRef = useRef(null);
  const requestAbortRef = useRef(null);
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

  function stopAnalysisPolling() {
    if (pollTimerRef.current) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    requestAbortRef.current?.abort();
    requestAbortRef.current = null;
  }

  useEffect(() => () => {
    stopAnalysisPolling();
  }, []);

  useEffect(() => {
    if (typeof sessionStorage === "undefined") return;
    if (sessionStorage.getItem(SYMPTOM_PREFILL_KEY) === initialState.input) {
      sessionStorage.removeItem(SYMPTOM_PREFILL_KEY);
    }
  }, [initialState.input]);

  useEffect(() => {
    if (!['questions', 'submitting'].includes(status) || questions.length === 0) return;
    const handle = window.setTimeout(() => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      questionsPanelRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
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
    stopAnalysisPolling();
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
    if (loading) return;
    const validationError = getSymptomInputError(textOverride ?? input);
    if (validationError) {
      setError(validationError);
      setStatus("idle");
      return;
    }
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
      setError(getSymptomAnalysisApiMessage(
        apiError,
        "Không thể tạo câu hỏi làm rõ. Vui lòng thử lại.",
      ));
      setStatus("idle");
    }
  }

  async function submitAnswers(event) {
    event.preventDefault();
    if (!canSubmitAnswers) return;
    stopAnalysisPolling();
    setError("");
    setStatus("submitting");
    try {
      const payload = buildClinicalQuestionAnswerItems(questions, answers);
      const submitController = new AbortController();
      requestAbortRef.current = submitController;
      const recommendationResponse = await symptomAnalysisApi.submitClinicalQuestionAnswers(
        sessionId,
        payload,
        { signal: submitController.signal },
      );
      const submitPayload = readResultPayload(recommendationResponse) ?? {};
      const resolvedSessionId = readSessionId(submitPayload, sessionId);
      if (!resolvedSessionId) throw new Error("Không tìm thấy mã phiên phân tích triệu chứng.");
      setSessionId(resolvedSessionId);

      const startedAt = window.performance.now();
      const pollAnalysis = async () => {
        if (window.performance.now() - startedAt >= ANALYSIS_POLL_TIMEOUT_MS) {
          throw new Error(ANALYSIS_TIMEOUT_MESSAGE);
        }

        const pollController = new AbortController();
        requestAbortRef.current = pollController;

        try {
          const detailResponse = await symptomAnalysisApi.get(resolvedSessionId, {
            signal: pollController.signal,
          });
          const detail = readResultPayload(detailResponse) ?? {};
          const detailStatus = normalizeAnalysisStatus(detail?.status ?? detail?.Status);

          if (detailStatus === "completed") {
            return createCompletedResult({
              detail,
              input,
              sessionId: resolvedSessionId,
              submitPayload,
            });
          }

          if (detailStatus === "failed") {
            const failedError = new Error("Phân tích triệu chứng không hoàn tất. Vui lòng thử lại.");
            failedError.isTerminalAnalysisError = true;
            throw failedError;
          }
        } catch (pollError) {
          if (pollError?.isTerminalAnalysisError) {
            throw pollError;
          }

          if (pollError?.name === "AbortError" || pollError?.cause?.name === "AbortError") {
            throw pollError;
          }

          if ([400, 404].includes(pollError?.status)) {
            throw pollError;
          }

          if (pollError?.status && pollError.status < 500) {
            throw pollError;
          }
        }

        await new Promise((resolve, reject) => {
          const signal = requestAbortRef.current?.signal;
          const handleAbort = () => {
            if (pollTimerRef.current) {
              window.clearTimeout(pollTimerRef.current);
              pollTimerRef.current = null;
            }
            reject(new DOMException("Aborted", "AbortError"));
          };

          if (signal?.aborted) {
            handleAbort();
            return;
          }

          signal?.addEventListener("abort", handleAbort, { once: true });
          pollTimerRef.current = window.setTimeout(() => {
            signal?.removeEventListener("abort", handleAbort);
            resolve();
          }, ANALYSIS_POLL_INTERVAL_MS);
        });
        pollTimerRef.current = null;
        return pollAnalysis();
      };

      const completedResult = await pollAnalysis();
      writeStoredIntakeState({
        input,
        sessionId: resolvedSessionId,
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
        sessionId: resolvedSessionId,
      });
    } catch (apiError) {
      if (apiError?.name === "AbortError" || apiError?.cause?.name === "AbortError") return;
      setError(apiError?.message === ANALYSIS_TIMEOUT_MESSAGE
        ? ANALYSIS_TIMEOUT_MESSAGE
        : getRecommendationErrorMessage(apiError));
      setStatus("questions");
    } finally {
      requestAbortRef.current = null;
    }
  }

  function updateAnswer(questionId, answer) {
    setAnswers((current) => ({ ...current, [questionId]: answer }));
  }

  function updateInput(value) {
    setInput(value);
    if (error) setError("");
  }

  return {
    answeredCount, answers, canSubmitAnswers, currentQuestionIndex, error, input, loading,
    questions, questionsPanelRef, resetDiagnosis, result, sessionId, setCurrentQuestionIndex, setInput: updateInput,
    startDiagnosis, status, submitAnswers, updateAnswer,
  };
}
