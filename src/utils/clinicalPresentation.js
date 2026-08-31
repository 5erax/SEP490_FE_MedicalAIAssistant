// Keep the API's existing fractional/percentage convention; never invent a score.
export function clinicalConfidencePercent(value) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const score = Number(value);
  if (!Number.isFinite(score) || score < 0) return null;
  return Math.min(100, Math.round(score <= 1 ? score * 100 : score));
}

export function clinicalText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function hasClinicalPriority(department) {
  const value = department?.isEmergencySuggested ?? department?.IsEmergencySuggested;
  return value === true || (typeof value === "string" && value.toLowerCase() === "true");
}
