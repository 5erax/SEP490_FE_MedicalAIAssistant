export const PUBLIC_ACCESS_BENEFITS = [
  "Xem hướng dẫn mô tả triệu chứng",
  "Tìm cơ sở y tế trên bản đồ công khai",
  "Hỏi trợ lý AI trên trang chủ để tham khảo thông tin",
];

export function getPlanDisplayName(value) {
  const name = String(value || "").trim();
  if (!name) return "Gói chưa cập nhật tên";

  const normalized = name.toLowerCase().replace(/\s+/g, " ");
  if (/^medimate\s*(?:\+|plus)?\s*(?:tháng|hàng tháng|month|monthly)?$/.test(normalized)) {
    return "MediMate Plus";
  }

  return name.replace(/^medimate/i, "MediMate");
}

const FEATURE_LIMIT_LABELS = {
  symptomAnalysisPerMonth: (limit) => `${limit} lượt phân tích triệu chứng mỗi tháng`,
  aiChatPerDay: (limit) => `${limit} lượt trò chuyện với trợ lý AI mỗi ngày`,
  clinicalQuestionPerMonth: (limit) => `${limit} bộ câu hỏi lâm sàng mỗi tháng`,
  recoveryPlanPerMonth: (limit) => `${limit} kế hoạch phục hồi mỗi tháng`,
  medicationScanPerMonth: (limit) => `${limit} lượt kiểm tra thuốc mỗi tháng`,
};

export function getPlanBenefits(value) {
  if (!value) return [];

  try {
    const limits = typeof value === "string" ? JSON.parse(value) : value;
    if (!limits || Array.isArray(limits) || typeof limits !== "object") return [];

    return Object.entries(limits).flatMap(([key, limit]) => {
      const formatLabel = FEATURE_LIMIT_LABELS[key];
      if (!formatLabel || limit === null || limit === undefined || limit === "") return [];
      return [formatLabel(limit)];
    });
  } catch {
    return [];
  }
}
