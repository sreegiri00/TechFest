import { useState } from 'react';
import { api } from '../api.js';
import { Badge, Chat, Panel, QrReader, toast, useLoad } from '../components/common.jsx';

const Loading = ({ data, err }) => (err ? <p className="err">{err}</p> : !data ? <p className="m">Loading…</p> : null);

export function Dashboard() {
  const [s, , err] = useLoad(() => api.get('/users/stats'));
  if (!s) return <><h1>Dashboard</h1><Loading data={s} err={err} /></>;
  const max = Math.max(1, ...s.perEvent.map((e) => e.count));
  return (
    <>
      <h1>Dashboard</h1>
      <div className="stats" style={{ marginTop: 14 }}>
        {[['Users', s.users], ['Events', s.events], ['Ongoing', s.ongoing], ['Completed', s.completed], ['Meals served', s.meals]].map(([l, v]) => (
          <div className="stat" key={l}><b>{v}</b><span className="m s">{l}</span></div>
        ))}
      </div>
      <h2>Registrations per event</h2>
      <div className="card">
        {s.perEvent.map((e) => (
          <div style={{ marginBottom: 12 }} key={e.name}>
            <div className="row s"><span>{e.name}</span><span className="m">{e.count}</span></div>
            <div className="bar" style={{ width: Math.max(4, (e.count / max) * 100) + '%' }} />
          </div>
        ))}
      </div>
    </>
  );
}

export function Users() {
  const [users, , err, setUsers] = useLoad(() => api.get('/users'));
  const [sel, setSel] = useState(null);
  const u = users?.find((x) => x.id === sel);
  if (u) {
    return (
      <>
        <button className="back" onClick={() => setSel(null)}>← All users</button>
        <Panel u={u} onChange={(nu) => setUsers((us) => us.map((x) => (x.id === nu.id ? nu : x)))} />
      </>
    );
  }
  return (
    <>
      <h1>Users</h1>
      <div style={{ marginTop: 14 }}>
        <Loading data={users} err={err} />
        {users?.map((x) => (
          <div className="card ev" key={x.id} onClick={() => setSel(x.id)}>
            <div className="ic">👤</div>
            <div className="grow"><div className="t">{x.name}</div><div className="m s">{x.email}</div><div className="m s">{x.events.length} events</div></div>
          </div>
        ))}
      </div>
    </>
  );
}

export function AdminEvents() {
  const [events, load, err] = useLoad(() => api.get('/events'));
  const set = (id, status) => api.patch(`/events/${id}/status`, { status }).then(() => { toast('Status set to ' + status); load(); }).catch((e) => toast(e.message));
  return (
    <>
      <h1>Events</h1>
      <div style={{ marginTop: 14 }}>
        <Loading data={events} err={err} />
        {events?.map((e) => (
          <div className="card" key={e.id}>
            <div className="row"><span className="t">{e.icon} {e.name}</span><Badge s={e.status} /></div>
            <div className="m s">{e.time} · 📍 {e.venue}</div>
            <div className="m s">{e.participants} participants</div>
            <div className="tabs" style={{ marginBottom: 0 }}>
              {['Upcoming', 'Ongoing', 'Completed', 'Cancelled'].map((s) => (
                <button key={s} className={e.status === s ? 'on' : ''} onClick={() => set(e.id, s)}>{s}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function Scan() {
  const [student, setStudent] = useState(null);
  const [k, setK] = useState(0);
  const [email, setEmail] = useState('');
  async function find(text) {
    try { const u = await api.get('/users/lookup?email=' + encodeURIComponent(text.trim())); setStudent(u); toast('Found ' + u.name); }
    catch (e) { toast(e.message); }
    setK((x) => x + 1);
  }
  return (
    <>
      <h1>Scan a student</h1>
      <p className="m" style={{ marginBottom: 12 }}>Scan a student’s QR code to see their events and food status.</p>
      <QrReader key={k} onScan={find} />
      <p className="m s" style={{ marginTop: 14 }}>No camera? Look up a student by email:</p>
      <div className="row" style={{ marginTop: 8 }}>
        <input placeholder="student@college.edu" aria-label="Student email" value={email}
          onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && find(email)} />
        <button className="btn sm" onClick={() => find(email)}>Find</button>
      </div>
      {student && <><h2>Result</h2><Panel u={student} onChange={setStudent} /></>}
    </>
  );
}

export function AdminChat() {
  const [users, , err] = useLoad(() => api.get('/users'));
  const [sel, setSel] = useState(null);
  if (!users) return <><h1>Chat</h1><Loading data={users} err={err} /></>;
  const id = sel || users[0]?.id;
  const cur = users.find((u) => u.id === id);
  if (!cur) return <><h1>Chat</h1><p className="m">No students yet.</p></>;
  return (
    <>
      <div className="tabs" style={{ marginTop: 0 }}>
        {users.map((u) => <button key={u.id} className={u.id === id ? 'on' : ''} onClick={() => setSel(u.id)}>{u.name}</button>)}
      </div>
      <Chat key={id} studentId={id} title={cur.name} sub="Student chat" />
    </>
  );
}
