// make-icons.mjs — build-time generator for the toolbar/store icons.
// Renders Blip's 16x16 "normal" frame onto a rounded tomato shell at 16/32/48/128.
// Zero dependencies: hand-rolled PNG encoder (RGBA, filter 0, deflate via node:zlib).
//
//   node scripts/make-icons.mjs

import fs from "node:fs";
import zlib from "node:zlib";

// Single source of truth: read the frame data out of sprite.js (an ES module)
// without needing a package.json "type" declaration.
const spriteSrc = fs.readFileSync(new URL("../sprite.js", import.meta.url), "utf8");
const { FRAMES } = new Function(`${spriteSrc.replace(/export\s+/g, "")}; return { FRAMES };`)();

const frame = FRAMES.normal;
for (const row of frame) {
  if (row.length !== 16) throw new Error(`bad sprite row width: "${row}"`);
}
if (frame.length !== 16) throw new Error("sprite must be 16 rows");

// icon palette: tomato shell, LCD-cream creature, ink lines
const COLORS = {
  ".": [227, 66, 46, 255], // shell tomato
  o: [35, 42, 30, 255],
  b: [201, 210, 182, 255],
  h: [222, 229, 202, 255],
  e: [35, 42, 30, 255],
  m: [35, 42, 30, 255],
  c: [230, 152, 130, 255],
  LIGHT: [240, 112, 94, 255], // beveled top/left edge
  DARK: [181, 42, 28, 255], // beveled bottom/right edge
};

// cells clipped for rounded corners (radius ~2 cells)
const CUT = new Set(["0,0", "1,0", "0,1", "15,0", "14,0", "15,1", "0,15", "0,14", "1,15", "15,15", "14,15", "15,14"]);

function cellColor(cx, cy) {
  if (CUT.has(`${cx},${cy}`)) return [0, 0, 0, 0];
  const ch = frame[cy][cx];
  if (ch !== ".") return COLORS[ch];
  if (cy === 0 || cx === 0) return COLORS.LIGHT;
  if (cy === 15 || cx === 15) return COLORS.DARK;
  return COLORS["."];
}

function crc32(buf) {
  if (!crc32.table) {
    crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crc32.table[n] = c;
    }
  }
  let c = ~0;
  for (const b of buf) c = crc32.table[(c ^ b) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePng(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // filter: none
    rgba.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

for (const size of [16, 32, 48, 128]) {
  const scale = size / 16;
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = cellColor(Math.floor(x / scale), Math.floor(y / scale));
      const i = (y * size + x) * 4;
      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = a;
    }
  }
  const file = new URL(`../icons/icon${size}.png`, import.meta.url);
  fs.writeFileSync(file, encodePng(size, rgba));
  console.log(`wrote icons/icon${size}.png`);
}
