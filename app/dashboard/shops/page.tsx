'use client';
import { useEffect, useState } from 'react';
import { fetchAdminBusinesses, createBusiness, updateBusiness, fetchLocationFunding } from '@/lib/api';

const LOCATION_TYPES = ['house_chocolate', 'collab_chocolate'];
const TYPE_LABEL: Record<string, string> = { house_chocolate: 'house', collab_chocolate: 'collab' };

function fmtCAD(cents: number) {
  return `CA$${(cents / 100).toLocaleString('en-CA', { minimumFractionDigits: 2 })}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA');
}

export default function ShopsPage() {
  const [shops, setShops] = useState<any[]>([]);
  const [funding, setFunding] = useState<any[]>([]);
  const [fundingLoaded, setFundingLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fundingLoading, setFundingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const emptyForm = { name: '', address: '', location_type: 'house_chocolate', partner_name: '', operating_cost_cents: '' };
  const [createForm, setCreateForm] = useState({ ...emptyForm });
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAdminBusinesses()
      .then(data => setShops(data.filter((b: any) => b.location_type === 'house_chocolate' || b.location_type === 'collab_chocolate')))
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.name || !createForm.address) return;
    setCreating(true);
    try {
      const payload: any = {
        name: createForm.name,
        address: createForm.address,
        location_type: createForm.location_type,
        approved_by_admin: true,
      };
      if (createForm.partner_name) payload.partner_name = createForm.partner_name;
      if (createForm.operating_cost_cents) payload.operating_cost_cents = Math.round(parseFloat(createForm.operating_cost_cents) * 100);
      const newShop = await createBusiness(payload);
      setShops(prev => [newShop, ...prev]);
      setCreateForm({ ...emptyForm });
      setShowCreate(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  function startEdit(shop: any) {
    setEditingId(shop.id);
    setEditForm({
      name: shop.name ?? '',
      address: shop.address ?? '',
      location_type: shop.location_type ?? 'house_chocolate',
      partner_name: shop.partner_name ?? '',
      operating_cost_cents: shop.operating_cost_cents ? (shop.operating_cost_cents / 100).toString() : '',
    });
  }

  async function handleSave(id: number) {
    setSaving(true);
    try {
      const payload: any = {
        name: editForm.name,
        address: editForm.address,
        location_type: editForm.location_type,
      };
      if (editForm.partner_name) payload.partner_name = editForm.partner_name;
      if (editForm.operating_cost_cents) payload.operating_cost_cents = Math.round(parseFloat(editForm.operating_cost_cents) * 100);
      const updated = await updateBusiness(id, payload);
      setShops(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
      setEditingId(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function loadFunding() {
    setFundingLoading(true);
    try {
      const data = await fetchLocationFunding();
      setFunding(data);
      setFundingLoaded(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFundingLoading(false);
    }
  }

  const house = shops.filter(s => s.location_type === 'house_chocolate');
  const collab = shops.filter(s => s.location_type === 'collab_chocolate');
  const inaugurated = shops.filter(s => s.inaugurated_at);

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <p className="font-serif" style={{ fontSize: 22, color: 'var(--text)' }}>Chocolate Shops</p>
        <button
          onClick={() => setShowCreate(v => !v)}
          className="font-mono"
          style={{ fontSize: 10, letterSpacing: 1, padding: '7px 16px', background: 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: 8, cursor: 'pointer' }}
        >
          {showCreate ? 'cancel' : '+ new location'}
        </button>
      </div>

      {error && <p className="font-mono" style={{ fontSize: 11, color: '#e57373', marginBottom: 16 }}>{error}</p>}

      {/* Summary */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'total', value: shops.length },
          { label: 'inaugurated', value: inaugurated.length },
          { label: 'house', value: house.length },
          { label: 'collab', value: collab.length },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 20px', textAlign: 'center' }}>
            <p className="font-mono" style={{ fontSize: 20, color: 'var(--text)' }}>{s.value}</p>
            <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1, marginTop: 2 }}>{s.label.toUpperCase()}</p>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1.5, marginBottom: 16 }}>NEW LOCATION</p>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { key: 'name', label: 'NAME', col: '1 / -1' },
              { key: 'address', label: 'ADDRESS', col: '1 / -1' },
              { key: 'partner_name', label: 'PARTNER NAME' },
              { key: 'operating_cost_cents', label: 'OPERATING COST (CA$)' },
            ].map(f => (
              <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: f.col }}>
                <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>{f.label}</span>
                <input
                  type={f.key === 'operating_cost_cents' ? 'number' : 'text'}
                  value={(createForm as any)[f.key]}
                  onChange={e => setCreateForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="font-mono"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)' }}
                />
              </label>
            ))}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>TYPE</span>
              <select
                value={createForm.location_type}
                onChange={e => setCreateForm(p => ({ ...p, location_type: e.target.value }))}
                className="font-mono"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)' }}
              >
                {LOCATION_TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
              </select>
            </label>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={creating} className="font-mono" style={{ fontSize: 11, letterSpacing: 1, padding: '8px 20px', background: 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                {creating ? 'creating…' : 'create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && <p className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>loading…</p>}

      {/* Shop list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
        {shops.map(s => (
          <div key={s.id} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
            {editingId === s.id ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { key: 'name', label: 'NAME', col: '1 / -1' },
                  { key: 'address', label: 'ADDRESS', col: '1 / -1' },
                  { key: 'partner_name', label: 'PARTNER NAME' },
                  { key: 'operating_cost_cents', label: 'OPERATING COST (CA$)' },
                ].map(f => (
                  <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: f.col }}>
                    <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>{f.label}</span>
                    <input
                      type={f.key === 'operating_cost_cents' ? 'number' : 'text'}
                      value={editForm[f.key] ?? ''}
                      onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="font-mono"
                      style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)' }}
                    />
                  </label>
                ))}
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>TYPE</span>
                  <select
                    value={editForm.location_type}
                    onChange={e => setEditForm(p => ({ ...p, location_type: e.target.value }))}
                    className="font-mono"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)' }}
                  >
                    {LOCATION_TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                  </select>
                </label>
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button onClick={() => setEditingId(null)} className="font-mono" style={{ fontSize: 10, padding: '6px 14px', background: 'none', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>cancel</button>
                  <button onClick={() => handleSave(s.id)} disabled={saving} className="font-mono" style={{ fontSize: 10, padding: '6px 14px', background: 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                    {saving ? 'saving…' : 'save'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <p className="font-serif" style={{ fontSize: 16, color: 'var(--text)' }}>{s.name}</p>
                    <span className="font-mono" style={{
                      fontSize: 9, letterSpacing: 1, padding: '2px 8px', borderRadius: 20,
                      background: s.location_type === 'house_chocolate' ? 'rgba(201,151,58,0.15)' : 'rgba(100,100,255,0.1)',
                      color: s.location_type === 'house_chocolate' ? 'var(--accent)' : '#aab',
                    }}>{TYPE_LABEL[s.location_type] ?? s.location_type}</span>
                    {s.inaugurated_at && <span className="font-mono" style={{ fontSize: 9, color: '#4caf50', letterSpacing: 1 }}>inaugurated</span>}
                  </div>
                  <p className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{s.address}</p>
                  {s.partner_name && <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>partner: {s.partner_name}</p>}
                  {s.operating_cost_cents && <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>operating cost: {fmtCAD(s.operating_cost_cents)}</p>}
                  {s.founding_patron_name && (
                    <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                      patron: {s.founding_patron_name}
                      {s.founding_term_ends_at ? ` · term ends ${fmtDate(s.founding_term_ends_at)}` : ''}
                    </p>
                  )}
                </div>
                <button onClick={() => startEdit(s)} className="font-mono" style={{ fontSize: 10, padding: '6px 14px', background: 'none', color: 'var(--accent)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>edit</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Location funding */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1.5 }}>FUNDING RECORDS</p>
          {!fundingLoaded && (
            <button onClick={loadFunding} disabled={fundingLoading} className="font-mono" style={{ fontSize: 10, padding: '6px 14px', background: 'none', color: 'var(--accent)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>
              {fundingLoading ? 'loading…' : 'load records'}
            </button>
          )}
        </div>
        {fundingLoaded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {funding.length === 0 && <p className="font-serif" style={{ fontSize: 14, color: 'var(--muted)', fontStyle: 'italic' }}>no funding records</p>}
            {funding.map(f => (
              <div key={f.id} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p className="font-mono" style={{ fontSize: 12, color: 'var(--text)' }}>{f.business_name}</p>
                  <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{f.user_display_name ?? f.user_email}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p className="font-mono" style={{ fontSize: 13, color: 'var(--accent)' }}>{fmtCAD(f.amount_cents)}</p>
                  <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>{f.status} · {fmtDate(f.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
