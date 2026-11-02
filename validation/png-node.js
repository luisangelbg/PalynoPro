/* PalynoPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán. Free software under the GNU GPL v3 or later; see LICENSE. */
/* A small PNG reader for the validation scripts that run without a browser
   (the app itself reads PNG through the browser). Colour types 0, 2, 3, 4, 6
   at 8 bits, no interlace. → { w, h, data: Uint8Array } in grey levels. */
'use strict';
const zlib = require('zlib');
function readPNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let p = 8, w, h, depth, type, pal = null, idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), kind = buf.toString('ascii', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
    if (kind === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); depth = d[8]; type = d[9]; if (d[12]) throw new Error('interlaced'); }
    else if (kind === 'PLTE') pal = d;
    else if (kind === 'IDAT') idat.push(d);
    else if (kind === 'IEND') break;
    p += 12 + len;
  }
  if (depth !== 8) throw new Error('depth ' + depth);
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type], stride = w * ch, raw = zlib.inflateSync(Buffer.concat(idat));
  const px = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? px[dst + x - ch] : 0, b = y ? px[dst - stride + x] : 0, c = x >= ch && y ? px[dst - stride + x - ch] : 0;
      let v = raw[src + x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      px[dst + x] = v & 255;
    }
  }
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (type === 3) { const k = px[i] * 3; out[i] = Math.round(0.299 * pal[k] + 0.587 * pal[k + 1] + 0.114 * pal[k + 2]); }
    else if (type === 0 || type === 4) out[i] = px[i * ch];
    else out[i] = Math.round(0.299 * px[i * ch] + 0.587 * px[i * ch + 1] + 0.114 * px[i * ch + 2]);
  }
  return { w, h, data: out };
}
module.exports = { readPNG };
/* an RGB PNG from { w, h, rgb: Uint8Array(3wh) } */
function writePNG(w, h, rgb) {
  const crcT = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; }
  const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t, 'ascii'), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; Buffer.from(rgb.buffer, rgb.byteOffset + y * w * 3, w * 3).copy(raw, y * (w * 3 + 1) + 1); }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
module.exports.writePNG = writePNG;
