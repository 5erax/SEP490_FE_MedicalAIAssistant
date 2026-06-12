const NAVIGATION_EVENT = "medimate:navigation";

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

function changeLocation(path, replace) {
  const destination = new URL(path, window.location.href);

  if (destination.origin !== window.location.origin) {
    window.location.assign(destination.href);
    return;
  }

  const nextLocation = `${destination.pathname}${destination.search}${destination.hash}`;
  if (nextLocation === getLocationSnapshot()) return;

  window.history[replace ? "replaceState" : "pushState"](null, "", nextLocation);
  notifyNavigation();
}

export function navigate(path) {
  changeLocation(path, false);
}

export function replaceRoute(path) {
  changeLocation(path, true);
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
