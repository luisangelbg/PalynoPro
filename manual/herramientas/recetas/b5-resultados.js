// ventana 1400x1000
/* Capítulo 5: la tarjeta «Resultados» sin sus figuras: mosaicos, veredictos y la tabla por grupo */
(async () => {
  await bloque(5);
  const t = tarjeta(5, I18N.lang === 'en' ? 'Results' : 'Resultados');
  irA(t, 110); await W(600);
  return caja([t.querySelector('h2'), porId('b5Tiles'), porId('b5Verd'), porId('b5Groups'), porId('b5Csv')], 10);
})()
