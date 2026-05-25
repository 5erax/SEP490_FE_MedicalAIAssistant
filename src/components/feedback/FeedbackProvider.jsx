import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { FeedbackContext } from "./feedbackContext";
import "../../styles/components/feedback.css";

const TOAST_ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
};

function getFocusable(container) {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.disabled && element.offsetParent !== null);
}

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const dialogRef = useRef(null);
  const lastFocusedRef = useRef(null);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((toast) => {
    const id = crypto.randomUUID?.() ?? `toast-${Date.now()}`;
    const nextToast = {
      id,
      type: "info",
      duration: 4200,
      ...toast,
    };
    setToasts((current) => [...current, nextToast]);

    if (nextToast.duration) {
      window.setTimeout(() => dismissToast(id), nextToast.duration);
    }

    return id;
  }, [dismissToast]);

  const confirmAction = useCallback((options) => {
    lastFocusedRef.current = document.activeElement;
    return new Promise((resolve) => {
      setConfirmState({
        tone: "danger",
        cancelLabel: "Hủy",
        confirmLabel: "Xác nhận",
        ...options,
        resolve,
      });
    });
  }, []);

  const closeConfirm = useCallback((result) => {
    setConfirmState((current) => {
      current?.resolve(Boolean(result));
      return null;
    });
    window.setTimeout(() => lastFocusedRef.current?.focus?.(), 0);
  }, []);

  useEffect(() => {
    if (!confirmState) return undefined;

    const focusables = getFocusable(dialogRef.current);
    focusables[0]?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        closeConfirm(false);
        return;
      }

      if (event.key !== "Tab") return;

      const items = getFocusable(dialogRef.current);
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeConfirm, confirmState]);

  const value = useMemo(() => ({ showToast, confirmAction }), [confirmAction, showToast]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      <div className="toast-region" aria-live="polite" aria-relevant="additions text">
        {toasts.map((toast) => {
          const Icon = TOAST_ICONS[toast.type] ?? Info;
          return (
            <section className={`toast toast-${toast.type}`} key={toast.id}>
              <Icon size={19} />
              <div>
                {toast.title && <strong>{toast.title}</strong>}
                {toast.message && <p>{toast.message}</p>}
              </div>
              {toast.action && (
                <button type="button" onClick={toast.action.onClick}>
                  {toast.action.label}
                </button>
              )}
              <button type="button" aria-label="Đóng thông báo" onClick={() => dismissToast(toast.id)}>
                <X size={17} />
              </button>
            </section>
          );
        })}
      </div>

      {confirmState && (
        <div className="confirm-backdrop" role="presentation" onMouseDown={() => closeConfirm(false)}>
          <section
            className={`confirm-dialog confirm-${confirmState.tone}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-message"
            ref={dialogRef}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <span className="confirm-icon">
              <AlertTriangle size={22} />
            </span>
            <div>
              <h2 id="confirm-title">{confirmState.title}</h2>
              <p id="confirm-message">{confirmState.message}</p>
            </div>
            <div className="confirm-actions">
              <button type="button" onClick={() => closeConfirm(false)}>
                {confirmState.cancelLabel}
              </button>
              <button type="button" onClick={() => closeConfirm(true)}>
                {confirmState.confirmLabel}
              </button>
            </div>
          </section>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}
