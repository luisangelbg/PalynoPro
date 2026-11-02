// ventana 1400x1000
/* Capítulo 2: «Visor» con la primera foto del ejemplo (01_A.png), con marcas en sus controles y sus datos */
(async () => {
  await bloque(2);
  const t = porId('b2ViewerCard'); irA(t, 90); await W(1200);
  const P = 8, R = t.getBoundingClientRect();
  const x0 = R.left - P, y0 = R.top - P, w = R.width + 2 * P, hh = R.height + 2 * P;
  const m = (n, node, dx, dy) => { const r = node.getBoundingClientRect(); return [n, +((r.left + (dx || 0) - x0) / w * 100).toFixed(1), +((r.top + r.height / 2 + (dy || 0) - y0) / hh * 100).toFixed(1)]; };
  const dts = [...document.querySelectorAll('#b2Meta dt')];
  window.__marcas = [
    m(1, porId('b2Prev'), -10),
    m(2, porId('b2Pos'), -10),
    m(3, porId('b2Next'), -10),
    m(4, porId('b2Measure'), -10),
    m(5, document.querySelector('#b2ViewerCard .legend-inline'), -12),
    m(6, dts[0], -12),
    m(7, dts[dts.length - 1], -12),
  ];
  return caja([t], P);
})()
