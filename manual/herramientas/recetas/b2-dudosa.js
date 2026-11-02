// ventana 1400x1000
/* Capítulo 2: un error de magnificación provocado a propósito: a 02_A.png se le escribe 1200 en vez de 1000 en la tabla.
   El mosaico «Barra comprobada» y el aviso de «Resumen» */
(async () => {
  await bloque(2);
  const r = state.images.find(x => x.name === '02_A.png');
  const inp = document.querySelector('#b2Table tr[data-id="' + r.id + '"] input.mag');
  inp.value = '1200'; inp.dispatchEvent(new Event('change', { bubbles: true }));
  await W(900);
  const t = tarjeta(2, I18N.lang === 'en' ? 'Summary' : 'Resumen'); irA(t, 170); await W(500);
  return caja([t], 8);
})()
