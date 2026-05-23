import { useState } from "react";
import { ClipboardPlus, Send } from "lucide-react";
import { getStoredAuth, webChatbotApi } from "../services/api";
import { trackUxEvent } from "../utils/analytics";

const PROMPTS = [
  "Đau bụng âm ỉ sau bữa ăn, buồn nôn nhẹ",
  "Sốt nhẹ 2 ngày kèm đau họng",
  "Khó thở khi leo cầu thang, tim đập nhanh",
  "Đau đầu kéo dài và mất ngủ",
];

function navigate(path) {
  window.location.href = path;
}

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
      <style>{styles}</style>
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
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ví dụ: Tôi đau bụng âm ỉ sau bữa ăn, buồn nôn nhẹ..."
            rows={4}
          />
          <div className="studio-chat-actions">
            <span>{loading ? "Đang phân tích..." : "Sẵn sàng gợi ý chuyên khoa"}</span>
            <button type="button" disabled={!input.trim() || loading} onClick={() => submitSymptom()}>
              <Send size={18} />
              Gửi
            </button>
          </div>
        </div>

        <div className="studio-prompts">
          {PROMPTS.map((prompt) => (
            <button key={prompt} type="button" onClick={() => submitSymptom(prompt)}>
              {prompt}
            </button>
          ))}
        </div>

        {error && <p className="studio-error">{error}</p>}
      </section>
    </main>
  );
}

const styles = `
.specialty-page{min-height:calc(100svh - 96px);display:grid;place-items:center;position:relative;background:linear-gradient(180deg,#f7fbf1 0%,#eef5e8 100%);color:#111412;padding:48px 20px;overflow:hidden}
.studio-center{width:min(820px,100%);display:grid;gap:22px;justify-items:center;position:relative;z-index:1}
.studio-heading{text-align:center;display:grid;gap:12px;justify-items:center}
.studio-mark{width:66px;height:66px;display:grid;place-items:center;border:1.5px solid #111412;border-radius:18px;background:#aaed63;color:#111412;box-shadow:4px 4px 0 #111412}
.studio-heading h1{margin:0;font-family:var(--display);font-size:clamp(36px,6vw,66px);line-height:1.02;letter-spacing:0}
.studio-heading p{max-width:650px;margin:0;color:rgba(17,20,18,.68);line-height:1.65}
.studio-chatbox{width:100%;border:1.5px solid #111412;border-radius:18px;background:#fff;box-shadow:6px 6px 0 #111412;padding:16px}
.clinical-strip{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}
.clinical-strip span{border-radius:999px;background:#e7f7db;color:#315d18;padding:7px 10px;font-size:12px;font-weight:900}
.studio-chatbox textarea{width:100%;min-height:138px;resize:vertical;border:1px solid rgba(17,20,18,.14);border-radius:12px;outline:0;background:#fbfcf7;color:#111412;font:inherit;line-height:1.6;padding:14px}
.studio-chatbox textarea::placeholder{color:rgba(17,20,18,.42)}
.studio-chat-actions{display:flex;justify-content:space-between;align-items:center;gap:12px;border-top:1px solid rgba(17,20,18,.1);margin-top:12px;padding-top:12px;color:rgba(17,20,18,.58);font-size:13px;font-weight:800}
.studio-chat-actions button{display:inline-flex;align-items:center;gap:8px;min-height:42px;border:1px solid #aaed63;border-radius:999px;background:#aaed63;color:#111412;padding:0 18px;font-weight:900}
.studio-chat-actions button:disabled{opacity:.45;cursor:not-allowed}
.studio-prompts{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}
.studio-prompts button{border:1px solid rgba(17,20,18,.14);border-radius:999px;background:#fff;color:rgba(17,20,18,.76);padding:10px 14px;font-weight:800}
.studio-prompts button:hover{border-color:#111412;background:#e7f7db;color:#111412}
.studio-error{margin:0;color:#b42318;font-size:13px;font-weight:800}
@media(max-width:760px){.specialty-page{min-height:calc(100svh - 72px);padding:28px 12px 88px}.studio-chat-actions{align-items:stretch;flex-direction:column}.studio-chat-actions button{justify-content:center;width:100%}}
`;
