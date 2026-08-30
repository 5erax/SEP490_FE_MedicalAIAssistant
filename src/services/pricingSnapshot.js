function snapshotNumber(value) {
  if (value == null || String(value).trim() === "") return NaN;
  return Number(value);
}

export function getPricingSnapshot(planOffer) {
  if (!planOffer) return null;
  const effectivePrice = snapshotNumber(planOffer.effectivePrice);
  const grantedCredit = snapshotNumber(planOffer.grantedCredit);
  if (!Number.isFinite(effectivePrice) || effectivePrice < 0
    || !Number.isInteger(grantedCredit) || grantedCredit < 0) return null;
  return {
    offerId: planOffer.offer?.offerId ?? null,
    effectivePrice,
    grantedCredit,
  };
}

export function isSamePricingSnapshot(current, latest) {
  const a = getPricingSnapshot(current);
  const b = getPricingSnapshot(latest);
  return Boolean(a && b && a.offerId === b.offerId
    && a.effectivePrice === b.effectivePrice && a.grantedCredit === b.grantedCredit);
}

export function buildCheckoutBody(planId, autoRenew = false, planOffer = null) {
  const body = { planId, autoRenew };
  // Omitted wrapper preserves the legacy API for non-Pricing callers only.
  // A wrapper with offer:null is still a strict snapshot, never legacy mode.
  if (planOffer != null) {
    const snapshot = getPricingSnapshot(planOffer);
    if (!snapshot || (planOffer.plan?.id && planOffer.plan.id !== planId)) {
      throw new Error("Không thể xác nhận giá và số lượt của gói. Vui lòng tải lại bảng giá.");
    }
    body.expectedOfferId = snapshot.offerId;
    body.expectedEffectivePrice = snapshot.effectivePrice;
    body.expectedGrantedCredit = snapshot.grantedCredit;
  }
  return body;
}
