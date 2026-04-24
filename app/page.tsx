'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginWithCode } from '@/lib/api';
import { saveSession, getSession } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Token-based auth: ?token= passed from iOS app deep-link
  // Saves the token directly and redirects to the chat destination
  useEffect(() => {
    const token = searchParams.get('token');
    const chatUserId = searchParams.get('chat');
    const myId = searchParams.get('my_id');
    const name = searchParams.get('name');
    if (token) {
      // Persist token so subsequent visits stay authenticated
      localStorage.setItem('fraise_chat_token', token);
      if (myId) {
        localStorage.setItem('fraise_chat_session', JSON.stringify({
          token,
          user_id: parseInt(myId, 10),
          display_name: null,
          business_id: null,
          fraise_chat_email: null,
        }));
      }
      if (chatUserId) {
        const params = new URLSearchParams();
        if (myId) params.set('my_id', myId);
        if (name) params.set('name', name);
        router.replace(`/chat/${chatUserId}?${params.toString()}`);
      } else {
        // Already have a session — redirect based on whether they're an operator
        const existing = getSession();
        router.replace(existing?.business_id ? '/dashboard' : '/chat');
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const session = await loginWithCode(code.trim());
      saveSession(session);

      // Register public keys after login so others can initiate E2E sessions with us.
      // Keys are generated once and persisted in IndexedDB — private keys never leave device.
      // Retry up to 3 times; surface failure so the operator knows messaging is degraded.
      {
        const { buildKeyRegistration } = await import('@/lib/session');
        const { generateOneTimePreKeys } = await import('@/lib/keyStore');
        const { registerPublicKeys } = await import('@/lib/api');

        let lastError: unknown;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const registration   = await buildKeyRegistration();
            const oneTimePreKeys = await generateOneTimePreKeys(10);
            await registerPublicKeys({
              ...registration,
              oneTimePreKeys: oneTimePreKeys.map(k => ({
                id: k.id,
                key: btoa(String.fromCharCode(...k.publicKey)),
              })),
            });
            lastError = null;
            break;
          } catch (err) {
            lastError = err;
          }
        }
        if (lastError) {
          // Key registration failed — show warning but allow login to continue
          setError('signed in, but key registration failed — encrypted messaging may be unavailable');
          setLoading(false);
          return;
        }
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message === 'invalid_code' ? 'invalid code' : 'something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div style={{ textAlign: 'center' }}>
          <p className="font-mono" style={{ fontSize: 16, fontWeight: 500, color: 'var(--text)' }}>box fraise</p>
          <p className="font-mono" style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 2, marginTop: 6 }}>fraise.chat</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label className="font-mono" style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--muted)', textTransform: 'uppercase' }}>
              operator code
            </label>
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="XXXXXX"
              style={{
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '12px 14px',
                fontSize: 20,
                letterSpacing: 4,
                textAlign: 'center',
                background: 'var(--panel)',
                color: 'var(--text)',
                outline: 'none',
              }}
            />
          </div>

          {error && (
            <p className="font-mono" style={{ fontSize: 11, color: '#C0392B', textAlign: 'center' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || code.length < 6}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 24,
              padding: '11px 0',
              color: 'var(--text)',
              cursor: code.length >= 6 && !loading ? 'pointer' : 'default',
              opacity: code.length >= 6 && !loading ? 1 : 0.4,
              letterSpacing: 1,
              fontSize: 11,
            }}
          >
            {loading ? '...' : 'sign in →'}
          </button>
        </form>
      </div>
    </div>
  );
}
