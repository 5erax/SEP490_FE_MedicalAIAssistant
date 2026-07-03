import { forwardRef } from "react";

function FloatingChatButton({ open, onClick }, ref) {
  return (
    <div className={`landing-chat-launcher ${open ? "open" : ""}`}>
      {!open && <span className="landing-chat-tooltip">Há»i MediMate AI</span>}
      <button ref={ref} type="button" onClick={onClick} aria-label={open ? "Thu nhá» trá»£ lÃ½ AI" : "Má»Ÿ trá»£ lÃ½ AI"}>
        <span className="landing-chat-bot-icon">AI</span>
      </button>
    </div>
  );
}

export default forwardRef(FloatingChatButton);
