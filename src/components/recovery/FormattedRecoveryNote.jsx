function renderInlineFormatting(text, lineIndex) {
  const segments = text.split(/(\*\*[^*\n]+\*\*|_[^_\n]+_)/g);

  return segments.map((segment, segmentIndex) => {
    const key = `${lineIndex}-${segmentIndex}`;
    if (segment.startsWith("**") && segment.endsWith("**")) {
      return <strong key={key}>{segment.slice(2, -2)}</strong>;
    }
    if (segment.startsWith("_") && segment.endsWith("_")) {
      return <em key={key}>{segment.slice(1, -1)}</em>;
    }
    return segment;
  });
}

export default function FormattedRecoveryNote({ text, fallback = "" }) {
  const content = String(text ?? "").trim();
  if (!content) return <p className="formatted-recovery-note">{fallback}</p>;

  const lines = content.split(/\r?\n/);
  const blocks = [];
  let list = null;

  function flushList() {
    if (!list) return;
    const ListTag = list.type === "ordered" ? "ol" : "ul";
    blocks.push(
      <ListTag key={`list-${blocks.length}`}>
        {list.items.map((item, index) => (
          <li key={`${index}-${item}`}>{renderInlineFormatting(item, index)}</li>
        ))}
      </ListTag>,
    );
    list = null;
  }

  lines.forEach((line, lineIndex) => {
    const unorderedMatch = line.match(/^\s*-\s+(.+)$/);
    const orderedMatch = line.match(/^\s*\d+[.)]\s+(.+)$/);
    const match = unorderedMatch || orderedMatch;
    const type = orderedMatch ? "ordered" : "unordered";

    if (match) {
      if (list && list.type !== type) flushList();
      if (!list) list = { type, items: [] };
      list.items.push(match[1]);
      return;
    }

    flushList();
    if (!line.trim()) {
      blocks.push(<span key={`space-${lineIndex}`} className="formatted-recovery-note__space" aria-hidden="true" />);
      return;
    }
    blocks.push(<p key={`line-${lineIndex}`}>{renderInlineFormatting(line, lineIndex)}</p>);
  });
  flushList();

  return <div className="formatted-recovery-note">{blocks}</div>;
}
