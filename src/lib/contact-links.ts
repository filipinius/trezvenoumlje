// tel:/mailto:/viber: targets from the settings; null while a value still holds a [PLACEHOLDER] (or, for Viber, is not set).
export function contactLinks(settings: { telefon: string; email: string; viber?: string }): { tel: string | null; mailto: string | null; viber: string | null } {
  const telefon = settings.telefon.trim();
  const email = settings.email.trim();
  const viber = settings.viber?.trim();
  return {
    tel: telefon.includes('[') ? null : `tel:${telefon.startsWith('+') ? '+' : ''}${telefon.replace(/\D/g, '')}`,
    mailto: email.includes('[') ? null : `mailto:${email}`,
    // Viber wants the international number with its + percent-encoded.
    viber: !viber || viber.includes('[') ? null : `viber://chat?number=%2B${viber.replace(/\D/g, '')}`,
  };
}
