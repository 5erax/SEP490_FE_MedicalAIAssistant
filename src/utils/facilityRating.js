// Aggregate all feedback on the server, never average a paginated review list.
export function getFacilityRating(facility) {
  const count = Number(facility?.reviewCount);
  if (facility?.reviewCount == null || !Number.isInteger(count) || count < 0) return { average: null, count: null };
  const average = Number(facility?.averageRating);
  return { count, average: count > 0 && facility?.averageRating != null
    && Number.isFinite(average) && average >= 1 && average <= 5 ? average : null };
}

export function formatFacilityRating(facility) {
  const { average, count } = getFacilityRating(facility);
  if (count === 0) return "Chưa có đánh giá";
  if (average === null) return "Chưa có điểm đánh giá";
  return `${average.toFixed(1)}/5 · ${count} đánh giá`;
}

export function rankFacilitiesByReviewQuality(facilities) {
  return [...facilities].sort((left, right) => {
    const leftRating = getFacilityRating(left);
    const rightRating = getFacilityRating(right);
    const averageDifference = (rightRating.average ?? -1) - (leftRating.average ?? -1);
    if (averageDifference) return averageDifference;
    const countDifference = (rightRating.count ?? -1) - (leftRating.count ?? -1);
    if (countDifference) return countDifference;
    const distanceDifference = (Number.isFinite(left.distanceKm) ? left.distanceKm : Infinity)
      - (Number.isFinite(right.distanceKm) ? right.distanceKm : Infinity);
    if (distanceDifference) return distanceDifference;
    return String(left.facilityName ?? "").localeCompare(String(right.facilityName ?? ""), "vi");
  });
}
