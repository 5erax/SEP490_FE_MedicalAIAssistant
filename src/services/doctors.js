import { apiRequest } from "./api";

function buildDoctorQuery({
  pageNumber = 1,
  pageSize = 10,
  search = "",
  facilityId = "",
  departmentId = "",
  isActive = "",
  departmentRole = "",
} = {}) {
  const params = new URLSearchParams({
    PageNumber: String(pageNumber),
    PageSize: String(pageSize),
  });

  if (search.trim()) params.set("search", search.trim());
  if (facilityId) params.set("facilityId", facilityId);
  if (departmentId) params.set("departmentId", departmentId);
  if (isActive !== "") params.set("isActive", String(isActive));
  if (departmentRole !== "") params.set("departmentRole", String(departmentRole));

  return params.toString();
}

export const doctorManagementApi = {
  list(filters = {}) {
    return apiRequest(`/api/doctors?${buildDoctorQuery(filters)}`);
  },

  get(id) {
    return apiRequest(`/api/doctors/${id}`);
  },

  create(payload) {
    return apiRequest("/api/doctors", {
      method: "POST",
      body: payload,
      auth: true,
    });
  },

  update(id, payload) {
    return apiRequest(`/api/doctors/${id}`, {
      method: "PUT",
      body: payload,
      auth: true,
    });
  },

  setStatus(id, isActive) {
    return apiRequest(`/api/doctors/${id}/status`, {
      method: "PATCH",
      body: { isActive },
      auth: true,
    });
  },

  remove(id) {
    return apiRequest(`/api/doctors/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },
};
