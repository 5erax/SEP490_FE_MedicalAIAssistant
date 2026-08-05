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
  Plus,
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

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function getSortedPhases(plan) {
  return toArray(plan?.phases)
    .slice()
    .sort((a, b) => (a.startDay ?? 0) - (b.startDay ?? 0));
}

function formatDayRange(startDay, endDay) {
  if (startDay == null || endDay == null) return "Chưa đặt ngày";
  return startDay === endDay ? `Ngày ${startDay}` : `Ngày ${startDay} – ${endDay}`;
}

function findCoverageGaps(phases, durationDays) {
  if (!durationDays) return [];
  const sorted = phases
    .filter((item) => item.startDay != null && item.endDay != null)
    .slice()
    .sort((a, b) => a.startDay - b.startDay);

  const gaps = [];
  let cursor = 1;
  for (const phase of sorted) {
    if (phase.startDay > cursor) {
      gaps.push({ start: cursor, end: phase.startDay - 1 });
    }
    cursor = Math.max(cursor, phase.endDay + 1);
  }
  if (cursor <= durationDays) {
    gaps.push({ start: cursor, end: durationDays });
  }
  return gaps;
}

function findOverlappingPhase(phases, start, end, excludeId) {
  return phases.find((item) => {
    if (excludeId && item.id === excludeId) return false;
    if (item.startDay == null || item.endDay == null) return false;
    return start <= item.endDay && item.startDay <= end;
  });
}

function getActionMessage(error) {
  const code = getApiErrorCode(error);
  if (code === "INVALID_REQUEST") return "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại các trường đã nhập.";
  if (code === "INVALID_PLAN_STRUCTURE") return "Cấu trúc kế hoạch không hợp lệ. Vui lòng kiểm tra khoảng ngày và thứ tự hiển thị.";
  if (code === "NOT_FOUND") return "Dữ liệu không còn tồn tại hoặc bạn không có quyền chỉnh sửa. Vui lòng tải lại trang.";
  if (code === "RECOVERY_PLAN_NOT_EDITABLE") return "Kế hoạch không còn ở trạng thái có thể chỉnh sửa. Vui lòng tải lại trang.";
  if (code === "INVALID_REQUEST_STATE" || code === "CONFLICT") return "Dữ liệu hoặc trạng thái kế hoạch đã thay đổi. Vui lòng tải lại trang.";
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
  const [createPhaseOpen, setCreatePhaseOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState(null);
  const [phaseBusy, setPhaseBusy] = useState("");

  async function refreshPlan() {
    const response = await doctorRecoveryPlansApi.get(planId);
    setState(normalizeDoctorPlanDetail(response));
  }

  async function load() {
    setLoading(true);
    setError("");
    setNotFound(false);
    try {
      await refreshPlan();
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
        await refreshPlan();
      }
    } finally {
      setBusy("");
    }
  }

  async function handleCreatePhase(payload) {
    setPhaseBusy("create");
    try {
      await doctorRecoveryPlansApi.createPhase(planId, payload);
      await refreshPlan();
      setCreatePhaseOpen(false);
      showToast({ type: "success", title: "Đã thêm giai đoạn" });
    } catch (requestError) {
      showToast({ type: "error", title: "Không thể thêm giai đoạn", message: getActionMessage(requestError) });
    } finally {
      setPhaseBusy("");
    }
  }

  async function handleUpdatePhase(payload) {
    setPhaseBusy("update");
    try {
      await doctorRecoveryPlansApi.updatePhase(planId, editingPhase.id, payload);
      await refreshPlan();
      setEditingPhase(null);
      showToast({ type: "success", title: "Đã cập nhật giai đoạn" });
    } catch (requestError) {
      showToast({ type: "error", title: "Không thể cập nhật giai đoạn", message: getActionMessage(requestError) });
      if (getApiErrorCode(requestError) === "NOT_FOUND") {
        setEditingPhase(null);
        await refreshPlan();
      }
    } finally {
      setPhaseBusy("");
    }
  }

  async function handleDeletePhase(phase) {
    const confirmed = await confirmAction({
      title: `Xóa giai đoạn "${phase.phaseName || "này"}"?`,
      message: "Toàn bộ dưỡng chất và thực phẩm thuộc giai đoạn này (nếu có) sẽ bị xóa theo. Không thể hoàn tác.",
      confirmLabel: "Xóa giai đoạn",
    });
    if (!confirmed) return;

    setPhaseBusy(`delete-${phase.id}`);
    try {
      await doctorRecoveryPlansApi.removePhase(planId, phase.id);
      await refreshPlan();
      showToast({ type: "success", title: "Đã xóa giai đoạn" });
    } catch (requestError) {
      showToast({ type: "error", title: "Không thể xóa giai đoạn", message: getActionMessage(requestError) });
    } finally {
      setPhaseBusy("");
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
          onAddPhase={() => setCreatePhaseOpen(true)}
          onEditPhase={setEditingPhase}
          onDeletePhase={handleDeletePhase}
          phaseBusy={phaseBusy}
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

      {createPhaseOpen && (
        <PhaseFormDialog
          plan={state.plan}
          submitting={phaseBusy === "create"}
          onClose={() => setCreatePhaseOpen(false)}
          onSubmit={handleCreatePhase}
        />
      )}

      {editingPhase && (
        <PhaseFormDialog
          plan={state.plan}
          phase={editingPhase}
          submitting={phaseBusy === "update"}
          onClose={() => setEditingPhase(null)}
          onSubmit={handleUpdatePhase}
        />
      )}
    </div>
  );
}

function PlanContent({ state, busy, onEdit, onDelete, onReload, onAddPhase, onEditPhase, onDeletePhase, phaseBusy }) {
  const { plan, requestId, diseaseGroup } = state;
  const disease = getDiseaseInfo(diseaseGroup);
  const DiseaseIcon = disease.icon;
  const statusMeta = getPlanStatusMeta(plan.status);
  const isDraft = plan.status === "draft";
  const phases = getSortedPhases(plan);
  const gaps = findCoverageGaps(phases, plan.durationDays);

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

          <section className="doctor-plan-card">
            <div className="doctor-plan-card-head">
              <p className="doctor-plan-card-heading">Giai đoạn điều trị</p>
              {isDraft && (
                <Button tone="ghost" size="sm" onClick={onAddPhase}>
                  <Plus size={15} aria-hidden="true" /> Thêm giai đoạn
                </Button>
              )}
            </div>

            {phases.length === 0 ? (
              <div className="doctor-plan-phases-empty">
                <span className="doctor-plan-phases-icon" aria-hidden="true"><Layers size={22} /></span>
                <p className="doctor-plan-empty-note">
                  Chưa có giai đoạn nào. Thêm giai đoạn đầu tiên để bắt đầu chia nhỏ kế hoạch theo từng mốc ngày.
                </p>
              </div>
            ) : (
              <ul className="doctor-plan-phase-list">
                {phases.map((phase) => (
                  <li key={phase.id} className="doctor-plan-phase-row">
                    <div className="doctor-plan-phase-info">
                      <strong>{phase.phaseName || "Chưa đặt tên giai đoạn"}</strong>
                      <span className="doctor-plan-phase-days">{formatDayRange(phase.startDay, phase.endDay)}</span>
                      {(phase.sleepHoursPerDay != null || phase.restHoursPerDay != null) && (
                        <span className="doctor-plan-phase-meta">
                          {phase.sleepHoursPerDay != null && `Ngủ ${phase.sleepHoursPerDay}h/ngày`}
                          {phase.sleepHoursPerDay != null && phase.restHoursPerDay != null && " · "}
                          {phase.restHoursPerDay != null && `Nghỉ ${phase.restHoursPerDay}h/ngày`}
                        </span>
                      )}
                      {phase.instruction && <p className="doctor-plan-phase-instruction">{phase.instruction}</p>}
                    </div>
                    {isDraft && (
                      <div className="doctor-plan-phase-actions">
                        <button type="button" aria-label="Chỉnh sửa giai đoạn" onClick={() => onEditPhase(phase)}>
                          <Edit3 size={15} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          aria-label="Xóa giai đoạn"
                          className="is-danger"
                          disabled={phaseBusy === `delete-${phase.id}`}
                          onClick={() => onDeletePhase(phase)}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {phases.length > 0 && gaps.length > 0 && (
              <div className="doctor-plan-phase-gaps">
                <AlertTriangle size={14} aria-hidden="true" />
                <span>
                  Chưa phủ hết {plan.durationDays} ngày của kế hoạch — còn thiếu:{" "}
                  {gaps.map((gap) => (gap.start === gap.end ? `ngày ${gap.start}` : `ngày ${gap.start}–${gap.end}`)).join(", ")}.
                </span>
              </div>
            )}
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

function PhaseFormDialog({ plan, phase, submitting, onClose, onSubmit }) {
  const isEditing = Boolean(phase);
  const [phaseName, setPhaseName] = useState(phase?.phaseName ?? "");
  const [startDay, setStartDay] = useState(String(phase?.startDay ?? ""));
  const [endDay, setEndDay] = useState(String(phase?.endDay ?? ""));
  const [sleepHoursPerDay, setSleepHoursPerDay] = useState(phase?.sleepHoursPerDay != null ? String(phase.sleepHoursPerDay) : "");
  const [restHoursPerDay, setRestHoursPerDay] = useState(phase?.restHoursPerDay != null ? String(phase.restHoursPerDay) : "");
  const [instruction, setInstruction] = useState(phase?.instruction ?? "");
  const [errors, setErrors] = useState({});

  function handleSubmit(event) {
    event.preventDefault();
    const trimmedName = phaseName.trim();
    const start = Number(startDay);
    const end = Number(endDay);
    const nextErrors = {};
    if (!trimmedName) nextErrors.phaseName = "Tên giai đoạn là bắt buộc.";
    if (!Number.isInteger(start) || start < 1) nextErrors.startDay = "Phải là số nguyên từ 1 trở lên.";
    if (!Number.isInteger(end) || end < 1) nextErrors.endDay = "Phải là số nguyên từ 1 trở lên.";
    if (!nextErrors.startDay && !nextErrors.endDay && start > end) {
      nextErrors.endDay = "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.";
    }
    if (!nextErrors.endDay && plan?.durationDays && end > plan.durationDays) {
      nextErrors.endDay = `Kế hoạch chỉ dài ${plan.durationDays} ngày.`;
    }
    if (!nextErrors.startDay && !nextErrors.endDay) {
      const overlapping = findOverlappingPhase(getSortedPhases(plan), start, end, phase?.id);
      if (overlapping) {
        nextErrors.endDay = `Trùng ngày với giai đoạn "${overlapping.phaseName || "khác"}" (${formatDayRange(overlapping.startDay, overlapping.endDay)}).`;
      }
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    onSubmit({
      phaseName: trimmedName,
      startDay: start,
      endDay: end,
      sleepHoursPerDay: sleepHoursPerDay.trim() ? Number(sleepHoursPerDay) : null,
      restHoursPerDay: restHoursPerDay.trim() ? Number(restHoursPerDay) : null,
      instruction: instruction.trim() || null,
      sortOrder: phase?.sortOrder ?? getSortedPhases(plan).length,
    });
  }

  return (
    <Dialog
      backdropClassName="doctor-plan-modal-backdrop"
      className="doctor-plan-modal"
      labelledBy="doctor-phase-form-title"
      onClose={submitting ? () => {} : onClose}
      closeOnBackdrop={!submitting}
      closeOnEscape={!submitting}
    >
      <header className="doctor-plan-modal-header">
        <span aria-hidden="true"><Layers size={20} /></span>
        <h2 id="doctor-phase-form-title">{isEditing ? "Chỉnh sửa giai đoạn" : "Thêm giai đoạn"}</h2>
        <button type="button" aria-label="Đóng" onClick={onClose} disabled={submitting}><X size={20} aria-hidden="true" /></button>
      </header>
      <form onSubmit={handleSubmit} noValidate>
        <Field label="Tên giai đoạn" required error={errors.phaseName}>
          <TextInput
            value={phaseName}
            maxLength={150}
            onChange={(event) => { setPhaseName(event.target.value); setErrors((current) => ({ ...current, phaseName: "" })); }}
            autoFocus
          />
        </Field>
        <p className="doctor-plan-modal-note">
          Ngày bắt đầu/kết thúc là <strong>ngày thứ mấy trong kế hoạch</strong> (ví dụ 1 = ngày đầu tiên), không phải ngày dương lịch.
        </p>
        <div className="doctor-plan-modal-row">
          <Field label="Ngày bắt đầu" required error={errors.startDay} hint={!errors.startDay && plan?.durationDays ? `Trong khoảng 1–${plan.durationDays}` : undefined}>
            <TextInput
              type="number"
              min="1"
              max={plan?.durationDays || undefined}
              value={startDay}
              onChange={(event) => { setStartDay(event.target.value); setErrors((current) => ({ ...current, startDay: "" })); }}
            />
          </Field>
          <Field label="Ngày kết thúc" required error={errors.endDay} hint={!errors.endDay && plan?.durationDays ? `Trong khoảng 1–${plan.durationDays}` : undefined}>
            <TextInput
              type="number"
              min="1"
              max={plan?.durationDays || undefined}
              value={endDay}
              onChange={(event) => { setEndDay(event.target.value); setErrors((current) => ({ ...current, endDay: "" })); }}
            />
          </Field>
        </div>
        <div className="doctor-plan-modal-row">
          <Field label="Giờ ngủ / ngày" optional>
            <TextInput type="number" min="0" step="0.5" value={sleepHoursPerDay} onChange={(event) => setSleepHoursPerDay(event.target.value)} />
          </Field>
          <Field label="Giờ nghỉ / ngày" optional>
            <TextInput type="number" min="0" step="0.5" value={restHoursPerDay} onChange={(event) => setRestHoursPerDay(event.target.value)} />
          </Field>
        </div>
        <Field label="Hướng dẫn" optional>
          <Textarea rows={3} maxLength={1000} value={instruction} onChange={(event) => setInstruction(event.target.value)} />
        </Field>
        <div className="doctor-plan-modal-actions">
          <Button type="button" tone="secondary" onClick={onClose} disabled={submitting}>Hủy</Button>
          <Button type="submit" loading={submitting} loadingLabel="Đang lưu…">
            <Send size={16} aria-hidden="true" /> {isEditing ? "Lưu thay đổi" : "Thêm giai đoạn"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
