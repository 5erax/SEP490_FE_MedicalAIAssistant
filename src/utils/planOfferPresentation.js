// Offer totals are authoritative: base-plan quotas exclude promotional credits.
export function getOfferBenefits(planOffer) {
  const rawCredit = planOffer?.grantedCredit;
  if (rawCredit == null || String(rawCredit).trim() === "") return [];
  const credit = Number(rawCredit);
  if (!Number.isInteger(credit) || credit < 0) return [];

  return [`${credit.toLocaleString("vi-VN")} lượt dùng chung cho kế hoạch phục hồi, tư vấn trước khám và phân tích xét nghiệm`];
}
