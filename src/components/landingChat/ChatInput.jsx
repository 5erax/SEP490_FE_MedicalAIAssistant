import { useEffect, useRef } from "react";

export default function ChatInput({ value, loading, onChange, onSubmit }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 108)}px`;
  }, [value]);

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <form className="landing-chat-input" onSubmit={onSubmit}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        placeholder="Hỏi MediMate AI..."
        disabled={loading}
      />
      <button type="submit" disabled={loading || !value.trim()} aria-label="Gửi tin nhắn">
        {loading ? "..." : "➤"}
      </button>
    </form>
  );
}

