import { apiRequest } from "./httpClient";
import { toQuery } from "./query";

export const medicalDepartmentsApi = {
  list() {
    return apiRequest("/api/medical-departments");
  },

  get(id) {
    return apiRequest(`/api/medical-departments/${id}`);
  },

  create(payload) {
    return apiRequest("/api/medical-departments", {
      method: "POST",
      body: payload,
      auth: true,
    });
  },

  update(id, payload) {
    return apiRequest(`/api/medical-departments/${id}`, {
      method: "PUT",
      body: payload,
      auth: true,
    });
  },

  remove(id) {
    return apiRequest(`/api/medical-departments/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },
};

export const medicalFacilitiesApi = {
  list(pageNumber = 1, pageSize = 50, filters = {}) {
    const query = toQuery({ PageNumber: pageNumber, PageSize: pageSize, ...filters });
    return apiRequest(`/api/medical-facilities?${query}`);
  },

  active(filters = {}) {
    const query = toQuery(filters);
    return apiRequest(`/api/medical-facilities/active${query ? `?${query}` : ""}`);
  },

  get(id) {
    return apiRequest(`/api/medical-facilities/${id}`);
  },

  create(payload) {
    return apiRequest("/api/medical-facilities", {
      method: "POST",
      body: payload,
      auth: true,
    });
  },

  update(id, payload) {
    return apiRequest(`/api/medical-facilities/${id}`, {
      method: "PUT",
      body: payload,
      auth: true,
    });
  },

  setStatus(id, isActive) {
    return apiRequest(`/api/medical-facilities/${id}/status`, {
      method: "PATCH",
      body: { isActive },
      auth: true,
    });
  },

  remove(id) {
    return apiRequest(`/api/medical-facilities/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },
};

export const doctorsApi = {
  list(pageNumber = 1, pageSize = 50, filters = {}) {
    const query = toQuery({ PageNumber: pageNumber, PageSize: pageSize, ...filters });
    return apiRequest(`/api/doctors?${query}`);
  },

  active(filters = {}) {
    const query = toQuery(filters);
    return apiRequest(`/api/doctors/active${query ? `?${query}` : ""}`);
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
