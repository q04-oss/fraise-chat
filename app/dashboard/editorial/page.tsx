'use client';
import { useEffect, useState } from 'react';
import { fetchAdminEditorial, updateEditorialPiece } from '@/lib/api';

const STATUS_COLOR: Record<string, string> = {
  submitted: '#888',
  commissioned: '#c9973a',
  published: '#4caf50',
  declined: '#e57373',
};

const TAGS = ['', 'harvest', 'portrait', 'criticism', 'dispatch', 'essay'];
const STATUSES = ['submitted', 'commissioned', 'published', 'declined'];

function fmtDate(iso: string) {
  return iso ? new Date(iso).toLocaleDateString('en-CA') : '—';
}

export default function EditorialPage() {
  const [pieces, setPieces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAdminEditorial()
      .then(setPieces)
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function startEdit(p: any) {
    setEditingId(p.id);
    setEditForm({
      status: p.status,
      tag: p.tag ?? '',
      commission_cents: p.commission_cents ? (p.commission_cents / 100).toString() : '',
      editor_note: p.editor_note ?? '',
    });
  }

  async function handleSave(id: number) {
    setSaving(true);
    try {
      const payload: any = { status: editForm.status };
      if (editForm.tag !== undefined) payload.tag = editForm.tag || null;
      if (editForm.commission_cents) payload.commission_cents = Math.round(parseFloat(editForm.commission_cents) * 100);
      if (editForm.editor_note !== undefined) payload.editor_note = editForm.editor_note || null;
      const updated = await updateEditorialPiece(id, payload);
      setPieces(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
      setEditingId(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const filtered = filter ? pieces.filter(p => p.status === filter) : pieces;

  // Calendar: group published/commissioned by date over next 28 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const calDays = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
  const calMap: Record<string, any[]> = {};
  pieces.forEach(p => {
    const dateStr = p.published_at ? p.published_at.slice(0, 10) : p.status === 'commissioned' ? p.created_at?.slice(0, 10) : null;
    if (dateStr) {
      if (!calMap[dateStr]) calMap[dateStr] = [];
      calMap[dateStr].push(p);
    }
  });

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <p className="font-serif" style={{ fontSize: 22, color: 'var(--text)' }}>Editorial</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['list', 'calendar'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} className="font-mono" style={{ fontSize: 10, letterSpacing: 1, padding: '6px 14px', background: view === v ? 'var(--accent)' : 'none', color: view === v ? 'var(--bg)' : 'var(--muted)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>{v}</button>
          ))}
        </div>
      </div>

      {error && <p className="font-mono" style={{ fontSize: 11, color: '#e57373', marginBottom: 16 }}>{error}</p>}

      {/* Filter pills */}
      {view === 'list' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {['', ...STATUSES].map(s => (
            <button key={s} onClick={() => setFilter(s)} className="font-mono" style={{
              fontSize: 9, letterSpacing: 1, padding: '4px 12px', borderRadius: 20,
              border: '1px solid var(--border)', cursor: 'pointer',
              background: filter === s ? 'var(--accent)' : 'var(--panel)',
              color: filter === s ? 'var(--bg)' : STATUS_COLOR[s] ?? 'var(--muted)',
            }}>{s || 'all'}</button>
          ))}
        </div>
      )}

      {loading && <p className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>loading…</p>}

      {/* List view */}
      {!loading && view === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.length === 0 && <p className="font-serif" style={{ fontSize: 15, color: 'var(--muted)', fontStyle: 'italic' }}>nothing here</p>}
          {filtered.map(p => (
            <div key={p.id} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: editingId === p.id ? 16 : 0 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <p className="font-serif" style={{ fontSize: 16, color: 'var(--text)' }}>{p.title ?? `#${p.id}`}</p>
                    <span className="font-mono" style={{ fontSize: 9, letterSpacing: 1, color: STATUS_COLOR[p.status] ?? 'var(--muted)' }}>{p.status}</span>
                    {p.tag && <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 0.5 }}>{p.tag}</span>}
                  </div>
                  <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
                    {p.display_name ?? p.author_email} · {fmtDate(p.created_at)}
                    {p.commission_cents ? ` · CA$${(p.commission_cents / 100).toFixed(2)}` : ''}
                  </p>
                  {p.editor_note && <p className="font-mono" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, fontStyle: 'italic' }}>"{p.editor_note}"</p>}
                  {p.body && editingId !== p.id && (
                    <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 8, lineHeight: 1.6, maxHeight: 60, overflow: 'hidden' }}>
                      {p.body.slice(0, 200)}{p.body.length > 200 ? '…' : ''}
                    </p>
                  )}
                </div>
                {editingId !== p.id && (
                  <button onClick={() => startEdit(p)} className="font-mono" style={{ fontSize: 10, padding: '5px 12px', background: 'none', color: 'var(--accent)', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer', flexShrink: 0, marginLeft: 12 }}>review</button>
                )}
              </div>

              {editingId === p.id && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>STATUS</span>
                    <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))} className="font-mono" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)' }}>
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>TAG</span>
                    <select value={editForm.tag} onChange={e => setEditForm(f => ({ ...f, tag: e.target.value }))} className="font-mono" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)' }}>
                      {TAGS.map(t => <option key={t} value={t}>{t || '— none —'}</option>)}
                    </select>
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>COMMISSION (CA$)</span>
                    <input type="number" value={editForm.commission_cents} onChange={e => setEditForm(f => ({ ...f, commission_cents: e.target.value }))} className="font-mono" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)' }} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: '1 / -1' }}>
                    <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>EDITOR NOTE</span>
                    <textarea rows={2} value={editForm.editor_note} onChange={e => setEditForm(f => ({ ...f, editor_note: e.target.value }))} className="font-mono" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)', resize: 'vertical' }} />
                  </label>
                  {p.body && (
                    <div style={{ gridColumn: '1 / -1', background: 'var(--bg)', borderRadius: 8, padding: 12 }}>
                      <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1, marginBottom: 6 }}>PREVIEW</p>
                      <p className="font-mono" style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.7 }}>{p.body.slice(0, 500)}{p.body.length > 500 ? '…' : ''}</p>
                    </div>
                  )}
                  <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={() => setEditingId(null)} className="font-mono" style={{ fontSize: 10, padding: '6px 14px', background: 'none', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>cancel</button>
                    <button onClick={() => handleSave(p.id)} disabled={saving} className="font-mono" style={{ fontSize: 10, padding: '6px 14px', background: 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: 8, cursor: 'pointer' }}>{saving ? 'saving…' : 'save'}</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Calendar view */}
      {!loading && view === 'calendar' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <p key={d} className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1, textAlign: 'center', paddingBottom: 6 }}>{d}</p>
          ))}
          {/* offset first day */}
          {Array.from({ length: (calDays[0].getDay() + 6) % 7 }).map((_, i) => <div key={`pad-${i}`} />)}
          {calDays.map(day => {
            const key = day.toISOString().slice(0, 10);
            const dayPieces = calMap[key] ?? [];
            const isToday = key === today.toISOString().slice(0, 10);
            return (
              <div key={key} style={{ background: 'var(--panel)', border: `1px solid ${isToday ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 8, padding: '8px 6px', minHeight: 64 }}>
                <p className="font-mono" style={{ fontSize: 9, color: isToday ? 'var(--accent)' : 'var(--muted)', marginBottom: 4 }}>{day.getDate()}</p>
                {dayPieces.map(p => (
                  <div key={p.id} style={{ width: 8, height: 8, borderRadius: 4, background: p.status === 'published' ? '#4caf50' : '#c9973a', display: 'inline-block', marginRight: 3 }} title={p.title ?? `#${p.id}`} />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
