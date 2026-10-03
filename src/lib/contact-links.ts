// tel:/mailto: targets from the settings; null while a value still holds a [PLACEHOLDER].
export function contactLinks(settings: { telefon: string; email: string }): { tel: string | null; mailto: string | null } {
  const telefon = settings.telefon.trim();
  const email = settings.email.trim();
  return {
    tel: telefon.includes('[') ? null : `tel:${telefon.startsWith('+') ? '+' : ''}${telefon.replace(/\D/g, '')}`,
    mailto: email.includes('[') ? null : `mailto:${email}`,
  };
}
