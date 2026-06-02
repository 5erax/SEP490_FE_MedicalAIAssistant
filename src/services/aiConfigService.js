import { apiRequest, withPagination } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

function buildAIConfigQuery(pageNumber = 1, pageSize = 10) {
  return withPagination(pageNumber, pageSize);
}

export const aiConfigsApi = {
  list(pageNumber = 1, pageSize = 20) {
    return apiRequest(`${ENDPOINTS.AI_CONFIGS.BASE}?${withPagination(pageNumber, pageSize)}`, { auth: true });
  },

  active() {
    return apiRequest(ENDPOINTS.AI_CONFIGS.ACTIVE, { auth: true });
  },

  byTaskType(taskType) {
    return apiRequest(ENDPOINTS.AI_CONFIGS.BY_TASK_TYPE(taskType), { auth: true });
  },

  get(id) {
    return apiRequest(ENDPOINTS.AI_CONFIGS.BY_ID(id), { auth: true });
  },

  create(payload) {
    return apiRequest(ENDPOINTS.AI_CONFIGS.BASE, {
      method: "POST",
      body: payload,
      auth: true,
    });
  },

  update(id, payload) {
    return apiRequest(ENDPOINTS.AI_CONFIGS.BY_ID(id), {
      method: "PUT",
      body: payload,
      auth: true,
    });
  },

  setStatus(id, isActive) {
    return apiRequest(ENDPOINTS.AI_CONFIGS.STATUS(id), {
      method: "PATCH",
      body: { isActive },
      auth: true,
    });
  },

  remove(id) {
    return apiRequest(ENDPOINTS.AI_CONFIGS.BY_ID(id), {
      method: "DELETE",
      auth: true,
    });
  },
};

export const aiConfigManagementApi = {
  list(pageNumber = 1, pageSize = 10) {
    return apiRequest(`${ENDPOINTS.AI_CONFIGS.BASE}?${buildAIConfigQuery(pageNumber, pageSize)}`, { auth: true });
  },

  active: aiConfigsApi.active,
  get: aiConfigsApi.get,
  create: aiConfigsApi.create,
  update: aiConfigsApi.update,
  setStatus: aiConfigsApi.setStatus,
  remove: aiConfigsApi.remove,
};
