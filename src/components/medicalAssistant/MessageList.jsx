function LoadingBubble() {
  return (
    <div className="assistant-message assistant loading">
      <span />
      <span />
      <span />
    </div>
  );
}

export default function MessageList({ messages, loading }) {
  return (
    <div className="assistant-message-list" aria-live="polite">
      {messages.length === 0 && (
        <div className="assistant-empty">
          <strong>Mô tả triệu chứng để nhận gợi ý ban đầu.</strong>
          <span>Hãy nhập vị trí đau, thời gian xuất hiện, mức độ khó chịu và dấu hiệu đi kèm.</span>
        </div>
      )}

      {messages.map((message, index) => (
        <article className={`assistant-message-row ${message.from}`} key={`${message.from}-${index}`}>
          {message.from === "assistant" && <span className="assistant-avatar">AI</span>}
          <div className={`assistant-message ${message.from}`}>{message.text}</div>
        </article>
      ))}

      {loading && <LoadingBubble />}
    </div>
  );
}
