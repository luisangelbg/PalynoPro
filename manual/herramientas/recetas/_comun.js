/* PalynoPro — manual: ayudantes que captura.js antepone a cada receta.
   W(ms)                 espera
   vis(sel, txt)         el primer elemento visible que coincide (y cuyo texto empieza con txt)
   irA(nodo, margen)     lleva el nodo a la vista, debajo de las barras fijas
   caja(nodos, p)        el recorte que envuelve a los nodos, con p píxeles de aire, en coordenadas del documento
   porId(id)             document.getElementById, con error claro si no existe
   seccion(id)           los nodos de una sección de la portada (Bloque 1): su título .section-title y lo que sigue
                         hasta el siguiente título; id es el del título (lab, theory, refs, cite) o el comienzo de su
                         texto en el idioma activo («Cómo funciona», «Los bloques», «Los métodos»…)
   esperar(cond, ms)     espera a que cond() sea verdadera (y a que se cierre la capa de espera de la app)
   ejemplo()             abre el ejemplo simulado (Bloque 2 › Ejemplo simulado): tres morfotipos dibujados por la app,
                         A, B y C, con 8 granos cada uno (30 fotos de un grano, 6 de ellas repetidas, y 3 panorámicas)
   medir()               el ejemplo y, en el Bloque 3, «Medir todas las fotos de un grano» (contorno, tamaño y
                         ornamentación salen de la misma pasada)
   fertilidad()          el ejemplo y, en el Bloque 5, «Contar en todas las panorámicas»
   estadistica()         medir() y, en el Bloque 6, «Comparar los grupos» (con los valores por omisión)
   informe()             todo lo anterior y, en el Bloque 7, «Generar el informe»
   bloque(n, hasta)      prepara lo que el bloque n necesita y lo abre: 1 nada; 2 el ejemplo; 3 y 4 medir();
                         5 fertilidad(); 6 estadistica(); 7 informe(). hasta = 'nada' abre el bloque sin datos,
                         'ejemplo' sólo con el ejemplo abierto, 'medir' con los granos medidos
   tarjeta(n, i)         la i-ésima tarjeta (.card) visible del bloque n; o, si i es texto, la tarjeta cuyo título h2
                         empieza con ese texto (en el idioma activo)
   figura(id)            el recuadro de una figura de la app por su id (b3FigBox, b6FigPca…), con su título
   Los textos se comparan con innerText (sólo el idioma visible: la app escribe los dos y esconde uno con CSS).
   La interfaz sale en el idioma que captura.js deja guardado (palynopro.lang); los textos que se buscan con vis() o
   tarjeta() deben estar en ese idioma, o buscarse por id.
   REGLA: las capturas salen SÓLO del ejemplo simulado de la app. Nunca se abren las micrografías del usuario. */
var W = ms => new Promise(r => setTimeout(r, ms));
var vis = (sel, txt) => [...document.querySelectorAll(sel)].find(n => { const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (!txt || (n.innerText || n.textContent).trim().startsWith(txt)); });
var irA = (n, margen) => { window.scrollTo({ top: n.getBoundingClientRect().top + window.scrollY - (margen == null ? 150 : margen), behavior: 'instant' }); };
var caja = (nodos, p) => {
  p = p == null ? 10 : p;
  const rs = [].concat(nodos).filter(Boolean).map(n => n.getBoundingClientRect()).filter(r => r.width > 0);
  const x = Math.min(...rs.map(r => r.left)) - p, y = Math.min(...rs.map(r => r.top)) - p;
  const w = Math.max(...rs.map(r => r.right)) + p - x, h = Math.max(...rs.map(r => r.bottom)) + p - y;
  return [Math.max(0, x + window.scrollX), Math.max(0, y + window.scrollY), w, h].map(Math.round).join(',');
};
var porId = id => { const n = document.getElementById(id); if (!n) throw new Error('No existe #' + id); return n; };
var seccion = id => {
  const h = document.getElementById(id) || vis('#panel-1 .section-title', id);
  if (!h) throw new Error('No encuentro la sección ' + id);
  const out = [h];
  let n = h.nextElementSibling;
  while (n && !n.classList.contains('section-title')) { out.push(n); n = n.nextElementSibling; }
  return out;
};
/* the waiting layer of the app (LABG.work: .lw-backdrop) must be gone, too */
var esperar = async (cond, ms) => {
  const t0 = Date.now();
  while (Date.now() - t0 < (ms || 180000)) {
    if (cond() && !document.querySelector('.lw-backdrop')) return true;
    await W(250);
  }
  throw new Error('Tiempo agotado esperando el cálculo');
};
/* the example replaces the images: the app asks with window.confirm, answered here always yes */
var ejemplo = async () => {
  window.confirm = () => true;
  if (state.example === 'synth' && state.images.length) return;
  await W(600);
  goStep(2); await W(400);
  await Block2.loadExample();
  await esperar(() => state.images.length > 0);
  await W(800);
};
var medir = async () => {
  await ejemplo();
  if (Object.keys(state.results.images).length) return;
  goStep(3); await W(500);
  porId('b3Run').click();
  await esperar(() => Object.keys(state.results.images).length > 0 && porId('b3Msg').textContent.trim().length > 0);
  await W(800);
};
var fertilidad = async () => {
  await ejemplo();
  if (state.results.fertility && state.results.fertility.per) return;
  goStep(5); await W(500);
  porId('b5Run').click();
  await esperar(() => !!(state.results.fertility && state.results.fertility.per));
  await W(800);
};
var estadistica = async () => {
  await medir();
  if (state.results.stats) return;
  goStep(6); await W(500);
  porId('b6Run').click();
  await esperar(() => !!state.results.stats);
  await W(800);
};
var informe = async () => {
  await estadistica(); await fertilidad();
  goStep(7); await W(500);
  porId('b7Make').click();
  await esperar(() => !!state.results.reportMade);
  await W(2500);
};
var bloque = async (n, hasta) => {
  await W(900);
  if (hasta !== 'nada') {
    if (hasta === 'ejemplo' || n === 2) await ejemplo();
    else if (hasta === 'medir' || n === 3 || n === 4) await medir();
    else if (n === 5) await fertilidad();
    else if (n === 6) await estadistica();
    else if (n === 7) await informe();
  }
  goStep(n); await W(1200);
  window.scrollTo({ top: 0, behavior: 'instant' }); await W(300);
};
var tarjeta = (n, i) => {
  const cs = [...document.querySelectorAll('#panel-' + n + ' .card')].filter(c => c.getBoundingClientRect().height > 0);
  if (typeof i === 'string') return cs.find(c => { const h = c.querySelector('h2'); return h && h.innerText.trim().startsWith(i); });
  return cs[i || 0];
};
var figura = id => { const n = porId(id); return n.closest('.fig-block, .figure-block, figure') || n.parentElement; };
/* the floating buttons of the navigator (back to top, last change) and the toasts stay out of the captures */
(() => {
  const st = document.createElement('style');
  st.textContent = '.lnav-fbtn, .lnav-float, [data-lnav="top"], [data-lnav="last"], .toast-stack { display: none !important; }';
  document.head.appendChild(st);
})();
