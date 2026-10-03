// Dates in content are calendar days stored as UTC midnight; formatting in UTC keeps the day stable on any build machine.
const DATE = new Intl.DateTimeFormat('sr-Latn', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** "3. oktobar 2026." */
export const formatDate = (date: Date): string => DATE.format(date);
/** "2026-10-03", for <time datetime>. */
export const isoDate = (date: Date): string => date.toISOString().slice(0, 10);
