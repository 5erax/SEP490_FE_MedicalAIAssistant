export function sortPlanItems(value, field = "sortOrder") {
  return Array.isArray(value)
    ? value.slice().sort((left, right) => (left[field] ?? 0) - (right[field] ?? 0))
    : [];
}

export function findCoverageGaps(phases, durationDays) {
  if (!durationDays) return [];
  const orderedPhases = sortPlanItems(phases, "startDay")
    .filter((item) => item.startDay != null && item.endDay != null);
  const gaps = [];
  let cursor = 1;

  for (const phase of orderedPhases) {
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

export function getPlanCompletionChecklist(plan) {
  const phases = sortPlanItems(plan?.phases, "startDay");
  const gaps = findCoverageGaps(phases, plan?.durationDays);
  const phaseLabel = (phase, index) => phase.phaseName || `giai đoạn ${index + 1}`;
  const missingSleepRest = phases.filter((phase) => phase.sleepAndRestHoursPerDay == null);
  const phasesWithoutNutrients = phases.filter((phase) => sortPlanItems(phase.nutrientTargets).length === 0);
  const allNutrients = [];
  const nutrientsWithoutFood = [];

  phases.forEach((phase) => {
    sortPlanItems(phase.nutrientTargets).forEach((nutrient) => {
      allNutrients.push(nutrient);
      if (sortPlanItems(nutrient.foodSources).length === 0) {
        nutrientsWithoutFood.push({
          type: "food",
          phaseId: phase.id,
          nutrient,
          label: nutrient.nutrientName || "dưỡng chất chưa đặt tên",
        });
      }
    });
  });

  return [
    {
      key: "summary",
      label: "Có tóm tắt và hướng dẫn tái khám",
      done: Boolean(plan?.summary?.trim()) && Boolean(plan?.recheckInstruction?.trim()),
    },
    {
      key: "coverage",
      label: `Có ít nhất 1 giai đoạn, phủ kín ${plan?.durationDays ? `${plan.durationDays} ngày` : "toàn bộ thời lượng"} của kế hoạch`,
      done: phases.length > 0 && gaps.length === 0,
    },
    {
      key: "sleep-rest",
      label: "Mỗi giai đoạn có tổng giờ ngủ nghỉ",
      done: phases.length > 0 && missingSleepRest.length === 0,
      target: missingSleepRest[0] || null,
      detail: missingSleepRest.length > 0
        ? `Còn thiếu ở: ${missingSleepRest.map(phaseLabel).join(", ")}`
        : null,
    },
    {
      key: "nutrients",
      label: "Mỗi giai đoạn có ít nhất 1 dưỡng chất",
      done: phases.length > 0 && phasesWithoutNutrients.length === 0,
      target: phasesWithoutNutrients[0] || null,
      detail: phasesWithoutNutrients.length > 0
        ? `Còn thiếu ở: ${phasesWithoutNutrients.map(phaseLabel).join(", ")}`
        : null,
    },
    {
      key: "foods",
      label: "Mỗi dưỡng chất có ít nhất 1 nguồn thực phẩm",
      done: allNutrients.length > 0 && nutrientsWithoutFood.length === 0,
      target: nutrientsWithoutFood[0] || (phasesWithoutNutrients[0]
        ? { type: "nutrient", phase: phasesWithoutNutrients[0] }
        : null),
      detail: nutrientsWithoutFood.length > 0
        ? `Còn thiếu ở: ${nutrientsWithoutFood.map((item) => item.label).join(", ")}`
        : null,
    },
  ];
}
