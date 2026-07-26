import { Component, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Clock3, LocateFixed, Send, X } from "lucide-react";
import Map, { Marker, NavigationControl, Popup } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { consultationSessionsApi } from "../../services/api";

const FREE_MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

class MapErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

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

function unwrapData(response) {
  return response?.data ?? response?.Data ?? response;
}

function getFacilityConsultationDepartments(facility) {
  if (!facility) return [];

  if (Array.isArray(facility.consultationDepartments)) {
    return facility.consultationDepartments
      .map((department, index) => ({
        id: String(department?.id ?? department?.departmentId ?? "").trim(),
        name: department?.name ?? department?.departmentName ?? `Chuyên khoa ${index + 1}`,
      }))
      .filter((department) => department.id);
  }

  const facilityDepartmentIds = Array.isArray(facility.departmentIds) ? facility.departmentIds : [];
  const facilityDepartmentNames = Array.isArray(facility.departments) ? facility.departments : [];

  return facilityDepartmentIds
    .map((departmentId, index) => {
      const id = String(departmentId ?? "").trim();
      if (!id) return null;
      return {
        id,
        name: facilityDepartmentNames[index] || `Chuyên khoa ${index + 1}`,
      };
    })
    .filter(Boolean);
}

function getSessionId(session) {
  return session?.sessionId ?? session?.id ?? session?.consultationSessionId ?? "";
}

function getSessionTitle(session) {
  return session?.symptoms ?? session?.userInput ?? session?.inputText ?? session?.title ?? "Phiên tư vấn";
}

function getSessionDate(session) {
  const value = session?.createdAt ?? session?.startedAt ?? session?.updatedAt;
  if (!value) return "Chưa cập nhật thời gian";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật thời gian";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getQuestionsFromResponse(response) {
  const data = unwrapData(response);
  if (Array.isArray(data?.questions)) return data.questions;
  if (Array.isArray(data?.Questions)) return data.Questions;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.Items)) return data.Items;
  return [];
}

function getQuestionText(question, index = 0) {
  if (typeof question === "string") return question;
  return question?.questionVi
    ?? question?.QuestionVi
    ?? question?.question
    ?? question?.Question
    ?? question?.content
    ?? question?.Content
    ?? `Câu hỏi ${index + 1}`;
}

function AccessibleFacilityMarker({ facility, selected, onSelect }) {
  return (
    <Marker
      longitude={facility.longitude}
      latitude={facility.latitude}
    >
      <button
        className={`clinic-marker ${selected ? "selected" : ""}`}
        type="button"
        aria-label={`Chọn ${facility.facilityName} trên bản đồ`}
        aria-pressed={selected}
        onClick={(event) => { event.stopPropagation(); onSelect(facility); }}
      >
        <span aria-hidden="true">+</span>
      </button>
    </Marker>
  );
}

function MapConsultationAssistant({ consultationFacility = null }) {
  const normalizedDepartments = useMemo(() => (
    getFacilityConsultationDepartments(consultationFacility)
  ), [consultationFacility]);
  const initialDepartmentId = normalizedDepartments.length === 1 ? normalizedDepartments[0].id : "";
  const [open, setOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("suggest");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(initialDepartmentId);
  const [symptoms, setSymptoms] = useState("");
  const [symptomMessages, setSymptomMessages] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [status, setStatus] = useState("idle");
  const [historyStatus, setHistoryStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const threadRef = useRef(null);

  const canSubmit = Boolean(selectedDepartmentId && symptoms.trim() && status !== "loading");

  useEffect(() => {
    if (!open || activeTab !== "suggest" || !threadRef.current) return;

    threadRef.current.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [activeTab, message, open, questions.length, selectedDepartmentId, status, symptomMessages]);

  async function handleGenerate(event) {
    event.preventDefault();
    if (!canSubmit) return;

    const symptomText = symptoms.trim();
    setStatus("loading");
    setMessage("");
    setQuestions([]);
    setSymptomMessages((current) => [...current, symptomText]);
    setSymptoms("");

    try {
      const response = await consultationSessionsApi.generateQuestions(selectedDepartmentId, symptomText);
      setQuestions(getQuestionsFromResponse(response));
      setMessage("MediMate đã tạo gợi ý câu hỏi cho chuyên khoa đã chọn.");
    } catch (error) {
      setMessage(error.message || "Không thể tạo gợi ý câu hỏi lúc này.");
    } finally {
      setStatus("idle");
    }
  }

  async function loadHistory() {
    setHistoryStatus("loading");
    setMessage("");

    try {
      const historyItems = await consultationSessionsApi.listAllMySessions();
      setSessions(historyItems);
    } catch (error) {
      setMessage(error.message || "Không thể tải lịch sử gợi ý.");
    } finally {
      setHistoryStatus("idle");
    }
  }

  async function handleTabChange(tab) {
    setActiveTab(tab);
    if (tab === "history" && sessions.length === 0 && historyStatus !== "loading") {
      await loadHistory();
    }
  }

  async function handleViewSession(session) {
    const sessionId = getSessionId(session);
    if (!sessionId) return;

    setHistoryStatus("loading");
    setSelectedSession(null);
    setMessage("");

    try {
      const response = await consultationSessionsApi.get(sessionId);
      setSelectedSession(unwrapData(response));
    } catch (error) {
      setMessage(error.message || "Không thể xem chi tiết phiên gợi ý.");
    } finally {
      setHistoryStatus("idle");
    }
  }

  if (!consultationFacility) return null;

  return (
    <>
      {open && (
        <aside className="map-ai-panel" aria-label="AI hỗ trợ trước khám">
          <header className="map-ai-header">
            <div>
              <span><Bot size={17} /></span>
              <div>
                <strong>MediMate AI</strong>
                <small>Hỗ trợ trước khi khám</small>
              </div>
            </div>
            <div className="map-ai-header-actions">
              <button
                type="button"
                className={activeTab === "history" ? "active" : ""}
                onClick={() => handleTabChange(activeTab === "history" ? "suggest" : "history")}
                aria-label="Xem lịch sử gợi ý"
              >
                <Clock3 size={16} />
              </button>
              <button type="button" onClick={() => setOpen(false)} aria-label="Đóng AI hỗ trợ"><X size={16} /></button>
            </div>
          </header>

          {activeTab === "suggest" ? (
            <form className="map-ai-chat" onSubmit={handleGenerate}>
              <div className="map-ai-thread" ref={threadRef} aria-live="polite">
                <article className="map-ai-message-bubble bot">
                  <span><Bot size={15} /></span>
                  <p>Xin chào. Mình sẽ giúp bạn chuẩn bị trước khi khám.</p>
                </article>

                <article className="map-ai-message-bubble bot has-control">
                  <span><Bot size={15} /></span>
                  <div>
                    <p>Bạn muốn khám chuyên khoa nào?</p>
                    <label className="map-ai-select-control">
                      <span>Chuyên khoa tại {consultationFacility.facilityName}</span>
                      <select
                        aria-label="Chọn chuyên khoa"
                        value={selectedDepartmentId}
                        onChange={(event) => setSelectedDepartmentId(event.target.value)}
                        disabled={normalizedDepartments.length === 0}
                      >
                        <option value="">
                          {normalizedDepartments.length ? "Chọn chuyên khoa" : "Cơ sở chưa có chuyên khoa"}
                        </option>
                        {normalizedDepartments.map((department) => (
                          <option key={department.id} value={department.id}>{department.name}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </article>

                {selectedDepartmentId && (
                  <>
                    <article className="map-ai-message-bubble bot">
                      <span><Bot size={15} /></span>
                      <p>Bạn đang gặp triệu chứng gì?</p>
                    </article>
                    {symptomMessages.map((symptomMessage, index) => (
                      <article className="map-ai-message-bubble user symptom" key={`${symptomMessage}-${index}`}>
                        <p>{symptomMessage}</p>
                      </article>
                    ))}
                    {status === "loading" && (
                      <article className="map-ai-message-bubble bot loading" role="status" aria-live="polite">
                        <span><Bot size={15} /></span>
                        <p>
                          Đang phân tích triệu chứng
                          <i aria-hidden="true" />
                        </p>
                      </article>
                    )}
                  </>
                )}

                {questions.length > 0 && (
                  <>
                    <article className="map-ai-message-bubble bot">
                      <span><Bot size={15} /></span>
                      <p>Dưới đây là những câu hỏi bạn nên trao đổi với bác sĩ.</p>
                    </article>

                    <div className="map-ai-question-stack">
                      {questions.slice(0, 5).map((question, index) => (
                        <article
                          className="map-ai-question-card"
                          key={`${getQuestionText(question, index)}-${index}`}
                          style={{ "--question-index": index }}
                        >
                          <span>?</span>
                          <p>{getQuestionText(question, index)}</p>
                        </article>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {selectedDepartmentId && (
                <div className="map-ai-composer">
                  <label className="map-ai-composer-field">
                    <span>Triệu chứng</span>
                    <input
                      aria-label="Triệu chứng của bạn"
                      value={symptoms}
                      onChange={(event) => setSymptoms(event.target.value)}
                      placeholder="Nhập triệu chứng của bạn..."
                    />
                  </label>
                  <button type="submit" disabled={!canSubmit} aria-label="Tạo gợi ý câu hỏi">
                    <Send size={16} />
                  </button>
                </div>
              )}
            </form>
          ) : (
            <div className="map-ai-history" aria-live="polite">
              <div className="map-ai-history-title">
                <Clock3 size={16} />
                <div>
                  <strong>Lịch sử gợi ý</strong>
                  <small>Tất cả phiên hỗ trợ trước khám của bạn</small>
                </div>
                <span>{sessions.length}</span>
              </div>
              {historyStatus === "loading" && <p>Đang tải lịch sử...</p>}
              {historyStatus !== "loading" && sessions.length === 0 && <p>Chưa có lịch sử gợi ý.</p>}
              <div className="map-ai-history-list">
                {sessions.map((session) => {
                  const sessionId = getSessionId(session);
                  const isSelected = sessionId && sessionId === getSessionId(selectedSession);
                  return (
                    <article className={isSelected ? "active" : ""} key={sessionId || getSessionTitle(session)}>
                      <div>
                        <Clock3 size={15} />
                        <span>
                          <strong>{getSessionTitle(session)}</strong>
                          <small>{getSessionDate(session)}</small>
                        </span>
                      </div>
                      <button type="button" onClick={() => handleViewSession(session)}>Xem</button>
                    </article>
                  );
                })}
              </div>
              {selectedSession && (
                <div className="map-ai-session-detail">
                  <strong>Chi tiết phiên gợi ý</strong>
                  <p>{getSessionTitle(selectedSession)}</p>
                  {getQuestionsFromResponse(selectedSession).length > 0 && (
                    <ul>
                      {getQuestionsFromResponse(selectedSession).slice(0, 5).map((question, index) => (
                        <li key={`${getQuestionText(question, index)}-${index}`}>
                          {getQuestionText(question, index)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {message && <p className="map-ai-message">{message}</p>}
        </aside>
      )}

      {!open && <span className="map-ai-hint">AI hỗ trợ trước khám</span>}
      <button
        className="map-ai-launcher"
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? "Thu gọn AI hỗ trợ trước khám" : "Mở AI hỗ trợ trước khám"}
        aria-expanded={open}
      >
        <span className="map-ai-bot-icon">AI</span>
      </button>
    </>
  );
}

export default function FacilityMap({
  chatContext,
  consultationFacility = null,
  showConsultationAssistant = true,
  facilities,
  hidePopup = false,
  locationError,
  mapRef,
  mapRenderKey,
  mapStatus,
  selectedFacility,
  recommendationContext,
  userLocation,
  viewState,
  onError,
  onLocate,
  onMapLoad,
  onRetry,
  onSelect,
  onViewStateChange,
  onViewDetail,
}) {
  const popupActionRef = useRef(null);
  const primaryDiagnosis = recommendationContext?.primaryDiagnosis;
  const recommendedDepartment = recommendationContext?.recommendedDepartment;
  const diagnoses = Array.isArray(recommendationContext?.diagnoses)
    ? recommendationContext.diagnoses
    : [];
  const diagnosisRows = diagnoses
    .map((diagnosis, index) => ({
      rank: getDiagnosisRank(diagnosis, index),
      name: getDiagnosisName(diagnosis),
      icd10Code: getDiagnosisIcd(diagnosis),
      paGivenB: getDiagnosisPAGivenB(diagnosis),
      probability: confidencePercent(getDiagnosisPAGivenB(diagnosis)),
    }))
    .sort((left, right) => left.rank - right.rank);
  const recommendedFacility = Array.isArray(recommendationContext?.recommendedFacilities)
    ? recommendationContext.recommendedFacilities.find((facility) => (
      String(facility.facilityId ?? facility.id) === String(selectedFacility?.facilityId)
    ))
    : null;
  const confidence = confidencePercent(getDiagnosisPAGivenB(primaryDiagnosis) || recommendedDepartment?.confidenceScore);

  useEffect(() => {
    if (!selectedFacility?.hasValidCoordinates) return undefined;
    const focusId = window.setTimeout(() => popupActionRef.current?.focus(), 0);
    return () => window.clearTimeout(focusId);
  }, [selectedFacility?.facilityId, selectedFacility?.hasValidCoordinates]);

  return (
    <section className="map-panel" aria-labelledby="interactive-map-title" aria-describedby="interactive-map-description">
      <h2 className="sr-only" id="interactive-map-title">Bản đồ tương tác các cơ sở y tế</h2>
      <p className="sr-only" id="interactive-map-description">
        Bản đồ hiển thị các cơ sở có tọa độ hợp lệ. Danh sách cơ sở bên cạnh cung cấp cùng thông tin ở dạng văn bản.
      </p>
      {chatContext && (
        <aside className="map-chat-context" aria-label="Khung chat gợi ý chuyên khoa">
          <strong>Gợi ý chuyên khoa qua triệu chứng</strong>
          <p>{chatContext.symptom}</p>
          <span>{chatContext.answer}</span>
        </aside>
      )}

      {mapStatus !== "error" && (
        <MapErrorBoundary key={mapRenderKey} onError={onError}>
          <Map
            ref={mapRef}
            mapStyle={FREE_MAP_STYLE}
            {...viewState}
            onLoad={onMapLoad}
            onError={onError}
            onMove={(event) => onViewStateChange(event.viewState)}
            style={{ width: "100%", height: "100%" }}
          >
            <NavigationControl position="top-right" />
            {userLocation && (
              <Marker longitude={userLocation.lng} latitude={userLocation.lat}>
                <div className="user-marker" role="img" aria-label="Vị trí hiện tại của bạn"><span /></div>
              </Marker>
            )}
            {facilities.map((facility) => (
              <AccessibleFacilityMarker
                key={facility.facilityId}
                facility={facility}
                selected={selectedFacility?.facilityId === facility.facilityId}
                onSelect={onSelect}
              />
            ))}
            {selectedFacility?.hasValidCoordinates && !hidePopup && (
              <Popup
                longitude={selectedFacility.longitude}
                latitude={selectedFacility.latitude}
                onClose={() => onSelect(null)}
                closeOnClick={false}
                offset={28}
                className="clinic-popup"
              >
                <div
                  className="popup-card"
                  role="dialog"
                  aria-label={`Thông tin ${selectedFacility.facilityName}`}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") onSelect(null);
                  }}
                >
                  <strong>{selectedFacility.facilityName}</strong>
                  <span>{selectedFacility.address}</span>
                  {recommendationContext && (
                    <div className="popup-ai-summary">
                      <small>Chẩn đoán lâm sàng</small>
                      {primaryDiagnosis && <b>{getDiagnosisName(primaryDiagnosis)}</b>}
                      {Number.isFinite(confidence) && confidence > 0 && <em>{confidence}% phù hợp</em>}
                      {getDiagnosisReasoning(primaryDiagnosis) && <p>{getDiagnosisReasoning(primaryDiagnosis)}</p>}
                      {diagnosisRows.length > 0 && (
                        <>
                          <div className="popup-diagnosis-chart">
                            {diagnosisRows.slice(0, 4).map((row) => (
                              <div key={`${row.rank}-${row.name}`}>
                                <span>#{row.rank}</span>
                                <strong>{row.name}</strong>
                                <i style={{ width: `${row.probability}%` }} />
                                <em>{row.probability}%</em>
                              </div>
                            ))}
                          </div>
                          <table className="popup-diagnosis-table">
                            <caption className="sr-only">Xác suất các chẩn đoán lâm sàng</caption>
                            <thead>
                              <tr>
                                <th scope="col">Bệnh</th>
                                <th scope="col">PAGivenB</th>
                              </tr>
                            </thead>
                            <tbody>
                              {diagnosisRows.slice(0, 4).map((row) => (
                                <tr key={`${row.rank}-${row.name}-popup-table`}>
                                  <td>{row.name}</td>
                                  <td>{row.paGivenB.toFixed(4)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </>
                      )}
                      {recommendedFacility?.reason && <p>{recommendedFacility.reason}</p>}
                    </div>
                  )}
                  <span>{selectedFacility.phoneLabel}</span>
                  {selectedFacility.website && <a href={selectedFacility.website} target="_blank" rel="noreferrer">Website cơ sở</a>}
                  <button ref={popupActionRef} type="button" onClick={() => onViewDetail(selectedFacility)}>Xem chi tiết</button>
                </div>
              </Popup>
            )}
          </Map>
        </MapErrorBoundary>
      )}

      {mapStatus === "loading" && (
        <div className="map-status-overlay" role="status" aria-live="polite" aria-busy="true">
          <span className="map-loading-spinner" aria-hidden="true" />
          <strong>Đang tải bản đồ…</strong>
          <p>Danh sách cơ sở vẫn có thể sử dụng trong lúc chờ.</p>
        </div>
      )}
      {mapStatus === "error" && (
        <div className="map-fallback" role="status" aria-live="polite">
          <span aria-hidden="true">!</span>
          <strong>Không thể hiển thị bản đồ lúc này</strong>
          <p>Bạn vẫn có thể xem, tìm kiếm và chọn cơ sở trong danh sách.</p>
          <div className="map-fallback-actions">
            <button type="button" onClick={onRetry}>Thử tải lại bản đồ</button>
            <a href="#facility-list">Đến danh sách cơ sở</a>
          </div>
        </div>
      )}
      {mapStatus === "ready" && (
        <button className="locate-button" type="button" onClick={onLocate} aria-label="Định vị tôi">
          <LocateFixed size={18} aria-hidden="true" />
        </button>
      )}
      {showConsultationAssistant && (
        <MapConsultationAssistant
          key={consultationFacility?.facilityId || "map-consultation"}
          consultationFacility={consultationFacility}
        />
      )}
      {locationError && <div className="location-error">{locationError}</div>}
    </section>
  );
}
