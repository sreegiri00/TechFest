import { Router } from 'express';
import { Message, User } from '../models/index.js';
import { auth, admin, student } from '../middleware/auth.js';
import { wrap } from '../utils.js';

const r = Router();
r.use(auth);
const shape = (m) => ({ id: m.id, from: m.from, text: m.text, at: m.createdAt });

async function thread(res, studentId) {
  let msgs = await Message.find({ student: studentId }).sort('createdAt');
  if (!msgs.length) {
    msgs = [await Message.create({ student: studentId, from: 'admin', text: 'Welcome to TechFest! Message us here if you need help.' })];
  }
  res.json(msgs.map(shape));
}
async function post(req, res, studentId, from) {
  const text = String(req.body.text || '').trim();
  if (!text) return res.status(400).json({ message: 'Type a message first.' });
  res.status(201).json(shape(await Message.create({ student: studentId, from, text })));
}

r.get('/', student, wrap((req, res) => thread(res, req.user._id)));
r.post('/', student, wrap((req, res) => post(req, res, req.user._id, 'student')));
r.get('/:id', admin, wrap(async (req, res) => {
  if (!(await User.exists({ _id: req.params.id, role: 'student' }))) return res.status(404).json({ message: 'Student not found.' });
  await thread(res, req.params.id);
}));
r.post('/:id', admin, wrap((req, res) => post(req, res, req.params.id, 'admin')));

export default r;
