import { webChatbotApi } from "./api";

export async function sendLandingChatMessage(message) {
  const response = await webChatbotApi.message(message);
  const answer = response.data?.answer || response.message || "";

  if (!answer.trim()) {
    throw new Error("Backend AI chua tra ve noi dung phan hoi.");
  }

  return {
    answer,
    fromApi: true,
  };
}
