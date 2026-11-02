// ventana 1400x1000
/* Introducción: «Revisión de cada foto» del Bloque 3 con el primer grano simulado del morfotipo A, con sus capas */
(async () => {
  await bloque(3);
  const t = tarjeta(3, I18N.lang === 'en' ? 'Check of every picture' : 'Revisión de cada foto');
  irA(t, 100); await W(1500);
  return caja([t.querySelector('.viewer')], 8);
})()
