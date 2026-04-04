const BASE = process.env.NEXT_PUBLIC_API_URL!;

function token(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('fraise_chat_token');
}

function authHeaders(): Record<string, string> {
  const t = token();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function loginWithCode(code: string) {
  const res = await fetch(`${BASE}/api/auth/operator`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  return json<{ token: string; user_id: number; display_name: string | null; business_id: number | null; fraise_chat_email: string | null }>(res);
}

// ─── Conversations ────────────────────────────────────────────────────────────

export async function fetchConversations() {
  const res = await fetch(`${BASE}/api/messages/conversations`, { headers: authHeaders() });
  return json<any[]>(res);
}

export async function fetchThread(userId: number) {
  const res = await fetch(`${BASE}/api/messages/${userId}`, { headers: authHeaders() });
  return json<any[]>(res);
}

export async function sendMessage(recipientId: number, body: string) {
  const res = await fetch(`${BASE}/api/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ recipient_id: recipientId, body }),
  });
  return json<any>(res);
}

// ─── Offers ───────────────────────────────────────────────────────────────────

export async function sendOffer(payload: {
  recipient_id: number;
  variety_id: number;
  chocolate: string;
  finish: string;
  quantity: number;
  time_slot_id: number;
  location_id: number;
  note?: string;
}) {
  const res = await fetch(`${BASE}/api/messages/offer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return json<any>(res);
}

// ─── Customers ────────────────────────────────────────────────────────────────

export async function fetchRecentCustomers() {
  const res = await fetch(`${BASE}/api/admin/recent-customers`, { headers: authHeaders() });
  return json<any[]>(res);
}

// ─── Varieties & Slots ────────────────────────────────────────────────────────

export async function fetchVarieties() {
  const res = await fetch(`${BASE}/api/varieties`);
  return json<any[]>(res);
}

export async function fetchTimeSlots(locationId: number, date: string) {
  const res = await fetch(`${BASE}/api/time-slots?location_id=${locationId}&date=${date}`);
  return json<any[]>(res);
}

export async function fetchBusinesses() {
  const res = await fetch(`${BASE}/api/businesses`);
  return json<any[]>(res);
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function fetchChatOrders() {
  const res = await fetch(`${BASE}/api/admin/nfc-pending`, { headers: authHeaders() });
  return json<any[]>(res);
}

export async function markOrderReady(orderId: number) {
  const res = await fetch(`${BASE}/api/admin/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ status: 'ready' }),
  });
  return json<any>(res);
}

// ─── Beacons ──────────────────────────────────────────────────────────────────

export async function fetchBeacons() {
  const res = await fetch(`${BASE}/api/beacons`, { headers: authHeaders() });
  return json<any[]>(res);
}

export async function registerBeacon(payload: { business_id: number; uuid: string; major?: number; minor?: number; name?: string }) {
  const res = await fetch(`${BASE}/api/beacons/admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return json<any>(res);
}

export async function deactivateBeacon(id: number) {
  const res = await fetch(`${BASE}/api/beacons/admin/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return json<any>(res);
}
