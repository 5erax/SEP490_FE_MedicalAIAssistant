import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { clearStoredAuth, getStoredAuth, webChatbotApi } from "../services/api";

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

  function logout() {
    clearStoredAuth();
    navigate("/");
  }

  return (
    <main className="ai-studio-page">
      <style>{styles}</style>
      <section className="studio-center" aria-label="Gợi ý chuyên khoa qua triệu chứng">
        <div className="studio-heading">
          <span className="studio-mark"><Sparkles size={26} /></span>
          <h1>Gợi ý chuyên khoa qua triệu chứng</h1>
          <p>Mô tả triệu chứng bằng tiếng Việt tự nhiên, MediMate AI sẽ chuyển bạn tới bản đồ cơ sở y tế phù hợp.</p>
        </div>

        <div className="studio-chatbox">
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

      <button className="studio-logout" type="button" onClick={logout}>Đăng xuất</button>
    </main>
  );
}

const styles = `
.ai-studio-page{min-height:calc(100svh - 96px);display:grid;place-items:center;position:relative;background:#151715;color:#f6f7f2;padding:48px 20px;overflow:hidden}
.ai-studio-page:before{content:"";position:absolute;inset:auto 10% 12%;height:280px;background:radial-gradient(circle,rgba(170,237,99,.16),transparent 64%);filter:blur(20px);pointer-events:none}
.studio-center{width:min(820px,100%);display:grid;gap:22px;justify-items:center;position:relative;z-index:1}
.studio-heading{text-align:center;display:grid;gap:12px;justify-items:center}
.studio-mark{width:62px;height:62px;display:grid;place-items:center;border:1px solid rgba(170,237,99,.45);border-radius:18px;background:#1e211e;color:#aaed63;box-shadow:0 0 48px rgba(170,237,99,.18)}
.studio-heading h1{margin:0;font-family:var(--display);font-size:clamp(36px,6vw,66px);line-height:1.02;letter-spacing:0}
.studio-heading p{max-width:620px;margin:0;color:rgba(246,247,242,.68);line-height:1.65}
.studio-chatbox{width:100%;border:1px solid rgba(170,237,99,.4);border-radius:18px;background:#1d201d;box-shadow:0 22px 80px rgba(0,0,0,.28),inset 0 0 0 1px rgba(255,255,255,.04);padding:16px}
.studio-chatbox textarea{width:100%;min-height:138px;resize:vertical;border:0;outline:0;background:transparent;color:#fff;font:inherit;line-height:1.6}
.studio-chatbox textarea::placeholder{color:rgba(246,247,242,.45)}
.studio-chat-actions{display:flex;justify-content:space-between;align-items:center;gap:12px;border-top:1px solid rgba(255,255,255,.08);padding-top:12px;color:rgba(246,247,242,.58);font-size:13px;font-weight:800}
.studio-chat-actions button{display:inline-flex;align-items:center;gap:8px;min-height:42px;border:1px solid #aaed63;border-radius:999px;background:#aaed63;color:#111412;padding:0 18px;font-weight:900}
.studio-chat-actions button:disabled{opacity:.45;cursor:not-allowed}
.studio-prompts{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}
.studio-prompts button{border:1px solid rgba(255,255,255,.1);border-radius:999px;background:#232723;color:rgba(246,247,242,.78);padding:10px 14px;font-weight:800}
.studio-prompts button:hover{border-color:#aaed63;color:#fff}
.studio-error{margin:0;color:#ffd6d1;font-size:13px;font-weight:800}
.studio-logout{position:absolute;right:18px;top:18px;border:1px solid rgba(255,255,255,.16);border-radius:999px;background:#202320;color:#fff;padding:9px 13px;font-weight:900}
@media(max-width:760px){.ai-studio-page{min-height:calc(100svh - 72px);padding:28px 12px 88px}.studio-chat-actions{align-items:stretch;flex-direction:column}.studio-chat-actions button{justify-content:center;width:100%}.studio-logout{display:none}}
`;
