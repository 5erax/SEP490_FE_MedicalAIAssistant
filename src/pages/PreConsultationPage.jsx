import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  FileQuestion,
  History,
  LoaderCircle,
  Phone,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  authApi,
  checklistItemsApi,
  consultationSessionsApi,
  medicalDepartmentsApi,
  symptomAnalysisApi,
} from "../services/api";
import { navigate } from "../router/navigation";
import { getServiceCreditErrorPresentation } from "../services/serviceCredit";
import { useServiceCredit } from "../state/useServiceCredit";
import { ASYNC_SESSION_STATUS, normalizeAsyncSessionStatus } from "../utils/asyncSessionStatus";
import { normalizePhoneNumber } from "../utils/profileValidation";
import PreConsultationHistory from "../components/preConsultation/PreConsultationHistory";
import "../styles/pre-consultation.css";

const VIEW_TABS = [
  { id: "new", label: "Tư vấn mới" },
  { id: "history", label: "Lịch sử tư vấn" },
];

const STEPS = [
  { label: "Thông tin", hint: "Buổi khám", icon: Stethoscope },
  { label: "Chuẩn bị", hint: "Checklist", icon: ClipboardCheck },
  { label: "Câu hỏi", hint: "Trao đổi", icon: FileQuestion },
  { label: "Nhắc lịch", hint: "Tùy chọn", icon: BellRing },
  { label: "Tổng kết", hint: "Xác nhận", icon: ShieldCheck },
];

const CATEGORY_LABELS = {
  diagnosis: "Chẩn đoán",
  tests: "Xét nghiệm",
  treatment: "Điều trị",
  lifestyle: "Sinh hoạt",
  followUp: "Theo dõi",
};

const PHONE_PATTERN = /^(?:0\d{8,10}|\+[1-9]\d{8,14})$/;
const SESSION_POLL_INTERVAL_MS = 1000;
const SESSION_POLL_TIMEOUT_MS = 2 * 60 * 1000;

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function unwrapData(response) {
  return response?.data ?? response ?? null;
}

function unwrapList(response) {
  const data = unwrapData(response);
  if (Array.isArray(data)) return data;
  return data?.items ?? data?.Items ?? [];
}

function firstMessage(value) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = firstMessage(item);
      if (message) return message;
    }
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      const message = firstMessage(item);
      if (message) return message;
    }
  }
  return "";
}

function getErrorMessage(error, fallback) {
  const message = firstMessage(error?.payload?.errors)
    || firstMessage(error?.payload?.message)
    || firstMessage(error?.message)
    || fallback;

  if (/không có câu hỏi tư vấn/i.test(message)) {
    return "Chuyên khoa này chưa có bộ câu hỏi tư vấn. Vui lòng chọn chuyên khoa khác hoặc thử lại sau.";
  }

  return message;
}

function formatDateTime(value, fallback = "Chưa cập nhật") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

function toLocalDateTimeMinimum() {
  const date = new Date(Date.now() + 5 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function getSuggestedSessionTitle(session, fallback) {
  return session?.inputText || session?.InputText || session?.userInput || session?.symptoms || fallback;
}

function normalizeSuggestedFacilities(list) {
  return (Array.isArray(list) ? list : [])
    .map((facility) => ({
      facilityId: String(facility?.facilityId ?? facility?.FacilityId ?? facility?.id ?? "").trim(),
      facilityName: facility?.facilityName ?? facility?.FacilityName ?? facility?.name ?? "Cơ sở y tế",
      address: facility?.address ?? facility?.Address ?? "",
    }))
    .filter((facility) => facility.facilityId);
}

function extractSessionRecommendation(response) {
  const data = unwrapData(response) || {};
  const analysis = data.analysis || data.Analysis || data;
  const departmentItems = analysis.recommendedDepartments || analysis.RecommendedDepartments;
  const department = analysis.recommendedDepartment
    || analysis.RecommendedDepartment
    || (Array.isArray(departmentItems) ? departmentItems[0] : null);
  const departmentId = String(department?.departmentId ?? department?.DepartmentId ?? "").trim();
  const symptomText = data.inputText ?? data.InputText ?? "";
  const facilities = normalizeSuggestedFacilities(
    analysis.recommendedFacilities || analysis.RecommendedFacilities,
  );
  return { departmentId, symptomText, facilities };
}

function normalizeQuestions(value) {
  return (Array.isArray(value) ? value : [])
    .map((item, index) => ({
      id: item?.id ?? `${item?.category ?? "question"}-${index}`,
      category: item?.category ?? "",
      text: item?.questionText ?? item?.question ?? item?.text ?? "",
      priority: Number(item?.priority ?? index + 1),
    }))
    .filter((item) => item.text)
    .sort((left, right) => left.priority - right.priority);
}

export default function PreConsultationPage() {
  const { refresh: refreshServiceCredit } = useServiceCredit();
  const [activeView, setActiveView] = useState("new");
  const [step, setStep] = useState(0);
  const [departments, setDepartments] = useState([]);
  const [departmentsStatus, setDepartmentsStatus] = useState("loading");
  const [form, setForm] = useState({ departmentId: "", appointmentTime: "", symptoms: "", facilityId: "", facilityName: "" });
  const [formErrors, setFormErrors] = useState({});
  const [suggestedSessions, setSuggestedSessions] = useState([]);
  const [suggestedSessionsStatus, setSuggestedSessionsStatus] = useState("idle");
  const [suggestedSessionsError, setSuggestedSessionsError] = useState("");
  const [suggestedSessionsOpen, setSuggestedSessionsOpen] = useState(false);
  const [applyingSessionId, setApplyingSessionId] = useState("");
  const [suggestedFacilities, setSuggestedFacilities] = useState([]);
  const [facilityPickerOpen, setFacilityPickerOpen] = useState(false);
  const [autoFilledFromMap, setAutoFilledFromMap] = useState(false);
  const [session, setSession] = useState(null);
  const [checklistItems, setChecklistItems] = useState([]);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [reminderEnabled, setReminderEnabled] = useState(null);
  const [accountPhone, setAccountPhone] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneStatus, setPhoneStatus] = useState("idle");
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [creditFailure, setCreditFailure] = useState(null);
  const [announcement, setAnnouncement] = useState("");
  const [completed, setCompleted] = useState(false);
  const headingRef = useRef(null);
  const errorRef = useRef(null);
  const pollingActiveRef = useRef(true);
  const createInFlightRef = useRef(false);
  const terminalBalanceRefreshRef = useRef("");
  const sessionPollRef = useRef({ sessionId: "", promise: null });
  const viewTabRefs = useRef([]);
  const autoAppliedSessionRef = useRef(false);

  useEffect(() => {
    pollingActiveRef.current = true;
    return () => {
      pollingActiveRef.current = false;
      sessionPollRef.current = { sessionId: "", promise: null };
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadDepartments() {
      try {
        const response = await medicalDepartmentsApi.listAll();
        if (cancelled) return;
        setDepartments(unwrapList(response).filter((item) => item?.id));
        setDepartmentsStatus("ready");
      } catch (loadError) {
        if (cancelled) return;
        setDepartmentsStatus("error");
        setError(getErrorMessage(loadError, "Chưa thể tải danh sách chuyên khoa. Vui lòng thử lại."));
      }
    }
    loadDepartments();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (step > 0) window.requestAnimationFrame(() => headingRef.current?.focus());
  }, [step]);

  useEffect(() => {
    if (error) window.requestAnimationFrame(() => errorRef.current?.focus());
  }, [error]);

  // Coming from the map's "Bạn có muốn được tư vấn trước khi đến khám?" CTA
  // already carries a symptom-analysis sessionId - auto-apply it instead of
  // making the user reopen "Danh sách phiên gợi ý chuyên khoa" and pick it
  // again. Waits for departments to load first so the department-match
  // check inside applySuggestedSession doesn't race against an empty list.
  useEffect(() => {
    if (autoAppliedSessionRef.current || departmentsStatus !== "ready") return;
    const search = new URLSearchParams(window.location.search);
    const sessionId = search.get("sessionId");
    if (sessionId) {
      autoAppliedSessionRef.current = true;
      applySuggestedSession({ sessionId }, { source: "map" });
      return;
    }

    const departmentId = search.get("departmentId") ?? "";
    const symptoms = search.get("symptoms") ?? "";
    if (!departmentId && !symptoms) return;
    autoAppliedSessionRef.current = true;
    queueMicrotask(() => {
      setForm((current) => ({
        ...current,
        departmentId: departments.some((item) => item.id === departmentId) ? departmentId : current.departmentId,
        symptoms: symptoms || current.symptoms,
        facilityId: search.get("facilityId") ?? current.facilityId,
        facilityName: search.get("facilityName") ?? current.facilityName,
      }));
      setAutoFilledFromMap(true);
      setAnnouncement("Đã điền thông tin tư vấn từ cơ sở bạn vừa chọn.");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentsStatus]);

  const selectedDepartment = useMemo(
    () => departments.find((item) => item.id === form.departmentId),
    [departments, form.departmentId],
  );
  const questions = useMemo(
    () => normalizeQuestions(sessionDetail?.questions ?? session?.questions),
    [session, sessionDetail],
  );
  const accountHasPhone = Boolean(normalizePhoneNumber(accountPhone));

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: "" }));
  }

  async function toggleSuggestedSessions() {
    const willOpen = !suggestedSessionsOpen;
    setSuggestedSessionsOpen(willOpen);
    setFacilityPickerOpen(false);
    if (!willOpen || suggestedSessions.length > 0 || suggestedSessionsStatus === "loading") return;

    setSuggestedSessionsStatus("loading");
    setSuggestedSessionsError("");
    try {
      const items = await symptomAnalysisApi.listAllMySessions("department");
      setSuggestedSessions(items);
      setSuggestedSessionsStatus("ready");
    } catch (loadError) {
      setSuggestedSessionsStatus("error");
      setSuggestedSessionsError(getErrorMessage(loadError, "Chưa thể tải danh sách phiên gợi ý chuyên khoa. Vui lòng thử lại."));
    }
  }

  async function applySuggestedSession(sessionItem, { source = "list" } = {}) {
    const sessionId = sessionItem?.sessionId || sessionItem?.id;
    if (!sessionId) return;

    setApplyingSessionId(sessionId);
    setError("");
    try {
      const response = await symptomAnalysisApi.get(sessionId);
      const { departmentId, symptomText, facilities } = extractSessionRecommendation(response);
      const matchedDepartmentId = departmentId && departments.some((item) => item.id === departmentId)
        ? departmentId
        : "";

      setForm((current) => ({
        ...current,
        departmentId: matchedDepartmentId || current.departmentId,
        symptoms: symptomText || current.symptoms,
        facilityId: "",
        facilityName: "",
      }));
      setFormErrors((current) => ({ ...current, departmentId: "", symptoms: "" }));
      setSuggestedFacilities(facilities);
      setFacilityPickerOpen(false);
      setSuggestedSessionsOpen(false);
      setAutoFilledFromMap(source === "map");
      setAnnouncement(
        departmentId && !matchedDepartmentId
          ? "Đã điền triệu chứng từ phiên đã chọn. Chuyên khoa được gợi ý hiện chưa hỗ trợ tư vấn trước khám."
          : "Đã điền thông tin từ phiên gợi ý chuyên khoa đã chọn.",
      );
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Chưa thể tải chi tiết phiên gợi ý. Vui lòng thử lại."));
    } finally {
      setApplyingSessionId("");
    }
  }

  function toggleFacilityPicker() {
    setFacilityPickerOpen((current) => !current);
    setSuggestedSessionsOpen(false);
  }

  function selectSuggestedFacility(facility) {
    setForm((current) => ({ ...current, facilityId: facility.facilityId, facilityName: facility.facilityName }));
    setFormErrors((current) => ({ ...current, facilityId: "" }));
    setFacilityPickerOpen(false);
    setAnnouncement(`Đã chọn cơ sở ${facility.facilityName}.`);
  }

  function clearSuggestedFacility() {
    setForm((current) => ({ ...current, facilityId: "", facilityName: "" }));
  }

  function validateIntake() {
    const errors = {};
    if (!form.departmentId) errors.departmentId = "Vui lòng chọn chuyên khoa cần tư vấn.";
    if (!form.appointmentTime) {
      errors.appointmentTime = "Vui lòng chọn thời gian dự kiến khám.";
    } else if (new Date(form.appointmentTime).getTime() <= Date.now()) {
      errors.appointmentTime = "Thời gian khám phải ở tương lai.";
    }
    if (!form.symptoms.trim()) errors.symptoms = "Vui lòng mô tả triệu chứng hoặc điều bạn muốn hỏi bác sĩ.";
    if (!form.facilityId) errors.facilityId = "Bạn chưa chọn bệnh viện.";
    return errors;
  }

  async function loadChecklist(departmentId) {
    setBusy("checklist");
    setError("");
    try {
      const response = await checklistItemsApi.byDepartment(departmentId);
      const items = unwrapList(response).filter((item) => item?.id && item?.content);
      setChecklistItems(items);
      setAnnouncement(`Đã tải ${items.length} mục cần chuẩn bị.`);
      return true;
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Chưa thể tải checklist chuẩn bị. Phiên tư vấn đã được tạo, bạn có thể thử tải lại."));
      return false;
    } finally {
      setBusy("");
    }
  }

  async function startConsultation(event) {
    event.preventDefault();
    if (createInFlightRef.current) return;
    const nextErrors = validateIntake();
    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      setError(Object.values(nextErrors).join(" "));
      return;
    }

    createInFlightRef.current = true;
    setBusy("generate");
    setError("");
    setCreditFailure(null);
    try {
      const response = await consultationSessionsApi.generateQuestions({
        departmentId: form.departmentId,
        facilityId: form.facilityId || null,
        appointmentTime: new Date(form.appointmentTime).toISOString(),
        symptoms: form.symptoms.trim(),
      });
      const nextSession = unwrapData(response);
      if (!nextSession?.sessionId) throw new Error("Phản hồi chưa có Id phiên tư vấn.");
      setSession(nextSession);
      void refreshServiceCredit({ silent: true });
      terminalBalanceRefreshRef.current = "";
      sessionPollRef.current = {
        sessionId: nextSession.sessionId,
        promise: pollSessionDetail(nextSession.sessionId)
          .then((detail) => ({ detail, error: null }))
          .catch((pollError) => ({ detail: null, error: pollError })),
      };
      setStep(1);
      setAnnouncement("Đã tạo phiên tư vấn. Đang tải checklist chuẩn bị.");
      await loadChecklist(nextSession.departmentId || form.departmentId);
    } catch (submitError) {
      const creditError = getServiceCreditErrorPresentation(submitError);
      setCreditFailure(creditError);
      setError(creditError?.message || getErrorMessage(
        submitError,
        "Chưa thể xác nhận phiên đã được tạo. Hãy kiểm tra lịch sử trước khi thử lại.",
      ));
    } finally {
      createInFlightRef.current = false;
      setBusy("");
    }
  }

  async function pollSessionDetail(sessionId) {
    const deadline = Date.now() + SESSION_POLL_TIMEOUT_MS;

    while (pollingActiveRef.current) {
      const pollStartedAt = window.performance.now();
      const response = await consultationSessionsApi.get(sessionId);
      const detail = unwrapData(response);
      const status = normalizeAsyncSessionStatus(detail?.status);

      if (status === ASYNC_SESSION_STATUS.FAILED) {
        const terminalKey = `${sessionId}:${status}`;
        if (terminalBalanceRefreshRef.current !== terminalKey) {
          terminalBalanceRefreshRef.current = terminalKey;
          void refreshServiceCredit({ silent: true });
        }
        throw new Error("Phiên tư vấn không thể tạo câu hỏi. Vui lòng kiểm tra thông tin và thử lại.");
      }
      if (status === ASYNC_SESSION_STATUS.COMPLETED) {
        const terminalKey = `${sessionId}:${status}`;
        if (terminalBalanceRefreshRef.current !== terminalKey) {
          terminalBalanceRefreshRef.current = terminalKey;
          void refreshServiceCredit({ silent: true });
        }
        return detail;
      }
      if (Date.now() >= deadline) {
        throw new Error("Phiên tư vấn đang mất nhiều thời gian hơn dự kiến. Vui lòng thử lại.");
      }

      const elapsed = window.performance.now() - pollStartedAt;
      await wait(Math.max(0, SESSION_POLL_INTERVAL_MS - elapsed));
    }

    return null;
  }

  async function continueFromChecklist() {
    setBusy("session");
    setError("");
    setAnnouncement("Đang tổng hợp câu hỏi cho buổi khám. Thông tin sẽ tự cập nhật khi sẵn sàng.");
    try {
      const existingPoll = sessionPollRef.current.sessionId === session.sessionId
        ? sessionPollRef.current.promise
        : null;
      const result = existingPoll
        ? await existingPoll
        : await pollSessionDetail(session.sessionId)
          .then((detail) => ({ detail, error: null }))
          .catch((pollError) => ({ detail: null, error: pollError }));
      if (result.error) throw result.error;
      const { detail } = result;
      if (!detail || !pollingActiveRef.current) return;
      setSessionDetail(detail);
      setStep(2);
      setAnnouncement("Đã tải các câu hỏi nên trao đổi với bác sĩ.");
    } catch (loadError) {
      if (!pollingActiveRef.current) return;
      setError(getErrorMessage(loadError, "Chưa thể tải nội dung phiên tư vấn. Vui lòng thử lại."));
    } finally {
      if (pollingActiveRef.current) setBusy("");
    }
  }

  async function chooseReminder(enabled) {
    setReminderEnabled(enabled);
    setError("");
    if (!enabled || phoneStatus === "ready") return;
    setPhoneStatus("loading");
    try {
      const response = await authApi.me();
      const currentPhone = unwrapData(response)?.phoneNumber ?? "";
      setAccountPhone(currentPhone);
      setPhoneNumber(currentPhone);
      setPhoneStatus("ready");
      setAnnouncement(currentPhone
        ? "Đã tìm thấy số điện thoại trong hồ sơ của bạn."
        : "Hồ sơ chưa có số điện thoại. Vui lòng nhập số nhận nhắc lịch.");
    } catch (loadError) {
      setPhoneStatus("ready");
      setError(getErrorMessage(loadError, "Chưa thể kiểm tra số điện thoại trong hồ sơ. Bạn vẫn có thể nhập số nhận nhắc lịch."));
    }
  }

  async function saveReminderAndOpenSummary(event) {
    event.preventDefault();
    if (reminderEnabled === null) {
      setError("Vui lòng chọn có hoặc không nhận nhắc lịch.");
      return;
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (reminderEnabled && !accountHasPhone && !normalizedPhone) {
      setError("Vui lòng nhập số điện thoại nhận nhắc lịch.");
      return;
    }
    if (reminderEnabled && !accountHasPhone && !PHONE_PATTERN.test(normalizedPhone)) {
      setError("Số điện thoại phải có 9-15 chữ số và có thể bắt đầu bằng +.");
      return;
    }

    setBusy("reminder");
    setError("");
    try {
      await consultationSessionsApi.registerReminder(session.sessionId, {
        enableReminder: reminderEnabled,
        phoneNumber: reminderEnabled && !accountHasPhone ? normalizedPhone : null,
      });
      const response = await consultationSessionsApi.getSummary(session.sessionId);
      setSummary(unwrapData(response));
      setStep(4);
      setAnnouncement("Đã lưu lựa chọn nhắc lịch và tạo bản tổng kết.");
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Chưa thể lưu nhắc lịch hoặc tải tổng kết. Vui lòng thử lại."));
    } finally {
      setBusy("");
    }
  }

  async function completeConsultation() {
    setBusy("complete");
    setError("");
    try {
      const response = await consultationSessionsApi.complete(session.sessionId);
      setSummary(unwrapData(response) ?? summary);
      setCompleted(true);
      setAnnouncement("Phiên tư vấn trước khám đã hoàn thành.");
      window.requestAnimationFrame(() => headingRef.current?.focus());
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Chưa thể hoàn thành phiên tư vấn. Vui lòng thử lại."));
    } finally {
      setBusy("");
    }
  }

  const displayedSummary = summary ?? {
    ...sessionDetail,
    ...session,
    departmentName: sessionDetail?.departmentName || session?.departmentName || selectedDepartment?.departmentName,
    checklistItems,
    questions,
    isReminderEnabled: reminderEnabled === true,
  };

  function selectView(view, moveFocus = false) {
    setActiveView(view);
    setError("");
    if (moveFocus) {
      const index = VIEW_TABS.findIndex((tab) => tab.id === view);
      window.requestAnimationFrame(() => viewTabRefs.current[index]?.focus());
    }
  }

  function handleViewTabKeyDown(event, currentIndex) {
    let nextIndex;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % VIEW_TABS.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + VIEW_TABS.length) % VIEW_TABS.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = VIEW_TABS.length - 1;
    else return;

    event.preventDefault();
    selectView(VIEW_TABS[nextIndex].id, true);
  }

  function startNewFromHistory() {
    setStep(0);
    selectView("new", true);
  }

  return (
    <div className="pre-consultation-page">
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>

      <header className="pre-consultation-hero">
        <div>
          <span className="pre-consultation-eyebrow">Chuẩn bị trước buổi khám</span>
          <p className="pre-consultation-title">Tư vấn trước khám</p>
          <p className="pre-consultation-description">Ghi lại thông tin cần thiết, xem danh sách chuẩn bị và tổng hợp câu hỏi dành cho bác sĩ.</p>
        </div>
        <div className="pre-consultation-hero-note">
          <ShieldCheck size={24} aria-hidden="true" />
          <span><strong>5 bước ngắn gọn</strong><small>Bạn được kiểm tra lại thông tin trước khi hoàn thành.</small></span>
        </div>
      </header>

      <div className="pre-consultation-view-tabs" role="tablist" aria-label="Chọn nội dung tư vấn trước khám">
        {VIEW_TABS.map((tab, index) => (
          <button
            key={tab.id}
            ref={(element) => { viewTabRefs.current[index] = element; }}
            id={`pre-consultation-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={activeView === tab.id}
            aria-controls={`pre-consultation-panel-${tab.id}`}
            tabIndex={activeView === tab.id ? 0 : -1}
            onClick={() => selectView(tab.id)}
            onKeyDown={(event) => handleViewTabKeyDown(event, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeView === "new" ? (
        <div id="pre-consultation-panel-new" role="tabpanel" aria-labelledby="pre-consultation-tab-new">

      <ol className="pre-consultation-stepper" aria-label="Tiến trình tư vấn trước khám">
        {STEPS.map((item, index) => {
          const Icon = item.icon;
          const active = index === step;
          const done = index < step || completed;
          return (
            <li key={item.label} className={`${active ? "active" : ""} ${done ? "done" : ""}`} aria-current={active ? "step" : undefined}>
              <span>{done ? <Check size={17} aria-hidden="true" /> : <Icon size={17} aria-hidden="true" />}</span>
              <div><strong>{item.label}</strong><small>{item.hint}</small></div>
            </li>
          );
        })}
      </ol>

      {error && (
        <div className="pre-consultation-error" ref={errorRef} tabIndex="-1" role="alert">
          <strong>Chưa thể tiếp tục</strong>
          <span>{error}</span>
          {creditFailure?.action === "purchase" && (
            <button type="button" onClick={() => navigate("/pricing?view=upgrade&returnTo=%2Fpre-consultation")}>Mua thêm lượt</button>
          )}
          {creditFailure?.action === "retry" && (
            <button type="button" onClick={() => window.location.reload()}>Thử lại</button>
          )}
        </div>
      )}

      <section
        className="pre-consultation-card"
        aria-label="Các bước tư vấn trước khám"
        aria-busy={Boolean(busy)}
      >
        {step === 0 && (
          <form onSubmit={startConsultation} noValidate>
            <section className="pre-consultation-section-head">
              <span>1</span>
              <div>
                <h2 ref={headingRef}>Thông tin buổi khám</h2>
                <p>Chọn chuyên khoa, thời gian dự kiến và mô tả điều bạn muốn bác sĩ lưu ý.</p>
              </div>
            </section>

            <div className="pre-consultation-schedule-row">
              <label className={formErrors.appointmentTime ? "has-error" : ""}>
                <span>Thời gian dự kiến khám (bắt buộc)</span>
                <input
                  type="datetime-local"
                  value={form.appointmentTime}
                  min={toLocalDateTimeMinimum()}
                  onChange={(event) => updateForm("appointmentTime", event.target.value)}
                  required
                  aria-invalid={Boolean(formErrors.appointmentTime)}
                  aria-describedby={formErrors.appointmentTime ? "consultation-time-error" : "consultation-time-hint"}
                />
                <small id="consultation-time-hint">Thời gian này được dùng để thiết lập nhắc lịch ở bước sau.</small>
                {formErrors.appointmentTime && <small id="consultation-time-error">{formErrors.appointmentTime}</small>}
              </label>

              <div className="pre-consultation-suggestion-field">
                <span className="pre-consultation-field-label">Danh sách phiên gợi ý chuyên khoa</span>
                <button type="button" className="ghost" onClick={toggleSuggestedSessions} aria-expanded={suggestedSessionsOpen}>
                  <History size={16} aria-hidden="true" />
                  Danh sách phiên gợi ý chuyên khoa
                  <ChevronDown size={16} aria-hidden="true" className="pre-consultation-ghost-chevron" />
                </button>
                {autoFilledFromMap && (
                  <small className="pre-consultation-autofill-note">
                    Đã tự động điền theo kết quả gợi ý chuyên khoa từ Bản đồ.
                  </small>
                )}
                {suggestedSessionsOpen && (
                  <div className="pre-consultation-suggestion-dropdown" role="listbox" aria-label="Danh sách phiên gợi ý chuyên khoa trước đó">
                    {suggestedSessionsStatus === "loading" && (
                      <div className="pre-consultation-loading compact"><LoaderCircle className="spin" aria-hidden="true" /><strong>Đang tải danh sách phiên…</strong></div>
                    )}
                    {suggestedSessionsStatus === "error" && (
                      <div className="pre-consultation-suggestion-error">
                        <span>{suggestedSessionsError}</span>
                        <button type="button" className="secondary" onClick={toggleSuggestedSessions}>Thử lại</button>
                      </div>
                    )}
                    {suggestedSessionsStatus === "ready" && suggestedSessions.length === 0 && (
                      <div className="pre-consultation-suggestion-empty-state">
                        <p className="pre-consultation-suggestion-empty">Bạn chưa có phiên gợi ý chuyên khoa nào.</p>
                        <a className="secondary" href="/dashboard">
                          Đến trang tư vấn để được gợi ý
                          <ArrowRight size={15} aria-hidden="true" />
                        </a>
                      </div>
                    )}
                    {suggestedSessionsStatus === "ready" && suggestedSessions.length > 0 && (
                      <div className="pre-consultation-suggestion-list">
                        {suggestedSessions.map((sessionItem, index) => {
                          const sessionId = sessionItem.sessionId || sessionItem.id || `session-${index}`;
                          const isApplying = applyingSessionId === sessionId;
                          return (
                            <button
                              type="button"
                              key={sessionId}
                              className="pre-consultation-suggestion-row"
                              disabled={Boolean(applyingSessionId)}
                              onClick={() => applySuggestedSession(sessionItem)}
                            >
                              <span>
                                <strong>{getSuggestedSessionTitle(sessionItem, "Phiên gợi ý chuyên khoa")}</strong>
                                <small>{formatDateTime(sessionItem.createdAt || sessionItem.createdDate)}</small>
                              </span>
                              {isApplying && <LoaderCircle className="spin" size={15} aria-hidden="true" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="pre-consultation-autofill-group">
              <div className={`pre-consultation-suggestion-field ${formErrors.facilityId ? "has-error" : ""}`}>
                <button
                  type="button"
                  className="ghost"
                  onClick={toggleFacilityPicker}
                  aria-expanded={facilityPickerOpen}
                  disabled={suggestedFacilities.length === 0}
                  title={suggestedFacilities.length === 0 ? "Chọn một phiên gợi ý chuyên khoa trước để xem danh sách cơ sở" : undefined}
                >
                  <Building2 size={16} aria-hidden="true" />
                  Chọn bệnh viện gợi ý{suggestedFacilities.length > 0 ? ` (${suggestedFacilities.length})` : ""}
                  <ChevronDown size={16} aria-hidden="true" className="pre-consultation-ghost-chevron" />
                </button>
                {facilityPickerOpen && suggestedFacilities.length > 0 && (
                  <div className="pre-consultation-suggestion-dropdown" role="listbox" aria-label="Danh sách cơ sở y tế được gợi ý trong phiên đã chọn">
                    <div className="pre-consultation-suggestion-list">
                      {suggestedFacilities.map((facility) => (
                        <button
                          type="button"
                          key={facility.facilityId}
                          className={`pre-consultation-suggestion-row ${form.facilityId === facility.facilityId ? "selected" : ""}`}
                          onClick={() => selectSuggestedFacility(facility)}
                        >
                          <span>
                            <strong>{facility.facilityName}</strong>
                            {facility.address && <small>{facility.address}</small>}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {form.facilityName && (
                  <span className="pre-consultation-selected-facility">
                    Cơ sở dự kiến: <strong>{form.facilityName}</strong>
                    <button type="button" onClick={clearSuggestedFacility} aria-label="Bỏ chọn cơ sở đã chọn">×</button>
                  </span>
                )}
                {formErrors.facilityId && <small className="pre-consultation-field-error">{formErrors.facilityId}</small>}
              </div>

              <div className="pre-consultation-form-grid">
                <div className={`pre-consultation-readonly-field ${formErrors.departmentId ? "has-error" : ""}`}>
                  <span>Chuyên khoa</span>
                  <div className="pre-consultation-readonly-box" aria-live="polite">
                    {selectedDepartment?.departmentName
                      || <em>Chọn danh sách phiên gợi ý chuyên khoa để hiển thị</em>}
                  </div>
                  {!formErrors.departmentId && <small>Được điền từ phiên gợi ý chuyên khoa đã chọn.</small>}
                  {formErrors.departmentId && <small>{formErrors.departmentId}</small>}
                </div>
                <div className={`pre-consultation-readonly-field wide ${formErrors.symptoms ? "has-error" : ""}`}>
                  <span>Triệu chứng hoặc điều cần tư vấn</span>
                  <div className="pre-consultation-readonly-box textarea-like" aria-live="polite">
                    {form.symptoms || <em>Chọn danh sách phiên gợi ý chuyên khoa để hiển thị</em>}
                  </div>
                  {formErrors.symptoms && <small>{formErrors.symptoms}</small>}
                </div>
              </div>
            </div>
            <div className="pre-consultation-tip"><span><strong>Gợi ý mô tả</strong>Nêu thời điểm bắt đầu, mức độ và điều khiến triệu chứng tốt hơn hoặc nặng hơn.</span></div>
            <div className="pre-consultation-actions">
              <button className="primary" type="submit" disabled={Boolean(busy) || departmentsStatus !== "ready"}>
                {busy === "generate" && <LoaderCircle className="spin" size={18} aria-hidden="true" />}
                {busy === "generate" ? "Đang tạo phiên…" : "Bắt đầu tư vấn"}
                {busy !== "generate" && <ArrowRight size={18} aria-hidden="true" />}
              </button>
            </div>
          </form>
        )}

        {step === 1 && (
          <section>
            <section className="pre-consultation-section-head">
              <span>2</span>
              <div><h2 ref={headingRef} tabIndex="-1">Danh sách chuẩn bị</h2><p>Đọc các lưu ý dưới đây để chủ động chuẩn bị trước khi đến khám.</p></div>
            </section>
            {busy === "checklist" ? (
              <div className="pre-consultation-loading"><LoaderCircle className="spin" aria-hidden="true" /><strong>Đang tải checklist theo chuyên khoa…</strong></div>
            ) : checklistItems.length > 0 ? (
              <ol className="pre-consultation-checklist">
                {checklistItems.map((item, index) => (
                  <li key={item.id}>
                    <span className="checklist-number">{index + 1}</span>
                    <span className="checklist-copy"><strong>{item.content}</strong><small>{item.isMandatory ? "Cần lưu ý" : "Khuyến nghị"}</small></span>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="pre-consultation-empty"><ClipboardCheck size={26} aria-hidden="true" /><strong>Chuyên khoa này chưa có checklist riêng</strong><p>Bạn vẫn có thể tiếp tục để xem câu hỏi gợi ý cho buổi khám.</p></div>
            )}
            <div className="pre-consultation-actions split">
              <button type="button" className="secondary" onClick={() => setStep(0)}><ArrowLeft size={17} aria-hidden="true" /> Quay lại</button>
              {error && checklistItems.length === 0 ? (
                <button type="button" className="primary" disabled={Boolean(busy)} onClick={() => loadChecklist(session.departmentId || form.departmentId)}>Thử tải lại</button>
              ) : (
                <button type="button" className="primary" disabled={Boolean(busy)} onClick={continueFromChecklist}>
                  {busy === "session" ? <LoaderCircle className="spin" size={17} aria-hidden="true" /> : null}
                  {busy === "session" ? "Đang tổng hợp câu hỏi…" : "Tiếp tục"}
                  {busy !== "session" ? <ArrowRight size={17} aria-hidden="true" /> : null}
                </button>
              )}
            </div>
          </section>
        )}

        {step === 2 && (
          <section>
            <section className="pre-consultation-section-head">
              <span>3</span>
              <div><h2 ref={headingRef} tabIndex="-1">Câu hỏi nên trao đổi với bác sĩ</h2><p>Lưu lại những câu phù hợp. Đây là gợi ý chuẩn bị, không phải chẩn đoán y tế.</p></div>
            </section>
            {questions.length > 0 ? (
              <ol className="pre-consultation-questions">
                {questions.map((question, index) => (
                  <li key={question.id}>
                    <span>{index + 1}</span>
                    <div><small>{CATEGORY_LABELS[question.category] || question.category || "Câu hỏi tư vấn"}</small><strong>{question.text}</strong></div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="pre-consultation-empty"><FileQuestion size={26} aria-hidden="true" /><strong>Chưa có câu hỏi gợi ý</strong><p>Bạn vẫn có thể dùng phần mô tả triệu chứng khi trao đổi trực tiếp với bác sĩ.</p></div>
            )}
            <div className="pre-consultation-tip"><ShieldCheck size={18} aria-hidden="true" /><span>Bạn có thể chụp màn hình hoặc mở lại phần này khi gặp bác sĩ.</span></div>
            <div className="pre-consultation-actions split">
              <button type="button" className="secondary" onClick={() => setStep(1)}><ArrowLeft size={17} aria-hidden="true" /> Quay lại</button>
              <button type="button" className="primary" onClick={() => { setError(""); setStep(3); }}>Thiết lập nhắc lịch <ArrowRight size={17} aria-hidden="true" /></button>
            </div>
          </section>
        )}

        {step === 3 && (
          <form onSubmit={saveReminderAndOpenSummary} noValidate>
            <section className="pre-consultation-section-head">
              <span>4</span>
              <div><h2 ref={headingRef} tabIndex="-1">Bạn có muốn được nhắc lịch?</h2><p>Chúng tôi sẽ dùng số điện thoại trong hồ sơ hoặc số bạn nhập để đăng ký nhắc lịch.</p></div>
            </section>
            <div className="pre-consultation-appointment"><CalendarClock size={22} aria-hidden="true" /><span><small>Lịch khám dự kiến</small><strong>{formatDateTime(sessionDetail?.appointmentTime || session?.appointmentTime)}</strong></span></div>
            <fieldset className="pre-consultation-reminder-options">
              <legend>Chọn một phương án (bắt buộc)</legend>
              <label className={reminderEnabled === true ? "selected" : ""}>
                <input type="radio" name="reminder" checked={reminderEnabled === true} onChange={() => chooseReminder(true)} />
                <BellRing size={20} aria-hidden="true" /><span><strong>Có, nhắc tôi</strong><small>Đăng ký nhận thông báo cho lịch khám này.</small></span>
              </label>
              <label className={reminderEnabled === false ? "selected" : ""}>
                <input type="radio" name="reminder" checked={reminderEnabled === false} onChange={() => chooseReminder(false)} />
                <CheckCircle2 size={20} aria-hidden="true" /><span><strong>Không cần nhắc</strong><small>Tôi sẽ tự theo dõi lịch khám.</small></span>
              </label>
            </fieldset>
            {reminderEnabled && (
              <div className="pre-consultation-phone-panel">
                {phoneStatus === "loading" ? (
                  <div className="pre-consultation-loading compact"><LoaderCircle className="spin" aria-hidden="true" /><strong>Đang kiểm tra số điện thoại trong hồ sơ…</strong></div>
                ) : accountHasPhone ? (
                  <div className="pre-consultation-phone-found"><Phone size={19} aria-hidden="true" /><span><strong>Sử dụng số trong hồ sơ</strong><small>{accountPhone}</small></span><CheckCircle2 size={20} aria-hidden="true" /></div>
                ) : (
                  <label className="pre-consultation-phone-field">
                    <span>Số điện thoại nhận nhắc lịch (bắt buộc)</span>
                    <input type="tel" inputMode="tel" autoComplete="tel" value={phoneNumber} onChange={(event) => { setPhoneNumber(event.target.value); setError(""); }} placeholder="Ví dụ: 0901234567" required />
                    <small>Nhập 9–15 chữ số, có thể bắt đầu bằng +.</small>
                  </label>
                )}
              </div>
            )}
            <div className="pre-consultation-actions split">
              <button type="button" className="secondary" onClick={() => setStep(2)}><ArrowLeft size={17} aria-hidden="true" /> Quay lại</button>
              <button type="submit" className="primary" disabled={Boolean(busy) || (reminderEnabled === true && phoneStatus === "loading")}>{busy === "reminder" ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <Check size={18} aria-hidden="true" />} Xác nhận lựa chọn</button>
            </div>
          </form>
        )}

        {step === 4 && (
          <section>
            <section className="pre-consultation-section-head">
              <span>5</span>
              <div><h2 ref={headingRef} tabIndex="-1">{completed ? "Đã hoàn thành tư vấn trước khám" : "Kiểm tra bản tổng kết"}</h2><p>{completed ? "Thông tin đã được lưu để bạn chuẩn bị cho buổi khám." : "Xem lại nội dung trước khi xác nhận hoàn thành phiên."}</p></div>
            </section>
            {completed && <div className="pre-consultation-success"><CheckCircle2 size={28} aria-hidden="true" /><div><strong>Chuẩn bị đã hoàn tất</strong><p>Bạn có thể mang bản tóm tắt này theo khi đến khám.</p></div></div>}
            <dl className="pre-consultation-summary-grid">
              <div><dt>Chuyên khoa</dt><dd>{displayedSummary?.departmentName || selectedDepartment?.departmentName || "Chưa cập nhật"}</dd></div>
              <div><dt>Thời gian khám</dt><dd>{formatDateTime(displayedSummary?.appointmentTime)}</dd></div>
              <div><dt>Nhắc lịch</dt><dd>{displayedSummary?.isReminderEnabled ? "Đã đăng ký" : "Không đăng ký"}</dd></div>
              <div><dt>Trạng thái</dt><dd>{completed ? "Đã hoàn thành" : "Chờ xác nhận"}</dd></div>
            </dl>
            <section className="pre-consultation-summary-block"><h3>Điều cần tư vấn</h3><p>{displayedSummary?.symptoms || form.symptoms}</p></section>
            <section className="pre-consultation-summary-block">
              <h3>Danh sách chuẩn bị</h3>
              <ul>
                {checklistItems.map((item) => <li key={item.id}><Check size={15} aria-hidden="true" /> {item.content}</li>)}
              </ul>
            </section>
            <section className="pre-consultation-summary-block"><h3>Câu hỏi dành cho bác sĩ</h3><ol>{normalizeQuestions(displayedSummary?.questions ?? questions).map((question) => <li key={question.id}>{question.text}</li>)}</ol></section>
            <div className="pre-consultation-actions split">
              {!completed && <button type="button" className="secondary" onClick={() => setStep(3)}><ArrowLeft size={17} aria-hidden="true" /> Quay lại</button>}
              {!completed && <button type="button" className="primary" disabled={Boolean(busy)} onClick={completeConsultation}>{busy === "complete" ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />} Xác nhận hoàn thành</button>}
              {completed && <a className="primary link-button" href="/dashboard">Về trang tư vấn chuyên khoa <ArrowRight size={17} aria-hidden="true" /></a>}
            </div>
          </section>
        )}
      </section>
        </div>
      ) : (
        <div id="pre-consultation-panel-history" role="tabpanel" aria-labelledby="pre-consultation-tab-history">
          <PreConsultationHistory onStartNew={startNewFromHistory} />
        </div>
      )}
    </div>
  );
}
