// All filtering and ranking happens before pagination over the public active catalog.
export const RADIUS_STEPS = [5, 10, 15, 20, 25, 50, 100, 250, 500, 1000];
// Screen-space groups are derived only from the current visible page.
export function clusterFacilities(facilities, zoom) {
  const scale = 512 * 2 ** zoom;
  const groups = [];
  for (const f of facilities) {
    const x = (f.longitude + 180) / 360 * scale;
    const sin = Math.sin(f.latitude * Math.PI / 180);
    const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;
    const group = zoom < 17 ? groups.find((g) => Math.hypot(g.x - x, g.y - y) < 52) : null;
    if (group) {
      group.items.push(f); group.ids.push(String(f.facilityId));
    } else groups.push({ x, y, longitude:f.longitude, latitude:f.latitude, items:[f], ids:[String(f.facilityId)] });
  }
  return groups;
}
const text = (value) => String(value ?? "").toLocaleLowerCase("vi").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
const id = (item) => String(item.facilityId);
export function distanceFrom(location, facility) {
  if (!location || !facility.hasValidCoordinates) return null;
  const rad = (n) => n * Math.PI / 180;
  const a = Math.sin(rad(facility.latitude - location.lat) / 2) ** 2
    + Math.cos(rad(location.lat)) * Math.cos(rad(facility.latitude))
    * Math.sin(rad(facility.longitude - location.lng) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}
export const hasRating = (item) => Number.isFinite(item.averageRating)
  && item.averageRating >= 0 && item.averageRating <= 5
  && Number.isInteger(item.reviewCount) && item.reviewCount > 0;
export function discoverFacilities(catalog, { search = "", departmentId = "all", type = "all",
  mode = "all", radiusKm = 5, sort = "rating", location = null } = {}) {
  const query = text(search.trim());
  let items = catalog.filter((f) => f.isActive !== false
    && (departmentId === "all" || !departmentId || f.departmentIds?.map(String).includes(String(departmentId)))
    && (type === "all" || f.facilityTypeKey === type)
    && (!query || text(f.facilityName + " " + f.address).includes(query)))
    .map((f) => ({ ...f, distanceKm: distanceFrom(location, f) }));
  const effectiveMode = location ? mode : "all";
  const radius = effectiveMode === "auto"
    ? RADIUS_STEPS.find((r) => items.some((f) => f.distanceKm !== null && f.distanceKm <= r)) ?? RADIUS_STEPS.at(-1)
    : effectiveMode === "nearby" ? Number(radiusKm) : null;
  if (radius !== null) items = items.filter((f) => f.distanceKm !== null && f.distanceKm <= radius);
  const distance = (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
  const name = (a, b) => a.facilityName.localeCompare(b.facilityName, "vi") || id(a).localeCompare(id(b));
  const rating = (a, b) => Number(hasRating(b)) - Number(hasRating(a))
    || (hasRating(a) && hasRating(b) ? b.averageRating - a.averageRating || b.reviewCount - a.reviewCount : 0);
  const effectiveSort = sort === "nearest" && !location ? "name" : sort;
  items.sort((a, b) => effectiveSort === "name" ? name(a, b)
    : effectiveSort === "nearest" ? distance(a, b) || rating(a, b) || name(a, b)
    : rating(a, b) || distance(a, b) || (hasRating(a) && hasRating(b) ? id(a).localeCompare(id(b)) : name(a, b)));
  const sortLabel = effectiveSort === "name" ? "Tên cơ sở A–Z"
    : effectiveSort === "nearest" ? "Khoảng cách gần → xa"
    : items.some(hasRating) ? "Đánh giá cao trước · số lượt đánh giá"
    : location ? "Chưa có đánh giá · khoảng cách gần → xa" : "Chưa có đánh giá · tên cơ sở A–Z";
  return { items, radius, sortLabel };
}
