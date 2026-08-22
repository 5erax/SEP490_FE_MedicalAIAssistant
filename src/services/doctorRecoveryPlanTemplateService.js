import { apiRequest } from "./apiClient";
import { ENDPOINTS } from "./endpoints";
import { getApiErrorCode } from "./apiError";

function withQuery(path, params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value !== null && value !== undefined) {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

const authenticatedRequest = (path, options = {}) => apiRequest(path, { ...options, auth: true });

export const RECOVERY_PLAN_DISEASE_GROUPS = {
  respiratory: "Hô hấp",
  musculoskeletal: "Cơ xương khớp",
  infectiousDisease: "Bệnh truyền nhiễm",
};

const TEMPLATE_ERROR_MESSAGES = {
  UNAUTHENTICATED: "Vui lòng đăng nhập lại để tiếp tục.",
  DOCTOR_PROFILE_NOT_FOUND: "Không tìm thấy hồ sơ bác sĩ.",
  DOCTOR_NOT_ACTIVE: "Tài khoản bác sĩ hiện không hoạt động.",
  NOT_FOUND: "Không tìm thấy kế hoạch mẫu hoặc tài nguyên đã bị xóa.",
  INVALID_REQUEST: "Thông tin kế hoạch mẫu chưa hợp lệ.",
  INVALID_PLAN_STRUCTURE: "Cấu trúc kế hoạch chưa hợp lệ. Vui lòng kiểm tra ngày, thứ tự hoặc dữ liệu các giai đoạn.",
  INVALID_REQUEST_STATE: "Yêu cầu này không còn ở trạng thái cho phép tạo kế hoạch.",
  ASSIGNMENT_EXPIRED: "Thời gian xử lý yêu cầu đã hết hạn.",
  CONFLICT: "Dữ liệu vừa thay đổi. Vui lòng tải lại và thử lại.",
};

export function getRecoveryPlanTemplateErrorMessage(error, fallback = "Đã có lỗi xảy ra. Vui lòng thử lại.") {
  return TEMPLATE_ERROR_MESSAGES[getApiErrorCode(error)] || error?.message || fallback;
}

export const doctorRecoveryPlanTemplatesApi = {
  list({ pageNumber = 1, pageSize = 10, diseaseGroup = "", search = "" } = {}) {
    return authenticatedRequest(withQuery(ENDPOINTS.DOCTOR_RECOVERY_PLAN_TEMPLATES.BASE, {
      pageNumber,
      pageSize,
      diseaseGroup,
      search,
    }), { cache: "no-store" });
  },

  get(templateId) {
    return authenticatedRequest(ENDPOINTS.DOCTOR_RECOVERY_PLAN_TEMPLATES.BY_ID(templateId));
  },

  create(payload) {
    return authenticatedRequest(ENDPOINTS.DOCTOR_RECOVERY_PLAN_TEMPLATES.BASE, { method: "POST", body: payload });
  },

  update(templateId, payload) {
    return authenticatedRequest(ENDPOINTS.DOCTOR_RECOVERY_PLAN_TEMPLATES.BY_ID(templateId), { method: "PUT", body: payload });
  },

  remove(templateId) {
    return authenticatedRequest(ENDPOINTS.DOCTOR_RECOVERY_PLAN_TEMPLATES.BY_ID(templateId), { method: "DELETE" });
  },

  createPhase(templateId, payload) {
    return authenticatedRequest(ENDPOINTS.DOCTOR_RECOVERY_PLAN_TEMPLATES.PHASES(templateId), { method: "POST", body: payload });
  },

  updatePhase(templateId, phaseId, payload) {
    return authenticatedRequest(ENDPOINTS.DOCTOR_RECOVERY_PLAN_TEMPLATES.PHASE_BY_ID(templateId, phaseId), { method: "PUT", body: payload });
  },

  removePhase(templateId, phaseId) {
    return authenticatedRequest(ENDPOINTS.DOCTOR_RECOVERY_PLAN_TEMPLATES.PHASE_BY_ID(templateId, phaseId), { method: "DELETE" });
  },

  createNutrient(templateId, phaseId, payload) {
    return authenticatedRequest(ENDPOINTS.DOCTOR_RECOVERY_PLAN_TEMPLATES.NUTRIENTS(templateId, phaseId), { method: "POST", body: payload });
  },

  updateNutrient(templateId, phaseId, nutrientId, payload) {
    return authenticatedRequest(ENDPOINTS.DOCTOR_RECOVERY_PLAN_TEMPLATES.NUTRIENT_BY_ID(templateId, phaseId, nutrientId), { method: "PUT", body: payload });
  },

  removeNutrient(templateId, phaseId, nutrientId) {
    return authenticatedRequest(ENDPOINTS.DOCTOR_RECOVERY_PLAN_TEMPLATES.NUTRIENT_BY_ID(templateId, phaseId, nutrientId), { method: "DELETE" });
  },

  createFood(templateId, phaseId, nutrientId, payload) {
    return authenticatedRequest(ENDPOINTS.DOCTOR_RECOVERY_PLAN_TEMPLATES.FOODS(templateId, phaseId, nutrientId), { method: "POST", body: payload });
  },

  updateFood(templateId, phaseId, nutrientId, foodSourceId, payload) {
    return authenticatedRequest(ENDPOINTS.DOCTOR_RECOVERY_PLAN_TEMPLATES.FOOD_BY_ID(templateId, phaseId, nutrientId, foodSourceId), { method: "PUT", body: payload });
  },

  removeFood(templateId, phaseId, nutrientId, foodSourceId) {
    return authenticatedRequest(ENDPOINTS.DOCTOR_RECOVERY_PLAN_TEMPLATES.FOOD_BY_ID(templateId, phaseId, nutrientId, foodSourceId), { method: "DELETE" });
  },
};
