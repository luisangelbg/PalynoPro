/* PalynoPro — manual de usuario: escribe las referencias del apéndice F a partir del catálogo de la app.
   Lee js/home.js (Home.REFS: la lista de referencias que la app muestra en Bloque 1 › Referencias) y reemplaza lo
   que hay entre las marcas <!-- REFERENCIAS --> y <!-- /REFERENCIAS --> de es/08-apendices.html: un apartado por
   tema (palinología, análisis de imágenes, estadística y clasificación), con las obras en orden alfabético. La app
   no agrupa sus referencias por tema; el tema de cada una lo pone este guion por su primer autor (TEMA, abajo), y
   una referencia nueva que no esté en TEMA sale en «Otras» con un aviso. Así el manual y el programa citan
   exactamente lo mismo.
   Uso, desde la carpeta de la app:
          node manual/herramientas/genera-referencias.js              (es/08-apendices.html)
          node manual/herramientas/genera-referencias.js --idioma en  (en/08-apendices.html: los títulos de los temas en
                                                                        inglés; las referencias se dejan como las
                                                                        escribe la app, que ya están en inglés) */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const raiz = path.resolve(__dirname, '..', '..');
/* home.js only needs these names when it is loaded; its builders run on DOMContentLoaded, which never comes */
const noop = () => {};
const caja = { console, document: { addEventListener: noop }, L2: (a) => a, T: (a) => a, el: () => null, esc: (s) => s, STEPS: [], APP_VERSION: '1.0.0' };
caja.window = caja;
vm.createContext(caja);
vm.runInContext(fs.readFileSync(path.join(raiz, 'js', 'home.js'), 'utf8'), caja);
const { REFS } = caja.window.Home;
const iIdioma = process.argv.indexOf('--idioma'), en = iIdioma > 0 && process.argv[iIdioma + 1] === 'en';
const lang = en ? 'en' : 'es';

/* the topic of each reference, by the surname of its first author */
const TEMAS = [
  ['pal', 'Palinología y terminología polínica', 'Palynology and pollen terminology', ['Erdtman', 'Halbritter', 'Punt']],
  ['img', 'Análisis de imágenes', 'Image analysis', ['Andrew', 'Borgefors', 'Haralick', 'Niblack', 'Otsu', 'Serra', 'Shamos', 'Wolberg']],
  ['est', 'Estadística, análisis multivariado y clasificación', 'Statistics, multivariate analysis and classification',
    ['Anderson', 'Breiman', 'Cohen', 'Fisher', 'Holm', 'Hotelling', 'Kruskal', 'McArdle', 'Pearson', 'Tukey', 'Wilson']],
];
const temaDe = r => { const a = r.split(/[ ,]/)[0]; const t = TEMAS.find(T => T[3].includes(a)); return t ? t[0] : 'otr'; };
const clave = s => s.replace(/<[^>]+>/g, '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const escHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const grupos = TEMAS.map(T => [T[0], en ? T[2] : T[1]]).concat([['otr', en ? 'Other' : 'Otras']]);
let total = 0, html = '\n', n = 0;
grupos.forEach(([t, nombre]) => {
  const lista = REFS.filter(r => temaDe(r) === t).sort((a, b) => clave(a).localeCompare(clave(b), lang));
  if (!lista.length) return;
  if (t === 'otr') console.warn('Aviso: ' + lista.length + ' referencia(s) sin tema en TEMAS: ' + lista.map(r => r.slice(0, 30)).join(' | '));
  total += lista.length; n++;
  html += `  <h3>F.${n} · ${nombre}</h3>\n  <ul class="refs">\n` + lista.map(r => `    <li>${escHtml(r)}</li>`).join('\n') + '\n  </ul>\n';
});

const archivo = path.join(raiz, 'manual', lang, '08-apendices.html');
if (!fs.existsSync(archivo)) { console.log(`${total} referencias en ${n} temas; todavía no existe ${path.relative(raiz, archivo)}`); process.exit(0); }
const texto = fs.readFileSync(archivo, 'utf8');
const a = texto.indexOf('<!-- REFERENCIAS -->'), b = texto.indexOf('<!-- /REFERENCIAS -->');
if (a < 0 || b < 0) throw new Error('No encontré las marcas de las referencias en ' + archivo);
fs.writeFileSync(archivo, texto.slice(0, a + '<!-- REFERENCIAS -->'.length) + html + '  ' + texto.slice(b));
console.log(`${total} referencias en ${n} temas escritas en ${path.relative(raiz, archivo)}`);
