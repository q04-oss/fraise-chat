'use client';
import { useEffect, useState } from 'react';
import { fetchBeacons, fetchBusinesses, registerBeacon, deactivateBeacon } from '@/lib/api';

export default function BeaconsPage() {
  const [beacons, setBeacons] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [uuid, setUuid] = useState('');
  const [major, setMajor] = useState('1');
  const [minor, setMinor] = useState('1');
  const [name, setName] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([fetchBeacons(), fetchBusinesses()])
      .then(([b, biz]) => { setBeacons(b); setBusinesses(biz); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uuid.trim() || !businessId) return;
    setSaving(true);
    try {
      await registerBeacon({
        business_id: parseInt(businessId),
        uuid: uuid.trim().toUpperCase(),
        major: parseInt(major) || 1,
        minor: parseInt(minor) || 1,
        name: name.trim() || undefined,
      });
      setUuid(''); setMajor('1'); setMinor('1'); setName(''); setBusinessId('');
      load();
    } catch (e: any) {
      alert(e.message ?? 'failed to register beacon');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    if (!confirm('Deactivate this beacon?')) return;
    try {
      await deactivateBeacon(id);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div style={{ padding: '32px 40px', maxWidth: 640 }}>
      <p className="font-mono" style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 32 }}>beacons</p>

      {/* Active beacons */}
      {loading
        ? <p className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>loading...</p>
        : beacons.length === 0
          ? <p className="font-serif-i" style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 32 }}>no beacons registered</p>
          : (
            <div style={{ marginBottom: 40 }}>
              {beacons.map(b => (
                <div key={b.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <p className="font-serif" style={{ fontSize: 15, color: 'var(--text)' }}>{b.business_name ?? `business ${b.business_id}`}</p>
                    <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 0.5 }}>{b.uuid}</p>
                    <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>major {b.major}  ·  minor {b.minor}{b.name ? `  ·  ${b.name}` : ''}</p>
                  </div>
                  <button
                    onClick={() => handleDeactivate(b.id)}
                    className="font-mono"
                    style={{ fontSize: 10, color: 'var(--muted)', background: 'none', border: '1px solid var(--border)', borderRadius: 16, padding: '5px 12px', cursor: 'pointer' }}
                  >remove</button>
                </div>
              ))}
            </div>
          )
      }

      {/* Register form */}
      <p className="font-mono" style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 16 }}>register beacon</p>
      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="font-mono" style={{ fontSize: 9, letterSpacing: 1, color: 'var(--muted)' }}>location</label>
          <select
            value={businessId}
            onChange={e => setBusinessId(e.target.value)}
            style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', background: 'var(--panel)', color: 'var(--text)', outline: 'none' }}
          >
            <option value="">select...</option>
            {businesses.filter(b => b.type === 'collection' || b.type === 'popup').map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="font-mono" style={{ fontSize: 9, letterSpacing: 1, color: 'var(--muted)' }}>uuid</label>
          <input
            value={uuid}
            onChange={e => setUuid(e.target.value)}
            placeholder="e.g. B9407F30-F5F8-466E-AFF9-25556B57FE6D"
            style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', background: 'var(--panel)', color: 'var(--text)', outline: 'none', fontFamily: 'DM Mono', fontSize: 12 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="font-mono" style={{ fontSize: 9, letterSpacing: 1, color: 'var(--muted)' }}>major</label>
            <input value={major} onChange={e => setMajor(e.target.value)} type="number" style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', background: 'var(--panel)', color: 'var(--text)', outline: 'none' }} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="font-mono" style={{ fontSize: 9, letterSpacing: 1, color: 'var(--muted)' }}>minor</label>
            <input value={minor} onChange={e => setMinor(e.target.value)} type="number" style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', background: 'var(--panel)', color: 'var(--text)', outline: 'none' }} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="font-mono" style={{ fontSize: 9, letterSpacing: 1, color: 'var(--muted)' }}>name (optional)</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Atwater entrance"
            style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', background: 'var(--panel)', color: 'var(--text)', outline: 'none' }}
          />
        </div>

        <button
          type="submit"
          disabled={!uuid.trim() || !businessId || saving}
          className="font-mono"
          style={{
            border: '1px solid var(--accent)', borderRadius: 24, padding: '10px 0',
            color: 'var(--accent)', background: 'transparent', cursor: 'pointer',
            opacity: uuid.trim() && businessId ? 1 : 0.4, fontSize: 11, letterSpacing: 1, marginTop: 8,
          }}
        >{saving ? '...' : 'register →'}</button>
      </form>
    </div>
  );
}
