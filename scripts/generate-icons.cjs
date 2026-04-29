'use strict';

/**
 * generate-icons.cjs
 * Generates PWA icons using pure Node.js built-ins (no external deps).
 * Uses a minimal PNG encoder with zlib.deflateSync for compression.
 *
 * Outputs:
 *   public/icons/icon-192.png         — 192×192, sky-blue bg + orange bird circle
 *   public/icons/icon-512.png         — 512×512, same colors
 *   public/icons/icon-maskable-512.png — 512×512, maskable (reduced circle for safe-zone)
 */

const zlib = require('node:zlib');
const fs = require('node:fs');
const path = require('node:path');

/** Write a 4-byte big-endian uint32 into a Buffer */
function writeUint32BE(buf, offset, value) {
  buf[offset] = (value >>> 24) & 0xff;
  buf[offset + 1] = (value >>> 16) & 0xff;
  buf[offset + 2] = (value >>> 8) & 0xff;
  buf[offset + 3] = value & 0xff;
}

/** Compute CRC32 for PNG chunk validation */
const CRC_TABLE = (function buildTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(data, offset, length) {
  let crc = 0xffffffff;
  for (let i = offset; i < offset + length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Build a single PNG chunk: length(4) + type(4) + data(n) + crc(4) */
function buildChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const dataLen = data ? data.length : 0;
  const chunk = Buffer.alloc(4 + 4 + dataLen + 4);

  writeUint32BE(chunk, 0, dataLen);
  typeBytes.copy(chunk, 4);
  if (data) data.copy(chunk, 8);

  // CRC covers type + data
  const crc = crc32(chunk, 4, 4 + dataLen);
  writeUint32BE(chunk, 8 + dataLen, crc);

  return chunk;
}

/**
 * Create a solid PNG with a filled circle overlay.
 *
 * @param {number} width
 * @param {number} height
 * @param {number[]} bgColor   [r, g, b] background
 * @param {number[]} circColor [r, g, b] circle fill
 * @param {number} cx          circle center x
 * @param {number} cy          circle center y
 * @param {number} radius      circle radius in pixels
 * @returns {Buffer} PNG file bytes
 */
function createPNG(width, height, bgColor, circColor, cx, cy, radius) {
  // Build raw image data: filter byte (0 = None) + RGB scanline per row
  const rowBytes = 1 + width * 3; // 1 filter byte + 3 bytes per pixel (RGB)
  const rawData = Buffer.alloc(rowBytes * height);

  const [bgR, bgG, bgB] = bgColor;
  const [cR, cG, cB] = circColor;
  const r2 = radius * radius;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // filter type: None

    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const inCircle = dx * dx + dy * dy <= r2;

      const pixOffset = rowOffset + 1 + x * 3;
      rawData[pixOffset] = inCircle ? cR : bgR;
      rawData[pixOffset + 1] = inCircle ? cG : bgG;
      rawData[pixOffset + 2] = inCircle ? cB : bgB;
    }
  }

  // Compress scanlines
  const compressed = zlib.deflateSync(rawData, { level: 6 });

  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR: width(4) height(4) bitDepth(1) colorType(1=RGB) compression(1) filter(1) interlace(1)
  const ihdrData = Buffer.alloc(13);
  writeUint32BE(ihdrData, 0, width);
  writeUint32BE(ihdrData, 4, height);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type: RGB (truecolor, no alpha)
  ihdrData[10] = 0; // compression: deflate
  ihdrData[11] = 0; // filter: adaptive
  ihdrData[12] = 0; // interlace: none

  const ihdrChunk = buildChunk('IHDR', ihdrData);
  const idatChunk = buildChunk('IDAT', compressed);
  const iendChunk = buildChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Color constants
const SKY_BLUE = [126, 200, 227];  // #7ec8e3
const ORANGE   = [255, 112,  67];  // #ff7043

// Output directory
const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

// icon-192.png — 192×192, circle radius 64
const png192 = createPNG(192, 192, SKY_BLUE, ORANGE, 96, 96, 64);
fs.writeFileSync(path.join(outDir, 'icon-192.png'), png192);
console.log('Written: public/icons/icon-192.png (' + png192.length + ' bytes)');

// icon-512.png — 512×512, circle radius 170
const png512 = createPNG(512, 512, SKY_BLUE, ORANGE, 256, 256, 170);
fs.writeFileSync(path.join(outDir, 'icon-512.png'), png512);
console.log('Written: public/icons/icon-512.png (' + png512.length + ' bytes)');

// icon-maskable-512.png — 512×512, radius 140 (20% safe-zone padding)
const pngMask = createPNG(512, 512, SKY_BLUE, ORANGE, 256, 256, 140);
fs.writeFileSync(path.join(outDir, 'icon-maskable-512.png'), pngMask);
console.log('Written: public/icons/icon-maskable-512.png (' + pngMask.length + ' bytes)');

console.log('Done — all 3 icons generated.');
