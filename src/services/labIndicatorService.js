import { apiRequest, withPagination } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

const authenticatedRequest = (path, options = {}) => apiRequest(path, { ...options, auth: true });

function referenceRangePayload(payload = {}) {
  return {
    gender: payload.gender,
    ageGroup: payload.ageGroup,
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
