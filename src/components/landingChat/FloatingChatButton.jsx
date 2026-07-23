export default function FloatingChatButton({ open, onClick, suppressed = false }) {
  return (
    <div className={`landing-chat-launcher ${open ? "open" : ""} ${suppressed ? "suppressed" : ""}`}>
      {!open && <span className="landing-chat-tooltip">Mở trợ lý sức khỏe MediMate</span>}
      <button
        type="button"
        onClick={onClick}
        aria-label={open ? "Thu nhỏ trợ lý MediMate" : "Mở trợ lý sức khỏe MediMate"}
      >
        <span className="landing-chat-bot-icon">AI</span>
      </button>
    </div>
  );
}
