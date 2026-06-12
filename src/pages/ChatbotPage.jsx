import { useEffect, useRef, useState } from "react";
import { navigate as goTo } from "../router/navigation";
import { sendAnthropicMessage } from "../services/anthropicService";

const WELCOME_PROMPTS = [
  "Tôi bị đau đầu và sốt nhẹ 2 ngày",
  "Tôi nên chuẩn bị gì trước khi đi khám?",
  "Triệu chứng nào cần đi cấp cứu ngay?",
  "Giải thích chỉ số xét nghiệm máu",
];

function formatTime(date) {
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function ChatbotPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState(() => {
    const prefill = sessionStorage.getItem("medimate.chat.prefill");
    if (prefill) sessionStorage.removeItem("medimate.chat.prefill");
    return prefill || "";
  });
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const messageIdRef = useRef(0);

  useEffect(() => {
    if (input) window.setTimeout(() => textareaRef.current?.focus(), 80);
  }, [input]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleInput = (event) => {
    event.target.style.height = "auto";
    event.target.style.height = `${Math.min(event.target.scrollHeight, 96)}px`;
    setInput(event.target.value);
  };

  const addFallbackReply = () => {
    setMessages((current) => [
      ...current,
      {
        id: `message-${messageIdRef.current += 1}`,
        role: "assistant",
        content: "Xin lỗi, không thể kết nối với trợ lý lúc này. Bạn có thể thử lại sau hoặc mô tả triệu chứng trong phần phân tích triệu chứng.",
        timestamp: new Date(),
      },
    ]);
  };

  const handleSend = async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || isLoading) return;

    const userMessage = {
      id: `message-${messageIdRef.current += 1}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    const history = [...messages, userMessage];
    setMessages(history);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setIsLoading(true);

    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_KEY;
      if (!apiKey) throw new Error("Missing Anthropic key");

      const data = await sendAnthropicMessage({
        apiKey,
        body: {
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `Bạn là MediMate AI, trợ lý y khoa thông minh.
Trả lời bằng tiếng Việt, ngắn gọn, dễ hiểu, thân thiện.
Khi nói về thuốc hoặc điều trị, luôn khuyên người dùng tham khảo bác sĩ.
Nếu triệu chứng nghiêm trọng, khuyến nghị đi cấp cứu ngay.`,
          messages: history.map((message) => ({
            role: message.role === "assistant" ? "assistant" : "user",
            content: message.content,
          })),
        },
      });

      const aiText = data.content?.[0]?.text || "Xin lỗi, có lỗi xảy ra.";
      setMessages((current) => [
        ...current,
        {
          id: `message-${messageIdRef.current += 1}`,
          role: "assistant",
          content: aiText,
          timestamp: new Date(),
        },
      ]);
    } catch {
      addFallbackReply();
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const goMedication = () => {
    sessionStorage.setItem("medimate.medication.fromChat", "1");
    goTo("/medication");
  };

  return (
    <main className="chatbot-page">
      <style>{styles}</style>
      <header className="chatbot-header">
        <button className="back-btn" type="button" onClick={() => goTo("/dashboard")}>←</button>
        <div className="bot-avatar">MM</div>
        <div>
          <strong>Trợ lý MediMate AI</strong>
          <span><i /> Sẵn sàng</span>
        </div>
        <div className="chatbot-actions">
          <button type="button" onClick={() => goTo("/symptom")}>Phân tích</button>
          <button type="button" onClick={() => goTo("/map")}>Bản đồ</button>
          <button type="button" onClick={() => setMessages([])}>Xoá lịch sử</button>
          <button type="button" onClick={() => goTo("/dashboard")}>Thu nhỏ</button>
        </div>
      </header>

      <div className="chatbot-disclaimer">⚕ Kết quả AI chỉ mang tính tham khảo và không thay thế chẩn đoán y khoa chuyên nghiệp.</div>

      <section className="message-area" aria-live="polite">
        {messages.length === 0 && !isLoading ? (
          <div className="welcome-state">
            <div className="welcome-logo">MM</div>
            <h1>Xin chào! Tôi là MediMate AI.</h1>
            <p>Hãy mô tả triệu chứng hoặc câu hỏi sức khoẻ của bạn bằng tiếng Việt tự nhiên.</p>
            <div className="welcome-prompts">
              {WELCOME_PROMPTS.map((prompt) => (
                <button key={prompt} type="button" onClick={() => handleSend(prompt)}>{prompt}</button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <article className={`message-row ${message.role}`} key={message.id}>
              <div className="message-bubble">
                <p>{message.content}</p>
                {message.role === "assistant" && (
                  <>
                    <hr />
                    <small>Kết quả chỉ mang tính tham khảo. Hãy liên hệ bác sĩ nếu triệu chứng nặng hoặc kéo dài.</small>
                  </>
                )}
              </div>
              <time>{formatTime(message.timestamp)}</time>
            </article>
          ))
        )}

        {isLoading && (
          <article className="message-row assistant">
            <div className="message-bubble typing">
              <span />
              <span />
              <span />
            </div>
          </article>
        )}
        <div ref={messagesEndRef} />
      </section>

      <footer className="chat-input-area">
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Nhập triệu chứng hoặc câu hỏi..."
        />
        <button className="icon-button" type="button" onClick={goMedication} aria-label="Đính kèm ảnh thuốc">📷</button>
        <button className="send-button" type="button" disabled={!input.trim() || isLoading} onClick={() => handleSend()} aria-label="Gửi">➜</button>
      </footer>
    </main>
  );
}

const styles = `
.chatbot-page { height: 100svh; display: flex; flex-direction: column; background: var(--bg); color: var(--ink); overflow: hidden; }
.chatbot-header { height: 58px; flex: 0 0 auto; display: flex; align-items: center; gap: 12px; border-bottom: 1.5px solid var(--ink); background: var(--paper); padding: 8px 16px; }
.back-btn, .chatbot-actions button, .icon-button, .send-button { border: 1.5px solid var(--ink); border-radius: 9px; background: #fff; color: var(--ink); font-weight: 900; }
.back-btn { width: 38px; height: 38px; display: none; }
.bot-avatar, .welcome-logo { display: grid; place-items: center; border: 1.5px solid var(--ink); border-radius: 999px; background: var(--ink); color: var(--lime); font-weight: 900; }
.bot-avatar { width: 40px; height: 40px; }
.chatbot-header strong, .chatbot-header span { display: block; }
.chatbot-header strong { font-size: 14px; }
.chatbot-header span { display: inline-flex; align-items: center; gap: 6px; margin-top: 2px; color: var(--muted); font-size: 12px; font-weight: 800; }
.chatbot-header i { width: 8px; height: 8px; border-radius: 50%; background: var(--lime); }
.chatbot-actions { margin-left: auto; display: flex; gap: 8px; }
.chatbot-actions button { min-height: 34px; padding: 0 11px; font-size: 12px; }
.chatbot-actions button:hover, .icon-button:hover { background: var(--mint); }
.chatbot-disclaimer { flex: 0 0 auto; min-height: 34px; display: flex; align-items: center; border-bottom: 1px solid rgba(217,119,6,.35); background: rgba(245,158,11,.16); color: #7c3f00; padding: 7px 16px; font-size: 12px; font-weight: 800; line-height: 1.35; }
.message-area { flex: 1; overflow-y: auto; display: grid; align-content: start; gap: 12px; padding: 16px; }
.welcome-state { min-height: 100%; display: grid; place-items: center; align-content: center; gap: 12px; text-align: center; }
.welcome-logo { width: 78px; height: 78px; font-size: 20px; box-shadow: 4px 4px 0 var(--lime); }
.welcome-state h1 { margin: 0; font-family: var(--display); font-size: clamp(28px, 5vw, 44px); }
.welcome-state p { max-width: 540px; margin: 0; color: var(--muted); line-height: 1.6; }
.welcome-prompts { display: grid; grid-template-columns: repeat(2, minmax(0, 260px)); gap: 10px; margin-top: 10px; }
.welcome-prompts button { min-height: 64px; border: 1.5px solid var(--ink); border-radius: 12px; background: var(--paper); padding: 12px; color: var(--ink); font-weight: 800; text-align: left; box-shadow: 2px 2px 0 var(--ink); }
.welcome-prompts button:hover { background: var(--lime); transform: translateY(-2px); }
.message-row { display: grid; gap: 4px; max-width: min(680px, 86%); }
.message-row.user { justify-self: end; }
.message-row.assistant { justify-self: start; }
.message-bubble { border: 1.5px solid var(--ink); padding: 12px 13px; box-shadow: 1px 1px 0 var(--ink); line-height: 1.58; }
.message-bubble p { margin: 0; white-space: pre-wrap; }
.message-bubble hr { border: 0; border-top: 1px solid var(--line); margin: 10px 0 7px; }
.message-bubble small { color: var(--muted); font-style: italic; }
.message-row.user .message-bubble { border-radius: 12px 12px 2px 12px; background: var(--lime); }
.message-row.assistant .message-bubble { border-radius: 12px 12px 12px 2px; background: var(--paper); }
.message-row time { color: var(--subtle); font-size: 10px; font-weight: 800; }
.message-row.user time { text-align: right; }
.typing { display: inline-flex; gap: 5px; width: fit-content; }
.typing span { width: 7px; height: 7px; border-radius: 50%; background: var(--ink); animation: bounce .8s infinite ease-in-out; }
.typing span:nth-child(2) { animation-delay: .15s; }
.typing span:nth-child(3) { animation-delay: .3s; }
.chat-input-area { flex: 0 0 auto; min-height: 72px; display: flex; align-items: flex-end; gap: 10px; border-top: 1.5px solid var(--ink); background: var(--paper); padding: 12px 16px; }
.chat-input-area textarea { flex: 1; max-height: 96px; resize: none; border: 1.5px solid var(--ink); border-radius: 10px; background: #fff; padding: 10px 12px; line-height: 1.45; outline: none; }
.chat-input-area textarea:focus { box-shadow: 0 0 0 4px rgba(196, 233, 149, .28); }
.icon-button, .send-button { width: 40px; height: 40px; flex: 0 0 auto; display: grid; place-items: center; }
.send-button { background: var(--lime); }
.send-button:disabled { cursor: not-allowed; opacity: .45; }
@keyframes bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-4px); } }
@media (max-width: 760px) {
  .back-btn { display: grid; place-items: center; }
  .chatbot-header { padding-inline: 10px; }
  .chatbot-actions button { padding-inline: 8px; }
  .welcome-prompts { grid-template-columns: 1fr; width: 100%; }
  .message-row { max-width: 94%; }
  .chatbot-disclaimer { align-items: flex-start; }
}
`;

export default ChatbotPage;
