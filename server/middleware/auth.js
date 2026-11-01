import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { wrap } from '../utils.js';

export const sign = (u) => jwt.sign({ id: u.id, role: u.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

export const auth = wrap(async (req, res, next) => {
  try {
    const p = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), process.env.JWT_SECRET);
    req.user = await User.findById(p.id);
  } catch { /* falls through to 401 */ }
  if (!req.user) return res.status(401).json({ message: 'Please sign in again.' });
  next();
});

export const admin = (req, res, next) =>
  req.user.role === 'admin' ? next() : res.status(403).json({ message: 'Admins only.' });
export const student = (req, res, next) =>
  req.user.role === 'student' ? next() : res.status(403).json({ message: 'Students only.' });
