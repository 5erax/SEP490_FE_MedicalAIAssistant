export function withPagination(pageNumber = 1, pageSize = 10) {
  return new URLSearchParams({
    PageNumber: String(pageNumber),
    PageSize: String(pageSize),
  }).toString();
}

export function toQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.set(key, String(value));
  });
  return query.toString();
}
