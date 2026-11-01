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

  const tls = process.env.SMTP_TLS_REJECT_UNAUTHORIZED === 'false'
    ? { rejectUnauthorized: false }
    : undefined;

  const connectionTimeout = Number(process.env.SMTP_CONNECTION_TIMEOUT || 10000);
  const greetingTimeout = Number(process.env.SMTP_GREETING_TIMEOUT || 10000);
  const socketTimeout = Number(process.env.SMTP_SOCKET_TIMEOUT || 15000);

  const auth = (process.env.SMTP_USER && process.env.SMTP_PASS)
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined;

  const transportConfig = service
    ? {
        service,
        auth,
        connectionTimeout,
        greetingTimeout,
        socketTimeout,
        ...(tls ? { tls } : {}),
      }
    : {
        host,
        port,
        secure,
        auth,
        connectionTimeout,
        greetingTimeout,
        socketTimeout,
        ...(tls ? { tls } : {}),
      };

  const transporter = nodemailer.createTransport(transportConfig);

  let fromAddress = process.env.MAIL_FROM;
  if (!fromAddress) {
    fromAddress = process.env.SMTP_USER
      ? `"TechFest Hub" <${process.env.SMTP_USER}>`
      : '"TechFest Hub" <noreply@techfest.hub>';
  }

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
    console.error(`[OTP Error] Failed to send email to ${email}:`, error.message || error);
    const friendlyError = new Error(
      error.code === 'EAUTH'
        ? 'Email authentication failed. Please check SMTP credentials.'
        : error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT'
        ? 'Email server connection timed out. Please try again.'
        : error.code === 'ECONNREFUSED'
        ? 'Unable to connect to email server. Connection refused.'
        : `Email delivery failed: ${error.message || 'Unknown error'}`
    );
    friendlyError.originalError = error;
    friendlyError.code = error.code;
    throw friendlyError;
  }
}
