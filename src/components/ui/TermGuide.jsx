import { TERM_GUIDES } from "../../content/termGuides";
import "./term-guide.css";

export default function TermGuide({ topic }) {
  const guide = TERM_GUIDES[topic];
  if (!guide) return null;

  return (
    <details className="term-guide">
      <summary>{guide.title}</summary>
      <dl>
        {guide.terms.map(([term, explanation]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{explanation}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
