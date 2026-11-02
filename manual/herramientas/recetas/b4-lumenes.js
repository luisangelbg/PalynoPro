// ventana 1400x1000
/* Capítulo 4: el título del bloque, «Cómo se mide» abierto y la tarjeta «Lúmenes» */
(async () => {
  await bloque(4);
  const P = porId('panel-4'), why = P.querySelector('details.why');
  why.open = true; await W(400);
  const t = tarjeta(4, I18N.lang === 'en' ? 'Lumina' : 'Lúmenes');
  irA(P.querySelector('.panel-title'), 110); await W(600);
  return caja([P.querySelector('.panel-title'), why, t], 8);
})()
