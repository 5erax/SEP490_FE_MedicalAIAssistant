export function trackUxEvent(name, payload = {}) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent("medimate:ux-event", {
    detail: {
      name,
      payload,
      occurredAt: new Date().toISOString(),
    },
  }));
}
