// Compatibility barrel: existing imports can keep using "../services/api".
export {
  clearStoredAuth,
  getAccessToken,
  getStoredAuth,
  hasPremiumAccess,
  hasStoredAuthRecord,
  isAuthenticated,
  setStoredAuth,
} from "./api/authStorage";
export { apiRequest, getFreshAccessToken, refreshStoredAuth } from "./api/httpClient";
export { authApi } from "./api/authApi";
export { medicalDepartmentsApi, medicalFacilitiesApi, doctorsApi } from "./api/catalogApi";
export { patientProfilesApi } from "./api/patientProfilesApi";
export { usersApi } from "./api/usersApi";
export { subscriptionPlansApi } from "./api/subscriptionsApi";
export { aiConfigsApi } from "./api/aiConfigsApi";
export { webChatbotApi } from "./api/chatbotApi";
export { symptomAnalysisApi } from "./api/symptomAnalysisApi";
