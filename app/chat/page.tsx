'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchConversations } from '@/lib/api';

export default function ChatIndexPage() {
  const router = useRouter();
  const [convos, setConvos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('fraise_chat_token');
    if (!token) { router.replace('/'); return; }
    fetchConversations()
      .then(setConvos)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--panel)' }}>
        <p className="font-mono" style={{ fontSize: 9, color: 'var(--accent)', letterSpacing: 2, textTransform: 'uppercase' }}>
          fraise.chat
        </p>
      </div>

      {loading ? (
        <p className="font-mono" style={{ fontSize: 11, color: 'var(--muted)', padding: 20 }}>loading...</p>
      ) : convos.length === 0 ? (
        <p className="font-mono" style={{ fontSize: 11, color: 'var(--muted)', padding: 20 }}>no conversations yet</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {convos.map(c => (
            <button
              key={c.other_user_id}
              onClick={() => router.push(`/chat/${c.other_user_id}?name=${encodeURIComponent(c.display_name ?? c.user_code ?? 'user')}`)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px',
                background: 'none', border: 'none', borderBottom: '1px solid var(--border)',
                cursor: 'pointer', textAlign: 'left', width: '100%',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="font-serif" style={{ fontSize: 16, color: 'var(--text)' }}>
                  {c.display_name ?? c.user_code ?? 'user'}
                </span>
                <span className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }} >
                  {c.last_body}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <span className="font-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{timeAgo(c.last_at)}</span>
                {c.unread_count > 0 && (
                  <span style={{
                    background: 'var(--accent)', color: 'var(--bg)',
                    borderRadius: 10, width: 18, height: 18,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontFamily: 'monospace',
                  }}>
                    {c.unread_count > 9 ? '9+' : c.unread_count}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
