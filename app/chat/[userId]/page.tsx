'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { fetchThread, sendMessage } from '@/lib/api';

// Standalone user-to-user thread — no operator sidebar.
// Auth: token is passed as ?token= on first open (from iOS app) and stored to
// localStorage so subsequent renders stay authenticated without re-passing it.

export default function ChatPage() {
  const { userId } = useParams<{ userId: string }>();
  const searchParams = useSearchParams();
  const otherId = parseInt(userId, 10);

  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [myId, setMyId] = useState<number | null>(null);
  const [partnerName, setPartnerName] = useState<string>('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Hydrate token from URL on first load
  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      localStorage.setItem('fraise_chat_token', urlToken);
    }

    const urlMyId = searchParams.get('my_id');
    if (urlMyId) setMyId(parseInt(urlMyId, 10));

    const urlName = searchParams.get('name');
    if (urlName) setPartnerName(decodeURIComponent(urlName));
  }, []);

  const load = useCallback(() => {
    fetchThread(otherId)
      .then(setMessages)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [otherId]);

  useEffect(() => { load(); }, [load]);

  // Poll every 5s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchThread(otherId).then(setMessages).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [otherId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    const body = text.trim();
    setText('');
    setSending(true);
    try {
      const msg = await sendMessage(otherId, body);
      setMessages(prev => [...prev, msg]);
    } catch { setText(body); }
    finally { setSending(false); }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--panel)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
      }}>
        <p className="font-mono" style={{ fontSize: 9, color: 'var(--accent)', letterSpacing: 2, textTransform: 'uppercase' }}>
          fraise.chat
        </p>
        {partnerName && (
          <>
            <span style={{ color: 'var(--border)', fontSize: 12 }}>·</span>
            <p className="font-serif" style={{ fontSize: 16, color: 'var(--text)' }}>{partnerName}</p>
          </>
        )}
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        WebkitOverflowScrolling: 'touch',
      } as React.CSSProperties}>
        {loading && (
          <p className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>loading...</p>
        )}

        {!loading && messages.length === 0 && (
          <p className="font-mono" style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 40 }}>
            a shared memory.
          </p>
        )}

        {messages.map(m => {
          const isMine = myId !== null && m.sender_id === myId;

          if (m.type === 'memory_unlock') {
            return (
              <div key={m.id} style={{
                alignSelf: 'center',
                margin: '16px 0',
                padding: '10px 16px',
                border: '1px solid var(--border)',
                borderRadius: 20,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
              }}>
                <p className="font-mono" style={{ fontSize: 9, color: 'var(--accent)', letterSpacing: 1.5 }}>MEMORY UNLOCKED</p>
                <p className="font-serif" style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {(m.metadata as any)?.business_name ?? 'dinner'}
                </p>
              </div>
            );
          }

          return (
            <div key={m.id} style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              alignItems: isMine ? 'flex-end' : 'flex-start',
              margin: '5px 0',
            }}>
              <div style={{
                maxWidth: '72%',
                background: isMine ? 'var(--accent)' : 'var(--panel)',
                borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                padding: '9px 14px',
              }}>
                <p style={{
                  fontSize: 14,
                  color: isMine ? 'var(--bg)' : 'var(--text)',
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                }}>{m.body}</p>
              </div>
              <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)' }}>
                {formatTime(m.created_at)}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form
        onSubmit={handleSend}
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--panel)',
          flexShrink: 0,
        }}
      >
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="..."
          style={{
            flex: 1,
            border: '1px solid var(--border)',
            borderRadius: 20,
            padding: '9px 14px',
            background: 'var(--bg)',
            color: 'var(--text)',
            fontSize: 14,
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: text.trim() && !sending ? 'var(--accent)' : 'var(--border)',
            border: 'none',
            cursor: text.trim() && !sending ? 'pointer' : 'default',
            color: 'var(--bg)',
            fontSize: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.15s',
          }}
        >↑</button>
      </form>
    </div>
  );
}
