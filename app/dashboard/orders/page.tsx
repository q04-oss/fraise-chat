'use client';
import { useEffect, useState } from 'react';
import { fetchAdminOrders, fetchChocolatierOrders, updateOrderStatus } from '@/lib/api';

const CHOC: Record<string, string> = { guanaja_70: 'guanaja 70%', caraibe_66: 'caraïbe 66%', jivara_40: 'jivara 40%', ivoire_blanc: 'ivoire blanc' };
const FIN: Record<string, string> = { plain: 'plain', fleur_de_sel: 'fleur de sel', or_fin: 'or fin' };

const STATUS_COLOR: Record<string, string> = {
  pending: '#888',
  paid: 'var(--accent)',
  preparing: '#c9973a',
  ready: '#4caf50',
  collected: '#555',
  cancelled: '#e57373',
};

const NEXT_STATUS: Record<string, string> = {
  paid: 'preparing',
  preparing: 'ready',
  ready: 'collected',
};

type Tab = 'orders' | 'chocolatier';

export default function OrdersPage() {
  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [chocolatierGroups, setChocolatierGroups] = useState<Record<string, any[]>>({});
  const [statusFilter, setStatusFilter] = useState('paid');
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  async function loadOrders() {
    setLoading(true);
    try {
      const data = await fetchAdminOrders();
      setOrders(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadChocolatier() {
    setLoading(true);
    try {
      const data = await fetchChocolatierOrders();
      const groups: Record<string, any[]> = {};
      data.forEach((o: any) => {
        const key = o.slot?.time ?? 'unscheduled';
        if (!groups[key]) groups[key] = [];
        groups[key].push(o);
      });
      setChocolatierGroups(groups);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tab === 'orders') loadOrders();
    else loadChocolatier();
  }, [tab]);

  async function advance(id: number, nextStatus: string) {
    setAdvancing(prev => ({ ...prev, [id]: true }));
    try {
      await updateOrderStatus(id, nextStatus);
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: nextStatus } : o));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdvancing(prev => ({ ...prev, [id]: false }));
    }
  }

  const filtered = orders.filter(o => !statusFilter || o.status === statusFilter);

  return (
    <div style={{ padding: 32, maxWidth: 860 }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 28, borderBottom: '1px solid var(--border)' }}>
        {(['orders', 'chocolatier'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="font-mono"
            style={{
              fontSize: 10, letterSpacing: 1.5, padding: '8px 20px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: tab === t ? 'var(--accent)' : 'var(--muted)',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => tab === 'orders' ? loadOrders() : loadChocolatier()}
          className="font-mono"
          style={{ fontSize: 10, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: 0.5, padding: '8px 0' }}
        >↺ refresh</button>
      </div>

      {error && <p className="font-mono" style={{ fontSize: 11, color: '#e57373', marginBottom: 16 }}>{error}</p>}
      {loading && <p className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>loading…</p>}

      {/* Orders tab */}
      {!loading && tab === 'orders' && (
        <>
          {/* Status filter */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {['', 'pending', 'paid', 'preparing', 'ready', 'collected', 'cancelled'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className="font-mono"
                style={{
                  fontSize: 9, letterSpacing: 1, padding: '4px 12px',
                  borderRadius: 20, border: '1px solid var(--border)', cursor: 'pointer',
                  background: statusFilter === s ? 'var(--accent)' : 'var(--panel)',
                  color: statusFilter === s ? 'var(--bg)' : 'var(--muted)',
                }}
              >
                {s || 'all'}
              </button>
            ))}
          </div>

          {filtered.length === 0 && <p className="font-serif" style={{ fontSize: 15, color: 'var(--muted)', fontStyle: 'italic' }}>no orders</p>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(o => (
              <div key={o.id} style={{
                background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10,
                padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <p className="font-serif" style={{ fontSize: 16, color: 'var(--text)' }}>{o.variety_name ?? '—'}</p>
                    <span className="font-mono" style={{ fontSize: 9, letterSpacing: 1, color: STATUS_COLOR[o.status] ?? 'var(--muted)' }}>{o.status}</span>
                    {o.is_gift && <span className="font-mono" style={{ fontSize: 9, color: '#c9973a', letterSpacing: 1 }}>gift</span>}
                  </div>
                  <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
                    {[CHOC[o.chocolate] ?? o.chocolate, FIN[o.finish] ?? o.finish, `×${o.quantity}`].join('  ·  ')}
                  </p>
                  <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>{o.customer_email}</p>
                  {o.slot_time && <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{o.slot_time}</p>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  {o.nfc_token && (
                    <p className="font-mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 2 }}>{o.nfc_token}</p>
                  )}
                  {NEXT_STATUS[o.status] && (
                    <button
                      onClick={() => advance(o.id, NEXT_STATUS[o.status])}
                      disabled={advancing[o.id]}
                      className="font-mono"
                      style={{
                        fontSize: 10, letterSpacing: 0.5, padding: '6px 14px',
                        background: 'none', color: 'var(--accent)', border: '1px solid var(--accent)',
                        borderRadius: 8, cursor: 'pointer',
                      }}
                    >
                      {advancing[o.id] ? '…' : `→ ${NEXT_STATUS[o.status]}`}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Chocolatier tab */}
      {!loading && tab === 'chocolatier' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {Object.keys(chocolatierGroups).length === 0 && (
            <p className="font-serif" style={{ fontSize: 15, color: 'var(--muted)', fontStyle: 'italic' }}>no orders for today</p>
          )}
          {Object.entries(chocolatierGroups).map(([slotTime, slotOrders]) => (
            <div key={slotTime}>
              <p className="font-mono" style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: 2, marginBottom: 12 }}>{slotTime.toUpperCase()}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {slotOrders.map(o => (
                  <div key={o.id} style={{
                    background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10,
                    padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <p className="font-mono" style={{ fontSize: 12, color: 'var(--text)' }}>
                        {CHOC[o.chocolate] ?? o.chocolate}  ·  {FIN[o.finish] ?? o.finish}  ·  ×{o.quantity}
                      </p>
                      <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>{o.customer_email}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {o.is_gift && <span className="font-mono" style={{ fontSize: 9, color: '#c9973a', letterSpacing: 1 }}>gift</span>}
                      <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)' }}>#{o.id}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
