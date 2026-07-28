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

function MapConsultationAssistant({
  accessLocked = false,
  clinicalMode = false,
  consultationFacility = null,
  onLogin,
  recommendedDepartment = null,
}) {
  const normalizedDepartments = useMemo(() => (
    getFacilityConsultationDepartments(consultationFacility)
  ), [consultationFacility]);
  const recommendedDepartmentId = String(recommendedDepartment?.departmentId ?? "").trim();
  const matchedRecommendedDepartment = normalizedDepartments.find((department) => (
    department.id === recommendedDepartmentId
  ));
  const initialDepartmentId = matchedRecommendedDepartment?.id
    ?? (normalizedDepartments.length === 1 ? normalizedDepartments[0].id : "");
  const [open, setOpen] = useState(!clinicalMode);
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
  const closeButtonRef = useRef(null);
  const launcherRef = useRef(null);
  const previousOpenRef = useRef(open);

  const canSubmit = Boolean(selectedDepartmentId && symptoms.trim() && status !== "loading");

  useEffect(() => {
    if (!open || activeTab !== "suggest" || !threadRef.current) return;

    threadRef.current.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, [activeTab, message, open, questions.length, selectedDepartmentId, status, symptomMessages]);

  useEffect(() => {
    const wasOpen = previousOpenRef.current;
    previousOpenRef.current = open;
    if (!open || wasOpen) return undefined;

    const focusId = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => window.cancelAnimationFrame(focusId);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const handleEscape = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      window.requestAnimationFrame(() => launcherRef.current?.focus());
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  function closeAssistant() {
    setOpen(false);
    window.requestAnimationFrame(() => launcherRef.current?.focus());
  }

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

  if (!consultationFacility && !clinicalMode) return null;

  return (
    <>
      {open && (
        <aside id="map-ai-panel" className="map-ai-panel" aria-label="AI hỗ trợ trước khám">
          <header className="map-ai-header">
            <div>
              <span><Bot size={17} aria-hidden="true" /></span>
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
                aria-label={activeTab === "history" ? "Quay lại gợi ý câu hỏi" : "Xem lịch sử gợi ý"}
              >
                <Clock3 size={16} aria-hidden="true" />
              </button>
              <button ref={closeButtonRef} type="button" onClick={closeAssistant} aria-label="Đóng AI hỗ trợ"><X size={16} aria-hidden="true" /></button>
            </div>
          </header>
          <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {status === "loading"
              ? "Đang chuẩn bị câu hỏi."
              : message || (questions.length ? `Đã chuẩn bị ${questions.length} câu hỏi.` : "")}
          </p>

          {accessLocked ? (
            <div className="map-ai-unavailable" role="status">
              <strong>Đăng nhập để tiếp tục</strong>
              <p>Kết quả gợi ý chỉ được hiển thị cho tài khoản đã tạo phiên.</p>
              <button type="button" onClick={onLogin}>Đăng nhập</button>
            </div>
          ) : !consultationFacility ? (
            <div className="map-ai-unavailable" role="status">
              <strong>Chưa có cơ sở phù hợp</strong>
              <p>AI hỗ trợ theo bệnh viện sẽ sẵn sàng khi hệ thống xác định được cơ sở và chuyên khoa hợp lệ.</p>
            </div>
          ) : activeTab === "suggest" ? (
            <form className="map-ai-chat" onSubmit={handleGenerate}>
              <div className="map-ai-thread" ref={threadRef}>
                <article className="map-ai-message-bubble bot">
                  <span><Bot size={15} /></span>
                  <p><strong>Mình có thể giúp gì cho bạn hôm nay?</strong></p>
                </article>

                <article className="map-ai-message-bubble bot">
                  <span><Bot size={15} /></span>
                  <p>Hãy mô tả triệu chứng hoặc tình trạng sức khỏe của bạn.</p>
                </article>

                <article className="map-ai-message-bubble bot">
                  <span><Bot size={15} /></span>
                  <p>Mình sẽ chuẩn bị danh sách câu hỏi để bạn trao đổi với bác sĩ.</p>
                </article>

                {normalizedDepartments.length > 1 && (
                  <label className="map-ai-department-field">
                    <span>Chuyên khoa tại {consultationFacility.facilityName}</span>
                    <select
                      value={selectedDepartmentId}
                      onChange={(event) => setSelectedDepartmentId(event.target.value)}
                    >
                      <option value="">Chọn chuyên khoa</option>
                      {normalizedDepartments.map((department) => (
                        <option key={department.id} value={department.id}>{department.name}</option>
                      ))}
                    </select>
                  </label>
                )}
                {normalizedDepartments.length === 1 && (
                  <p className="map-ai-department-summary">
                    Chuyên khoa: <strong>{normalizedDepartments[0].name}</strong>
                  </p>
                )}

                {selectedDepartmentId && (
                  <>
                    {symptomMessages.map((symptomMessage, index) => (
                      <article className="map-ai-message-bubble user symptom" key={`${symptomMessage}-${index}`}>
                        <p>{symptomMessage}</p>
                      </article>
                    ))}
                    {status === "loading" && (
                      <article className="map-ai-message-bubble bot loading" role="status" aria-live="polite">
                        <span><Bot size={15} /></span>
                        <p>
                          Đang chuẩn bị câu hỏi
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
                      name="symptoms"
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
        ref={launcherRef}
        className="map-ai-launcher"
        type="button"
        onClick={() => {
          if (open) {
            closeAssistant();
          } else {
            setOpen(true);
          }
        }}
        aria-label={open ? "Thu gọn AI hỗ trợ trước khám" : "Mở AI hỗ trợ trước khám"}
        aria-expanded={open}
        aria-controls="map-ai-panel"
      >
        <span className="map-ai-bot-icon">AI</span>
      </button>
    </>
  );
}

export default function FacilityMap({
  assistantAccessLocked = false,
  chatContext,
  clinicalNotice = "",
  clinicalStatus = "idle",
  consultationFacility = null,
  isClinicalFlow = false,
  onAssistantLogin,
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
  const recommendedDepartment = recommendationContext?.recommendedDepartment;
  const confidence = confidencePercent(recommendedDepartment?.confidenceScore);

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
      {isClinicalFlow && (
        <aside className="map-clinical-summary" aria-label="Kết quả gợi ý chuyên khoa" aria-live="polite">
          {clinicalStatus === "loading" && (
            <div className="map-clinical-summary-state" role="status">
              <span className="map-loading-spinner" aria-hidden="true" />
              <strong>Đang khôi phục gợi ý chuyên khoa…</strong>
            </div>
          )}
          {clinicalStatus !== "loading" && clinicalStatus !== "ready" && clinicalNotice && (
            <div className="map-clinical-summary-state">
              <strong>Chưa thể hiển thị gợi ý chuyên khoa</strong>
              <p>{clinicalNotice}</p>
            </div>
          )}
          {clinicalStatus === "ready" && (
            <>
              <header>
                <small>Chuyên khoa được gợi ý</small>
                <strong>{recommendedDepartment?.departmentName || "Chưa xác định chuyên khoa"}</strong>
              </header>
              <div className="map-clinical-summary-body">
                {selectedFacility && (
                  <div>
                    <small>Cơ sở được đề xuất</small>
                    <strong>{selectedFacility.facilityName}</strong>
                    <span>{selectedFacility.address}</span>
                  </div>
                )}
                {Number.isFinite(confidence) && confidence > 0 && (
                  <span className="map-clinical-confidence">{confidence}% phù hợp</span>
                )}
              </div>
              {clinicalNotice && <p className="map-clinical-availability" role="status">{clinicalNotice}</p>}
              {recommendedDepartment?.isEmergencySuggested && (
                <p className="map-clinical-urgent">Hệ thống ghi nhận dấu hiệu cần được ưu tiên đánh giá y tế.</p>
              )}
              <p className="map-clinical-disclaimer">
                Gợi ý giúp định hướng nơi khám. Cơ sở y tế sẽ xác nhận chuyên khoa phù hợp sau khi đánh giá trực tiếp.
              </p>
              {selectedFacility && (
                <button type="button" onClick={() => onViewDetail(selectedFacility)}>Xem chi tiết</button>
              )}
            </>
          )}
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
                      <small>Chuyên khoa được gợi ý</small>
                      {recommendedDepartment?.departmentName && (
                        <b>{recommendedDepartment.departmentName}</b>
                      )}
                      {Number.isFinite(confidence) && confidence > 0 && <em>{confidence}% phù hợp</em>}
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
          key={[
            consultationFacility?.facilityId || "map-consultation",
            recommendedDepartment?.departmentId || "no-recommendation",
          ].join(":")}
          accessLocked={assistantAccessLocked}
          clinicalMode={isClinicalFlow}
          consultationFacility={consultationFacility}
          onLogin={onAssistantLogin}
          recommendedDepartment={recommendedDepartment}
        />
      )}
      {locationError && <div className="location-error">{locationError}</div>}
    </section>
  );
}
