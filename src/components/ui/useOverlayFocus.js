import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function getFocusableElements(container) {
  return Array.from(container?.querySelectorAll(FOCUSABLE_SELECTOR) ?? [])
    .filter((element) => !element.hidden && element.getAttribute("aria-hidden") !== "true");
}

export function useOverlayFocus({
  active,
  containerRef,
  initialFocusRef,
  restoreFocusRef,
  inertRefs = [],
  closeOnEscape = true,
  onClose,
}) {
  const triggerRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!active) return undefined;

    const restoreTarget = restoreFocusRef?.current ?? document.activeElement;
    if (!containerRef.current?.contains(restoreTarget)) {
      triggerRef.current = restoreTarget;
    }
    const inertElements = inertRefs.map((ref) => ref.current).filter(Boolean);
    const previousInert = inertElements.map((element) => element.inert);

    inertElements.forEach((element) => {
      element.inert = true;
    });

    const container = containerRef.current;
    const focusTarget = initialFocusRef?.current
      ?? getFocusableElements(container)[0]
      ?? container;
    focusTarget?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape" && closeOnEscape) {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = getFocusableElements(containerRef.current);
      if (!focusable.length) {
        event.preventDefault();
        containerRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!containerRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      inertElements.forEach((element, index) => {
        element.inert = previousInert[index];
      });
      window.setTimeout(() => triggerRef.current?.focus?.(), 0);
    };
  }, [
    active,
    closeOnEscape,
    containerRef,
    initialFocusRef,
    inertRefs,
    restoreFocusRef,
  ]);
}
