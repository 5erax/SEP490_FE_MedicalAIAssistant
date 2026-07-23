import { useEffect, useMemo, useState } from "react";
import { sendLandingChatMessage } from "../../services/landingChat";
import { useChatAutoScroll } from "../../utils/useChatAutoScroll";
import ChatInput from "./ChatInput";
import ChatMessage from "./ChatMessage";
import FloatingChatButton from "./FloatingChatButton";

const WELCOME_MESSAGE = {
  from: "assistant",
  text: "Xin chào. Tôi có thể giúp bạn tìm hiểu thông tin sức khỏe ở mức tham khảo. Nếu đang có triệu chứng, hãy chọn “Mô tả triệu chứng” để được hỏi thêm từng bước. Không sử dụng trợ lý này trong tình huống khẩn cấp.",
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
  const [suppressLauncher, setSuppressLauncher] = useState(false);
  const { containerRef, endRef, handleScroll } = useChatAutoScroll(`${messages.length}-${loading}-${open}`);

  const hasUserMessage = useMemo(() => messages.some((message) => message.from === "user"), [messages]);

  useEffect(() => {
    const hero = document.querySelector(".care-hero");
    const mobileQuery = window.matchMedia("(max-width: 760px)");
    if (!hero || !("IntersectionObserver" in window)) return undefined;

    let heroVisible = false;

    function syncSuppression() {
      setSuppressLauncher(mobileQuery.matches && heroVisible);
    }

    const observer = new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
      syncSuppression();
    }, { threshold: 0.04 });

    observer.observe(hero);
    mobileQuery.addEventListener("change", syncSuppression);

    return () => {
      observer.disconnect();
      mobileQuery.removeEventListener("change", syncSuppression);
    };
  }, []);

  async function sendMessage(text) {
    const nextText = text.trim();
    if (!nextText || loading) return;

    setMessages((current) => [...current, { from: "user", text: nextText }]);
    setDraft("");
    setLoading(true);

    try {
      const response = await sendLandingChatMessage(nextText);
      const loginHint = response.answer.length > 0 && !hasUserMessage
        ? "\n\nBạn có thể đăng nhập để lưu hồ sơ và xem lại các phiên phân tích."
        : "";

      setMessages((current) => [...current, { from: "assistant", text: `${response.answer}${loginHint}` }]);
    } catch {
      setMessages((current) => [...current, {
        from: "assistant",
        text: "Dịch vụ AI chưa phản hồi. Vui lòng thử lại sau.",
      }]);
    } finally {
      setLoading(false);
    }
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
            <small>Thông tin tham khảo • Không thay thế bác sĩ</small>
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
            <a href="/medical-assistant">Mô tả triệu chứng</a>
          </div>
        </footer>
      </div>}

      <FloatingChatButton
        open={open}
        suppressed={suppressLauncher && !open}
        onClick={() => setOpen((current) => !current)}
      />
    </>
  );
}
