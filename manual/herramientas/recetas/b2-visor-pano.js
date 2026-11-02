// ventana 1400x1000
/* Capítulo 2: «Visor» con la panorámica del morfotipo B (90_B.png): 150×, 0.66667 µm por píxel */
(async () => {
  await bloque(2);
  const r = state.images.find(x => x.name === '90_B.png');
  await Block2.showImage(r.id);
  const t = porId('b2ViewerCard'); irA(t, 90); await W(1200);
  return caja([t], 8);
})()
