import { apiRequest, withPagination } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

function getPagedItems(response) {
  const data = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data)) return data;
  return [];
}

function getTotalPages(response, itemsLength, pageNumber, pageSize) {
  const data = response?.data?.data ?? response?.data ?? {};
  const explicitTotalPages = Number(data.totalPages ?? data.totalPage ?? data.pageCount);
  if (Number.isFinite(explicitTotalPages) && explicitTotalPages > 0) return explicitTotalPages;

  const totalCount = Number(data.totalCount ?? data.totalItems ?? data.count);
  if (Number.isFinite(totalCount) && totalCount > 0) return Math.ceil(totalCount / pageSize);

  return itemsLength < pageSize ? pageNumber : pageNumber + 1;
}

export const patientProfilesApi = {
  list(pageNumber = 1, pageSize = 50) {
    return apiRequest(`${ENDPOINTS.PATIENT_PROFILES.BASE}?${withPagination(pageNumber, pageSize)}`, { auth: true });
  },

  get(id) {
    return apiRequest(ENDPOINTS.PATIENT_PROFILES.BY_ID(id), { auth: true });
  },

  getByUserId(userId) {
    return apiRequest(ENDPOINTS.PATIENT_PROFILES.BY_USER(userId), { auth: true });
  },

  create(payload) {
    return apiRequest(ENDPOINTS.PATIENT_PROFILES.BASE, {
      method: "POST",
      body: payload,
      auth: true,
    });
  },

  update(id, payload) {
    return apiRequest(ENDPOINTS.PATIENT_PROFILES.BY_ID(id), {
      method: "PUT",
      body: payload,
      auth: true,
    });
  },

  remove(id) {
    return apiRequest(ENDPOINTS.PATIENT_PROFILES.BY_ID(id), {
      method: "DELETE",
      auth: true,
    });
  },

  async findByUserId(userId, pageNumber = 1, pageSize = 100) {
    if (!userId) return null;
    const wantedUserId = String(userId).toLowerCase();
    let currentPage = pageNumber;

    while (true) {
      const response = await this.list(currentPage, pageSize);
      const items = getPagedItems(response);
      const match = items.find((item) => String(item.userId).toLowerCase() === wantedUserId);
      if (match) return match;

      const totalPages = getTotalPages(response, items.length, currentPage, pageSize);
      if (currentPage >= totalPages) break;
      currentPage += 1;
    }

    return null;
  },
};
