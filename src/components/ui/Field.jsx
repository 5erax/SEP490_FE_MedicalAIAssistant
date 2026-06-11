import { Children, cloneElement, isValidElement, useId } from "react";
import "./ui.css";

function mergeIds(...values) {
  return values.filter(Boolean).join(" ") || undefined;
}

export function Field({
  id,
  label,
  hint,
  error,
  required = false,
  optional = false,
  children,
  className = "",
}) {
  const generatedId = useId();
  const controlId = id || `field-${generatedId.replace(/:/g, "")}`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const child = Children.only(children);
  const control = isValidElement(child)
    ? cloneElement(child, {
        id: child.props.id || controlId,
        required: child.props.required ?? required,
        "aria-invalid": child.props["aria-invalid"] ?? (error ? "true" : undefined),
        "aria-describedby": mergeIds(child.props["aria-describedby"], hintId, errorId),
      })
    : child;

  return (
    <div className={`ui-field ${error ? "ui-field-invalid" : ""} ${className}`.trim()}>
      <label htmlFor={control.props?.id || controlId}>
        <span>{label}</span>
        {required && <span className="ui-field-required" aria-hidden="true">*</span>}
        {optional && !required && <span className="ui-field-optional">Không bắt buộc</span>}
      </label>
      {control}
      {hint && <small id={hintId}>{hint}</small>}
      {error && <small className="ui-field-error" id={errorId} role="alert">{error}</small>}
    </div>
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
