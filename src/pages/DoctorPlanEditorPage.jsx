import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bone,
  ClipboardList,
  Edit3,
  Info,
  Layers,
  RefreshCw,
  Send,
  Thermometer,
  Trash2,
  Wind,
  X,
} from "lucide-react";
import { Badge, Button, Dialog, ErrorState, Field, LoadingState, Textarea, TextInput } from "../components/ui";
import { useFeedback } from "../components/feedback/feedbackContext";
import { navigate } from "../router/navigation";
import { doctorRecoveryPlansApi, normalizeDoctorPlanDetail } from "../services/api";
import { getApiErrorCode } from "../services/apiError";
import "../styles/doctor-plan-editor.css";

const DISEASE_GROUPS = {
  respiratory: { label: "Hô hấp", icon: Wind },
  musculoskeletal: { label: "Cơ xương khớp", icon: Bone },
  infectiousDisease: { label: "Bệnh truyền nhiễm", icon: Thermometer },
};

const PLAN_STATUS_META = {
  draft: { label: "Bản nháp", tone: "warning" },
  readyToStart: { label: "Sẵn sàng bắt đầu", tone: "success" },
  active: { label: "Đang thực hiện", tone: "info" },
  completed: { label: "Đã hoàn thành", tone: "success" },
  cancelled: { label: "Đã hủy", tone: "danger" },
  superseded: { label: "Đã thay thế", tone: "danger" },
};

function getDiseaseInfo(value) {
  return DISEASE_GROUPS[value] ?? { label: "Chưa phân loại", icon: ClipboardList };
}

function getPlanStatusMeta(value) {
  return PLAN_STATUS_META[value] ?? { label: value || "—", tone: "info" };
}

function formatShortId(id) {
  return id ? `#${String(id).slice(0, 8).toUpperCase()}` : "—";
}

function getActionMessage(error) {
  const code = getApiErrorCode(error);
  if (code === "NOT_FOUND") return "Kế hoạch không tồn tại hoặc đã bị xóa.";
  if (code === "INVALID_REQUEST_STATE" || code === "CONFLICT") return "Kế hoạch đã thay đổi trạng thái. Vui lòng tải lại trang.";
  return error?.message || "Đã có lỗi xảy ra. Vui lòng thử lại.";
}

export default function DoctorPlanEditorPage({ planId }) {
  const { showToast, confirmAction } = useFeedback();
  const [state, setState] = useState({ plan: null, requestId: null, diseaseGroup: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    setNotFound(false);
    try {
      const response = await doctorRecoveryPlansApi.get(planId);
      setState(normalizeDoctorPlanDetail(response));
    } catch (requestError) {
      if (requestError?.status === 404 || getApiErrorCode(requestError) === "NOT_FOUND") {
        setNotFound(true);
      } else {
        setError("Chưa thể tải kế hoạch. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => void load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  async function handleUpdateHeader(payload) {
    setBusy("update");
    try {
      const response = await doctorRecoveryPlansApi.updateHeader(planId, payload);
      setState((current) => ({ ...current, plan: normalizeDoctorPlanDetail(response).plan }));
      showToast({ type: "success", title: "Đã cập nhật kế hoạch" });
      setEditOpen(false);
    } catch (requestError) {
      showToast({ type: "error", title: "Không thể cập nhật kế hoạch", message: getActionMessage(requestError) });
      if (getApiErrorCode(requestError) === "NOT_FOUND") {
        setEditOpen(false);
        await load();
      }
    } finally {
      setBusy("");
    }
  }

  async function handleDelete() {
    const confirmed = await confirmAction({
      title: "Xóa bản nháp kế hoạch này?",
      message: "Toàn bộ nội dung đã soạn sẽ bị xóa vĩnh viễn và không thể khôi phục.",
      confirmLabel: "Xóa bản nháp",
    });
    if (!confirmed) return;

    setBusy("delete");
    try {
      await doctorRecoveryPlansApi.remove(planId);
      showToast({ type: "success", title: "Đã xóa bản nháp kế hoạch" });
      navigate(state.requestId ? `/app/staff/recovery-plan-requests/${state.requestId}` : "/app/staff/recovery-plans/mine");
    } catch (requestError) {
      showToast({ type: "error", title: "Không thể xóa kế hoạch", message: getActionMessage(requestError) });
      setBusy("");
    }
  }

  const backTarget = state.requestId ? `/app/staff/recovery-plan-requests/${state.requestId}` : "/app/staff/recovery-plans/mine";

  return (
    <div className="doctor-plan-page">
      <button type="button" className="doctor-plan-back" onClick={() => navigate(backTarget)}>
        <ArrowLeft size={16} aria-hidden="true" /> Quay lại yêu cầu
      </button>

      {loading ? (
        <LoadingState label="Đang tải kế hoạch…" />
      ) : notFound ? (
        <ErrorState
          urgent
          title="Không tìm thấy kế hoạch này"
          description="Kế hoạch không tồn tại, đã bị xóa, hoặc không thuộc quyền xử lý của tài khoản này."
          action={<Button onClick={() => navigate("/app/staff/recovery-plans/mine")}>Về Yêu cầu của tôi</Button>}
        />
      ) : error ? (
        <ErrorState
          title="Không thể tải kế hoạch"
          description={error}
          action={<Button onClick={load}><RefreshCw size={16} aria-hidden="true" /> Thử lại</Button>}
        />
      ) : state.plan && (
        <PlanContent
          state={state}
          busy={busy}
          onEdit={() => setEditOpen(true)}
          onDelete={handleDelete}
          onReload={load}
        />
      )}

      {editOpen && (
        <EditPlanDialog
          plan={state.plan}
          submitting={busy === "update"}
          onClose={() => setEditOpen(false)}
          onSubmit={handleUpdateHeader}
        />
      )}
    </div>
  );
}

function PlanContent({ state, busy, onEdit, onDelete, onReload }) {
  const { plan, requestId, diseaseGroup } = state;
  const disease = getDiseaseInfo(diseaseGroup);
  const DiseaseIcon = disease.icon;
  const statusMeta = getPlanStatusMeta(plan.status);
  const isDraft = plan.status === "draft";

  return (
    <>
      <header className="doctor-plan-header">
        <span className="doctor-plan-icon" aria-hidden="true"><DiseaseIcon size={26} /></span>
        <div>
          <p className="doctor-plan-eyebrow">Soạn kế hoạch phục hồi · {disease.label}</p>
          <h1>{plan.planName || "Chưa đặt tên kế hoạch"}</h1>
        </div>
        <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
        <button type="button" className="doctor-plan-refresh" aria-label="Tải lại" onClick={onReload}>
          <RefreshCw size={16} aria-hidden="true" />
        </button>
      </header>

      <div className="doctor-plan-layout">
        <div className="doctor-plan-main">
          <section className="doctor-plan-card">
            <div className="doctor-plan-card-head">
              <p className="doctor-plan-card-heading">Thông tin kế hoạch</p>
              {isDraft && (
                <Button tone="ghost" size="sm" onClick={onEdit}>
                  <Edit3 size={15} aria-hidden="true" /> Chỉnh sửa
                </Button>
              )}
            </div>
            <dl className="doctor-plan-grid">
              <div>
                <dt>Số ngày thực hiện</dt>
                <dd>{plan.durationDays ? `${plan.durationDays} ngày` : "Chưa cập nhật"}</dd>
              </div>
              <div className="doctor-plan-grid-wide">
                <dt>Tóm tắt</dt>
                <dd>{plan.summary || "Chưa có tóm tắt."}</dd>
              </div>
              <div className="doctor-plan-grid-wide">
                <dt>Hướng dẫn tái khám</dt>
                <dd>{plan.recheckInstruction || "Chưa có hướng dẫn."}</dd>
              </div>
            </dl>
          </section>

          <section className="doctor-plan-card doctor-plan-phases-card">
            <span className="doctor-plan-phases-icon" aria-hidden="true"><Layers size={22} /></span>
            <div>
              <p className="doctor-plan-card-heading">
                Giai đoạn điều trị <em className="doctor-plan-soon-badge">Sắp ra mắt</em>
              </p>
              <p className="doctor-plan-empty-note">
                Trình soạn giai đoạn, dưỡng chất và thực phẩm cho kế hoạch này sẽ có mặt tại đây trong bản cập nhật tiếp theo.
              </p>
            </div>
          </section>

          {isDraft && (
            <div className="doctor-plan-danger-zone">
              <div className="doctor-plan-danger-header">
                <AlertTriangle size={15} aria-hidden="true" />
                <div>
                  <p className="doctor-plan-danger-title">Vùng nguy hiểm</p>
                  <p className="doctor-plan-danger-desc">Xóa bản nháp sẽ xóa vĩnh viễn toàn bộ nội dung đã soạn cho kế hoạch này.</p>
                </div>
              </div>
              <button type="button" className="doctor-plan-danger-action" disabled={Boolean(busy)} onClick={onDelete}>
                <span className="doctor-plan-danger-action-icon" aria-hidden="true"><Trash2 size={18} /></span>
                <span className="doctor-plan-danger-action-body">
                  <strong>Xóa bản nháp kế hoạch</strong>
                  <p>Không thể hoàn tác sau khi xóa.</p>
                </span>
              </button>
            </div>
          )}
        </div>

        <aside className="doctor-plan-sidebar">
          <section className="doctor-plan-side-card">
            <p className="doctor-plan-side-heading">
              <Activity size={13} aria-hidden="true" /> Trạng thái
            </p>
            <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
          </section>

          <section className="doctor-plan-side-card">
            <p className="doctor-plan-side-heading">
              <Info size={13} aria-hidden="true" /> Thông tin nhanh
            </p>
            <dl className="doctor-plan-quick-info">
              <div>
                <dt>Mã kế hoạch</dt>
                <dd>{formatShortId(plan.id)}</dd>
              </div>
              <div>
                <dt>Nhóm bệnh</dt>
                <dd>{disease.label}</dd>
              </div>
              {requestId && (
                <div>
                  <dt>Yêu cầu gốc</dt>
                  <dd>{formatShortId(requestId)}</dd>
                </div>
              )}
            </dl>
          </section>
        </aside>
      </div>
    </>
  );
}

function EditPlanDialog({ plan, submitting, onClose, onSubmit }) {
  const [planName, setPlanName] = useState(plan?.planName ?? "");
  const [summary, setSummary] = useState(plan?.summary ?? "");
  const [durationDays, setDurationDays] = useState(String(plan?.durationDays ?? ""));
  const [recheckInstruction, setRecheckInstruction] = useState(plan?.recheckInstruction ?? "");
  const [errors, setErrors] = useState({});

  function handleSubmit(event) {
    event.preventDefault();
    const trimmedName = planName.trim();
    const days = Number(durationDays);
    const nextErrors = {};
    if (!trimmedName) nextErrors.planName = "Tên kế hoạch là bắt buộc.";
    if (!Number.isInteger(days) || days <= 0) nextErrors.durationDays = "Số ngày phải là số nguyên dương.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onSubmit({
      planName: trimmedName,
      summary: summary.trim() || null,
      durationDays: days,
      recheckInstruction: recheckInstruction.trim() || null,
    });
  }

  return (
    <Dialog
      backdropClassName="doctor-plan-modal-backdrop"
      className="doctor-plan-modal"
      labelledBy="doctor-edit-plan-title"
      onClose={submitting ? () => {} : onClose}
      closeOnBackdrop={!submitting}
      closeOnEscape={!submitting}
    >
      <header className="doctor-plan-modal-header">
        <span aria-hidden="true"><Edit3 size={20} /></span>
        <h2 id="doctor-edit-plan-title">Chỉnh sửa kế hoạch</h2>
        <button type="button" aria-label="Đóng" onClick={onClose} disabled={submitting}><X size={20} aria-hidden="true" /></button>
      </header>
      <form onSubmit={handleSubmit} noValidate>
        <Field label="Tên kế hoạch" required error={errors.planName}>
          <TextInput
            value={planName}
            maxLength={200}
            onChange={(event) => { setPlanName(event.target.value); setErrors((current) => ({ ...current, planName: "" })); }}
            autoFocus
          />
        </Field>
        <Field label="Tóm tắt" optional>
          <Textarea rows={3} maxLength={1000} value={summary} onChange={(event) => setSummary(event.target.value)} />
        </Field>
        <Field label="Số ngày thực hiện" required error={errors.durationDays}>
          <TextInput
            type="number"
            min="1"
            value={durationDays}
            onChange={(event) => { setDurationDays(event.target.value); setErrors((current) => ({ ...current, durationDays: "" })); }}
          />
        </Field>
        <Field label="Hướng dẫn tái khám" optional>
          <Textarea rows={2} maxLength={500} value={recheckInstruction} onChange={(event) => setRecheckInstruction(event.target.value)} />
        </Field>
        <div className="doctor-plan-modal-actions">
          <Button type="button" tone="secondary" onClick={onClose} disabled={submitting}>Hủy</Button>
          <Button type="submit" loading={submitting} loadingLabel="Đang lưu…">
            <Send size={16} aria-hidden="true" /> Lưu thay đổi
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
