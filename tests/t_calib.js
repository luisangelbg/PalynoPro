/* PalynoPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán. Free software under the GNU GPL v3 or later; see LICENSE. */
/* Calibration: the rule of the reference frame, round lengths, the scale bar
   and the caption, and the kind of each picture. */
later(async function () {
  sec('Calibración');
  near('1000× en 2560 px: 0.05 µm/px', Calib.fromMag(1000, 2560), 0.05, 1e-15);
  near('1000× en 1280 px: 0.1 µm/px (el doble)', Calib.fromMag(1000, 1280), 0.1, 1e-15);
  near('100× en 2560 px: 0.5 µm/px', Calib.fromMag(100, 2560), 0.5, 1e-15);
  near('ancho de referencia distinto (120 mm)', Calib.fromMag(1000, 2560, 120), 120000 / 2560000, 1e-15);
  t('sin magnificación: no calibra', !(Calib.fromMag(0, 2560) > 0) && !(Calib.fromMag(NaN, 2560) > 0));
  t('9.95 µm es redondo (10, error 0.5 %)', Calib.nice(9.95).value === 10 && Calib.nice(9.95).err < 0.006);
  t('49.88 → 50; 4.97 → 5; 1.99 → 2', Calib.nice(49.88).value === 50 && Calib.nice(4.97).value === 5 && Calib.nice(1.99).value === 2);
  t('15.2 µm no es redondo (error > 4 %)', Calib.nice(15.2).err > 0.04);
  near('una barra que el usuario mide: 200 px = 10 µm', Calib.fromBar(200, 10), 0.05, 1e-15);

  sec('Calibración: barra de escala');
  const s = Synth.single({ w: 1280, h: 960, mag: 1000, seed: 3 });
  const bar = Calib.findBar(s.img);
  t('encuentra la barra dibujada', !!bar && bar.len === s.barPx, bar && bar.len + ' vs ' + s.barPx);
  const c = Calib.calibrate({ mag: 1000 }, s.img);
  t('comprobada: 10 µm redondos', c.ok === true && Math.abs(c.barUm - 10) < 1e-9, c.barUm);
  const wrong = Calib.calibrate({ mag: 1500 }, s.img);
  t('magnificación mal escrita (1500 en vez de 1000): barra dudosa', wrong.ok === false, wrong.barUm);
  t('fuente «magnification»', c.source === 'magnification');
  t('el tamaño escrito a mano manda', Calib.calibrate({ mag: 1000, manualUmPerPx: 0.2 }, s.img).source === 'manual');
  t('el tamaño del índice manda sobre la magnificación', Calib.calibrate({ mag: 1000, indexUmPerPx: 0.2 }, s.img).umPerPx === 0.2);
  t('el del instrumento manda sobre la magnificación', Calib.calibrate({ mag: 1000, meta: { umPerPx: 0.05 } }, s.img).source === 'instrument');
  /* an index with a pixel size four times too large: the bar says 40 µm, the magnification 10 µm */
  const old = Calib.calibrate({ mag: 1000, indexUmPerPx: 0.4 }, s.img);
  t('índice que la barra contradice y la magnificación no: gana la magnificación', old.source === 'magnification' && old.ok === true && Math.abs(old.umPerPx - 0.1) < 1e-12 && old.replaced && old.replaced.source === 'index', JSON.stringify(old.replaced));
  /* recomputing from the bar already found (Images.recalibrate: Apply, a magnification typed in the table) keeps the same rule */
  const again = Calib.withBar({ mag: 1000, indexUmPerPx: 0.4 }, s.img.w, old.bar);
  t('sin volver a leer los píxeles, la magnificación sigue sustituyendo al índice que la barra contradice', again.source === 'magnification' && again.ok === true && again.replaced && again.replaced.source === 'index' && again.umPerPx === old.umPerPx, JSON.stringify(again.replaced));
  t('al cambiar el ancho de referencia se recalcula igual que leyendo la imagen', JSON.stringify(Calib.withBar({ mag: 1000 }, s.img.w, old.bar, { refMm: 100 })) === JSON.stringify(Calib.calibrate({ mag: 1000 }, s.img, { refMm: 100 })));
  const both = Calib.calibrate({ mag: 1500, indexUmPerPx: 0.4 }, s.img);
  t('si tampoco la magnificación coincide, se queda el índice y la barra queda dudosa', both.source === 'index' && both.ok === false && !both.replaced);
  const cut = Calib.captionRow(s.img, bar);
  t('el rótulo empieza justo arriba de la barra', cut < bar.y && cut > bar.y - 30, cut + ' / ' + bar.y);
  /* the same picture with noise over the bar and in JPEG-like gaps */
  const noisy = { w: s.img.w, h: s.img.h, data: new Uint8Array(s.img.data) };
  noisy.data[bar.y * noisy.w + bar.x + 40] = 200;
  t('un píxel oscuro dentro de la barra no la parte', (Calib.findBar(noisy) || {}).len === bar.len);
  /* letters with 2-px gaps are not a bar */
  const lt = { w: 400, h: 300, data: new Uint8Array(400 * 300).fill(30) };
  for (let y = 280; y < 292; y++) for (let x = 50; x < 250; x++) if (x % 4 < 2) lt.data[y * 400 + x] = 255;
  t('letras separadas por huecos no cuentan como barra', Calib.findBar(lt) === null);
  /* no bar, no caption */
  const blank = { w: 300, h: 200, data: new Uint8Array(300 * 200).fill(90) };
  t('sin barra: null y no se recorta', Calib.findBar(blank) === null && Calib.captionRow(blank, null) === 200);
  /* a dark band at the bottom */
  const band = { w: 300, h: 200, data: new Uint8Array(300 * 200).fill(90) };
  for (let i = 300 * 185; i < 300 * 200; i++) band.data[i] = 0;
  t('banda negra inferior: se recorta en su borde', Calib.captionRow(band, null) === 185);

  sec('Calibración: tipo de foto');
  t('mucho menos aumento que la mediana: panorámica', Calib.suggestTier(150, 1000) === 'overview');
  t('el doble de aumento: detalle', Calib.suggestTier(2000, 1000) === 'detail');
  t('cerca de la mediana: un grano', Calib.suggestTier(1200, 1000) === 'standard');
  t('sin magnificación: un grano', Calib.suggestTier(NaN, 1000) === 'standard');
});
