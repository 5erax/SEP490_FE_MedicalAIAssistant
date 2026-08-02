import { useEffect, useState } from "react";
import { Clock3, Pencil, Pill, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { useFeedback } from "../components/feedback/feedbackContext";
import { userMedicationsApi } from "../services/api";
import {
  Alert,
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  TextInput,
  Textarea,
} from "../components/ui";
import "../styles/user-medications.css";

const MAX_REMINDER_TIMES = 12;
const MAX_MEDICINE_NAME_LENGTH = 256;
const MAX_DOSAGE_LENGTH = 1000;

const DISCLAIMER_TEXT =
  "Đây là lịch nhắc dựa trên thông tin bạn đã cung cấp. Hệ thống không kê đơn hoặc xác minh chỉ định dùng thuốc.";

function emptyForm() {
  return {
    medicineName: "",
    dosageInstruction: "",
    startDate: "",
    endDate: "",
    isReminderEnabled: false,
    reminderTimes: [],
  };
}

function toFormState(medication) {
  return {
    medicineName: medication.medicineName ?? "",
    dosageInstruction: medication.dosageInstruction ?? "",
    startDate: medication.startDate ?? "",
    endDate: medication.endDate ?? "",
    isReminderEnabled: Boolean(medication.isReminderEnabled),
    reminderTimes: (medication.reminderTimes ?? [])
      .map((entry) => (entry?.timeOfDay ? String(entry.timeOfDay).slice(0, 5) : ""))
      .filter(Boolean),
  };
}

function normalizeTimePayload(value) {
  return value ? `${value}:00` : "";
}

function validateForm(form) {
  const errors = {};
  const name = form.medicineName.trim();

  if (!name) {
    errors.medicineName = "Tên thuốc là bắt buộc.";
  } else if (name.length > MAX_MEDICINE_NAME_LENGTH) {
    errors.medicineName = `Tên thuốc tối đa ${MAX_MEDICINE_NAME_LENGTH} ký tự.`;
  }

  if (form.dosageInstruction.length > MAX_DOSAGE_LENGTH) {
    errors.dosageInstruction = `Hướng dẫn dùng thuốc tối đa ${MAX_DOSAGE_LENGTH} ký tự.`;
  }

  if (form.startDate && form.endDate && form.endDate < form.startDate) {
    errors.endDate = "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.";
  }

  const times = form.reminderTimes.filter(Boolean);
  if (new Set(times).size !== times.length) {
    errors.reminderTimes = "Không được trùng giờ nhắc.";
  } else if (times.length > MAX_REMINDER_TIMES) {
    errors.reminderTimes = `Tối đa ${MAX_REMINDER_TIMES} giờ nhắc.`;
  }

  if (form.isReminderEnabled) {
    if (!form.startDate) errors.startDate = "Cần chọn ngày bắt đầu để bật nhắc nhở.";
    if (!form.endDate) errors.endDate = errors.endDate || "Cần chọn ngày kết thúc để bật nhắc nhở.";
    if (times.length === 0) errors.reminderTimes = errors.reminderTimes || "Cần ít nhất một giờ nhắc khi bật nhắc nhở.";
  }

  return errors;
}

function buildPayload(form) {
  return {
    medicineName: form.medicineName.trim(),
    dosageInstruction: form.dosageInstruction.trim() || null,
    startDate: form.startDate || null,
    endDate: form.endDate || null,
    isReminderEnabled: form.isReminderEnabled,
    reminderTimes: form.reminderTimes.filter(Boolean).map(normalizeTimePayload),
  };
}

function getErrorMessage(error, fallback) {
  if (error?.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  if (error?.status === 404) return "Không tìm thấy thuốc này hoặc bạn không có quyền truy cập.";
  if (error?.status === 409) return "Dữ liệu đã thay đổi. Vui lòng tải lại và thử lại.";
  return error?.message || fallback;
}

function formatDateRange(startDate, endDate) {
  if (!startDate && !endDate) return "Chưa đặt thời gian dùng thuốc";
  const start = startDate ? new Date(startDate).toLocaleDateString("vi-VN") : "?";
  const end = endDate ? new Date(endDate).toLocaleDateString("vi-VN") : "?";
  return `${start} – ${end}`;
}

function MedicationFormDialog({ medication, saving, onClose, onSubmit }) {
  const [form, setForm] = useState(() => (medication ? toFormState(medication) : emptyForm()));
  const [errors, setErrors] = useState({});
  const [nextTime, setNextTime] = useState("");

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function addReminderTime() {
    if (!nextTime) return;
    if (form.reminderTimes.includes(nextTime)) {
      setErrors((current) => ({ ...current, reminderTimes: "Giờ này đã có trong danh sách." }));
      return;
    }
    if (form.reminderTimes.length >= MAX_REMINDER_TIMES) {
      setErrors((current) => ({ ...current, reminderTimes: `Tối đa ${MAX_REMINDER_TIMES} giờ nhắc.` }));
      return;
    }
    setForm((current) => ({
      ...current,
      reminderTimes: [...current.reminderTimes, nextTime].sort(),
    }));
    setNextTime("");
  }

  function removeReminderTime(time) {
    setForm((current) => ({
      ...current,
      reminderTimes: current.reminderTimes.filter((entry) => entry !== time),
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit(buildPayload(form));
  }

  return (
    <Dialog
      backdropClassName="user-medication-modal-backdrop"
      className="user-medication-modal"
      labelledBy="user-medication-modal-title"
      onClose={onClose}
      closeOnBackdrop={!saving}
      closeOnEscape={!saving}
    >
      <header className="user-medication-modal-header">
        <span className="user-medication-modal-icon" aria-hidden="true"><Pill size={20} /></span>
        <div>
          <p className="user-medication-eyebrow">{medication ? "Cập nhật" : "Thêm mới"}</p>
          <h2 id="user-medication-modal-title">{medication ? "Cập nhật thuốc" : "Thêm thuốc đang dùng"}</h2>
        </div>
        <button type="button" className="user-medication-modal-close" aria-label="Đóng form" onClick={onClose} disabled={saving}>
          <X size={20} aria-hidden="true" />
        </button>
      </header>

      <form className="user-medication-form" onSubmit={handleSubmit} noValidate>
        <Field label="Tên thuốc" required error={errors.medicineName}>
          <TextInput
            value={form.medicineName}
            onChange={(event) => updateField("medicineName", event.target.value)}
            placeholder="Ví dụ: Paracetamol 500mg"
            maxLength={MAX_MEDICINE_NAME_LENGTH}
            required
          />
        </Field>

        <Field label="Hướng dẫn dùng" hint="Ghi lại đúng thông tin trên đơn/nhãn thuốc." error={errors.dosageInstruction}>
          <Textarea
            rows={3}
            value={form.dosageInstruction}
            onChange={(event) => updateField("dosageInstruction", event.target.value)}
            placeholder="Ví dụ: Uống 1 viên sau ăn, ngày 2 lần"
            maxLength={MAX_DOSAGE_LENGTH}
          />
        </Field>

        <div className="user-medication-form-grid">
          <Field label="Ngày bắt đầu" error={errors.startDate}>
            <TextInput
              type="date"
              value={form.startDate}
              onChange={(event) => updateField("startDate", event.target.value)}
            />
          </Field>
          <Field label="Ngày kết thúc" error={errors.endDate}>
            <TextInput
              type="date"
              value={form.endDate}
              onChange={(event) => updateField("endDate", event.target.value)}
            />
          </Field>
        </div>

        <label className="user-medication-reminder-toggle">
          <input
            type="checkbox"
            checked={form.isReminderEnabled}
            onChange={(event) => updateField("isReminderEnabled", event.target.checked)}
          />
          <span>Bật nhắc nhở uống thuốc</span>
        </label>

        {form.isReminderEnabled && (
          <div className="user-medication-reminder-editor">
            <div className="user-medication-reminder-add">
              <TextInput
                type="time"
                step="60"
                value={nextTime}
                onChange={(event) => setNextTime(event.target.value)}
                aria-label="Chọn giờ nhắc"
              />
              <Button type="button" tone="secondary" size="sm" onClick={addReminderTime}>
                <Plus size={15} aria-hidden="true" /> Thêm giờ
              </Button>
            </div>

            {form.reminderTimes.length > 0 && (
              <ul className="user-medication-reminder-list">
                {form.reminderTimes.map((time) => (
                  <li key={time}>
                    <Clock3 size={13} aria-hidden="true" />
                    <span>{time}</span>
                    <button type="button" aria-label={`Xóa giờ ${time}`} onClick={() => removeReminderTime(time)}>
                      <X size={13} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {errors.reminderTimes && (
              <small className="user-medication-reminder-error" role="alert">{errors.reminderTimes}</small>
            )}
          </div>
        )}

        <Alert tone="info">{DISCLAIMER_TEXT}</Alert>

        <div className="user-medication-modal-actions">
          <Button type="button" tone="secondary" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button type="submit" loading={saving} loadingLabel="Đang lưu...">
            {medication ? "Lưu cập nhật" : "Thêm thuốc"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export default function UserMedicationsPage() {
  const { showToast, confirmAction } = useFeedback();
  const [medications, setMedications] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editingMedication, setEditingMedication] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    userMedicationsApi.list()
      .then((response) => {
        if (!active) return;
        const items = response?.data?.items ?? response?.data ?? [];
        setMedications(Array.isArray(items) ? items : []);
        setStatus("ready");
      })
      .catch((requestError) => {
        if (!active) return;
        setError(getErrorMessage(requestError, "Không thể tải danh sách thuốc. Vui lòng thử lại."));
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  function reload() {
    setStatus("loading");
    setError("");
    setReloadKey((current) => current + 1);
  }

  function openCreateForm() {
    setEditingMedication(null);
    setFormOpen(true);
  }

  function openEditForm(medication) {
    setEditingMedication(medication);
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    setEditingMedication(null);
  }

  async function submitForm(payload) {
    setSaving(true);
    try {
      if (editingMedication) {
        await userMedicationsApi.update(editingMedication.id, payload);
        showToast({ type: "success", title: "Đã cập nhật thuốc" });
      } else {
        await userMedicationsApi.create(payload);
        showToast({ type: "success", title: "Đã thêm thuốc mới" });
      }
      setFormOpen(false);
      setEditingMedication(null);
      reload();
    } catch (requestError) {
      showToast({
        type: "error",
        title: "Không thể lưu thuốc",
        message: getErrorMessage(requestError, "Vui lòng kiểm tra lại thông tin và thử lại."),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(medication) {
    const confirmed = await confirmAction({
      title: "Xóa thuốc này?",
      message: `"${medication.medicineName}" sẽ bị xóa khỏi danh sách và lịch nhắc sẽ tắt.`,
      confirmLabel: "Xóa",
    });
    if (!confirmed) return;

    try {
      await userMedicationsApi.remove(medication.id);
      showToast({ type: "success", title: "Đã xóa thuốc" });
      reload();
    } catch (requestError) {
      showToast({
        type: "error",
        title: "Không thể xóa thuốc",
        message: getErrorMessage(requestError, "Vui lòng thử lại sau."),
      });
    }
  }

  return (
    <div className="user-medications-page">
      <header className="user-medications-heading">
        <div>
          <p className="user-medications-eyebrow">Thuốc đang dùng</p>
          <h1>Thuốc & lịch nhắc</h1>
          <p>Theo dõi các loại thuốc bạn đang dùng và đặt lịch nhắc uống thuốc.</p>
        </div>
        <div className="user-medications-actions">
          <Button type="button" tone="secondary" onClick={reload} disabled={status === "loading"}>
            <RefreshCw size={16} aria-hidden="true" /> Tải lại
          </Button>
          <Button type="button" onClick={openCreateForm}>
            <Plus size={16} aria-hidden="true" /> Thêm thuốc
          </Button>
        </div>
      </header>

      <Alert tone="info" className="user-medications-disclaimer">{DISCLAIMER_TEXT}</Alert>

      {status === "loading" ? (
        <LoadingState label="Đang tải danh sách thuốc..." />
      ) : status === "error" ? (
        <ErrorState
          description={error}
          urgent
          action={<Button type="button" tone="secondary" onClick={reload}><RefreshCw size={16} aria-hidden="true" /> Thử lại</Button>}
        />
      ) : medications.length === 0 ? (
        <EmptyState
          icon={<Pill size={22} aria-hidden="true" />}
          title="Chưa có thuốc nào"
          description="Thêm thuốc đang dùng để MediMate nhắc bạn uống đúng giờ."
          action={<Button type="button" onClick={openCreateForm}><Plus size={16} aria-hidden="true" /> Thêm thuốc</Button>}
        />
      ) : (
        <div className="user-medications-list">
          {medications.map((medication) => (
            <Card key={medication.id} className="user-medication-card">
              <div className="user-medication-card-head">
                <span className="user-medication-card-icon" aria-hidden="true"><Pill size={18} /></span>
                <div>
                  <strong>{medication.medicineName}</strong>
                  <p>{formatDateRange(medication.startDate, medication.endDate)}</p>
                </div>
                <Badge tone={medication.isReminderEnabled ? "success" : "neutral"}>
                  {medication.isReminderEnabled ? "Đang nhắc" : "Không nhắc"}
                </Badge>
              </div>

              {medication.dosageInstruction && (
                <p className="user-medication-card-dosage">{medication.dosageInstruction}</p>
              )}

              <div className="user-medication-card-times">
                {medication.isReminderEnabled && (medication.reminderTimes?.length ?? 0) > 0 ? (
                  medication.reminderTimes.map((entry) => (
                    <span key={entry.id} className="user-medication-time-chip">
                      <Clock3 size={12} aria-hidden="true" />
                      {String(entry.timeOfDay).slice(0, 5)}
                    </span>
                  ))
                ) : (
                  <span className="user-medication-time-empty">Chưa có giờ nhắc</span>
                )}
              </div>

              <div className="user-medication-card-actions">
                <Button type="button" tone="secondary" size="sm" onClick={() => openEditForm(medication)}>
                  <Pencil size={14} aria-hidden="true" /> Sửa
                </Button>
                <Button type="button" tone="danger" size="sm" onClick={() => handleDelete(medication)}>
                  <Trash2 size={14} aria-hidden="true" /> Xóa
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {formOpen && (
        <MedicationFormDialog
          medication={editingMedication}
          saving={saving}
          onClose={closeForm}
          onSubmit={submitForm}
        />
      )}
    </div>
  );
}
