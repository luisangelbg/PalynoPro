// ventana 1400x1000
/* Capítulo 7: una figura de la app (el biplot del Bloque 6) con sus herramientas: SVG, PNG, el editor ✎ y el estudio */
(async () => {
  await bloque(6);
  const fb = figura('b6FigPca');
  irA(fb, 170); await W(1200);
  const r = fb.getBoundingClientRect(), p = 8;
  const m = (n, node, dx) => { const b = node.getBoundingClientRect(); return [n, +((b.left + b.width / 2 + (dx || 0) - r.left + p) / (r.width + 2 * p) * 100).toFixed(1), +((b.top - 12 - r.top + p) / (r.height + 2 * p) * 100).toFixed(1)]; };
  const q = s => fb.querySelector(s);
  window.__marcas = [m(1, q('.fig-dl[data-fmt="svg"]')), m(2, q('.fig-dl[data-fmt="png"]')), m(3, q('.fig-ed')), m(4, q('.lfs-open'))];
  return caja([fb], p);
})()
