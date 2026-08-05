import { apiRequest, withPagination } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

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

export function getFeedbackReviewApiMessage(source, fallback = "") {
  const payload = source?.payload ?? source;
  const errorMessage = firstMessage(payload?.errors);
  if (errorMessage) {
    if (source?.status !== 401 || errorMessage === FEEDBACK_REVIEW_MESSAGES.auth.required) {
      return errorMessage;
    }
    return fallback || FEEDBACK_REVIEW_MESSAGES.auth.fallback;
  }

  const responseMessage = firstMessage(payload?.message);
  if (responseMessage) {
    if (source?.status !== 401 || responseMessage === FEEDBACK_REVIEW_MESSAGES.auth.required) {
      return responseMessage;
    }
    return fallback || FEEDBACK_REVIEW_MESSAGES.auth.fallback;
  }

  if (source?.payload && fallback) return fallback;
  return firstMessage(source?.message) || fallback;
}

export const FEEDBACK_REVIEW_MESSAGES = {
  list: {
    success: "OK",
    invalidFacilityId: "Id cơ sở y tế không hợp lệ",
    invalidUserId: "Id người dùng không hợp lệ",
    invalidRating: "Bộ lọc rating không hợp lệ",
    ratingError: "Bộ lọc rating phải từ 1 đến 5",
  },
  facility: {
    success: "OK",
    invalidId: "Id cơ sở y tế không hợp lệ",
  },
  detail: {
    success: "OK",
    invalidId: "Id feedback không hợp lệ",
    notFound: "Không tìm thấy feedback",
  },
  create: {
    success: "Tạo feedback thành công",
    failure: "Tạo feedback thất bại",
  },
  update: {
    success: "Cập nhật feedback thành công",
    failure: "Cập nhật feedback thất bại",
  },
  status: {
    success: "Cập nhật trạng thái feedback thành công",
    failure: "Cập nhật trạng thái feedback thất bại",
  },
  delete: {
    success: "Xóa feedback thành công",
    failure: "Xóa feedback thất bại",
  },
  auth: {
    required: "Người dùng chưa đăng nhập",
    fallback: "Chưa đăng nhập",
  },
};

export const feedbackReviewsApi = {
  list(pageNumber = 1, pageSize = 20, filters = {}) {
    const params = new URLSearchParams(withPagination(pageNumber, pageSize));
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) params.set(key, String(value));
    });
    return apiRequest(`${ENDPOINTS.FEEDBACK_REVIEWS.BASE}?${params.toString()}`, { auth: true });
  },

  byFacility(facilityId, pageNumber = 1, pageSize = 20) {
    return apiRequest(
      `${ENDPOINTS.FEEDBACK_REVIEWS.BY_FACILITY(facilityId)}?${withPagination(pageNumber, pageSize)}`,
    );
  },

  get(id) {
    return apiRequest(ENDPOINTS.FEEDBACK_REVIEWS.BY_ID(id), { auth: true });
  },

  create(payload) {
    return apiRequest(ENDPOINTS.FEEDBACK_REVIEWS.BASE, {
      method: "POST",
      body: payload,
      auth: true,
    });
  },

  update(id, payload) {
    return apiRequest(ENDPOINTS.FEEDBACK_REVIEWS.BY_ID(id), {
      method: "PUT",
      body: payload,
      auth: true,
    });
  },

  setStatus(id, statusValue) {
    return apiRequest(ENDPOINTS.FEEDBACK_REVIEWS.STATUS(id), {
      method: "PATCH",
      body: { status: statusValue },
      auth: true,
    });
  },

  remove(id) {
    return apiRequest(ENDPOINTS.FEEDBACK_REVIEWS.BY_ID(id), {
      method: "DELETE",
      auth: true,
    });
  },
};
