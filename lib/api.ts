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

// ─── Admin: Varieties ─────────────────────────────────────────────────────────

export async function fetchAdminVarieties() {
  const res = await fetch(`${BASE}/api/admin/varieties`, { headers: authHeaders() });
  return json<any[]>(res);
}

export async function updateVariety(id: number, payload: { description?: string; image_url?: string; location_id?: number; active?: boolean }) {
  const res = await fetch(`${BASE}/api/admin/varieties/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return json<any>(res);
}

export async function updateVarietyStock(id: number, stock_remaining: number) {
  const res = await fetch(`${BASE}/api/admin/varieties/${id}/stock`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ stock_remaining }),
  });
  return json<any>(res);
}

// ─── Admin: Slots ─────────────────────────────────────────────────────────────

export async function fetchAdminLocations() {
  const res = await fetch(`${BASE}/api/admin/locations`, { headers: authHeaders() });
  return json<any[]>(res);
}

export async function fetchAdminTimeSlots(locationId?: number, date?: string) {
  const params = new URLSearchParams();
  if (locationId) params.set('location_id', String(locationId));
  if (date) params.set('date', date);
  const res = await fetch(`${BASE}/api/admin/time-slots?${params}`, { headers: authHeaders() });
  return json<any[]>(res);
}

export async function createTimeSlot(payload: { location_id: number; date: string; time: string; capacity: number }) {
  const res = await fetch(`${BASE}/api/admin/time-slots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return json<any>(res);
}

export async function updateTimeSlot(id: number, capacity: number) {
  const res = await fetch(`${BASE}/api/admin/time-slots/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ capacity }),
  });
  return json<any>(res);
}

export async function deleteTimeSlot(id: number) {
  const res = await fetch(`${BASE}/api/admin/time-slots/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return json<any>(res);
}

// ─── Admin: Chocolatier ───────────────────────────────────────────────────────

export async function fetchChocolatierOrders() {
  const res = await fetch(`${BASE}/api/chocolatier/orders`, { headers: authHeaders() });
  return json<any[]>(res);
}

export async function fetchAdminOrders() {
  const res = await fetch(`${BASE}/api/admin/orders`, { headers: authHeaders() });
  return json<any[]>(res);
}

export async function updateOrderStatus(id: number, status: string) {
  const res = await fetch(`${BASE}/api/admin/orders/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ status }),
  });
  return json<any>(res);
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

// ─── Admin: Supplier ─────────────────────────────────────────────────────────

export async function fetchSupplierAlerts() {
  const res = await fetch(`${BASE}/api/supplier/alerts`, { headers: authHeaders() });
  return json<any[]>(res);
}

// ─── Admin: Businesses / Chocolate Shops ─────────────────────────────────────

export async function fetchAdminBusinesses() {
  const res = await fetch(`${BASE}/api/admin/businesses`, { headers: authHeaders() });
  return json<any[]>(res);
}

export async function createBusiness(payload: {
  name: string;
  address: string;
  location_type: string;
  partner_name?: string;
  operating_cost_cents?: number;
  approved_by_admin?: boolean;
}) {
  const res = await fetch(`${BASE}/api/admin/businesses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return json<any>(res);
}

export async function updateBusiness(id: number, payload: Record<string, any>) {
  const res = await fetch(`${BASE}/api/admin/businesses/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return json<any>(res);
}

export async function fetchLocationFunding() {
  const res = await fetch(`${BASE}/api/admin/location-funding`, { headers: authHeaders() });
  return json<any[]>(res);
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export async function fetchOperatorJobs() {
  const res = await fetch(`${BASE}/api/jobs/operator`, { headers: authHeaders() });
  return json<{ jobs: any[]; applications: any[] }>(res);
}

export async function postJob(payload: { title: string; description?: string; pay_cents: number; pay_type: string }) {
  const res = await fetch(`${BASE}/api/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return json<any>(res);
}

export async function deactivateJob(id: number) {
  const res = await fetch(`${BASE}/api/jobs/${id}/deactivate`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  return json<any>(res);
}

export async function scheduleInterview(applicationId: number, scheduledAt: string) {
  const res = await fetch(`${BASE}/api/jobs/applications/${applicationId}/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ scheduled_at: scheduledAt }),
  });
  return json<any>(res);
}

export async function recordOutcome(applicationId: number, status: 'hired' | 'not_hired' | 'dismissed') {
  const res = await fetch(`${BASE}/api/jobs/applications/${applicationId}/outcome`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ status }),
  });
  return json<any>(res);
}

export async function addEmployerStatement(applicationId: number, statement: string) {
  const res = await fetch(`${BASE}/api/jobs/applications/${applicationId}/statement`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ statement }),
  });
  return json<any>(res);
}
