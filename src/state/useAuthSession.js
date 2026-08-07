import { useSyncExternalStore } from "react";
import {
  getStoredSessionAuth,
  isAuthExpired,
  subscribeToAuth,
} from "../services/apiClient";

const getServerAuthSnapshot = () => null;

export function useAuthSession() {
  const storedAuth = useSyncExternalStore(
    subscribeToAuth,
    getStoredSessionAuth,
    getServerAuthSnapshot,
  );
  const auth =
    storedAuth && !isAuthExpired(storedAuth)
      ? storedAuth
      : null;

  return { auth, storedAuth };
}
