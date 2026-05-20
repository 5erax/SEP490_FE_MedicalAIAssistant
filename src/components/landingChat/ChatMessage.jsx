export default function ChatMessage({ message }) {
  return (
    <article className={`landing-chat-message ${message.from}`}>
      {message.from === "assistant" && <span className="landing-chat-avatar">AI</span>}
      <div>{message.text}</div>
    </article>
  );
}
