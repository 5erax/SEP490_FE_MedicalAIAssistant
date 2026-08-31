export function resolveExplorerSideMode({ selectedMode, isClinicalFlow, clinicalStatus, recommendedDepartment }) {
  // Resolve late-arriving recommendations without overriding an explicit tab/filter choice.
  if (selectedMode != null) return selectedMode;
  const hasRecommendation = Boolean(
    String(recommendedDepartment?.departmentId ?? "").trim()
    || String(recommendedDepartment?.departmentName ?? "").trim(),
  );
  return isClinicalFlow && clinicalStatus === "ready" && hasRecommendation ? "advice" : "list";
}
