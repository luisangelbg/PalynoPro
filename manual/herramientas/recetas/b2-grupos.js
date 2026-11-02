// ventana 1400x1000
/* Capítulo 2: la tarjeta «Grupos» con el ejemplo simulado */
(async () => {
  await bloque(2);
  const t = tarjeta(2, I18N.lang === 'en' ? 'Groups' : 'Grupos'); irA(t, 120); await W(500);
  return caja([t], 8);
})()
