import { useEffect } from "react";

export function useUnsavedChangesWarning(active) {
  useEffect(() => {
    if (!active) return undefined;

    function handleBeforeUnload(event) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [active]);
}
