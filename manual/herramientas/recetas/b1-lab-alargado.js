// ventana 1400x1000
/* Capítulo 1: el laboratorio con un grano chico y alargado: 40 µm, elongación 1.30, 40 espinas de 3.5 µm, malla de 4.0 µm
   (sólo los mosaicos, las dos figuras y el renglón de estado) */
(async () => {
  await W(2500);
  const set = (id, v) => { const n = porId(id); n.value = v; n.dispatchEvent(new Event('input', { bubbles: true })); };
  set('labD', 40); set('labE', 1.3); set('labN', 40); set('labH', 3.5); set('labM', 4.0);
  await W(2500);
  const ns = seccion('lab'); irA(ns[0], 120); await W(800);
  return caja([porId('labTiles'), document.querySelector('#panel-1 .lab-grid'), porId('labStatus')], 8);
})()
