// ventana 1400x1000
/* Capítulo 2: la misma magnificación equivocada (1200× en 02_A.png): la tabla con el filtro «Barra dudosa» y el visor con esa foto */
(async () => {
  await bloque(2);
  const r = state.images.find(x => x.name === '02_A.png');
  const inp = document.querySelector('#b2Table tr[data-id="' + r.id + '"] input.mag');
  inp.value = '1200'; inp.dispatchEvent(new Event('change', { bubbles: true }));
  await W(900);
  [...document.querySelectorAll('#b2Filter .chip')].find(b => b.dataset.f === 'flag').click();
  await W(600);
  await Block2.showImage(r.id); await W(900);
  const t = tarjeta(2, I18N.lang === 'en' ? 'Images' : 'Imágenes'), v = porId('b2Meta');
  irA(t, 170); await W(500);
  return caja([t], 8);
})()
