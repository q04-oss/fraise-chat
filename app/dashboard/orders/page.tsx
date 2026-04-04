'use client';
import { useEffect, useState } from 'react';
import { fetchChatOrders } from '@/lib/api';

const CHOC: Record<string, string> = { guanaja_70: 'guanaja 70%', caraibe_66: 'caraïbe 66%', jivara_40: 'jivara 40%', ivoire_blanc: 'ivoire blanc' };
const FIN: Record<string, string> = { plain: 'plain', fleur_de_sel: 'fleur de sel', or_fin: 'or fin' };

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetchChatOrders()
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div style={{ padding: '32px 40px', maxWidth: 720 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <p className="font-mono" style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--muted)', textTransform: 'uppercase' }}>orders</p>
        <button
          onClick={load}
          className="font-mono"
          style={{ fontSize: 10, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: 0.5 }}
        >↺ refresh</button>
      </div>

      {loading && <p className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>loading...</p>}
      {!loading && orders.length === 0 && (
        <p className="font-serif-i" style={{ fontSize: 15, color: 'var(--muted)' }}>no pending orders</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {orders.map(o => (
          <div
            key={o.id}
            style={{ padding: '18px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
              <p className="font-serif" style={{ fontSize: 18, color: 'var(--text)' }}>{o.variety_name ?? '—'}</p>
              <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
                {[CHOC[o.chocolate] ?? o.chocolate, FIN[o.finish] ?? o.finish, `×${o.quantity}`].join('  ·  ')}
              </p>
              {o.slot_time && (
                <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{o.slot_time}</p>
              )}
              <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{o.customer_email}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              {o.nfc_token && (
                <p className="font-mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 2 }}>{o.nfc_token}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
