import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileQuestion,
  LoaderCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  authApi,
  checklistItemsApi,
  consultationSessionsApi,
  medicalDepartmentsApi,
} from "../services/api";
import { normalizePhoneNumber } from "../utils/profileValidation";
import "../styles/pre-consultation.css";

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
  return firstMessage(error?.payload?.errors)
    || firstMessage(error?.payload?.message)
    || firstMessage(error?.message)
    || fallback;
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
  const [step, setStep] = useState(0);
  const [departments, setDepartments] = useState([]);
  const [departmentsStatus, setDepartmentsStatus] = useState("loading");
  const [form, setForm] = useState({ departmentId: "", appointmentTime: "", symptoms: "" });
  const [formErrors, setFormErrors] = useState({});
  const [session, setSession] = useState(null);
  const [checklistItems, setChecklistItems] = useState([]);
  const [checkedItems, setCheckedItems] = useState(() => new Set());
  const [sessionDetail, setSessionDetail] = useState(null);
  const [reminderEnabled, setReminderEnabled] = useState(null);
  const [accountPhone, setAccountPhone] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneStatus, setPhoneStatus] = useState("idle");
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [completed, setCompleted] = useState(false);
  const headingRef = useRef(null);
  const errorRef = useRef(null);

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

  const selectedDepartment = useMemo(
    () => departments.find((item) => item.id === form.departmentId),
    [departments, form.departmentId],
  );
  const mandatoryItems = useMemo(
    () => checklistItems.filter((item) => item.isMandatory),
    [checklistItems],
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

  function validateIntake() {
    const errors = {};
    if (!form.departmentId) errors.departmentId = "Vui lòng chọn chuyên khoa cần tư vấn.";
    if (!form.appointmentTime) {
      errors.appointmentTime = "Vui lòng chọn thời gian dự kiến khám.";
    } else if (new Date(form.appointmentTime).getTime() <= Date.now()) {
      errors.appointmentTime = "Thời gian khám phải ở tương lai.";
    }
    if (!form.symptoms.trim()) errors.symptoms = "Vui lòng mô tả triệu chứng hoặc điều bạn muốn hỏi bác sĩ.";
    return errors;
  }

  async function loadChecklist(departmentId) {
    setBusy("checklist");
    setError("");
    try {
      const response = await checklistItemsApi.byDepartment(departmentId);
      const items = unwrapList(response).filter((item) => item?.id && item?.content);
      setChecklistItems(items);
      setCheckedItems(new Set());
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
    const nextErrors = validateIntake();
    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      setError(Object.values(nextErrors).join(" "));
      return;
    }

    setBusy("generate");
    setError("");
    try {
      const response = await consultationSessionsApi.generateQuestions({
        departmentId: form.departmentId,
        facilityId: null,
        appointmentTime: new Date(form.appointmentTime).toISOString(),
        symptoms: form.symptoms.trim(),
      });
      const nextSession = unwrapData(response);
      if (!nextSession?.sessionId) throw new Error("Phản hồi chưa có Id phiên tư vấn.");
      setSession(nextSession);
      setStep(1);
      setAnnouncement("Đã tạo phiên tư vấn. Đang tải checklist chuẩn bị.");
      await loadChecklist(nextSession.departmentId || form.departmentId);
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Chưa thể tạo phiên tư vấn trước khám. Vui lòng thử lại."));
    } finally {
      setBusy("");
    }
  }

  function toggleChecklistItem(itemId) {
    setCheckedItems((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
    setError("");
  }

  async function continueFromChecklist() {
    const missingRequired = mandatoryItems.filter((item) => !checkedItems.has(item.id));
    if (missingRequired.length > 0) {
      setError(`Bạn cần xác nhận ${missingRequired.length} mục bắt buộc trước khi tiếp tục.`);
      return;
    }
    setBusy("session");
    setError("");
    try {
      const response = await consultationSessionsApi.get(session.sessionId);
      setSessionDetail(unwrapData(response));
      setStep(2);
      setAnnouncement("Đã tải các câu hỏi nên trao đổi với bác sĩ.");
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Chưa thể tải nội dung phiên tư vấn. Vui lòng thử lại."));
    } finally {
      setBusy("");
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

  return (
    <div className="pre-consultation-page">
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>

      <header className="pre-consultation-hero">
        <div>
          <span className="pre-consultation-eyebrow"><Sparkles size={15} aria-hidden="true" /> Chuẩn bị chủ động</span>
          <p className="pre-consultation-title">Tư vấn trước khám</p>
          <p>Gom thông tin quan trọng, chuẩn bị câu hỏi và thiết lập nhắc lịch trong một luồng rõ ràng.</p>
        </div>
        <div className="pre-consultation-hero-note">
          <ShieldCheck size={24} aria-hidden="true" />
          <span><strong>Khoảng 3–5 phút</strong><small>Bạn có thể kiểm tra lại trước khi hoàn thành.</small></span>
        </div>
      </header>

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
            <div className="pre-consultation-form-grid">
              <label className={formErrors.departmentId ? "has-error" : ""}>
                <span>Chuyên khoa (bắt buộc)</span>
                <select
                  value={form.departmentId}
                  onChange={(event) => updateForm("departmentId", event.target.value)}
                  required
                  disabled={departmentsStatus === "loading"}
                  aria-invalid={Boolean(formErrors.departmentId)}
                  aria-describedby={formErrors.departmentId ? "consultation-department-error" : undefined}
                >
                  <option value="">{departmentsStatus === "loading" ? "Đang tải chuyên khoa…" : "Chọn chuyên khoa"}</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>{department.departmentName || department.name || "Chuyên khoa chưa đặt tên"}</option>
                  ))}
                </select>
                {formErrors.departmentId && <small id="consultation-department-error">{formErrors.departmentId}</small>}
              </label>
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
              <label className={`wide ${formErrors.symptoms ? "has-error" : ""}`}>
                <span>Triệu chứng hoặc điều cần tư vấn (bắt buộc)</span>
                <textarea
                  value={form.symptoms}
                  onChange={(event) => updateForm("symptoms", event.target.value)}
                  maxLength={2000}
                  required
                  placeholder="Ví dụ: Tôi ho kéo dài 3 ngày, sốt nhẹ và muốn biết cần chuẩn bị xét nghiệm gì…"
                  aria-invalid={Boolean(formErrors.symptoms)}
                  aria-describedby={formErrors.symptoms ? "consultation-symptoms-error" : "consultation-symptoms-hint"}
                />
                <span className="pre-consultation-field-meta" id="consultation-symptoms-hint">Mô tả ngắn gọn, không cần tự chẩn đoán. {form.symptoms.length}/2.000 ký tự</span>
                {formErrors.symptoms && <small id="consultation-symptoms-error">{formErrors.symptoms}</small>}
              </label>
            </div>
            <div className="pre-consultation-tip"><Sparkles size={18} aria-hidden="true" /><span><strong>Mẹo:</strong> Nêu thời điểm bắt đầu, mức độ và điều khiến triệu chứng tốt hơn hoặc nặng hơn.</span></div>
            <div className="pre-consultation-actions">
              <button className="primary" type="submit" disabled={Boolean(busy) || departmentsStatus !== "ready"}>
                {busy === "generate" ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}
                {busy === "generate" ? "Đang tạo phiên…" : "Bắt đầu tư vấn"}
              </button>
            </div>
          </form>
        )}

        {step === 1 && (
          <section>
            <section className="pre-consultation-section-head">
              <span>2</span>
              <div><h2 ref={headingRef} tabIndex="-1">Checklist chuẩn bị</h2><p>Đánh dấu các mục bạn đã chuẩn bị. Mục “Bắt buộc” cần hoàn tất trước khi tiếp tục.</p></div>
            </section>
            {busy === "checklist" ? (
              <div className="pre-consultation-loading"><LoaderCircle className="spin" aria-hidden="true" /><strong>Đang tải checklist theo chuyên khoa…</strong></div>
            ) : checklistItems.length > 0 ? (
              <fieldset className="pre-consultation-checklist">
                <legend className="sr-only">Các mục cần chuẩn bị trước khám</legend>
                {checklistItems.map((item) => (
                  <label key={item.id}>
                    <input type="checkbox" checked={checkedItems.has(item.id)} onChange={() => toggleChecklistItem(item.id)} />
                    <span className="checkmark"><Check size={16} aria-hidden="true" /></span>
                    <span className="checklist-copy"><strong>{item.content}</strong><small>{item.isMandatory ? "Bắt buộc" : "Khuyến nghị"}</small></span>
                  </label>
                ))}
              </fieldset>
            ) : (
              <div className="pre-consultation-empty"><ClipboardCheck size={26} aria-hidden="true" /><strong>Chuyên khoa này chưa có checklist riêng</strong><p>Bạn vẫn có thể tiếp tục để xem câu hỏi gợi ý cho buổi khám.</p></div>
            )}
            <div className="pre-consultation-actions split">
              <button type="button" className="secondary" onClick={() => setStep(0)}><ArrowLeft size={17} aria-hidden="true" /> Quay lại</button>
              {error && checklistItems.length === 0 ? (
                <button type="button" className="primary" disabled={Boolean(busy)} onClick={() => loadChecklist(session.departmentId || form.departmentId)}>Thử tải lại</button>
              ) : (
                <button type="button" className="primary" disabled={Boolean(busy)} onClick={continueFromChecklist}>Tiếp tục <ArrowRight size={17} aria-hidden="true" /></button>
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
              <h3>Các mục đã chuẩn bị</h3>
              <ul>
                {checklistItems
                  .filter((item) => checkedItems.has(item.id))
                  .map((item) => <li key={item.id}><Check size={15} aria-hidden="true" /> {item.content}</li>)}
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
  );
}
