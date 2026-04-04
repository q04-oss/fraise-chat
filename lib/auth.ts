export interface Session {
  token: string;
  user_id: number;
  display_name: string | null;
  business_id: number | null;
  fraise_chat_email: string | null;
}

export function saveSession(s: Session) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('fraise_chat_token', s.token);
  localStorage.setItem('fraise_chat_session', JSON.stringify(s));
}

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('fraise_chat_session');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('fraise_chat_token');
  localStorage.removeItem('fraise_chat_session');
}
