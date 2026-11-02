// ventana 1400x1000
/* Capítulo 2: la tarjeta «Calibración y lectura de nombres» con el ejemplo simulado (valores por omisión) */
(async () => {
  await bloque(2);
  const t = tarjeta(2, I18N.lang === 'en' ? 'Calibration' : 'Calibración'); irA(t, 120); await W(500);
  return caja([t], 8);
})()
