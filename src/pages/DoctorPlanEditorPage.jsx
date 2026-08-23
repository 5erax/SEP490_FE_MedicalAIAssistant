import { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Apple,
  ArrowLeft,
  Bone,
  Check,
  ClipboardList,
  Edit3,
  Eye,
  Info,
  Layers,
  Plus,
  RefreshCw,
  Send,
  Thermometer,
  Trash2,
  Utensils,
  Wind,
  X,
} from "lucide-react";
import { Badge, Button, Dialog, ErrorState, Field, LoadingState, Textarea, TextInput } from "../components/ui";
import { useFeedback } from "../components/feedback/feedbackContext";
import { navigate } from "../router/navigation";
import { doctorRecoveryPlansApi, normalizeDoctorPlanDetail } from "../services/api";
import { getApiErrorCode } from "../services/apiError";
import { subscribeToRecoveryPlanEvents } from "../services/recoveryPlanRealtime";
import { PlanDetail } from "./RecoveryPlanPage";
import "../styles/recovery-plan.css";
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

function getNextAvailablePhaseRange(plan) {
  const durationDays = Number(plan?.durationDays) || 0;
  const phases = getSortedPhases(plan)
    .filter((item) => Number.isInteger(item.startDay) && Number.isInteger(item.endDay));
  let nextDay = 1;

  for (const item of phases) {
    if (item.startDay > nextDay) {
      return { startDay: nextDay, maxEndDay: item.startDay - 1 };
    }
    nextDay = Math.max(nextDay, item.endDay + 1);
  }

  return {
    startDay: nextDay,
    maxEndDay: durationDays || nextDay,
  };
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

function getSortedItems(list) {
  return toArray(list)
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

// Mirrors the backend's ValidateCompletePlan rules (RecoveryPlanValidation.cs)
// so the doctor sees exactly what's missing before hitting a 400 on publish,
// instead of just "có giai đoạn + phủ kín ngày" which isn't the full picture:
// every phase also needs sleep/rest hours + >=1 nutrient, and every nutrient
// needs >=1 food source.
function getPublishChecklist(plan) {
  const phases = getSortedPhases(plan);
  const gaps = findCoverageGaps(phases, plan.durationDays);
  const phaseLabel = (phase, index) => phase.phaseName || `giai đoạn ${index + 1}`;

  const missingSleepRest = phases.filter((phase) => phase.sleepAndRestHoursPerDay == null);
  const phasesWithoutNutrients = phases.filter((phase) => getSortedItems(phase.nutrientTargets).length === 0);
  const nutrientsWithoutFood = [];
  phases.forEach((phase) => {
    getSortedItems(phase.nutrientTargets).forEach((nutrient) => {
      if (getSortedItems(nutrient.foodSources).length === 0) {
        nutrientsWithoutFood.push(nutrient.nutrientName || "dưỡng chất chưa đặt tên");
      }
    });
  });

  return [
    {
      key: "summary",
      label: "Có tóm tắt và hướng dẫn tái khám",
      done: Boolean(plan.summary?.trim()) && Boolean(plan.recheckInstruction?.trim()),
    },
    {
      key: "coverage",
      label: `Có ít nhất 1 giai đoạn, phủ kín ${plan.durationDays ? `${plan.durationDays} ngày` : "toàn bộ thời lượng"} của kế hoạch`,
      done: phases.length > 0 && gaps.length === 0,
    },
    {
      key: "sleep-rest",
      label: "Mỗi giai đoạn có tổng giờ ngủ nghỉ",
      done: phases.length > 0 && missingSleepRest.length === 0,
      detail: missingSleepRest.length > 0
        ? `Còn thiếu ở: ${missingSleepRest.map(phaseLabel).join(", ")}`
        : null,
    },
    {
      key: "nutrients",
      label: "Mỗi giai đoạn có ít nhất 1 dưỡng chất",
      done: phases.length > 0 && phasesWithoutNutrients.length === 0,
      detail: phasesWithoutNutrients.length > 0
        ? `Còn thiếu ở: ${phasesWithoutNutrients.map(phaseLabel).join(", ")}`
        : null,
    },
    {
      key: "foods",
      label: "Mỗi dưỡng chất có ít nhất 1 nguồn thực phẩm",
      done: nutrientsWithoutFood.length === 0,
      detail: nutrientsWithoutFood.length > 0
        ? `Còn thiếu ở: ${nutrientsWithoutFood.join(", ")}`
        : null,
    },
  ];
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
  if (code === "RECOVERY_PLAN_INCOMPLETE") return "Kế hoạch chưa đầy đủ thông tin bắt buộc để xuất bản. Vui lòng kiểm tra lại danh sách yêu cầu.";
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
  const [createNutrientFor, setCreateNutrientFor] = useState(null);
  const [editingNutrient, setEditingNutrient] = useState(null);
  const [nutrientBusy, setNutrientBusy] = useState("");
  const [createFoodFor, setCreateFoodFor] = useState(null);
  const [editingFood, setEditingFood] = useState(null);
  const [foodBusy, setFoodBusy] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const refetchTimerRef = useRef(null);

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

  useEffect(() => {
    // refreshPlan() already never touches the loading flag, so it's safe to
    // call straight from a background socket event without flashing a
    // spinner over a form the doctor might have open.
    const unsubscribe = subscribeToRecoveryPlanEvents((event) => {
      if (event.type === "plan" || event.refetch) {
        window.clearTimeout(refetchTimerRef.current);
        refetchTimerRef.current = window.setTimeout(() => {
          void refreshPlan();
        }, 250);
      }
    });

    return () => {
      unsubscribe();
      window.clearTimeout(refetchTimerRef.current);
    };
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

  async function handleCreateNutrient(payload) {
    setNutrientBusy("create");
    try {
      await doctorRecoveryPlansApi.createNutrient(planId, createNutrientFor.phaseId, payload);
      await refreshPlan();
      setCreateNutrientFor(null);
      showToast({ type: "success", title: "Đã thêm dưỡng chất" });
    } catch (requestError) {
      showToast({ type: "error", title: "Không thể thêm dưỡng chất", message: getActionMessage(requestError) });
    } finally {
      setNutrientBusy("");
    }
  }

  async function handleUpdateNutrient(payload) {
    const { phaseId, nutrient } = editingNutrient;
    setNutrientBusy("update");
    try {
      await doctorRecoveryPlansApi.updateNutrient(planId, phaseId, nutrient.id, payload);
      await refreshPlan();
      setEditingNutrient(null);
      showToast({ type: "success", title: "Đã cập nhật dưỡng chất" });
    } catch (requestError) {
      showToast({ type: "error", title: "Không thể cập nhật dưỡng chất", message: getActionMessage(requestError) });
      if (getApiErrorCode(requestError) === "NOT_FOUND") {
        setEditingNutrient(null);
        await refreshPlan();
      }
    } finally {
      setNutrientBusy("");
    }
  }

  async function handleDeleteNutrient(phaseId, nutrient) {
    const confirmed = await confirmAction({
      title: `Xóa dưỡng chất "${nutrient.nutrientName || "này"}"?`,
      message: "Toàn bộ nguồn thực phẩm thuộc dưỡng chất này (nếu có) sẽ bị xóa theo. Không thể hoàn tác.",
      confirmLabel: "Xóa dưỡng chất",
    });
    if (!confirmed) return;

    setNutrientBusy(`delete-${nutrient.id}`);
    try {
      await doctorRecoveryPlansApi.removeNutrient(planId, phaseId, nutrient.id);
      await refreshPlan();
      showToast({ type: "success", title: "Đã xóa dưỡng chất" });
    } catch (requestError) {
      showToast({ type: "error", title: "Không thể xóa dưỡng chất", message: getActionMessage(requestError) });
    } finally {
      setNutrientBusy("");
    }
  }

  async function handleCreateFood(payload) {
    const { phaseId, nutrientId } = createFoodFor;
    setFoodBusy("create");
    try {
      await doctorRecoveryPlansApi.createFood(planId, phaseId, nutrientId, payload);
      await refreshPlan();
      setCreateFoodFor(null);
      showToast({ type: "success", title: "Đã thêm nguồn thực phẩm" });
    } catch (requestError) {
      showToast({ type: "error", title: "Không thể thêm nguồn thực phẩm", message: getActionMessage(requestError) });
    } finally {
      setFoodBusy("");
    }
  }

  async function handleUpdateFood(payload) {
    const { phaseId, nutrientId, food } = editingFood;
    setFoodBusy("update");
    try {
      await doctorRecoveryPlansApi.updateFood(planId, phaseId, nutrientId, food.id, payload);
      await refreshPlan();
      setEditingFood(null);
      showToast({ type: "success", title: "Đã cập nhật nguồn thực phẩm" });
    } catch (requestError) {
      showToast({ type: "error", title: "Không thể cập nhật nguồn thực phẩm", message: getActionMessage(requestError) });
      if (getApiErrorCode(requestError) === "NOT_FOUND") {
        setEditingFood(null);
        await refreshPlan();
      }
    } finally {
      setFoodBusy("");
    }
  }

  async function handleDeleteFood(phaseId, nutrientId, food) {
    const confirmed = await confirmAction({
      title: `Xóa nguồn thực phẩm "${food.foodName || "này"}"?`,
      message: "Không thể hoàn tác sau khi xóa.",
      confirmLabel: "Xóa thực phẩm",
    });
    if (!confirmed) return;

    setFoodBusy(`delete-${food.id}`);
    try {
      await doctorRecoveryPlansApi.removeFood(planId, phaseId, nutrientId, food.id);
      await refreshPlan();
      showToast({ type: "success", title: "Đã xóa nguồn thực phẩm" });
    } catch (requestError) {
      showToast({ type: "error", title: "Không thể xóa nguồn thực phẩm", message: getActionMessage(requestError) });
    } finally {
      setFoodBusy("");
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

  async function handlePublish() {
    setBusy("publish");
    try {
      const response = await doctorRecoveryPlansApi.publish(planId);
      setState((current) => ({ ...current, plan: normalizeDoctorPlanDetail(response).plan }));
      showToast({ type: "success", title: "Đã xuất bản kế hoạch", message: "Bệnh nhân đã có thể xem kế hoạch phục hồi này." });
      navigate(state.requestId ? `/app/staff/recovery-plan-requests/${state.requestId}` : "/app/staff/recovery-plans/mine");
    } catch (requestError) {
      showToast({ type: "error", title: "Không thể xuất bản kế hoạch", message: getActionMessage(requestError) });
      if (["NOT_FOUND", "INVALID_PLAN_STRUCTURE", "RECOVERY_PLAN_INCOMPLETE", "RECOVERY_PLAN_NOT_EDITABLE", "INVALID_REQUEST_STATE", "CONFLICT"].includes(getApiErrorCode(requestError))) {
        await refreshPlan();
      }
    } finally {
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
          onAddNutrient={(phaseId, count) => setCreateNutrientFor({ phaseId, count })}
          onEditNutrient={(phaseId, nutrient) => setEditingNutrient({ phaseId, nutrient })}
          onDeleteNutrient={handleDeleteNutrient}
          nutrientBusy={nutrientBusy}
          onAddFood={(phaseId, nutrientId, count) => setCreateFoodFor({ phaseId, nutrientId, count })}
          onEditFood={(phaseId, nutrientId, food) => setEditingFood({ phaseId, nutrientId, food })}
          onDeleteFood={handleDeleteFood}
          foodBusy={foodBusy}
          onPreview={() => setPreviewOpen(true)}
          onPublish={handlePublish}
        />
      )}

      {previewOpen && (
        <Dialog
          backdropClassName="doctor-plan-modal-backdrop"
          className="doctor-plan-preview-modal"
          labelledBy="doctor-plan-preview-title"
          onClose={() => setPreviewOpen(false)}
        >
          <header className="doctor-plan-modal-header">
            <span aria-hidden="true"><Eye size={20} aria-hidden="true" /></span>
            <h2 id="doctor-plan-preview-title">Xem trước · góc nhìn bệnh nhân</h2>
            <button type="button" aria-label="Đóng" onClick={() => setPreviewOpen(false)}><X size={20} aria-hidden="true" /></button>
          </header>
          <div className="doctor-plan-preview-body">
            <PlanDetail plan={state.plan} loading={false} onStart={() => {}} busy={false} />
          </div>
        </Dialog>
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

      {createNutrientFor && (
        <NutrientFormDialog
          existingCount={createNutrientFor.count}
          submitting={nutrientBusy === "create"}
          onClose={() => setCreateNutrientFor(null)}
          onSubmit={handleCreateNutrient}
        />
      )}

      {editingNutrient && (
        <NutrientFormDialog
          nutrient={editingNutrient.nutrient}
          submitting={nutrientBusy === "update"}
          onClose={() => setEditingNutrient(null)}
          onSubmit={handleUpdateNutrient}
        />
      )}

      {createFoodFor && (
        <FoodFormDialog
          existingCount={createFoodFor.count}
          submitting={foodBusy === "create"}
          onClose={() => setCreateFoodFor(null)}
          onSubmit={handleCreateFood}
        />
      )}

      {editingFood && (
        <FoodFormDialog
          food={editingFood.food}
          submitting={foodBusy === "update"}
          onClose={() => setEditingFood(null)}
          onSubmit={handleUpdateFood}
        />
      )}
    </div>
  );
}

function PlanContent({
  state,
  busy,
  onEdit,
  onDelete,
  onReload,
  onAddPhase,
  onEditPhase,
  onDeletePhase,
  phaseBusy,
  onAddNutrient,
  onEditNutrient,
  onDeleteNutrient,
  nutrientBusy,
  onAddFood,
  onEditFood,
  onDeleteFood,
  foodBusy,
  onPreview,
  onPublish,
}) {
  const { plan, requestId, diseaseGroup } = state;
  const disease = getDiseaseInfo(diseaseGroup);
  const DiseaseIcon = disease.icon;
  const statusMeta = getPlanStatusMeta(plan.status);
  const isDraft = plan.status === "draft";
  const phases = getSortedPhases(plan);
  const gaps = findCoverageGaps(phases, plan.durationDays);
  const publishChecklist = getPublishChecklist(plan);
  const canPublish = publishChecklist.every((item) => item.done);

  return (
    <>
      <header className="doctor-plan-header">
        <span className="doctor-plan-icon" aria-hidden="true"><DiseaseIcon size={26} /></span>
        <div>
          <p className="doctor-plan-eyebrow">Soạn kế hoạch phục hồi · {disease.label}</p>
          <h1>{plan.planName || "Chưa đặt tên kế hoạch"}</h1>
        </div>
        <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
        <button type="button" className="doctor-plan-preview-trigger" onClick={onPreview}>
          <Eye size={15} aria-hidden="true" /> Xem trước
        </button>
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
                  <PhaseRow
                    key={phase.id}
                    phase={phase}
                    isDraft={isDraft}
                    phaseBusy={phaseBusy}
                    onEditPhase={onEditPhase}
                    onDeletePhase={onDeletePhase}
                    onAddNutrient={onAddNutrient}
                    onEditNutrient={onEditNutrient}
                    onDeleteNutrient={onDeleteNutrient}
                    nutrientBusy={nutrientBusy}
                    onAddFood={onAddFood}
                    onEditFood={onEditFood}
                    onDeleteFood={onDeleteFood}
                    foodBusy={foodBusy}
                  />
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
            <section className="doctor-plan-card doctor-plan-publish-card">
              <p className="doctor-plan-card-heading">Xuất bản kế hoạch</p>
              <ul className="doctor-plan-checklist">
                {publishChecklist.map((item) => (
                  <li key={item.key} className={item.done ? "is-done" : "is-blocked"}>
                    <span className="doctor-plan-checklist-icon" aria-hidden="true">
                      {item.done ? <Check size={13} /> : <X size={13} />}
                    </span>
                    <span>
                      {item.label}
                      {!item.done && item.detail && <em>{item.detail}</em>}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="doctor-plan-publish-actions">
                <Button tone="ghost" onClick={onPreview}>
                  <Eye size={16} aria-hidden="true" /> Xem trước
                </Button>
                <Button disabled={!canPublish || Boolean(busy)} loading={busy === "publish"} loadingLabel="Đang xuất bản…" onClick={onPublish}>
                  <Send size={16} aria-hidden="true" /> Xuất bản kế hoạch
                </Button>
              </div>
            </section>
          )}

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

export function PhaseRow({
  phase,
  isDraft,
  phaseBusy,
  onEditPhase,
  onDeletePhase,
  onAddNutrient,
  onEditNutrient,
  onDeleteNutrient,
  nutrientBusy,
  onAddFood,
  onEditFood,
  onDeleteFood,
  foodBusy,
}) {
  const nutrients = getSortedItems(phase.nutrientTargets);

  return (
    <li className="doctor-plan-phase-row">
      <div className="doctor-plan-phase-top">
        <div className="doctor-plan-phase-info">
          <strong>{phase.phaseName || "Chưa đặt tên giai đoạn"}</strong>
          <span className="doctor-plan-phase-days">{formatDayRange(phase.startDay, phase.endDay)}</span>
          {phase.sleepAndRestHoursPerDay != null && (
            <span className="doctor-plan-phase-meta">
              Ngủ nghỉ {phase.sleepAndRestHoursPerDay}h/ngày
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
      </div>

      <div className="doctor-plan-subsection">
        <div className="doctor-plan-subsection-head">
          <p className="doctor-plan-subsection-heading">
            <Apple size={14} aria-hidden="true" /> Dưỡng chất
          </p>
          {isDraft && (
            <button type="button" className="doctor-plan-subsection-add" onClick={() => onAddNutrient(phase.id, nutrients.length)}>
              <Plus size={14} aria-hidden="true" /> Thêm dưỡng chất
            </button>
          )}
        </div>

        {nutrients.length === 0 ? (
          <p className="doctor-plan-subsection-empty">Chưa có dưỡng chất nào cho giai đoạn này.</p>
        ) : (
          <ul className="doctor-plan-nutrient-list">
            {nutrients.map((nutrient) => (
              <NutrientRow
                key={nutrient.id}
                phaseId={phase.id}
                nutrient={nutrient}
                isDraft={isDraft}
                nutrientBusy={nutrientBusy}
                onEditNutrient={onEditNutrient}
                onDeleteNutrient={onDeleteNutrient}
                onAddFood={onAddFood}
                onEditFood={onEditFood}
                onDeleteFood={onDeleteFood}
                foodBusy={foodBusy}
              />
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

function NutrientRow({
  phaseId,
  nutrient,
  isDraft,
  nutrientBusy,
  onEditNutrient,
  onDeleteNutrient,
  onAddFood,
  onEditFood,
  onDeleteFood,
  foodBusy,
}) {
  const foods = getSortedItems(nutrient.foodSources);

  return (
    <li className="doctor-plan-nutrient-row">
      <div className="doctor-plan-nutrient-top">
        <div className="doctor-plan-nutrient-info">
          <strong>{nutrient.nutrientName || "Chưa đặt tên dưỡng chất"}</strong>
          <span className="doctor-plan-phase-days">
            {nutrient.amountPerDay != null ? `${nutrient.amountPerDay} ${nutrient.unit || ""} / ngày` : "Chưa có định lượng"}
          </span>
          {nutrient.instruction && <p className="doctor-plan-phase-instruction">{nutrient.instruction}</p>}
        </div>
        {isDraft && (
          <div className="doctor-plan-phase-actions">
            <button type="button" aria-label="Chỉnh sửa dưỡng chất" onClick={() => onEditNutrient(phaseId, nutrient)}>
              <Edit3 size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Xóa dưỡng chất"
              className="is-danger"
              disabled={nutrientBusy === `delete-${nutrient.id}`}
              onClick={() => onDeleteNutrient(phaseId, nutrient)}
            >
              <Trash2 size={15} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      <div className="doctor-plan-subsection doctor-plan-subsection-nested">
        <div className="doctor-plan-subsection-head">
          <p className="doctor-plan-subsection-heading">
            <Utensils size={13} aria-hidden="true" /> Nguồn thực phẩm
          </p>
          {isDraft && (
            <button type="button" className="doctor-plan-subsection-add" onClick={() => onAddFood(phaseId, nutrient.id, foods.length)}>
              <Plus size={13} aria-hidden="true" /> Thêm thực phẩm
            </button>
          )}
        </div>

        {foods.length === 0 ? (
          <p className="doctor-plan-subsection-empty">Chưa có nguồn thực phẩm nào.</p>
        ) : (
          <ul className="doctor-plan-food-list">
            {foods.map((food) => (
              <FoodRow
                key={food.id}
                phaseId={phaseId}
                nutrientId={nutrient.id}
                food={food}
                isDraft={isDraft}
                foodBusy={foodBusy}
                onEditFood={onEditFood}
                onDeleteFood={onDeleteFood}
              />
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

function FoodRow({ phaseId, nutrientId, food, isDraft, foodBusy, onEditFood, onDeleteFood }) {
  return (
    <li className="doctor-plan-food-row">
      <div className="doctor-plan-food-info">
        <strong>{food.foodName || "Chưa đặt tên thực phẩm"}</strong>
        {food.suggestedServing && <span className="doctor-plan-phase-days">{food.suggestedServing}</span>}
        {food.note && <p className="doctor-plan-phase-instruction">{food.note}</p>}
      </div>
      {isDraft && (
        <div className="doctor-plan-phase-actions">
          <button type="button" aria-label="Chỉnh sửa thực phẩm" onClick={() => onEditFood(phaseId, nutrientId, food)}>
            <Edit3 size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Xóa thực phẩm"
            className="is-danger"
            disabled={foodBusy === `delete-${food.id}`}
            onClick={() => onDeleteFood(phaseId, nutrientId, food)}
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </div>
      )}
    </li>
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

export function PhaseFormDialog({
  plan,
  phase,
  submitting,
  onClose,
  onSubmit,
  phaseNameMaxLength = 150,
  instructionMaxLength = 1000,
}) {
  const isEditing = Boolean(phase);
  const automaticRange = getNextAvailablePhaseRange(plan);
  const initialStartDay = phase?.startDay ?? automaticRange.startDay;
  const [phaseName, setPhaseName] = useState(phase?.phaseName ?? "");
  const [startDay, setStartDay] = useState(String(initialStartDay));
  const [endDay, setEndDay] = useState(String(phase?.endDay ?? initialStartDay));
  const [sleepAndRestHoursPerDay, setSleepAndRestHoursPerDay] = useState(
    phase?.sleepAndRestHoursPerDay != null ? String(phase.sleepAndRestHoursPerDay) : "8",
  );
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
    if (!isEditing && !nextErrors.endDay && end > automaticRange.maxEndDay) {
      nextErrors.endDay = automaticRange.maxEndDay < (plan?.durationDays || automaticRange.maxEndDay)
        ? `Khoảng trống hiện tại chỉ còn đến ngày ${automaticRange.maxEndDay}.`
        : `Kế hoạch chỉ dài ${plan?.durationDays} ngày.`;
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

    const hoursText = sleepAndRestHoursPerDay.trim();
    const hours = hoursText === "" ? null : Number(hoursText);
    if (hours === null) {
      nextErrors.sleepAndRestHoursPerDay = "Tổng giờ ngủ nghỉ là bắt buộc.";
    } else if (!Number.isFinite(hours) || hours <= 0 || hours > 24 || !/^\d+(\.\d{1,2})?$/.test(hoursText)) {
      nextErrors.sleepAndRestHoursPerDay = "Tổng giờ ngủ nghỉ phải lớn hơn 0, không quá 24 giờ và tối đa 2 chữ số thập phân.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    onSubmit({
      phaseName: trimmedName,
      startDay: start,
      endDay: end,
      sleepAndRestHoursPerDay: hours,
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
            maxLength={phaseNameMaxLength}
            placeholder="Ví dụ: Giai đoạn ổn định và phục hồi ban đầu"
            onChange={(event) => { setPhaseName(event.target.value); setErrors((current) => ({ ...current, phaseName: "" })); }}
            autoFocus
          />
        </Field>
        <p className="doctor-plan-modal-note">
          Ngày bắt đầu/kết thúc là <strong>ngày thứ mấy trong kế hoạch</strong> (ví dụ 1 = ngày đầu tiên), không phải ngày dương lịch.
        </p>
        <div className="doctor-plan-modal-row">
          <Field
            label="Ngày bắt đầu"
            required
            error={errors.startDay}
          >
            <TextInput
              type="number"
              min="1"
              max={plan?.durationDays || undefined}
              value={startDay}
              readOnly={!isEditing}
              aria-readonly={!isEditing}
              onChange={(event) => { setStartDay(event.target.value); setErrors((current) => ({ ...current, startDay: "" })); }}
            />
          </Field>
          <Field
            label="Ngày kết thúc"
            required
            error={errors.endDay}
          >
            <TextInput
              type="number"
              min={startDay || "1"}
              max={isEditing ? (plan?.durationDays || undefined) : automaticRange.maxEndDay}
              value={endDay}
              placeholder={String(initialStartDay)}
              onChange={(event) => { setEndDay(event.target.value); setErrors((current) => ({ ...current, endDay: "" })); }}
            />
          </Field>
        </div>
        <Field
          label="Tổng giờ ngủ nghỉ / ngày"
          required
          error={errors.sleepAndRestHoursPerDay}
        >
          <TextInput
            type="number"
            min="0.01"
            max="24"
            step="0.5"
            value={sleepAndRestHoursPerDay}
            placeholder="8"
            onChange={(event) => {
              setSleepAndRestHoursPerDay(event.target.value);
              setErrors((current) => ({ ...current, sleepAndRestHoursPerDay: "" }));
            }}
          />
        </Field>
        <Field label="Hướng dẫn" optional>
          <Textarea
            rows={3}
            maxLength={instructionMaxLength}
            value={instruction}
            placeholder="Ví dụ: Nghỉ ngơi đầy đủ, vận động nhẹ và theo dõi các dấu hiệu bất thường."
            onChange={(event) => setInstruction(event.target.value)}
          />
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

export function NutrientFormDialog({ nutrient, existingCount, submitting, onClose, onSubmit }) {
  const isEditing = Boolean(nutrient);
  const [nutrientName, setNutrientName] = useState(nutrient?.nutrientName ?? "");
  const [amountPerDay, setAmountPerDay] = useState(nutrient?.amountPerDay != null ? String(nutrient.amountPerDay) : "");
  const [unit, setUnit] = useState(nutrient?.unit ?? "");
  const [instruction, setInstruction] = useState(nutrient?.instruction ?? "");
  const [errors, setErrors] = useState({});

  function handleSubmit(event) {
    event.preventDefault();
    const trimmedName = nutrientName.trim();
    const trimmedUnit = unit.trim();
    const amount = Number(amountPerDay);
    const nextErrors = {};
    if (!trimmedName) nextErrors.nutrientName = "Tên dưỡng chất là bắt buộc.";
    if (!trimmedUnit) nextErrors.unit = "Đơn vị là bắt buộc.";
    if (!(amount > 0) || Number.isNaN(amount)) nextErrors.amountPerDay = "Định lượng phải lớn hơn 0.";
    if (amount > 99999999.99) nextErrors.amountPerDay = "Định lượng vượt quá giới hạn cho phép.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    onSubmit({
      nutrientName: trimmedName,
      amountPerDay: amount,
      unit: trimmedUnit,
      instruction: instruction.trim() || null,
      sortOrder: nutrient?.sortOrder ?? existingCount ?? 0,
    });
  }

  return (
    <Dialog
      backdropClassName="doctor-plan-modal-backdrop"
      className="doctor-plan-modal"
      labelledBy="doctor-nutrient-form-title"
      onClose={submitting ? () => {} : onClose}
      closeOnBackdrop={!submitting}
      closeOnEscape={!submitting}
    >
      <header className="doctor-plan-modal-header">
        <span aria-hidden="true"><Apple size={20} /></span>
        <h2 id="doctor-nutrient-form-title">{isEditing ? "Chỉnh sửa dưỡng chất" : "Thêm dưỡng chất"}</h2>
        <button type="button" aria-label="Đóng" onClick={onClose} disabled={submitting}><X size={20} aria-hidden="true" /></button>
      </header>
      <form onSubmit={handleSubmit} noValidate>
        <Field label="Tên dưỡng chất" required error={errors.nutrientName}>
          <TextInput
            value={nutrientName}
            maxLength={200}
            placeholder="Ví dụ: Protein"
            onChange={(event) => { setNutrientName(event.target.value); setErrors((current) => ({ ...current, nutrientName: "" })); }}
            autoFocus
          />
        </Field>
        <div className="doctor-plan-modal-row">
          <Field label="Định lượng / ngày" required error={errors.amountPerDay}>
            <TextInput
              type="number"
              min="0"
              step="0.01"
              value={amountPerDay}
              placeholder="Ví dụ: 70"
              onChange={(event) => { setAmountPerDay(event.target.value); setErrors((current) => ({ ...current, amountPerDay: "" })); }}
            />
          </Field>
          <Field label="Đơn vị" required error={errors.unit}>
            <TextInput
              value={unit}
              maxLength={32}
              placeholder="g, mg, ml…"
              onChange={(event) => { setUnit(event.target.value); setErrors((current) => ({ ...current, unit: "" })); }}
            />
          </Field>
        </div>
        <Field label="Hướng dẫn" optional>
          <Textarea
            rows={3}
            maxLength={1000}
            value={instruction}
            placeholder="Ví dụ: Chia đều lượng dưỡng chất trong các bữa ăn trong ngày."
            onChange={(event) => setInstruction(event.target.value)}
          />
        </Field>
        <div className="doctor-plan-modal-actions">
          <Button type="button" tone="secondary" onClick={onClose} disabled={submitting}>Hủy</Button>
          <Button type="submit" loading={submitting} loadingLabel="Đang lưu…">
            <Send size={16} aria-hidden="true" /> {isEditing ? "Lưu thay đổi" : "Thêm dưỡng chất"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function FoodFormDialog({ food, existingCount, submitting, onClose, onSubmit }) {
  const isEditing = Boolean(food);
  const [foodName, setFoodName] = useState(food?.foodName ?? "");
  const [suggestedServing, setSuggestedServing] = useState(food?.suggestedServing ?? "");
  const [note, setNote] = useState(food?.note ?? "");
  const [errors, setErrors] = useState({});

  function handleSubmit(event) {
    event.preventDefault();
    const trimmedName = foodName.trim();
    const nextErrors = {};
    if (!trimmedName) nextErrors.foodName = "Tên thực phẩm là bắt buộc.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    onSubmit({
      foodName: trimmedName,
      suggestedServing: suggestedServing.trim() || null,
      note: note.trim() || null,
      sortOrder: food?.sortOrder ?? existingCount ?? 0,
    });
  }

  return (
    <Dialog
      backdropClassName="doctor-plan-modal-backdrop"
      className="doctor-plan-modal"
      labelledBy="doctor-food-form-title"
      onClose={submitting ? () => {} : onClose}
      closeOnBackdrop={!submitting}
      closeOnEscape={!submitting}
    >
      <header className="doctor-plan-modal-header">
        <span aria-hidden="true"><Utensils size={20} /></span>
        <h2 id="doctor-food-form-title">{isEditing ? "Chỉnh sửa thực phẩm" : "Thêm nguồn thực phẩm"}</h2>
        <button type="button" aria-label="Đóng" onClick={onClose} disabled={submitting}><X size={20} aria-hidden="true" /></button>
      </header>
      <form onSubmit={handleSubmit} noValidate>
        <Field label="Tên thực phẩm" required error={errors.foodName}>
          <TextInput
            value={foodName}
            maxLength={256}
            placeholder="Ví dụ: Ức gà"
            onChange={(event) => { setFoodName(event.target.value); setErrors((current) => ({ ...current, foodName: "" })); }}
            autoFocus
          />
        </Field>
        <Field label="Khẩu phần gợi ý" optional>
          <TextInput value={suggestedServing} maxLength={256} placeholder="Ví dụ: 150 g mỗi bữa" onChange={(event) => setSuggestedServing(event.target.value)} />
        </Field>
        <Field label="Ghi chú" optional>
          <Textarea
            rows={3}
            maxLength={1000}
            value={note}
            placeholder="Ví dụ: Ưu tiên hấp hoặc luộc, hạn chế chiên nhiều dầu."
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
        <div className="doctor-plan-modal-actions">
          <Button type="button" tone="secondary" onClick={onClose} disabled={submitting}>Hủy</Button>
          <Button type="submit" loading={submitting} loadingLabel="Đang lưu…">
            <Send size={16} aria-hidden="true" /> {isEditing ? "Lưu thay đổi" : "Thêm thực phẩm"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
