// ventana 1400x900
/* Capítulo 1: la portada de la app (el héroe del Bloque 1), con marcas en el lema, los cuatro botones, las insignias y el grano */
(async () => {
  await W(2200);
  window.scrollTo(0, 0); await W(400);
  const h = document.querySelector('#panel-1 .hero');
  const R = h.getBoundingClientRect(), P = 8;
  const x0 = R.left - P, y0 = R.top - P, w = R.width + 2 * P, hh = R.height + 2 * P;
  const m = (n, node, dx, dy) => { const r = node.getBoundingClientRect(); return [n, +((r.left + (dx || 0) - x0) / w * 100).toFixed(1), +((r.top + r.height / 2 + (dy || 0) - y0) / hh * 100).toFixed(1)]; };
  const q = s => document.querySelector(s);
  window.__marcas = [
    m(1, q('#panel-1 .hero h1'), -14, -10),
    m(2, porId('startBtn'), -12),
    m(3, porId('exampleBtn'), -12),
    m(4, porId('labBtn'), -12),
    m(5, porId('openProjBtn'), -12),
    m(6, q('#panel-1 .badge-row'), -14),
    m(7, porId('heroArt'), 10, -80),
  ];
  return caja([h], P);
})()
