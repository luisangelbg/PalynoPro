// ventana 1400x1000
/* Capítulo 6: la tarjeta «Componentes principales» del Bloque 6 con el ejemplo simulado medido y los grupos comparados (valores por omisión) */
(async () => {
  await bloque(6);
  const t = tarjeta(6, I18N.lang === 'en' ? 'Principal components' : 'Componentes principales');
  irA(t, 170); await W(1200);
  return caja([t], 8);
})()
