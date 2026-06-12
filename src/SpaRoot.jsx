import { useEffect, useSyncExternalStore } from "react";
import App from "./App";
import { getLocationSnapshot, subscribeToLocation } from "./router/navigation";

export default function SpaRoot() {
  const location = useSyncExternalStore(subscribeToLocation, getLocationSnapshot);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const hash = window.location.hash.slice(1);
      if (hash) {
        document.getElementById(decodeURIComponent(hash))?.scrollIntoView();
      } else {
        window.scrollTo({ top: 0, left: 0 });
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location]);

  return <App key={location} />;
}
