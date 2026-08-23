import { useEffect, useState } from "react";
import {
  Bone,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Edit3,
  Files,
  Plus,
  RefreshCw,
  Search,
  Thermometer,
  Trash2,
  Wind,
  X,
} from "lucide-react";
import { useFeedback } from "../components/feedback/feedbackContext";
import { Badge, Button, Dialog, EmptyState, ErrorState, Field, LoadingState, Select, Textarea, TextInput } from "../components/ui";
import { navigate } from "../router/navigation";
import {
  doctorRecoveryPlanTemplatesApi,
  getRecoveryPlanTemplateErrorMessage,
  RECOVERY_PLAN_DISEASE_GROUPS,
} from "../services/api";
import "../styles/doctor-plan-editor.css";
import "../styles/doctor-recovery-plan-template.css";

const PAGE_SIZE = 10;

const DISEASE_OPTIONS = [
  { value: "", label: "Tất cả nhóm bệnh" },
  { value: "respiratory", label: "Hô hấp", icon: Wind },
  { value: "musculoskeletal", label: "Cơ xương khớp", icon: Bone },
  { value: "infectiousDisease", label: "Bệnh truyền nhiễm", icon: Thermometer },
];

function formatDate(value) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getDiseaseIcon(value) {
  return DISEASE_OPTIONS.find((item) => item.value === value)?.icon ?? Files;
}

export default function DoctorRecoveryPlanTemplatesPage() {
  const { showToast, confirmAction } = useFeedback();
  const [templates, setTemplates] = useState([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [diseaseGroup, setDiseaseGroup] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [busy, setBusy] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await doctorRecoveryPlanTemplatesApi.list({
        pageNumber,
        pageSize: PAGE_SIZE,
        diseaseGroup,
        search,
      });
      const data = response?.data ?? {};
      setTemplates(Array.isArray(data.items) ? data.items : []);
      setTotalCount(Number(data.totalCount) || 0);
      setTotalPages(Number(data.totalPages) || 0);
    } catch (requestError) {
      setError(getRecoveryPlanTemplateErrorMessage(requestError, "Chưa thể tải danh sách kế hoạch mẫu."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => void load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber, diseaseGroup, search]);

  function handleSearch(event) {
    event.preventDefault();
    setPageNumber(1);
    setSearch(searchInput.trim());
  }

  async function handleCreate(payload) {
    setBusy("create");
    try {
      const response = await doctorRecoveryPlanTemplatesApi.create(payload);
      const templateId = response?.data?.id;
      setCreateOpen(false);
      showToast({ type: "success", title: "Đã tạo kế hoạch mẫu" });
      if (templateId) {
        navigate(`/app/staff/recovery-plan-templates/${templateId}`);
        return;
      }
      await load();
    } catch (requestError) {
      showToast({
        type: "error",
        title: "Không thể tạo kế hoạch mẫu",
        message: getRecoveryPlanTemplateErrorMessage(requestError),
      });
    } finally {
      setBusy("");
    }
  }

  async function handleDelete(template) {
    const confirmed = await confirmAction({
      title: `Xóa kế hoạch mẫu “${template.templateName || template.planName || "này"}”?`,
      message: "Mẫu sẽ bị xóa khỏi thư viện. Các kế hoạch bệnh nhân đã tạo từ mẫu không bị ảnh hưởng.",
      confirmLabel: "Xóa kế hoạch mẫu",
    });
    if (!confirmed) return;

    setBusy(`delete-${template.id}`);
    try {
      await doctorRecoveryPlanTemplatesApi.remove(template.id);
      showToast({ type: "success", title: "Đã xóa kế hoạch mẫu" });
      if (templates.length === 1 && pageNumber > 1) {
        setPageNumber((current) => current - 1);
      } else {
        await load();
      }
    } catch (requestError) {
      showToast({
        type: "error",
        title: "Không thể xóa kế hoạch mẫu",
        message: getRecoveryPlanTemplateErrorMessage(requestError),
      });
      await load();
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="doctor-template-page">
      <header className="doctor-template-page-header">
        <div>
          <p className="doctor-template-eyebrow">Thư viện của bác sĩ</p>
          <h1>Kế hoạch mẫu</h1>
          <p>Tạo và quản lý các kế hoạch phục hồi có thể tái sử dụng cho nhiều bệnh nhân.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={17} aria-hidden="true" /> Tạo kế hoạch mẫu
        </Button>
      </header>

      <section className="doctor-template-toolbar" aria-label="Tìm kiếm và lọc kế hoạch mẫu">
        <form className="doctor-template-search" onSubmit={handleSearch}>
          <Search size={17} aria-hidden="true" />
          <TextInput
            value={searchInput}
            maxLength={200}
            placeholder="Tìm theo tên mẫu hoặc tên kế hoạch..."
            aria-label="Tìm kế hoạch mẫu"
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <Button type="submit" tone="secondary" size="sm">Tìm kiếm</Button>
        </form>
        <Select
          value={diseaseGroup}
          aria-label="Lọc theo nhóm bệnh"
          onChange={(event) => {
            setDiseaseGroup(event.target.value);
            setPageNumber(1);
          }}
        >
          {DISEASE_OPTIONS.map((option) => (
            <option key={option.value || "all"} value={option.value}>{option.label}</option>
          ))}
        </Select>
        <button type="button" className="doctor-template-refresh" aria-label="Tải lại danh sách" onClick={load}>
          <RefreshCw size={17} aria-hidden="true" />
        </button>
      </section>

      {loading ? (
        <LoadingState label="Đang tải kế hoạch mẫu…" />
      ) : error ? (
        <ErrorState title="Không thể tải kế hoạch mẫu" description={error} action={<Button onClick={load}>Thử lại</Button>} />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={<Files size={25} />}
          title={search || diseaseGroup ? "Không tìm thấy kế hoạch mẫu phù hợp" : "Bạn chưa có kế hoạch mẫu"}
          description={search || diseaseGroup ? "Hãy thay đổi từ khóa hoặc nhóm bệnh để tìm lại." : "Tạo mẫu đầu tiên để rút ngắn thời gian soạn kế hoạch cho bệnh nhân."}
          action={<Button onClick={() => setCreateOpen(true)}><Plus size={16} aria-hidden="true" /> Tạo kế hoạch mẫu</Button>}
        />
      ) : (
        <>
          <div className="doctor-template-result-meta">
            <strong>{totalCount}</strong> kế hoạch mẫu
          </div>
          <ul className="doctor-template-list">
            {templates.map((template) => {
              const DiseaseIcon = getDiseaseIcon(template.diseaseGroup);
              return (
                <li key={template.id} className="doctor-template-card">
                  <span className="doctor-template-card-icon" aria-hidden="true"><DiseaseIcon size={22} /></span>
                  <div className="doctor-template-card-main">
                    <div className="doctor-template-card-title-row">
                      <h2>{template.templateName || "Chưa đặt tên mẫu"}</h2>
                      <Badge tone={template.isComplete ? "success" : "warning"}>
                        {template.isComplete ? "Hoàn chỉnh" : "Đang soạn"}
                      </Badge>
                    </div>
                    <div className="doctor-template-card-tags">
                      <span>{RECOVERY_PLAN_DISEASE_GROUPS[template.diseaseGroup] || "Chưa phân loại"}</span>
                    </div>
                    <p className="doctor-template-plan-name">{template.planName || "Chưa đặt tên kế hoạch"}</p>
                    <div className="doctor-template-card-meta">
                      <span><Clock3 size={14} aria-hidden="true" /> {template.durationDays || 0} ngày</span>
                      <span>{template.phaseCount || 0} giai đoạn</span>
                      <span>Cập nhật: {formatDate(template.updatedAt || template.createdAt)}</span>
                    </div>
                  </div>
                  <div className="doctor-template-card-actions">
                    <Button tone="secondary" size="sm" onClick={() => navigate(`/app/staff/recovery-plan-templates/${template.id}`)}>
                      <Edit3 size={15} aria-hidden="true" /> Xem / Chỉnh sửa
                    </Button>
                    <Button
                      tone="danger"
                      size="sm"
                      disabled={busy === `delete-${template.id}`}
                      loading={busy === `delete-${template.id}`}
                      loadingLabel="Đang xóa…"
                      onClick={() => handleDelete(template)}
                    >
                      <Trash2 size={15} aria-hidden="true" /> Xóa
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>

          {totalPages > 1 && (
            <nav className="doctor-template-pagination" aria-label="Phân trang kế hoạch mẫu">
              <Button tone="secondary" size="sm" disabled={pageNumber <= 1} onClick={() => setPageNumber((current) => current - 1)}>
                <ChevronLeft size={16} aria-hidden="true" /> Trước
              </Button>
              <span>Trang {pageNumber} / {totalPages}</span>
              <Button tone="secondary" size="sm" disabled={pageNumber >= totalPages} onClick={() => setPageNumber((current) => current + 1)}>
                Sau <ChevronRight size={16} aria-hidden="true" />
              </Button>
            </nav>
          )}
        </>
      )}

      {createOpen && (
        <TemplateHeaderDialog
          submitting={busy === "create"}
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}

export function TemplateHeaderDialog({ template, submitting, onClose, onSubmit }) {
  const isEditing = Boolean(template);
  const [templateName, setTemplateName] = useState(template?.templateName ?? "");
  const [diseaseGroup, setDiseaseGroup] = useState(template?.diseaseGroup ?? "respiratory");
  const [planName, setPlanName] = useState(template?.planName ?? "");
  const [durationDays, setDurationDays] = useState(String(template?.durationDays ?? 14));
  const [summary, setSummary] = useState(template?.summary ?? "");
  const [recheckInstruction, setRecheckInstruction] = useState(template?.recheckInstruction ?? "");
  const [errors, setErrors] = useState({});

  function handleSubmit(event) {
    event.preventDefault();
    const days = Number(durationDays);
    const nextErrors = {};
    if (!templateName.trim()) nextErrors.templateName = "Tên mẫu là bắt buộc.";
    if (!planName.trim()) nextErrors.planName = "Tên kế hoạch là bắt buộc.";
    if (!summary.trim()) nextErrors.summary = "Tóm tắt là bắt buộc.";
    if (!recheckInstruction.trim()) nextErrors.recheckInstruction = "Hướng dẫn tái khám là bắt buộc.";
    if (!RECOVERY_PLAN_DISEASE_GROUPS[diseaseGroup]) nextErrors.diseaseGroup = "Nhóm bệnh chưa hợp lệ.";
    if (!Number.isInteger(days) || days < 1 || days > 365) nextErrors.durationDays = "Số ngày phải là số nguyên từ 1 đến 365.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onSubmit({
      templateName: templateName.trim(),
      diseaseGroup,
      planName: planName.trim(),
      durationDays: days,
      summary: summary.trim(),
      recheckInstruction: recheckInstruction.trim(),
    });
  }

  return (
    <Dialog
      backdropClassName="doctor-plan-modal-backdrop"
      className="doctor-plan-modal"
      labelledBy="doctor-template-header-dialog-title"
      onClose={submitting ? () => {} : onClose}
      closeOnBackdrop={!submitting}
      closeOnEscape={!submitting}
    >
      <header className="doctor-plan-modal-header">
        <span aria-hidden="true"><Files size={20} /></span>
        <h2 id="doctor-template-header-dialog-title">{isEditing ? "Chỉnh sửa kế hoạch mẫu" : "Tạo kế hoạch mẫu"}</h2>
        <button type="button" aria-label="Đóng" onClick={onClose} disabled={submitting}><X size={20} aria-hidden="true" /></button>
      </header>
      <form onSubmit={handleSubmit} noValidate>
        <Field label="Tên mẫu" required error={errors.templateName}>
          <TextInput
            value={templateName}
            maxLength={200}
            placeholder="Ví dụ: Hô hấp nhẹ - người lớn - 14 ngày"
            autoFocus
            onChange={(event) => { setTemplateName(event.target.value); setErrors((current) => ({ ...current, templateName: "" })); }}
          />
        </Field>
        <Field label="Nhóm bệnh" required error={errors.diseaseGroup}>
          <Select value={diseaseGroup} onChange={(event) => { setDiseaseGroup(event.target.value); setErrors((current) => ({ ...current, diseaseGroup: "" })); }}>
            {DISEASE_OPTIONS.filter((option) => option.value).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
        </Field>
        <Field label="Tên kế hoạch" required error={errors.planName}>
          <TextInput
            value={planName}
            maxLength={200}
            placeholder="Ví dụ: Kế hoạch phục hồi hô hấp 14 ngày"
            onChange={(event) => { setPlanName(event.target.value); setErrors((current) => ({ ...current, planName: "" })); }}
          />
        </Field>
        <Field label="Số ngày thực hiện" required error={errors.durationDays}>
          <TextInput type="number" min="1" max="365" value={durationDays} onChange={(event) => { setDurationDays(event.target.value); setErrors((current) => ({ ...current, durationDays: "" })); }} />
        </Field>
        <Field label="Tóm tắt" required error={errors.summary}>
          <Textarea
            rows={3}
            maxLength={2000}
            value={summary}
            placeholder="Ví dụ: Mục tiêu phục hồi, chế độ dinh dưỡng và mức độ vận động phù hợp trong thời gian thực hiện."
            onChange={(event) => { setSummary(event.target.value); setErrors((current) => ({ ...current, summary: "" })); }}
          />
        </Field>
        <Field label="Hướng dẫn tái khám" required error={errors.recheckInstruction}>
          <Textarea
            rows={3}
            maxLength={2000}
            value={recheckInstruction}
            placeholder="Ví dụ: Tái khám sau 14 ngày hoặc sớm hơn nếu khó thở tăng, sốt kéo dài hay xuất hiện dấu hiệu bất thường."
            onChange={(event) => { setRecheckInstruction(event.target.value); setErrors((current) => ({ ...current, recheckInstruction: "" })); }}
          />
        </Field>
        <div className="doctor-plan-modal-actions">
          <Button type="button" tone="secondary" onClick={onClose} disabled={submitting}>Hủy</Button>
          <Button type="submit" loading={submitting} loadingLabel="Đang lưu…">{isEditing ? "Lưu thay đổi" : "Tạo kế hoạch mẫu"}</Button>
        </div>
      </form>
    </Dialog>
  );
}
