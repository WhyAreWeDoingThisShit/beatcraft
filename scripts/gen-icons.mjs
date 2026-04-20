import { deflateSync } from "zlib";
import { writeFileSync, mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcVal = crc32(Buffer.concat([typeBytes, data]));
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

// Simple bitmap "B" glyphs at 7x9 pixels (scaled up)
const B_GLYPH = [
  [1, 1, 1, 1, 0],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
  [1, 1, 1, 1, 0],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
  [1, 1, 1, 1, 0],
];

function generatePNG(size) {
  // slate-900 background: #0f172a = 15, 23, 42
  const bgR = 15, bgG = 23, bgB = 42;
  // slate-50 foreground: #f8fafc = 248, 250, 252
  const fgR = 248, fgG = 250, fgB = 252;

  const glyphH = B_GLYPH.length;
  const glyphW = B_GLYPH[0].length;
  // Scale glyph to ~55% of icon size
  const scale = Math.floor(size * 0.55 / glyphH);
  const totalGlyphW = glyphW * scale;
  const totalGlyphH = glyphH * scale;
  const offX = Math.floor((size - totalGlyphW) / 2);
  const offY = Math.floor((size - totalGlyphH) / 2);

  // Build scanlines: filter byte (0) + RGB pixels
  const scanlines = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    const rowOff = y * (1 + size * 3);
    scanlines[rowOff] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      // Is this pixel part of the glyph?
      const gx = Math.floor((x - offX) / scale);
      const gy = Math.floor((y - offY) / scale);
      let fg = false;
      if (gx >= 0 && gx < glyphW && gy >= 0 && gy < glyphH) {
        fg = B_GLYPH[gy][gx] === 1;
      }
      const pixOff = rowOff + 1 + x * 3;
      scanlines[pixOff] = fg ? fgR : bgR;
      scanlines[pixOff + 1] = fg ? fgG : bgG;
      scanlines[pixOff + 2] = fg ? fgB : bgB;
    }
  }

  const idat = deflateSync(scanlines);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type: RGB
  // compression=0, filter=0, interlace=0 already zeroed

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdrData),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

writeFileSync("public/icons/icon-192.png", generatePNG(192));
writeFileSync("public/icons/icon-512.png", generatePNG(512));
console.log("Icons generated: public/icons/icon-192.png, public/icons/icon-512.png");
