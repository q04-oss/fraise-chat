'use client';
import { useEffect, useState } from 'react';
import { fetchAdminGreenhouses, createGreenhouse, updateGreenhouse, fetchProvenanceTokens, setProvenanceNfc } from '@/lib/api';

function fmtCAD(cents: number) {
  return `CA$${(cents / 100).toLocaleString('en-CA', { minimumFractionDigits: 2 })}`;
}

const STATUS_OPTIONS = ['active', 'funded', 'closed'];

export default function GreenhousesPage() {
  const [greenhouses, setGreenhouses] = useState<any[]>([]);
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'greenhouses' | 'tokens'>('greenhouses');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', location: '', description: '', funding_goal_cents: '' });
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [nfcEditId, setNfcEditId] = useState<number | null>(null);
  const [nfcValue, setNfcValue] = useState('');
  const [savingNfc, setSavingNfc] = useState(false);

  useEffect(() => {
    Promise.all([fetchAdminGreenhouses(), fetchProvenanceTokens()])
      .then(([g, t]) => { setGreenhouses(g); setTokens(t); })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    const goal = Math.round(parseFloat(createForm.funding_goal_cents) * 100);
    if (!createForm.name.trim() || !createForm.location.trim() || !goal) return;
    setCreating(true);
    try {
      const created = await createGreenhouse({
        name: createForm.name.trim(),
        location: createForm.location.trim(),
        description: createForm.description.trim() || undefined,
        funding_goal_cents: goal,
      });
      setGreenhouses(prev => [created, ...prev]);
      setShowCreate(false);
      setCreateForm({ name: '', location: '', description: '', funding_goal_cents: '' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleSave(id: number) {
    setSaving(true);
    try {
      const payload: any = { ...editForm };
      if (payload.funding_goal_str) {
        payload.funding_goal_cents = Math.round(parseFloat(payload.funding_goal_str) * 100);
        delete payload.funding_goal_str;
      }
      const updated = await updateGreenhouse(id, payload);
      setGreenhouses(prev => prev.map(g => g.id === id ? { ...g, ...updated } : g));
      setEditingId(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSetNfc(id: number) {
    if (!nfcValue.trim()) return;
    setSavingNfc(true);
    try {
      await setProvenanceNfc(id, nfcValue.trim().toUpperCase());
      setTokens(prev => prev.map(t => t.id === id ? { ...t, nfc_token: nfcValue.trim().toUpperCase() } : t));
      setNfcEditId(null);
      setNfcValue('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingNfc(false);
    }
  }

  const pendingNfc = tokens.filter(t => !t.nfc_token).length;

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <p className="font-serif" style={{ fontSize: 22, color: 'var(--text)' }}>Greenhouses</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['greenhouses', 'tokens'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className="font-mono" style={{ fontSize: 10, letterSpacing: 1, padding: '6px 14px', background: tab === t ? 'var(--accent)' : 'none', color: tab === t ? 'var(--bg)' : 'var(--muted)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>{t}</button>
          ))}
        </div>
      </div>

      {error && <p className="font-mono" style={{ fontSize: 11, color: '#e57373', marginBottom: 16 }}>{error}</p>}
      {loading && <p className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>loading…</p>}

      {!loading && tab === 'greenhouses' && (
        <>
          <div style={{ marginBottom: 20 }}>
            {!showCreate ? (
              <button onClick={() => setShowCreate(true)} className="font-mono" style={{ fontSize: 10, letterSpacing: 1, padding: '7px 16px', background: 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: 8, cursor: 'pointer' }}>+ new greenhouse</button>
            ) : (
              <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, marginBottom: 16 }}>
                <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1.5, marginBottom: 14 }}>NEW GREENHOUSE</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'NAME', key: 'name', type: 'text' },
                    { label: 'LOCATION', key: 'location', type: 'text' },
                    { label: 'FUNDING GOAL (CA$)', key: 'funding_goal_cents', type: 'number' },
                  ].map(f => (
                    <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>{f.label}</span>
                      <input
                        type={f.type}
                        value={(createForm as any)[f.key]}
                        onChange={e => setCreateForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        className="font-mono"
                        style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)' }}
                      />
                    </label>
                  ))}
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: '1 / -1' }}>
                    <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>DESCRIPTION</span>
                    <textarea
                      rows={2}
                      value={createForm.description}
                      onChange={e => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                      className="font-mono"
                      style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)', resize: 'vertical' }}
                    />
                  </label>
                  <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowCreate(false)} className="font-mono" style={{ fontSize: 10, padding: '6px 14px', background: 'none', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>cancel</button>
                    <button onClick={handleCreate} disabled={creating} className="font-mono" style={{ fontSize: 10, padding: '6px 14px', background: 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: 8, cursor: 'pointer' }}>{creating ? 'creating…' : 'create'}</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {greenhouses.length === 0 && <p className="font-serif" style={{ fontSize: 15, color: 'var(--muted)', fontStyle: 'italic' }}>no greenhouses</p>}
            {greenhouses.map(g => {
              const progress = g.funding_goal_cents > 0 ? Math.min(1, (g.funded_cents ?? 0) / g.funding_goal_cents) : 0;
              return (
                <div key={g.id} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
                  {editingId !== g.id ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <p className="font-serif" style={{ fontSize: 16, color: 'var(--text)' }}>{g.name}</p>
                            <span className="font-mono" style={{ fontSize: 9, letterSpacing: 1, color: g.status === 'funded' ? '#4caf50' : g.status === 'closed' ? '#888' : 'var(--accent)' }}>{g.status}</span>
                          </div>
                          <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{g.location}</p>
                          {g.description && <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>{g.description}</p>}
                        </div>
                        <button
                          onClick={() => { setEditingId(g.id); setEditForm({ name: g.name, location: g.location, description: g.description ?? '', funding_goal_str: g.funding_goal_cents ? String(g.funding_goal_cents / 100) : '', status: g.status }); }}
                          className="font-mono"
                          style={{ fontSize: 10, padding: '5px 12px', background: 'none', color: 'var(--accent)', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer', flexShrink: 0, marginLeft: 12 }}
                        >
                          edit
                        </button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${progress * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 3 }} />
                        </div>
                        <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', flexShrink: 0 }}>
                          {fmtCAD(g.funded_cents ?? 0)} / {fmtCAD(g.funding_goal_cents ?? 0)}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {[
                        { label: 'NAME', key: 'name', type: 'text' },
                        { label: 'LOCATION', key: 'location', type: 'text' },
                        { label: 'FUNDING GOAL (CA$)', key: 'funding_goal_str', type: 'number' },
                      ].map(f => (
                        <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>{f.label}</span>
                          <input
                            type={f.type}
                            value={editForm[f.key] ?? ''}
                            onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                            className="font-mono"
                            style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)' }}
                          />
                        </label>
                      ))}
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>STATUS</span>
                        <select value={editForm.status ?? ''} onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))} className="font-mono" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)' }}>
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: '1 / -1' }}>
                        <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>DESCRIPTION</span>
                        <textarea
                          rows={2}
                          value={editForm.description ?? ''}
                          onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                          className="font-mono"
                          style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)', resize: 'vertical' }}
                        />
                      </label>
                      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button onClick={() => setEditingId(null)} className="font-mono" style={{ fontSize: 10, padding: '6px 14px', background: 'none', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>cancel</button>
                        <button onClick={() => handleSave(g.id)} disabled={saving} className="font-mono" style={{ fontSize: 10, padding: '6px 14px', background: 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: 8, cursor: 'pointer' }}>{saving ? 'saving…' : 'save'}</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {!loading && tab === 'tokens' && (
        <div>
          {pendingNfc > 0 && (
            <div style={{ background: 'var(--panel)', border: '1px solid #c9973a', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
              <p className="font-mono" style={{ fontSize: 11, color: '#c9973a' }}>{pendingNfc} provenance token{pendingNfc > 1 ? 's' : ''} pending NFC write</p>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tokens.length === 0 && <p className="font-serif" style={{ fontSize: 15, color: 'var(--muted)', fontStyle: 'italic' }}>no provenance tokens</p>}
            {tokens.map(t => (
              <div key={t.id} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <p className="font-mono" style={{ fontSize: 11, color: 'var(--muted)', width: 40, flexShrink: 0 }}>#{t.id}</p>
                  <div style={{ flex: 1 }}>
                    <p className="font-mono" style={{ fontSize: 12, color: 'var(--text)' }}>{t.greenhouse_name ?? '—'}</p>
                    <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{t.owner_email ?? '—'}</p>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {t.nfc_token ? (
                      <span className="font-mono" style={{ fontSize: 9, letterSpacing: 1, padding: '3px 10px', borderRadius: 20, background: 'rgba(76,175,80,0.12)', color: '#4caf50' }}>written</span>
                    ) : nfcEditId === t.id ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="A3F9C12E"
                          value={nfcValue}
                          onChange={e => setNfcValue(e.target.value)}
                          className="font-mono"
                          style={{ width: 100, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 11, color: 'var(--text)' }}
                        />
                        <button onClick={() => handleSetNfc(t.id)} disabled={savingNfc} className="font-mono" style={{ fontSize: 9, padding: '4px 10px', background: 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: 6, cursor: 'pointer' }}>{savingNfc ? '…' : 'set'}</button>
                        <button onClick={() => { setNfcEditId(null); setNfcValue(''); }} className="font-mono" style={{ fontSize: 9, padding: '4px 8px', background: 'none', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}>✕</button>
                      </div>
                    ) : (
                      <button onClick={() => { setNfcEditId(t.id); setNfcValue(''); }} className="font-mono" style={{ fontSize: 9, letterSpacing: 1, padding: '3px 10px', borderRadius: 20, background: 'rgba(201,151,58,0.12)', color: '#c9973a', border: '1px solid #c9973a', cursor: 'pointer' }}>
                        set nfc
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
