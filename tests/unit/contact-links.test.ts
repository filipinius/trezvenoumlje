import { describe, expect, it } from 'vitest';
import { contactLinks } from '../../src/lib/contact-links';

describe('contactLinks', () => {
  it('gives no links while the settings still hold placeholders', () => {
    expect(contactLinks({ telefon: '[TELEFON]', email: 'kontakt@[domen].rs' })).toEqual({ tel: null, mailto: null });
  });
  it('keeps a leading + and digits only in tel:', () => {
    expect(contactLinks({ telefon: '+381 11 123-45-67', email: 'a@b.rs' }).tel).toBe('tel:+381111234567');
    expect(contactLinks({ telefon: '011/123 4567', email: 'a@b.rs' }).tel).toBe('tel:0111234567');
  });
  it('builds mailto: from a real address', () => {
    expect(contactLinks({ telefon: '[TELEFON]', email: 'a@b.rs' }).mailto).toBe('mailto:a@b.rs');
  });
});
