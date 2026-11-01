import mongoose from 'mongoose';
const { Schema, model } = mongoose;

export const User = model('User', new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  college: String,
  passwordHash: String,
  meals: { Lunch: { type: Boolean, default: false }, Snacks: { type: Boolean, default: false } },
}, { timestamps: true }));

export const Event = model('Event', new Schema({
  name: { type: String, required: true },
  icon: { type: String, default: '🎟' },
  time: String,
  venue: String,
  description: String,
  status: { type: String, enum: ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'], default: 'Upcoming' },
  seats: { type: Number, default: 0 },
  participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true }));

export const Otp = model('Otp', new Schema({
  email: String, role: String, hash: String, attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, index: { expires: 0 } },
}));

export const Message = model('Message', new Schema({
  student: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  from: { type: String, enum: ['student', 'admin'] },
  text: { type: String, required: true, maxlength: 1000 },
}, { timestamps: true }));
