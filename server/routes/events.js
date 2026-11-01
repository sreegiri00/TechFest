import { Router } from 'express';
import { Event } from '../models/index.js';
import { auth, admin, student } from '../middleware/auth.js';
import { wrap } from '../utils.js';

const r = Router();
r.use(auth);

const shape = (e, uid) => ({
  id: e.id, name: e.name, icon: e.icon, time: e.time, venue: e.venue, description: e.description,
  status: e.status, seats: e.seats, participants: e.participants.length,
  joined: e.participants.some((p) => p.equals(uid)),
});

r.get('/', wrap(async (req, res) => {
  res.json((await Event.find().sort('createdAt')).map((e) => shape(e, req.user._id)));
}));

r.post('/:id/join', student, wrap(async (req, res) => {
  const e = await Event.findOneAndUpdate(
    { _id: req.params.id, seats: { $gt: 0 }, participants: { $ne: req.user._id } },
    { $inc: { seats: -1 }, $push: { participants: req.user._id } }, { new: true });
  if (!e) return res.status(409).json({ message: 'You can’t join this event. It may be full or already joined.' });
  res.json(shape(e, req.user._id));
}));

r.delete('/:id/join', student, wrap(async (req, res) => {
  const e = await Event.findOneAndUpdate(
    { _id: req.params.id, participants: req.user._id },
    { $inc: { seats: 1 }, $pull: { participants: req.user._id } }, { new: true });
  if (!e) return res.status(404).json({ message: 'You haven’t joined this event.' });
  res.json(shape(e, req.user._id));
}));

r.patch('/:id/status', admin, wrap(async (req, res) => {
  if (!['Upcoming', 'Ongoing', 'Completed', 'Cancelled'].includes(req.body.status))
    return res.status(400).json({ message: 'Unknown status.' });
  const e = await Event.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  if (!e) return res.status(404).json({ message: 'Event not found.' });
  res.json(shape(e, req.user._id));
}));

export default r;
