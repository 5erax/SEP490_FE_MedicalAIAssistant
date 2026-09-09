import { apiRequest } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

export const facilityDepartmentsApi = {
  active(options = {}) {
    return apiRequest(ENDPOINTS.FACILITY_DEPARTMENTS.ACTIVE, options);
  },
};
