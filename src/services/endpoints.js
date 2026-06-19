const byId = (base, id) => `${base}/${id}`;
const status = (base, id) => `${byId(base, id)}/status`;

const AUTH_BASE = "/api/authentication";
const USERS_BASE = "/api/users";
const DEPARTMENTS_BASE = "/api/medical-departments";
const FACILITIES_BASE = "/api/medical-facilities";
const FACILITY_DEPARTMENTS_BASE = "/api/facility-departments";
const DOCTORS_BASE = "/api/doctors";
const DOCTOR_INVITATIONS_BASE = "/api/doctor-invitations";
const ADMIN_DOCTOR_INVITATIONS_BASE = "/api/admin/doctor-invitations";
const PATIENT_PROFILES_BASE = "/api/patient-profiles";
const FEEDBACK_REVIEWS_BASE = "/api/feedback-reviews";
const CLINICAL_QUESTIONS_BASE = "/api/clinical-questions";
const ICD_CHAPTERS_BASE = "/api/icd-chapters";
const SYMPTOM_ANALYSIS_BASE = "/api/symptom-analysis";
const SUBSCRIPTION_PLANS_BASE = "/api/subscription-plans";
const USER_SUBSCRIPTIONS_BASE = "/api/user-subscriptions";
const PAYMENTS_BASE = "/api/payments";
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
  FACILITY_DEPARTMENTS: {
    ACTIVE: `${FACILITY_DEPARTMENTS_BASE}/active`,
  },
  DOCTORS: {
    BASE: DOCTORS_BASE,
    ACTIVE: `${DOCTORS_BASE}/active`,
    BY_ID: (id) => byId(DOCTORS_BASE, id),
    STATUS: (id) => status(DOCTORS_BASE, id),
  },
  DOCTOR_INVITATIONS: {
    VALIDATE: `${DOCTOR_INVITATIONS_BASE}/validate`,
    REGISTER: `${DOCTOR_INVITATIONS_BASE}/register`,
    ADMIN_CREATE: ADMIN_DOCTOR_INVITATIONS_BASE,
    ADMIN_REVOKE: (id) => `${ADMIN_DOCTOR_INVITATIONS_BASE}/${id}/revoke`,
  },
  FEEDBACK_REVIEWS: {
    BASE: FEEDBACK_REVIEWS_BASE,
    BY_ID: (id) => byId(FEEDBACK_REVIEWS_BASE, id),
    STATUS: (id) => status(FEEDBACK_REVIEWS_BASE, id),
    BY_FACILITY: (facilityId) => `${FEEDBACK_REVIEWS_BASE}/facility/${facilityId}`,
  },
  CLINICAL_QUESTIONS: {
    BASE: CLINICAL_QUESTIONS_BASE,
    BY_ID: (id) => byId(CLINICAL_QUESTIONS_BASE, id),
    BULK: `${CLINICAL_QUESTIONS_BASE}/bulk`,
  },
  ICD_CHAPTERS: {
    BASE: ICD_CHAPTERS_BASE,
    BY_ID: (id) => byId(ICD_CHAPTERS_BASE, id),
  },
  SYMPTOM_ANALYSIS: {
    ANALYZE: `${SYMPTOM_ANALYSIS_BASE}/analyze`,
    SUGGEST_CLINICAL_QUESTIONS: `${SYMPTOM_ANALYSIS_BASE}/suggest-clinical-questions`,
    SUBMIT_CLINICAL_QUESTION_ANSWERS: `${SYMPTOM_ANALYSIS_BASE}/submit-clinical-question-answers`,
    MY_SESSIONS: `${SYMPTOM_ANALYSIS_BASE}/my-sessions`,
    BY_SESSION: (sessionId) => byId(SYMPTOM_ANALYSIS_BASE, sessionId),
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
  USER_SUBSCRIPTIONS: {
    CHECKOUT: `${USER_SUBSCRIPTIONS_BASE}/checkout`,
    ME: `${USER_SUBSCRIPTIONS_BASE}/me`,
    BY_ID: (id) => byId(USER_SUBSCRIPTIONS_BASE, id),
    CANCEL: (id) => `${byId(USER_SUBSCRIPTIONS_BASE, id)}/cancel`,
  },
  PAYMENTS: {
    BY_ID: (id) => byId(PAYMENTS_BASE, id),
    PAYOS_STATUS: (orderCode) => `${PAYMENTS_BASE}/payos-status/${encodeURIComponent(orderCode)}`,
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
