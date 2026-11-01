import nodemailer from 'nodemailer';

export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const pub = (u) => ({
  id: u.id, name: u.name, email: u.email, role: u.role,
  meals: { Lunch: !!u.meals?.Lunch, Snacks: !!u.meals?.Snacks },
});

// Returns true if emailed. In development without SMTP, prints the code and returns false.
export async function sendOtp(email, code) {
  if (!process.env.SMTP_HOST) {
    if (process.env.NODE_ENV === 'production') throw new Error('Email is not configured');
    console.log(`[OTP] ${email}: ${code}`);
    return false;
  }
  const t = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  await t.sendMail({
    from: process.env.MAIL_FROM, to: email, subject: 'Your TechFest Hub code',
    text: `Your TechFest Hub verification code is ${code}. It expires in 10 minutes.`,
  });
  return true;
}
