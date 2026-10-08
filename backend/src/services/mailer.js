import nodemailer from 'nodemailer';
import Notification from '../models/Notification.js';
import { env } from '../config/env.js';

let transporter;

function getTransporter() {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    throw new Error('SMTP email delivery is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS.');
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return transporter;
}

// Sends through Brevo's HTTPS API (port 443), so it works on hosts that block SMTP.
async function sendViaBrevo({ to, subject, body, html }) {
  const m = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(env.MAIL_FROM || '');
  const sender = m ? { name: m[1].replace(/^"|"$/g, '') || 'HireFlow', email: m[2] } : { name: 'HireFlow', email: env.MAIL_FROM };
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sender, to: [{ email: to }], subject, textContent: body, ...(html ? { htmlContent: html } : {}) }),
  });
  if (!res.ok) throw new Error(`Brevo email failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
}

/**
 * Sends a real email (Brevo HTTPS API if BREVO_API_KEY is set, otherwise SMTP) and also records a safe audit entry.
 * The verification/reset tokens are never stored in the outbox.
 */
export async function sendMail({ to, subject, body, html, kind = 'general' }) {
  // Integration tests intentionally avoid external SMTP while exercising the full auth flow.
  if (env.NODE_ENV !== 'test') {
    if (env.BREVO_API_KEY) {
      await sendViaBrevo({ to, subject, body, html });
    } else {
      const tx = getTransporter();
      await tx.sendMail({
        from: env.MAIL_FROM,
        to,
        subject,
        text: body,
        ...(html ? { html } : {}),
      });
    }
  } else {
    console.log(`[test-email] to=${to} | ${subject}`);
  }

  try {
    await Notification.create({ to, subject, body, kind });
  } catch (err) {
    console.error('[email-audit] failed:', err.message);
  }
}
