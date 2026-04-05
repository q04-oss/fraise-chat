'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://maison-fraise-fund-production.up.railway.app';

function fmtCAD(cents: number) {
  return `CA$${(cents / 100).toLocaleString('en-CA', { minimumFractionDigits: 2 })}`;
}

function fmtDate(iso: string) {
  return iso ? new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

function daysLeft(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now();
  const d = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return d <= 0 ? 'expired' : d === 1 ? '1 day left' : `${d} days left`;
}

const STATUS_LABEL: Record<string, string> = {
  open: 'open',
  funded: 'funded — awaiting response',
  expired: 'expired',
  cancelled: 'declined',
};

export default function CollectifPublicPage() {
  const { id } = useParams<{ id: string }>();
  const [collectif, setCollectif] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/collectifs/${id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setCollectif)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={{ color: 'var(--muted)', fontFamily: 'DM Mono, monospace', fontSize: 12, letterSpacing: 1 }}>loading…</div>
      </div>
    );
  }

  if (notFound || !collectif) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <p className="font-mono" style={{ color: 'var(--muted)', fontSize: 12 }}>collectif not found</p>
        </div>
      </div>
    );
  }

  const progress = collectif.target_quantity > 0
    ? Math.min(1, collectif.current_quantity / collectif.target_quantity)
    : 0;
  const isOpen = collectif.status === 'open';

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <p className="font-mono" style={{ fontSize: 9, letterSpacing: 2, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 6 }}>
            Maison Fraise — Collectif
          </p>
          <p className="font-mono" style={{ fontSize: 10, letterSpacing: 1.5, color: isOpen ? 'var(--accent)' : 'var(--muted)', textTransform: 'uppercase', marginBottom: 14 }}>
            {STATUS_LABEL[collectif.status] ?? collectif.status}
          </p>
          {collectif.business_response === 'accepted' && (
            <p className="font-mono" style={{ fontSize: 11, color: '#4caf50', marginBottom: 10 }}>
              Business accepted — fulfillment in progress.
            </p>
          )}
          <p className="font-serif" style={{ fontSize: 26, lineHeight: 1.3, color: 'var(--text)', marginBottom: 6 }}>
            {collectif.title}
          </p>
          <p className="font-mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 0.5 }}>
            {collectif.business_name}
          </p>
        </div>

        {/* Description */}
        {collectif.description && (
          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--muted)', marginBottom: 24 }}>
            {collectif.description}
          </p>
        )}

        {/* Stats */}
        <div style={styles.statsRow}>
          {[
            { label: 'DISCOUNT', value: `${collectif.proposed_discount_pct}%` },
            { label: 'PRICE/UNIT', value: fmtCAD(collectif.price_cents) },
            { label: 'DEADLINE', value: fmtDate(collectif.deadline) },
          ].map(s => (
            <div key={s.label} style={styles.stat}>
              <p className="font-mono" style={{ fontSize: 8, letterSpacing: 1.5, color: 'var(--muted)' }}>{s.label}</p>
              <p className="font-mono" style={{ fontSize: 14, color: 'var(--text)', marginTop: 4 }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ height: '100%', borderRadius: 3, width: `${progress * 100}%`, background: isOpen ? 'var(--accent)' : '#4caf50', transition: 'width 0.3s ease' }} />
          </div>
          <p className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
            {collectif.current_quantity} of {collectif.target_quantity} committed
            {isOpen && ` · ${daysLeft(collectif.deadline)}`}
          </p>
        </div>

        {/* Attribution */}
        <p className="font-serif-i" style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 32 }}>
          Proposed by {collectif.creator_display_name ?? 'a member'}
        </p>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border)', marginBottom: 28 }} />

        {/* CTA */}
        <div style={{ textAlign: 'center' }}>
          <p className="font-serif" style={{ fontSize: 20, color: 'var(--text)', marginBottom: 8 }}>
            Maison Fraise
          </p>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 20 }}>
            Join the collectif and commit to this purchase through the app.
          </p>
          <a
            href="https://apps.apple.com/ca/app/maison-fraise/id6743811503"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.ctaBtn}
          >
            <span className="font-mono" style={{ fontSize: 11, letterSpacing: 1 }}>Download on the App Store →</span>
          </a>
          <p className="font-mono" style={{ fontSize: 9, letterSpacing: 1, color: 'var(--muted)', marginTop: 14 }}>
            fraise.chat
          </p>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg)',
    padding: '24px 16px',
  },
  card: {
    width: '100%',
    maxWidth: 480,
    background: 'var(--panel)',
    borderRadius: 16,
    padding: '32px 28px',
    border: '1px solid var(--border)',
  },
  statsRow: {
    display: 'flex',
    border: '1px solid var(--border)',
    borderRadius: 10,
    marginBottom: 20,
    overflow: 'hidden',
  },
  stat: {
    flex: 1,
    padding: '14px 10px',
    textAlign: 'center',
    borderRight: '1px solid var(--border)',
  },
  ctaBtn: {
    display: 'inline-block',
    padding: '12px 28px',
    background: 'var(--accent)',
    color: '#fff',
    borderRadius: 24,
    textDecoration: 'none',
    cursor: 'pointer',
  },
};
