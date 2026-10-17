/** UI-only per-tab storage. Never stores server responses or authentication tokens. */
const PREFIX = "finance-ui:v1:";
const fallback = new Map<string, string>();
let activeUser: string | null = null;
export function readUiSession<T>(userId: string, name: string, defaultValue: T): T {
  const key = `${PREFIX}${userId}:${name}`;
  try {
    const value = sessionStorage.getItem(key) ?? fallback.get(key);
    return value ? JSON.parse(value) as T : defaultValue;
  } catch {
    try { return JSON.parse(fallback.get(key) ?? "null") as T ?? defaultValue; } catch { return defaultValue; }
  }
}
export function writeUiSession(userId: string, name: string, value: unknown) {
  // A save response can arrive after logout or an account switch.
  if (activeUser !== userId) return;
  const key = `${PREFIX}${userId}:${name}`;
  const json = JSON.stringify(value);
  fallback.set(key, json);
  try { sessionStorage.setItem(key, json); } catch { /* Memory covers navigation in restricted browsers. */ }
}
export function clearUiSession() {
  fallback.clear();
  activeUser = null;
  try {
    for (const key of Object.keys(sessionStorage)) if (key.startsWith(PREFIX)) sessionStorage.removeItem(key);
  } catch { /* Storage may be disabled. */ }
}
export function activateUiUser(userId: string) {
  let previous = activeUser;
  try { previous ??= sessionStorage.getItem(`${PREFIX}active-user`); } catch { /* Use memory. */ }
  if (previous && previous !== userId) clearUiSession();
  activeUser = userId;
  try { sessionStorage.setItem(`${PREFIX}active-user`, userId); } catch { /* Use memory. */ }
}
