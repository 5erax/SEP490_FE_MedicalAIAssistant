export const DEFAULT_NEARBY_RADIUS_KM = 7;
export const NEARBY_LIMIT = 20;
export const NEARBY_RADII = [1, 3, 5, 7, 10, 15, 20, 30, 50];
export function getNextNearbyRadius(radiusKm) {
  return NEARBY_RADII.find((radius) => radius > radiusKm) ?? null;
}
export function buildNearbyQuery({ latitude, longitude, radiusKm = DEFAULT_NEARBY_RADIUS_KM, departmentId, limit = NEARBY_LIMIT }) {
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90
    || !Number.isFinite(longitude) || Math.abs(longitude) > 180
    || !Number.isFinite(radiusKm) || radiusKm <= 0
    || !Number.isInteger(limit) || limit <= 0) throw new Error("Thông tin tìm kiếm gần bạn không hợp lệ.");
  const params = new URLSearchParams({ latitude, longitude, radiusKm, limit });
  if (departmentId && departmentId !== "all") params.set("departmentId", departmentId);
  return params.toString();
}
