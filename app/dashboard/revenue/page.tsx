'use client';
import { useEffect, useState } from 'react';
import { fetchRevenueSummary, fetchDailyRevenue, fetchReferrals, exportCustomers } from '@/lib/api';

function fmtCAD(cents: number) {
  return `CA$${(cents / 100).toLocaleString('en-CA', { minimumFractionDigits: 2 })}`;
}

export default function RevenuePage() {
  const [summary, setSummary] = useState<any>(null);
  const [daily, setDaily] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchRevenueSummary(), fetchDailyRevenue(14), fetchReferrals()])
      .then(([s, d, r]) => { setSummary(s); setDaily(d); setReferrals(r); })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await exportCustomers();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'customers.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  }

  const maxOrders = daily.length ? Math.max(...daily.map(d => d.order_count ?? 0), 1) : 1;

  return (
    <div style={{ padding: 32, maxWidth: 860 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <p className="font-serif" style={{ fontSize: 22, color: 'var(--text)' }}>Revenue</p>
        <button onClick={handleExport} disabled={exporting} className="font-mono" style={{ fontSize: 10, letterSpacing: 1, padding: '7px 16px', background: 'none', color: 'var(--accent)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>
          {exporting ? 'exporting…' : '↓ export customers'}
        </button>
      </div>

      {error && <p className="font-mono" style={{ fontSize: 11, color: '#e57373', marginBottom: 16 }}>{error}</p>}
      {loading && <p className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>loading…</p>}

      {!loading && summary && (
        <>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
            {[
              { label: 'ORDER REVENUE', value: fmtCAD(summary.orders?.total_cents ?? 0), sub: `${summary.orders?.count ?? 0} orders` },
              { label: 'MEMBERSHIP REVENUE', value: fmtCAD(summary.memberships?.total_cents ?? 0) },
              { label: 'MEMBER FUND TOTAL', value: fmtCAD(summary.member_fund?.total_cents ?? 0) },
              { label: 'PAID RSVPs', value: summary.rsvps?.paid_count ?? 0 },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
                <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1.5, marginBottom: 8 }}>{s.label}</p>
                <p className="font-mono" style={{ fontSize: 18, color: 'var(--text)' }}>{s.value}</p>
                {s.sub && <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', marginTop: 3 }}>{s.sub}</p>}
              </div>
            ))}
          </div>

          {/* Daily chart */}
          {daily.length > 0 && (
            <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
              <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1.5, marginBottom: 16 }}>14-DAY ORDERS</p>
              <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 80 }}>
                {daily.map(d => {
                  const count = d.order_count ?? 0;
                  const h = maxOrders > 0 ? Math.max(4, (count / maxOrders) * 72) : 4;
                  const dayLabel = new Date(d.date).toLocaleDateString('en-CA', { weekday: 'short' });
                  return (
                    <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <p className="font-mono" style={{ fontSize: 8, color: count > 0 ? 'var(--accent)' : 'var(--muted)' }}>{count > 0 ? count : ''}</p>
                      <div style={{ width: '100%', height: h, background: count > 0 ? 'var(--accent)' : 'var(--border)', borderRadius: 3 }} title={`${d.date}: ${count} orders`} />
                      <p className="font-mono" style={{ fontSize: 8, color: 'var(--muted)' }}>{dayLabel}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Referrals */}
          {referrals.length > 0 && (
            <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
              <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1.5, marginBottom: 14 }}>REFERRALS</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {referrals.map(r => (
                  <div key={r.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p className="font-mono" style={{ fontSize: 12, color: 'var(--text)' }}>{r.display_name ?? r.user_email}</p>
                      <p className="font-mono" style={{ fontSize: 9, color: 'var(--accent)', letterSpacing: 2 }}>{r.code}</p>
                    </div>
                    <p className="font-mono" style={{ fontSize: 13, color: 'var(--text)' }}>{r.uses} uses</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
