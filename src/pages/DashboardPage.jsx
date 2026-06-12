import { useState } from "react";
import { ClipboardPlus, Send } from "lucide-react";
import { Alert, Button, Field, Textarea } from "../components/ui";
import { navigate } from "../router/navigation";
import { getStoredAuth, webChatbotApi } from "../services/api";
import { trackUxEvent } from "../utils/analytics";
import "../styles/dashboard.css";

const PROMPTS = [
  "Đau bụng âm ỉ sau bữa ăn, buồn nôn nhẹ",
  "Sốt nhẹ 2 ngày kèm đau họng",
  "Khó thở khi leo cầu thang, tim đập nhanh",
  "Đau đầu kéo dài và mất ngủ",
];

export default function DashboardPage() {
  const auth = getStoredAuth();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submitSymptom(textOverride) {
    const symptom = (textOverride ?? input).trim();
    if (!symptom || loading) return;

    setLoading(true);
    setError("");
    trackUxEvent("specialty_intake_submitted", { source: textOverride ? "quick_prompt" : "manual" });

    try {
      const response = await webChatbotApi.message(symptom, { auth: Boolean(auth) });
      const data = response.data ?? response;
      sessionStorage.setItem("medimate.map.chat", JSON.stringify({
        symptom,
        answer: data.answer || "AI đã ghi nhận triệu chứng và sẽ gợi ý cơ sở phù hợp.",
        intent: data.intent || "specialty_recommendation",
        needsMoreInformation: Boolean(data.needsMoreInformation),
      }));
      navigate("/map");
    } catch (apiError) {
      sessionStorage.setItem("medimate.map.chat", JSON.stringify({
        symptom,
        answer: "MediMate AI đang tạm dùng luồng dự phòng. Bạn có thể xem các bệnh viện phù hợp tại bản đồ và thử gửi lại sau.",
        intent: "fallback",
        needsMoreInformation: false,
      }));
      setError(apiError.message);
      navigate("/map");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="specialty-page">
      <section className="studio-center" aria-label="Gợi ý chuyên khoa qua triệu chứng">
        <div className="studio-heading">
          <span className="studio-mark"><ClipboardPlus size={28} /></span>
          <h1>Gợi ý chuyên khoa qua triệu chứng</h1>
          <p>Ghi lại triệu chứng như khi trao đổi ở quầy tiếp nhận. MediMate sẽ gợi ý hướng chuyên khoa và chuyển sang bản đồ cơ sở phù hợp.</p>
        </div>

        <div className="studio-chatbox">
          <div className="clinical-strip">
            <span>Tiếp nhận ban đầu</span>
            <span>Không thay thế chẩn đoán</span>
          </div>
          <Field
            id="specialty-symptoms"
            label="Triệu chứng bạn đang gặp"
            hint="Mô tả thời điểm bắt đầu, mức độ và dấu hiệu đi kèm để gợi ý phù hợp hơn."
            required
          >
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ví dụ: Tôi đau bụng âm ỉ sau bữa ăn, buồn nôn nhẹ..."
              rows={4}
            />
          </Field>
          <div className="studio-chat-actions">
            <span className="studio-status" aria-live="polite">
              {loading ? "Đang phân tích triệu chứng..." : <><strong>Sẵn sàng.</strong> Kết quả sẽ mở cùng danh sách cơ sở phù hợp.</>}
            </span>
            <Button
              size="lg"
              loading={loading}
              loadingLabel="Đang phân tích..."
              disabled={!input.trim()}
              onClick={() => submitSymptom()}
            >
              <Send size={18} />
              Gợi ý chuyên khoa
            </Button>
          </div>
        </div>

        <div className="studio-prompts" aria-label="Triệu chứng mẫu">
          {PROMPTS.map((prompt) => (
            <button key={prompt} type="button" disabled={loading} onClick={() => setInput(prompt)}>
              {prompt}
            </button>
          ))}
        </div>

        {error && (
          <Alert tone="danger" title="Không thể kết nối dịch vụ phân tích" live>
            {error} MediMate đã chuyển sang dữ liệu dự phòng trên bản đồ.
          </Alert>
        )}

        <Alert className="studio-safety" tone="warning" title="Khi nào cần cấp cứu?">
          Nếu bạn khó thở nặng, đau ngực, bất tỉnh, co giật hoặc chảy máu nhiều, hãy gọi cấp cứu 115 ngay thay vì chờ kết quả AI.
        </Alert>
      </section>
    </main>
  );
}
