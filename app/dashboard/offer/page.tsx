'use client';
import { useEffect, useState } from 'react';
import { fetchRecentCustomers, fetchVarieties, fetchTimeSlots, fetchBusinesses, sendOffer } from '@/lib/api';

const CHOC = [
  { key: 'guanaja_70', label: 'guanaja 70%' },
  { key: 'caraibe_66', label: 'caraïbe 66%' },
  { key: 'jivara_40', label: 'jivara 40%' },
  { key: 'ivoire_blanc', label: 'ivoire blanc' },
];
const FIN = [
  { key: 'plain', label: 'plain' },
  { key: 'fleur_de_sel', label: 'fleur de sel' },
  { key: 'or_fin', label: 'or fin' },
];
const QTY = [1, 2, 4, 6, 8, 12];
const TODAY = new Date().toISOString().split('T')[0];

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-mono"
      style={{
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 20,
        padding: '6px 14px',
        fontSize: 11,
        letterSpacing: 0.3,
        color: selected ? 'var(--accent)' : 'var(--muted)',
        background: selected ? 'rgba(201,151,58,0.08)' : 'transparent',
        cursor: 'pointer',
      }}
    >{label}</button>
  );
}

export default function OfferPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [varieties, setVarieties] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [location, setLocation] = useState<any>(null);
  const [search, setSearch] = useState('');

  const [customer, setCustomer] = useState<any>(null);
  const [variety, setVariety] = useState<any>(null);
  const [choc, setChoc] = useState('guanaja_70');
  const [finish, setFinish] = useState('plain');
  const [qty, setQty] = useState(4);
  const [slot, setSlot] = useState<any>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    fetchRecentCustomers().then(setCustomers).catch(() => {});
    fetchVarieties().then(v => setVarieties(v.filter((x: any) => x.stock_remaining > 0))).catch(() => {});
    fetchBusinesses().then(bs => {
      const col = bs.find((b: any) => b.type === 'collection');
      if (col) {
        setLocation(col);
        fetchTimeSlots(col.id, TODAY).then(setSlots).catch(() => {});
      }
    }).catch(() => {});
  }, []);

  const filtered = search.trim()
    ? customers.filter(c =>
        (c.display_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (c.user_code ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (c.email ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : customers;

  const canSend = customer && variety && slot && location;

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      await sendOffer({
        recipient_id: customer.user_id,
        variety_id: variety.id,
        chocolate: choc,
        finish,
        quantity: qty,
        time_slot_id: slot.id,
        location_id: location.id,
        note: note.trim() || undefined,
      });
      setSent(true);
      setCustomer(null); setVariety(null); setSlot(null); setNote(''); setSearch('');
      setTimeout(() => setSent(false), 3000);
    } catch (e: any) {
      alert(e.message ?? 'could not send offer');
    } finally {
      setSending(false);
    }
  };

  const Section = ({ label }: { label: string }) => (
    <p className="font-mono" style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 10, marginTop: 24 }}>{label}</p>
  );

  return (
    <div style={{ padding: '32px 40px', maxWidth: 640, overflowY: 'auto', height: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <p className="font-mono" style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--muted)', textTransform: 'uppercase' }}>send offer</p>
        <button
          onClick={handleSend}
          disabled={!canSend || sending}
          className="font-mono"
          style={{
            border: `1px solid ${canSend ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 24, padding: '8px 20px',
            color: canSend ? 'var(--accent)' : 'var(--muted)',
            background: 'transparent', cursor: canSend ? 'pointer' : 'default',
            opacity: canSend ? 1 : 0.4, fontSize: 11, letterSpacing: 0.5,
          }}
        >{sent ? 'sent ✓' : sending ? '...' : 'send →'}</button>
      </div>

      <Section label="to" />
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="search customers..."
        style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', background: 'var(--panel)', color: 'var(--text)', marginBottom: 10, outline: 'none' }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
        {filtered.slice(0, 8).map(c => (
          <button
            key={c.user_id}
            onClick={() => setCustomer(c)}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 12px', border: `1px solid ${customer?.user_id === c.user_id ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 8, background: customer?.user_id === c.user_id ? 'rgba(201,151,58,0.07)' : 'var(--panel)',
              cursor: 'pointer', textAlign: 'left',
            }}
          >
            <span className="font-serif" style={{ fontSize: 14, color: 'var(--text)' }}>{c.display_name ?? c.user_code ?? c.email}</span>
            <span className="font-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{c.order_count} orders</span>
          </button>
        ))}
      </div>

      <Section label="variety" />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {varieties.map(v => <Chip key={v.id} label={v.name} selected={variety?.id === v.id} onClick={() => setVariety(v)} />)}
      </div>

      <Section label="chocolate" />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {CHOC.map(c => <Chip key={c.key} label={c.label} selected={choc === c.key} onClick={() => setChoc(c.key)} />)}
      </div>

      <Section label="finish" />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {FIN.map(f => <Chip key={f.key} label={f.label} selected={finish === f.key} onClick={() => setFinish(f.key)} />)}
      </div>

      <Section label="quantity" />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {QTY.map(q => <Chip key={q} label={String(q)} selected={qty === q} onClick={() => setQty(q)} />)}
      </div>

      <Section label="time slot" />
      {slots.length === 0
        ? <p className="font-serif-i" style={{ fontSize: 13, color: 'var(--muted)' }}>no slots available today</p>
        : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {slots.map(s => <Chip key={s.id} label={s.time} selected={slot?.id === s.id} onClick={() => setSlot(s)} />)}
          </div>
      }

      <Section label="note (optional)" />
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="add a personal note..."
        rows={3}
        style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', background: 'var(--panel)', color: 'var(--text)', resize: 'vertical', outline: 'none' }}
      />

      {canSend && variety && (
        <div style={{ marginTop: 24, border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <p className="font-serif" style={{ fontSize: 18, color: 'var(--text)' }}>{variety.name}  ×{qty}</p>
          <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
            {CHOC.find(c => c.key === choc)?.label}  ·  {FIN.find(f => f.key === finish)?.label}
          </p>
          <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{slot?.time}  ·  {location?.name}</p>
          <p className="font-mono" style={{ fontSize: 14, color: 'var(--accent)' }}>CA${((variety.price_cents * qty) / 100).toFixed(2)}</p>
        </div>
      )}

      <div style={{ height: 48 }} />
    </div>
  );
}
