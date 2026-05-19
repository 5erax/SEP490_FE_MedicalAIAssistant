import { useMemo, useState } from "react";
import { sendSymptomMessage } from "../../services/symptomChat";

const QUICK_SYMPTOM_PROMPTS = [
  "Tôi bị đau đầu và sốt nhẹ 2 ngày",
  "Tôi đau bụng âm ỉ sau khi ăn",
  "Tôi ho, đau họng và hơi khó thở",
];

function ApiMessage({ message }) {
  if (!message) return null;
  return <div className={`api-message ${message.type}`}>{message.text}</div>;
}

function buildAssistantText(response) {
  const data = response.data ?? {};
  const answer = data.answer || response.message || "MediMate AI đã ghi nhận triệu chứng của bạn.";
  const hintText = data.needsMoreInformation
    ? "\n\nBạn có thể bổ sung thêm thời gian xuất hiện, mức độ đau, thuốc đang dùng và bệnh nền nếu có."
    : "";
  const planNames = data.recommendedPlans?.map((plan) => plan.planName).filter(Boolean) ?? [];
  const planText = planNames.length ? `\n\nGói phù hợp: ${planNames.join(", ")}.` : "";

  return `${answer}${hintText}${planText}`;
}

function LoadingBubble() {
  return (
    <div className="chat-bubble assistant chat-loading">
      <span />
      <span />
      <span />
    </div>
  );
}

export default function SymptomChatBox() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(null);

  const canSend = useMemo(() => draft.trim().length > 0 && !sending, [draft, sending]);

  async function handleSubmit(event) {
    event.preventDefault();
    const symptomText = draft.trim();
    if (!symptomText || sending) return;

    setMessages((current) => [...current, { from: "user", text: symptomText }]);
    setDraft("");
    setSending(true);
    setMessage(null);

    try {
      const response = await sendSymptomMessage(symptomText);
      setMessages((current) => [
        ...current,
        {
          from: "assistant",
          text: buildAssistantText(response),
        },
      ]);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
      setMessages((current) => [
        ...current,
        {
          from: "assistant",
          text: "Hiện chưa thể phân tích triệu chứng ngay. Nếu triệu chứng nặng lên, bạn nên liên hệ cơ sở y tế hoặc đi khám sớm.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="app-card patient-chat-card symptom-chat-card">
      <div className="panel-title-row">
        <div>
          <p className="eyebrow">Triệu chứng</p>
          <h2>Chat mô tả triệu chứng</h2>
        </div>
        <span className="soft-badge">{sending ? "Đang phân tích" : "Sẵn sàng"}</span>
      </div>

      <ApiMessage message={message} />

      <div className="chat-thread symptom-chat-thread" aria-live="polite">
        {messages.length === 0 && (
          <div className="chat-empty-state">
            <strong>Bắt đầu bằng triệu chứng bạn đang gặp.</strong>
            <span>Ví dụ: vị trí đau, thời gian xuất hiện, mức độ khó chịu và dấu hiệu đi kèm.</span>
          </div>
        )}
        {messages.map((item, index) => (
          <div className={`chat-bubble ${item.from}`} key={`${item.from}-${index}`}>
            {item.text}
          </div>
        ))}
        {sending && <LoadingBubble />}
      </div>

      <div className="quick-prompts">
        {QUICK_SYMPTOM_PROMPTS.map((prompt) => (
          <button key={prompt} type="button" onClick={() => setDraft(prompt)} disabled={sending}>
            {prompt}
          </button>
        ))}
      </div>

      <form className="chat-input-row" onSubmit={handleSubmit}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Nhập triệu chứng của bạn..."
          disabled={sending}
        />
        <button className="btn btn-primary btn-small" type="submit" disabled={!canSend}>
          {sending ? "Đang gửi..." : "Gửi"}
        </button>
      </form>
    </section>
  );
}

