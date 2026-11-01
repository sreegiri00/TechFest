import { useRef, useState } from 'react';
import { api, token } from '../api.js';
import { QrReader, toast, useApp } from '../components/common.jsx';

export function Login() {
  const { role, setRole, go, setAuth } = useApp();
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [scan, setScan] = useState(false);
  const adm = role === 'admin';

  async function send(em, qr = false) {
    setErr('');
    if (!/^\S+@\S+\.\S+$/.test(em.trim())) return setErr('Enter a valid email address, like you@college.edu.');
    setBusy(true);
    try {
      const d = await api.post('/auth/request-otp', { email: em.trim(), role });
      setAuth({ email: em.trim().toLowerCase(), qr, devCode: d.devCode });
      go('otp');
    } catch (e) { setErr(e.message); setScan(false); }
    finally { setBusy(false); }
  }

  return (
    <>
      <div className="hero">
        <div className="logo">TF</div>
        <h1>{adm ? 'Admin sign-in' : 'Welcome to TechFest'}</h1>
        <p className="m">{adm ? 'Verify your email to manage events and students.' : 'Sign in to see your events, schedule and food status.'}</p>
      </div>
      {scan ? (
        <>
          <QrReader onScan={(t) => send(t, true)} />
          <button className="btn ghost" onClick={() => setScan(false)}>Cancel</button>
        </>
      ) : (
        <>
          <label htmlFor="em">Email</label>
          <input id="em" type="email" placeholder="you@college.edu" value={email}
            onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send(email)} />
        </>
      )}
      <p className="err">{err}</p>
      {!scan && (
        <>
          <button className="btn" disabled={busy} onClick={() => send(email)}>{busy ? 'Sending…' : 'Send OTP'}</button>
          {!adm && (
            <>
              <div className="or">or</div>
              <button className="btn ghost" onClick={() => setScan(true)}>Scan my QR code</button>
              <p className="m s" style={{ textAlign: 'center', marginTop: 12 }}>Use the email you registered with.</p>
            </>
          )}
        </>
      )}
      <button className="lnk" onClick={() => { setRole(adm ? 'student' : 'admin'); setErr(''); setScan(false); }}>
        {adm ? 'Student sign-in' : 'Admin sign-in'}
      </button>
    </>
  );
}

export function Otp() {
  const { auth, setAuth, role, go, setUser } = useApp();
  const [d, setD] = useState(['', '', '', '', '', '']);
  const [err, setErr] = useState('');
  const refs = useRef([]);

  const change = (i, v) => {
    v = v.replace(/\D/g, '').slice(-1);
    setD((x) => x.map((c, j) => (j === i ? v : c)));
    if (v && refs.current[i + 1]) refs.current[i + 1].focus();
  };
  const key = (i, e) => {
    if (e.key === 'Backspace' && !d[i] && refs.current[i - 1]) refs.current[i - 1].focus();
    if (e.key === 'Enter') verify();
  };
  async function verify() {
    try {
      const r = await api.post('/auth/verify-otp', { email: auth.email, role, code: d.join('') });
      token.set(r.token);
      setUser(r.user);
      go(r.needsPassword ? 'setpw' : role === 'admin' ? 'ahome' : 'home');
    } catch (e) { setErr(e.message); }
  }
  async function resend() {
    try {
      const r = await api.post('/auth/request-otp', { email: auth.email, role });
      setAuth({ ...auth, devCode: r.devCode });
      setD(['', '', '', '', '', '']);
      setErr('');
      toast('New code sent');
    } catch (e) { setErr(e.message); }
  }
  return (
    <>
      <button className="back" onClick={() => go('login')}>← Change email</button>
      <h1 style={{ marginTop: 14 }}>Enter your code</h1>
      <p className="m">
        {auth.qr ? 'QR scanned. We sent a code to your registered email: ' : 'We sent a 6-digit code to '}<b>{auth.email}</b>
      </p>
      <div className="otp">
        {d.map((c, i) => (
          <input key={i} ref={(el) => (refs.current[i] = el)} inputMode="numeric" maxLength={1} aria-label="Code digit"
            autoComplete="one-time-code" value={c} onChange={(e) => change(i, e.target.value)} onKeyDown={(e) => key(i, e)} />
        ))}
      </div>
      <p className="err" style={{ textAlign: 'center' }}>{err}</p>
      {auth.devCode && <div className="demo">Demo mode: no email service is set up. Your code is <b>{auth.devCode}</b>.</div>}
      <button className="btn" onClick={verify}>Verify</button>
      <button className="lnk" onClick={resend}>Resend code</button>
    </>
  );
}

export function SetPw() {
  const { go } = useApp();
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [err, setErr] = useState('');
  async function save() {
    if (p1.length < 8) return setErr('Use at least 8 characters.');
    if (p1 !== p2) return setErr('The two passwords don’t match.');
    try { await api.post('/auth/set-password', { password: p1 }); toast('Password created'); go('ahome'); }
    catch (e) { setErr(e.message); }
  }
  return (
    <>
      <h1 style={{ marginTop: 20 }}>Create your password</h1>
      <p className="m">You’ll use it with your email to sign in next time.</p>
      <label htmlFor="p1">Password</label>
      <input id="p1" type="password" autoComplete="new-password" placeholder="At least 8 characters" value={p1} onChange={(e) => setP1(e.target.value)} />
      <label htmlFor="p2">Confirm password</label>
      <input id="p2" type="password" autoComplete="new-password" value={p2} onChange={(e) => setP2(e.target.value)} />
      <p className="err">{err}</p>
      <button className="btn" onClick={save}>Save password</button>
    </>
  );
}
