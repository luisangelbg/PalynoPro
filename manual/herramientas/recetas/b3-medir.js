// ventana 1400x1000
/* Capítulo 3: el título del bloque, «Cómo se mide» abierto y la tarjeta «Medir» con el ejemplo ya medido */
(async () => {
  await bloque(3);
  const P = porId('panel-3'), why = P.querySelector('details.why');
  why.open = true; await W(400);
  const t = tarjeta(3, I18N.lang === 'en' ? 'Measure' : 'Medir');
  irA(P.querySelector('.panel-title'), 110); await W(600);
  return caja([P.querySelector('.panel-title'), why, t], 8);
})()
