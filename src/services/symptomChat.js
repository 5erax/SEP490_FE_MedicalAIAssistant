import { webChatbotApi } from "./api";

export async function sendSymptomMessage(message) {
  return webChatbotApi.message(message, { auth: true });
}
