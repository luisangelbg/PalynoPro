/* PalynoPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán. Free software under the GNU GPL v3 or later; see LICENSE. */
/* Reading images and metadata: the TIFF reader against TIFF files written
   here byte by byte (uncompressed, PackBits, LZW, 16 bits, palette, tiles),
   the text of microscopes, the index and the key. */
later(async function () {
  sec('Lectura: TIFF');
  const W = 37, H = 23, img = { w: W, h: H, data: new Uint8Array(W * H) };
  for (let i = 0; i < W * H; i++) img.data[i] = (i * 37 + (i % W) * 5) % 256;
  const back = await ImgIO.decodeTIFF(ImgIO.encodeTIFF(img));
  t('sin compresión: tamaño', back.w === W && back.h === H);
  t('sin compresión: cada píxel igual', back.data.every((v, i) => v === img.data[i]));
  {
    const bad = new Uint8Array(ImgIO.encodeTIFF(img)); bad[2] = 41;
    const why = async () => { try { await ImgIO.decodeTIFF(bad.buffer); return ''; } catch (e) { return e.message; } };
    const was = I18N.lang;
    I18N.lang = 'es'; const es = await why();
    I18N.lang = 'en'; const en = await why();
    I18N.lang = was;
    t('el motivo de un TIFF ilegible sale en el idioma de la interfaz', es === 'no es un TIFF' && en === 'not a TIFF', es + ' / ' + en);
  }
  t('reconoce un TIFF por su firma', ImgIO.isTIFF(ImgIO.encodeTIFF(img)) && !ImgIO.isTIFF(new Uint8Array([137, 80, 78, 71]).buffer));

  /* a TIFF writer for the tests: tags given, strips given (already compressed) */
  function tiff(tags, strips, le) {
    le = le !== false;
    const ntag = tags.length, extra = [];
    let off = 8 + 2 + ntag * 12 + 4;
    const stripOffs = strips.map(s => { const o = off; off += s.length; return o; });
    const ifdVals = tags.map(tg => {
      if (tg[0] === 273 || tg[0] === 324) return [tg[0], 4, strips.length, stripOffs];
      if (tg[0] === 279 || tg[0] === 325) return [tg[0], 4, strips.length, strips.map(s => s.length)];
      return tg;
    });
    ifdVals.forEach(tg => { const size = (tg[1] === 3 ? 2 : 4) * tg[2]; if (size > 4) { tg.extraOff = off; extra.push(tg); off += size; } });
    const buf = new ArrayBuffer(off), dv = new DataView(buf), u8 = new Uint8Array(buf);
    dv.setUint8(0, le ? 0x49 : 0x4d); dv.setUint8(1, le ? 0x49 : 0x4d); dv.setUint16(2, 42, le); dv.setUint32(4, 8, le); dv.setUint16(8, ntag, le);
    ifdVals.sort((a, b) => a[0] - b[0]).forEach((tg, i) => {
      const p = 10 + i * 12, vals = Array.isArray(tg[3]) ? tg[3] : [tg[3]];
      dv.setUint16(p, tg[0], le); dv.setUint16(p + 2, tg[1], le); dv.setUint32(p + 4, tg[2], le);
      const at = tg.extraOff != null ? tg.extraOff : p + 8;
      if (tg.extraOff != null) dv.setUint32(p + 8, tg.extraOff, le);
      vals.forEach((v, k) => { if (tg[1] === 3) dv.setUint16(at + 2 * k, v, le); else dv.setUint32(at + 4 * k, v, le); });
    });
    strips.forEach((s, k) => u8.set(s, stripOffs[k]));
    return buf;
  }
  /* PackBits of the specification's own example */
  const pb = new Uint8Array([0xFE, 0xAA, 0x02, 0x80, 0x00, 0x2A, 0xFD, 0xAA, 0x03, 0x80, 0x00, 0x2A, 0x22, 0xF7, 0xAA]);
  const pbOut = [0xAA, 0xAA, 0xAA, 0x80, 0x00, 0x2A, 0xAA, 0xAA, 0xAA, 0xAA, 0x80, 0x00, 0x2A, 0x22, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA];
  const pbImg = await ImgIO.decodeTIFF(tiff([[256, 3, 1, 24], [257, 3, 1, 1], [258, 3, 1, 8], [259, 3, 1, 32773], [262, 3, 1, 1], [273, 4, 1, 0], [277, 3, 1, 1], [278, 3, 1, 1], [279, 4, 1, 0]], [pb]));
  t('PackBits: el ejemplo de la especificación', pbImg.data.every((v, i) => v === pbOut[i]), Array.from(pbImg.data).join(','));
  /* LZW and RGB: files written by the image library of the operating system */
  const fromB64 = s => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; };
  const pat = i => (Math.floor(i / 7) * 13 + (i % 64)) % 256;
  const lzImg = await ImgIO.decodeTIFF(fromB64(FIXTURES.lzw));
  t("LZW de un archivo del sistema: 64 × 48 exacto", lzImg.w === 64 && lzImg.h === 48 && lzImg.data.every((v, i) => v === pat(i)));
  const rgbImg = await ImgIO.decodeTIFF(fromB64(FIXTURES.rgb));
  t("RGB sin compresión del sistema: gris exacto", rgbImg.data.every((v, i) => v === pat(i)));
  /* big-endian, two strips, 16 bits */
  const bw = 10, bh = 6, v16 = new Uint8Array(bw * bh * 2);
  for (let i = 0; i < bw * bh; i++) { const v = 1000 + 500 * i; v16[2 * i] = v >> 8; v16[2 * i + 1] = v & 255; }
  const b16 = await ImgIO.decodeTIFF(tiff([[256, 3, 1, bw], [257, 3, 1, bh], [258, 3, 1, 16], [259, 3, 1, 1], [262, 3, 1, 1], [273, 4, 1, 0], [277, 3, 1, 1], [278, 3, 1, 3], [279, 4, 1, 0]], [v16.subarray(0, bw * 3 * 2), v16.subarray(bw * 3 * 2)], false), );
  t('16 bits, orden grande, dos tiras: estirado a 0–255', b16.data[0] === 0 && b16.data[bw * bh - 1] === 255 && b16.data[bw * 3] === Math.round(30 / 59 * 255), b16.data[bw * 3]);
  /* palette */
  const cmap = new Array(768).fill(0);
  for (let i = 0; i < 256; i++) { cmap[i] = 257 * i; cmap[256 + i] = 257 * i; cmap[512 + i] = 257 * i; }
  const palImg = await ImgIO.decodeTIFF(tiff([[256, 3, 1, 4], [257, 3, 1, 1], [258, 3, 1, 8], [259, 3, 1, 1], [262, 3, 1, 3], [273, 4, 1, 0], [277, 3, 1, 1], [278, 3, 1, 1], [279, 4, 1, 0], [320, 3, 768, cmap]], [new Uint8Array([0, 10, 128, 255])]));
  t('paleta de grises', [0, 10, 128, 255].every((v, i) => palImg.data[i] === v), Array.from(palImg.data).join(','));
  /* WhiteIsZero */
  const wz = await ImgIO.decodeTIFF(tiff([[256, 3, 1, 3], [257, 3, 1, 1], [258, 3, 1, 8], [259, 3, 1, 1], [262, 3, 1, 0], [273, 4, 1, 0], [277, 3, 1, 1], [278, 3, 1, 1], [279, 4, 1, 0]], [new Uint8Array([0, 100, 255])]));
  t('blanco = 0 se invierte', wz.data[0] === 255 && wz.data[1] === 155 && wz.data[2] === 0);
  /* tiles of 16 × 16 on a 20 × 18 image */
  const tw = 16, iw = 20, ih = 18, tl = [];
  const want = new Uint8Array(iw * ih); for (let i = 0; i < want.length; i++) want[i] = (i * 7) & 255;
  for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 2; tx++) { const s = new Uint8Array(tw * tw); for (let y = 0; y < tw; y++) for (let x = 0; x < tw; x++) { const X = tx * tw + x, Y = ty * tw + y; s[y * tw + x] = X < iw && Y < ih ? want[Y * iw + X] : 0; } tl.push(s); }
  const tim = await ImgIO.decodeTIFF(tiff([[256, 3, 1, iw], [257, 3, 1, ih], [258, 3, 1, 8], [259, 3, 1, 1], [262, 3, 1, 1], [277, 3, 1, 1], [322, 3, 1, tw], [323, 3, 1, tw], [324, 4, 1, 0], [325, 4, 1, 0]], tl));
  t('mosaicos de 16 × 16', tim.data.every((v, i) => v === want[i]));

  sec('Lectura: metadatos del microscopio');
  const cm = '$CM_FORMAT JEOL/EO\n$CM_DATE 2009-11-23\n$CM_INSTRUMENT JSM-6390\n$CM_ACCEL_VOLT 15\n$CM_MAG 1000\n$$SM_MICRON_MARKER 10um\n$$SM_WD 11\n';
  const m1 = ImgIO.parseMeta(cm);
  t('archivo «$CM_»: magnificación', m1.mag === 1000);
  t('archivo «$CM_»: voltaje, distancia, fecha', m1.kv === 15 && m1.wd === 11 && m1.date === '2009-11-23');
  t('archivo «$CM_»: barra declarada de 10 µm', m1.barUm === 10);
  t('sin barra en píxeles no hay tamaño de píxel', !(m1.umPerPx > 0));
  near('con «$$SM_MICRON_BAR 200»: 0.05 µm/px', ImgIO.parseMeta(cm + '$$SM_MICRON_BAR 200\n').umPerPx, 0.05, 1e-12);
  near('«PixelWidth=4.5e-008» (metros) → 0.045 µm', ImgIO.parseMeta('[Scan]\nPixelWidth=4.5e-008\n').umPerPx, 0.045, 1e-12);
  near('«Image Pixel Size = 23.5 nm» → 0.0235 µm', ImgIO.parseMeta('Image Pixel Size = 23.5 nm\n').umPerPx, 0.0235, 1e-12);
  near('«PixelSize=12» (nm) → 0.012 µm', ImgIO.parseMeta('PixelSize=12\nMagnification=5000\n').umPerPx, 0.012, 1e-12);
  t('«Magnification=5000»', ImgIO.parseMeta('PixelSize=12\nMagnification=5000\n').mag === 5000);
  t('texto sin nada conocido: vacío', !(ImgIO.parseMeta('hola').mag > 0));

  sec('Lectura: índice, clave y nombres');
  const ix = ImgIO.parseIndex('archivo;grupo;nombre;grano;magnificación;excluir\n01_G1.tif;G1;Grupo uno;01;1000;\n05_G3.tif;G3;Grupo tres;05;100;sí\n');
  t('índice con punto y coma y acentos en el encabezado', ix.rows.length === 2 && ix.rows[0].group === 'G1' && ix.rows[0].mag === 1000);
  t('excluir «sí»', ix.rows[1].exclude === true && ix.rows[0].exclude === false);
  t('clave del archivo sin extensión', ix.rows[0].key === '01_G1');
  const ix2 = ImgIO.parseIndex('file,group,magnification,um_per_px\n"a, b.png",X,500,0.25\n');
  t('índice en inglés, con comillas y tamaño de píxel', ix2.rows[0].file === 'a, b.png' && ix2.rows[0].umPerPx === 0.25);
  t('índice sin columna de archivo: error', ImgIO.parseIndex('x,y\n1,2\n').error === 'file');
  const k = ImgIO.parseKey('CLAVES\nG1=  GRUPO UNO\nG2: Grupo  dos\notra línea\n');
  t('clave «G1 = nombre» y «G2: nombre»', k.G1 === 'GRUPO UNO' && k.G2 === 'Grupo dos' && Object.keys(k).length === 2);
  const k2 = ImgIO.parseKey('A = Morfotipo A\nB: Morfotipo B\nM10a = Diez a\nG-2 = Con guion\n7 = Siete\nnombre largo = no\n= vacío\n');
  t('clave con códigos de solo letras y alfanuméricos', k2.A === 'Morfotipo A' && k2.B === 'Morfotipo B' && k2.M10a === 'Diez a' && k2['G-2'] === 'Con guion' && k2['7'] === 'Siete' && Object.keys(k2).length === 5, JSON.stringify(k2));
  t('clave: todo grupo que da el patrón por omisión se puede nombrar', ['03_A', '07a_M1', '12_Gx2'].every(st => { const g = ImgIO.fromName(st).group; return ImgIO.parseKey(g + ' = x')[g] === 'x'; }));
  t('tipo de foto del índice, en los dos idiomas', [['panorámica', 'overview'], ['Overview', 'overview'], ['detalle', 'detail'], ['Detail', 'detail'], ['un grano', 'standard'], ['One grain', 'standard'], ['standard', 'standard']].every(([w, v]) => ImgIO.tierOf(w) === v));
  const ix3 = ImgIO.parseIndex('archivo,nivel,fuente\n01_A.png,panorámica,magnificación\n02_A.png,un grano,a mano\n03_A.png,overview,magnification\n04_A.png,detail,index\n');
  t('el índice que descarga la app se vuelve a leer en español y en inglés', ix3.rows.map(r => ImgIO.tierOf(r.tier)).join() === 'overview,standard,overview,detail');
  const n1 = ImgIO.fromName('07a_M1'), n2 = ImgIO.fromName('08barra_M1'), n3 = ImgIO.fromName('77datos_M9'), n4 = ImgIO.fromName('03_A');
  t('nombre «07a_M1»: grano 07, grupo M1', n1.grain === '07' && n1.group === 'M1');
  t('«08barra_M1» y «77datos_M9»: mismo grano que sin sufijo', n2.grain === '08' && n2.group === 'M1' && n3.grain === '77' && n3.group === 'M9');
  t('«03_A»: grupo de solo letras', n4.grain === '03' && n4.group === 'A');
  t('patrón propio', ImgIO.fromName('Pinus-12-x', '^(?<group>[A-Za-z]+)-(?<grain>\\d+)').group === 'Pinus');
  t('patrón inválido no rompe', ImgIO.fromName('a', '(').group === '');
});
