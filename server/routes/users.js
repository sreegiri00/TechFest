import { Router } from 'express';
import { User, Event } from '../models/index.js';
import { auth, admin } from '../middleware/auth.js';
import { wrap, pub } from '../utils.js';

const r = Router();
r.use(auth, admin);

async function withEvents(users) {
  const evs = await Event.find({ participants: { $in: users.map((u) => u._id) } }).sort('createdAt');
  return users.map((u) => ({
    ...pub(u),
    events: evs.filter((e) => e.participants.some((p) => p.equals(u._id)))
      .map((e) => ({ id: e.id, name: e.name, icon: e.icon, status: e.status })),
  }));
}

r.get('/', wrap(async (req, res) => res.json(await withEvents(await User.find({ role: 'student' }).sort('name')))));

r.get('/stats', wrap(async (req, res) => {
  const [students, events] = await Promise.all([User.find({ role: 'student' }), Event.find().sort('createdAt')]);
  res.json({
    users: students.length, events: events.length,
    ongoing: events.filter((e) => e.status === 'Ongoing').length,
    completed: events.filter((e) => e.status === 'Completed').length,
    meals: students.reduce((s, u) => s + (u.meals.Lunch ? 1 : 0) + (u.meals.Snacks ? 1 : 0), 0),
    perEvent: events.map((e) => ({ name: e.name, count: e.participants.length })),
  });
}));

r.get('/lookup', wrap(async (req, res) => {
  const u = await User.findOne({ role: 'student', email: String(req.query.email || '').trim().toLowerCase() });
  if (!u) return res.status(404).json({ message: 'No student found for this code.' });
  res.json((await withEvents([u]))[0]);
}));

r.patch('/:id/meals', wrap(async (req, res) => {
  const { meal, eaten } = req.body;
  if (!['Lunch', 'Snacks'].includes(meal)) return res.status(400).json({ message: 'Unknown meal.' });
  const u = await User.findOneAndUpdate({ _id: req.params.id, role: 'student' }, { $set: { ['meals.' + meal]: !!eaten } }, { new: true });
  if (!u) return res.status(404).json({ message: 'Student not found.' });
  res.json((await withEvents([u]))[0]);
}));

export default r;
