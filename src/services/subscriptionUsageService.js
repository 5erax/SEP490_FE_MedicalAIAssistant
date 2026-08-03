import { apiRequest } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

export const subscriptionUsageApi = {
  getUsage() {
    return apiRequest(ENDPOINTS.SUBSCRIPTION_USAGE.ME, { auth: true });
  },
};
