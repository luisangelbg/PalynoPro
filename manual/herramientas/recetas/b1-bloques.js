// ventana 1400x1000
/* Capítulo 1: «Los bloques», las seis tarjetas de los bloques 2 a 7 */
(async () => {
  await W(2200);
  const ns = seccion(I18N.lang === 'en' ? 'The blocks' : 'Los bloques'); irA(ns[0], 120); await W(700);
  return caja(ns, 8);
})()
