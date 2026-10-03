// Renders the default social-share image to public/og-default.png. Run once: `node scripts/make-og-default.mjs`.
// System fonts only: the PNG is committed, so the build never depends on this script.
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const WIDTH = 1200;
const HEIGHT = 630;
const out = fileURLToPath(new URL('../public/og-default.png', import.meta.url));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#0F4C3A"/>
  <text x="${WIDTH / 2}" y="310" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="84" fill="#FFFFFF">Trezvenoumlje</text>
  <text x="${WIDTH / 2}" y="390" text-anchor="middle" font-family="sans-serif" font-size="36" fill="#E3ECE7">Trezven um. Snažna porodica. Stabilan život.</text>
</svg>`;

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out);
console.log(`make-og-default: ${out}`);
