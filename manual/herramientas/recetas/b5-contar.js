// ventana 1400x1000
/* Capítulo 5: el título del bloque, «Cómo se estima» abierto y la tarjeta «Contar» ya corrida */
(async () => {
  await bloque(5);
  const P = porId('panel-5'), why = P.querySelector('details.why');
  why.open = true; await W(400);
  const t = tarjeta(5, I18N.lang === 'en' ? 'Count' : 'Contar');
  irA(P.querySelector('.panel-title'), 110); await W(600);
  return caja([P.querySelector('.panel-title'), why, t], 8);
})()
