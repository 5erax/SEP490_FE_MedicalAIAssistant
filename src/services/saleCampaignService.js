import { apiRequest } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

function withPagination(path, pageNumber = 1, pageSize = 10) {
  const query = new URLSearchParams({
    PageNumber: String(pageNumber),
    PageSize: String(pageSize),
  });
  return `${path}?${query.toString()}`;
}

export const saleCampaignsApi = {
  list: (pageNumber = 1, pageSize = 10) => apiRequest(
    withPagination(ENDPOINTS.ADMIN_SALE_CAMPAIGNS.BASE, pageNumber, pageSize),
    { auth: true },
  ),
  get: (id) => apiRequest(ENDPOINTS.ADMIN_SALE_CAMPAIGNS.BY_ID(id), { auth: true }),
  create: (payload) => apiRequest(ENDPOINTS.ADMIN_SALE_CAMPAIGNS.BASE, {
    method: "POST", body: payload, auth: true,
  }),
  update: (id, payload) => apiRequest(ENDPOINTS.ADMIN_SALE_CAMPAIGNS.BY_ID(id), {
    method: "PUT", body: payload, auth: true,
  }),
  setStatus: (id, isActive) => apiRequest(ENDPOINTS.ADMIN_SALE_CAMPAIGNS.STATUS(id), {
    method: "PATCH", body: { isActive }, auth: true,
  }),
  remove: (id) => apiRequest(ENDPOINTS.ADMIN_SALE_CAMPAIGNS.BY_ID(id), {
    method: "DELETE", auth: true,
  }),
  redemptions: (id, pageNumber = 1, pageSize = 10) => apiRequest(
    withPagination(ENDPOINTS.ADMIN_SALE_CAMPAIGNS.REDEMPTIONS(id), pageNumber, pageSize),
    { auth: true },
  ),
};
