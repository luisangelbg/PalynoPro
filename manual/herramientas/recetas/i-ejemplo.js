// ventana 1400x1000
/* Introducción: el ejemplo simulado recién abierto (Bloque 2): el mensaje que lo presenta y la tarjeta «Resumen» */
(async () => {
  await bloque(2);
  const msg = porId('b2Msg'), t = tarjeta(2, I18N.lang === 'en' ? 'Summary' : 'Resumen');
  irA(msg, 120); await W(600);
  return caja([msg, t], 8);
})()
