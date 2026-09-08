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
const ADMIN_QUOTAS_BASE = "/api/admin/quotas";
const ADMIN_SUBSCRIPTION_PLANS_BASE = "/api/admin/subscription-plans";
const ADMIN_SALE_CAMPAIGNS_BASE = "/api/admin/sale-campaigns";
const USER_SUBSCRIPTIONS_BASE = "/api/user-subscriptions";
const ADMIN_USER_SUBSCRIPTIONS_BASE = "/api/admin/user-subscriptions";
const PAYMENTS_BASE = "/api/payments";
const AI_CONFIGS_BASE = "/api/ai-configs";
const WEB_CHATBOT_BASE = "/api/web-chatbot";
const CONSULTATION_SESSIONS_BASE = "/api/consultation-sessions";
const DEPARTMENT_CONSULTATION_QUESTIONS_BASE = "/api/department-consultation-questions";
const CHECKLIST_ITEMS_BASE = "/api/checklist-items";
const LAB_INDICATORS_BASE = "/api/lab-indicators";
const LAB_TESTS_BASE = "/api/lab-tests";
const USER_MEDICATIONS_BASE = "/api/user-medications";
const SUBSCRIPTION_USAGE_BASE = "/api/me/subscription-usage";
const RECOVERY_PLAN_REQUESTS_BASE = "/api/recovery-plan-requests";
const RECOVERY_PLANS_BASE = "/api/recovery-plans";
const DOCTOR_RECOVERY_PLAN_REQUESTS_BASE = "/api/doctor/recovery-plan-requests";
const DOCTOR_RECOVERY_PLANS_BASE = "/api/doctor/recovery-plans";
const DOCTOR_RECOVERY_PLAN_TEMPLATES_BASE = "/api/doctor/recovery-plan-templates";

const encodedById = (base, id) => `${base}/${encodeURIComponent(id)}`;
const labIndicatorChild = (indicatorId, child) => `${encodedById(LAB_INDICATORS_BASE, indicatorId)}/${child}`;

export const ENDPOINTS = {
  AUTH: {
    LOGIN: `${AUTH_BASE}/login`,
    REGISTER: `${AUTH_BASE}/register`,
    SEND_REGISTER_OTP: `${AUTH_BASE}/send-register-otp`,
    GOOGLE: `${AUTH_BASE}/google`,
    REFRESH: `${AUTH_BASE}/refresh`,
    LOGOUT: `${AUTH_BASE}/logout`,
    FORGOT_PASSWORD: `${AUTH_BASE}/forgot-password`,
    CHANGE_PASSWORD: `${AUTH_BASE}/change-password`,
    UPDATE_PASSWORD: `${AUTH_BASE}/update-password`,
  },
  USERS: {
    BASE: USERS_BASE,
    ME: `${USERS_BASE}/me`,
    PHONE: `${USERS_BASE}/me/phone`,
    BY_ID: (userId) => byId(USERS_BASE, userId),
    RESTORE: (userId) => `${byId(USERS_BASE, userId)}/restore`,
  },
  MEDICAL_DEPARTMENTS: {
    BASE: DEPARTMENTS_BASE,
    BY_ID: (id) => byId(DEPARTMENTS_BASE, id),
  },
  MEDICAL_FACILITIES: {
    BASE: FACILITIES_BASE,
    ACTIVE: `${FACILITIES_BASE}/active`,
    NEARBY: `${FACILITIES_BASE}/nearby`,
    TOP_RATED: `${FACILITIES_BASE}/top-rated`,
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
    ADMIN_LIST: ADMIN_DOCTOR_INVITATIONS_BASE,
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
    QUOTA: `${SYMPTOM_ANALYSIS_BASE}/quota`,
    MY_SESSIONS: `${SYMPTOM_ANALYSIS_BASE}/my-sessions`,
    SESSIONS: `${SYMPTOM_ANALYSIS_BASE}/sessions`,
    BY_SESSION: (sessionId) => byId(SYMPTOM_ANALYSIS_BASE, sessionId),
  },
  PATIENT_PROFILES: {
    BASE: PATIENT_PROFILES_BASE,
    BY_ID: (id) => byId(PATIENT_PROFILES_BASE, id),
    BY_USER: (userId) => `${PATIENT_PROFILES_BASE}/by-user/${encodeURIComponent(userId)}`,
  },
  SUBSCRIPTION_PLANS: {
    BASE: SUBSCRIPTION_PLANS_BASE,
    ACTIVE: `${SUBSCRIPTION_PLANS_BASE}/active`,
    OFFERS: `${SUBSCRIPTION_PLANS_BASE}/offers`,
    BY_ID: (id) => byId(SUBSCRIPTION_PLANS_BASE, id),
    STATUS: (id) => status(SUBSCRIPTION_PLANS_BASE, id),
  },
  ADMIN_QUOTAS: {
    BASE: ADMIN_QUOTAS_BASE,
  },
  ADMIN_SUBSCRIPTION_PLAN_QUOTAS: {
    BY_PLAN: (planId) => `${encodedById(ADMIN_SUBSCRIPTION_PLANS_BASE, planId)}/quotas`,
    BY_PLAN_QUOTA: (planId, quotaId) =>
      `${encodedById(ADMIN_SUBSCRIPTION_PLANS_BASE, planId)}/quotas/${encodeURIComponent(quotaId)}`,
  },
  ADMIN_SALE_CAMPAIGNS: {
    BASE: ADMIN_SALE_CAMPAIGNS_BASE,
    BY_ID: (id) => encodedById(ADMIN_SALE_CAMPAIGNS_BASE, id),
    STATUS: (id) => `${encodedById(ADMIN_SALE_CAMPAIGNS_BASE, id)}/status`,
    REDEMPTIONS: (id) => `${encodedById(ADMIN_SALE_CAMPAIGNS_BASE, id)}/redemptions`,
  },
  USER_SUBSCRIPTIONS: {
    CHECKOUT: `${USER_SUBSCRIPTIONS_BASE}/checkout`,
    ME: `${USER_SUBSCRIPTIONS_BASE}/me`,
    BY_ID: (id) => byId(USER_SUBSCRIPTIONS_BASE, id),
    CANCEL: (id) => `${byId(USER_SUBSCRIPTIONS_BASE, id)}/cancel`,
    ADMIN_LIST: ADMIN_USER_SUBSCRIPTIONS_BASE,
  },
  PAYMENTS: {
    LIST: PAYMENTS_BASE,
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
    REGISTER_REMINDER: (sessionId) => `${encodedById(CONSULTATION_SESSIONS_BASE, sessionId)}/register-reminder`,
    SUMMARY: (sessionId) => `${encodedById(CONSULTATION_SESSIONS_BASE, sessionId)}/summary`,
    COMPLETE: (sessionId) => `${encodedById(CONSULTATION_SESSIONS_BASE, sessionId)}/complete`,
  },
  DEPARTMENT_CONSULTATION_QUESTIONS: {
    BASE: DEPARTMENT_CONSULTATION_QUESTIONS_BASE,
    BY_ID: (id) => encodedById(DEPARTMENT_CONSULTATION_QUESTIONS_BASE, id),
    BULK: `${DEPARTMENT_CONSULTATION_QUESTIONS_BASE}/bulk`,
  },
  CHECKLIST_ITEMS: {
    BASE: CHECKLIST_ITEMS_BASE,
    BY_ID: (id) => encodedById(CHECKLIST_ITEMS_BASE, id),
    BY_DEPARTMENT: (departmentId) => `${CHECKLIST_ITEMS_BASE}/by-department/${encodeURIComponent(departmentId)}`,
    BY_FACILITY: (facilityId) => `${CHECKLIST_ITEMS_BASE}/by-facility/${encodeURIComponent(facilityId)}`,
    BULK: `${CHECKLIST_ITEMS_BASE}/bulk`,
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
    SESSIONS: `${LAB_TESTS_BASE}/sessions`,
    BY_SESSION: (sessionId) => encodedById(LAB_TESTS_BASE, sessionId),
    SUMMARY: (sessionId) => `${encodedById(LAB_TESTS_BASE, sessionId)}/summary`,
    ANALYTICS_INDICATORS: `${LAB_TESTS_BASE}/analytics/indicators`,
    ANALYTICS_INDICATOR_TREND: (indicatorId) =>
      `${LAB_TESTS_BASE}/analytics/indicators/${encodeURIComponent(indicatorId)}/trend`,
  },
  USER_MEDICATIONS: {
    BASE: USER_MEDICATIONS_BASE,
    BY_ID: (medicationId) => encodedById(USER_MEDICATIONS_BASE, medicationId),
    REMINDERS: (medicationId) => `${encodedById(USER_MEDICATIONS_BASE, medicationId)}/reminders`,
  },
  SUBSCRIPTION_USAGE: {
    ME: SUBSCRIPTION_USAGE_BASE,
  },
  RECOVERY_PLAN_REQUESTS: {
    BASE: RECOVERY_PLAN_REQUESTS_BASE,
    READINESS: `${RECOVERY_PLAN_REQUESTS_BASE}/readiness`,
    ME: `${RECOVERY_PLAN_REQUESTS_BASE}/me`,
    BY_ID: (requestId) => encodedById(RECOVERY_PLAN_REQUESTS_BASE, requestId),
    CANCEL: (requestId) => `${encodedById(RECOVERY_PLAN_REQUESTS_BASE, requestId)}/cancel`,
  },
  RECOVERY_PLANS: {
    ME: `${RECOVERY_PLANS_BASE}/me`,
    BY_ID: (planId) => encodedById(RECOVERY_PLANS_BASE, planId),
    START: (planId) => `${encodedById(RECOVERY_PLANS_BASE, planId)}/start`,
    CANCEL: (planId) => `${encodedById(RECOVERY_PLANS_BASE, planId)}/cancel`,
    FEEDBACK: (planId) => `${encodedById(RECOVERY_PLANS_BASE, planId)}/feedback`,
  },
  DOCTOR_RECOVERY_PLAN_REQUESTS: {
    OPEN: `${DOCTOR_RECOVERY_PLAN_REQUESTS_BASE}/open`,
    MINE: `${DOCTOR_RECOVERY_PLAN_REQUESTS_BASE}/mine`,
    BY_ID: (requestId) => encodedById(DOCTOR_RECOVERY_PLAN_REQUESTS_BASE, requestId),
    CLINICAL_CONTEXT: (requestId) => `${encodedById(DOCTOR_RECOVERY_PLAN_REQUESTS_BASE, requestId)}/clinical-context`,
    ACCEPT: (requestId) => `${encodedById(DOCTOR_RECOVERY_PLAN_REQUESTS_BASE, requestId)}/accept`,
    START_REVIEW: (requestId) => `${encodedById(DOCTOR_RECOVERY_PLAN_REQUESTS_BASE, requestId)}/start-review`,
    RELEASE: (requestId) => `${encodedById(DOCTOR_RECOVERY_PLAN_REQUESTS_BASE, requestId)}/release`,
    REJECT: (requestId) => `${encodedById(DOCTOR_RECOVERY_PLAN_REQUESTS_BASE, requestId)}/reject`,
    CREATE_PLAN: (requestId) => `${encodedById(DOCTOR_RECOVERY_PLAN_REQUESTS_BASE, requestId)}/plan`,
    CREATE_PLAN_FROM_TEMPLATE: (requestId) => `${encodedById(DOCTOR_RECOVERY_PLAN_REQUESTS_BASE, requestId)}/plan/from-template`,
  },
  DOCTOR_RECOVERY_PLANS: {
    BY_ID: (planId) => encodedById(DOCTOR_RECOVERY_PLANS_BASE, planId),
    FEEDBACK_ANALYTICS: `${DOCTOR_RECOVERY_PLANS_BASE}/analytics/feedback`,
    PHASES: (planId) => `${encodedById(DOCTOR_RECOVERY_PLANS_BASE, planId)}/phases`,
    PHASE_BY_ID: (planId, phaseId) => `${encodedById(DOCTOR_RECOVERY_PLANS_BASE, planId)}/phases/${encodeURIComponent(phaseId)}`,
    NUTRIENTS: (planId, phaseId) => `${encodedById(DOCTOR_RECOVERY_PLANS_BASE, planId)}/phases/${encodeURIComponent(phaseId)}/nutrients`,
    NUTRIENT_BY_ID: (planId, phaseId, nutrientId) => `${encodedById(DOCTOR_RECOVERY_PLANS_BASE, planId)}/phases/${encodeURIComponent(phaseId)}/nutrients/${encodeURIComponent(nutrientId)}`,
    FOODS: (planId, phaseId, nutrientId) => `${encodedById(DOCTOR_RECOVERY_PLANS_BASE, planId)}/phases/${encodeURIComponent(phaseId)}/nutrients/${encodeURIComponent(nutrientId)}/foods`,
    FOOD_BY_ID: (planId, phaseId, nutrientId, foodSourceId) => `${encodedById(DOCTOR_RECOVERY_PLANS_BASE, planId)}/phases/${encodeURIComponent(phaseId)}/nutrients/${encodeURIComponent(nutrientId)}/foods/${encodeURIComponent(foodSourceId)}`,
    PUBLISH: (planId) => `${encodedById(DOCTOR_RECOVERY_PLANS_BASE, planId)}/publish`,
  },
  DOCTOR_RECOVERY_PLAN_TEMPLATES: {
    BASE: DOCTOR_RECOVERY_PLAN_TEMPLATES_BASE,
    BY_ID: (templateId) => encodedById(DOCTOR_RECOVERY_PLAN_TEMPLATES_BASE, templateId),
    PHASES: (templateId) => `${encodedById(DOCTOR_RECOVERY_PLAN_TEMPLATES_BASE, templateId)}/phases`,
    PHASE_BY_ID: (templateId, phaseId) => `${encodedById(DOCTOR_RECOVERY_PLAN_TEMPLATES_BASE, templateId)}/phases/${encodeURIComponent(phaseId)}`,
    NUTRIENTS: (templateId, phaseId) => `${encodedById(DOCTOR_RECOVERY_PLAN_TEMPLATES_BASE, templateId)}/phases/${encodeURIComponent(phaseId)}/nutrients`,
    NUTRIENT_BY_ID: (templateId, phaseId, nutrientId) => `${encodedById(DOCTOR_RECOVERY_PLAN_TEMPLATES_BASE, templateId)}/phases/${encodeURIComponent(phaseId)}/nutrients/${encodeURIComponent(nutrientId)}`,
    FOODS: (templateId, phaseId, nutrientId) => `${encodedById(DOCTOR_RECOVERY_PLAN_TEMPLATES_BASE, templateId)}/phases/${encodeURIComponent(phaseId)}/nutrients/${encodeURIComponent(nutrientId)}/foods`,
    FOOD_BY_ID: (templateId, phaseId, nutrientId, foodSourceId) => `${encodedById(DOCTOR_RECOVERY_PLAN_TEMPLATES_BASE, templateId)}/phases/${encodeURIComponent(phaseId)}/nutrients/${encodeURIComponent(nutrientId)}/foods/${encodeURIComponent(foodSourceId)}`,
  },
};
