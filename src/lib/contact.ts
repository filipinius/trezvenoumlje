export interface ContactValues { name: string; contact: string; type: string; message: string; consent: boolean; website: string }
export type ContactErrors = { name?: true; contact?: true; consent?: true };
export type ContactOutcome = { status: 'invalid'; errors: ContactErrors } | { status: 'sent' } | { status: 'failed' };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9][0-9 /-]{5,}$/;

export function validateContact(v: ContactValues): { ok: boolean; errors: ContactErrors } {
  const errors: ContactErrors = {};
  const c = v.contact.trim();
  const digits = c.replace(/\D/g, '').length;
  if (v.name.trim().length === 0) errors.name = true;
  if (!(EMAIL.test(c) || (PHONE.test(c) && digits >= 6))) errors.contact = true;
  if (!v.consent) errors.consent = true;
  return { ok: Object.keys(errors).length === 0, errors };
}
export function isSpam(v: ContactValues): boolean { return v.website.trim().length > 0; }

/**
 * One submit attempt, without any DOM: the form script only renders the outcome.
 * A filled honeypot reports success and sends nothing, so a bot learns nothing from the answer.
 */
export async function processContact(
  v: ContactValues,
  send: (values: ContactValues) => Promise<{ ok: boolean }>,
): Promise<ContactOutcome> {
  // A tripped honeypot silently discards the request behind a success message: revisit when a real backend is wired.
  if (isSpam(v)) return { status: 'sent' };
  const { ok, errors } = validateContact(v);
  if (!ok) return { status: 'invalid', errors };
  try {
    const result = await send({ ...v, name: v.name.trim(), contact: v.contact.trim(), message: v.message.trim() });
    return { status: result.ok ? 'sent' : 'failed' };
  } catch {
    return { status: 'failed' };
  }
}
