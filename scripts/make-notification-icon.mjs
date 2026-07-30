#!/usr/bin/env node
/**
 * Generates assets/notification-icon.png — the Android status-bar icon.
 *
 * Android does not draw the small notification icon; it takes the icon's ALPHA
 * channel as a stencil and fills it with the channel's accent colour. Any
 * colour information is discarded. Handing it a full-colour app icon (which is
 * what expo-notifications falls back to when `icon` is unset) therefore renders
 * as an opaque white blob — every pixel is opaque, so the whole square fills.
 * That is why the notification "doesn't show" in the status bar even though it
 * fired and played its sound.
 *
 * So the icon has to be authored as white-on-transparent. Rather than commit a
 * binary nobody can diff, it's drawn here and encoded by hand (zlib + CRC32 is
 * the whole of PNG) so it stays reproducible: `node scripts/make-notification-icon.mjs`.
 *
 * Geometry follows the Material spec: a 96x96 canvas with the glyph confined to
 * the inner 72x72 (12px of breathing room on each side), which is what keeps it
 * from being clipped when the system scales it down.
 */
import { Buffer } from 'node:buffer';
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SIZE = 96;
const PAD = 12;
const INNER = SIZE - PAD * 2;
/** Supersampling factor — the alpha stencil is the entire icon, so jagged edges
 * are very visible once the system tints and scales it. */
const SS = 4;

/** Half-width of the bell dome at normalized height `y`, easing from the narrow
 * crown out to the flared mouth. */
function bellHalfWidth(y) {
  const t = Math.min(1, Math.max(0, (y - 0.14) / (0.72 - 0.14)));
  // easeOutQuad keeps the silhouette a bell rather than a triangle.
  const eased = 1 - (1 - t) * (1 - t);
  return 0.17 + eased * 0.21;
}

function insideCircle(x, y, cx, cy, r) {
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

/** Coverage test in normalized (0..1) glyph space. */
function isInk(x, y) {
  // Crown nub.
  if (insideCircle(x, y, 0.5, 0.13, 0.065)) return true;
  // Dome + flare.
  if (y >= 0.14 && y <= 0.72 && Math.abs(x - 0.5) <= bellHalfWidth(y)) return true;
  // Mouth rim.
  if (y > 0.72 && y <= 0.8 && Math.abs(x - 0.5) <= 0.43) return true;
  // Clapper.
  if (insideCircle(x, y, 0.5, 0.89, 0.085)) return true;
  return false;
}

// --- Rasterize to RGBA (white, varying alpha) -------------------------------
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let py = 0; py < SIZE; py++) {
  const rowStart = py * (SIZE * 4 + 1);
  raw[rowStart] = 0; // PNG filter type 0 (None)
  for (let px = 0; px < SIZE; px++) {
    let hits = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const gx = (px + (sx + 0.5) / SS - PAD) / INNER;
        const gy = (py + (sy + 0.5) / SS - PAD) / INNER;
        if (gx >= 0 && gx <= 1 && gy >= 0 && gy <= 1 && isInk(gx, gy)) hits++;
      }
    }
    const alpha = Math.round((hits / (SS * SS)) * 255);
    const o = rowStart + 1 + px * 4;
    // Pure white; only the alpha channel carries the shape.
    raw[o] = 255;
    raw[o + 1] = 255;
    raw[o + 2] = 255;
    raw[o + 3] = alpha;
  }
}

// --- Minimal PNG encoder ---------------------------------------------------
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([length, typed, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // colour type: truecolour + alpha
ihdr[10] = 0; // deflate
ihdr[11] = 0; // adaptive filtering
ihdr[12] = 0; // no interlace

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'notification-icon.png');
writeFileSync(out, png);
console.log(`wrote ${out} (${SIZE}x${SIZE}, ${png.length} bytes)`);
