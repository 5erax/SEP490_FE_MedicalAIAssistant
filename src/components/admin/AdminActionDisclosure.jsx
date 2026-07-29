import { ChevronDown, MoreHorizontal } from "lucide-react";
import { useId, useState } from "react";

export default function AdminActionDisclosure({
  children,
  label = "Thao tác khác",
}) {
  const panelId = useId();
  const [open, setOpen] = useState(false);

  function closeAfterAction(event) {
    if (!event.target.closest("button, a")) return;
    const disclosure = event.currentTarget;
    window.setTimeout(() => {
      disclosure.open = false;
    }, 0);
  }

  return (
    <details
      className="admin-action-disclosure"
      open={open}
      onClickCapture={closeAfterAction}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary
        className="btn btn-ghost btn-small"
        role="button"
        aria-expanded={open}
        aria-controls={panelId}
      >
        <MoreHorizontal size={15} aria-hidden="true" />
        <span>{label}</span>
        <ChevronDown className="admin-action-disclosure-chevron" size={14} aria-hidden="true" />
      </summary>
      <div className="admin-action-disclosure-panel" id={panelId}>
        {children}
      </div>
    </details>
  );
}
