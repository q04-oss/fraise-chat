'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchConversations } from '@/lib/api';

export default function InboxPage() {
  const router = useRouter();
  const [convs, setConvs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations()
      .then(setConvs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{ padding: '32px 40px', maxWidth: 720 }}>
      <p className="font-mono" style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 24 }}>
        conversations
      </p>

      {loading && (
        <p className="font-mono" style={{ fontSize: 12, color: 'var(--muted)' }}>loading...</p>
      )}

      {!loading && convs.length === 0 && (
        <p className="font-serif-i" style={{ fontSize: 15, color: 'var(--muted)' }}>no conversations yet</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {convs.map(c => (
          <button
            key={c.other_user_id}
            onClick={() => router.push(`/dashboard/thread/${c.other_user_id}?name=${encodeURIComponent(c.display_name ?? c.user_code ?? '')}`)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              padding: '16px 0',
              borderBottom: '1px solid var(--border)',
              background: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              gap: 16,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                <span className="font-serif" style={{ fontSize: 15, color: 'var(--text)' }}>
                  {c.display_name ?? c.user_code ?? 'unknown'}
                </span>
                {c.unread_count > 0 && (
                  <span className="font-mono" style={{
                    fontSize: 9, background: 'var(--accent)', color: '#fff',
                    borderRadius: 10, padding: '2px 6px',
                  }}>{c.unread_count}</span>
                )}
              </div>
              <p className="font-mono" style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {c.last_body}
              </p>
            </div>
            <span className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', flexShrink: 0 }}>
              {formatTime(c.last_at)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
