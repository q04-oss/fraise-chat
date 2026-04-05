'use client';
import { useEffect, useState } from 'react';
import { fetchAdminVarieties, fetchAdminLocations, updateVariety, updateVarietyStock, updateVarietySortOrder } from '@/lib/api';

const CHOC: Record<string, string> = {
  guanaja_70: 'Guanaja 70%',
  caraibe_66: 'Caraïbe 66%',
  jivara_40: 'Jivara 40%',
  ivoire_blanc: 'Ivoire Blanc',
};

export default function VarietiesPage() {
  const [varieties, setVarieties] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [edits, setEdits] = useState<Record<number, any>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [saved, setSaved] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchAdminVarieties(), fetchAdminLocations()])
      .then(([v, l]) => {
        setVarieties(v);
        setLocations(l);
        const initial: Record<number, any> = {};
        v.forEach((item: any) => {
          initial[item.id] = {
            stock_remaining: item.stock_remaining,
            sort_order: item.sort_order ?? 0,
            description: item.description ?? '',
            image_url: item.image_url ?? '',
            location_id: item.location_id ?? '',
            active: item.active,
          };
        });
        setEdits(initial);
        setVarieties([...v].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
      })
      .catch(() => setError('Failed to load varieties'));
  }, []);

  function patch(id: number, key: string, value: any) {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } }));
  }

  async function save(id: number) {
    setSaving(prev => ({ ...prev, [id]: true }));
    try {
      const e = edits[id];
      const original = varieties.find(v => v.id === id);
      const calls: Promise<any>[] = [
        updateVariety(id, {
          description: e.description || undefined,
          image_url: e.image_url || undefined,
          location_id: e.location_id ? Number(e.location_id) : undefined,
          active: e.active,
        }),
        updateVarietyStock(id, Number(e.stock_remaining)),
      ];
      if (original && Number(e.sort_order) !== (original.sort_order ?? 0)) {
        calls.push(updateVarietySortOrder(id, Number(e.sort_order)));
      }
      await Promise.all(calls);
      setSaved(prev => ({ ...prev, [id]: true }));
      setTimeout(() => setSaved(prev => ({ ...prev, [id]: false })), 1500);
      setVarieties(prev => prev.map(v => v.id === id ? { ...v, ...e } : v));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(prev => ({ ...prev, [id]: false }));
    }
  }

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <p className="font-serif" style={{ fontSize: 22, color: 'var(--text)', marginBottom: 24 }}>Varieties</p>
      {error && <p className="font-mono" style={{ fontSize: 11, color: '#e57373', marginBottom: 16 }}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {varieties.map(v => {
          const e = edits[v.id] ?? {};
          return (
            <div key={v.id} style={{
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 20,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <p className="font-serif" style={{ fontSize: 16, color: 'var(--text)' }}>{v.name}</p>
                  <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                    CA${(v.price_cents / 100).toFixed(2)} · id {v.id}
                    {v.avg_rating ? ` · ★ ${Number(v.avg_rating).toFixed(1)} (${v.rating_count})` : ''}
                  </p>
                </div>
                <select
                  value={e.active ? 'true' : 'false'}
                  onChange={ev => patch(v.id, 'active', ev.target.value === 'true')}
                  className="font-mono"
                  style={{
                    fontSize: 10, letterSpacing: 1,
                    background: e.active ? 'rgba(76,175,80,0.1)' : 'rgba(229,115,115,0.1)',
                    color: e.active ? '#4caf50' : '#e57373',
                    border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px',
                  }}
                >
                  <option value="true">active</option>
                  <option value="false">inactive</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>STOCK</span>
                  <input
                    type="number" min={0}
                    value={e.stock_remaining ?? ''}
                    onChange={ev => patch(v.id, 'stock_remaining', ev.target.value)}
                    className="font-mono"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 13, color: 'var(--text)' }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>SORT ORDER</span>
                  <input
                    type="number" min={0}
                    value={e.sort_order ?? 0}
                    onChange={ev => patch(v.id, 'sort_order', ev.target.value)}
                    className="font-mono"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 13, color: 'var(--text)' }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>LOCATION</span>
                  <select
                    value={e.location_id ?? ''}
                    onChange={ev => patch(v.id, 'location_id', ev.target.value)}
                    className="font-mono"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)' }}
                  >
                    <option value="">— none —</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: '1 / -1' }}>
                  <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>IMAGE URL</span>
                  <input
                    type="text"
                    value={e.image_url ?? ''}
                    onChange={ev => patch(v.id, 'image_url', ev.target.value)}
                    className="font-mono"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)' }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: '1 / -1' }}>
                  <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>DESCRIPTION</span>
                  <textarea
                    rows={2}
                    value={e.description ?? ''}
                    onChange={ev => patch(v.id, 'description', ev.target.value)}
                    className="font-mono"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)', resize: 'vertical' }}
                  />
                </label>
              </div>

              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => save(v.id)}
                  disabled={saving[v.id]}
                  className="font-mono"
                  style={{
                    fontSize: 11, letterSpacing: 1,
                    padding: '8px 20px',
                    background: saved[v.id] ? 'rgba(76,175,80,0.15)' : 'var(--accent)',
                    color: saved[v.id] ? '#4caf50' : 'var(--bg)',
                    border: 'none', borderRadius: 8, cursor: 'pointer',
                  }}
                >
                  {saving[v.id] ? 'saving…' : saved[v.id] ? 'saved ✓' : 'save'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
