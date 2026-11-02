// ventana 1400x1000
/* Capítulo 1: «El polen bajo el microscopio electrónico, en lenguaje llano», con el segundo tema (la calibración) abierto */
(async () => {
  await W(2200);
  [...document.querySelectorAll('#theoryHost details')].forEach((d, i) => { d.open = i === 1; });
  await W(300);
  const ns = seccion('theory'); irA(ns[0], 120); await W(700);
  return caja(ns, 8);
})()
