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
