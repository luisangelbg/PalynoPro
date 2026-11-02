// ventana 1400x1000
/* Capítulo 7: la vista previa del informe en su sección 7 (un grano medido por grupo) y 8 (limitaciones) */
(async () => {
  await estadistica(); await fertilidad();
  goStep(7); await W(800);
  porId('b7Make').click();
  await esperar(() => !!state.results.reportMade); await W(2500);
  const f = porId('b7Frame'); f.style.height = '370px';
  const d = f.contentDocument, h = [...d.querySelectorAll('h2')].find(x => /^7\./.test(x.textContent));
  f.contentWindow.scrollTo(0, h.getBoundingClientRect().top + f.contentWindow.scrollY - 10);
  irA(f, 170); await W(1200);
  return caja([f], 4);
})()
