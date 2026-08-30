export const DEFAULT_NEARBY_RADIUS_KM = 7;
export const NEARBY_LIMIT = 20;
export function buildNearbyQuery({ latitude, longitude, radiusKm = DEFAULT_NEARBY_RADIUS_KM, departmentId, limit = NEARBY_LIMIT }) {
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90
    || !Number.isFinite(longitude) || Math.abs(longitude) > 180
    || !Number.isFinite(radiusKm) || radiusKm <= 0
    || !Number.isInteger(limit) || limit <= 0) throw new Error("Thông tin tìm kiếm gần bạn không hợp lệ.");
  const params = new URLSearchParams({ latitude, longitude, radiusKm, limit });
  if (departmentId && departmentId !== "all") params.set("departmentId", departmentId);
  return params.toString();
}
