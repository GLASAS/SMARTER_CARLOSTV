import { login } from "./api.js";
const SESSION_KEY = "smartiptv_session_v2";
export async function authenticate(username, password) {
  const result = await login(username.trim(), password);
  const session = { user: result.user, role: result.role, token: result.token,
    playlistUrl: result.playlistUrl || "", expiresAt: result.expiresAt || "" };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}
export function currentSession() {
  try {
    const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    if (!s || !s.token) return null;
    if (s.role !== "admin" && s.expiresAt && new Date(s.expiresAt + "T23:59:59").getTime() < Date.now()) {
      logout(); return null;
    }
    return s;
  } catch { return null; }
}
export function logout() { sessionStorage.removeItem(SESSION_KEY); }
