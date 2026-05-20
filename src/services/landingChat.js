import { apiRequest } from "./api";

const FALLBACK_RESPONSES = [
  {
    keywords: ["khoa", "khám khoa"],
    answer: "Nếu bạn chưa chắc nên khám khoa nào, hãy mô tả triệu chứng chính, thời gian xuất hiện và mức độ khó chịu. MediMate AI có thể gợi ý hướng chuyên khoa ban đầu và bạn có thể mở Trợ lý triệu chứng nâng cao để xem bản đồ cơ sở y tế.",
  },
  {
    keywords: ["bệnh viện", "gần"],
    answer: "Bạn có thể dùng trang Trợ lý triệu chứng nâng cao để xem gợi ý cơ sở y tế trên bản đồ. Nếu có triệu chứng nặng như khó thở, đau ngực, ngất, hãy ưu tiên đi cấp cứu ngay.",
  },
  {
    keywords: ["sốt"],
    answer: "Với sốt nhẹ, bạn nên theo dõi nhiệt độ, uống đủ nước và ghi lại triệu chứng kèm theo. Nếu sốt cao, kéo dài, khó thở, lơ mơ hoặc đau nhiều, hãy đi khám sớm.",
  },
  {
    keywords: ["đăng ký", "khám"],
    answer: "Bạn có thể tạo tài khoản MediMate để lưu hồ sơ sức khỏe, mô tả triệu chứng và chuẩn bị thông tin trước khi đi khám. Sau khi đăng nhập, hệ thống sẽ mở workspace cá nhân cho bạn.",
  },
];

function buildFallbackAnswer(message) {
  const normalized = message.toLowerCase();
  const matched = FALLBACK_RESPONSES.find((item) => item.keywords.some((keyword) => normalized.includes(keyword)));

  return matched?.answer || "MediMate AI có thể hỗ trợ bạn tìm hướng đi tiếp theo: mô tả triệu chứng, xem gợi ý chuyên khoa, tìm cơ sở y tế và chuẩn bị câu hỏi trước khi khám.";
}

export async function sendLandingChatMessage(message) {
  try {
    const response = await apiRequest("/api/web-chatbot/message", {
      method: "POST",
      body: { message },
    });

    return {
      answer: response.data?.answer || response.message || buildFallbackAnswer(message),
      fromApi: true,
    };
  } catch {
    return {
      answer: buildFallbackAnswer(message),
      fromApi: false,
    };
  }
}
