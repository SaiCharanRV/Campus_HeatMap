import nodemailer from 'nodemailer';
import { env } from './env.js';

export const mailEnabled = Boolean(env.smtp.host);

const transporter = mailEnabled
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    })
  : null;

/**
 * Sends an email. Without SMTP configured, the email is printed to the console
 * so OTPs and notifications can still be tested locally.
 */
export async function sendMail({ to, subject, html, text }) {
  if (!to || (Array.isArray(to) && to.length === 0)) return;
  if (!mailEnabled) {
    if (env.nodeEnv === 'test') return;
    console.log(
      `\n[mail:console] To: ${[].concat(to).join(', ')}\n  Subject: ${subject}\n  ${text || ''}\n`
    );
    return;
  }
  await transporter.sendMail({ from: env.smtp.from, to, subject, html, text });
}
