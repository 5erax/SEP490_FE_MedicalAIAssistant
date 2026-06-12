import { useSyncExternalStore } from "react";

const STORAGE_KEY = "medimate.display-preferences";

const DEFAULT_PREFERENCES = Object.freeze({
  theme: "system",
  motion: "system",
  contrast: "system",
  textScale: "100",
  spacing: "normal",
});

const ALLOWED_VALUES = {
  theme: new Set(["system", "light", "dark"]),
  motion: new Set(["system", "reduce", "full"]),
  contrast: new Set(["system", "more"]),
  textScale: new Set(["100", "112", "125"]),
  spacing: new Set(["normal", "comfortable"]),
};

const listeners = new Set();
let preferences = readPreferences();

function readPreferences() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return Object.fromEntries(
      Object.entries(DEFAULT_PREFERENCES).map(([key, fallback]) => [
        key,
        ALLOWED_VALUES[key].has(stored[key]) ? stored[key] : fallback,
      ]),
    );
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

function persistPreferences(nextPreferences) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPreferences));
  } catch {
    // Preferences still apply for the current session when storage is unavailable.
  }
}

function matches(query) {
  return typeof window.matchMedia === "function" && window.matchMedia(query).matches;
}

function applyPreferences() {
  const root = document.documentElement;
  const theme = preferences.theme === "system"
    ? (matches("(prefers-color-scheme: dark)") ? "dark" : "light")
    : preferences.theme;
  const motion = preferences.motion === "system"
    ? (matches("(prefers-reduced-motion: reduce)") ? "reduce" : "full")
    : preferences.motion;
  const contrast = preferences.contrast === "system"
    ? (matches("(prefers-contrast: more)") ? "more" : "normal")
    : preferences.contrast;

  root.dataset.theme = theme;
  root.dataset.motion = motion;
  root.dataset.contrast = contrast;
  root.dataset.textScale = preferences.textScale;
  root.dataset.spacing = preferences.spacing;
  root.style.colorScheme = theme;
}

function emitChange() {
  applyPreferences();
  listeners.forEach((listener) => listener());
}

export function getDisplayPreferences() {
  return preferences;
}

export function subscribeToDisplayPreferences(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setDisplayPreference(key, value) {
  if (!ALLOWED_VALUES[key]?.has(value) || preferences[key] === value) return;
  preferences = { ...preferences, [key]: value };
  persistPreferences(preferences);
  emitChange();
}

export function resetDisplayPreferences() {
  preferences = { ...DEFAULT_PREFERENCES };
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Reset still applies for the current session when storage is unavailable.
  }
  emitChange();
}

export function useDisplayPreferences() {
  return useSyncExternalStore(
    subscribeToDisplayPreferences,
    getDisplayPreferences,
    getDisplayPreferences,
  );
}

if (typeof window !== "undefined") {
  applyPreferences();
  [
    "(prefers-color-scheme: dark)",
    "(prefers-reduced-motion: reduce)",
    "(prefers-contrast: more)",
  ].forEach((query) => {
    window.matchMedia(query).addEventListener("change", () => {
      if (
        (query.includes("color-scheme") && preferences.theme === "system")
        || (query.includes("reduced-motion") && preferences.motion === "system")
        || (query.includes("contrast") && preferences.contrast === "system")
      ) {
        emitChange();
      }
    });
  });
}
