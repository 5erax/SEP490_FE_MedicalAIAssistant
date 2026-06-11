import "./ui.css";

export function Card({ as: Component = "section", className = "", children, ...props }) {
  return (
    <Component className={`ui-card ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
}

export function EmptyState({ title, description, action, icon, className = "" }) {
  return (
    <section className={`ui-state ui-empty ${className}`.trim()}>
      {icon && <span className="ui-state-icon" aria-hidden="true">{icon}</span>}
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action}
    </section>
  );
}

export function LoadingState({ label = "Đang tải dữ liệu...", description, className = "" }) {
  return (
    <section className={`ui-state ui-loading ${className}`.trim()} aria-live="polite" aria-busy="true">
      <span className="ui-state-spinner" aria-hidden="true" />
      <strong>{label}</strong>
      {description && <p>{description}</p>}
    </section>
  );
}

export function ErrorState({ title = "Không thể tải dữ liệu", description, action, className = "" }) {
  return (
    <section className={`ui-state ui-error ${className}`.trim()} role="alert">
      <span className="ui-state-icon" aria-hidden="true">!</span>
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action}
    </section>
  );
}

export function Alert({ tone = "info", title, children, className = "", live = false }) {
  const role = tone === "danger" ? "alert" : live ? "status" : undefined;
  return (
    <section className={`ui-alert ui-alert-${tone} ${className}`.trim()} role={role}>
      <span className="ui-alert-mark" aria-hidden="true" />
      <div>
        {title && <strong>{title}</strong>}
        {children && <p>{children}</p>}
      </div>
    </section>
  );
}

export function Badge({ tone = "info", children }) {
  return <span className={`ui-badge ui-badge-${tone}`}>{children}</span>;
}
