'use client';
import { useEffect, useState } from 'react';
import { fetchAdminMemberships, fetchMembershipWaitlist, setMemberPortrait } from '@/lib/api';

const TIER_COLOR: Record<string, string> = {
  maison: '#c9973a',
  reserve: '#a0845c',
  atelier: '#7b9e87',
  fondateur: '#7c6fa0',
  patrimoine: '#4e7c99',
  souverain: '#9c3a3a',
};

function fmtCAD(cents: number) {
  return `CA$${(cents / 100).toLocaleString('en-CA', { minimumFractionDigits: 2 })}`;
}

function fmtDate(iso: string) {
  return iso ? new Date(iso).toLocaleDateString('en-CA') : '—';
}

export default function MembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portraitEditId, setPortraitEditId] = useState<number | null>(null);
  const [portraitUrl, setPortraitUrl] = useState('');
  const [savingPortrait, setSavingPortrait] = useState(false);
  const [tab, setTab] = useState<'members' | 'waitlist'>('members');

  useEffect(() => {
    Promise.all([fetchAdminMemberships(), fetchMembershipWaitlist()])
      .then(([m, w]) => { setMembers(m); setWaitlist(w); })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function savePortrait(userId: number) {
    setSavingPortrait(true);
    try {
      await setMemberPortrait(userId, portraitUrl);
      setMembers(prev => prev.map(m => m.id === userId ? { ...m, portrait_url: portraitUrl } : m));
      setPortraitEditId(null);
      setPortraitUrl('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingPortrait(false);
    }
  }

  const totalFund = members.reduce((sum, m) => sum + (m.fund_balance ?? 0), 0);

  return (
    <div style={{ padding: 32, maxWidth: 860 }}>
      <p className="font-serif" style={{ fontSize: 22, color: 'var(--text)', marginBottom: 24 }}>Members</p>
      {error && <p className="font-mono" style={{ fontSize: 11, color: '#e57373', marginBottom: 16 }}>{error}</p>}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'active members', value: members.length },
          { label: 'total fund', value: fmtCAD(totalFund) },
          { label: 'waitlisted', value: waitlist.length },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 20px' }}>
            <p className="font-mono" style={{ fontSize: 18, color: 'var(--text)' }}>{s.value}</p>
            <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1, marginTop: 2 }}>{s.label.toUpperCase()}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {(['members', 'waitlist'] as const).map(t => (
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

      {/* Members list */}
      {!loading && tab === 'members' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {members.length === 0 && <p className="font-serif" style={{ fontSize: 15, color: 'var(--muted)', fontStyle: 'italic' }}>no active members</p>}
          {members.map(m => (
            <div key={m.id} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* Portrait */}
                <div style={{ width: 40, height: 40, borderRadius: 20, overflow: 'hidden', flexShrink: 0, background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {m.portrait_url
                    ? <img src={m.portrait_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span className="font-mono" style={{ fontSize: 12, color: 'var(--muted)' }}>{(m.display_name ?? m.email ?? '?')[0].toUpperCase()}</span>
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <p className="font-mono" style={{ fontSize: 13, color: 'var(--text)' }}>{m.display_name ?? m.email}</p>
                    <span className="font-mono" style={{
                      fontSize: 8, letterSpacing: 1, padding: '2px 7px', borderRadius: 20,
                      background: `${TIER_COLOR[m.tier] ?? 'var(--muted)'}22`,
                      color: TIER_COLOR[m.tier] ?? 'var(--muted)',
                    }}>{m.tier}</span>
                  </div>
                  <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)' }}>
                    {fmtDate(m.started_at)} → {fmtDate(m.renews_at)}
                  </p>
                </div>
                <p className="font-mono" style={{ fontSize: 13, color: 'var(--accent)' }}>{fmtCAD(m.fund_balance ?? 0)}</p>
                <button
                  onClick={() => { setPortraitEditId(m.id); setPortraitUrl(m.portrait_url ?? ''); }}
                  className="font-mono"
                  style={{ fontSize: 9, letterSpacing: 0.5, padding: '4px 10px', background: 'none', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}
                >portrait</button>
              </div>

              {/* Portrait edit inline */}
              {portraitEditId === m.id && (
                <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={portraitUrl}
                    onChange={e => setPortraitUrl(e.target.value)}
                    className="font-mono"
                    style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: 'var(--text)' }}
                  />
                  <button onClick={() => savePortrait(m.id)} disabled={savingPortrait} className="font-mono" style={{ fontSize: 10, padding: '6px 14px', background: 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: 7, cursor: 'pointer' }}>{savingPortrait ? '…' : 'save'}</button>
                  <button onClick={() => setPortraitEditId(null)} className="font-mono" style={{ fontSize: 10, padding: '6px 12px', background: 'none', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer' }}>cancel</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Waitlist */}
      {!loading && tab === 'waitlist' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {waitlist.length === 0 && <p className="font-serif" style={{ fontSize: 15, color: 'var(--muted)', fontStyle: 'italic' }}>no waitlist entries</p>}
          {waitlist.map((w, i) => (
            <div key={i} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <p className="font-mono" style={{ fontSize: 13, color: 'var(--text)' }}>{w.display_name ?? w.email}</p>
                    <span className="font-mono" style={{ fontSize: 8, letterSpacing: 1, padding: '2px 7px', borderRadius: 20, background: 'rgba(124,111,160,0.15)', color: '#7c6fa0' }}>{w.tier}</span>
                  </div>
                  {w.message && (
                    <p className="font-mono" style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>
                      "{w.message.length > 100 ? w.message.slice(0, 100) + '…' : w.message}"
                    </p>
                  )}
                </div>
                <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)' }}>{fmtDate(w.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
