'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { fetchThread, sendMessage } from '@/lib/api';
import { getSession } from '@/lib/auth';

const CHOC: Record<string, string> = { guanaja_70: 'guanaja 70%', caraibe_66: 'caraïbe 66%', jivara_40: 'jivara 40%', ivoire_blanc: 'ivoire blanc' };
const FIN: Record<string, string> = { plain: 'plain', fleur_de_sel: 'fleur de sel', or_fin: 'or fin' };

export default function ThreadPage() {
  const { userId } = useParams<{ userId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const otherName = searchParams.get('name') ?? 'customer';
  const otherId = parseInt(userId, 10);

  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [myId, setMyId] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = getSession();
    if (s) setMyId(s.user_id);
  }, []);

  const load = () => {
    fetchThread(otherId)
      .then(setMessages)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [otherId]);

  useEffect(() => {
    const interval = setInterval(() => fetchThread(otherId).then(setMessages).catch(() => {}), 5000);
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

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16, background: 'var(--panel)' }}>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 22 }}>←</button>
        <p className="font-serif" style={{ fontSize: 17, color: 'var(--text)' }}>{otherName}</p>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {loading && <p className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>loading...</p>}

        {messages.map(m => {
          const isMine = m.sender_id === myId;

          if (m.type === 'offer') {
            const meta = m.metadata ?? {};
            const isPaid = meta.status === 'paid';
            return (
              <div key={m.id} style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', maxWidth: 340, margin: '8px 0', border: '1px solid var(--border)', borderRadius: 12, padding: 16, background: 'var(--card)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span className="font-mono" style={{ fontSize: 9, color: 'var(--accent)', letterSpacing: 1.5, textTransform: 'uppercase' }}>offer</span>
                  <span className="font-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{formatTime(m.created_at)}</span>
                </div>
                <p className="font-serif" style={{ fontSize: 18, color: 'var(--text)' }}>{meta.variety_name}</p>
                <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
                  {[CHOC[meta.chocolate] ?? meta.chocolate, FIN[meta.finish] ?? meta.finish, `×${meta.quantity}`].join('  ·  ')}
                </p>
                <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{meta.slot_date}  {meta.slot_time}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <span className="font-mono" style={{ fontSize: 14, color: 'var(--text)' }}>CA${((meta.total_cents ?? 0) / 100).toFixed(2)}</span>
                  <span className="font-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{isPaid ? 'paid ✓' : 'pending'}</span>
                </div>
              </div>
            );
          }

          if (m.type === 'order_confirm') {
            const meta = m.metadata ?? {};
            return (
              <div key={m.id} style={{ alignSelf: 'flex-start', maxWidth: 300, margin: '8px 0', border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span className="font-mono" style={{ fontSize: 9, color: 'var(--accent)', letterSpacing: 1.5 }}>CONFIRMED</span>
                <p className="font-serif" style={{ fontSize: 16 }}>{meta.variety_name}</p>
                <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{meta.slot_date}  ·  {meta.slot_time}</p>
                {meta.nfc_token && <p className="font-mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 2 }}>{meta.nfc_token}</p>}
              </div>
            );
          }

          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: isMine ? 'flex-end' : 'flex-start', margin: '4px 0' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                <span className="font-mono" style={{ fontSize: 9, color: 'var(--accent)', letterSpacing: 1, textTransform: 'uppercase' }}>
                  {isMine ? 'you' : otherName.toLowerCase()}
                </span>
                <span className="font-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{formatTime(m.created_at)}</span>
              </div>
              <p style={{ fontSize: 14, color: 'var(--text)', maxWidth: 400, lineHeight: 1.6 }}>{m.body}</p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form onSubmit={handleSend} style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--panel)' }}>
        <span className="font-mono" style={{ fontSize: 13, color: 'var(--accent)' }}>{sending ? '·' : '>'}</span>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="..."
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontSize: 14 }}
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          style={{ background: 'none', border: 'none', cursor: text.trim() ? 'pointer' : 'default', color: text.trim() ? 'var(--accent)' : 'var(--muted)', fontSize: 20 }}
        >↑</button>
      </form>
    </div>
  );
}
