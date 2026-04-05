'use client';
import { useEffect, useState } from 'react';
import { fetchSupplierAlerts } from '@/lib/api';

export default function SupplierPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetchSupplierAlerts()
      .then(setAlerts)
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div style={{ padding: 32, maxWidth: 700 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <p className="font-serif" style={{ fontSize: 22, color: 'var(--text)' }}>Stock Alerts</p>
        <button
          onClick={load}
          className="font-mono"
          style={{ fontSize: 10, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: 0.5 }}
        >↺ refresh</button>
      </div>

      {error && <p className="font-mono" style={{ fontSize: 11, color: '#e57373', marginBottom: 16 }}>{error}</p>}
      {loading && <p className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>loading…</p>}

      {!loading && alerts.length === 0 && (
        <p className="font-serif" style={{ fontSize: 15, color: 'var(--muted)', fontStyle: 'italic' }}>all varieties are well stocked</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {alerts.map(v => (
          <div key={v.id} style={{
            background: 'var(--panel)',
            border: `1px solid ${v.stock_remaining <= 3 ? '#e57373' : 'var(--border)'}`,
            borderRadius: 10,
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <p className="font-serif" style={{ fontSize: 16, color: 'var(--text)' }}>{v.name}</p>
              {(v.source_farm || v.source_location) && (
                <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>
                  {[v.source_farm, v.source_location].filter(Boolean).join(' · ')}
                </p>
              )}
              {v.tag && (
                <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2, letterSpacing: 1 }}>{v.tag}</p>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <p className="font-mono" style={{
                fontSize: 28,
                fontWeight: 700,
                color: v.stock_remaining <= 3 ? '#e57373' : 'var(--accent)',
                lineHeight: 1,
              }}>{v.stock_remaining}</p>
              <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1, marginTop: 2 }}>remaining</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
