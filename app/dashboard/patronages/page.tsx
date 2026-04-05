'use client';
import { useEffect, useState } from 'react';
import { fetchAdminPatronages, approvePatronage, adjustPatronagePrice, fetchPatronTokens } from '@/lib/api';

function fmtCAD(cents: number) {
  return `CA$${(cents / 100).toLocaleString('en-CA', { minimumFractionDigits: 2 })}`;
}

function fmtDate(iso: string) {
  return iso ? new Date(iso).toLocaleDateString('en-CA') : '—';
}

const STATUS_COLOR: Record<string, string> = {
  pending: '#888',
  approved: '#4caf50',
  available: '#c9973a',
  declined: '#e57373',
};

export default function PatronagesPage() {
  const [patronages, setPatronages] = useState<any[]>([]);
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'patronages' | 'tokens'>('patronages');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([fetchAdminPatronages(), fetchPatronTokens()])
      .then(([p, t]) => { setPatronages(p); setTokens(t); })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleApprove(id: number) {
    const cents = Math.round(parseFloat(priceInput) * 100);
    if (!cents || isNaN(cents)) return;
    setSaving(true);
    try {
      const updated = await approvePatronage(id, cents);
      setPatronages(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
      setEditingId(null);
      setPriceInput('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAdjust(id: number) {
    const cents = Math.round(parseFloat(priceInput) * 100);
    if (!cents || isNaN(cents)) return;
    setSaving(true);
    try {
      const updated = await adjustPatronagePrice(id, cents);
      setPatronages(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
      setEditingId(null);
      setPriceInput('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const pendingNfc = tokens.filter(t => !t.nfc_token).length;

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <p className="font-serif" style={{ fontSize: 22, color: 'var(--text)' }}>Patronages</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['patronages', 'tokens'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className="font-mono" style={{ fontSize: 10, letterSpacing: 1, padding: '6px 14px', background: tab === t ? 'var(--accent)' : 'none', color: tab === t ? 'var(--bg)' : 'var(--muted)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>{t}</button>
          ))}
        </div>
      </div>

      {error && <p className="font-mono" style={{ fontSize: 11, color: '#e57373', marginBottom: 16 }}>{error}</p>}
      {loading && <p className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>loading…</p>}

      {!loading && tab === 'patronages' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {patronages.length === 0 && <p className="font-serif" style={{ fontSize: 15, color: 'var(--muted)', fontStyle: 'italic' }}>no patronages</p>}
          {patronages.map(p => (
            <div key={p.id} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <p className="font-serif" style={{ fontSize: 16, color: 'var(--text)' }}>{p.display_name ?? p.patron_email ?? `#${p.id}`}</p>
                    <span className="font-mono" style={{ fontSize: 9, letterSpacing: 1, color: STATUS_COLOR[p.status] ?? 'var(--muted)' }}>{p.status}</span>
                  </div>
                  <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
                    {p.patron_email} · {fmtDate(p.created_at)}
                    {p.price_cents ? ` · ${fmtCAD(p.price_cents)}` : ''}
                    {p.platform_cut_cents ? ` (cut: ${fmtCAD(p.platform_cut_cents)})` : ''}
                  </p>
                  {p.note && <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, fontStyle: 'italic' }}>"{p.note}"</p>}
                </div>
                {editingId !== p.id && (p.status === 'pending' || p.status === 'available') && (
                  <button
                    onClick={() => { setEditingId(p.id); setPriceInput(p.price_cents ? String(p.price_cents / 100) : ''); }}
                    className="font-mono"
                    style={{ fontSize: 10, padding: '5px 12px', background: 'none', color: 'var(--accent)', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer', flexShrink: 0 }}
                  >
                    {p.status === 'pending' ? 'approve' : 'adjust'}
                  </button>
                )}
              </div>

              {editingId === p.id && (
                <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>PRICE (CA$)</label>
                  <input
                    type="number"
                    value={priceInput}
                    onChange={e => setPriceInput(e.target.value)}
                    className="font-mono"
                    style={{ width: 100, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', fontSize: 12, color: 'var(--text)' }}
                  />
                  <button
                    onClick={() => p.status === 'pending' ? handleApprove(p.id) : handleAdjust(p.id)}
                    disabled={saving}
                    className="font-mono"
                    style={{ fontSize: 10, padding: '5px 12px', background: 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: 7, cursor: 'pointer' }}
                  >
                    {saving ? '…' : p.status === 'pending' ? 'approve' : 'save'}
                  </button>
                  <button onClick={() => { setEditingId(null); setPriceInput(''); }} className="font-mono" style={{ fontSize: 10, padding: '5px 10px', background: 'none', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer' }}>cancel</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && tab === 'tokens' && (
        <div>
          {pendingNfc > 0 && (
            <div style={{ background: 'var(--panel)', border: '1px solid #c9973a', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
              <p className="font-mono" style={{ fontSize: 11, color: '#c9973a' }}>{pendingNfc} patron token{pendingNfc > 1 ? 's' : ''} pending NFC write</p>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tokens.length === 0 && <p className="font-serif" style={{ fontSize: 15, color: 'var(--muted)', fontStyle: 'italic' }}>no patron tokens</p>}
            {tokens.map(t => (
              <div key={t.id} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <p className="font-mono" style={{ fontSize: 11, color: 'var(--muted)', width: 40, flexShrink: 0 }}>#{t.id}</p>
                  <div style={{ flex: 1 }}>
                    <p className="font-mono" style={{ fontSize: 12, color: 'var(--text)' }}>{t.patron_email ?? t.owner_email ?? '—'}</p>
                    {t.patronage_id && <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>patronage #{t.patronage_id}</p>}
                  </div>
                  {t.nfc_token ? (
                    <span className="font-mono" style={{ fontSize: 9, letterSpacing: 1, padding: '3px 10px', borderRadius: 20, background: 'rgba(76,175,80,0.12)', color: '#4caf50' }}>written</span>
                  ) : (
                    <span className="font-mono" style={{ fontSize: 9, letterSpacing: 1, padding: '3px 10px', borderRadius: 20, background: 'rgba(201,151,58,0.12)', color: '#c9973a', border: '1px solid #c9973a' }}>pending</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
