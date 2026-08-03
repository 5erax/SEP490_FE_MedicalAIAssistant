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
const ICD_CHAPTERS_BASE = "/api/icd-chapters";
const CLINICAL_QUESTIONS_BASE = "/api/clinical-questions";
const SYMPTOM_ANALYSIS_BASE = "/api/symptom-analysis";
const SUBSCRIPTION_PLANS_BASE = "/api/subscription-plans";
const USER_SUBSCRIPTIONS_BASE = "/api/user-subscriptions";
const PAYMENTS_BASE = "/api/payments";
const AI_CONFIGS_BASE = "/api/ai-configs";
const WEB_CHATBOT_BASE = "/api/web-chatbot";
const CONSULTATION_SESSIONS_BASE = "/api/consultation-sessions";
const LAB_INDICATORS_BASE = "/api/lab-indicators";
const LAB_TESTS_BASE = "/api/lab-tests";
const USER_MEDICATIONS_BASE = "/api/user-medications";
const SUBSCRIPTION_USAGE_BASE = "/api/me/subscription-usage";

const encodedById = (base, id) => `${base}/${encodeURIComponent(id)}`;
const labIndicatorChild = (indicatorId, child) => `${encodedById(LAB_INDICATORS_BASE, indicatorId)}/${child}`;

export const ENDPOINTS = {
  AUTH: {
    LOGIN: `${AUTH_BASE}/login`,
    REGISTER: `${AUTH_BASE}/register`,
    GOOGLE: `${AUTH_BASE}/google`,
    REFRESH: `${AUTH_BASE}/refresh`,
    LOGOUT: `${AUTH_BASE}/logout`,
    FORGOT_PASSWORD: `${AUTH_BASE}/forgot-password`,
    CHANGE_PASSWORD: `${AUTH_BASE}/change-password`,
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
  ICD_CHAPTERS: {
    BASE: ICD_CHAPTERS_BASE,
    BY_ID: (id) => byId(ICD_CHAPTERS_BASE, id),
    BULK: `${ICD_CHAPTERS_BASE}/bulk`,
  },
  CLINICAL_QUESTIONS: {
    BASE: CLINICAL_QUESTIONS_BASE,
    BY_ID: (id) => byId(CLINICAL_QUESTIONS_BASE, id),
    BULK: `${CLINICAL_QUESTIONS_BASE}/bulk`,
  },
  SYMPTOM_ANALYSIS: {
    SUGGEST_CLINICAL_QUESTIONS: `${SYMPTOM_ANALYSIS_BASE}/suggest-clinical-questions`,
    SUBMIT_CLINICAL_QUESTION_ANSWERS: `${SYMPTOM_ANALYSIS_BASE}/submit-clinical-question-answers`,
    SUBMIT_DIAGNOSIS: `${SYMPTOM_ANALYSIS_BASE}/submit-diagnosis`,
    MY_SESSIONS: `${SYMPTOM_ANALYSIS_BASE}/my-sessions`,
    BY_SESSION: (sessionId) => byId(SYMPTOM_ANALYSIS_BASE, sessionId),
  },
  PATIENT_PROFILES: {
    BASE: PATIENT_PROFILES_BASE,
    BY_ID: (id) => byId(PATIENT_PROFILES_BASE, id),
    BY_USER: (userId) => `${PATIENT_PROFILES_BASE}/by-user/${userId}`,
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
    ME: `${PAYMENTS_BASE}/me`,
    MY_PAYMENT: (id) => `${PAYMENTS_BASE}/me/${encodeURIComponent(id)}`,
    BY_ID: (id) => byId(PAYMENTS_BASE, id),
    BY_USER: (userId) => `${PAYMENTS_BASE}/user/${encodeURIComponent(userId)}`,
    PAYOS_RECONCILE: (orderCode) => `${PAYMENTS_BASE}/payos-reconcile/${encodeURIComponent(orderCode)}`,
    // Legacy: kept for backward compatibility only, not used by the new
    // reconciliation flow (BE still exposes these endpoints).
    PAYOS_RETURN: `${PAYMENTS_BASE}/payos-return`,
    PAYOS_CANCEL: `${PAYMENTS_BASE}/payos-cancel`,
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
  CONSULTATION_SESSIONS: {
    GENERATE_QUESTIONS: `${CONSULTATION_SESSIONS_BASE}/generate-questions-for-consultant-session`,
    MY_SESSIONS: `${CONSULTATION_SESSIONS_BASE}/my-sessions`,
    BY_ID: (sessionId) => byId(CONSULTATION_SESSIONS_BASE, sessionId),
  },
  LAB_INDICATORS: {
    BASE: LAB_INDICATORS_BASE,
    BY_ID: (indicatorId) => encodedById(LAB_INDICATORS_BASE, indicatorId),
    BULK: `${LAB_INDICATORS_BASE}/bulk`,
    ALIASES: (indicatorId) => labIndicatorChild(indicatorId, "aliases"),
    ALIAS_BY_ID: (indicatorId, aliasId) => `${labIndicatorChild(indicatorId, "aliases")}/${encodeURIComponent(aliasId)}`,
    REFERENCE_RANGES: (indicatorId) => labIndicatorChild(indicatorId, "reference-ranges"),
    REFERENCE_RANGE_BY_ID: (indicatorId, rangeId) => `${labIndicatorChild(indicatorId, "reference-ranges")}/${encodeURIComponent(rangeId)}`,
    ADVICE: (indicatorId) => labIndicatorChild(indicatorId, "advice"),
    ADVICE_BY_ID: (indicatorId, cacheId) => `${labIndicatorChild(indicatorId, "advice")}/${encodeURIComponent(cacheId)}`,
  },
  LAB_TESTS: {
    ANALYZE: `${LAB_TESTS_BASE}/analyze`,
    MY_SESSIONS: `${LAB_TESTS_BASE}/my-sessions`,
    BY_SESSION: (sessionId) => encodedById(LAB_TESTS_BASE, sessionId),
  },
  USER_MEDICATIONS: {
    BASE: USER_MEDICATIONS_BASE,
    BY_ID: (medicationId) => encodedById(USER_MEDICATIONS_BASE, medicationId),
    REMINDERS: (medicationId) => `${encodedById(USER_MEDICATIONS_BASE, medicationId)}/reminders`,
  },
  SUBSCRIPTION_USAGE: {
    ME: SUBSCRIPTION_USAGE_BASE,
  },
};
