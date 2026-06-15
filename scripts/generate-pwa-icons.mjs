/**
 * PWA icon generator — Life Manager (مدیر زندگی)
 * --------------------------------------------------
 * Renders the full professional PWA icon set from inline, brand-matched SVG
 * sources into `public/icons/`. Single source of truth: edit the SVGs below
 * and re-run.
 *
 * This is a DEV-only, run-on-demand tool. `sharp` is intentionally NOT a
 * project dependency (keeps the Netlify build lean and risk-free). To
 * regenerate after a design change:
 *
 *     npm install sharp --no-save
 *     node scripts/generate-pwa-icons.mjs
 *
 * Brand: Indigo-Violet #6D5EF6 / #8B7CFF on dark navy #0a0c16 (the dashboard
 * finance-hero gradient is mirrored here so the icon matches the app).
 * Shortcut glyphs are the app's own lucide icons (lucide, ISC license) so the
 * long-press shortcut menu looks native to the UI.
 */
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/icons');

/* ---------- brand tokens ---------- */
const GRAD_A = '#574bd3'; // deep indigo  (matches dashboard hero 0%)
const GRAD_B = '#6d5ef6'; // brand        (55%)
const GRAD_C = '#7e6ff8'; // brand light  (100%)
const NAVY_A = '#161a33';
const NAVY_B = '#0a0c16';

/* ---------- shared building blocks (512×512 canvas) ---------- */

// Gradient + glassy top halo, reused by every app-icon variant.
const defs = `
  <linearGradient id="bg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="${GRAD_A}"/>
    <stop offset="0.55" stop-color="${GRAD_B}"/>
    <stop offset="1" stop-color="${GRAD_C}"/>
  </linearGradient>
  <radialGradient id="halo" cx="256" cy="110" r="340" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#ffffff" stop-opacity="0.18"/>
    <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="area" x1="0" y1="170" x2="0" y2="356" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#ffffff" stop-opacity="0.24"/>
    <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
  </linearGradient>
  <radialGradient id="dot" cx="372" cy="184" r="48" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#ffffff" stop-opacity="0.42"/>
    <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
  </radialGradient>`;

// The emblem: a rising area-chart line with a glowing peak — the app's
// ProgressRing/Sparkline identity distilled into a finance-growth mark.
// `scale` shrinks it toward the centre for the maskable safe zone.
const emblem = (scale = 1) => `
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <path d="M150 322 L224 252 L290 292 L372 184 L372 356 L150 356 Z" fill="url(#area)"/>
    <circle cx="372" cy="184" r="48" fill="url(#dot)"/>
    <path d="M150 322 L224 252 L290 292 L372 184" fill="none" stroke="#ffffff"
      stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="372" cy="184" r="21" fill="#ffffff"/>
  </g>`;

// App icon — `purpose: any`. Rounded squircle, transparent corners.
const iconAny = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>${defs}</defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <rect width="512" height="512" rx="112" fill="url(#halo)"/>
  ${emblem(1)}
</svg>`;

// App icon — `purpose: maskable`. Full bleed; emblem inside the 80% safe zone.
const iconMaskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>${defs}</defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <rect width="512" height="512" fill="url(#halo)"/>
  ${emblem(0.82)}
</svg>`;

// Apple touch icon — full opaque square (iOS rounds the corners itself).
const iconApple = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>${defs}</defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <rect width="512" height="512" fill="url(#halo)"/>
  ${emblem(0.9)}
</svg>`;

// Favicon — simplified bold mark that stays legible down to 16px.
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${GRAD_A}"/>
      <stop offset="0.55" stop-color="${GRAD_B}"/>
      <stop offset="1" stop-color="${GRAD_C}"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="104" fill="url(#bg)"/>
  <path d="M132 344 L256 248 L380 168" fill="none" stroke="#ffffff"
    stroke-width="48" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="380" cy="168" r="34" fill="#ffffff"/>
</svg>`;

/* ---------- shortcut tiles (app's own lucide glyphs, ISC) ---------- */

// lucide icons render on a 24×24 grid; centre + scale onto the 512 canvas.
const lucideTile = (accent, nodes) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="t" x1="0" y1="0" x2="0" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${NAVY_A}"/>
      <stop offset="1" stop-color="${NAVY_B}"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="120" fill="url(#t)"/>
  <rect x="8" y="8" width="496" height="496" rx="116" fill="none" stroke="${GRAD_B}" stroke-opacity="0.35" stroke-width="6"/>
  <g transform="translate(256 256) scale(9.5) translate(-12 -12)" fill="none" stroke="${accent}"
     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    ${nodes}
  </g>
</svg>`;

// Glyph node sets copied verbatim from lucide-react v0.553.0 (the app's icons).
const SC = {
  accountant: lucideTile('#34d399', `
    <rect width="16" height="20" x="4" y="2" rx="2"/>
    <line x1="8" x2="16" y1="6" y2="6"/>
    <line x1="16" x2="16" y1="14" y2="18"/>
    <path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/>
    <path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/>`),
  assets: lucideTile('#38bdf8', `
    <circle cx="8" cy="8" r="6"/>
    <path d="M18.09 10.37A6 6 0 1 1 10.34 18"/>
    <path d="M7 6h1v4"/>
    <path d="m16.71 13.88.7.71-2.82 2.82"/>`),
  tasks: lucideTile('#fb7185', `
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <path d="m9 14 2 2 4-4"/>`),
  car: lucideTile('#8b7cff', `
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
    <circle cx="7" cy="17" r="2"/>
    <path d="M9 17h6"/>
    <circle cx="17" cy="17" r="2"/>`),
};

/* ---------- emit ---------- */
const png = (svg, size, file) =>
  sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toFile(path.join(OUT, file));

const svgFile = (svg, file) => writeFile(path.join(OUT, file), svg.trim() + '\n', 'utf8');

await Promise.all([
  // Scalable SVGs served directly (overwrite the old green placeholders).
  svgFile(iconAny, 'icon-512.svg'),
  svgFile(iconAny, 'icon-192.svg'),
  svgFile(favicon, 'favicon.svg'),
  // App icons — any + maskable.
  png(iconAny, 512, 'icon-512.png'),
  png(iconAny, 192, 'icon-192.png'),
  png(iconMaskable, 512, 'icon-512-maskable.png'),
  png(iconMaskable, 192, 'icon-192-maskable.png'),
  // Apple + favicons.
  png(iconApple, 180, 'apple-touch-icon.png'),
  png(favicon, 32, 'favicon-32.png'),
  png(favicon, 16, 'favicon-16.png'),
  // Shortcut tiles.
  png(SC.accountant, 96, 'sc-accountant.png'),
  png(SC.assets, 96, 'sc-assets.png'),
  png(SC.tasks, 96, 'sc-tasks.png'),
  png(SC.car, 96, 'sc-car.png'),
]);

console.log('✓ PWA icons generated in public/icons/');
