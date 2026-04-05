'use client';
import { useEffect, useState } from 'react';
import { fetchPortalActivity, fetchPortalContent, deletePortalContent, banUser } from '@/lib/api';

function fmtCAD(cents: number) {
  return `CA$${(cents / 100).toLocaleString('en-CA', { minimumFractionDigits: 2 })}`;
}

function fmtDate(iso: string) {
  return iso ? new Date(iso).toLocaleDateString('en-CA') : '—';
}

export default function PortalPage() {
  const [activity, setActivity] = useState<any>(null);
  const [content, setContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banUserId, setBanUserId] = useState<number | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banning, setBanning] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([fetchPortalActivity(), fetchPortalContent()])
      .then(([a, c]) => { setActivity(a); setContent(c); })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: number) {
    setDeleting(id);
    try {
      await deletePortalContent(id);
      setContent(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  }

  async function handleBan(userId: number) {
    setBanning(true);
    try {
      await banUser(userId, banReason || undefined);
      setContent(prev => prev.filter(c => c.user_id !== userId));
      setBanUserId(null);
      setBanReason('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBanning(false);
    }
  }

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <p className="font-serif" style={{ fontSize: 22, color: 'var(--text)', marginBottom: 24 }}>Portal</p>
      {error && <p className="font-mono" style={{ fontSize: 11, color: '#e57373', marginBottom: 16 }}>{error}</p>}
      {loading && <p className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>loading…</p>}

      {!loading && activity && (
        <>
          {/* Stats */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
            {[
              { label: 'OPTED IN', value: activity.opted_in_count ?? 0 },
              { label: 'ACTIVE SUBSCRIBERS', value: activity.total_subscribers ?? 0 },
              { label: 'TOTAL REVENUE', value: fmtCAD(activity.total_revenue_cents ?? 0) },
              { label: 'PLATFORM CUT', value: fmtCAD(activity.total_cut_cents ?? 0) },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 20px' }}>
                <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1.5, marginBottom: 6 }}>{s.label}</p>
                <p className="font-mono" style={{ fontSize: 18, color: 'var(--text)' }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Recent access rows */}
          {activity.recent && activity.recent.length > 0 && (
            <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 28 }}>
              <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1.5, marginBottom: 14 }}>RECENT ACCESS</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {activity.recent.map((r: any) => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p className="font-mono" style={{ fontSize: 12, color: 'var(--text)' }}>
                        {r.buyer_display_name ?? `buyer #${r.buyer_id}`} → {r.owner_display_name ?? `owner #${r.owner_id}`}
                      </p>
                      <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>
                        expires {fmtDate(r.expires_at)} · {r.source ?? '—'}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p className="font-mono" style={{ fontSize: 12, color: 'var(--text)' }}>{fmtCAD(r.amount_cents ?? 0)}</p>
                      <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)' }}>cut {fmtCAD(r.platform_cut_cents ?? 0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content */}
          <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1.5, marginBottom: 12 }}>CONTENT</p>
          {content.length === 0 && (
            <p className="font-serif" style={{ fontSize: 15, color: 'var(--muted)', fontStyle: 'italic' }}>no content</p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {content.map(c => (
              <div key={c.id} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                {c.media_url && (
                  <img src={c.media_url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                )}
                <div style={{ padding: '10px 12px' }}>
                  {c.caption && <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 6 }}>{c.caption.slice(0, 60)}{c.caption.length > 60 ? '…' : ''}</p>}
                  <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)' }}>{c.display_name ?? `user #${c.user_id}`}</p>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={deleting === c.id}
                      className="font-mono"
                      style={{ fontSize: 9, padding: '3px 8px', background: 'rgba(229,115,115,0.12)', color: '#e57373', border: '1px solid #e57373', borderRadius: 6, cursor: 'pointer' }}
                    >
                      {deleting === c.id ? '…' : 'remove'}
                    </button>
                    {c.user_id && banUserId !== c.user_id && (
                      <button
                        onClick={() => { setBanUserId(c.user_id); setBanReason(''); }}
                        className="font-mono"
                        style={{ fontSize: 9, padding: '3px 8px', background: 'none', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}
                      >
                        ban
                      </button>
                    )}
                  </div>
                  {banUserId === c.user_id && (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <input
                        type="text"
                        placeholder="reason (optional)"
                        value={banReason}
                        onChange={e => setBanReason(e.target.value)}
                        className="font-mono"
                        style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 10, color: 'var(--text)' }}
                      />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => handleBan(c.user_id)} disabled={banning} className="font-mono" style={{ fontSize: 9, padding: '3px 8px', background: '#e57373', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>{banning ? '…' : 'confirm ban'}</button>
                        <button onClick={() => setBanUserId(null)} className="font-mono" style={{ fontSize: 9, padding: '3px 8px', background: 'none', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}>✕</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
