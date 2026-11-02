// ventana 1400x1000
/* Capítulo 7: «Datos del informe» con un título y un material neutros del ejemplo simulado, después de «Generar el informe» */
(async () => {
  await estadistica(); await fertilidad();
  goStep(7); await W(800);
  const pon = (id, v) => { const i = porId(id); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); };
  pon('b7Title', I18N.lang === 'en' ? 'Pollen morphometry of the simulated example' : 'Morfometría polínica del ejemplo simulado');
  pon('b7Species', I18N.lang === 'en' ? 'Three simulated morphotypes (A, B and C)' : 'Tres morfotipos simulados (A, B y C)');
  porId('b7Make').click();
  await esperar(() => !!state.results.reportMade); await W(1500);
  window.scrollTo({ top: 0, behavior: 'instant' }); await W(400);
  const t = tarjeta(7, I18N.lang === 'en' ? 'Details of the report' : 'Datos del informe');
  irA(t, 170); await W(800);
  return caja([t], 8);
})()
