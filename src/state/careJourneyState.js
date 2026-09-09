// Deliberately memory-only: no symptoms, form values or location in Web Storage/history.
const entries = new Map();
let activeOwner = null;
const TTL = 30 * 60 * 1000;
export function journeyOwner(auth) {
  let claims = {};
  try {
    const payload = auth?.accessToken?.split(".")[1];
    if (payload) claims = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch { /* An invalid token never identifies another account's draft. */ }
  return String(auth?.user?.id ?? auth?.user?.userId ?? auth?.userId ?? auth?.identityId
    ?? claims.sub ?? claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"]
    ?? auth?.user?.email ?? auth?.email ?? claims.email ?? (auth?.accessToken ? "session:" + auth.accessToken : "guest"));
}
function selectOwner(owner) {
  if (activeOwner !== owner) { entries.clear(); activeOwner = owner; }
}
export function saveJourney(owner, key, value) {
  selectOwner(owner);
  entries.set(key, { value: structuredClone(value), expiresAt: Date.now() + TTL });
}
export function readJourney(owner, key) {
  selectOwner(owner);
  const entry = entries.get(key);
  if (!entry || entry.expiresAt <= Date.now()) { entries.delete(key); return null; }
  return structuredClone(entry.value);
}
export function clearJourneys() { entries.clear(); activeOwner = null; }
if (typeof window !== "undefined") window.addEventListener("medimate:auth-change", clearJourneys);
