import { describe, expect, test, vi } from 'vitest';
import { isSpam, processContact, validateContact, type ContactValues } from '../../src/lib/contact';
import { submitContact } from '../../src/lib/contact-transport';

const ok: ContactValues = { name: 'M. P.', contact: 'ime@example.rs', type: '', message: '', consent: true, website: '' };

describe('validateContact', () => {
  test('minimal valid input passes', () => { expect(validateContact(ok)).toEqual({ ok: true, errors: {} }); });
  test.each(['+381 64 123-45-67', '064/123 4567', '0641234567', 'IME.PREZIME@EXAMPLE.RS', '  ime@example.rs  '])(
    'accepts contact %s', (contact) => { expect(validateContact({ ...ok, contact }).ok).toBe(true); });
  test.each(['', '   ', 'ime@', '@example.rs', 'ime example.rs', '12345', 'abc', '+++++++'])(
    'rejects contact "%s"', (contact) => { expect(validateContact({ ...ok, contact }).errors.contact).toBe(true); });
  test('whitespace-only name fails', () => { expect(validateContact({ ...ok, name: '   ' }).errors.name).toBe(true); });
  test('consent is required', () => { expect(validateContact({ ...ok, consent: false }).errors.consent).toBe(true); });
  test('reports all errors at once', () => {
    expect(validateContact({ ...ok, name: '', contact: '', consent: false }).errors).toEqual({ name: true, contact: true, consent: true });
  });
});

test('honeypot marks spam', () => {
  expect(isSpam(ok)).toBe(false);
  expect(isSpam({ ...ok, website: 'http://x' })).toBe(true);
});

describe('processContact', () => {
  test('invalid input is never handed to the transport', async () => {
    const send = vi.fn(async () => ({ ok: true }));
    expect(await processContact({ ...ok, consent: false }, send)).toEqual({ status: 'invalid', errors: { consent: true } });
    expect(send).not.toHaveBeenCalled();
  });
  test('valid input is sent once, trimmed', async () => {
    const send = vi.fn(async () => ({ ok: true }));
    expect(await processContact({ ...ok, name: '  Mila ', contact: ' a@b.rs ', message: ' zdravo ' }, send)).toEqual({ status: 'sent' });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ ...ok, name: 'Mila', contact: 'a@b.rs', message: 'zdravo' });
  });
  test('a filled honeypot looks like success and sends nothing, even when the rest is invalid', async () => {
    const send = vi.fn(async () => ({ ok: true }));
    expect(await processContact({ ...ok, name: '', website: 'http://x' }, send)).toEqual({ status: 'sent' });
    expect(send).not.toHaveBeenCalled();
  });
  test('a transport that answers ok: false is a failure', async () => {
    expect(await processContact(ok, async () => ({ ok: false }))).toEqual({ status: 'failed' });
  });
  test('a transport that throws is a failure', async () => {
    expect(await processContact(ok, async () => { throw new Error('offline'); })).toEqual({ status: 'failed' });
  });
});

test('the preview transport resolves ok without touching the network', async () => {
  const fetchSpy = vi.fn();
  vi.stubGlobal('fetch', fetchSpy);
  try {
    expect(await submitContact(ok)).toEqual({ ok: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
  }
});
