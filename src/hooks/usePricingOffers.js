import { useCallback, useEffect, useRef, useState } from "react";
import { subscriptionPlansApi } from "../services/subscriptionService";

export default function usePricingOffers(checkoutInFlightRef) {
  const [planOffers, setPlanOffers] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState("");
  const mounted = useRef(false);
  const sequence = useRef(0);
  const inFlight = useRef(null);

  const loadPlanOffers = useCallback(({ silent = false, force = false } = {}) => {
    if (!mounted.current) return Promise.resolve(null);
    // Coalesce background events, but never reuse a request begun before Buy.
    if (!force && inFlight.current) return inFlight.current.promise;
    const requestId = ++sequence.current;
    if (!silent) {
      setPlansLoading(true);
      setPlansError("");
    }
    const promise = (async () => {
      try {
        const response = await subscriptionPlansApi.offers();
        if (!Array.isArray(response?.data)) throw new Error("Invalid offers response");
        if (!mounted.current || requestId !== sequence.current) return null;
        setPlanOffers(response.data);
        setPlansError("");
        return response.data;
      } catch {
        if (mounted.current && requestId === sequence.current && !silent) {
          setPlanOffers([]);
          setPlansError("Không thể tải thông tin gói. Vui lòng thử lại.");
        }
        // A failed preflight must not fall back to an old card's snapshot.
        return null;
      } finally {
        if (mounted.current && requestId === sequence.current) {
          setPlansLoading(false);
          inFlight.current = null;
        }
      }
    })();
    inFlight.current = { promise };
    return promise;
  }, []);

  useEffect(() => {
    mounted.current = true;
    const initialTimer = window.setTimeout(() => { void loadPlanOffers(); }, 0);
    const refreshVisible = () => {
      if (document.visibilityState === "visible" && !checkoutInFlightRef.current) {
        void loadPlanOffers({ silent: true });
      }
    };
    const interval = window.setInterval(refreshVisible, 15000);
    window.addEventListener("focus", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      mounted.current = false;
      sequence.current += 1;
      inFlight.current = null;
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [checkoutInFlightRef, loadPlanOffers]);

  return { planOffers, plansLoading, plansError, loadPlanOffers };
}
