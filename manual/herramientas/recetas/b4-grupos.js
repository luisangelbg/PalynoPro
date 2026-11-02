// ventana 1400x1000
/* Capítulo 4: la tabla «Por grupo» de «Resultados», en tres secciones (Espinas, Lúmenes, Textura), un grupo por
   columna, con su botón CSV */
(async () => {
  await bloque(4);
  const g = porId('b4Groups'), h3 = g.previousElementSibling;
  irA(h3, 110); await W(600);
  return caja([h3, g, porId('b4Csv')], 10);
})()
