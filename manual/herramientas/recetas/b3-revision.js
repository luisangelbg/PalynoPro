// ventana 1400x1000
/* Capítulo 3: «Revisión de cada foto» con 03_C.png (un grano alargado del morfotipo C) y la capa Feret encendida,
   con las marcas numeradas de la figura */
(async () => {
  await bloque(3);
  const t = tarjeta(3, I18N.lang === 'en' ? 'Check of every picture' : 'Revisión de cada foto');
  const s = porId('b3Sel'), op = [...s.options].find(o => o.textContent.startsWith('03_C'));
  s.value = op.value; s.dispatchEvent(new Event('change'));
  await W(2500);
  const f = porId('b3Layers').querySelector('input[data-layer="feret"]');
  f.checked = true; f.dispatchEvent(new Event('change', { bubbles: true }));
  await W(2500);
  /* in English the descenders of the card title (Check of every picture) would peek into the crop */
  if (I18N.lang === 'en') t.querySelector('h2').style.marginBottom = '24px';
  irA(t, 100); await W(800);
  const v = t.querySelector('.viewer'), box = v.getBoundingClientRect();
  /* a mark at the right of a node (dx px further), as percentages of the clip (8 px of air) */
  const m = (n, node, dx, dy) => { const r = node.getBoundingClientRect(); return [n, +((r.right + (dx || 0) - box.left + 8) / (box.width + 16) * 100).toFixed(1), +((r.top + r.height / 2 + (dy || 0) - box.top + 8) / (box.height + 16) * 100).toFixed(1)]; };
  const st = porId('b3Stage').getBoundingClientRect(), labs = porId('b3Layers').querySelectorAll('label');
  window.__marcas = [
    [1, +((st.left + 22 - box.left + 8) / (box.width + 16) * 100).toFixed(1), +((st.top + 22 - box.top + 8) / (box.height + 16) * 100).toFixed(1)],
    m(2, porId('b3Next'), 18),
    m(3, labs[labs.length - 1], 18),
    (() => { const d = porId('b3Meta').querySelector('dt'), rg = document.createRange(); rg.selectNodeContents(d); const r = rg.getBoundingClientRect(); return [4, +((r.right + 60 - box.left + 8) / (box.width + 16) * 100).toFixed(1), +((r.top + r.height / 2 - box.top + 8) / (box.height + 16) * 100).toFixed(1)]; })(),
    m(5, porId('b3Excl'), 18),
  ];
  return caja([v], 8);
})()
