import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bone,
  Edit3,
  Eye,
  Files,
  Info,
  Layers,
  Plus,
  RefreshCw,
  Thermometer,
  Trash2,
  Wind,
  X,
} from "lucide-react";
import { useFeedback } from "../components/feedback/feedbackContext";
import { Badge, Button, Dialog, ErrorState, LoadingState } from "../components/ui";
import { TemplatePreview } from "../components/recovery/RecoveryPlanTemplatePickerDialog";
import PlanCompletionChecklist from "../components/recovery/PlanCompletionChecklist";
import { navigate } from "../router/navigation";
import {
  doctorRecoveryPlanTemplatesApi,
  getRecoveryPlanTemplateErrorMessage,
  RECOVERY_PLAN_DISEASE_GROUPS,
} from "../services/api";
import { getApiErrorCode } from "../services/apiError";
import { findCoverageGaps } from "../utils/planCompletion";
import {
  FoodFormDialog,
  NutrientFormDialog,
  PhaseFormDialog,
  PhaseRow,
} from "./DoctorPlanEditorPage";
import { TemplateHeaderDialog } from "./DoctorRecoveryPlanTemplatesPage";
import "../styles/doctor-plan-editor.css";
import "../styles/doctor-recovery-plan-template.css";

const DISEASE_ICONS = {
  respiratory: Wind,
  musculoskeletal: Bone,
  infectiousDisease: Thermometer,
};

function formatShortId(id) {
  return id ? `#${String(id).slice(0, 8).toUpperCase()}` : "—";
}

function sortedPhases(template) {
  return Array.isArray(template?.phases)
    ? template.phases.slice().sort((left, right) => (left.startDay ?? 0) - (right.startDay ?? 0))
    : [];
}

function hasAvailablePhaseDay(template) {
  const durationDays = Number(template?.durationDays) || 0;
  const phases = sortedPhases(template);
  return Array.from({ length: durationDays }, (_, index) => index + 1)
    .some((day) => !phases.some((phase) => phase.startDay <= day && phase.endDay >= day));
}

export default function DoctorRecoveryPlanTemplateEditorPage({ templateId }) {
  const { showToast, confirmAction } = useFeedback();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [createPhaseOpen, setCreatePhaseOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState(null);
  const [createNutrientFor, setCreateNutrientFor] = useState(null);
  const [editingNutrient, setEditingNutrient] = useState(null);
  const [createFoodFor, setCreateFoodFor] = useState(null);
  const [editingFood, setEditingFood] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  async function refreshTemplate() {
    const response = await doctorRecoveryPlanTemplatesApi.get(templateId);
    setTemplate(response?.data ?? null);
  }

  async function load() {
    setLoading(true);
    setError("");
    setNotFound(false);
    try {
      await refreshTemplate();
    } catch (requestError) {
      if (requestError?.status === 404 || getApiErrorCode(requestError) === "NOT_FOUND") {
        setNotFound(true);
      } else {
        setError(getRecoveryPlanTemplateErrorMessage(requestError, "Chưa thể tải kế hoạch mẫu."));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => void load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  async function runMutation({ key, action, successTitle, close, failureTitle }) {
    setBusy(key);
    try {
      await action();
      await refreshTemplate();
      close?.();
      showToast({ type: "success", title: successTitle });
    } catch (requestError) {
      showToast({
        type: "error",
        title: failureTitle,
        message: getRecoveryPlanTemplateErrorMessage(requestError),
      });
      if (getApiErrorCode(requestError) === "NOT_FOUND") {
        close?.();
        await load();
      }
    } finally {
      setBusy("");
    }
  }

  function handleUpdateHeader(payload) {
    return runMutation({
      key: "update-header",
      action: () => doctorRecoveryPlanTemplatesApi.update(templateId, payload),
      successTitle: "Đã cập nhật kế hoạch mẫu",
      failureTitle: "Không thể cập nhật kế hoạch mẫu",
      close: () => setEditOpen(false),
    });
  }

  function handleCreatePhase(payload) {
    return runMutation({
      key: "create-phase",
      action: () => doctorRecoveryPlanTemplatesApi.createPhase(templateId, payload),
      successTitle: "Đã thêm giai đoạn",
      failureTitle: "Không thể thêm giai đoạn",
      close: () => setCreatePhaseOpen(false),
    });
  }

  function handleUpdatePhase(payload) {
    return runMutation({
      key: "update-phase",
      action: () => doctorRecoveryPlanTemplatesApi.updatePhase(templateId, editingPhase.id, payload),
      successTitle: "Đã cập nhật giai đoạn",
      failureTitle: "Không thể cập nhật giai đoạn",
      close: () => setEditingPhase(null),
    });
  }

  async function handleDeletePhase(phase) {
    const confirmed = await confirmAction({
      title: `Xóa giai đoạn “${phase.phaseName || "này"}”?`,
      message: "Toàn bộ dưỡng chất và nguồn thực phẩm bên trong cũng sẽ bị xóa.",
      confirmLabel: "Xóa giai đoạn",
    });
    if (!confirmed) return;
    await runMutation({
      key: `delete-${phase.id}`,
      action: () => doctorRecoveryPlanTemplatesApi.removePhase(templateId, phase.id),
      successTitle: "Đã xóa giai đoạn",
      failureTitle: "Không thể xóa giai đoạn",
    });
  }

  function handleCreateNutrient(payload) {
    return runMutation({
      key: "create-nutrient",
      action: () => doctorRecoveryPlanTemplatesApi.createNutrient(templateId, createNutrientFor.phaseId, payload),
      successTitle: "Đã thêm dưỡng chất",
      failureTitle: "Không thể thêm dưỡng chất",
      close: () => setCreateNutrientFor(null),
    });
  }

  function handleUpdateNutrient(payload) {
    return runMutation({
      key: "update-nutrient",
      action: () => doctorRecoveryPlanTemplatesApi.updateNutrient(
        templateId,
        editingNutrient.phaseId,
        editingNutrient.nutrient.id,
        payload,
      ),
      successTitle: "Đã cập nhật dưỡng chất",
      failureTitle: "Không thể cập nhật dưỡng chất",
      close: () => setEditingNutrient(null),
    });
  }

  async function handleDeleteNutrient(phaseId, nutrient) {
    const confirmed = await confirmAction({
      title: `Xóa dưỡng chất “${nutrient.nutrientName || "này"}”?`,
      message: "Toàn bộ nguồn thực phẩm bên trong cũng sẽ bị xóa.",
      confirmLabel: "Xóa dưỡng chất",
    });
    if (!confirmed) return;
    await runMutation({
      key: `delete-${nutrient.id}`,
      action: () => doctorRecoveryPlanTemplatesApi.removeNutrient(templateId, phaseId, nutrient.id),
      successTitle: "Đã xóa dưỡng chất",
      failureTitle: "Không thể xóa dưỡng chất",
    });
  }

  function handleCreateFood(payload) {
    return runMutation({
      key: "create-food",
      action: () => doctorRecoveryPlanTemplatesApi.createFood(
        templateId,
        createFoodFor.phaseId,
        createFoodFor.nutrientId,
        payload,
      ),
      successTitle: "Đã thêm nguồn thực phẩm",
      failureTitle: "Không thể thêm nguồn thực phẩm",
      close: () => setCreateFoodFor(null),
    });
  }

  function handleUpdateFood(payload) {
    return runMutation({
      key: "update-food",
      action: () => doctorRecoveryPlanTemplatesApi.updateFood(
        templateId,
        editingFood.phaseId,
        editingFood.nutrientId,
        editingFood.food.id,
        payload,
      ),
      successTitle: "Đã cập nhật nguồn thực phẩm",
      failureTitle: "Không thể cập nhật nguồn thực phẩm",
      close: () => setEditingFood(null),
    });
  }

  async function handleDeleteFood(phaseId, nutrientId, food) {
    const confirmed = await confirmAction({
      title: `Xóa nguồn thực phẩm “${food.foodName || "này"}”?`,
      message: "Không thể hoàn tác sau khi xóa.",
      confirmLabel: "Xóa thực phẩm",
    });
    if (!confirmed) return;
    await runMutation({
      key: `delete-${food.id}`,
      action: () => doctorRecoveryPlanTemplatesApi.removeFood(templateId, phaseId, nutrientId, food.id),
      successTitle: "Đã xóa nguồn thực phẩm",
      failureTitle: "Không thể xóa nguồn thực phẩm",
    });
  }

  async function handleDeleteTemplate() {
    const confirmed = await confirmAction({
      title: `Xóa kế hoạch mẫu “${template?.templateName || "này"}”?`,
      message: "Mẫu sẽ bị xóa khỏi thư viện. Các kế hoạch bệnh nhân đã tạo từ mẫu không bị ảnh hưởng.",
      confirmLabel: "Xóa kế hoạch mẫu",
    });
    if (!confirmed) return;
    setBusy("delete-template");
    try {
      await doctorRecoveryPlanTemplatesApi.remove(templateId);
      showToast({ type: "success", title: "Đã xóa kế hoạch mẫu" });
      navigate("/app/staff/recovery-plan-templates");
    } catch (requestError) {
      showToast({ type: "error", title: "Không thể xóa kế hoạch mẫu", message: getRecoveryPlanTemplateErrorMessage(requestError) });
    } finally {
      setBusy("");
    }
  }

  if (loading) return <div className="doctor-plan-page"><LoadingState label="Đang tải kế hoạch mẫu…" /></div>;
  if (notFound) {
    return (
      <div className="doctor-plan-page">
        <ErrorState
          urgent
          title="Không tìm thấy kế hoạch mẫu"
          description="Mẫu không tồn tại, đã bị xóa hoặc không thuộc tài khoản bác sĩ này."
          action={<Button onClick={() => navigate("/app/staff/recovery-plan-templates")}>Về thư viện</Button>}
        />
      </div>
    );
  }
  if (error || !template) {
    return (
      <div className="doctor-plan-page">
        <ErrorState title="Không thể tải kế hoạch mẫu" description={error} action={<Button onClick={load}>Thử lại</Button>} />
      </div>
    );
  }

  const phases = sortedPhases(template);
  const gaps = findCoverageGaps(phases, template.durationDays);
  const canAddPhase = hasAvailablePhaseDay(template);
  const DiseaseIcon = DISEASE_ICONS[template.diseaseGroup] ?? Files;

  return (
    <div className="doctor-plan-page">
      <button type="button" className="doctor-plan-back" onClick={() => navigate("/app/staff/recovery-plan-templates")}>
        <ArrowLeft size={16} aria-hidden="true" /> Kế hoạch mẫu
      </button>

      <header className="doctor-plan-header doctor-template-editor-header">
        <span className="doctor-plan-icon" aria-hidden="true"><DiseaseIcon size={26} /></span>
        <div>
          <p className="doctor-plan-eyebrow">Soạn kế hoạch mẫu · {RECOVERY_PLAN_DISEASE_GROUPS[template.diseaseGroup] || "Chưa phân loại"}</p>
          <h1>{template.templateName || "Chưa đặt tên mẫu"}</h1>
          <p>{template.planName || "Chưa đặt tên kế hoạch"}</p>
        </div>
        <Badge tone={template.isComplete ? "success" : "warning"}>{template.isComplete ? "Hoàn chỉnh" : "Đang soạn"}</Badge>
        <button type="button" className="doctor-plan-preview-trigger" onClick={() => setPreviewOpen(true)}>
          <Eye size={15} aria-hidden="true" /> Xem trước
        </button>
        <button type="button" className="doctor-plan-refresh" aria-label="Tải lại" onClick={load}>
          <RefreshCw size={16} aria-hidden="true" />
        </button>
      </header>

      <div className="doctor-plan-layout">
        <div className="doctor-plan-main">
          <section className="doctor-plan-card">
            <div className="doctor-plan-card-head">
              <p className="doctor-plan-card-heading">Thông tin mẫu</p>
              <Button tone="ghost" size="sm" onClick={() => setEditOpen(true)}>
                <Edit3 size={15} aria-hidden="true" /> Chỉnh sửa
              </Button>
            </div>
            <dl className="doctor-plan-grid">
              <div><dt>Tên kế hoạch</dt><dd>{template.planName || "Chưa cập nhật"}</dd></div>
              <div><dt>Số ngày thực hiện</dt><dd>{template.durationDays} ngày</dd></div>
              <div className="doctor-plan-grid-wide"><dt>Tóm tắt</dt><dd>{template.summary || "Chưa có tóm tắt."}</dd></div>
              <div className="doctor-plan-grid-wide"><dt>Hướng dẫn tái khám</dt><dd>{template.recheckInstruction || "Chưa có hướng dẫn."}</dd></div>
            </dl>
          </section>

          <section className="doctor-plan-card">
            <div className="doctor-plan-card-head">
              <p className="doctor-plan-card-heading">Giai đoạn điều trị</p>
              <Button
                tone="ghost"
                size="sm"
                disabled={!canAddPhase}
                title={canAddPhase ? undefined : "Mọi ngày trong kế hoạch đã được phân vào giai đoạn."}
                onClick={() => setCreatePhaseOpen(true)}
              >
                <Plus size={15} aria-hidden="true" /> Thêm giai đoạn
              </Button>
            </div>
            {phases.length === 0 ? (
              <div className="doctor-plan-phases-empty">
                <span className="doctor-plan-phases-icon" aria-hidden="true"><Layers size={22} /></span>
                <p className="doctor-plan-empty-note">Chưa có giai đoạn nào. Thêm giai đoạn, dưỡng chất và nguồn thực phẩm để hoàn thiện mẫu.</p>
              </div>
            ) : (
              <ul className="doctor-plan-phase-list">
                {phases.map((phase) => (
                  <PhaseRow
                    key={phase.id}
                    phase={phase}
                    isDraft
                    phaseBusy={busy}
                    onEditPhase={setEditingPhase}
                    onDeletePhase={handleDeletePhase}
                    onAddNutrient={(phaseId, existingCount) => setCreateNutrientFor({ phaseId, existingCount })}
                    onEditNutrient={(phaseId, nutrient) => setEditingNutrient({ phaseId, nutrient })}
                    onDeleteNutrient={handleDeleteNutrient}
                    nutrientBusy={busy}
                    onAddFood={(phaseId, nutrientId, existingCount) => setCreateFoodFor({ phaseId, nutrientId, existingCount })}
                    onEditFood={(phaseId, nutrientId, food) => setEditingFood({ phaseId, nutrientId, food })}
                    onDeleteFood={handleDeleteFood}
                    foodBusy={busy}
                  />
                ))}
              </ul>
            )}

            {phases.length > 0 && gaps.length > 0 && (
              <div className="doctor-plan-phase-gaps">
                <AlertTriangle size={14} aria-hidden="true" />
                <span>
                  Chưa phủ hết {template.durationDays} ngày của kế hoạch mẫu — còn thiếu:{" "}
                  {gaps.map((gap) => (gap.start === gap.end ? `ngày ${gap.start}` : `ngày ${gap.start}–${gap.end}`)).join(", ")}.
                </span>
              </div>
            )}
          </section>

          <section className="doctor-plan-card doctor-plan-publish-card">
            <p className="doctor-plan-card-heading">Mức độ hoàn thiện</p>
            <PlanCompletionChecklist
              plan={template}
              onEditPlan={() => setEditOpen(true)}
              onAddPhase={() => setCreatePhaseOpen(true)}
              onEditPhase={setEditingPhase}
              onAddNutrient={(phaseId, existingCount) => setCreateNutrientFor({ phaseId, existingCount })}
              onAddFood={(phaseId, nutrientId, existingCount) => setCreateFoodFor({ phaseId, nutrientId, existingCount })}
            />
            <div className="doctor-plan-publish-actions">
              <Button tone="ghost" onClick={() => setPreviewOpen(true)}>
                <Eye size={16} aria-hidden="true" /> Xem trước
              </Button>
            </div>
          </section>

          <div className="doctor-plan-danger-zone">
            <div className="doctor-plan-danger-header">
              <AlertTriangle size={15} aria-hidden="true" />
              <div>
                <p className="doctor-plan-danger-title">Xóa kế hoạch mẫu</p>
                <p className="doctor-plan-danger-desc">Kế hoạch bệnh nhân đã tạo từ mẫu sẽ không bị thay đổi.</p>
              </div>
            </div>
            <button type="button" className="doctor-plan-danger-action" disabled={Boolean(busy)} onClick={handleDeleteTemplate}>
              <span className="doctor-plan-danger-action-icon" aria-hidden="true"><Trash2 size={18} /></span>
              <span className="doctor-plan-danger-action-body"><strong>Xóa khỏi thư viện</strong><p>Không thể hoàn tác sau khi xóa.</p></span>
            </button>
          </div>
        </div>

        <aside className="doctor-plan-sidebar">
          <section className="doctor-plan-side-card">
            <p className="doctor-plan-side-heading"><Activity size={13} aria-hidden="true" /> Trạng thái</p>
            <Badge tone={template.isComplete ? "success" : "warning"}>{template.isComplete ? "Hoàn chỉnh" : "Đang soạn"}</Badge>
            {!template.isComplete && <p className="doctor-template-side-note">Mẫu đang soạn vẫn có thể dùng để tạo bản nháp cho bệnh nhân.</p>}
          </section>
          <section className="doctor-plan-side-card">
            <p className="doctor-plan-side-heading"><Info size={13} aria-hidden="true" /> Thông tin nhanh</p>
            <dl className="doctor-plan-quick-info">
              <div><dt>Mã mẫu</dt><dd>{formatShortId(template.id)}</dd></div>
              <div><dt>Nhóm bệnh</dt><dd>{RECOVERY_PLAN_DISEASE_GROUPS[template.diseaseGroup] || "Chưa phân loại"}</dd></div>
              <div><dt>Số giai đoạn</dt><dd>{phases.length}</dd></div>
            </dl>
          </section>
        </aside>
      </div>

      {previewOpen && (
        <Dialog
          backdropClassName="doctor-plan-modal-backdrop"
          className="doctor-template-picker-modal"
          labelledBy="doctor-template-editor-preview-title"
          onClose={() => setPreviewOpen(false)}
        >
          <header className="doctor-plan-modal-header doctor-template-picker-header">
            <span aria-hidden="true"><Eye size={20} /></span>
            <div>
              <h2 id="doctor-template-editor-preview-title">Xem trước kế hoạch mẫu</h2>
              <p>{template.templateName || "Chưa đặt tên mẫu"}</p>
            </div>
            <button type="button" aria-label="Đóng" onClick={() => setPreviewOpen(false)}><X size={20} aria-hidden="true" /></button>
          </header>
          <TemplatePreview template={template} onBack={() => setPreviewOpen(false)} />
        </Dialog>
      )}

      {editOpen && <TemplateHeaderDialog template={template} submitting={busy === "update-header"} onClose={() => setEditOpen(false)} onSubmit={handleUpdateHeader} />}
      {createPhaseOpen && <PhaseFormDialog plan={template} submitting={busy === "create-phase"} phaseNameMaxLength={200} instructionMaxLength={2000} onClose={() => setCreatePhaseOpen(false)} onSubmit={handleCreatePhase} />}
      {editingPhase && <PhaseFormDialog plan={template} phase={editingPhase} submitting={busy === "update-phase"} phaseNameMaxLength={200} instructionMaxLength={2000} onClose={() => setEditingPhase(null)} onSubmit={handleUpdatePhase} />}
      {createNutrientFor && <NutrientFormDialog existingCount={createNutrientFor.existingCount} submitting={busy === "create-nutrient"} onClose={() => setCreateNutrientFor(null)} onSubmit={handleCreateNutrient} />}
      {editingNutrient && <NutrientFormDialog nutrient={editingNutrient.nutrient} submitting={busy === "update-nutrient"} onClose={() => setEditingNutrient(null)} onSubmit={handleUpdateNutrient} />}
      {createFoodFor && <FoodFormDialog existingCount={createFoodFor.existingCount} submitting={busy === "create-food"} onClose={() => setCreateFoodFor(null)} onSubmit={handleCreateFood} />}
      {editingFood && <FoodFormDialog food={editingFood.food} submitting={busy === "update-food"} onClose={() => setEditingFood(null)} onSubmit={handleUpdateFood} />}
    </div>
  );
}
