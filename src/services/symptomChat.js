import { apiRequest } from "./api";

export async function sendSymptomMessage(message) {
  return apiRequest("/api/web-chatbot/message", {
    method: "POST",
    body: { message },
    auth: true,
  });
}
