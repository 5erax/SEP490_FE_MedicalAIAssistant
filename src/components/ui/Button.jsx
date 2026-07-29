import { forwardRef } from "react";
import styles from "./Button.module.css";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export const Button = forwardRef(function Button(
  {
    as: Component = "button",
    tone = "primary",
    size = "md",
    className = "",
    loading = false,
    loadingLabel = "Đang xử lý…",
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
    className: cx("ui-button", styles.root, styles[tone], styles[size], className),
    "data-tone": tone,
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
      {loading && <span className={cx("ui-button-spinner", styles.spinner)} aria-hidden="true" />}
      <span>{loading ? loadingLabel : children}</span>
    </Component>
  );
});
