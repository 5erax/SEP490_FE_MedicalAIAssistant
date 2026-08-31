export const FACILITY_PAGE_SIZE = 5;

export function paginateFacilities(items, requestedPage = 1) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / FACILITY_PAGE_SIZE));
  const page = Math.max(1, Math.min(totalPages, Math.trunc(Number(requestedPage)) || 1));
  const start = (page - 1) * FACILITY_PAGE_SIZE;
  return { page, total, totalPages, start: total ? start + 1 : 0,
    end: Math.min(start + FACILITY_PAGE_SIZE, total), items: items.slice(start, start + FACILITY_PAGE_SIZE) };
}

export function getFacilityPage(items, facilityId) {
  const index = items.findIndex((item) => String(item.facilityId) === String(facilityId));
  return index < 0 ? null : Math.floor(index / FACILITY_PAGE_SIZE) + 1;
}
