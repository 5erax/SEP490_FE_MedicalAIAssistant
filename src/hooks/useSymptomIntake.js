import { useEffect, useRef, useState } from "react";
import {
  clinicalQuestionsApi,
  medicalDepartmentsApi,
  medicalFacilitiesApi,
  symptomAnalysisApi,
} from "../services/api";
import { trackUxEvent } from "../utils/analytics";

function readSymptomPrefill() {
  if (typeof sessionStorage === "undefined") return "";
  const prefill = sessionStorage.getItem("medimate.symptom.prefill") ?? "";
  if (prefill) sessionStorage.removeItem("medimate.symptom.prefill");
  return prefill;
}

export function useSymptomIntake({
  buildFallbackQuestions,
  buildLocalDiagnosisResult,
  looksLikeQuestion,
  normalizeQuestion,
  readCollectionItems,
  readQuestionsPayload,
  readResultPayload,
}) {
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

  const loading = status === "loading-questions" || status === "submitting";
  const answeredCount = Object.values(answers).filter((value) => value === true || value === false).length;
  const canSubmitAnswers = questions.length > 0 && answeredCount === questions.length && status !== "submitting";

  useEffect(() => {
    if (!["questions", "submitting"].includes(status) || questions.length === 0) return;

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

  return {
    answeredCount,
    answers,
    canSubmitAnswers,
    error,
    fallbackNotice,
    input,
    loading,
    questions,
    questionsPanelRef,
    resetDiagnosis,
    result,
    setInput,
    startDiagnosis,
    status,
    submitAnswers,
    updateAnswer,
  };
}
