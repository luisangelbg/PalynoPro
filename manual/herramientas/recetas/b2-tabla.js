// ventana 1400x1000
/* Capítulo 2: la tarjeta «Imágenes» con el filtro «Todas»: los filtros, las primeras filas de la tabla y el botón del índice */
(async () => {
  await bloque(2);
  const t = tarjeta(2, I18N.lang === 'en' ? 'Images' : 'Imágenes'); irA(t, 170); await W(800);
  return caja([t], 8);
})()
