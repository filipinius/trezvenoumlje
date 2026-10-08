// Main menu, in the order of the desktop header. Paths are site paths: pass them through href().
// `owns` lists pages outside the item's own address that belong to it (their breadcrumb runs through it).
export const NAV: { label: string; path: string; owns?: string[] }[] = [
  { label: 'O nama', path: '/o-nama/', owns: ['/dr-dragan-vukadinovic/'] },
  { label: 'Usluge', path: '/usluge/' },
  { label: 'Programi', path: '/programi/' },
  { label: 'Za organizacije', path: '/organizacije/' },
  { label: 'Pričamo priču', path: '/pricamo-pricu/' },
  { label: 'Trezvene misli', path: '/resursi/' },
  { label: 'Knjige i mediji', path: '/knjige/' },
];
