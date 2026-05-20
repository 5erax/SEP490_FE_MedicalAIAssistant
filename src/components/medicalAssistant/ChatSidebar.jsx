import ChatInput from "./ChatInput";
import HospitalList from "./HospitalList";
import MessageList from "./MessageList";
import SuggestionChips from "./SuggestionChips";

export default function ChatSidebar({
  draft,
  prompts,
  messages,
  hospitals,
  chatLoading,
  hospitalsLoading,
  errorMessage,
  selectedHospital,
  onDraftChange,
  onSubmit,
  onPromptSelect,
  onSelectHospital,
}) {
  return (
    <aside className="assistant-sidebar-panel">
      <div className="assistant-sidebar-header">
        <a className="brand" href="/app/patient">
          <span className="brand-mark">+</span>
          <span>MediMate</span>
        </a>
        <p className="eyebrow">AI Assistant</p>
        <h1>Tư vấn triệu chứng nâng cao</h1>
        <p>Mô tả triệu chứng để nhận phản hồi AI và gợi ý cơ sở y tế phù hợp trên bản đồ.</p>
      </div>

      {errorMessage && <div className="api-message error">{errorMessage}</div>}

      <MessageList messages={messages} loading={chatLoading} />
      <section className="assistant-module assistant-prompt-module">
        <div className="assistant-section-title">
          <span>Gợi ý nhanh</span>
        </div>
        <SuggestionChips prompts={prompts} disabled={chatLoading} onSelect={onPromptSelect} />
      </section>
      <HospitalList
        hospitals={hospitals}
        loading={hospitalsLoading}
        selectedHospital={selectedHospital}
        onSelect={onSelectHospital}
      />
      <ChatInput value={draft} loading={chatLoading} onChange={onDraftChange} onSubmit={onSubmit} />
    </aside>
  );
}
