import { Check, ChevronRight, X } from "lucide-react";
import { getPlanCompletionChecklist, sortPlanItems } from "../../utils/planCompletion";

export default function PlanCompletionChecklist({
  plan,
  onEditPlan,
  onAddPhase,
  onEditPhase,
  onAddNutrient,
  onAddFood,
}) {
  const checklist = getPlanCompletionChecklist(plan);

  function openMissingItemForm(item) {
    if (item.done) return;

    if (item.key === "summary") {
      onEditPlan();
      return;
    }

    if (item.key === "coverage") {
      onAddPhase();
      return;
    }

    if (item.key === "sleep-rest") {
      item.target ? onEditPhase(item.target) : onAddPhase();
      return;
    }

    if (item.key === "nutrients") {
      const targetPhase = item.target;
      targetPhase
        ? onAddNutrient(targetPhase.id, sortPlanItems(targetPhase.nutrientTargets).length)
        : onAddPhase();
      return;
    }

    if (item.key === "foods") {
      if (!item.target) {
        onAddPhase();
      } else if (item.target.type === "nutrient") {
        onAddNutrient(item.target.phase.id, sortPlanItems(item.target.phase.nutrientTargets).length);
      } else {
        onAddFood(
          item.target.phaseId,
          item.target.nutrient.id,
          sortPlanItems(item.target.nutrient.foodSources).length,
        );
      }
    }
  }

  return (
    <ul className="doctor-plan-checklist">
      {checklist.map((item) => (
        <li key={item.key} className={item.done ? "is-done" : "is-blocked"}>
          {item.done ? (
            <>
              <span className="doctor-plan-checklist-icon" aria-hidden="true"><Check size={13} /></span>
              <span>{item.label}</span>
            </>
          ) : (
            <button type="button" onClick={() => openMissingItemForm(item)} aria-label={`Bổ sung: ${item.label}`}>
              <span className="doctor-plan-checklist-icon" aria-hidden="true"><X size={13} /></span>
              <span className="doctor-plan-checklist-content">
                <span>{item.label}</span>
                {item.detail && <em>{item.detail}</em>}
              </span>
              <ChevronRight className="doctor-plan-checklist-arrow" size={17} aria-hidden="true" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
