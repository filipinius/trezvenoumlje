const MAP: Record<string, string> = { đ: 'dj', Đ: 'dj', č: 'c', ć: 'c', š: 's', ž: 'z', Č: 'c', Ć: 'c', Š: 's', Ž: 'z' };

export function slugify(input: string): string {
  return input
    .replace(/[đĐčćšžČĆŠŽ]/g, (ch) => MAP[ch]!)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function hasCyrillic(input: string): boolean {
  return /[\u0400-\u04ff]/.test(input);
}

// [..] not preceded by "!" or "]" and not followed by "(" or "[" → not a Markdown link/image/reference use.
// A reference definition (line start, up to 3 spaces, "]:" then a URL/path target) is excluded too.
// "&lt;" covers "<" after HTML escaping in markPlaceholders.
const PLACEHOLDER =
  /(?<![!\]])(?!(?<=^ {0,3})\[[^\]\n]+\]: *(?:https?:\/\/|\/|<|&lt;|#))\[[^\]\n]+\](?![(\[])/gm;

export function findPlaceholders(input: string): string[] {
  return input.match(PLACEHOLDER) ?? [];
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function markPlaceholders(input: string): string {
  return escapeHtml(input).replace(PLACEHOLDER, (m) => `<mark class="ph">${m}</mark>`);
}
