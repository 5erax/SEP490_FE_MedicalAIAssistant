import { useEffect, useRef, useState } from "react";
import { symptomAnalysisApi } from "../services/api";
import { trackUxEvent } from "../utils/analytics";

function readSymptomPrefill() {
  if (typeof sessionStorage === "undefined") return "";
  const prefill = sessionStorage.getItem("medimate.symptom.prefill") ?? "";
  if (prefill) sessionStorage.removeItem("medimate.symptom.prefill");
  return prefill;
}

export function useSymptomIntake({ readQuestionsPayload, readResultPayload }) {
  const questionsPanelRef = useRef(null);
  const [input, setInput] = useState(readSymptomPrefill);
  const [sessionId, setSessionId] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle");
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

  return {
    answeredCount, answers, canSubmitAnswers, currentQuestionIndex, error, input, loading,
    questions, questionsPanelRef, resetDiagnosis, result, setCurrentQuestionIndex, setInput,
    startDiagnosis, status, submitAnswers, updateAnswer,
  };
}
