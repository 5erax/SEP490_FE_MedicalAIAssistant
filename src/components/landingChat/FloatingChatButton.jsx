export default function FloatingChatButton({ open, onClick }) {
  return (
    <div className={`landing-chat-launcher ${open ? "open" : ""}`}>
      {!open && <span className="landing-chat-tooltip">Hỏi MediMate AI</span>}
      <button type="button" onClick={onClick} aria-label={open ? "Thu nhỏ trợ lý AI" : "Mở trợ lý AI"}>
        <span className="landing-chat-bot-icon">AI</span>
      </button>
    </div>
  );
}
