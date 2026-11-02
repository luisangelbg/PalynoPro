// ventana 1400x1000
/* Capítulo 3: las dos figuras de «Resultados»: el diámetro del cuerpo por grupo y los diámetros de Feret */
(async () => {
  await bloque(3);
  const g = figura('b3FigBox').parentElement;
  irA(g, 110); await W(800);
  return caja([g], 8);
})()
