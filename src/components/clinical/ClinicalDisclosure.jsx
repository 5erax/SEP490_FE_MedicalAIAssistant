import { ChevronDown } from "lucide-react";
import "../../styles/clinical-notes.css";

export default function ClinicalDisclosure({ title, summaryMeta, children, defaultOpen = false, className = "" }) {
  return (
    <details className={`clinical-disclosure ${className}`.trim()} open={defaultOpen || undefined}>
      <summary className="clinical-disclosure-summary" onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        if (!event.repeat) event.currentTarget.click();
      }}>
        <span className="clinical-disclosure-label">
          <span className="clinical-disclosure-title">{title}</span>
          {summaryMeta != null && <span className="clinical-disclosure-meta">{summaryMeta}</span>}
        </span>
        <ChevronDown className="clinical-disclosure-chevron" size={18} aria-hidden="true" />
      </summary>
      <div className="clinical-disclosure-content">{children}</div>
    </details>
  );
}
