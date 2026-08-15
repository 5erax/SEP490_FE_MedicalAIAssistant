export function recoveryPlanNeedsFeedback(plan) {
  return (
    String(plan?.status ?? "").trim().toLowerCase() === "completed"
    && !plan?.feedbackSubmittedAt
  );
}

function completedAtTime(plan) {
  const value = plan?.completedAt || plan?.endDate || "";
  if (!value) return 0;
  const time = Date.parse(String(value).length === 10 ? `${value}T00:00:00Z` : value);
  return Number.isFinite(time) ? time : 0;
}

export function findLatestRecoveryPlanAwaitingFeedback(plans, dismissedPlanIds = new Set()) {
  return [...(Array.isArray(plans) ? plans : [])]
    .filter((plan) => (
      recoveryPlanNeedsFeedback(plan)
      && plan?.id
      && !dismissedPlanIds.has(plan.id)
    ))
    .sort((left, right) => completedAtTime(right) - completedAtTime(left))[0] ?? null;
}
