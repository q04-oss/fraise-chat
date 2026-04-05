'use client';
import { useEffect, useState } from 'react';
import { fetchAdminLocations, fetchAdminTimeSlots, createTimeSlot, updateTimeSlot, deleteTimeSlot } from '@/lib/api';

export default function SlotsPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [filterLocation, setFilterLocation] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [form, setForm] = useState({ location_id: '', date: '', time: '', capacity: '20' });
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCapacity, setEditCapacity] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminLocations()
      .then(l => { setLocations(l); if (l.length) setForm(f => ({ ...f, location_id: String(l[0].id) })); })
      .catch(() => setError('Failed to load locations'));
  }, []);

  async function loadSlots() {
    try {
      const data = await fetchAdminTimeSlots(
        filterLocation ? Number(filterLocation) : undefined,
        filterDate || undefined,
      );
      setSlots(data);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.location_id || !form.date || !form.time || !form.capacity) return;
    setCreating(true);
    try {
      const slot = await createTimeSlot({
        location_id: Number(form.location_id),
        date: form.date,
        time: form.time,
        capacity: Number(form.capacity),
      });
      setSlots(prev => [slot, ...prev]);
      setForm(f => ({ ...f, date: '', time: '', capacity: '20' }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleEditSave(id: number) {
    try {
      await updateTimeSlot(id, Number(editCapacity));
      setSlots(prev => prev.map(s => s.id === id ? { ...s, capacity: Number(editCapacity) } : s));
      setEditingId(null);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this time slot?')) return;
    try {
      await deleteTimeSlot(id);
      setSlots(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div style={{ padding: 32, maxWidth: 800 }}>
      <p className="font-serif" style={{ fontSize: 22, color: 'var(--text)', marginBottom: 24 }}>Time Slots</p>
      {error && <p className="font-mono" style={{ fontSize: 11, color: '#e57373', marginBottom: 16 }}>{error}</p>}

      {/* Create form */}
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <p className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1.5, marginBottom: 16 }}>ADD SLOT</p>
        <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>LOCATION</span>
            <select
              value={form.location_id}
              onChange={e => setForm(f => ({ ...f, location_id: e.target.value }))}
              className="font-mono"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)' }}
            >
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>DATE</span>
            <input
              type="date" value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="font-mono"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>TIME</span>
            <input
              type="text" placeholder="e.g. 10:00 – 12:00" value={form.time}
              onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
              className="font-mono"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>CAPACITY</span>
            <input
              type="number" min={1} value={form.capacity}
              onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
              className="font-mono"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)' }}
            />
          </label>
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit" disabled={creating}
              className="font-mono"
              style={{ fontSize: 11, letterSpacing: 1, padding: '8px 20px', background: 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: 8, cursor: 'pointer' }}
            >
              {creating ? 'adding…' : 'add slot'}
            </button>
          </div>
        </form>
      </div>

      {/* Browse */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>LOCATION</span>
          <select
            value={filterLocation}
            onChange={e => setFilterLocation(e.target.value)}
            className="font-mono"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)' }}
          >
            <option value="">all</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>DATE</span>
          <input
            type="date" value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="font-mono"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)' }}
          />
        </label>
        <button
          onClick={loadSlots}
          className="font-mono"
          style={{ fontSize: 11, letterSpacing: 1, padding: '8px 16px', background: 'var(--panel)', color: 'var(--accent)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}
        >
          load
        </button>
      </div>

      {/* Slot list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {slots.map(s => (
          <div key={s.id} style={{
            background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10,
            padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{ flex: 1 }}>
              <p className="font-mono" style={{ fontSize: 12, color: 'var(--text)' }}>{s.location_name ?? `loc ${s.location_id}`} — {s.date}</p>
              <p className="font-mono" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{s.time}</p>
            </div>
            {editingId === s.id ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="number" min={1} value={editCapacity}
                  onChange={e => setEditCapacity(e.target.value)}
                  className="font-mono"
                  style={{ width: 70, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 12, color: 'var(--text)' }}
                />
                <button onClick={() => handleEditSave(s.id)} className="font-mono" style={{ fontSize: 10, padding: '4px 12px', background: 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: 6, cursor: 'pointer' }}>save</button>
                <button onClick={() => setEditingId(null)} className="font-mono" style={{ fontSize: 10, padding: '4px 12px', background: 'none', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}>cancel</button>
              </div>
            ) : (
              <>
                <p className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{s.booked ?? 0} / {s.capacity}</p>
                <button onClick={() => { setEditingId(s.id); setEditCapacity(String(s.capacity)); }} className="font-mono" style={{ fontSize: 10, padding: '4px 12px', background: 'none', color: 'var(--accent)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}>edit</button>
                <button onClick={() => handleDelete(s.id)} className="font-mono" style={{ fontSize: 10, padding: '4px 12px', background: 'none', color: '#e57373', border: '1px solid #e57373', borderRadius: 6, cursor: 'pointer' }}>delete</button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
