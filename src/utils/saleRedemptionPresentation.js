export function getRedemptionDate(item) {
  const status = String(item?.status ?? "").toLowerCase();
  if (status === "completed") return item.completedAt || item.reservedAt;
  if (status === "released") return item.releasedAt || item.reservedAt;
  return item?.reservedAt;
}

export function hasRedemptionPriceDiscount(item) {
  if (item?.finalPrice == null || item?.originalPrice == null) return false;
  const finalPrice = Number(item.finalPrice);
  const originalPrice = Number(item.originalPrice);
  return Number.isFinite(finalPrice) && Number.isFinite(originalPrice)
    && finalPrice < originalPrice;
}
