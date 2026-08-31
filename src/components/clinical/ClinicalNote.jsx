import { CircleAlert, Info } from "lucide-react";
import "../../styles/clinical-notes.css";

export default function ClinicalNote({ tone = "info", title, children, id, className = "" }) {
  const warning = tone === "warning";
  const Icon = warning ? CircleAlert : Info;
  return (
    <aside id={id} className={`clinical-note ${warning ? "clinical-note-warning" : "clinical-note-info"} ${className}`.trim()} aria-label={title}>
      <Icon className="clinical-note-icon" size={18} aria-hidden="true" />
      <div className="clinical-note-body">
        {title && <strong className="clinical-note-title">{title}</strong>}
        <p className="clinical-note-copy">{children}</p>
      </div>
    </aside>
  );
}
