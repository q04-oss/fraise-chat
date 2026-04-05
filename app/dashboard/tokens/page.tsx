'use client';
import { useEffect, useState } from 'react';
import { fetchAdminTokens, setTokenNfc } from '@/lib/api';

function fmtCAD(cents: number) {
  return `CA$${(cents / 100).toLocaleString('en-CA', { minimumFractionDigits: 2 })}`;
}

function fmtDate(iso: string) {
  return iso ? new Date(iso).toLocaleDateString('en-CA') : '—';
}

export default function TokensPage() {
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nfcEditId, setNfcEditId] = useState<number | null>(null);
  const [nfcValue, setNfcValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAdminTokens()
      .then(setTokens)
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSetNfc(id: number) {
    if (!nfcValue.trim()) return;
    setSaving(true);
    try {
      await setTokenNfc(id, nfcValue.trim().toUpperCase());
      setTokens(prev => prev.map(t => t.id === id ? { ...t, nfc_token: nfcValue.trim().toUpperCase() } : t));
      setNfcEditId(null);
      setNfcValue('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const totalExcess = tokens.reduce((sum, t) => sum + (t.excess_amount_cents ?? 0), 0);
  const pendingNfc = tokens.filter(t => !t.nfc_token).length;

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <p className="font-serif" style={{ fontSize: 22, color: 'var(--text)', marginBottom: 24 }}>Tokens</p>
      {error && <p className="font-mono" style={{ fontSize: 11, color: '#e57373', marginBottom: 16 }}>{error}</p>}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'TOTAL MINTED', value: tokens.length },
          { label: 'TOTAL EXCESS REVENUE', value: fmtCAD(totalExcess) },
          { label: 'PENDING NFC WRITE', value: pendingNfc, warn: pendingNfc > 0 },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--panel)', border: `1px solid ${s.warn ? '#c9973a' : 'var(--border)'}`, borderRadius: 10, padding: '14px 20px' }}>
            <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1.5, marginBottom: 6 }}>{s.label}</p>
            <p className="font-mono" style={{ fontSize: 20, color: s.warn ? '#c9973a' : 'var(--text)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {loading && <p className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>loading…</p>}

      {/* Token table */}
      {!loading && tokens.length === 0 && (
        <p className="font-serif" style={{ fontSize: 15, color: 'var(--muted)', fontStyle: 'italic' }}>no tokens minted</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tokens.map(t => (
          <div key={t.id} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <p className="font-mono" style={{ fontSize: 11, color: 'var(--muted)', width: 40, flexShrink: 0 }}>#{t.id}</p>
              <div style={{ flex: 1 }}>
                <p className="font-mono" style={{ fontSize: 12, color: 'var(--text)' }}>{t.variety_name ?? '—'}</p>
                <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                  {t.current_owner_email ?? '—'} · minted {fmtDate(t.created_at)}
                </p>
                {t.original_owner_email && t.original_owner_email !== t.current_owner_email && (
                  <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', marginTop: 1 }}>orig: {t.original_owner_email}</p>
                )}
              </div>
              {t.excess_amount_cents > 0 && (
                <p className="font-mono" style={{ fontSize: 11, color: 'var(--accent)' }}>{fmtCAD(t.excess_amount_cents)}</p>
              )}
              <div style={{ flexShrink: 0 }}>
                {t.nfc_token ? (
                  <span className="font-mono" style={{ fontSize: 9, letterSpacing: 1, padding: '3px 10px', borderRadius: 20, background: 'rgba(76,175,80,0.12)', color: '#4caf50' }}>written</span>
                ) : nfcEditId === t.id ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="A3F9C12E"
                      value={nfcValue}
                      onChange={e => setNfcValue(e.target.value)}
                      className="font-mono"
                      style={{ width: 100, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 11, color: 'var(--text)' }}
                    />
                    <button onClick={() => handleSetNfc(t.id)} disabled={saving} className="font-mono" style={{ fontSize: 9, padding: '4px 10px', background: 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: 6, cursor: 'pointer' }}>{saving ? '…' : 'set'}</button>
                    <button onClick={() => { setNfcEditId(null); setNfcValue(''); }} className="font-mono" style={{ fontSize: 9, padding: '4px 8px', background: 'none', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}>✕</button>
                  </div>
                ) : (
                  <button onClick={() => { setNfcEditId(t.id); setNfcValue(''); }} className="font-mono" style={{ fontSize: 9, letterSpacing: 1, padding: '3px 10px', borderRadius: 20, background: 'rgba(201,151,58,0.12)', color: '#c9973a', border: '1px solid #c9973a', cursor: 'pointer' }}>
                    set nfc
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
