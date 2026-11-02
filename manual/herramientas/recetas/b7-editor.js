// ventana 1400x1000
/* Capítulo 7: el editor ✎ del biplot del Bloque 6, en su primera pestaña */
(async () => {
  await bloque(6);
  const fb = figura('b6FigPca');
  irA(fb, 170); await W(800);
  fb.querySelector('.fig-ed').click();
  await W(1500);
  const pn = vis('.fe-panel') || document.querySelector('.fe-panel');
  return caja([pn], 6);
})()
