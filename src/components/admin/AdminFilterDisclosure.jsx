import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useId, useState } from "react";

function shouldStartExpanded() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
  return !window.matchMedia("(max-width: 700px)").matches;
}

export default function AdminFilterDisclosure({
  children,
  className = "",
  description,
  headingClassName = "",
  icon,
  summary,
  title,
  titleId,
}) {
  const fallbackId = useId();
  const resolvedTitleId = titleId || `${fallbackId}-title`;
  const contentId = `${resolvedTitleId}-content`;
  const [expanded, setExpanded] = useState(shouldStartExpanded);

  return (
    <section
      className={`admin-filter-disclosure ${className}`.trim()}
      aria-labelledby={resolvedTitleId}
    >
      <div className={`admin-filter-disclosure-heading ${headingClassName}`.trim()}>
        <span className="admin-filter-disclosure-icon" aria-hidden="true">
          {icon || <SlidersHorizontal size={18} />}
        </span>
        <div className="admin-filter-disclosure-copy">
          <h3 id={resolvedTitleId}>{title}</h3>
          <p>{description}</p>
        </div>
        <button
          className="admin-filter-disclosure-toggle"
          type="button"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => setExpanded((current) => !current)}
        >
          <span>
            <strong>{expanded ? "Thu gọn" : "Mở bộ lọc"}</strong>
            {summary && <small>{summary}</small>}
          </span>
          <ChevronDown size={17} aria-hidden="true" />
        </button>
      </div>
      <div
        className="admin-filter-disclosure-body"
        id={contentId}
        hidden={!expanded}
      >
        {children}
      </div>
    </section>
  );
}
