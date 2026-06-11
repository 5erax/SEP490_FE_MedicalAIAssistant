import { apiRequest } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

export const facilityDepartmentsApi = {
  active() {
    return apiRequest(ENDPOINTS.FACILITY_DEPARTMENTS.ACTIVE);
  },
};
