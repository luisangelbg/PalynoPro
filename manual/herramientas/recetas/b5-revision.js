// ventana 1400x1000
/* Capítulo 5: «Revisión de cada panorámica» con 90_B.png, la panorámica del morfotipo B (con el título de la tarjeta,
   para que no asome recortado encima de la foto) */
(async () => {
  await bloque(5);
  const t = tarjeta(5, I18N.lang === 'en' ? 'Check of every overview' : 'Revisión de cada panorámica');
  const s = porId('b5Sel'), op = [...s.options].find(o => o.textContent.startsWith('90_B'));
  s.value = op.value; s.dispatchEvent(new Event('change'));
  await W(3500);
  irA(t, 100); await W(800);
  return caja([t.querySelector('h2'), t.querySelector('.viewer')], 8);
})()
