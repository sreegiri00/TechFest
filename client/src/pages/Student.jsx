import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api.js';
import { Badge, Chat, Eaten, toast, useApp, useLoad } from '../components/common.jsx';

const Loading = ({ data, err }) => (err ? <p className="err">{err}</p> : !data ? <p className="m">Loading…</p> : null);

export function Home() {
  const { user, go, setEvId, tab, setTab } = useApp();
  const [events, , err] = useLoad(() => api.get('/events'));
  const my = (events || []).filter((e) => e.joined && (tab === 'All' || e.status === tab));
  return (
    <>
      <div className="top">
        <div><div className="m s">Hello,</div><h1>{user.name.split(' ')[0]}</h1></div>
        <button className="btn sm" onClick={() => go('add')}>+ Add event</button>
      </div>
      <div className="tabs">
        {['All', 'Upcoming', 'Ongoing', 'Completed'].map((t) => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      <Loading data={events} err={err} />
      {my.map((e) => (
        <div className="card ev" key={e.id} onClick={() => { setEvId(e.id); go('detail'); }}>
          <div className="ic">{e.icon}</div>
          <div className="grow">
            <div className="row"><span className="t">{e.name}</span><Badge s={e.status} /></div>
            <div className="m s">{e.time}</div>
            <div className="m s">📍 {e.venue}</div>
          </div>
        </div>
      ))}
      {events && !my.length && (
        <div className="card" style={{ textAlign: 'center' }}>
          <p className="m">You haven’t joined any events here yet.</p>
          <button className="btn sm" style={{ marginTop: 12 }} onClick={() => go('add')}>Add event</button>
        </div>
      )}
    </>
  );
}

export function AddEvent() {
  const { go, setEvId } = useApp();
  const [events, load, err] = useLoad(() => api.get('/events'));
  const [q, setQ] = useState('');
  const list = (events || []).filter((e) => e.name.toLowerCase().includes(q.toLowerCase()));
  async function join(e) {
    try { await api.post(`/events/${e.id}/join`); toast('You joined ' + e.name); load(); }
    catch (x) { toast(x.message); }
  }
  return (
    <>
      <button className="back" onClick={() => go('home')}>← My events</button>
      <h1>Add event</h1>
      <label htmlFor="sq">Search</label>
      <input id="sq" placeholder="Search events" value={q} onChange={(e) => setQ(e.target.value)} />
      <div style={{ marginTop: 14 }}>
        <Loading data={events} err={err} />
        {list.map((e) => (
          <div className="card row" key={e.id}>
            <div className="ev grow" onClick={() => { setEvId(e.id); go('detail'); }}>
              <div className="ic">{e.icon}</div>
              <div className="grow">
                <div className="t">{e.name}</div>
                <div className="m s">{e.time} · {e.venue}</div>
                <div className="m s">{e.seats} seats left</div>
              </div>
            </div>
            <button className={'btn sm ' + (e.joined ? 'ghost' : '')} disabled={e.joined || e.seats < 1} onClick={() => join(e)}>
              {e.joined ? 'Joined' : e.seats < 1 ? 'Full' : 'Join'}
            </button>
          </div>
        ))}
        {events && !list.length && <p className="m">No events match your search.</p>}
      </div>
    </>
  );
}

export function Detail() {
  const { go, evId } = useApp();
  const [events, load, err] = useLoad(() => api.get('/events'));
  const e = events?.find((x) => x.id === evId);
  if (!e) return <><button className="back" onClick={() => go('home')}>← Back</button><Loading data={events} err={err} /></>;
  const n = e.status === 'Completed' ? 4 : e.status === 'Ongoing' ? 3 : e.status === 'Cancelled' ? 0 : 1;
  const join = () => api.post(`/events/${e.id}/join`).then(() => { toast('You joined ' + e.name); load(); }).catch((x) => toast(x.message));
  const leave = () => api.del(`/events/${e.id}/join`).then(() => { toast('You left the event'); go('home'); }).catch((x) => toast(x.message));
  return (
    <>
      <button className="back" onClick={() => go(e.joined ? 'home' : 'add')}>← Back</button>
      <div className="row" style={{ marginTop: 8 }}><h1>{e.icon} {e.name}</h1></div>
      <div style={{ margin: '8px 0' }}><Badge s={e.status} /></div>
      <p className="m">{e.description}</p>
      <div className="card" style={{ marginTop: 14 }}>
        <div className="m s">When</div><div className="t">{e.time}</div>
        <div className="m s" style={{ marginTop: 10 }}>Where</div><div className="t">📍 {e.venue}</div>
      </div>
      {e.joined ? (
        <>
          <h2>Your status</h2>
          <ul className="tl">
            {['Registered', 'Checked in', 'Ongoing', 'Completed'].map((s, i) => (
              <li key={s} className={i < n || (i === 0 && e.status === 'Cancelled') ? 'd' : ''}>{s}</li>
            ))}
          </ul>
          <button className="btn" onClick={() => go('chat')}>Chat with organizers</button>
          <button className="btn ghost" onClick={leave}>Leave event</button>
        </>
      ) : <button className="btn" onClick={join}>Join event</button>}
    </>
  );
}

export function Food() {
  const [me, , err] = useLoad(() => api.get('/auth/me'));
  return (
    <>
      <h1>Food</h1>
      <p className="m">Staff update this when they scan your QR code at the food counter.</p>
      <div style={{ marginTop: 14 }}>
        <Loading data={me} err={err} />
        {me && Object.keys(me.meals).map((m) => (
          <div className="card row" key={m}><span className="t">{m}</span><Eaten v={me.meals[m]} /></div>
        ))}
      </div>
      {me && (
        <>
          <h2>Your QR code</h2>
          <div className="qrbox"><QRCodeSVG value={me.email} size={180} /></div>
          <p className="m s" style={{ textAlign: 'center' }}>Show this at entry and at food counters.</p>
        </>
      )}
    </>
  );
}

export const StudentChat = () => <Chat title="Organizers" sub="Ask us anything about the fest." />;

export function Profile() {
  const { user, out } = useApp();
  return (
    <>
      <h1>Profile</h1>
      <div className="card" style={{ marginTop: 14 }}><div className="t">{user.name}</div><div className="m s">{user.email}</div></div>
      <button className="btn ghost" onClick={out}>Sign out</button>
    </>
  );
}
