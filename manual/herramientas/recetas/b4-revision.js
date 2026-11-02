// ventana 1400x1000
/* Capítulo 4: «Revisión de cada foto» con 01_C.png (malla del retículo más abierta): lúmenes, espinas y cuerpo */
(async () => {
  await bloque(4);
  const t = tarjeta(4, I18N.lang === 'en' ? 'Check of every picture' : 'Revisión de cada foto');
  const s = porId('b4Sel'), op = [...s.options].find(o => o.textContent.startsWith('01_C'));
  s.value = op.value; s.dispatchEvent(new Event('change'));
  await W(3500);
  /* in English the descenders of the card title (Check of every picture) would peek into the crop */
  if (I18N.lang === 'en') t.querySelector('h2').style.marginBottom = '24px';
  irA(t, 100); await W(800);
  return caja([t.querySelector('.viewer')], 8);
})()
