import { apiRequest } from "./httpClient";

export const webChatbotApi = {
  message(message, { auth = false } = {}) {
    return apiRequest("/api/web-chatbot/message", {
      method: "POST",
      body: { message },
      auth,
    });
  },
};
