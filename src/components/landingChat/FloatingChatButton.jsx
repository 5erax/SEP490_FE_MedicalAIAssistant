export default function FloatingChatButton({
  buttonRef,
  open,
  onClick,
  suppressed = false,
}) {
  return (
    <div
      className={`landing-chat-launcher ${open ? "open" : ""} ${suppressed ? "suppressed" : ""}`}
      aria-hidden={suppressed ? "true" : undefined}
    >
      {!open && <span className="landing-chat-tooltip" aria-hidden="true">Mở trợ lý sức khỏe MediMate</span>}
      <button
        ref={buttonRef}
        type="button"
        onClick={onClick}
        aria-label={open ? "Thu nhỏ trợ lý MediMate" : "Mở trợ lý sức khỏe MediMate"}
        tabIndex={suppressed ? -1 : undefined}
      >
        <span className="landing-chat-bot-icon">AI</span>
      </button>
    </div>
  );
}
