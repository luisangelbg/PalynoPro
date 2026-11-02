// ventana 1400x1000
/* Capítulo 7: la «Vista previa» del informe con su portada (título y material neutros del ejemplo simulado) */
(async () => {
  await estadistica(); await fertilidad();
  goStep(7); await W(800);
  const pon = (id, v) => { const i = porId(id); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); };
  pon('b7Title', I18N.lang === 'en' ? 'Pollen morphometry of the simulated example' : 'Morfometría polínica del ejemplo simulado');
  pon('b7Species', I18N.lang === 'en' ? 'Three simulated morphotypes (A, B and C)' : 'Tres morfotipos simulados (A, B y C)');
  porId('b7Make').click();
  await esperar(() => !!state.results.reportMade); await W(2500);
  const c = porId('b7PrevCard'), f = porId('b7Frame');
  f.style.height = '620px';
  irA(c, 170); await W(1200);
  return caja([c], 8);
})()
