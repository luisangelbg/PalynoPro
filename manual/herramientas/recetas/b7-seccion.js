// ventana 1400x1000
/* Capítulo 7: la vista previa del informe en su sección 4 (comparación entre grupos), con el ejemplo simulado */
(async () => {
  await estadistica(); await fertilidad();
  goStep(7); await W(800);
  const pon = (id, v) => { const i = porId(id); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); };
  pon('b7Title', I18N.lang === 'en' ? 'Pollen morphometry of the simulated example' : 'Morfometría polínica del ejemplo simulado');
  porId('b7Make').click();
  await esperar(() => !!state.results.reportMade); await W(2500);
  const f = porId('b7Frame'); f.style.height = '700px';
  const d = f.contentDocument, h = [...d.querySelectorAll('h2')].find(x => /^4\./.test(x.textContent));
  f.contentWindow.scrollTo(0, h.getBoundingClientRect().top + f.contentWindow.scrollY - 10);
  irA(f, 170); await W(1200);
  return caja([f], 4);
})()
