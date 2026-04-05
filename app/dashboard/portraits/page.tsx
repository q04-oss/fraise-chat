'use client';
import { useEffect, useState } from 'react';
import { fetchAdminBusinesses, fetchPortraits, createPortrait, updatePortrait, deletePortrait } from '@/lib/api';

export default function PortraitsPage() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedBiz, setSelectedBiz] = useState('');
  const [portraits, setPortraits] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ image_url: '', subject_name: '', season: '', campaign_title: '', sort_order: '0' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchAdminBusinesses()
      .then(setBusinesses)
      .catch((err: any) => setError(err.message));
  }, []);

  async function load() {
    if (!selectedBiz) return;
    setLoading(true);
    try {
      const data = await fetchPortraits(Number(selectedBiz));
      setPortraits(data);
      setLoaded(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.image_url || !selectedBiz) return;
    setCreating(true);
    try {
      const created = await createPortrait({
        business_id: Number(selectedBiz),
        image_url: form.image_url,
        subject_name: form.subject_name || undefined,
        season: form.season || undefined,
        campaign_title: form.campaign_title || undefined,
        sort_order: Number(form.sort_order),
      });
      setPortraits(prev => [...prev, created].sort((a, b) => a.sort_order - b.sort_order));
      setForm({ image_url: '', subject_name: '', season: '', campaign_title: '', sort_order: '0' });
      setAdding(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const other = index + dir;
    if (other < 0 || other >= portraits.length) return;
    const a = portraits[index];
    const b = portraits[other];
    try {
      await Promise.all([
        updatePortrait(a.id, { sort_order: b.sort_order }),
        updatePortrait(b.id, { sort_order: a.sort_order }),
      ]);
      const updated = [...portraits];
      updated[index] = { ...a, sort_order: b.sort_order };
      updated[other] = { ...b, sort_order: a.sort_order };
      setPortraits(updated.sort((x, y) => x.sort_order - y.sort_order));
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function remove(id: number) {
    if (!confirm('Delete this portrait?')) return;
    try {
      await deletePortrait(id);
      setPortraits(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div style={{ padding: 32, maxWidth: 820 }}>
      <p className="font-serif" style={{ fontSize: 22, color: 'var(--text)', marginBottom: 24 }}>Portraits</p>
      {error && <p className="font-mono" style={{ fontSize: 11, color: '#e57373', marginBottom: 16 }}>{error}</p>}

      {/* Business selector */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, alignItems: 'flex-end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>BUSINESS</span>
          <select
            value={selectedBiz}
            onChange={e => { setSelectedBiz(e.target.value); setLoaded(false); setPortraits([]); }}
            className="font-mono"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)' }}
          >
            <option value="">— select —</option>
            {businesses.map(b => <option key={b.id} value={b.id}>{b.name} ({b.location_type ?? b.type})</option>)}
          </select>
        </label>
        <button onClick={load} disabled={!selectedBiz || loading} className="font-mono" style={{ fontSize: 10, letterSpacing: 1, padding: '8px 16px', background: 'none', color: 'var(--accent)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>
          {loading ? 'loading…' : 'load'}
        </button>
        {loaded && (
          <button onClick={() => setAdding(v => !v)} className="font-mono" style={{ fontSize: 10, letterSpacing: 1, padding: '8px 16px', background: 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            {adding ? 'cancel' : '+ add'}
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1.5, marginBottom: 16 }}>NEW PORTRAIT</p>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { key: 'image_url', label: 'IMAGE URL', col: '1 / -1', required: true },
              { key: 'subject_name', label: 'SUBJECT NAME' },
              { key: 'season', label: 'SEASON' },
              { key: 'campaign_title', label: 'CAMPAIGN TITLE' },
              { key: 'sort_order', label: 'SORT ORDER', type: 'number' },
            ].map(f => (
              <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: f.col }}>
                <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>{f.label}</span>
                <input
                  type={f.type ?? 'text'}
                  required={f.required}
                  value={(form as any)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="font-mono"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)' }}
                />
              </label>
            ))}
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={creating} className="font-mono" style={{ fontSize: 11, padding: '8px 20px', background: 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                {creating ? 'adding…' : 'add portrait'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Portrait list */}
      {loaded && portraits.length === 0 && (
        <p className="font-serif" style={{ fontSize: 15, color: 'var(--muted)', fontStyle: 'italic' }}>no portraits for this business</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {portraits.map((p, i) => (
          <div key={p.id} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Thumbnail */}
            {p.image_url && (
              <img src={p.image_url} alt={p.subject_name ?? ''} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="font-mono" style={{ fontSize: 12, color: 'var(--text)' }}>{p.subject_name ?? '—'}</p>
              <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                {[p.season, p.campaign_title].filter(Boolean).join(' · ')}
              </p>
              <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.image_url}</p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => move(i, -1)} disabled={i === 0} className="font-mono" style={{ fontSize: 12, padding: '4px 10px', background: 'none', color: i === 0 ? 'var(--border)' : 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, cursor: i === 0 ? 'default' : 'pointer' }}>↑</button>
              <button onClick={() => move(i, 1)} disabled={i === portraits.length - 1} className="font-mono" style={{ fontSize: 12, padding: '4px 10px', background: 'none', color: i === portraits.length - 1 ? 'var(--border)' : 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, cursor: i === portraits.length - 1 ? 'default' : 'pointer' }}>↓</button>
              <button onClick={() => remove(p.id)} className="font-mono" style={{ fontSize: 10, padding: '4px 10px', background: 'none', color: '#e57373', border: '1px solid #e57373', borderRadius: 6, cursor: 'pointer' }}>remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
