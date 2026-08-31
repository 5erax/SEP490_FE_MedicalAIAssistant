// These fields belong to the symptom-analysis contract, not a general probability API.
export function readRankingScore(diagnosis) {
  const value = diagnosis?.pAGivenB ?? diagnosis?.PAGivenB
    ?? diagnosis?.confidenceScore ?? diagnosis?.ConfidenceScore;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1
    ? value : null;
}

const normalizedName = (value) => String(value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");

export function getSpecialtyExplanation(department, diagnoses = []) {
  const reason = String(department?.reason ?? "").trim();
  const sourceId = department?.sourceDiagnosisId;
  // A specialty's source need not be the highest-ranked diagnosis. Never fall back to diagnoses[0].
  const matches = sourceId
    ? diagnoses.filter((item) => item.id && String(item.id) === String(sourceId))
    : reason ? diagnoses.filter((item) => normalizedName(item.diseaseName) === normalizedName(reason)) : [];
  const source = matches.length === 1 ? matches[0] : null;
  return {
    relatedResult: source?.diseaseName || reason,
    reasoning: source?.clinicalReasoning || "",
    summary: reason
      ? `Gợi ý chuyên khoa này có liên quan đến kết quả tham khảo “${source?.diseaseName || reason}” trong lần phân tích của bạn. Đây chưa phải chẩn đoán.`
      : "Đây là chuyên khoa được hệ thống gợi ý để bạn tham khảo khi chọn nơi khám. Chưa có căn cứ giải thích chi tiết cho gợi ý này.",
  };
}
