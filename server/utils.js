import nodemailer from 'nodemailer';

export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const pub = (u) => ({
  id: u.id, name: u.name, email: u.email, role: u.role,
  meals: { Lunch: !!u.meals?.Lunch, Snacks: !!u.meals?.Snacks },
});

// Returns true if emailed. In development without SMTP, prints the code to server console and returns false.
export async function sendOtp(email, code) {
  const host = process.env.SMTP_HOST;
  const service = process.env.SMTP_SERVICE;

  if (!host && !service) {
    if (process.env.NODE_ENV === 'production') throw new Error('Email is not configured');
    console.log(`[OTP] ${email}: ${code}`);
    return false;
  }

  const port = Number(process.env.SMTP_PORT || (process.env.SMTP_SECURE === 'true' ? 465 : 587));
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  const transportConfig = service
    ? {
        service,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      }
    : {
        host,
        port,
        secure,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      };

  const transporter = nodemailer.createTransport(transportConfig);
  const fromAddress = process.env.MAIL_FROM || process.env.SMTP_USER || '"TechFest Hub" <noreply@techfest.hub>';

  try {
    await transporter.sendMail({
      from: fromAddress,
      to: email,
      subject: 'Your TechFest Hub Verification Code',
      text: `Your TechFest Hub verification code is ${code}. It expires in 10 minutes.`,
      html: `<p>Your TechFest Hub verification code is: <b>${code}</b></p><p>It expires in 10 minutes.</p>`,
    });
    return true;
  } catch (error) {
    console.error(`[OTP Error] Failed to send email to ${email}:`, error.message);
    throw error;
  }
}
