import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Bot,
  Camera,
  ChevronRight,
  CircleAlert,
  MapPin,
  MessageCircleHeart,
  Send,
  ShieldCheck,
  Stethoscope,
  Trash2,
} from "lucide-react";
import { navigate as goTo } from "../router/navigation";
import { webChatbotApi } from "../services/api";
import { Dialog } from "../components/ui";

const WELCOME_PROMPTS = [
  {
    icon: Activity,
    label: "Làm rõ triệu chứng",
    prompt: "Tôi bị đau đầu và sốt nhẹ 2 ngày",
  },
  {
    icon: Stethoscope,
    label: "Chuẩn bị đi khám",
    prompt: "Tôi nên chuẩn bị gì trước khi đi khám?",
  },
  {
    icon: CircleAlert,
    label: "Nhận biết dấu hiệu khẩn cấp",
    prompt: "Triệu chứng nào cần đi cấp cứu ngay?",
  },
  {
    icon: MessageCircleHeart,
    label: "Hiểu thông tin sức khỏe",
    prompt: "Giải thích chỉ số xét nghiệm máu",
  },
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
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const messageIdRef = useRef(0);
  const clearDialogTriggerRef = useRef(null);
  const clearDialogCancelRef = useRef(null);

  useEffect(() => {
    if (input && window.matchMedia?.("(pointer: fine)")?.matches) {
      window.setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }, [input]);

  useEffect(() => {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    messagesEndRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  }, [messages, isLoading]);

  const handleInput = (event) => {
    event.target.style.height = "auto";
    event.target.style.height = `${Math.min(event.target.scrollHeight, 112)}px`;
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

    setMessages((current) => [...current, userMessage]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setIsLoading(true);

    try {
      const response = await webChatbotApi.message(text, { auth: true });
      const aiText = response.data?.answer || response.message || "Xin lỗi, có lỗi xảy ra.";
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

  const latestAssistantMessage = [...messages].reverse().find((message) => message.role === "assistant");
  const conversationAnnouncement = isLoading
    ? "MediMate AI đang soạn phản hồi."
    : latestAssistantMessage
      ? `MediMate AI: ${latestAssistantMessage.content}`
      : "";

  return (
    <div className="chatbot-page">
      <style>{styles}</style>

      <header className="chatbot-header">
        <button
          className="chatbot-back-button"
          type="button"
          onClick={() => goTo("/dashboard")}
          aria-label="Quay lại tổng quan"
        >
          <ArrowLeft aria-hidden="true" size={19} />
        </button>

        <div className="chatbot-brand-mark" aria-hidden="true">
          <Bot size={22} />
        </div>
        <div className="chatbot-heading">
          <span className="chatbot-eyebrow">TRỢ LÝ SỨC KHỎE</span>
          <h1>MediMate AI</h1>
        </div>

        <nav className="chatbot-actions" aria-label="Lối tắt trợ lý">
          <button type="button" onClick={() => goTo("/dashboard")}>
            <Stethoscope aria-hidden="true" size={16} />
            <span>Phân tích triệu chứng</span>
          </button>
          <button type="button" onClick={() => goTo("/map")}>
            <MapPin aria-hidden="true" size={16} />
            <span>Tìm cơ sở y tế</span>
          </button>
          {messages.length > 0 && (
            <button
              ref={clearDialogTriggerRef}
              className="chatbot-clear-button"
              type="button"
              onClick={() => setClearDialogOpen(true)}
            >
              <Trash2 aria-hidden="true" size={16} />
              <span>Xóa hội thoại</span>
            </button>
          )}
        </nav>
      </header>

      <div className="chatbot-scope-note" role="note">
        <ShieldCheck aria-hidden="true" size={17} />
        <span>
          Nội dung AI chỉ để tham khảo, không phải chẩn đoán và không thay thế bác sĩ.
        </span>
      </div>

      <section
        className="chatbot-message-area"
        aria-label="Nội dung hội thoại"
        aria-busy={isLoading}
      >
        {messages.length === 0 && !isLoading ? (
          <div className="chatbot-welcome-state">
            <div className="chatbot-welcome-intro">
              <div className="chatbot-welcome-icon" aria-hidden="true">
                <Bot size={27} />
              </div>
              <span className="chatbot-section-kicker">BẮT ĐẦU CUỘC TRAO ĐỔI</span>
              <h2>Bạn đang cần tìm hiểu điều gì?</h2>
              <p>
                Mô tả điều bạn đang gặp hoặc chọn một chủ đề bên cạnh. Hãy tránh
                nhập thông tin nhận dạng cá nhân không cần thiết.
              </p>
              <div className="chatbot-privacy-cue">
                <ShieldCheck aria-hidden="true" size={17} />
                <span>Bạn chủ động chọn thông tin muốn chia sẻ.</span>
              </div>
            </div>

            <div className="chatbot-prompt-panel">
              <span className="chatbot-prompt-label">GỢI Ý ĐỂ BẮT ĐẦU</span>
              <div className="chatbot-welcome-prompts">
                {WELCOME_PROMPTS.map(({ icon: Icon, label, prompt }) => (
                  <button key={prompt} type="button" onClick={() => handleSend(prompt)}>
                    <span className="chatbot-prompt-icon" aria-hidden="true">
                      <Icon size={19} />
                    </span>
                    <span>
                      <strong>{label}</strong>
                      <small>{prompt}</small>
                    </span>
                    <ChevronRight aria-hidden="true" size={18} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="chatbot-conversation">
            {messages.map((message) => (
              <article className={`chatbot-message-row ${message.role}`} key={message.id}>
                {message.role === "assistant" && (
                  <div className="chatbot-message-avatar" aria-hidden="true">
                    <Bot size={17} />
                  </div>
                )}
                <div className="chatbot-message-content">
                  <div className="chatbot-message-bubble">
                    <p>{message.content}</p>
                    {message.role === "assistant" && (
                      <small>
                        Thông tin tham khảo. Hãy liên hệ cơ sở y tế nếu triệu chứng
                        nặng, kéo dài hoặc khiến bạn lo lắng.
                      </small>
                    )}
                  </div>
                  <time dateTime={message.timestamp.toISOString()}>
                    {formatTime(message.timestamp)}
                  </time>
                </div>
              </article>
            ))}

            {isLoading && (
              <article
                className="chatbot-message-row assistant"
                aria-label="MediMate AI đang soạn phản hồi"
              >
                <div className="chatbot-message-avatar" aria-hidden="true">
                  <Bot size={17} />
                </div>
                <div className="chatbot-message-bubble chatbot-typing" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
              </article>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </section>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {conversationAnnouncement}
      </p>

      <footer className="chatbot-composer">
        <div className="chatbot-composer-inner">
          <button
            className="chatbot-medication-button"
            type="button"
            onClick={goMedication}
            aria-label="Mở công cụ nhận diện thuốc"
          >
            <Camera aria-hidden="true" size={20} />
          </button>
          <div className="chatbot-input-shell">
            <label htmlFor="chatbot-message-input">Nội dung cần hỏi</label>
            <textarea
              id="chatbot-message-input"
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              name="message"
              aria-describedby="chatbot-composer-help"
              placeholder="Mô tả triệu chứng hoặc đặt câu hỏi…"
            />
          </div>
          <button
            className="chatbot-send-button"
            type="button"
            disabled={!input.trim() || isLoading}
            onClick={() => handleSend()}
            aria-label="Gửi"
          >
            <Send aria-hidden="true" size={20} />
          </button>
        </div>
        <p id="chatbot-composer-help">Nhấn Enter để gửi · Shift + Enter để xuống dòng</p>
      </footer>

      {clearDialogOpen && (
        <Dialog
          backdropClassName="chatbot-clear-dialog-backdrop"
          className="chatbot-clear-dialog"
          labelledBy="chatbot-clear-dialog-title"
          describedBy="chatbot-clear-dialog-description"
          initialFocusRef={clearDialogCancelRef}
          restoreFocusRef={clearDialogTriggerRef}
          onClose={() => setClearDialogOpen(false)}
        >
          <div>
            <span className="chatbot-section-kicker">XÓA HỘI THOẠI</span>
            <h2 id="chatbot-clear-dialog-title">Xóa toàn bộ nội dung đang hiển thị?</h2>
            <p id="chatbot-clear-dialog-description">
              Thao tác này chỉ xóa hội thoại trên màn hình hiện tại và không thể hoàn tác.
            </p>
          </div>
          <div className="chatbot-clear-dialog-actions">
            <button ref={clearDialogCancelRef} type="button" onClick={() => setClearDialogOpen(false)}>
              Giữ lại
            </button>
            <button
              type="button"
              onClick={() => {
                setMessages([]);
                setClearDialogOpen(false);
              }}
            >
              Xóa hội thoại
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

const styles = `
.chatbot-page {
  --chat-ink: #0b2d36;
  --chat-teal: #087f78;
  --chat-teal-dark: #07635f;
  --chat-mint: #e8f6f2;
  --chat-line: #c9ded8;
  --chat-muted: #587078;
  height: 100%;
  min-height: 640px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background:
    radial-gradient(circle at 12% 4%, rgba(204, 237, 229, 0.72), transparent 28%),
    #f7faf7;
  color: var(--chat-ink);
}

.chatbot-header {
  min-height: 76px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--chat-line);
  background: rgba(255, 255, 255, 0.92);
  padding: 12px clamp(16px, 2.4vw, 30px);
}

.chatbot-back-button,
.chatbot-actions button,
.chatbot-medication-button,
.chatbot-send-button,
.chatbot-welcome-prompts button {
  font: inherit;
}

.chatbot-back-button,
.chatbot-medication-button,
.chatbot-send-button {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  border: 1px solid var(--chat-line);
  border-radius: 13px;
  background: #fff;
  color: var(--chat-ink);
}

.chatbot-back-button {
  display: none;
}

.chatbot-brand-mark,
.chatbot-welcome-icon,
.chatbot-message-avatar,
.chatbot-prompt-icon {
  display: grid;
  place-items: center;
  color: var(--chat-teal-dark);
}

.chatbot-brand-mark {
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  border: 1px solid #b9ddd4;
  border-radius: 14px;
  background: var(--chat-mint);
}

.chatbot-heading {
  min-width: 0;
}

.chatbot-eyebrow,
.chatbot-section-kicker,
.chatbot-prompt-label {
  color: var(--chat-teal-dark);
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.09em;
}

.chatbot-heading h1 {
  margin: 2px 0 0;
  font-size: 19px;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.chatbot-actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
}

.chatbot-actions button {
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 1px solid var(--chat-line);
  border-radius: 12px;
  background: #fff;
  padding: 0 13px;
  color: var(--chat-ink);
  font-size: 12px;
  font-weight: 750;
}

.chatbot-actions button:hover,
.chatbot-back-button:hover,
.chatbot-medication-button:hover {
  border-color: #8fbfb5;
  background: var(--chat-mint);
}

.chatbot-actions .chatbot-clear-button {
  color: #7e3e3b;
}

.chatbot-scope-note {
  min-height: 44px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-bottom: 1px solid #eddccf;
  background: #fff8f2;
  padding: 8px 16px;
  color: #6e4938;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.45;
  text-align: center;
}

.chatbot-message-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: clamp(18px, 3vw, 38px);
  scrollbar-color: #afc9c3 transparent;
  scrollbar-width: thin;
}

.chatbot-welcome-state {
  width: min(100%, 980px);
  min-height: 100%;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(360px, 1.1fr);
  align-items: center;
  gap: clamp(28px, 6vw, 72px);
}

.chatbot-welcome-intro {
  max-width: 430px;
}

.chatbot-welcome-icon {
  width: 58px;
  height: 58px;
  margin-bottom: 24px;
  border: 1px solid #b8ddd4;
  border-radius: 18px;
  background: var(--chat-mint);
  box-shadow: 0 14px 30px rgba(11, 77, 73, 0.1);
}

.chatbot-welcome-intro h2 {
  max-width: 420px;
  margin: 10px 0 14px;
  font-size: clamp(30px, 3.6vw, 48px);
  line-height: 1.03;
  letter-spacing: -0.045em;
}

.chatbot-welcome-intro > p {
  margin: 0;
  color: var(--chat-muted);
  font-size: 15px;
  line-height: 1.7;
}

.chatbot-privacy-cue {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 24px;
  color: var(--chat-teal-dark);
  font-size: 12px;
  font-weight: 700;
}

.chatbot-prompt-panel {
  border: 1px solid var(--chat-line);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.84);
  padding: clamp(18px, 2.4vw, 26px);
  box-shadow: 0 22px 54px rgba(20, 67, 63, 0.09);
}

.chatbot-welcome-prompts {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.chatbot-welcome-prompts button {
  width: 100%;
  min-height: 74px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  border: 1px solid #d2e1dd;
  border-radius: 15px;
  background: #fff;
  padding: 10px 14px;
  color: var(--chat-ink);
  text-align: left;
  transition: border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
}

.chatbot-welcome-prompts button:hover {
  border-color: #8fbfb5;
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(20, 67, 63, 0.08);
}

.chatbot-prompt-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--chat-mint);
}

.chatbot-welcome-prompts strong,
.chatbot-welcome-prompts small {
  display: block;
}

.chatbot-welcome-prompts strong {
  margin-bottom: 3px;
  font-size: 14px;
}

.chatbot-welcome-prompts small {
  color: var(--chat-muted);
  font-size: 12px;
  line-height: 1.4;
}

.chatbot-conversation {
  width: min(100%, 820px);
  margin: 0 auto;
  display: grid;
  align-content: start;
  gap: 18px;
}

.chatbot-message-row {
  max-width: min(680px, 86%);
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.chatbot-message-row.user {
  justify-self: end;
}

.chatbot-message-row.assistant {
  justify-self: start;
}

.chatbot-message-avatar {
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  border: 1px solid #b9ddd4;
  border-radius: 11px;
  background: var(--chat-mint);
}

.chatbot-message-content {
  min-width: 0;
}

.chatbot-message-bubble {
  border: 1px solid var(--chat-line);
  border-radius: 6px 16px 16px 16px;
  background: #fff;
  padding: 13px 15px;
  box-shadow: 0 8px 24px rgba(20, 67, 63, 0.06);
  line-height: 1.6;
}

.chatbot-message-bubble p {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.chatbot-message-bubble small {
  display: block;
  margin-top: 11px;
  border-top: 1px solid #e1ebe8;
  padding-top: 9px;
  color: var(--chat-muted);
  font-size: 11px;
  line-height: 1.5;
}

.chatbot-message-row.user .chatbot-message-bubble {
  border-color: var(--chat-teal-dark);
  border-radius: 16px 6px 16px 16px;
  background: var(--chat-teal-dark);
  color: #fff;
}

.chatbot-message-row time {
  display: block;
  margin-top: 5px;
  color: var(--chat-muted);
  font-size: 10px;
  font-weight: 650;
}

.chatbot-message-row.user time {
  text-align: right;
}

.chatbot-typing {
  min-width: 70px;
  display: inline-flex;
  gap: 5px;
}

.chatbot-typing span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--chat-teal);
  animation: chatbotBounce 0.8s infinite ease-in-out;
}

.chatbot-typing span:nth-child(2) {
  animation-delay: 0.15s;
}

.chatbot-typing span:nth-child(3) {
  animation-delay: 0.3s;
}

.chatbot-composer {
  flex: 0 0 auto;
  border-top: 1px solid var(--chat-line);
  background: rgba(255, 255, 255, 0.96);
  padding: 12px clamp(16px, 3vw, 32px) 10px;
}

.chatbot-composer-inner {
  width: min(100%, 850px);
  margin: 0 auto;
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.chatbot-input-shell {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-end;
  border: 1px solid #b8cdc8;
  border-radius: 15px;
  background: #fff;
  padding: 5px 13px;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.chatbot-input-shell:focus-within {
  border-color: var(--chat-teal);
  box-shadow: 0 0 0 3px rgba(8, 127, 120, 0.14);
}

.chatbot-input-shell label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

.chatbot-input-shell textarea {
  width: 100%;
  max-height: 112px;
  resize: none;
  border: 0;
  outline: 0;
  background: transparent;
  padding: 7px 0;
  color: var(--chat-ink);
  font: inherit;
  font-size: 14px;
  line-height: 1.5;
}

.chatbot-input-shell textarea::placeholder {
  color: #718489;
}

.chatbot-send-button {
  border-color: var(--chat-teal-dark);
  background: var(--chat-teal-dark);
  color: #fff;
}

.chatbot-send-button:hover:not(:disabled) {
  background: var(--chat-teal);
}

.chatbot-send-button:disabled {
  cursor: not-allowed;
  border-color: #d2deda;
  background: #e6eeeb;
  color: #83948f;
}

.chatbot-composer > p {
  width: min(100%, 850px);
  margin: 7px auto 0;
  padding-left: 54px;
  color: var(--chat-muted);
  font-size: 10px;
  text-align: left;
}

.chatbot-clear-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: grid;
  place-items: center;
  background: rgba(11, 45, 54, 0.46);
  padding: 18px;
  backdrop-filter: blur(8px);
}

.chatbot-clear-dialog {
  width: min(430px, 100%);
  display: grid;
  gap: 22px;
  border: 1px solid var(--chat-line);
  border-radius: 20px;
  background: #fff;
  color: var(--chat-ink);
  padding: clamp(20px, 4vw, 28px);
  box-shadow: 0 28px 80px rgba(11, 45, 54, 0.2);
}

.chatbot-clear-dialog h2,
.chatbot-clear-dialog p {
  margin: 0;
}

.chatbot-clear-dialog h2 {
  margin-top: 7px;
  font-size: clamp(21px, 4vw, 27px);
  line-height: 1.25;
}

.chatbot-clear-dialog p {
  margin-top: 9px;
  color: var(--chat-muted);
  line-height: 1.6;
}

.chatbot-clear-dialog-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.chatbot-clear-dialog-actions button {
  min-height: 46px;
  border: 1px solid var(--chat-line);
  border-radius: 12px;
  background: #fff;
  color: var(--chat-ink);
  padding: 0 14px;
  font-weight: 850;
}

.chatbot-clear-dialog-actions button:last-child {
  border-color: #a92f2f;
  background: #a92f2f;
  color: #fff;
}

.chatbot-page button:focus-visible,
.chatbot-page textarea:focus-visible,
.chatbot-clear-dialog button:focus-visible {
  outline: 3px solid #f0a22e;
  outline-offset: 2px;
}

@keyframes chatbotBounce {
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-4px); }
}

@media (max-width: 900px) {
  .chatbot-actions button span {
    display: none;
  }

  .chatbot-actions button {
    width: 42px;
    justify-content: center;
    padding: 0;
  }

  .chatbot-welcome-state {
    grid-template-columns: 1fr;
    align-content: start;
    gap: 24px;
  }

  .chatbot-welcome-intro {
    max-width: 620px;
  }

  .chatbot-welcome-icon {
    margin-bottom: 16px;
  }
}

@media (max-width: 860px) {
  .chatbot-page {
    min-height: 0;
  }

  .chatbot-back-button {
    display: grid;
  }
}

@media (max-width: 560px) {
  .chatbot-header {
    min-height: 64px;
    gap: 9px;
    padding: 9px 10px;
  }

  .chatbot-back-button,
  .chatbot-brand-mark,
  .chatbot-medication-button,
  .chatbot-send-button {
    width: 40px;
    height: 40px;
    border-radius: 12px;
  }

  .chatbot-brand-mark {
    display: none;
  }

  .chatbot-eyebrow {
    font-size: 9px;
  }

  .chatbot-heading h1 {
    font-size: 16px;
  }

  .chatbot-actions {
    gap: 5px;
  }

  .chatbot-actions button {
    width: 38px;
    min-height: 38px;
  }

  .chatbot-scope-note {
    justify-content: flex-start;
    padding: 7px 12px;
    text-align: left;
  }

  .chatbot-message-area {
    padding: 18px 12px;
  }

  .chatbot-welcome-intro h2 {
    font-size: 30px;
  }

  .chatbot-welcome-intro > p {
    font-size: 14px;
  }

  .chatbot-prompt-panel {
    border-radius: 18px;
    padding: 14px;
  }

  .chatbot-welcome-prompts button {
    min-height: 66px;
    grid-template-columns: 38px minmax(0, 1fr) auto;
    padding: 9px 10px;
  }

  .chatbot-prompt-icon {
    width: 38px;
    height: 38px;
  }

  .chatbot-message-row {
    max-width: 94%;
  }

  .chatbot-message-avatar {
    display: none;
  }

  .chatbot-composer {
    padding: 9px 10px 8px;
  }

  .chatbot-composer-inner {
    gap: 7px;
  }

  .chatbot-input-shell {
    padding-inline: 10px;
  }

  .chatbot-composer > p {
    display: none;
  }

  .chatbot-clear-dialog-actions {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .chatbot-welcome-prompts button {
    transition: none;
  }

  .chatbot-typing span {
    animation: none;
  }
}

@media (forced-colors: active) {
  .chatbot-page,
  .chatbot-header,
  .chatbot-scope-note,
  .chatbot-prompt-panel,
  .chatbot-welcome-prompts button,
  .chatbot-message-bubble,
  .chatbot-composer,
  .chatbot-input-shell,
  .chatbot-clear-dialog {
    background: Canvas;
    color: CanvasText;
  }

  .chatbot-brand-mark,
  .chatbot-welcome-icon,
  .chatbot-message-avatar,
  .chatbot-prompt-icon,
  .chatbot-message-row.user .chatbot-message-bubble,
  .chatbot-send-button {
    background: Highlight;
    color: HighlightText;
  }
}
`;

export default ChatbotPage;
