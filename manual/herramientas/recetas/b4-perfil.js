// ventana 1400x1000
/* Capítulo 4: «Perfil radial de la foto elegida» con 01_C.png */
(async () => {
  await bloque(4);
  const s = porId('b4Sel'), op = [...s.options].find(o => o.textContent.startsWith('01_C'));
  s.value = op.value; s.dispatchEvent(new Event('change'));
  await W(3000);
  const f = figura('b4FigProfile');
  irA(f, 110); await W(800);
  return caja([f], 8);
})()
