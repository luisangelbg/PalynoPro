// ventana 1400x900
/* Capítulo 4: el bloque con el ejemplo abierto pero sin medir: «Primero mide los granos» */
(async () => {
  await bloque(4, 'ejemplo');
  const b = porId('b4Body');
  irA(b, 200); await W(500);
  return caja([b], 8);
})()
