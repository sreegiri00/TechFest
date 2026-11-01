import 'dotenv/config';
import mongoose from 'mongoose';
import { User, Event, Otp, Message } from './models/index.js';

await mongoose.connect(process.env.MONGO_URI);
console.log('Database:', mongoose.connection.name);

const existing = await User.countDocuments();
if (existing && !process.argv.includes('--reset')) {
  console.error(`"${mongoose.connection.name}" already has ${existing} users. Seeding would delete them.`);
  console.error('If this database is only for TechFest, run: node seed.js --reset');
  process.exit(1);
}

await Promise.all([User.deleteMany(), Event.deleteMany(), Otp.deleteMany(), Message.deleteMany()]);

await User.create({ name: 'Fest Admin', email: process.env.ADMIN_EMAIL || 'admin@college.edu', role: 'admin' });
const [anu, ravi, meera] = await User.create([
  { name: 'Anu Mathew', email: 'anu@college.edu', meals: { Lunch: true, Snacks: false } },
  { name: 'Ravi Kumar', email: 'ravi@college.edu' },
  { name: 'Meera Nair', email: 'meera@college.edu', meals: { Lunch: true, Snacks: true } },
]);

await Event.create([
  { name: 'Hack Sprint 24h', icon: '💻', time: 'Fri 10:00 AM', venue: 'Lab Block A, Hall 2', status: 'Ongoing', seats: 12, description: 'Build a working prototype in 24 hours with your team.', participants: [anu._id, meera._id] },
  { name: 'Robo Race', icon: '🤖', time: 'Fri 2:00 PM', venue: 'Main Ground', status: 'Upcoming', seats: 30, description: 'Race your line-following robot on a timed track.', participants: [ravi._id] },
  { name: 'Code Quiz', icon: '🧠', time: 'Thu 11:00 AM', venue: 'Seminar Hall', status: 'Completed', seats: 0, description: 'Rapid-fire questions on programming and tech.', participants: [anu._id] },
  { name: 'UI Design Duel', icon: '🎨', time: 'Sat 11:30 AM', venue: 'Design Studio, Room 204', status: 'Upcoming', seats: 18, description: 'Design a mobile app screen from a surprise brief.', participants: [ravi._id] },
  { name: 'Gaming Arena', icon: '🎮', time: 'Sat 3:00 PM', venue: 'Auditorium', status: 'Upcoming', seats: 40, description: 'Knockout tournament on the big screen.', participants: [meera._id] },
]);

console.log('Seeded. Admin:', process.env.ADMIN_EMAIL || 'admin@college.edu', '| Students: anu@, ravi@, meera@college.edu');
await mongoose.disconnect();