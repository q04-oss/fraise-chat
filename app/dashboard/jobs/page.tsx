'use client';
import { useEffect, useState } from 'react';
import { fetchOperatorJobs, postJob, deactivateJob, scheduleInterview, recordOutcome, addEmployerStatement } from '@/lib/api';

const STATUS_COLOR: Record<string, string> = {
  hired: 'var(--accent)',
  not_hired: 'var(--muted)',
  dismissed: '#e57373',
  scheduled: 'var(--accent)',
  applied: 'var(--muted)',
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Post job form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pay, setPay] = useState('');
  const [payType, setPayType] = useState<'hourly' | 'salary'>('hourly');
  const [posting, setPosting] = useState(false);

  // Interview scheduling
  const [schedulingId, setSchedulingId] = useState<number | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  // Employer statement
  const [statementAppId, setStatementAppId] = useState<number | null>(null);
  const [statementText, setStatementText] = useState('');
  const [submittingStatement, setSubmittingStatement] = useState(false);

  const load = () => {
    setLoading(true);
    fetchOperatorJobs()
      .then(data => { setJobs(data.jobs); setApplications(data.applications); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !pay) return;
    const pay_cents = Math.round(parseFloat(pay) * 100);
    if (isNaN(pay_cents) || pay_cents <= 0) return;
    setPosting(true);
    try {
      await postJob({ title: title.trim(), description: description.trim() || undefined, pay_cents, pay_type: payType });
      setTitle(''); setDescription(''); setPay(''); setPayType('hourly');
      load();
    } catch (e: any) {
      alert(e.message ?? 'could not post job');
    } finally {
      setPosting(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    if (!confirm('Close this job posting?')) return;
    try { await deactivateJob(id); load(); } catch (e: any) { alert(e.message); }
  };

  const handleSchedule = async (applicationId: number) => {
    if (!scheduleDate || !scheduleTime) return;
    try {
      await scheduleInterview(applicationId, `${scheduleDate}T${scheduleTime}:00`);
      setSchedulingId(null); setScheduleDate(''); setScheduleTime('');
      load();
    } catch (e: any) { alert(e.message); }
  };

  const handleOutcome = async (applicationId: number, status: 'hired' | 'not_hired' | 'dismissed') => {
    if (!confirm(`Mark as ${status.replace('_', ' ')}?`)) return;
    try { await recordOutcome(applicationId, status); load(); } catch (e: any) { alert(e.message); }
  };

  const handleStatement = async () => {
    if (!statementAppId || !statementText.trim()) return;
    setSubmittingStatement(true);
    try {
      await addEmployerStatement(statementAppId, statementText.trim());
      setStatementAppId(null); setStatementText('');
      load();
    } catch (e: any) {
      alert(e.message ?? 'could not submit statement');
    } finally {
      setSubmittingStatement(false);
    }
  };

  const formatPay = (app: any) => {
    const job = jobs.find(j => j.id === app.job_id);
    if (!job) return '';
    const amt = (job.pay_cents / 100).toFixed(0);
    return job.pay_type === 'hourly' ? `$${amt}/hr` : `$${parseInt(amt).toLocaleString()}/yr`;
  };

  const pendingApps = applications.filter(a => ['applied', 'scheduled'].includes(a.status));
  const closedApps = applications.filter(a => ['hired', 'not_hired', 'dismissed'].includes(a.status));

  return (
    <div style={{ padding: '32px 40px', maxWidth: 760 }}>
      <p className="font-mono" style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 32 }}>jobs</p>

      {/* Active job listings */}
      {!loading && jobs.filter(j => j.active).length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <p className="font-mono" style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 12 }}>active listings</p>
          {jobs.filter(j => j.active).map(j => (
            <div key={j.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <p className="font-serif" style={{ fontSize: 16, color: 'var(--text)' }}>{j.title}</p>
                <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
                  {j.pay_type === 'hourly' ? `$${(j.pay_cents / 100).toFixed(0)}/hr` : `$${(j.pay_cents / 100).toLocaleString()}/yr`}
                </p>
              </div>
              <button
                onClick={() => handleDeactivate(j.id)}
                className="font-mono"
                style={{ fontSize: 10, color: 'var(--muted)', background: 'none', border: '1px solid var(--border)', borderRadius: 16, padding: '5px 12px', cursor: 'pointer' }}
              >close</button>
            </div>
          ))}
        </div>
      )}

      {/* Pending applications */}
      {!loading && pendingApps.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <p className="font-mono" style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 12 }}>applications</p>
          {pendingApps.map(a => (
            <div key={a.id} style={{ padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <p className="font-serif" style={{ fontSize: 15, color: 'var(--text)' }}>{a.applicant_name ?? a.applicant_code ?? 'unknown'}</p>
                <span className="font-mono" style={{ fontSize: 10, color: STATUS_COLOR[a.status] ?? 'var(--muted)' }}>{a.status.replace('_', ' ')}</span>
              </div>
              <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 12 }}>
                {a.job_title}  ·  {formatPay(a)}
              </p>

              {/* Schedule interview */}
              {a.status === 'applied' && schedulingId !== a.id && (
                <button
                  onClick={() => setSchedulingId(a.id)}
                  className="font-mono"
                  style={{ fontSize: 10, color: 'var(--accent)', background: 'none', border: '1px solid var(--accent)', borderRadius: 16, padding: '5px 14px', cursor: 'pointer', marginRight: 8 }}
                >schedule interview →</button>
              )}

              {schedulingId === a.id && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', background: 'var(--panel)', color: 'var(--text)', fontSize: 11 }}
                  />
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={e => setScheduleTime(e.target.value)}
                    style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', background: 'var(--panel)', color: 'var(--text)', fontSize: 11 }}
                  />
                  <button
                    onClick={() => handleSchedule(a.id)}
                    className="font-mono"
                    style={{ fontSize: 10, color: 'var(--accent)', background: 'none', border: '1px solid var(--accent)', borderRadius: 16, padding: '5px 14px', cursor: 'pointer' }}
                  >confirm →</button>
                  <button
                    onClick={() => { setSchedulingId(null); setScheduleDate(''); setScheduleTime(''); }}
                    className="font-mono"
                    style={{ fontSize: 10, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >cancel</button>
                </div>
              )}

              {/* Outcome buttons for scheduled */}
              {a.status === 'scheduled' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleOutcome(a.id, 'hired')} className="font-mono" style={{ fontSize: 10, color: 'var(--accent)', background: 'none', border: '1px solid var(--accent)', borderRadius: 16, padding: '5px 14px', cursor: 'pointer' }}>hired →</button>
                  <button onClick={() => handleOutcome(a.id, 'not_hired')} className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', background: 'none', border: '1px solid var(--border)', borderRadius: 16, padding: '5px 14px', cursor: 'pointer' }}>not hired</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Closed applications / ledger */}
      {!loading && closedApps.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <p className="font-mono" style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 12 }}>ledger</p>
          {closedApps.map(a => (
            <div key={a.id} style={{ padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <p className="font-serif" style={{ fontSize: 15, color: 'var(--text)' }}>{a.applicant_name ?? a.applicant_code ?? 'unknown'}</p>
                <span className="font-mono" style={{ fontSize: 10, color: STATUS_COLOR[a.status] ?? 'var(--muted)' }}>{a.status.replace('_', ' ')}</span>
              </div>
              <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 8 }}>
                {a.job_title}  ·  {formatPay(a)}
              </p>

              {/* Dismiss button for hired employees */}
              {a.status === 'hired' && (
                <button onClick={() => handleOutcome(a.id, 'dismissed')} className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', background: 'none', border: '1px solid var(--border)', borderRadius: 16, padding: '5px 12px', cursor: 'pointer', marginBottom: 8 }}>dismiss</button>
              )}

              {/* Employer statement */}
              {statementAppId !== a.id && (
                <button
                  onClick={() => setStatementAppId(a.id)}
                  className="font-mono"
                  style={{ fontSize: 10, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >+ add statement</button>
              )}

              {statementAppId === a.id && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  <textarea
                    value={statementText}
                    onChange={e => setStatementText(e.target.value)}
                    placeholder="employer statement..."
                    rows={3}
                    style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', background: 'var(--panel)', color: 'var(--text)', resize: 'vertical', outline: 'none', fontSize: 12 }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={handleStatement}
                      disabled={!statementText.trim() || submittingStatement}
                      className="font-mono"
                      style={{ fontSize: 10, color: 'var(--accent)', background: 'none', border: '1px solid var(--accent)', borderRadius: 16, padding: '5px 14px', cursor: 'pointer', opacity: statementText.trim() ? 1 : 0.4 }}
                    >{submittingStatement ? '...' : 'submit →'}</button>
                    <button onClick={() => { setStatementAppId(null); setStatementText(''); }} className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Post job form */}
      <p className="font-mono" style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 16 }}>post a job</p>
      <form onSubmit={handlePost} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="font-mono" style={{ fontSize: 9, letterSpacing: 1, color: 'var(--muted)' }}>title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Seasonal Market Worker"
            style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', background: 'var(--panel)', color: 'var(--text)', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="font-mono" style={{ fontSize: 9, letterSpacing: 1, color: 'var(--muted)' }}>description (optional)</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="role details, hours, expectations..."
            style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', background: 'var(--panel)', color: 'var(--text)', resize: 'vertical', outline: 'none', fontSize: 13 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="font-mono" style={{ fontSize: 9, letterSpacing: 1, color: 'var(--muted)' }}>pay ($)</label>
            <input
              value={pay}
              onChange={e => setPay(e.target.value)}
              type="number"
              min="0"
              step="0.01"
              placeholder="18.00"
              style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', background: 'var(--panel)', color: 'var(--text)', outline: 'none' }}
            />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="font-mono" style={{ fontSize: 9, letterSpacing: 1, color: 'var(--muted)' }}>type</label>
            <select
              value={payType}
              onChange={e => setPayType(e.target.value as 'hourly' | 'salary')}
              style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', background: 'var(--panel)', color: 'var(--text)', outline: 'none' }}
            >
              <option value="hourly">hourly</option>
              <option value="salary">salary</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={!title.trim() || !pay || posting}
          className="font-mono"
          style={{
            border: '1px solid var(--accent)', borderRadius: 24, padding: '10px 0',
            color: 'var(--accent)', background: 'transparent', cursor: 'pointer',
            opacity: title.trim() && pay ? 1 : 0.4, fontSize: 11, letterSpacing: 1, marginTop: 8,
          }}
        >{posting ? '...' : 'post →'}</button>
      </form>
    </div>
  );
}
