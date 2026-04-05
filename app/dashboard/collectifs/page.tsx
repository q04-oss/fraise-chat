'use client';
import { useEffect, useState } from 'react';
import { fetchAdminCollectifs, respondToCollectif, confirmPopupCollectif } from '@/lib/api';

function fmtCAD(cents: number) {
  return `CA$${(cents / 100).toLocaleString('en-CA', { minimumFractionDigits: 2 })}`;
}

function fmtDate(iso: string) {
  return iso ? new Date(iso).toLocaleDateString('en-CA') : '—';
}

const STATUS_COLOR: Record<string, string> = {
  open: '#c9973a',
  funded: '#4caf50',
  expired: '#888',
  cancelled: '#e57373',
};

export default function CollectifsPage() {
  const [collectifs, setCollectifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const [responseNote, setResponseNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmingPopupId, setConfirmingPopupId] = useState<number | null>(null);

  useEffect(() => {
    fetchAdminCollectifs()
      .then(setCollectifs)
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleConfirmPopup(id: number) {
    setConfirmingPopupId(id);
    try {
      const result = await confirmPopupCollectif(id);
      setCollectifs(prev => prev.map(c => c.id === id
        ? { ...c, business_response: 'accepted' }
        : c));
      alert(`Popup event created (id ${result.popup_id}). Edit it in the businesses admin to add coordinates, DJ, and capacity details.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConfirmingPopupId(null);
    }
  }

  async function handleRespond(id: number, response: 'accepted' | 'declined') {
    setSaving(true);
    try {
      await respondToCollectif(id, response, responseNote.trim() || undefined);
      setCollectifs(prev => prev.map(c => c.id === id
        ? { ...c, business_response: response, status: response === 'declined' ? 'cancelled' : c.status }
        : c));
      setRespondingId(null);
      setResponseNote('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const filtered = filter ? collectifs.filter(c => c.status === filter) : collectifs;
  const funded = collectifs.filter(c => c.status === 'funded' && c.business_response === 'pending');

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <p className="font-serif" style={{ fontSize: 22, color: 'var(--text)', marginBottom: 24 }}>Collectifs</p>
      {error && <p className="font-mono" style={{ fontSize: 11, color: '#e57373', marginBottom: 16 }}>{error}</p>}

      {/* Needs response banner */}
      {funded.length > 0 && (
        <div style={{ background: 'rgba(76,175,80,0.08)', border: '1px solid #4caf50', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
          <p className="font-mono" style={{ fontSize: 11, color: '#4caf50' }}>
            {funded.length} {funded.length > 1 ? 'items' : 'item'} funded — awaiting response
            {funded.some((c: any) => c.collectif_type === 'popup') && ' · includes popup proposals'}
          </p>
        </div>
      )}

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['', 'open', 'funded', 'expired', 'cancelled'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className="font-mono" style={{
            fontSize: 9, letterSpacing: 1, padding: '4px 12px', borderRadius: 20,
            border: '1px solid var(--border)', cursor: 'pointer',
            background: filter === s ? 'var(--accent)' : 'var(--panel)',
            color: filter === s ? 'var(--bg)' : STATUS_COLOR[s] ?? 'var(--muted)',
          }}>{s || 'all'}</button>
        ))}
      </div>

      {loading && <p className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>loading…</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!loading && filtered.length === 0 && (
          <p className="font-serif" style={{ fontSize: 15, color: 'var(--muted)', fontStyle: 'italic' }}>nothing here</p>
        )}
        {filtered.map(c => {
          const progress = c.target_quantity > 0 ? Math.min(1, c.current_quantity / c.target_quantity) : 0;
          const totalCommitted = Number(c.total_committed_cents ?? 0);
          const isPopup = c.collectif_type === 'popup';
          return (
            <div key={c.id} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <p className="font-serif" style={{ fontSize: 16, color: 'var(--text)' }}>{c.title}</p>
                    {isPopup && (
                      <span className="font-mono" style={{ fontSize: 8, letterSpacing: 1.5, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 4, padding: '1px 6px' }}>POPUP</span>
                    )}
                    <span className="font-mono" style={{ fontSize: 9, letterSpacing: 1, color: STATUS_COLOR[c.status] ?? 'var(--muted)' }}>{c.status}</span>
                    {c.business_response !== 'pending' && (
                      <span className="font-mono" style={{ fontSize: 9, letterSpacing: 1, color: c.business_response === 'accepted' ? '#4caf50' : '#e57373' }}>
                        {c.business_response}
                      </span>
                    )}
                  </div>
                  {isPopup ? (
                    <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
                      {c.business_name} · {c.proposed_venue ?? '—'} · {c.proposed_date ?? '—'} · {fmtCAD(c.price_cents)} deposit · deadline {fmtDate(c.deadline)}
                    </p>
                  ) : (
                    <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
                      {c.business_name} · {c.proposed_discount_pct}% off · {fmtCAD(c.price_cents)}/unit · deadline {fmtDate(c.deadline)}
                    </p>
                  )}
                  <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                    by {c.creator_display_name ?? `user #${c.created_by}`} · {Number(c.commitment_count ?? 0)} committed · {fmtCAD(totalCommitted)} pooled
                  </p>
                  {c.description && (
                    <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6, fontStyle: 'italic' }}>
                      "{c.description.slice(0, 120)}{c.description.length > 120 ? '…' : ''}"
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, marginLeft: 12 }}>
                  {c.status === 'funded' && c.business_response === 'pending' && isPopup && confirmingPopupId !== c.id && (
                    <button
                      onClick={() => handleConfirmPopup(c.id)}
                      className="font-mono"
                      style={{ fontSize: 10, padding: '5px 12px', background: 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: 7, cursor: 'pointer' }}
                    >
                      {confirmingPopupId === c.id ? '…' : 'create popup event'}
                    </button>
                  )}
                  {c.status === 'funded' && c.business_response === 'pending' && respondingId !== c.id && (
                    <button
                      onClick={() => { setRespondingId(c.id); setResponseNote(''); }}
                      className="font-mono"
                      style={{ fontSize: 10, padding: '5px 12px', background: 'none', color: 'var(--accent)', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer' }}
                    >
                      respond
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: respondingId === c.id ? 16 : 0 }}>
                <div style={{ flex: 1, height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${progress * 100}%`, height: '100%', background: c.status === 'funded' ? '#4caf50' : 'var(--accent)', borderRadius: 3 }} />
                </div>
                <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', flexShrink: 0 }}>
                  {c.current_quantity} / {c.target_quantity}
                </p>
              </div>

              {/* Response form */}
              {respondingId === c.id && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                    <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>NOTE TO GROUP (OPTIONAL)</span>
                    <textarea
                      rows={2}
                      value={responseNote}
                      onChange={e => setResponseNote(e.target.value)}
                      className="font-mono"
                      placeholder="e.g. happy to fulfill — we'll reach out to confirm pickup dates"
                      style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: 'var(--text)', resize: 'vertical' }}
                    />
                  </label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => handleRespond(c.id, 'accepted')} disabled={saving} className="font-mono" style={{ fontSize: 10, padding: '6px 16px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>{saving ? '…' : 'accept'}</button>
                    <button onClick={() => handleRespond(c.id, 'declined')} disabled={saving} className="font-mono" style={{ fontSize: 10, padding: '6px 16px', background: 'rgba(229,115,115,0.12)', color: '#e57373', border: '1px solid #e57373', borderRadius: 8, cursor: 'pointer' }}>{saving ? '…' : 'decline + refund all'}</button>
                    <button onClick={() => setRespondingId(null)} className="font-mono" style={{ fontSize: 10, padding: '6px 12px', background: 'none', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>cancel</button>
                  </div>
                  {responseNote && <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', marginTop: 8 }}>Note will be saved. Members will not receive an automated message — contact them directly via inbox.</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
