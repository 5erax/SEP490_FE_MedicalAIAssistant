import { apiRequest } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

export const webChatbotApi = {
  message(message, { auth = false } = {}) {
    return apiRequest(ENDPOINTS.WEB_CHATBOT.MESSAGE, {
      method: "POST",
      body: { message },
      auth,
    });
  },
};
