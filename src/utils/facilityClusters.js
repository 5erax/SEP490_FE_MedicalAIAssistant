// Screen-space grid in Web Mercator, recalculated only when the zoom level changes.
export function clusterFacilities(facilities, zoom, selectedId) {
  const level = Math.floor(zoom);
  if (level >= 14) return facilities.map((facility) => ({ id: facility.facilityId, members: [facility], longitude: facility.longitude, latitude: facility.latitude }));
  const scale = 512 * 2 ** level;
  const cells = new Map();
  for (const facility of facilities) {
    const lat = Math.max(-85.0511, Math.min(85.0511, facility.latitude));
    const sin = Math.sin(lat * Math.PI / 180);
    const x = (facility.longitude + 180) / 360 * scale;
    const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;
    const key = facility.facilityId === selectedId ? `selected-${selectedId}` : `${Math.floor(x / 64)}:${Math.floor(y / 64)}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(facility);
  }
  return Array.from(cells, ([id, members]) => ({ id, members,
    longitude: members.reduce((sum, item) => sum + item.longitude, 0) / members.length,
    latitude: members.reduce((sum, item) => sum + item.latitude, 0) / members.length,
  }));
}
