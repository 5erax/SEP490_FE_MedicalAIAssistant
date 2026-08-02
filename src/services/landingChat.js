import { webChatbotApi } from "./api";

export async function sendLandingChatMessage(message) {
  const response = await webChatbotApi.message(message);
  const answer = response.data?.answer || response.message || "";

  if (!answer.trim()) {
    throw new Error("Trợ lý AI chưa thể phản hồi. Vui lòng thử lại.");
  }

  return {
    answer,
    fromApi: true,
  };
}
