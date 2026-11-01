import { useEffect, useState } from 'react';
import { api, token } from './api.js';
import { Ctx } from './components/common.jsx';
import { Login, Otp, SetPw } from './pages/Auth.jsx';
import { Home, AddEvent, Detail, Food, StudentChat, Profile } from './pages/Student.jsx';
import { Dashboard, Users, AdminEvents, Scan, AdminChat } from './pages/Admin.jsx';

const NAV = {
  student: [['home', '🗓', 'Events'], ['food', '🍽', 'Food'], ['chat', '💬', 'Chat'], ['prof', '👤', 'Profile']],
  admin: [['ahome', '📊', 'Home'], ['ausers', '👥', 'Users'], ['aevents', '📅', 'Events'], ['ascan', '📷', 'Scan'], ['achat', '💬', 'Chat']],
};
const PAGES = {
  login: Login, otp: Otp, setpw: SetPw, home: Home, add: AddEvent, detail: Detail, food: Food, chat: StudentChat, prof: Profile,
  ahome: Dashboard, ausers: Users, aevents: AdminEvents, ascan: Scan, achat: AdminChat,
};

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [scr, go] = useState('login');
  const [role, setRole] = useState('student');
  const [auth, setAuth] = useState({});
  const [evId, setEvId] = useState(null);
  const [tab, setTab] = useState('All');

  useEffect(() => {
    if (!token.get()) { setReady(true); return; }
    api.get('/auth/me')
      .then((u) => { setUser(u); setRole(u.role); go(u.role === 'admin' ? 'ahome' : 'home'); })
      .catch(() => token.clear())
      .finally(() => setReady(true));
  }, []);

  const out = () => { token.clear(); setUser(null); setRole('student'); go('login'); };
  if (!ready) return <div className="app"><p className="m">Loading…</p></div>;

  const Page = PAGES[scr];
  const hide = ['login', 'otp', 'setpw'].includes(scr) || !user;
  const cur = ['add', 'detail'].includes(scr) ? 'home' : scr;

  return (
    <Ctx.Provider value={{ user, setUser, role, setRole, scr, go, auth, setAuth, evId, setEvId, tab, setTab, out }}>
      <div className="app"><Page /></div>
      {!hide && (
        <div className="nav">
          <div>
            {NAV[user.role].map(([id, icon, label]) => (
              <button key={id} className={cur === id ? 'on' : ''} onClick={() => go(id)}><span>{icon}</span>{label}</button>
            ))}
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
