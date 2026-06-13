import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useOverlayFocus } from "./useOverlayFocus";

export function Dialog({
  children,
  className,
  backdropClassName,
  labelledBy,
  describedBy,
  onClose,
  closeOnBackdrop = true,
  closeOnEscape = true,
  initialFocusRef,
  restoreFocusRef,
}) {
  const dialogRef = useRef(null);
  const portalNode = useMemo(() => {
    const node = document.createElement("div");
    node.dataset.overlayRoot = "true";
    return node;
  }, []);
  const backgroundRefs = useMemo(
    () => Array.from(document.body.children)
      .filter((element) => element !== portalNode)
      .map((current) => ({ current })),
    [portalNode],
  );

  useEffect(() => {
    document.body.appendChild(portalNode);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      portalNode.remove();
    };
  }, [portalNode]);

  useOverlayFocus({
    active: true,
    containerRef: dialogRef,
    initialFocusRef,
    restoreFocusRef,
    inertRefs: backgroundRefs,
    closeOnEscape,
    onClose,
  });

  function handleBackdropClick(event) {
    if (closeOnBackdrop && event.target === event.currentTarget) {
      onClose?.();
    }
  }

  return createPortal(
    <div
      className={backdropClassName}
      role="presentation"
      onClick={handleBackdropClick}
    >
      <section
        ref={dialogRef}
        className={className}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
      >
        {children}
      </section>
    </div>,
    portalNode,
  );
}
