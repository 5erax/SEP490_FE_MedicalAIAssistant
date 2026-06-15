import { useState } from "react";
import { ClipboardPlus, Send } from "lucide-react";
import { Alert, Button, Field, Textarea } from "../components/ui";
import { navigate } from "../router/navigation";
import { trackUxEvent } from "../utils/analytics";
import "../styles/dashboard.css";

const PROMPTS = [
  "Đau bụng âm ỉ sau bữa ăn, buồn nôn nhẹ",
  "Sốt nhẹ 2 ngày kèm đau họng",
  "Khó thở khi leo cầu thang, tim đập nhanh",
  "Đau đầu kéo dài và mất ngủ",
];

export default function DashboardPage() {
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
      sessionStorage.setItem("medimate.symptom.prefill", symptom);
      navigate("/symptom");
    } catch (apiError) {
      setError(apiError.message);
      sessionStorage.setItem("medimate.symptom.prefill", symptom);
      navigate("/symptom");
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
          <p>Ghi lại triệu chứng như khi trao đổi ở quầy tiếp nhận. MediMate sẽ hỏi thêm yes/no trước khi gợi ý chẩn đoán và cơ sở phù hợp.</p>
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
              {loading ? "Đang mở luồng chẩn đoán..." : <><strong>Sẵn sàng.</strong> Bạn sẽ trả lời vài câu yes/no trước khi xem gợi ý cơ sở phù hợp.</>}
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
            {error} MediMate sẽ mở luồng chẩn đoán để bạn tiếp tục trả lời câu hỏi.
          </Alert>
        )}

        <Alert className="studio-safety" tone="warning" title="Khi nào cần cấp cứu?">
          Nếu bạn khó thở nặng, đau ngực, bất tỉnh, co giật hoặc chảy máu nhiều, hãy gọi cấp cứu 115 ngay thay vì chờ kết quả AI.
        </Alert>
      </section>
    </main>
  );
}
