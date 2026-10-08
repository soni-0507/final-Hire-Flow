import dns from 'node:dns/promises';

// Common disposable/temporary mailbox domains. This is intentionally a small
// built-in safety net; the real ownership check is still mailbox verification.
const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com', '10minutemail.net', 'guerrillamail.com', 'guerrillamail.net',
  'guerrillamail.org', 'mailinator.com', 'maildrop.cc', 'tempmail.com',
  'temp-mail.org', 'temp-mail.io', 'throwawaymail.com', 'yopmail.com',
  'yopmail.fr', 'yopmail.net', 'getnada.com', 'emailondeck.com',
  'dispostable.com', 'fakeinbox.com', 'sharklasers.com', 'grr.la',
  'guerrillamailblock.com', 'spam4.me', 'trashmail.com', 'trashmail.me',
  'trashmail.net', 'mintemail.com', 'mailnesia.com', 'moakt.com',
  'mailcatch.com', 'mailcatch.org', 'mytrashmail.com', 'mailforspam.com',
  'discard.email', 'discardmail.com', 'inboxbear.com', 'mohmal.com',
  'burnermail.io', 'emailfake.com', 'tempr.email', 'tmpmail.org',
  'tmpmail.net', 'mailpoof.com', 'getairmail.com', '33mail.com',
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function validateMailboxDomain(email) {
  const normalized = String(email || '').trim().toLowerCase();
  const domain = normalized.split('@').pop() || '';

  if (!EMAIL_RE.test(normalized)) {
    return { valid: false, code: 'INVALID_EMAIL', message: 'Enter a valid email address.' };
  }

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      valid: false,
      code: 'DISPOSABLE_EMAIL',
      message: 'Temporary or disposable email addresses are not allowed. Use a permanent email address.',
    };
  }

  // Local tests use fake addresses intentionally; don't require public DNS there.
  if (process.env.NODE_ENV === 'test') return { valid: true, domain, skippedDns: true };

  try {
    const mx = await dns.resolveMx(domain);
    if (mx?.length) return { valid: true, domain, hasMx: true };
  } catch (err) {
    // RFC-style fallback: a domain can receive mail via its A/AAAA record when
    // it publishes no MX record. We still require the domain to resolve.
    if (!['ENODATA', 'ENOTFOUND', 'SERVFAIL', 'ETIMEOUT'].includes(err.code)) {
      return { valid: false, code: 'DNS_ERROR', message: 'We could not validate this email domain right now.' };
    }
  }

  try {
    const [a, aaaa] = await Promise.allSettled([
      dns.resolve4(domain),
      dns.resolve6(domain),
    ]);
    if ((a.status === 'fulfilled' && a.value.length) || (aaaa.status === 'fulfilled' && aaaa.value.length)) {
      return { valid: true, domain, hasMx: false, hasAddress: true };
    }
  } catch {
    // Handled by the result check below.
  }

  return {
    valid: false,
    code: 'DOMAIN_NOT_REACHABLE',
    message: 'That email domain does not appear to accept email. Check the address and try again.',
  };
}
