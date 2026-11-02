// ventana 1400x1000
/* Capítulo 4: los cuatro mosaicos de «Resultados» */
(async () => {
  await bloque(4);
  const t = tarjeta(4, I18N.lang === 'en' ? 'Results' : 'Resultados');
  irA(t, 110); await W(600);
  return caja([t.querySelector('h2'), porId('b4Tiles')], 10);
})()
