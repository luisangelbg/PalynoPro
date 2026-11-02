// ventana 1400x1000
/* Capítulo 1: «Pruébalo: así mide un grano» con los valores por omisión (66 µm, 1.06, 26 espinas, 2.2 µm, malla 2.6 µm) */
(async () => {
  await W(2500);
  const ns = seccion('lab'); irA(ns[0], 120); await W(800);
  return caja(ns, 8);
})()
