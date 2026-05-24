import "./ui.css";

export function Card({ as: Component = "section", className = "", children, ...props }) {
  return (
    <Component className={`ui-card ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <section className="ui-empty">
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action}
    </section>
  );
}

export function LoadingState({ label = "Đang tải dữ liệu..." }) {
  return (
    <section className="ui-loading" aria-live="polite">
      <span />
      <p>{label}</p>
    </section>
  );
}

export function Badge({ tone = "info", children }) {
  return <span className={`ui-badge ui-badge-${tone}`}>{children}</span>;
}
