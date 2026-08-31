export const DEFAULT_NEARBY_RADIUS_KM = 7;
export const NEARBY_LIMIT = 20;
export const SPECIALTY_NEARBY_RADII = [1, 3, 5];

// A bounded, read-only search. Errors must never be treated as an empty radius.
export async function findNearbySpecialtyFacilities(fetchNearby, filters, signal) {
  for (const radiusKm of SPECIALTY_NEARBY_RADII) {
    signal?.throwIfAborted();
    const response = await fetchNearby({ ...filters, radiusKm, limit: 5 }, signal);
    signal?.throwIfAborted();
    if (response?.success === false || !Array.isArray(response?.data)) {
      throw new Error("Invalid nearby response");
    }
    const items = response.data;
    if (items.some((item) => !item || !(item.id || item.facilityId) || item.isActive === false
      || item.latitude == null || item.longitude == null
      || String(item.latitude).trim() === "" || String(item.longitude).trim() === ""
      || !Number.isFinite(Number(item.latitude)) || Math.abs(Number(item.latitude)) > 90
      || !Number.isFinite(Number(item.longitude)) || Math.abs(Number(item.longitude)) > 180
      || !Number.isFinite(item.distanceKm) || item.distanceKm < 0 || item.distanceKm > radiusKm
      || (filters.departmentId && filters.departmentId !== "all"
        && (!Array.isArray(item.departments) || !item.departments.some((department) => String(department?.departmentId).toLowerCase() === String(filters.departmentId).toLowerCase()))))) {
      throw new Error("Invalid nearby facility");
    }
    if (items.length || radiusKm === SPECIALTY_NEARBY_RADII.at(-1)) {
      return { items: [...items].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 5), radiusKm };
    }
  }
}
// The active endpoint returns the complete, unpaginated facility catalog.
// Rank it without imposing a radius; omit facilities without usable coordinates.
export function rankNearestFacilities(items, latitude, longitude) {
  const coordinate = (value, max) => value !== null && value !== undefined && String(value).trim() !== ""
    && Number.isFinite(Number(value)) && Math.abs(Number(value)) <= max;
  if (!coordinate(latitude, 90) || !coordinate(longitude, 180)) throw new Error("Invalid location");
  const radians = (value) => value * Math.PI / 180;
  return items.filter((item) => item.isActive !== false && coordinate(item.latitude, 90) && coordinate(item.longitude, 180))
    .map((item) => {
      const dLat = radians(Number(item.latitude) - latitude);
      const dLng = radians(Number(item.longitude) - longitude);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(latitude)) * Math.cos(radians(Number(item.latitude))) * Math.sin(dLng / 2) ** 2;
      return { ...item, distanceKm: 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a)))) };
    }).sort((a, b) => a.distanceKm - b.distanceKm);
}
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
