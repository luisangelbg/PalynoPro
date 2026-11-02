/* PalynoPro — quantitative pollen morphometry from electron micrographs.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* PalynoPro — reading images and their metadata (ImgIO).
   · A TIFF reader written here: baseline strips and tiles, no compression,
     LZW (with the horizontal predictor), PackBits and Deflate; gray, palette
     and RGB images of 8 or 16 bits. Electron microscopes write TIFF, and a
     browser cannot show it by itself.
   · The text that microscopes leave in the TIFF or in a side file of the same
     name, read for the magnification and, when present, the size of a pixel.
   · The index of a set of images (a CSV) and a key of group names.
   Every image becomes { w, h, data: Uint8Array } with one gray level per
   pixel (0 = black). The file has no DOM, so the tests load it by itself;
   decoding PNG and JPEG (fromFile) needs the browser. */
(function () {
  'use strict';
  const IO = {};
  /* the reasons a file cannot be read, in the language of the interface (English when the file is loaded alone) */
  const tr = (es, en) => (typeof T === 'function' ? T(es, en) : en);

  /* ============================ TIFF ============================ */
  const TYPE_SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8, 16: 8 };

  function readIFD(dv, off, le) {
    const n = dv.getUint16(off, le), tags = {};
    for (let i = 0; i < n; i++) {
      const p = off + 2 + i * 12, tag = dv.getUint16(p, le), type = dv.getUint16(p + 2, le), count = dv.getUint32(p + 4, le);
      const size = (TYPE_SIZE[type] || 1) * count;
      const at = size <= 4 ? p + 8 : dv.getUint32(p + 8, le);
      if (at + size > dv.byteLength) continue;
      const vals = [];
      if (type === 2) {
        let s = '';
        for (let k = 0; k < count; k++) { const c = dv.getUint8(at + k); if (c) s += String.fromCharCode(c); else s += '\n'; }
        tags[tag] = s;
        continue;
      }
      for (let k = 0; k < count; k++) {
        if (type === 3) vals.push(dv.getUint16(at + 2 * k, le));
        else if (type === 4) vals.push(dv.getUint32(at + 4 * k, le));
        else if (type === 5) vals.push(dv.getUint32(at + 8 * k, le) / (dv.getUint32(at + 8 * k + 4, le) || 1));
        else if (type === 8) vals.push(dv.getInt16(at + 2 * k, le));
        else if (type === 9) vals.push(dv.getInt32(at + 4 * k, le));
        else if (type === 11) vals.push(dv.getFloat32(at + 4 * k, le));
        else if (type === 12) vals.push(dv.getFloat64(at + 8 * k, le));
        else vals.push(dv.getUint8(at + k));
        if (k > 400000) break;
      }
      tags[tag] = vals;
    }
    return { tags, next: dv.getUint32(off + 2 + n * 12, le) };
  }

  /* LZW of the TIFF 6.0 specification (codes start at 9 bits, early change) */
  function lzw(src, expected) {
    const out = new Uint8Array(expected || src.length * 4);
    let op = 0, bitPos = 0, width = 9;
    const dict = [], total = src.length * 8;
    const reset = () => { dict.length = 0; for (let i = 0; i < 256; i++) dict.push([i]); dict.push(null, null); width = 9; };
    const read = () => {
      if (bitPos + width > total) return 257;
      let v = 0;
      for (let i = 0; i < width; i++) { const b = bitPos + i; v = (v << 1) | ((src[b >> 3] >> (7 - (b & 7))) & 1); }
      bitPos += width;
      return v;
    };
    const put = arr => { for (let i = 0; i < arr.length && op < out.length; i++) out[op++] = arr[i]; };
    reset();
    let old = null;
    for (;;) {
      const code = read();
      if (code === 257) break;
      if (code === 256) {
        reset();
        const c = read();
        if (c === 257) break;
        put(dict[c]); old = dict[c];
        continue;
      }
      let entry;
      if (code < dict.length && dict[code]) entry = dict[code];
      else if (old) entry = old.concat([old[0]]);
      else break;
      put(entry);
      if (old) dict.push(old.concat([entry[0]]));
      old = entry;
      const n = dict.length + 1;
      if (n >= 4096) width = 12; else if (n >= 2048) width = 12; else if (n >= 1024) width = 11; else if (n >= 512) width = 10;
      if (op >= out.length) break;
    }
    return out.subarray(0, op);
  }
  function packbits(src, expected) {
    const out = new Uint8Array(expected);
    let i = 0, o = 0;
    while (i < src.length && o < expected) {
      const n = (src[i] << 24) >> 24; i++;
      if (n >= 0) { for (let k = 0; k <= n && o < expected; k++) out[o++] = src[i++]; }
      else if (n !== -128) { const v = src[i++]; for (let k = 0; k < 1 - n && o < expected; k++) out[o++] = v; }
    }
    return out;
  }
  async function inflate(src) {
    if (typeof DecompressionStream === 'undefined') throw new Error(tr('este navegador no descomprime Deflate', 'this browser cannot decompress Deflate'));
    const ds = new DecompressionStream('deflate');
    const stream = new Blob([src]).stream().pipeThrough(ds);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  /* the TIFF in an ArrayBuffer → { w, h, data, bits, text, kind } (the first image of the file) */
  async function decodeTIFF(buf) {
    const dv = new DataView(buf), b0 = dv.getUint8(0), b1 = dv.getUint8(1);
    if (!((b0 === 0x49 && b1 === 0x49) || (b0 === 0x4d && b1 === 0x4d))) throw new Error(tr('no es un TIFF', 'not a TIFF'));
    const le = b0 === 0x49;
    if (dv.getUint16(2, le) !== 42) throw new Error(tr('no es un TIFF', 'not a TIFF'));
    const { tags } = readIFD(dv, dv.getUint32(4, le), le);
    const one = (t, d) => (tags[t] == null ? d : Array.isArray(tags[t]) ? tags[t][0] : tags[t]);
    const w = one(256), h = one(257), bpsArr = tags[258] || [1], bps = bpsArr[0], spp = one(277, 1), comp = one(259, 1), photo = one(262, 1);
    const pred = one(317, 1), planar = one(284, 1), fmt = one(339, 1);
    if (!(w > 0 && h > 0)) throw new Error(tr('TIFF sin tamaño', 'TIFF without size'));
    if (planar !== 1 && spp > 1) throw new Error(tr('TIFF con los canales en planos separados: no se admite', 'TIFF planar layout not supported'));
    if (![1, 8, 16, 32].includes(bps)) throw new Error(tr('TIFF de ' + bps + ' bits: no se admite', 'TIFF of ' + bps + ' bits not supported'));
    const bytesPx = Math.max(1, (bps * spp) / 8), rowBytes = bps === 1 ? Math.ceil(w * spp / 8) : w * bytesPx;
    const tiled = tags[322] != null;
    const tw = tiled ? one(322) : w, th = tiled ? one(323) : one(278, h);
    const offs = tiled ? tags[324] : tags[273], cnts = tiled ? tags[325] : tags[279];
    if (!offs) throw new Error(tr('TIFF sin datos de imagen', 'TIFF without image data'));
    const tileRow = bps === 1 ? Math.ceil(tw * spp / 8) : tw * bytesPx;
    const raw = new Uint8Array(rowBytes * h);
    const across = tiled ? Math.ceil(w / tw) : 1;
    const decodePiece = async (k) => {
      const off = offs[k], cnt = cnts ? cnts[k] : buf.byteLength - off;
      const src = new Uint8Array(buf, off, Math.min(cnt, buf.byteLength - off));
      const rows = tiled ? th : Math.min(th, h - k * th);
      const expect = tileRow * rows;
      let d;
      if (comp === 1) d = src;
      else if (comp === 5) d = lzw(src, expect);
      else if (comp === 32773) d = packbits(src, expect);
      else if (comp === 8 || comp === 32946) d = await inflate(src);
      else throw new Error(tr('TIFF con compresión ' + comp + ': no se admite', 'TIFF compression ' + comp + ' not supported'));
      if (pred === 2 && bps === 8) {
        for (let r = 0; r < rows; r++) { const o = r * tileRow; for (let x = spp; x < tileRow; x++) d[o + x] = (d[o + x] + d[o + x - spp]) & 255; }
      } else if (pred === 2 && bps === 16) {
        const v = new DataView(d.buffer, d.byteOffset, d.byteLength);
        for (let r = 0; r < rows; r++) for (let x = spp; x < tw * spp; x++) { const o = r * tileRow + 2 * x; v.setUint16(o, (v.getUint16(o, le) + v.getUint16(o - 2 * spp, le)) & 65535, le); }
      }
      return { d, rows };
    };
    for (let k = 0; k < offs.length; k++) {
      const { d, rows } = await decodePiece(k);
      if (!tiled) { raw.set(d.subarray(0, Math.min(d.length, rowBytes * rows)), k * th * rowBytes); continue; }
      const tx = (k % across) * tw, ty = Math.floor(k / across) * th;
      for (let r = 0; r < th && ty + r < h; r++) {
        const n = Math.min(tileRow, rowBytes - (bps === 1 ? Math.ceil(tx * spp / 8) : tx * bytesPx));
        const dst = (ty + r) * rowBytes + (bps === 1 ? Math.ceil(tx * spp / 8) : tx * bytesPx);
        raw.set(d.subarray(r * tileRow, r * tileRow + n), dst);
      }
    }
    /* to one gray level per pixel */
    const out = new Uint8Array(w * h);
    const rd = new DataView(raw.buffer);
    const cmap = tags[320];
    if (bps === 1) {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const bit = (raw[y * rowBytes + (x >> 3)] >> (7 - (x & 7))) & 1;
        out[y * w + x] = (photo === 0 ? 1 - bit : bit) * 255;
      }
    } else if (photo === 3 && cmap) {
      const n = 1 << bps;
      for (let i = 0; i < w * h; i++) {
        const v = bps === 8 ? raw[i] : rd.getUint16(2 * i, le);
        const R = cmap[v] / 257, G = cmap[n + v] / 257, B = cmap[2 * n + v] / 257;
        out[i] = Math.round(0.299 * R + 0.587 * G + 0.114 * B);
      }
    } else if (bps === 8) {
      for (let i = 0; i < w * h; i++) {
        const o = i * spp;
        let v = spp >= 3 ? Math.round(0.299 * raw[o] + 0.587 * raw[o + 1] + 0.114 * raw[o + 2]) : raw[o];
        out[i] = photo === 0 ? 255 - v : v;
      }
    } else {
      /* 16 or 32 bits: the actual range is stretched to 0–255 */
      const vals = new Float64Array(w * h);
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i < w * h; i++) {
        let v;
        if (spp >= 3) {
          const g = k => (bps === 16 ? rd.getUint16((i * spp + k) * 2, le) : fmt === 3 ? rd.getFloat32((i * spp + k) * 4, le) : rd.getUint32((i * spp + k) * 4, le));
          v = 0.299 * g(0) + 0.587 * g(1) + 0.114 * g(2);
        } else v = bps === 16 ? rd.getUint16(i * spp * 2, le) : fmt === 3 ? rd.getFloat32(i * spp * 4, le) : rd.getUint32(i * spp * 4, le);
        vals[i] = v; if (v < lo) lo = v; if (v > hi) hi = v;
      }
      const span = hi > lo ? hi - lo : 1;
      for (let i = 0; i < w * h; i++) { let v = Math.round((vals[i] - lo) / span * 255); out[i] = photo === 0 ? 255 - v : v; }
    }
    /* every text tag (description, software, the private tags of microscopes) */
    let text = '';
    Object.keys(tags).forEach(t => { if (typeof tags[t] === 'string') text += tags[t] + '\n'; });
    return { w, h, data: out, bits: bps, text };
  }
  IO.decodeTIFF = decodeTIFF;
  IO.isTIFF = buf => { const u = new Uint8Array(buf, 0, Math.min(4, buf.byteLength)); return u.length === 4 && ((u[0] === 0x49 && u[1] === 0x49 && u[2] === 42) || (u[0] === 0x4d && u[1] === 0x4d && u[3] === 42)); };

  /* a small TIFF writer (gray, 8 bits, no compression): for the tests and to
     hand back an image exactly as it was analyzed */
  IO.encodeTIFF = function (img) {
    const { w, h, data } = img, nTags = 10, ifd = 8, dataOff = ifd + 2 + nTags * 12 + 4;
    const buf = new ArrayBuffer(dataOff + w * h), dv = new DataView(buf);
    dv.setUint8(0, 0x49); dv.setUint8(1, 0x49); dv.setUint16(2, 42, true); dv.setUint32(4, ifd, true);
    dv.setUint16(ifd, nTags, true);
    const T = [[256, 4, 1, w], [257, 4, 1, h], [258, 3, 1, 8], [259, 3, 1, 1], [262, 3, 1, 1], [273, 4, 1, dataOff], [277, 3, 1, 1], [278, 4, 1, h], [279, 4, 1, w * h], [284, 3, 1, 1]];
    T.forEach((t, i) => {
      const p = ifd + 2 + i * 12;
      dv.setUint16(p, t[0], true); dv.setUint16(p + 2, t[1], true); dv.setUint32(p + 4, t[2], true);
      if (t[1] === 3) dv.setUint16(p + 8, t[3], true); else dv.setUint32(p + 8, t[3], true);
    });
    dv.setUint32(ifd + 2 + nTags * 12, 0, true);
    new Uint8Array(buf, dataOff).set(data);
    return buf;
  };

  /* ============================ metadata of microscopes ============================
     → { mag, umPerPx, refWidthMm, kv, wd, date, instrument, source, barUm }.
     Three kinds are known by name; anything else leaves the fields empty and
     the user (or the index) gives the magnification. */
  const num = s => { const v = parseFloat(String(s).replace(',', '.')); return isFinite(v) ? v : NaN; };
  const toUm = (v, unit) => {
    const u = String(unit || 'm').toLowerCase().replace(/µ|μ/g, 'u');
    return u === 'nm' ? v / 1000 : u === 'pm' ? v / 1e6 : u === 'um' ? v : u === 'mm' ? v * 1000 : v * 1e6;
  };
  IO.parseMeta = function (text) {
    const out = { mag: NaN, umPerPx: NaN, kv: NaN, wd: NaN, date: '', instrument: '', source: '', barUm: NaN };
    if (!text) return out;
    let m;
    /* side file of one family of instruments: "$CM_MAG 1000", "$$SM_MICRON_MARKER 10um" */
    if (/\$CM_/.test(text)) {
      out.source = 'cm';
      if ((m = text.match(/\$CM_MAG\s+([\d.]+)/))) out.mag = num(m[1]);
      if ((m = text.match(/\$CM_ACCEL_VOLT\s+([\d.]+)/))) out.kv = num(m[1]);
      if ((m = text.match(/\$\$SM_WD\s+([\d.]+)/))) out.wd = num(m[1]);
      if ((m = text.match(/\$CM_DATE\s+(\S+)/))) out.date = m[1];
      if ((m = text.match(/\$CM_INSTRUMENT\s+(.+)/))) out.instrument = m[1].trim();
      if ((m = text.match(/\$\$SM_MICRON_MARKER\s+([\d.]+)\s*(nm|um|µm|mm)/i))) out.barUm = toUm(num(m[1]), m[2]);
      const bar = text.match(/\$\$SM_MICRON_BAR\s+(\d+)/);
      if (bar && isFinite(out.barUm)) out.umPerPx = out.barUm / num(bar[1]);
    }
    /* "[Scan] PixelWidth=1.234e-008" (meters) */
    if ((m = text.match(/PixelWidth\s*=\s*([\d.eE+-]+)/))) { out.umPerPx = toUm(num(m[1]), 'm'); out.source = out.source || 'scan'; }
    /* "Image Pixel Size = 12.34 nm" */
    if ((m = text.match(/Image Pixel Size\s*=\s*([\d.]+)\s*(pm|nm|µm|um|mm)/i))) { out.umPerPx = toUm(num(m[1]), m[2]); out.source = out.source || 'pixelsize'; }
    /* "PixelSize=12.34" (nm) with "Magnification=1000" */
    if (!isFinite(out.umPerPx) && (m = text.match(/^\s*PixelSize\s*=\s*([\d.]+)/mi))) { out.umPerPx = num(m[1]) / 1000; out.source = out.source || 'pixelsize'; }
    if (!isFinite(out.mag) && (m = text.match(/^\s*(?:Magnification|Mag)\s*[=:]\s*x?\s*([\d.,]+)/mi))) out.mag = num(m[1].replace(/,/g, ''));
    if (!isFinite(out.kv) && (m = text.match(/(?:AcceleratingVoltage|HV|EHT)\s*=\s*([\d.]+)\s*(kV|V)?/i))) out.kv = m[2] && m[2].toLowerCase() === 'v' ? num(m[1]) / 1000 : num(m[1]);
    return out;
  };

  /* ============================ the index and the key ============================
     The index: one row per image, with a header. Columns are found by name, in
     Spanish or English: archivo/file, grupo/group, nombre/name, grano/grain,
     magnificacion/magnification, um_por_px/um_per_px, excluir/exclude, nota/note,
     nivel/tier. Separator: comma, semicolon or tab. */
  function splitLine(line, sep) {
    const out = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
      else if (c === sep && !q) { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out.map(s => s.trim());
  }
  const fold = s => String(s || '').toLowerCase().normalize('NFD').replace(new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g'), '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const COLS = {
    file: ['archivo', 'file', 'filename', 'imagen', 'image', 'base_id', 'id', 'foto'],
    group: ['grupo', 'group', 'morfotipo', 'landrace_code', 'taxon', 'especie', 'species', 'codigo', 'code', 'clase', 'class'],
    name: ['nombre', 'name', 'landrace_name', 'nombre_grupo', 'group_name'],
    grain: ['grano', 'grain', 'unidad', 'unit', 'specimen', 'ejemplar'],
    mag: ['magnificacion', 'magnification', 'mag', 'aumento', 'aumentos'],
    umpx: ['um_por_px', 'um_per_px', 'micras_por_pixel', 'pixel_size_um', 'umpx'],
    exclude: ['excluir', 'exclude', 'excluded', 'descartar'],
    note: ['nota', 'note', 'notas', 'notes', 'comentario'],
    tier: ['nivel', 'tier', 'tipo', 'kind'],
  };
  IO.parseIndex = function (text) {
    const lines = String(text || '').replace(new RegExp('^' + String.fromCharCode(0xFEFF)), '').split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length < 2) return { rows: [], cols: {} };
    const first = lines[0];
    const sep = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : first.includes('\t') ? '\t' : ',';
    const head = splitLine(first, sep).map(fold), cols = {};
    Object.keys(COLS).forEach(k => { const i = head.findIndex(h => COLS[k].includes(h)); if (i >= 0) cols[k] = i; });
    if (cols.file == null) return { rows: [], cols, error: 'file' };
    const rows = lines.slice(1).map(l => {
      const c = splitLine(l, sep), get = k => (cols[k] != null ? c[cols[k]] : '');
      const ex = fold(get('exclude'));
      return {
        file: get('file'), key: IO.stem(get('file')), group: get('group'), name: get('name'), grain: get('grain'),
        mag: num(get('mag')), umPerPx: num(get('umpx')), exclude: ['1', 'si', 'yes', 'true', 'x', 'excluir', 'exclude'].includes(ex), note: get('note'), tier: fold(get('tier')),
      };
    }).filter(r => r.file);
    return { rows, cols };
  };
  /* a key of names: lines like "G1 = Morphotype one", "G1: Morphotype one" or
     "A = Morphotype A". The code is one word of letters and digits (up to 8,
     "-" and "_" allowed inside), as group codes are read from file names. */
  IO.parseKey = function (text) {
    const out = {};
    String(text || '').split(/\r?\n/).forEach(l => {
      const m = l.match(/^\s*([A-Za-z0-9](?:[A-Za-z0-9_-]{0,6}[A-Za-z0-9])?)\s*[=:]\s*(.+?)\s*$/);
      if (m) out[m[1]] = m[2].replace(/\s+/g, ' ');
    });
    return out;
  };
  /* the kind of picture written in an index, in either language (the index the app
     downloads writes it in the language of the interface): "panorámica", "overview",
     "detalle", "detail", "un grano", "one grain", "standard"… */
  IO.tierOf = function (word) {
    const w = fold(word);
    return /pano|over|campo|field/.test(w) ? 'overview' : /det/.test(w) ? 'detail' : 'standard';
  };
  /* the name of a file without folder and extension */
  IO.stem = f => String(f || '').replace(/^.*[\\/]/, '').replace(/\.[A-Za-z0-9]{1,5}$/, '');
  IO.ext = f => (String(f || '').match(/\.([A-Za-z0-9]{1,5})$/) || ['', ''])[1].toLowerCase();

  /* The group and the grain from the name of a file, as the images of the
     example set are named: "07a_M1" → grain "07", group "M1". The pattern is
     a regular expression with two optional named parts: (?<grain>…) and
     (?<group>…); the user can change it. */
  IO.DEFAULT_PATTERN = '^(?<grain>\\d+)[A-Za-z]*_(?<group>[A-Za-z]+\\d*)';
  IO.fromName = function (stem, pattern) {
    let re;
    try { re = new RegExp(pattern || IO.DEFAULT_PATTERN); } catch (e) { return { group: '', grain: '' }; }
    const m = String(stem).match(re);
    if (!m) return { group: '', grain: '' };
    const g = m.groups || {};
    return { group: g.group || (m[2] || ''), grain: g.grain || (m[1] || '') };
  };

  /* ============================ files in the browser ============================ */
  function readBuffer(file) {
    if (file.arrayBuffer) return file.arrayBuffer();
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsArrayBuffer(file); });
  }
  IO.readBuffer = readBuffer;
  IO.readText = function (file) {
    if (file.text) return file.text();
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsText(file); });
  };
  /* PNG, JPEG, BMP, WebP, GIF through the browser; TIFF through decodeTIFF */
  IO.fromFile = async function (file) {
    const buf = await readBuffer(file);
    if (IO.isTIFF(buf)) return decodeTIFF(buf);
    const blob = new Blob([buf]);
    let bmp;
    /* the browser's own message is in its language, not in the app's */
    const unreadable = () => new Error(tr('el navegador no pudo leer esta imagen (archivo dañado o formato no admitido)', 'the browser could not read this image (damaged file or unsupported format)'));
    try {
      if (typeof createImageBitmap === 'function') bmp = await createImageBitmap(blob);
      else bmp = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(unreadable()); im.src = URL.createObjectURL(blob); });
    } catch (e) { throw unreadable(); }
    const w = bmp.width, h = bmp.height, cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(bmp, 0, 0);
    const px = g.getImageData(0, 0, w, h).data, out = new Uint8Array(w * h);
    for (let i = 0, j = 0; j < w * h; i += 4, j++) out[j] = px[i] === px[i + 1] && px[i] === px[i + 2] ? px[i] : Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
    if (bmp.close) bmp.close();
    return { w, h, data: out, bits: 8, text: '' };
  };
  IO.IMAGE_EXT = ['tif', 'tiff', 'png', 'jpg', 'jpeg', 'bmp', 'webp', 'gif'];

  window.ImgIO = IO;
})();
