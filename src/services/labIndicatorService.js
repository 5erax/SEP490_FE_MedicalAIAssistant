import { apiRequest, withPagination } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

const authenticatedRequest = (path, options = {}) => apiRequest(path, { ...options, auth: true });

function firstMessage(value) {
  if (typeof value === "string") return value.trim();

  if (Array.isArray(value)) {
    for (const item of value) {
      const message = firstMessage(item);
      if (message) return message;
    }
  }

  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      const message = firstMessage(item);
      if (message) return message;
    }
  }

  return "";
}

export function getLabIndicatorApiMessage(source, fallback = "") {
  const payload = source?.payload ?? source;
  const detail = firstMessage(payload?.errors) || firstMessage(payload?.message);
  if (detail) return detail;
  if (source?.payload && fallback) return fallback;
  return firstMessage(source?.message) || fallback;
}

export const LAB_INDICATOR_MESSAGES = {
  indicator: {
    invalidId: "Id chỉ số xét nghiệm không hợp lệ",
    notFound: "Không tìm thấy chỉ số xét nghiệm",
    createSuccess: "Tạo chỉ số xét nghiệm thành công",
    createFailure: "Tạo chỉ số xét nghiệm thất bại",
    updateSuccess: "Cập nhật chỉ số xét nghiệm thành công",
    updateFailure: "Cập nhật chỉ số xét nghiệm thất bại",
    deleteSuccess: "Xóa chỉ số xét nghiệm thành công",
    deleteFailure: "Xóa chỉ số xét nghiệm thất bại",
  },
  alias: {
    listFailure: "Lấy danh sách alias thất bại",
    createSuccess: "Tạo alias thành công",
    createFailure: "Tạo alias thất bại",
    updateSuccess: "Cập nhật alias thành công",
    updateFailure: "Cập nhật alias thất bại",
    deleteSuccess: "Xóa alias thành công",
    deleteFailure: "Xóa alias thất bại",
  },
  range: {
    listFailure: "Lấy khoảng tham chiếu thất bại",
    createSuccess: "Tạo khoảng tham chiếu thành công",
    createFailure: "Tạo khoảng tham chiếu thất bại",
    updateSuccess: "Cập nhật khoảng tham chiếu thành công",
    updateFailure: "Cập nhật khoảng tham chiếu thất bại",
    deleteSuccess: "Xóa khoảng tham chiếu thành công",
    deleteFailure: "Xóa khoảng tham chiếu thất bại",
  },
  advice: {
    listFailure: "Lấy advice cache thất bại",
    createSuccess: "Tạo advice cache thành công",
    createFailure: "Tạo advice cache thất bại",
    updateSuccess: "Cập nhật advice cache thành công",
    updateFailure: "Cập nhật advice cache thất bại",
    deleteSuccess: "Xóa advice cache thành công",
    deleteFailure: "Xóa advice cache thất bại",
  },
};

function referenceRangePayload(payload = {}) {
  return {
    gender: payload.gender ?? null,
    ageGroup: payload.ageGroup ?? null,
    comparisonType: payload.comparisonType,
    minValue: payload.minValue ?? null,
    maxValue: payload.maxValue ?? null,
    unit: payload.unit ?? null,
  };
}

export const labIndicatorsApi = {
  list(pageNumber = 1, pageSize = 10, filters = {}) {
    const params = new URLSearchParams(withPagination(pageNumber, pageSize));
    if (filters.search?.trim()) params.set("search", filters.search.trim());
    return authenticatedRequest(`${ENDPOINTS.LAB_INDICATORS.BASE}?${params.toString()}`);
  },

  get(indicatorId) {
    return authenticatedRequest(ENDPOINTS.LAB_INDICATORS.BY_ID(indicatorId));
  },

  create(payload) {
    return authenticatedRequest(ENDPOINTS.LAB_INDICATORS.BASE, { method: "POST", body: payload });
  },

  update(indicatorId, payload) {
    return authenticatedRequest(ENDPOINTS.LAB_INDICATORS.BY_ID(indicatorId), { method: "PUT", body: payload });
  },

  remove(indicatorId) {
    return authenticatedRequest(ENDPOINTS.LAB_INDICATORS.BY_ID(indicatorId), { method: "DELETE" });
  },

  listAliases(indicatorId) {
    return authenticatedRequest(ENDPOINTS.LAB_INDICATORS.ALIASES(indicatorId));
  },

  createAlias(indicatorId, payload) {
    return authenticatedRequest(ENDPOINTS.LAB_INDICATORS.ALIASES(indicatorId), { method: "POST", body: payload });
  },

  updateAlias(indicatorId, aliasId, payload) {
    return authenticatedRequest(ENDPOINTS.LAB_INDICATORS.ALIAS_BY_ID(indicatorId, aliasId), { method: "PUT", body: payload });
  },

  removeAlias(indicatorId, aliasId) {
    return authenticatedRequest(ENDPOINTS.LAB_INDICATORS.ALIAS_BY_ID(indicatorId, aliasId), { method: "DELETE" });
  },

  listReferenceRanges(indicatorId) {
    return authenticatedRequest(ENDPOINTS.LAB_INDICATORS.REFERENCE_RANGES(indicatorId));
  },

  createReferenceRange(indicatorId, payload) {
    return authenticatedRequest(ENDPOINTS.LAB_INDICATORS.REFERENCE_RANGES(indicatorId), {
      method: "POST",
      body: referenceRangePayload(payload),
    });
  },

  updateReferenceRange(indicatorId, rangeId, payload) {
    return authenticatedRequest(ENDPOINTS.LAB_INDICATORS.REFERENCE_RANGE_BY_ID(indicatorId, rangeId), {
      method: "PUT",
      body: referenceRangePayload(payload),
    });
  },

  removeReferenceRange(indicatorId, rangeId) {
    return authenticatedRequest(ENDPOINTS.LAB_INDICATORS.REFERENCE_RANGE_BY_ID(indicatorId, rangeId), { method: "DELETE" });
  },

  listAdvice(indicatorId) {
    return authenticatedRequest(ENDPOINTS.LAB_INDICATORS.ADVICE(indicatorId));
  },

  createAdvice(indicatorId, payload) {
    return authenticatedRequest(ENDPOINTS.LAB_INDICATORS.ADVICE(indicatorId), { method: "POST", body: payload });
  },

  updateAdvice(indicatorId, cacheId, payload) {
    return authenticatedRequest(ENDPOINTS.LAB_INDICATORS.ADVICE_BY_ID(indicatorId, cacheId), { method: "PUT", body: payload });
  },

  removeAdvice(indicatorId, cacheId) {
    return authenticatedRequest(ENDPOINTS.LAB_INDICATORS.ADVICE_BY_ID(indicatorId, cacheId), { method: "DELETE" });
  },
};
