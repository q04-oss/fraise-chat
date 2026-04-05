'use client';
import { useEffect, useState } from 'react';
import { fetchAdminContracts, fetchExpiringContracts, fetchTalentLeaderboard, sendContractOffer, completeExpiredContracts, fetchAdminBusinesses } from '@/lib/api';

function fmtDate(iso: string) {
  return iso ? new Date(iso).toLocaleDateString('en-CA') : '—';
}

function daysLeft(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

type Tab = 'placements' | 'leaderboard' | 'offer';

export default function TalentPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [expiring, setExpiring] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('placements');
  const [completing, setCompleting] = useState(false);
  const [form, setForm] = useState({ business_id: '', user_id: '', starts_at: '', ends_at: '', note: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchAdminContracts(),
      fetchExpiringContracts(),
      fetchTalentLeaderboard(),
      fetchAdminBusinesses(),
    ])
      .then(([c, e, l, b]) => { setContracts(c); setExpiring(e); setLeaderboard(l); setBusinesses(b); })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const active = contracts.filter(c => c.status === 'active');
  const pending = contracts.filter(c => c.status === 'pending');

  async function handleCompleteExpired() {
    setCompleting(true);
    try {
      await completeExpiredContracts();
      const updated = await fetchAdminContracts();
      setContracts(updated);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCompleting(false);
    }
  }

  async function handleSendOffer(e: React.FormEvent) {
    e.preventDefault();
    if (!form.business_id || !form.user_id || !form.starts_at || !form.ends_at) return;
    setSending(true);
    try {
      await sendContractOffer({
        business_id: Number(form.business_id),
        user_id: Number(form.user_id),
        starts_at: form.starts_at,
        ends_at: form.ends_at,
        note: form.note || undefined,
      });
      setSent(true);
      setForm({ business_id: '', user_id: '', starts_at: '', ends_at: '', note: '' });
      setTimeout(() => setSent(false), 2000);
      const updated = await fetchAdminContracts();
      setContracts(updated);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <p className="font-serif" style={{ fontSize: 22, color: 'var(--text)' }}>Talent</p>
        <button onClick={handleCompleteExpired} disabled={completing} className="font-mono" style={{ fontSize: 10, letterSpacing: 0.5, padding: '6px 14px', background: 'none', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>
          {completing ? 'processing…' : 'complete expired'}
        </button>
      </div>

      {error && <p className="font-mono" style={{ fontSize: 11, color: '#e57373', marginBottom: 16 }}>{error}</p>}

      {/* Expiring warning */}
      {expiring.length > 0 && (
        <div style={{ background: 'rgba(229,115,115,0.08)', border: '1px solid #e57373', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
          <p className="font-mono" style={{ fontSize: 9, color: '#e57373', letterSpacing: 1.5, marginBottom: 10 }}>EXPIRING WITHIN 14 DAYS</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {expiring.map(c => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <p className="font-mono" style={{ fontSize: 12, color: 'var(--text)' }}>{c.user_display_name} — {c.business_name}</p>
                <p className="font-mono" style={{ fontSize: 11, color: '#e57373' }}>{daysLeft(c.ends_at)}d left</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {(['placements', 'leaderboard', 'offer'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className="font-mono" style={{
            fontSize: 10, letterSpacing: 1.5, padding: '8px 20px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: tab === t ? 'var(--accent)' : 'var(--muted)',
            borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: -1,
          }}>{t}</button>
        ))}
      </div>

      {loading && <p className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>loading…</p>}

      {/* Placements */}
      {!loading && tab === 'placements' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Active */}
          <div>
            <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1.5, marginBottom: 10 }}>ACTIVE ({active.length})</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {active.length === 0 && <p className="font-serif" style={{ fontSize: 14, color: 'var(--muted)', fontStyle: 'italic' }}>none</p>}
              {active.map(c => (
                <div key={c.id} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p className="font-mono" style={{ fontSize: 13, color: 'var(--text)' }}>{c.user_display_name} — {c.business_name}</p>
                    <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>{fmtDate(c.starts_at)} → {fmtDate(c.ends_at)}</p>
                  </div>
                  {c.visit_count != null && (
                    <p className="font-mono" style={{ fontSize: 11, color: 'var(--accent)' }}>{c.visit_count} visits</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Pending */}
          <div>
            <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1.5, marginBottom: 10 }}>PENDING OFFERS ({pending.length})</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pending.length === 0 && <p className="font-serif" style={{ fontSize: 14, color: 'var(--muted)', fontStyle: 'italic' }}>none</p>}
              {pending.map(c => (
                <div key={c.id} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p className="font-mono" style={{ fontSize: 13, color: 'var(--text)' }}>{c.user_display_name} — {c.business_name}</p>
                    <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>sent {fmtDate(c.created_at)}</p>
                  </div>
                  <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>awaiting response</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {!loading && tab === 'leaderboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {leaderboard.length === 0 && <p className="font-serif" style={{ fontSize: 15, color: 'var(--muted)', fontStyle: 'italic' }}>no data</p>}
          {leaderboard.map((l, i) => (
            <div key={l.user_id ?? i} style={{
              background: 'var(--panel)', border: `1px solid ${l.active_contract ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 10, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <p className="font-mono" style={{ fontSize: 11, color: 'var(--muted)', width: 24, textAlign: 'right' }}>#{i + 1}</p>
              <div style={{ flex: 1 }}>
                <p className="font-mono" style={{ fontSize: 13, color: 'var(--text)' }}>{l.display_name}</p>
                {l.active_contract && (
                  <p className="font-mono" style={{ fontSize: 9, color: 'var(--accent)', letterSpacing: 1, marginTop: 2 }}>{l.active_contract}</p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 16, textAlign: 'right' }}>
                {l.nomination_count != null && <div><p className="font-mono" style={{ fontSize: 12, color: 'var(--text)' }}>{l.nomination_count}</p><p className="font-mono" style={{ fontSize: 8, color: 'var(--muted)', letterSpacing: 1 }}>NOM</p></div>}
                {l.contracts_completed != null && <div><p className="font-mono" style={{ fontSize: 12, color: 'var(--text)' }}>{l.contracts_completed}</p><p className="font-mono" style={{ fontSize: 8, color: 'var(--muted)', letterSpacing: 1 }}>DONE</p></div>}
                {l.relevance_score != null && <div><p className="font-mono" style={{ fontSize: 12, color: 'var(--accent)' }}>{Number(l.relevance_score).toFixed(1)}</p><p className="font-mono" style={{ fontSize: 8, color: 'var(--muted)', letterSpacing: 1 }}>SCORE</p></div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Send offer */}
      {tab === 'offer' && (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, maxWidth: 540 }}>
          <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1.5, marginBottom: 20 }}>SEND CONTRACT OFFER</p>
          <form onSubmit={handleSendOffer} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>BUSINESS</span>
              <select
                value={form.business_id}
                onChange={e => setForm(p => ({ ...p, business_id: e.target.value }))}
                required
                className="font-mono"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', fontSize: 12, color: 'var(--text)' }}
              >
                <option value="">— select —</option>
                {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
            {[
              { key: 'user_id', label: 'USER ID', type: 'number', required: true },
              { key: 'starts_at', label: 'STARTS', type: 'date', required: true },
              { key: 'ends_at', label: 'ENDS', type: 'date', required: true },
              { key: 'note', label: 'NOTE', type: 'text' },
            ].map(f => (
              <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>{f.label}</span>
                <input
                  type={f.type}
                  required={f.required}
                  value={(form as any)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="font-mono"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', fontSize: 12, color: 'var(--text)' }}
                />
              </label>
            ))}
            <button type="submit" disabled={sending} className="font-mono" style={{
              fontSize: 11, letterSpacing: 1, padding: '10px',
              background: sent ? 'rgba(76,175,80,0.15)' : 'var(--accent)',
              color: sent ? '#4caf50' : 'var(--bg)',
              border: 'none', borderRadius: 8, cursor: 'pointer',
            }}>
              {sending ? 'sending…' : sent ? 'sent ✓' : 'send offer'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
