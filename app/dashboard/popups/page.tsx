'use client';
import { useEffect, useState } from 'react';
import { fetchAdminPopups, createPopup, updatePopup, fetchPopupNominations, fetchPopupRsvps, sendDjOffer, setAuditionResult } from '@/lib/api';

function fmtDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' });
}

const emptyForm = {
  name: '', address: '', city: 'Montreal', neighbourhood: '',
  instagram_handle: '', starts_at: '', ends_at: '',
  capacity: '', entrance_fee_cents: '', dj_name: '',
  organizer_note: '', host_user_id: '', is_audition: false,
};

export default function PopupsPage() {
  const [popups, setPopups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [creating, setCreating] = useState(false);

  // Per-popup expanded state
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [nominations, setNominations] = useState<Record<number, any[]>>({});
  const [rsvps, setRsvps] = useState<Record<number, any[]>>({});
  const [djForm, setDjForm] = useState<Record<number, any>>({});
  const [sendingDj, setSendingDj] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetchAdminPopups()
      .then(setPopups)
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const payload: any = { name: form.name, address: form.address, city: form.city };
      if (form.neighbourhood) payload.neighbourhood = form.neighbourhood;
      if (form.instagram_handle) payload.instagram_handle = form.instagram_handle;
      if (form.starts_at) payload.starts_at = form.starts_at;
      if (form.ends_at) payload.ends_at = form.ends_at;
      if (form.capacity) payload.capacity = Number(form.capacity);
      if (form.entrance_fee_cents) payload.entrance_fee_cents = Math.round(parseFloat(form.entrance_fee_cents) * 100);
      if (form.dj_name) payload.dj_name = form.dj_name;
      if (form.organizer_note) payload.organizer_note = form.organizer_note;
      if (form.host_user_id) payload.host_user_id = Number(form.host_user_id);
      if (form.is_audition) payload.is_audition = true;
      const created = await createPopup(payload);
      setPopups(prev => [created, ...prev]);
      setForm({ ...emptyForm });
      setShowCreate(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  function startEdit(p: any) {
    setEditingId(p.id);
    setEditForm({
      name: p.name ?? '',
      capacity: p.capacity ?? '',
      organizer_note: p.organizer_note ?? '',
      contact: p.contact ?? '',
      hours: p.hours ?? '',
    });
  }

  async function handleSave(id: number) {
    setSaving(true);
    try {
      const updated = await updatePopup(id, {
        name: editForm.name,
        capacity: editForm.capacity ? Number(editForm.capacity) : undefined,
        organizer_note: editForm.organizer_note || undefined,
        contact: editForm.contact || undefined,
        hours: editForm.hours || undefined,
      });
      setPopups(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
      setEditingId(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function loadNominations(id: number) {
    const data = await fetchPopupNominations(id).catch(() => []);
    setNominations(prev => ({ ...prev, [id]: data }));
  }

  async function loadRsvps(id: number) {
    const data = await fetchPopupRsvps(id).catch(() => []);
    setRsvps(prev => ({ ...prev, [id]: data }));
  }

  async function handleSendDj(popupId: number) {
    const f = djForm[popupId] ?? {};
    if (!f.dj_user_id) return;
    setSendingDj(prev => ({ ...prev, [popupId]: true }));
    try {
      await sendDjOffer(popupId, {
        dj_user_id: Number(f.dj_user_id),
        allocation_boxes: f.allocation_boxes ? Number(f.allocation_boxes) : undefined,
        note: f.note || undefined,
      });
      setDjForm(prev => ({ ...prev, [popupId]: {} }));
      alert('DJ offer sent.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSendingDj(prev => ({ ...prev, [popupId]: false }));
    }
  }

  async function handleAudition(businessId: number, passed: boolean) {
    try {
      await setAuditionResult(businessId, passed);
      setPopups(prev => prev.map(p => p.id === businessId ? { ...p, audition_passed: passed } : p));
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <p className="font-serif" style={{ fontSize: 22, color: 'var(--text)' }}>Popups</p>
        <button onClick={() => setShowCreate(v => !v)} className="font-mono" style={{ fontSize: 10, letterSpacing: 1, padding: '7px 16px', background: 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          {showCreate ? 'cancel' : '+ new popup'}
        </button>
      </div>

      {error && <p className="font-mono" style={{ fontSize: 11, color: '#e57373', marginBottom: 16 }}>{error}</p>}

      {/* Create form */}
      {showCreate && (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1.5, marginBottom: 16 }}>NEW POPUP</p>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { key: 'name', label: 'NAME', col: '1 / -1', required: true },
              { key: 'address', label: 'ADDRESS', col: '1 / -1', required: true },
              { key: 'city', label: 'CITY' },
              { key: 'neighbourhood', label: 'NEIGHBOURHOOD' },
              { key: 'instagram_handle', label: 'INSTAGRAM' },
              { key: 'dj_name', label: 'DJ NAME' },
              { key: 'starts_at', label: 'STARTS AT', type: 'datetime-local' },
              { key: 'ends_at', label: 'ENDS AT', type: 'datetime-local' },
              { key: 'capacity', label: 'CAPACITY', type: 'number' },
              { key: 'entrance_fee_cents', label: 'ENTRANCE FEE (CA$)', type: 'number' },
              { key: 'host_user_id', label: 'HOST USER ID', type: 'number' },
              { key: 'organizer_note', label: 'ORGANIZER NOTE', col: '1 / -1' },
            ].map(f => (
              <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: f.col }}>
                <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>{f.label}</span>
                <input
                  type={f.type ?? 'text'}
                  required={f.required}
                  value={(form as any)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="font-mono"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)' }}
                />
              </label>
            ))}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, gridColumn: '1 / -1' }}>
              <input type="checkbox" checked={form.is_audition} onChange={e => setForm(p => ({ ...p, is_audition: e.target.checked }))} />
              <span className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>mark as audition popup</span>
            </label>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={creating} className="font-mono" style={{ fontSize: 11, letterSpacing: 1, padding: '8px 20px', background: 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                {creating ? 'creating…' : 'create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && <p className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>loading…</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {popups.map(p => (
          <div key={p.id} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <p className="font-serif" style={{ fontSize: 17, color: 'var(--text)' }}>{p.name}</p>
                  {p.is_audition && <span className="font-mono" style={{ fontSize: 9, color: '#c9973a', letterSpacing: 1 }}>audition</span>}
                </div>
                <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{p.address}{p.neighbourhood ? ` · ${p.neighbourhood}` : ''}</p>
                <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                  {fmtDate(p.starts_at)}{p.ends_at ? ` → ${fmtDate(p.ends_at)}` : ''}
                </p>
                <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                  {p.rsvp_count != null && <span className="font-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{p.rsvp_count} rsvps</span>}
                  {p.capacity && <span className="font-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>cap {p.capacity}</span>}
                  {p.entrance_fee_cents && <span className="font-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>CA${(p.entrance_fee_cents / 100).toFixed(2)}</span>}
                  {p.dj_name && <span className="font-mono" style={{ fontSize: 10, color: 'var(--accent)' }}>dj: {p.dj_name}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => startEdit(p)} className="font-mono" style={{ fontSize: 10, padding: '5px 12px', background: 'none', color: 'var(--accent)', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer' }}>edit</button>
                <button onClick={() => setExpanded(prev => ({ ...prev, [p.id]: !prev[p.id] }))} className="font-mono" style={{ fontSize: 10, padding: '5px 12px', background: 'none', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer' }}>
                  {expanded[p.id] ? 'less' : 'more'}
                </button>
              </div>
            </div>

            {/* Edit form */}
            {editingId === p.id && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { key: 'name', label: 'NAME', col: '1 / -1' },
                  { key: 'capacity', label: 'CAPACITY', type: 'number' },
                  { key: 'contact', label: 'CONTACT' },
                  { key: 'hours', label: 'HOURS', col: '1 / -1' },
                  { key: 'organizer_note', label: 'ORGANIZER NOTE', col: '1 / -1' },
                ].map(f => (
                  <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: f.col }}>
                    <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>{f.label}</span>
                    <input
                      type={f.type ?? 'text'}
                      value={editForm[f.key] ?? ''}
                      onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="font-mono"
                      style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)' }}
                    />
                  </label>
                ))}
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button onClick={() => setEditingId(null)} className="font-mono" style={{ fontSize: 10, padding: '6px 14px', background: 'none', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>cancel</button>
                  <button onClick={() => handleSave(p.id)} disabled={saving} className="font-mono" style={{ fontSize: 10, padding: '6px 14px', background: 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: 8, cursor: 'pointer' }}>{saving ? 'saving…' : 'save'}</button>
                </div>
              </div>
            )}

            {/* Expanded section */}
            {expanded[p.id] && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* RSVPs */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1.5 }}>RSVPS</p>
                    <button onClick={() => loadRsvps(p.id)} className="font-mono" style={{ fontSize: 9, padding: '3px 10px', background: 'none', color: 'var(--accent)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}>load</button>
                  </div>
                  {rsvps[p.id] && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {rsvps[p.id].length === 0 && <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>no rsvps</p>}
                      {rsvps[p.id].map((r: any) => (
                        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <p className="font-mono" style={{ fontSize: 11, color: 'var(--text)' }}>{r.display_name ?? r.email}</p>
                          <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{r.status}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Nominations */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1.5 }}>NOMINATIONS</p>
                    <button onClick={() => loadNominations(p.id)} className="font-mono" style={{ fontSize: 9, padding: '3px 10px', background: 'none', color: 'var(--accent)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}>load</button>
                  </div>
                  {nominations[p.id] && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {nominations[p.id].length === 0 && <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>no nominations</p>}
                      {nominations[p.id].map((n: any, i: number) => (
                        <div key={n.nominated_user_id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <p className="font-mono" style={{ fontSize: 11, color: 'var(--text)' }}>#{i + 1} {n.display_name}</p>
                          <p className="font-mono" style={{ fontSize: 10, color: 'var(--accent)' }}>{n.count}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* DJ offer */}
                <div>
                  <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1.5, marginBottom: 8 }}>DJ OFFER</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    {[
                      { key: 'dj_user_id', label: 'USER ID', type: 'number', w: 80 },
                      { key: 'allocation_boxes', label: 'BOXES', type: 'number', w: 70 },
                      { key: 'note', label: 'NOTE', w: 200 },
                    ].map(f => (
                      <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>{f.label}</span>
                        <input
                          type={f.type ?? 'text'}
                          value={djForm[p.id]?.[f.key] ?? ''}
                          onChange={e => setDjForm(prev => ({ ...prev, [p.id]: { ...prev[p.id], [f.key]: e.target.value } }))}
                          className="font-mono"
                          style={{ width: f.w, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', fontSize: 11, color: 'var(--text)' }}
                        />
                      </label>
                    ))}
                    <button onClick={() => handleSendDj(p.id)} disabled={sendingDj[p.id]} className="font-mono" style={{ fontSize: 10, padding: '6px 14px', background: 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                      {sendingDj[p.id] ? 'sending…' : 'send offer'}
                    </button>
                  </div>
                </div>

                {/* Audition */}
                {p.is_audition && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1.5 }}>AUDITION</p>
                    <button onClick={() => handleAudition(p.id, true)} className="font-mono" style={{ fontSize: 10, padding: '5px 12px', background: 'rgba(76,175,80,0.15)', color: '#4caf50', border: '1px solid #4caf50', borderRadius: 7, cursor: 'pointer' }}>pass</button>
                    <button onClick={() => handleAudition(p.id, false)} className="font-mono" style={{ fontSize: 10, padding: '5px 12px', background: 'rgba(229,115,115,0.15)', color: '#e57373', border: '1px solid #e57373', borderRadius: 7, cursor: 'pointer' }}>fail</button>
                    {p.audition_passed != null && (
                      <p className="font-mono" style={{ fontSize: 10, color: p.audition_passed ? '#4caf50' : '#e57373' }}>
                        {p.audition_passed ? 'passed' : 'failed'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
