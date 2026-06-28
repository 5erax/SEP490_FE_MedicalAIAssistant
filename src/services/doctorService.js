import { apiRequest, withPagination } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

function buildDoctorQuery({
  pageNumber = 1,
  pageSize = 10,
  search = "",
  facilityId = "",
  departmentId = "",
  isActive = "",
  departmentRole = "",
} = {}) {
  const params = new URLSearchParams(withPagination(pageNumber, pageSize));

  if (search.trim()) params.set("search", search.trim());
  if (facilityId) params.set("facilityId", facilityId);
  if (departmentId) params.set("departmentId", departmentId);
  if (isActive !== "") params.set("isActive", String(isActive));
  if (departmentRole !== "") params.set("departmentRole", String(departmentRole));

  return params.toString();
}

export const doctorsApi = {
  list(pageNumber = 1, pageSize = 50) {
    return apiRequest(`${ENDPOINTS.DOCTORS.BASE}?${withPagination(pageNumber, pageSize)}`);
  },

  active() {
    return apiRequest(ENDPOINTS.DOCTORS.ACTIVE);
  },

  get(id) {
    return apiRequest(ENDPOINTS.DOCTORS.BY_ID(id));
  },

  create(payload) {
    return apiRequest(ENDPOINTS.DOCTORS.BASE, {
      method: "POST",
      body: payload,
      auth: true,
    });
  },

  update(id, payload) {
    return apiRequest(ENDPOINTS.DOCTORS.BY_ID(id), {
      method: "PUT",
      body: payload,
      auth: true,
    });
  },

  setStatus(id, isActive) {
    return apiRequest(ENDPOINTS.DOCTORS.STATUS(id), {
      method: "PATCH",
      body: { isActive },
      auth: true,
    });
  },

  remove(id) {
    return apiRequest(ENDPOINTS.DOCTORS.BY_ID(id), {
      method: "DELETE",
      auth: true,
    });
  },
};

export const doctorManagementApi = {
  list(filters = {}) {
    return apiRequest(`${ENDPOINTS.DOCTORS.BASE}?${buildDoctorQuery(filters)}`);
  },

  get: doctorsApi.get,
  create: doctorsApi.create,
  update: doctorsApi.update,
  setStatus: doctorsApi.setStatus,
  remove: doctorsApi.remove,
};
