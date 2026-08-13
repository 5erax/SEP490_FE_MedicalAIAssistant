import { findServiceCreditQuota } from "../services/serviceCredit";

export const PUBLIC_ACCESS_BENEFITS = [
  "Phân tích triệu chứng qua câu hỏi lâm sàng tham khảo",
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
};

function getQuotaBenefits(plan) {
  const quota = findServiceCreditQuota(plan);
  const limitValue = Number(quota?.limitValue);
  if (!Number.isFinite(limitValue) || limitValue < 0) return [];

  return [`${limitValue.toLocaleString("vi-VN")} lượt dùng chung cho kế hoạch phục hồi, tư vấn trước khám và phân tích xét nghiệm`];
}

export function getPlanBenefits(value) {
  if (!value) return [];

  try {
    if (typeof value === "object") return getQuotaBenefits(value);

    const rawLimits = value;
    const limits = typeof rawLimits === "string" ? JSON.parse(rawLimits) : rawLimits;
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
