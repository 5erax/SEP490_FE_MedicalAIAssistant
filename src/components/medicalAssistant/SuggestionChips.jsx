export default function SuggestionChips({ prompts, disabled, onSelect }) {
  return (
    <div className="assistant-suggestions" aria-label="Gợi ý câu hỏi">
      {prompts.map((prompt) => (
        <button key={prompt} type="button" onClick={() => onSelect(prompt)} disabled={disabled}>
          {prompt}
        </button>
      ))}
    </div>
  );
}
