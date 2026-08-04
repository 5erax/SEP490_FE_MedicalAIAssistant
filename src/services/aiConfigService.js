import {
  apiRequest,
  withPagination,
} from "./apiClient";
import { ENDPOINTS } from "./endpoints";

const CREATE_SUCCESS_MESSAGE =
  "Tạo AI config thành công";

const UPDATE_SUCCESS_MESSAGE =
  "Cập nhật AI config thành công";

const REQUEST_BODY_REQUIRED_MESSAGE =
  "Request body là bắt buộc";

const INVALID_ID_MESSAGE =
  "Id AI config không hợp lệ";

const CREATE_TASK_TYPE_REQUIRED_MESSAGE =
  "TaskType là bắt buộc";

const UPDATE_TASK_TYPE_REQUIRED_MESSAGE =
  "TaskType không được để trống";

const INVALID_TEMPERATURE_MESSAGE =
  "Temperature phải từ 0 đến 2";

const INVALID_MAX_TOKENS_MESSAGE =
  "MaxTokens phải lớn hơn 0";

const INVALID_ACTIVE_STATUS_MESSAGE =
  "IsActive phải là giá trị đúng hoặc sai";

const AI_CONFIG_UPDATE_FIELDS =
  Object.freeze([
    "taskType",
    "systemPrompt",
    "model",
    "temperature",
    "maxTokens",
    "isActive",
  ]);

function hasOwnProperty(target, propertyName) {
  return Object.prototype.hasOwnProperty.call(
    target,
    propertyName,
  );
}

function createValidationError(message) {
  const error = new Error(message);

  error.name = "AIConfigValidationError";
  error.status = 400;
  error.payload = {
    success: false,
    message,
  };

  return error;
}

function assertRequestBody(payload) {
  const isValidObject =
    payload !== null &&
    payload !== undefined &&
    typeof payload === "object" &&
    !Array.isArray(payload);

  if (!isValidObject) {
    throw createValidationError(
      REQUEST_BODY_REQUIRED_MESSAGE,
    );
  }
}

function normalizeId(id) {
  if (typeof id !== "string") {
    throw createValidationError(
      INVALID_ID_MESSAGE,
    );
  }

  const normalizedId = id.trim();

  if (!normalizedId) {
    throw createValidationError(
      INVALID_ID_MESSAGE,
    );
  }

  return normalizedId;
}

function normalizeTaskType(
  value,
  requiredMessage,
) {
  if (typeof value !== "string") {
    throw createValidationError(
      requiredMessage,
    );
  }

  const normalizedTaskType = value.trim();

  if (!normalizedTaskType) {
    throw createValidationError(
      requiredMessage,
    );
  }

  return normalizedTaskType;
}

/**
 * SystemPrompt và Model là các trường nullable.
 *
 * Chuỗi rỗng hoặc chỉ chứa khoảng trắng được chuẩn hóa thành null.
 * Nội dung không rỗng chỉ được loại bỏ khoảng trắng thừa ở hai đầu.
 *
 * Không tự động thêm hoặc sửa nội dung prompt vì thay đổi đó có thể
 * làm sai lệch chỉ dẫn an toàn và hành vi của AI trong chức năng y tế.
 */
function normalizeOptionalText(
  value,
  fieldName,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (typeof value !== "string") {
    throw createValidationError(
      `${fieldName} phải là chuỗi hoặc null`,
    );
  }

  const normalizedValue = value.trim();

  return normalizedValue || null;
}

function normalizeOptionalTemperature(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value === "string" &&
    !value.trim()
  ) {
    return null;
  }

  const temperature = Number(value);

  if (
    !Number.isFinite(temperature) ||
    temperature < 0 ||
    temperature > 2
  ) {
    throw createValidationError(
      INVALID_TEMPERATURE_MESSAGE,
    );
  }

  return temperature;
}

function normalizeOptionalMaxTokens(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value === "string" &&
    !value.trim()
  ) {
    return null;
  }

  const maxTokens = Number(value);

  if (
    !Number.isFinite(maxTokens) ||
    maxTokens <= 0
  ) {
    throw createValidationError(
      INVALID_MAX_TOKENS_MESSAGE,
    );
  }

  return maxTokens;
}

function normalizeBoolean(value) {
  if (typeof value !== "boolean") {
    throw createValidationError(
      INVALID_ACTIVE_STATUS_MESSAGE,
    );
  }

  return value;
}

function buildAIConfigQuery(
  pageNumber = 1,
  pageSize = 10,
) {
  return withPagination(
    pageNumber,
    pageSize,
  );
}

/**
 * POST /api/ai-configs
 *
 * Create luôn gửi đầy đủ contract:
 * - taskType: bắt buộc.
 * - systemPrompt: nullable.
 * - model: nullable.
 * - temperature: nullable, từ 0 đến 2.
 * - maxTokens: nullable, lớn hơn 0.
 * - isActive: boolean, mặc định true.
 */
function buildCreatePayload(payload) {
  assertRequestBody(payload);

  return {
    taskType: normalizeTaskType(
      payload.taskType,
      CREATE_TASK_TYPE_REQUIRED_MESSAGE,
    ),

    systemPrompt: normalizeOptionalText(
      payload.systemPrompt,
      "SystemPrompt",
    ),

    model: normalizeOptionalText(
      payload.model,
      "Model",
    ),

    temperature:
      normalizeOptionalTemperature(
        payload.temperature,
      ),

    maxTokens:
      normalizeOptionalMaxTokens(
        payload.maxTokens,
      ),

    isActive:
      payload.isActive === undefined
        ? true
        : normalizeBoolean(
            payload.isActive,
          ),
  };
}

/**
 * PUT /api/ai-configs/{id}
 *
 * Đây là partial update:
 * - Chỉ những thuộc tính thực sự có trong payload mới được gửi.
 * - null ở trường nullable có nghĩa là chủ động xóa giá trị.
 * - undefined có nghĩa là không cập nhật trường đó.
 */
function buildUpdatePayload(payload) {
  assertRequestBody(payload);

  const normalizedPayload = {};

  for (const fieldName of AI_CONFIG_UPDATE_FIELDS) {
    if (
      !hasOwnProperty(
        payload,
        fieldName,
      )
    ) {
      continue;
    }

    const value = payload[fieldName];

    if (
      fieldName !== "taskType" &&
      value === undefined
    ) {
      continue;
    }

    switch (fieldName) {
      case "taskType":
        normalizedPayload.taskType =
          normalizeTaskType(
            value,
            UPDATE_TASK_TYPE_REQUIRED_MESSAGE,
          );
        break;

      case "systemPrompt":
        normalizedPayload.systemPrompt =
          normalizeOptionalText(
            value,
            "SystemPrompt",
          );
        break;

      case "model":
        normalizedPayload.model =
          normalizeOptionalText(
            value,
            "Model",
          );
        break;

      case "temperature":
        normalizedPayload.temperature =
          normalizeOptionalTemperature(
            value,
          );
        break;

      case "maxTokens":
        normalizedPayload.maxTokens =
          normalizeOptionalMaxTokens(
            value,
          );
        break;

      case "isActive":
        normalizedPayload.isActive =
          normalizeBoolean(value);
        break;

      default:
        break;
    }
  }

  if (
    Object.keys(normalizedPayload).length ===
    0
  ) {
    throw createValidationError(
      REQUEST_BODY_REQUIRED_MESSAGE,
    );
  }

  return normalizedPayload;
}

function withSuccessMessage(
  response,
  message,
) {
  return {
    ...(response ?? {}),
    success: true,
    message,
  };
}

async function listAIConfigs(
  pageNumber = 1,
  pageSize = 20,
) {
  const query = buildAIConfigQuery(
    pageNumber,
    pageSize,
  );

  return apiRequest(
    `${ENDPOINTS.AI_CONFIGS.BASE}?${query}`,
    {
      auth: true,
    },
  );
}

async function listManagedAIConfigs(
  pageNumber = 1,
  pageSize = 10,
) {
  const query = buildAIConfigQuery(
    pageNumber,
    pageSize,
  );

  return apiRequest(
    `${ENDPOINTS.AI_CONFIGS.BASE}?${query}`,
    {
      auth: true,
    },
  );
}

async function getActiveAIConfigs() {
  return apiRequest(
    ENDPOINTS.AI_CONFIGS.ACTIVE,
    {
      auth: true,
    },
  );
}

async function getAIConfigByTaskType(
  taskType,
) {
  const normalizedTaskType =
    normalizeTaskType(
      taskType,
      CREATE_TASK_TYPE_REQUIRED_MESSAGE,
    );

  return apiRequest(
    ENDPOINTS.AI_CONFIGS.BY_TASK_TYPE(
      normalizedTaskType,
    ),
    {
      auth: true,
    },
  );
}

async function getAIConfig(id) {
  const normalizedId = normalizeId(id);

  return apiRequest(
    ENDPOINTS.AI_CONFIGS.BY_ID(
      normalizedId,
    ),
    {
      auth: true,
    },
  );
}

async function createAIConfig(payload) {
  const normalizedPayload =
    buildCreatePayload(payload);

  const response = await apiRequest(
    ENDPOINTS.AI_CONFIGS.BASE,
    {
      method: "POST",
      body: normalizedPayload,
      auth: true,
    },
  );

  return withSuccessMessage(
    response,
    CREATE_SUCCESS_MESSAGE,
  );
}

async function updateAIConfig(
  id,
  payload,
) {
  const normalizedId = normalizeId(id);

  const normalizedPayload =
    buildUpdatePayload(payload);

  const response = await apiRequest(
    ENDPOINTS.AI_CONFIGS.BY_ID(
      normalizedId,
    ),
    {
      method: "PUT",
      body: normalizedPayload,
      auth: true,
    },
  );

  return withSuccessMessage(
    response,
    UPDATE_SUCCESS_MESSAGE,
  );
}

async function setAIConfigStatus(
  id,
  isActive,
) {
  const normalizedId = normalizeId(id);
  const normalizedStatus =
    normalizeBoolean(isActive);

  return apiRequest(
    ENDPOINTS.AI_CONFIGS.STATUS(
      normalizedId,
    ),
    {
      method: "PATCH",
      body: {
        isActive: normalizedStatus,
      },
      auth: true,
    },
  );
}

async function removeAIConfig(id) {
  const normalizedId = normalizeId(id);

  return apiRequest(
    ENDPOINTS.AI_CONFIGS.BY_ID(
      normalizedId,
    ),
    {
      method: "DELETE",
      auth: true,
    },
  );
}

export const aiConfigsApi = {
  list: listAIConfigs,
  active: getActiveAIConfigs,
  byTaskType: getAIConfigByTaskType,
  get: getAIConfig,
  create: createAIConfig,
  update: updateAIConfig,
  setStatus: setAIConfigStatus,
  remove: removeAIConfig,
};

export const aiConfigManagementApi = {
  list: listManagedAIConfigs,
  active: getActiveAIConfigs,
  get: getAIConfig,
  create: createAIConfig,
  update: updateAIConfig,
  setStatus: setAIConfigStatus,
  remove: removeAIConfig,
};