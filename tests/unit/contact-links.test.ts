import { describe, expect, it } from 'vitest';
import { contactLinks } from '../../src/lib/contact-links';

describe('contactLinks', () => {
  it('gives no links while the settings still hold placeholders', () => {
    expect(contactLinks({ telefon: '[TELEFON]', email: 'kontakt@[domen].rs' })).toEqual({ tel: null, mailto: null, viber: null });
  });
  it('keeps a leading + and digits only in tel:', () => {
    expect(contactLinks({ telefon: '+381 11 123-45-67', email: 'a@b.rs' }).tel).toBe('tel:+381111234567');
    expect(contactLinks({ telefon: '011/123 4567', email: 'a@b.rs' }).tel).toBe('tel:0111234567');
  });
  it('keeps a number written with spaces and a leading zero as dialled', () => {
    expect(contactLinks({ telefon: '064 859 6212', email: 'a@b.rs' }).tel).toBe('tel:0648596212');
  });
  it('builds the Viber chat link from the international number, with the + percent-encoded', () => {
    expect(contactLinks({ telefon: '[TELEFON]', email: 'a@b.rs', viber: '+381648596212' }).viber).toBe('viber://chat?number=%2B381648596212');
  });
  it('gives no Viber link without a number or while it is a placeholder', () => {
    expect(contactLinks({ telefon: '011 000 000', email: 'a@b.rs' }).viber).toBeNull();
    expect(contactLinks({ telefon: '011 000 000', email: 'a@b.rs', viber: undefined }).viber).toBeNull();
    expect(contactLinks({ telefon: '011 000 000', email: 'a@b.rs', viber: '[VIBER]' }).viber).toBeNull();
  });
  it('builds mailto: from a real address', () => {
    expect(contactLinks({ telefon: '[TELEFON]', email: 'a@b.rs' }).mailto).toBe('mailto:a@b.rs');
  });
});
