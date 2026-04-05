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

// ─── Admin: Editorial ────────────────────────────────────────────────────────

export async function fetchAdminEditorial() {
  const res = await fetch(`${BASE}/api/admin/editorial`, { headers: authHeaders() });
  return json<any[]>(res);
}

export async function updateEditorialPiece(id: number, payload: { status?: string; commission_cents?: number; tag?: string; editor_note?: string }) {
  const res = await fetch(`${BASE}/api/admin/editorial/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return json<any>(res);
}

// ─── Admin: Revenue ───────────────────────────────────────────────────────────

export async function fetchRevenueSummary() {
  const res = await fetch(`${BASE}/api/admin/revenue`, { headers: authHeaders() });
  return json<any>(res);
}

export async function fetchDailyRevenue(days = 14) {
  const res = await fetch(`${BASE}/api/admin/revenue/daily?days=${days}`, { headers: authHeaders() });
  return json<any[]>(res);
}

export async function fetchReferrals() {
  const res = await fetch(`${BASE}/api/admin/referrals`, { headers: authHeaders() });
  return json<any[]>(res);
}

export async function exportCustomers(): Promise<Blob> {
  const res = await fetch(`${BASE}/api/admin/customers/export`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
}

// ─── Admin: Tokens ────────────────────────────────────────────────────────────

export async function fetchAdminTokens() {
  const res = await fetch(`${BASE}/api/admin/tokens`, { headers: authHeaders() });
  return json<any[]>(res);
}

export async function setTokenNfc(id: number, nfc_token: string) {
  const res = await fetch(`${BASE}/api/admin/tokens/${id}/nfc`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ nfc_token }),
  });
  return json<any>(res);
}

// ─── Admin: Members ──────────────────────────────────────────────────────────

export async function fetchAdminMemberships() {
  const res = await fetch(`${BASE}/api/admin/memberships`, { headers: authHeaders() });
  return json<any[]>(res);
}

export async function fetchMembershipWaitlist() {
  const res = await fetch(`${BASE}/api/admin/memberships/waitlist`, { headers: authHeaders() });
  return json<any[]>(res);
}

export async function setMemberPortrait(userId: number, portrait_url: string) {
  const res = await fetch(`${BASE}/api/admin/users/${userId}/portrait`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ portrait_url }),
  });
  return json<any>(res);
}

// ─── Admin: Talent ────────────────────────────────────────────────────────────

export async function fetchAdminContracts() {
  const res = await fetch(`${BASE}/api/admin/contracts`, { headers: authHeaders() });
  return json<any[]>(res);
}

export async function fetchExpiringContracts() {
  const res = await fetch(`${BASE}/api/admin/contracts/expiring-soon`, { headers: authHeaders() });
  return json<any[]>(res);
}

export async function fetchTalentLeaderboard() {
  const res = await fetch(`${BASE}/api/admin/talent`, { headers: authHeaders() });
  return json<any[]>(res);
}

export async function sendContractOffer(payload: { business_id: number; user_id: number; starts_at: string; ends_at: string; note?: string }) {
  const res = await fetch(`${BASE}/api/admin/contracts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return json<any>(res);
}

export async function completeExpiredContracts() {
  const res = await fetch(`${BASE}/api/admin/contracts/complete-expired`, {
    method: 'POST',
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

// ─── Admin: Popups ───────────────────────────────────────────────────────────

export async function fetchAdminPopups() {
  const res = await fetch(`${BASE}/api/admin/popups`, { headers: authHeaders() });
  return json<any[]>(res);
}

export async function createPopup(payload: Record<string, any>) {
  const res = await fetch(`${BASE}/api/admin/businesses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ ...payload, type: 'popup' }),
  });
  return json<any>(res);
}

export async function updatePopup(id: number, payload: Record<string, any>) {
  const res = await fetch(`${BASE}/api/admin/popups/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return json<any>(res);
}

export async function fetchPopupNominations(popupId: number) {
  const res = await fetch(`${BASE}/api/admin/popups/${popupId}/nominations`, { headers: authHeaders() });
  return json<any[]>(res);
}

export async function fetchPopupRsvps(popupId: number) {
  const res = await fetch(`${BASE}/api/admin/popups/${popupId}/rsvps`, { headers: authHeaders() });
  return json<any[]>(res);
}

export async function sendDjOffer(popupId: number, payload: { dj_user_id: number; allocation_boxes?: number; note?: string }) {
  const res = await fetch(`${BASE}/api/admin/popups/${popupId}/dj-offer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return json<any>(res);
}

export async function setAuditionResult(businessId: number, passed: boolean) {
  const res = await fetch(`${BASE}/api/admin/businesses/${businessId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ audition_passed: passed }),
  });
  return json<any>(res);
}

// ─── Admin: Popup Requests ────────────────────────────────────────────────────

export async function fetchPopupRequests() {
  const res = await fetch(`${BASE}/api/admin/popup-requests`, { headers: authHeaders() });
  return json<any[]>(res);
}

export async function updatePopupRequest(id: number, status: 'approved' | 'rejected') {
  const res = await fetch(`${BASE}/api/admin/popup-requests/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ status }),
  });
  return json<any>(res);
}

// ─── Admin: Portraits ─────────────────────────────────────────────────────────

export async function fetchPortraits(businessId: number) {
  const res = await fetch(`${BASE}/api/admin/portraits?business_id=${businessId}`, { headers: authHeaders() });
  return json<any[]>(res);
}

export async function createPortrait(payload: { business_id: number; image_url: string; subject_name?: string; season?: string; campaign_title?: string; sort_order?: number }) {
  const res = await fetch(`${BASE}/api/admin/portraits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return json<any>(res);
}

export async function updatePortrait(id: number, payload: { sort_order: number }) {
  const res = await fetch(`${BASE}/api/admin/portraits/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return json<any>(res);
}

export async function deletePortrait(id: number) {
  const res = await fetch(`${BASE}/api/admin/portraits/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return json<any>(res);
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

// ─── Admin: Portal ────────────────────────────────────────────────────────────

export async function fetchPortalActivity() {
  const res = await fetch(`${BASE}/api/admin/portal/activity`, { headers: authHeaders() });
  return json<any>(res);
}

export async function fetchPortalContent() {
  const res = await fetch(`${BASE}/api/admin/portal/content`, { headers: authHeaders() });
  return json<any[]>(res);
}

export async function deletePortalContent(id: number) {
  const res = await fetch(`${BASE}/api/admin/portal/content/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return json<any>(res);
}

export async function banUser(userId: number, reason?: string) {
  const res = await fetch(`${BASE}/api/admin/users/${userId}/ban`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ reason }),
  });
  return json<any>(res);
}

// ─── Admin: Patronages ────────────────────────────────────────────────────────

export async function fetchAdminPatronages() {
  const res = await fetch(`${BASE}/api/admin/patronages`, { headers: authHeaders() });
  return json<any[]>(res);
}

export async function approvePatronage(id: number, price_per_year_cents: number) {
  const res = await fetch(`${BASE}/api/admin/patronages/${id}/approve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ price_per_year_cents }),
  });
  return json<any>(res);
}

export async function adjustPatronagePrice(id: number, price_per_year_cents: number) {
  const res = await fetch(`${BASE}/api/admin/patronages/${id}/price`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ price_per_year_cents }),
  });
  return json<any>(res);
}

export async function fetchPatronTokens() {
  const res = await fetch(`${BASE}/api/admin/patron-tokens`, { headers: authHeaders() });
  return json<any[]>(res);
}

// ─── Admin: Greenhouses ───────────────────────────────────────────────────────

export async function fetchAdminGreenhouses() {
  const res = await fetch(`${BASE}/api/admin/greenhouses`, { headers: authHeaders() });
  return json<any[]>(res);
}

export async function createGreenhouse(payload: { name: string; location: string; description?: string; funding_goal_cents: number }) {
  const res = await fetch(`${BASE}/api/admin/greenhouses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return json<any>(res);
}

export async function updateGreenhouse(id: number, payload: { name?: string; location?: string; description?: string; funding_goal_cents?: number; status?: string }) {
  const res = await fetch(`${BASE}/api/admin/greenhouses/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return json<any>(res);
}

export async function fetchProvenanceTokens() {
  const res = await fetch(`${BASE}/api/admin/provenance-tokens`, { headers: authHeaders() });
  return json<any[]>(res);
}

export async function setProvenanceNfc(id: number, nfc_token: string) {
  const res = await fetch(`${BASE}/api/admin/provenance-tokens/${id}/nfc`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ nfc_token }),
  });
  return json<any>(res);
}
