import { addTransitionType, startTransition } from "react";

const NAVIGATION_EVENT = "medimate:navigation";
const WORKSPACE_PATHS = new Set([
  "/dashboard",
  "/profile",
  "/symptom",
  "/assessment/history",
  "/chat",
  "/map",
  "/records",
  "/medication",
]);

export function getLocationSnapshot() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function subscribeToLocation(callback) {
  window.addEventListener("popstate", callback);
  window.addEventListener(NAVIGATION_EVENT, callback);

  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(NAVIGATION_EVENT, callback);
  };
}

function notifyNavigation() {
  window.dispatchEvent(new Event(NAVIGATION_EVENT));
}

function getTransitionType(destination) {
  const currentPath = window.location.pathname;
  const nextPath = destination.pathname;

  if (currentPath === nextPath) return "route-fade";
  if (nextPath === "/") return "nav-back";
  if (currentPath === "/") return "nav-forward";
  if (WORKSPACE_PATHS.has(currentPath) && WORKSPACE_PATHS.has(nextPath)) return "route-fade";
  return "nav-forward";
}

function changeLocation(path, replace, transitionType, state = null) {
  const destination = new URL(path, window.location.href);

  if (destination.origin !== window.location.origin) {
    window.location.assign(destination.href);
    return;
  }

  const nextLocation = `${destination.pathname}${destination.search}${destination.hash}`;
  if (nextLocation === getLocationSnapshot()) return;

  const commitNavigation = () => {
    window.history[replace ? "replaceState" : "pushState"](state, "", nextLocation);
    notifyNavigation();
  };

  if (replace) {
    commitNavigation();
    return;
  }

  startTransition(() => {
    addTransitionType(transitionType || getTransitionType(destination));
    commitNavigation();
  });
}

export function navigate(path, options = {}) {
  changeLocation(path, false, options.transitionType, options.state);
}

export function replaceRoute(path, options = {}) {
  changeLocation(path, true, options.transitionType, options.state);
}

export function installLinkNavigation() {
  function handleDocumentClick(event) {
    if (
      event.defaultPrevented
      || event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
    ) {
      return;
    }

    const link = event.target.closest("a[href]");
    if (!link || link.hasAttribute("download")) return;
    if (link.target && link.target.toLowerCase() !== "_self") return;
    if (link.getAttribute("href")?.startsWith("#")) return;

    const destination = new URL(link.href, window.location.href);
    if (!["http:", "https:"].includes(destination.protocol)) return;
    if (destination.origin !== window.location.origin) return;

    event.preventDefault();
    navigate(`${destination.pathname}${destination.search}${destination.hash}`);
  }

  document.addEventListener("click", handleDocumentClick);
  return () => document.removeEventListener("click", handleDocumentClick);
}
