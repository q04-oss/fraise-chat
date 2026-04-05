'use client';
import { useEffect, useState } from 'react';
import { fetchPopupRequests, updatePopupRequest } from '@/lib/api';

const STATUS_COLOR: Record<string, string> = {
  pending: '#888',
  paid: 'var(--accent)',
  approved: '#4caf50',
  rejected: '#e57373',
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA');
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<Record<number, boolean>>({});

  const load = () => {
    setLoading(true);
    fetchPopupRequests()
      .then(setRequests)
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  async function handle(id: number, status: 'approved' | 'rejected') {
    setActing(prev => ({ ...prev, [id]: true }));
    try {
      await updatePopupRequest(id, status);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActing(prev => ({ ...prev, [id]: false }));
    }
  }

  return (
    <div style={{ padding: 32, maxWidth: 780 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <p className="font-serif" style={{ fontSize: 22, color: 'var(--text)' }}>Popup Requests</p>
        <button onClick={load} className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: 0.5 }}>↺ refresh</button>
      </div>

      {error && <p className="font-mono" style={{ fontSize: 11, color: '#e57373', marginBottom: 16 }}>{error}</p>}
      {loading && <p className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>loading…</p>}
      {!loading && requests.length === 0 && <p className="font-serif" style={{ fontSize: 15, color: 'var(--muted)', fontStyle: 'italic' }}>no requests</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {requests.map(r => (
          <div key={r.id} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <p className="font-serif" style={{ fontSize: 16, color: 'var(--text)' }}>{r.venue_name ?? `venue ${r.venue_id}`}</p>
                  <span className="font-mono" style={{ fontSize: 9, letterSpacing: 1, color: STATUS_COLOR[r.status] ?? 'var(--muted)' }}>{r.status}</span>
                </div>
                <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
                  {r.date} · {r.time}
                </p>
                <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                  {r.display_name ?? r.email} · submitted {fmtDate(r.created_at)}
                </p>
                {r.notes && (
                  <p className="font-mono" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, fontStyle: 'italic' }}>"{r.notes}"</p>
                )}
              </div>

              {(r.status === 'pending' || r.status === 'paid') && (
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 16 }}>
                  <button
                    onClick={() => handle(r.id, 'approved')}
                    disabled={acting[r.id]}
                    className="font-mono"
                    style={{ fontSize: 10, padding: '6px 14px', background: 'rgba(76,175,80,0.15)', color: '#4caf50', border: '1px solid #4caf50', borderRadius: 8, cursor: 'pointer' }}
                  >
                    approve
                  </button>
                  <button
                    onClick={() => handle(r.id, 'rejected')}
                    disabled={acting[r.id]}
                    className="font-mono"
                    style={{ fontSize: 10, padding: '6px 14px', background: 'rgba(229,115,115,0.15)', color: '#e57373', border: '1px solid #e57373', borderRadius: 8, cursor: 'pointer' }}
                  >
                    reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
