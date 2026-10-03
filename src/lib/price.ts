export type PrikazCene = 'tacna' | 'od' | 'na-upit' | 'skriveno';
export function priceLabel(prikaz: PrikazCene, cena?: string): string | null {
  if (prikaz === 'skriveno') return null;
  if (prikaz === 'na-upit') return 'Na upit';
  if (!cena) return null;
  return prikaz === 'od' ? `od ${cena}` : cena;
}
