import { forwardRef } from "react";
import "./ui.css";

export const Button = forwardRef(function Button(
  { as: Component = "button", tone = "primary", size = "md", className = "", children, ...props },
  ref,
) {
  return (
    <Component ref={ref} className={`ui-button ui-button-${tone} ui-button-${size} ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
});
