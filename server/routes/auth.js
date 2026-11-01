import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { User, Otp } from '../models/index.js';
import { auth, admin, sign } from '../middleware/auth.js';
import { wrap, pub, sendOtp } from '../utils.js';

const r = Router();
const limit = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
const hash = (email, code) => crypto.createHmac('sha256', process.env.JWT_SECRET).update(email + code).digest('hex');
const same = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const BAD = 'That code is wrong or expired. Check it and try again.';

r.post('/request-otp', limit, wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const role = req.body.role === 'admin' ? 'admin' : 'student';
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address, like you@college.edu.' });
  const user = await User.findOne({ email, role });
  if (!user) return res.status(404).json({ message: role === 'admin' ? 'This email isn’t an admin account.' : 'This email isn’t registered. Use the email you registered with.' });
  const code = String(crypto.randomInt(100000, 1000000));
  await Otp.findOneAndUpdate({ email, role },
    { hash: hash(email, code), attempts: 0, expiresAt: new Date(Date.now() + 10 * 60 * 1000) }, { upsert: true });
  await sendOtp(email, code);
  res.json({ message: 'Code sent' });
}));

r.post('/verify-otp', limit, wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const role = req.body.role === 'admin' ? 'admin' : 'student';
  const code = String(req.body.code || '');
  const otp = await Otp.findOne({ email, role });
  if (!otp || otp.expiresAt < new Date()) return res.status(400).json({ message: BAD });
  if (otp.attempts >= 5) { await otp.deleteOne(); return res.status(429).json({ message: 'Too many tries. Request a new code.' }); }
  if (!same(otp.hash, hash(email, code))) { otp.attempts += 1; await otp.save(); return res.status(400).json({ message: BAD }); }
  await otp.deleteOne();
  const user = await User.findOne({ email, role });
  res.json({ token: sign(user), user: pub(user), needsPassword: role === 'admin' && !user.passwordHash });
}));

r.post('/set-password', auth, admin, wrap(async (req, res) => {
  const pw = String(req.body.password || '');
  if (pw.length < 8) return res.status(400).json({ message: 'Use at least 8 characters.' });
  req.user.passwordHash = await bcrypt.hash(pw, 10);
  await req.user.save();
  res.json({ message: 'Password created' });
}));

r.get('/me', auth, (req, res) => res.json(pub(req.user)));

export default r;
