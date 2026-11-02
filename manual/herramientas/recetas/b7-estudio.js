// ventana 1400x900
/* Capítulo 7: el biplot del Bloque 6 abierto en el estudio de figuras (la ventana entera) */
(async () => {
  await bloque(6);
  const fb = figura('b6FigPca');
  irA(fb, 170); await W(800);
  fb.querySelector('.lfs-open').click();
  await W(6000);
  return null;
})()
