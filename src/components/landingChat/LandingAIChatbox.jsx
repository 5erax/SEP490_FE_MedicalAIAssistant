import { useMemo, useState } from "react";
import { sendLandingChatMessage } from "../../services/landingChat";
import { useChatAutoScroll } from "../../utils/useChatAutoScroll";
import ChatInput from "./ChatInput";
import ChatMessage from "./ChatMessage";
import FloatingChatButton from "./FloatingChatButton";

const WELCOME_MESSAGE = {
  from: "assistant",
  text: "Xin chào. MediMate AI có thể hỗ trợ tư vấn triệu chứng, tìm cơ sở y tế, hướng dẫn khám bệnh và giải đáp nhanh các vấn đề sức khỏe.",
};

function TypingDots() {
  return (
    <div className="landing-chat-typing">
      <span />
      <span />
      <span />
    </div>
  );
}

export default function LandingAIChatbox() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [loading, setLoading] = useState(false);
  const { containerRef, endRef, handleScroll } = useChatAutoScroll(`${messages.length}-${loading}-${open}`);

  const hasUserMessage = useMemo(() => messages.some((message) => message.from === "user"), [messages]);

  async function sendMessage(text) {
    const nextText = text.trim();
    if (!nextText || loading) return;

    setMessages((current) => [...current, { from: "user", text: nextText }]);
    setDraft("");
    setLoading(true);

    const response = await sendLandingChatMessage(nextText);
    const loginHint = response.answer.length > 0 && !hasUserMessage
      ? "\n\nBạn có thể đăng nhập để lưu hồ sơ và mở trợ lý triệu chứng nâng cao."
      : "";

    setMessages((current) => [...current, { from: "assistant", text: `${response.answer}${loginHint}` }]);
    setLoading(false);
  }

  function handleSubmit(event) {
    event.preventDefault();
    sendMessage(draft);
  }

  return (
    <>
      {open && <div className="landing-ai-chatbox open" role="dialog" aria-label="Trợ lý MediMate AI">
        <header className="landing-chat-header">
          <div>
            <a className="brand" href="/">
              <span className="brand-mark">+</span>
              <span>MediMate</span>
            </a>
            <small>AI Assistant • Sẵn sàng hỗ trợ</small>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Đóng trợ lý AI">×</button>
        </header>

        <div className="landing-chat-body">
          <div className="landing-chat-messages" ref={containerRef} onScroll={handleScroll} aria-live="polite">
            {messages.map((message, index) => (
              <ChatMessage key={`${message.from}-${index}`} message={message} />
            ))}
            {loading && <TypingDots />}
            <div ref={endRef} />
          </div>
        </div>

        <footer className="landing-chat-footer">
          <ChatInput value={draft} loading={loading} onChange={setDraft} onSubmit={handleSubmit} />
          <div className="landing-chat-links">
            <a href="/login">Đăng nhập</a>
            <a href="/medical-assistant">Trợ lý nâng cao</a>
          </div>
        </footer>
      </div>}

      <FloatingChatButton open={open} onClick={() => setOpen((current) => !current)} />
    </>
  );
}
