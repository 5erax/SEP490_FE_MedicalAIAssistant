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
  const departmentName = String(department?.departmentName ?? "").trim();
  const specialtyName = departmentName.replace(/^khoa\s+/i, "") || "phù hợp";
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
      ? `Các triệu chứng bạn cung cấp có thể liên quan đến chuyên khoa ${specialtyName}. Kết quả tham khảo “${source?.diseaseName || reason}” là một căn cứ để hệ thống đưa ra gợi ý này. Đây không phải chẩn đoán.`
      : `Các triệu chứng bạn cung cấp có thể liên quan đến chuyên khoa ${specialtyName}. Bạn có thể cân nhắc chuyên khoa này khi chọn nơi khám; đây không phải chẩn đoán.`,
  };
}
