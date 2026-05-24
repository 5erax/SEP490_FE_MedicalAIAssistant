import "./ui.css";

export function Field({ label, hint, error, children, className = "" }) {
  const describedBy = error ? `${label}-error` : hint ? `${label}-hint` : undefined;
  return (
    <label className={`ui-field ${className}`.trim()}>
      <span>{label}</span>
      {children?.type
        ? children
        : children}
      {hint && !error && <small id={describedBy}>{hint}</small>}
      {error && <small className="ui-field-error" id={describedBy}>{error}</small>}
    </label>
  );
}

export function TextInput({ error, ...props }) {
  return <input aria-invalid={error ? "true" : undefined} {...props} />;
}

export function Textarea({ error, ...props }) {
  return <textarea aria-invalid={error ? "true" : undefined} {...props} />;
}

export function Select({ error, children, ...props }) {
  return <select aria-invalid={error ? "true" : undefined} {...props}>{children}</select>;
}
