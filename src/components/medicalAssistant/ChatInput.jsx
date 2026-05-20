import { useEffect, useRef } from "react";

export default function ChatInput({ value, loading, onChange, onSubmit }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 132)}px`;
  }, [value]);

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <form className="assistant-chat-input" onSubmit={onSubmit}>
      <div className="assistant-input-shell">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nhập triệu chứng của bạn..."
          rows={1}
          disabled={loading}
        />
        <button className="assistant-send-button" type="submit" disabled={loading || !value.trim()} aria-label="Gửi triệu chứng">
          <span>{loading ? "..." : "➤"}</span>
        </button>
      </div>
      <p>Enter để gửi, Shift + Enter để xuống dòng.</p>
    </form>
  );
}
