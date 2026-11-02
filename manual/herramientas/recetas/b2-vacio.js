// ventana 1400x900
/* Capítulo 2: el Bloque 2 sin imágenes: el título, el desplegable «Qué hace este bloque» cerrado
   y la zona para arrastrar la carpeta, con marcas en sus cuatro botones */
(async () => {
  await bloque(2, 'nada');
  const why = document.querySelector('#panel-2 details.why'); why.open = false;
  const head = document.querySelector('#panel-2 .panel-title'), card = tarjeta(2, 0);
  irA(head, 120); await W(500);
  const nodos = [head, why, card], P = 8;
  const rs = nodos.map(n => n.getBoundingClientRect());
  const x0 = Math.min(...rs.map(r => r.left)) - P, y0 = Math.min(...rs.map(r => r.top)) - P;
  const w = Math.max(...rs.map(r => r.right)) + P - x0, hh = Math.max(...rs.map(r => r.bottom)) + P - y0;
  const m = (n, node, dx, dy) => { const r = node.getBoundingClientRect(); return [n, +((r.left + (dx || 0) - x0) / w * 100).toFixed(1), +((r.top + r.height / 2 + (dy || 0) - y0) / hh * 100).toFixed(1)]; };
  window.__marcas = [
    m(1, why, 2),
    m(2, document.querySelector('label[for="b2Folder"]'), -12),
    m(3, document.querySelector('label[for="b2Files"]'), -12),
    m(4, porId('b2Example'), -12),
    m(5, porId('b2Clear'), -12),
  ];
  return caja(nodos, P);
})()
