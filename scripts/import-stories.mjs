// scripts/import-stories.mjs — one-off import. Re-running overwrites files but IDs are derived
// from story number, so they stay stable.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const src = JSON.parse(readFileSync('design-source/stories.json', 'utf8'));
const pad = (n) => String(n).padStart(2, '0');
mkdirSync('src/content/price', { recursive: true });
mkdirSync('src/content/nedelje', { recursive: true });
mkdirSync('src/assets/img/price', { recursive: true });

// The source has two defects: week 2's label is "##" with the real label as the first intro
// paragraph, and week 8's intro starts with a stray "##".
for (const w of src.weeks) {
  let intro = w.intro.filter((p) => p.trim() !== '##');
  let label = w.label;
  if (label.trim() === '##') { label = intro[0]; intro = intro.slice(1); }
  const out = {
    status: 'objavljeno', n: w.n, oznaka: label, tema: w.theme, uvod: intro,
    osvrt: { naslov: w.review.title, napomena: w.review.note,
      pitanja: w.review.qs.map((tekst, i) => ({ id: `n${pad(w.n)}-o${i + 1}`, tekst })) },
  };
  writeFileSync(`src/content/nedelje/${pad(w.n)}.json`, JSON.stringify(out, null, 2) + '\n');
}

for (const s of src.stories) {
  let slika;
  if (s.img) {
    const id = s.img.split('/').pop();
    slika = `${s.slug}.webp`;
    copyFileSync(`design-source/assets/${id}.webp`, `src/assets/img/price/${slika}`);
  }
  const out = {
    status: 'objavljeno', id: `p${pad(s.n)}`, n: s.n, nedelja: s.w, dan: s.day, naslov: s.title, slug: s.slug,
    podnaslov: s.q, izvor: s.source, ...(slika ? { slika } : {}), tekst: s.text,
    pitanja: s.questions.map((tekst, i) => ({ id: `p${pad(s.n)}-q${i + 1}`, tekst })),
    poruka: s.message, zadatak: s.task, citat: s.quote,
  };
  writeFileSync(`src/content/price/${pad(s.n)}-${s.slug}.json`, JSON.stringify(out, null, 2) + '\n');
}
console.log(`Imported ${src.stories.length} stories, ${src.weeks.length} weeks.`);
