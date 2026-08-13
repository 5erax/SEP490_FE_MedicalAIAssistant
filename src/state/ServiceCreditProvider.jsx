import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { subscriptionUsageApi } from "../services/api";
import { normalizeServiceCreditBalance } from "../services/serviceCredit";
import { ServiceCreditContext } from "./serviceCreditContext";
import { useAuthSession } from "./useAuthSession";

const inFlightBalanceRequests = new Map();

function requestBalance(accessToken) {
  const existingRequest = inFlightBalanceRequests.get(accessToken);
  if (existingRequest) return existingRequest;

  const request = subscriptionUsageApi.getUsage()
    .then((response) => {
      const balance = normalizeServiceCreditBalance(response);
      if (!balance) {
        throw new Error("Phản hồi số lượt sử dụng không hợp lệ.");
      }
      return balance;
    })
    .finally(() => {
      if (inFlightBalanceRequests.get(accessToken) === request) {
        inFlightBalanceRequests.delete(accessToken);
      }
    });

  inFlightBalanceRequests.set(accessToken, request);
  return request;
}

const EMPTY_STATE = {
  accessToken: "",
  balance: null,
  status: "idle",
  error: null,
};

export function ServiceCreditProvider({ children }) {
  const { auth } = useAuthSession();
  const accessToken = auth?.accessToken ?? "";
  const accessTokenRef = useRef(accessToken);
  const [creditState, setCreditState] = useState(EMPTY_STATE);
  accessTokenRef.current = accessToken;

  const refresh = useCallback(async ({ silent = false } = {}) => {
    const requestAccessToken = accessToken;
    if (!requestAccessToken) {
      setCreditState(EMPTY_STATE);
      return null;
    }

    setCreditState((current) => ({
      accessToken: requestAccessToken,
      balance: current.accessToken === requestAccessToken ? current.balance : null,
      status: silent && current.accessToken === requestAccessToken && current.balance ? "ready" : "loading",
      error: null,
    }));

    try {
      const balance = await requestBalance(requestAccessToken);
      if (accessTokenRef.current !== requestAccessToken) return null;

      setCreditState({
        accessToken: requestAccessToken,
        balance,
        status: "ready",
        error: null,
      });
      return balance;
    } catch (error) {
      if (accessTokenRef.current !== requestAccessToken) return null;

      setCreditState((current) => ({
        accessToken: requestAccessToken,
        balance: current.accessToken === requestAccessToken ? current.balance : null,
        status: "error",
        error,
      }));
      return null;
    }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      setCreditState(EMPTY_STATE);
      return;
    }

    void refresh();
  }, [accessToken, refresh]);

  useEffect(() => {
    if (!accessToken) return undefined;

    const refreshWhenVisible = () => {
      if (document.visibilityState === "hidden") return;
      void refresh({ silent: true });
    };

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [accessToken, refresh]);

  const stateMatchesSession = creditState.accessToken === accessToken;
  const value = useMemo(() => ({
    balance: stateMatchesSession ? creditState.balance : null,
    status: !accessToken ? "idle" : stateMatchesSession ? creditState.status : "loading",
    error: stateMatchesSession ? creditState.error : null,
    refresh,
  }), [accessToken, creditState, refresh, stateMatchesSession]);

  return (
    <ServiceCreditContext.Provider value={value}>
      {children}
    </ServiceCreditContext.Provider>
  );
}
