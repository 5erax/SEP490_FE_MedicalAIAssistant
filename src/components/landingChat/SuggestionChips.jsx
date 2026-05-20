export default function SuggestionChips({ suggestions, disabled, onSelect }) {
  return (
    <div className="landing-chat-suggestions">
      {suggestions.map((suggestion) => (
        <button key={suggestion} type="button" onClick={() => onSelect(suggestion)} disabled={disabled}>
          {suggestion}
        </button>
      ))}
    </div>
  );
}
