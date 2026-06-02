const byId = (base, id) => `${base}/${id}`;
const status = (base, id) => `${byId(base, id)}/status`;

const AUTH_BASE = "/api/authentication";
const USERS_BASE = "/api/users";
const DEPARTMENTS_BASE = "/api/medical-departments";
const FACILITIES_BASE = "/api/medical-facilities";
const DOCTORS_BASE = "/api/doctors";
const PATIENT_PROFILES_BASE = "/api/patient-profiles";
const SUBSCRIPTION_PLANS_BASE = "/api/subscription-plans";
const AI_CONFIGS_BASE = "/api/ai-configs";
const WEB_CHATBOT_BASE = "/api/web-chatbot";

export const ENDPOINTS = {
  AUTH: {
    LOGIN: `${AUTH_BASE}/login`,
    REGISTER: `${AUTH_BASE}/register`,
    REGISTER_STAFF: `${AUTH_BASE}/register/staff`,
    GOOGLE: `${AUTH_BASE}/google`,
    REFRESH: `${AUTH_BASE}/refresh`,
    LOGOUT: `${AUTH_BASE}/logout`,
    FORGOT_PASSWORD: `${AUTH_BASE}/forgot-password`,
    CHANGE_PASSWORD: `${AUTH_BASE}/change-password`,
    APPROVE_STAFF: (userId) => `${AUTH_BASE}/${userId}/approve-staff`,
  },
  USERS: {
    BASE: USERS_BASE,
    ME: `${USERS_BASE}/me`,
    BY_ID: (userId) => byId(USERS_BASE, userId),
  },
  MEDICAL_DEPARTMENTS: {
    BASE: DEPARTMENTS_BASE,
    BY_ID: (id) => byId(DEPARTMENTS_BASE, id),
  },
  MEDICAL_FACILITIES: {
    BASE: FACILITIES_BASE,
    ACTIVE: `${FACILITIES_BASE}/active`,
    BY_ID: (id) => byId(FACILITIES_BASE, id),
    STATUS: (id) => status(FACILITIES_BASE, id),
  },
  DOCTORS: {
    BASE: DOCTORS_BASE,
    ACTIVE: `${DOCTORS_BASE}/active`,
    BY_ID: (id) => byId(DOCTORS_BASE, id),
    STATUS: (id) => status(DOCTORS_BASE, id),
  },
  PATIENT_PROFILES: {
    BASE: PATIENT_PROFILES_BASE,
    BY_ID: (id) => byId(PATIENT_PROFILES_BASE, id),
  },
  SUBSCRIPTION_PLANS: {
    BASE: SUBSCRIPTION_PLANS_BASE,
    ACTIVE: `${SUBSCRIPTION_PLANS_BASE}/active`,
    BY_ID: (id) => byId(SUBSCRIPTION_PLANS_BASE, id),
    STATUS: (id) => status(SUBSCRIPTION_PLANS_BASE, id),
  },
  AI_CONFIGS: {
    BASE: AI_CONFIGS_BASE,
    ACTIVE: `${AI_CONFIGS_BASE}/active`,
    BY_TASK_TYPE: (taskType) => `${AI_CONFIGS_BASE}/by-task-type/${encodeURIComponent(taskType)}`,
    BY_ID: (id) => byId(AI_CONFIGS_BASE, id),
    STATUS: (id) => status(AI_CONFIGS_BASE, id),
  },
  WEB_CHATBOT: {
    MESSAGE: `${WEB_CHATBOT_BASE}/message`,
  },
  EXTERNAL: {
    ANTHROPIC_MESSAGES: "https://api.anthropic.com/v1/messages",
  },
};
