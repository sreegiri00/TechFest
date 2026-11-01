import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../api.js';

export const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function toast(msg) {
  const d = document.createElement('div');
  d.className = 'toast';
  d.setAttribute('role', 'status');
  d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 2200);
}

export const Badge = ({ s }) => <span className={'b b-' + s}>{s}</span>;
export const Eaten = ({ v }) => <span className={'b ' + (v ? 'b-Eaten' : 'b-Not')}>{v ? 'Eaten' : 'Not eaten'}</span>;

// Loads data once; returns [data, reload, error, setData]
export function useLoad(fn, deps = []) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(() => fn().then((x) => { setData(x); setErr(''); }).catch((e) => setErr(e.message)), deps);
  useEffect(() => { load(); }, [load]);
  return [data, load, err, setData];
}

export function QrReader({ onScan }) {
  const scanner = useRef(null);
  const id = useRef('rd' + Math.random().toString(36).slice(2));
  useEffect(() => () => { if (scanner.current?.isScanning) scanner.current.stop().catch(() => {}); }, []);
  async function start() {
    try {
      const q = new Html5Qrcode(id.current);
      scanner.current = q;
      await q.start({ facingMode: 'environment' }, { fps: 10, qrbox: 220 },
        (text) => { q.stop().catch(() => {}); onScan(text); }, () => {});
    } catch {
      toast('Camera unavailable. Allow camera access and try again.');
    }
  }
  return (
    <>
      <div className="vf"><div id={id.current} className="reader" /></div>
      <button className="btn" onClick={start}>Start camera</button>
    </>
  );
}

// A student's events and food status. Used in Users and in the scanner result.
export function Panel({ u, onChange }) {
  async function toggle(meal) {
    try {
      const nu = await api.patch(`/users/${u.id}/meals`, { meal, eaten: !u.meals[meal] });
      toast(`${meal} marked ${nu.meals[meal] ? 'eaten' : 'not eaten'}`);
      onChange(nu);
    } catch (e) { toast(e.message); }
  }
  return (
    <div className="card">
      <div className="t">{u.name}</div>
      <div className="m s">{u.email}</div>
      <h2>Events</h2>
      {u.events.length
        ? u.events.map((e) => (
            <div className="row" style={{ marginBottom: 8 }} key={e.id}><span>{e.icon} {e.name}</span><Badge s={e.status} /></div>
          ))
        : <p className="m s">No events yet.</p>}
      <h2>Food</h2>
      {Object.keys(u.meals).map((m) => (
        <div className="row" style={{ marginBottom: 8 }} key={m}>
          <span>{m} <Eaten v={u.meals[m]} /></span>
          <button className="btn sm ghost" onClick={() => toggle(m)}>{u.meals[m] ? 'Mark as not eaten' : 'Mark as eaten'}</button>
        </div>
      ))}
    </div>
  );
}

export function Chat({ studentId, title, sub }) {
  const { user } = useApp();
  const adm = user.role === 'admin';
  const path = adm ? `/chat/${studentId}` : '/chat';
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const end = useRef(null);

  useEffect(() => {
    const load = () => api.get(path).then(setMsgs).catch(() => {});
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [path]);
  useEffect(() => { end.current?.scrollIntoView(); }, [msgs.length]);

  async function send() {
    if (!text.trim()) return;
    try { const m = await api.post(path, { text }); setMsgs((x) => [...x, m]); setText(''); }
    catch (e) { toast(e.message); }
  }
  return (
    <>
      <h1>{title}</h1>
      <p className="m s" style={{ marginBottom: 14 }}>{sub}</p>
      <div className="chat" style={{ paddingBottom: 80 }}>
        {msgs.map((m) => <div key={m.id} className={'msg ' + ((m.from === 'admin') === adm ? 'me' : 'o')}>{m.text}</div>)}
        <div ref={end} />
      </div>
      <div className="send">
        <input placeholder="Type a message" aria-label="Message" value={text}
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
        <button className="btn" onClick={send}>Send</button>
      </div>
    </>
  );
}
