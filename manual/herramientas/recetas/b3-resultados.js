// ventana 1400x1000
/* Capítulo 3: la tarjeta «Resultados» sin sus figuras: los cuatro mosaicos y la tabla «Por grupo» (un grupo por
   columna, una medida por renglón) con su botón CSV */
(async () => {
  await bloque(3);
  const t = tarjeta(3, I18N.lang === 'en' ? 'Results' : 'Resultados');
  irA(t, 110); await W(600);
  const h3 = [...t.querySelectorAll('h3')].find(h => h.nextElementSibling && h.nextElementSibling.id === 'b3Groups');
  return caja([t.querySelector('h2'), porId('b3Tiles'), porId('b3Verd'), h3, porId('b3Groups'), porId('b3CsvG')], 10);
})()
