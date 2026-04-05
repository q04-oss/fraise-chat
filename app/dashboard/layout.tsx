'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getSession, clearSession } from '@/lib/auth';
import Link from 'next/link';

const NAV = [
  { href: '/dashboard', label: 'inbox' },
  { href: '/dashboard/offer', label: 'send offer' },
  { href: '/dashboard/orders', label: 'orders' },
  { href: '/dashboard/varieties', label: 'varieties' },
  { href: '/dashboard/slots', label: 'slots' },
  { href: '/dashboard/beacons', label: 'beacons' },
  { href: '/dashboard/jobs', label: 'jobs' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session) { router.replace('/'); return; }
    setDisplayName(session.display_name);
  }, []);

  const handleSignOut = () => {
    clearSession();
    router.replace('/');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 200,
        background: 'var(--panel)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '32px 0',
        flexShrink: 0,
      }}>
        <div style={{ padding: '0 24px', marginBottom: 32 }}>
          <p className="font-serif" style={{ fontSize: 18, color: 'var(--text)' }}>Maison Fraise</p>
          <p className="font-mono" style={{ fontSize: 9, color: 'var(--accent)', letterSpacing: 2, marginTop: 4 }}>fraise.chat</p>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {NAV.map(item => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className="font-mono"
                style={{
                  padding: '10px 24px',
                  fontSize: 11,
                  letterSpacing: 1,
                  color: active ? 'var(--accent)' : 'var(--muted)',
                  background: active ? 'rgba(201,151,58,0.07)' : 'transparent',
                  borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '0 24px' }}>
          {displayName && (
            <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 8 }}>{displayName}</p>
          )}
          <button
            onClick={handleSignOut}
            className="font-mono"
            style={{ fontSize: 10, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, letterSpacing: 0.5 }}
          >
            sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
}
