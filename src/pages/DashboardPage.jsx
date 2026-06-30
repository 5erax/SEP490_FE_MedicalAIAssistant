import { useEffect, useRef, useState } from "react";
import { ClipboardPlus, MapPin, Send, UserRound } from "lucide-react";
import { Alert, Button, Field, Textarea } from "../components/ui";
import { navigate } from "../router/navigation";
import {
  getClinicalQuestionAnswerMode,
  getClinicalQuestionAnswerOptions,
  getClinicalQuestionBooleanPrompts,
  getStoredAuth,
  isClinicalQuestionAnswered,
} from "../services/api";
import { useSymptomIntake } from "../hooks/useSymptomIntake";
import "../styles/dashboard.css";

/* Backend owns clinical question selection and diagnosis generation. */
function confidencePercent(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric <= 1 ? numeric * 100 : numeric)));
}

function getDiagnosisField(diagnosis, camelKey, pascalKey, fallback = "") {
  return diagnosis?.[camelKey] ?? diagnosis?.[pascalKey] ?? fallback;
}

function getDiagnosisName(diagnosis) {
  return getDiagnosisField(diagnosis, "diseaseName", "DiseaseName", "Chưa xác định");
}

function getDiagnosisRank(diagnosis, index = 0) {
  return Number(getDiagnosisField(diagnosis, "rank", "Rank", index + 1)) || index + 1;
}

function getDiagnosisIcd(diagnosis) {
  return getDiagnosisField(diagnosis, "icd10Code", "Icd10Code", "");
}

function getDiagnosisReasoning(diagnosis) {
  return getDiagnosisField(diagnosis, "clinicalReasoning", "ClinicalReasoning", "");
}

function getDiagnosisPAGivenB(diagnosis) {
  return Number(getDiagnosisField(diagnosis, "paGivenB", "PAGivenB", 0)) || 0;
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

function getFacilityId(facility) {
  return facility?.facilityId || facility?.id || "";
}

function saveMapRecommendationContext(context) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem("medimate.map.recommendation", JSON.stringify(context));
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

function readProfilePromptDismissed() {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem("medimate.profile.prompt.dismissed") === "true";
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export default function DashboardPage() {
  const auth = getStoredAuth();
  const routedResultRef = useRef("");
  const {
    answeredCount,
    answers,
    canSubmitAnswers,
    currentQuestionIndex,
    error,
    input,
    loading,
    questions,
    questionsPanelRef,
    resetDiagnosis,
    result,
    sessionId,
    setCurrentQuestionIndex,
    setInput,
    startDiagnosis,
    status,
    submitAnswers,
    updateAnswer,
  } = useSymptomIntake({
    readQuestionsPayload,
    readResultPayload,
  });

  const [profilePromptVisible, setProfilePromptVisible] = useState(
    auth?.isProfileCompleted === false && !readProfilePromptDismissed(),
  );
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle");

  const primaryDiagnosis = result?.primaryDiagnosis;
  const diagnoses = result?.diagnoses ?? [];
  const diagnosisRows = diagnoses
    .map((diagnosis, index) => ({
      diagnosis,
      rank: getDiagnosisRank(diagnosis, index),
      name: getDiagnosisName(diagnosis),
      icd10Code: getDiagnosisIcd(diagnosis),
      paGivenB: getDiagnosisPAGivenB(diagnosis),
      probability: confidencePercent(getDiagnosisPAGivenB(diagnosis)),
    }))
    .sort((left, right) => left.rank - right.rank);
  const recommendedDepartment = result?.recommendedDepartment;
  const sortedFacilities = [...(result?.recommendedFacilities ?? [])]
    .sort((left, right) => scoreFacility(right, recommendedDepartment, userLocation) - scoreFacility(left, recommendedDepartment, userLocation));

  const activeStep = status === "result"
    ? 2
    : ["questions", "submitting"].includes(status) ? 1 : 0;

  const currentQuestion = questions[currentQuestionIndex] ?? null;
  const currentQuestionId = currentQuestion?.questionId ?? "";
  const currentAnswer = currentQuestionId ? answers[currentQuestionId] : undefined;
  const currentAnswerMode = currentQuestion ? getClinicalQuestionAnswerMode(currentQuestion) : "choice";
  const currentAnswerOptions = currentQuestion ? getClinicalQuestionAnswerOptions(currentQuestion) : [];
  const currentBooleanPrompts = currentQuestion ? getClinicalQuestionBooleanPrompts(currentQuestion) : [];
  const currentQuestionAnswered = currentQuestion
    ? isClinicalQuestionAnswered(currentQuestion, currentAnswer)
    : false;
  const questionProgressPercent = questions.length
    ? Math.round((answeredCount / questions.length) * 100)
    : 0;
  const showIntakeForm = ["idle", "loading-questions", "no-questions"].includes(status);
  const showQuestionFlow = ["questions", "submitting"].includes(status) && currentQuestion;

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

  function openFacilities() {
    const topFacility = sortedFacilities[0] ?? null;
    const params = new URLSearchParams();
    const facilityId = getFacilityId(topFacility);
    const search = topFacility?.facilityName || recommendedDepartment?.departmentName || getDiagnosisName(primaryDiagnosis) || input;

    params.set("source", "clinical");
    if (facilityId) params.set("facilityId", facilityId);
    if (recommendedDepartment?.departmentId) params.set("departmentId", recommendedDepartment.departmentId);
    if (search) params.set("search", search);
    if (sessionId) params.set("sessionId", sessionId);

    saveMapRecommendationContext({
      symptom: input,
      sessionId,
      primaryDiagnosis,
      diagnoses,
      recommendedDepartment,
      recommendedFacilities: sortedFacilities,
      selectedFacilityId: facilityId,
    });

    const query = params.toString();
    navigate(query ? `/map?${query}` : "/map");
  }

  useEffect(() => {
    if (status !== "result" || !result) return;
    const routeKey = `${sessionId || "no-session"}:${getDiagnosisName(primaryDiagnosis) || recommendedDepartment?.departmentName || "result"}`;
    if (routedResultRef.current === routeKey) return;
    routedResultRef.current = routeKey;
    openFacilities();
  }, [result, status]); // eslint-disable-line react-hooks/exhaustive-deps

  function goToPreviousQuestion() {
    setCurrentQuestionIndex((index) => Math.max(0, index - 1));
  }

  function goToNextQuestion() {
    setCurrentQuestionIndex((index) => Math.min(questions.length - 1, index + 1));
  }

  function updateBooleanAnswer(answerKey, value) {
    updateAnswer(currentQuestionId, {
      ...(isPlainObject(currentAnswer) ? currentAnswer : {}),
      [answerKey]: value,
    });
  }

  return (
    <main className="specialty-page">
      <section className="studio-center" aria-labelledby="specialty-intake-title">
        <header className="studio-heading">
          <span className="studio-mark" aria-hidden="true"><ClipboardPlus size={24} /></span>
          <div>
            <p className="studio-eyebrow">Tư vấn chuyên khoa</p>
            <h2 id="specialty-intake-title">Gợi ý chuyên khoa qua triệu chứng</h2>
            <p>Ghi lại triệu chứng như khi trao đổi ở quầy tiếp nhận. MediMate sẽ hỏi thêm yes/no trước khi đưa ra nhận định tham khảo và cơ sở phù hợp.</p>
          </div>
        </header>

        <ol className="studio-flow" aria-label="Tiến trình tư vấn">
          {["Mô tả", "Làm rõ", "Kết quả"].map((label, index) => (
            <li
              className={index === activeStep ? "active" : index < activeStep ? "complete" : ""}
              key={label}
              aria-current={index === activeStep ? "step" : undefined}
            >
              <span>{index + 1}</span>
              <strong>{label}</strong>
            </li>
          ))}
        </ol>

        {showIntakeForm && profilePromptVisible && (
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

        {showIntakeForm && (
          <form className="studio-chatbox" onSubmit={(event) => {
            event.preventDefault();
            startDiagnosis();
          }}>
            <div className="studio-form-heading">
              <div>
                <span>Bước 1</span>
                <h3>Mô tả điều bạn đang cảm nhận</h3>
              </div>
              <div className="clinical-strip" aria-label="Phạm vi tư vấn">
                <span>Tiếp nhận ban đầu</span>
                <span>Không thay thế chẩn đoán</span>
              </div>
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
                  : <><strong>Sẵn sàng.</strong> Trả lời Yes/No</>}
              </span>
              <Button
                className="studio-submit-icon"
                size="lg"
                loading={loading}
                loadingLabel="Đang tạo câu hỏi..."
                disabled={!input.trim()}
                type="submit"
              >
                <Send size={18} />
                <span className="sr-only">Gợi ý chuyên khoa</span>
              </Button>
            </div>
          </form>
        )}

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

        {showQuestionFlow && (
          <form
            className="studio-diagnosis-panel studio-question-focus specialty-question-flow"
            onSubmit={submitAnswers}
            ref={questionsPanelRef}
            tabIndex={-1}
            aria-live="polite"
          >
            <div className="specialty-question-topline">
              <span>Câu {currentQuestionIndex + 1}/{questions.length}</span>
              <strong>{questionProgressPercent}%</strong>
            </div>

            <div className="studio-answer-progress specialty-question-progress" aria-label={`Đã trả lời ${answeredCount} trên ${questions.length} câu hỏi`}>
              <span className="studio-answer-track">
                <i style={{ width: `${questionProgressPercent}%` }} />
              </span>
            </div>

            <fieldset className="specialty-question-card">
              <legend>{currentQuestion.questionText}</legend>

              {currentAnswerMode === "boolean-list" ? (
                <div className="specialty-answer-list" aria-label={`Trả lời câu hỏi ${currentQuestionIndex + 1}`}>
                  {currentBooleanPrompts.map((prompt) => {
                    const selectedValue = isPlainObject(currentAnswer)
                      ? currentAnswer[prompt.key]
                      : undefined;

                    return (
                      <section className="specialty-answer-row" key={prompt.key}>
                        <strong>{prompt.label}</strong>
                        <div className="specialty-answer-grid" role="group" aria-label={`Trả lời ${prompt.label}`}>
                          <button
                            className={selectedValue === true ? "selected yes" : ""}
                            type="button"
                            aria-pressed={selectedValue === true}
                            onClick={() => updateBooleanAnswer(prompt.key, true)}
                          >
                            Có
                          </button>
                          <button
                            className={selectedValue === false ? "selected no" : ""}
                            type="button"
                            aria-pressed={selectedValue === false}
                            onClick={() => updateBooleanAnswer(prompt.key, false)}
                          >
                            Không
                          </button>
                        </div>
                      </section>
                    );
                  })}
                </div>
              ) : (
                <div className="specialty-answer-grid specialty-answer-choice-grid" role="radiogroup" aria-label={`Trả lời câu hỏi ${currentQuestionIndex + 1}`}>
                  {currentAnswerOptions.map(([answerKey, label], answerIndex) => (
                    <button
                      className={[
                        currentAnswer === answerKey ? "selected" : "",
                        answerIndex === 0 ? "yes" : "",
                        answerIndex === 1 ? "no" : "",
                      ].filter(Boolean).join(" ")}
                      type="button"
                      key={answerKey}
                      aria-pressed={currentAnswer === answerKey}
                      onClick={() => updateAnswer(currentQuestionId, answerKey)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </fieldset>

            <div className="studio-question-actions specialty-question-actions">
              <Button
                type="button"
                tone="secondary"
                disabled={currentQuestionIndex === 0 || status === "submitting"}
                onClick={goToPreviousQuestion}
              >
                Câu trước
              </Button>

              {currentQuestionIndex < questions.length - 1 ? (
                <Button
                  type="button"
                  disabled={!currentQuestionAnswered || status === "submitting"}
                  onClick={goToNextQuestion}
                >
                  Câu tiếp theo
                </Button>
              ) : (
                <Button
                  size="lg"
                  type="submit"
                  loading={status === "submitting"}
                  loadingLabel="Đang phân tích..."
                  disabled={!canSubmitAnswers}
                >
                  Xem gợi ý
                </Button>
              )}
            </div>
          </form>
        )}

        {status === "result" && (
          <section className="studio-result-panel" aria-label="Nhận định tham khảo và gợi ý bệnh viện">
            <article className="studio-result-card primary">
              <span>Chẩn đoán lâm sàng</span>
              <h2>{getDiagnosisName(primaryDiagnosis)}</h2>
              {getDiagnosisReasoning(primaryDiagnosis) && <p>{getDiagnosisReasoning(primaryDiagnosis)}</p>}
              <div className="studio-result-meta">
                {getDiagnosisIcd(primaryDiagnosis) && <small>ICD-10: {getDiagnosisIcd(primaryDiagnosis)}</small>}
                {primaryDiagnosis && <strong>{confidencePercent(getDiagnosisPAGivenB(primaryDiagnosis))}% phù hợp</strong>}
              </div>
              <small>Kết quả này không thay thế bác sĩ và cần được kiểm tra bởi chuyên gia y tế.</small>
            </article>

            {diagnosisRows.length > 0 && (
              <article className="studio-result-card diagnosis-analytics">
                <span>Thứ tự chẩn đoán</span>
                <h2>Xếp hạng bệnh theo PAGivenB</h2>
                <div className="diagnosis-bar-chart" aria-label="Biểu đồ cột thứ tự bệnh">
                  {diagnosisRows.map((row) => (
                    <div className="diagnosis-bar-column" key={`${row.rank}-${row.name}`}>
                      <em>{row.probability}%</em>
                      <div className="diagnosis-column-track">
                        <i style={{ height: `${Math.max(6, row.probability)}%` }} />
                      </div>
                      <strong>#{row.rank}</strong>
                      <span>{row.name}</span>
                      {row.icd10Code && <small>ICD-10: {row.icd10Code}</small>}
                    </div>
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
      </section>
    </main>
  );
}
