import { forwardRef } from "react";
import "./ui.css";

export const Button = forwardRef(function Button(
  {
    as: Component = "button",
    tone = "primary",
    size = "md",
    className = "",
    loading = false,
    loadingLabel = "Đang xử lý...",
    children,
    disabled,
    ...props
  },
  ref,
) {
  const isNativeButton = Component === "button";
  const componentProps = {
    ...props,
    "aria-busy": loading || undefined,
    className: `ui-button ui-button-${tone} ui-button-${size} ${className}`.trim(),
    ref,
  };

  if (isNativeButton) {
    componentProps.disabled = disabled || loading;
    componentProps.type ??= "button";
  } else if (disabled || loading) {
    componentProps["aria-disabled"] = "true";
    componentProps.tabIndex = -1;
  }

  return (
    <Component {...componentProps}>
      {loading && <span className="ui-button-spinner" aria-hidden="true" />}
      <span>{loading ? loadingLabel : children}</span>
    </Component>
  );
});
