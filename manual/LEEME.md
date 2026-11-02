# Manual de usuario de PalynoPro

Manual en español, en HTML, pensado para imprimirse a PDF. Sigue la misma forma que los de
las demás aplicaciones LABG: hoja tamaño carta sin márgenes añadidos, Cormorant para los
títulos, Crimson Pro para el texto y Jost para los rótulos, y una portada **blanca** que es
**una sola ilustración vectorial original**, dibujada por código con los motores de la propia app.
La identidad es la de la app: el azul acero del haz de barrido (`#2f5f7a`) con el ámbar de la
exina (`#b5601d`) y el oro de la suite.

## Regla obligatoria: nada de las micrografías del usuario

**Decisión del autor.** Las capturas usan sólo el ejemplo simulado; no se usan micrografías reales:

- no se abren ni se cargan en la app para el manual;
- no se usan en capturas ni se describen en el texto;
- no se mencionan resultados de micrografías reales (morfotipos, diámetros medidos, porcentajes de fertilidad).

**Todas las capturas y todas las cifras salen del ejemplo simulado** de la app (botón
«Ejemplo simulado» del Bloque 2, o «Probar con el ejemplo simulado» de la portada) o de granos
simulados que la propia app genere (el laboratorio del Bloque 1). Las recetas abren siempre el
ejemplo con `ejemplo()` de `recetas/_comun.js`; ninguna receta abre archivos del disco.
Tampoco se citan aquí la herramienta anterior de septiembre ni lo que se corrigió de ella.

## Carpetas

```
manual/
  LEEME.md              este archivo
  GUIA-CAPITULOS.md     el encargo para quien escriba los capítulos 1 a 7 y los apéndices
  manual.css            hoja de estilo de la portada
  interior.css          hoja de estilo de las páginas interiores (colores por bloque, recuadros, tablas, figuras)
  paginar.js            reparte cada parte en hojas carta, con encabezado, número y pestaña
  es/                   las partes en español (y manual-completo.html, generado)
  en/                   la edición inglesa (por ahora sólo la portada; misma estructura)
  img/                  las capturas en español, una por receta; img/en/ las inglesas
  herramientas/         captura, revisión, anchos, portada, referencias y unión
    recetas/            una receta por captura; _comun.js se antepone a todas
```

## Cómo está partido

Un archivo por parte, en `es/`, y **cada capítulo explica el bloque del mismo número**; la
introducción no lleva número (sus secciones son I.1, I.2…). Los rótulos son los de la app.

| Archivo | Contenido |
|---|---|
| `00a-portada.html` | Portada (la escribe `herramientas/genera-portada.js`; no se edita a mano) |
| `00b-introduccion.html` | Créditos, índice general, cómo leer el manual e introducción (I.1 a I.10) — **escrita** |
| `01-bloque1.html` | Capítulo 1 · Inicio: la portada («Del micrografo electrónico a la clave polínica», cuatro botones), «Cómo funciona» (7 pasos), «Pruébalo: así mide un grano» (laboratorio), «Los bloques», «El polen bajo el microscopio electrónico, en lenguaje llano» (6 temas), «Los métodos y de dónde vienen» (14), «Lo que este programa no hace» (6), «Referencias» (21) y «Cómo citar» |
| `02-bloque2.html` | Capítulo 2 · Imágenes y calibración: abrir una carpeta o el ejemplo; «Resumen»; «Calibración y lectura de nombres»; «Grupos»; «Imágenes» (filtros y tabla); «Visor» (barra medida a mano) |
| `03-bloque3.html` | Capítulo 3 · Contorno y tamaño: «Cómo se mide», «Medir», «Resultados», «Revisión de cada foto» |
| `04-bloque4.html` | Capítulo 4 · Ornamentación: «Cómo se mide», «Lúmenes», «Resultados», «Revisión de cada foto» y perfil radial |
| `05-bloque5.html` | Capítulo 5 · Fertilidad: «Cómo se estima», «Contar», «Resultados», «Revisión de cada panorámica» |
| `06-bloque6.html` | Capítulo 6 · Estadística multivariada: «Qué se calcula», «Variables», «En resumen», «Por variable», «Componentes principales», «PERMANOVA», «Clave polínica: clasificar un grano» |
| `07-bloque7.html` | Capítulo 7 · Informe: «Datos del informe», generar, imprimir y descargar, lo que lleva el informe, las figuras (SVG, PNG, estudio, editor ✎), guardar y retomar el proyecto |
| `08-apendices.html` | Apéndices A–F: A archivos que lee y escribe, B reglas reunidas, C glosario, D cuando algo falla, E licencia y cita, F referencias (las escribe `genera-referencias.js`) |
| `manual-completo.html` | Las partes unidas, que es lo que se imprime (lo genera `herramientas/unir-manual.ps1`; no se edita a mano) |

`GUIA-CAPITULOS.md` trae, bloque por bloque, las tarjetas, los controles y los valores por omisión.

La portada usa sólo `manual.css`, porque es una hoja entera de dibujo. Todo lo demás usa
`interior.css` y `paginar.js`, que reparten el texto en hojas con su encabezado corrido
(«PalynoPro · Manual de usuario», o «PalynoPro · User’s Manual» cuando la parte lleva `lang="en"`),
su número de página y la pestaña del capítulo en el margen (nueve pestañas: In, 1 a 7 y Ap,
separadas 0.95 in). Los números de página del índice se llenan solos; en una parte suelta quedan
en blanco, que es lo esperado hasta que se unen. El índice general de `00b-introduccion.html` ya
trae el h1 y los h2 propuestos de cada capítulo con sus `id` (`cap-N`, `sN-M`, `ap-a`…`ap-f`):
quien escriba un capítulo lo ajusta si cambia un título.

## Los colores de los bloques

La app no tiene un color por bloque, así que se tomaron de su propia paleta (`css/style.css`):
el azul acero y el ámbar de la identidad y cinco colores de la paleta de grupos (`--chart3`,
`--chart4`, `--chart7`, `--chart8` y el café de la exina, `--exine-dark`). Todos llevan texto blanco encima.

| Variable | Color | Bloque |
|---|---|---|
| `--b0` | `#1d3442` acero muy oscuro | Preliminares e introducción (pestaña In) |
| `--b1` | `#2f5f7a` azul acero | 1 · Inicio |
| `--b2` | `#b5601d` ámbar de la exina | 2 · Imágenes y calibración |
| `--b3` | `#2f7d4f` verde | 3 · Contorno y tamaño |
| `--b4` | `#8e3f8e` violeta | 4 · Ornamentación |
| `--b5` | `#b33b55` carmín | 5 · Fertilidad |
| `--b6` | `#5a6bb5` índigo | 6 · Estadística multivariada |
| `--b7` | `#8a5a22` café de la exina | 7 · Informe |
| `--bx` | `#1d3442` acero muy oscuro | Apéndices (pestaña Ap) |

Las clases `.k0` a `.k7` y `.kx` pintan los chips del índice y las franjas; cada capítulo
pone `style="--acento: var(--bN)"` en su `<section>`. Los recuadros «aviso» y «error» usan el
ámbar (`--ambar`) y «idea» el índigo, fijos, para que no cambien de color con el capítulo.

## Las capturas

Las imágenes de `img/` salen de la app misma, a doble resolución, con una receta por imagen en
`herramientas/recetas/`. Cada receta es un fragmento que abre un bloque con el ejemplo, ajusta
los controles y devuelve el recorte; su primera línea dice el tamaño de la ventana
(`// ventana 1400x1000`). `recetas/_comun.js` se antepone a todas:

| Ayudante | Qué hace |
|---|---|
| `ejemplo()` | Abre el ejemplo simulado (`Block2.loadExample()`; el `confirm` se contesta solo) |
| `medir()` | El ejemplo y «Medir todas las fotos de un grano» del Bloque 3 (también da el Bloque 4) |
| `fertilidad()` | El ejemplo y «Contar en todas las panorámicas» del Bloque 5 |
| `estadistica()` | `medir()` y «Comparar los grupos» del Bloque 6 |
| `informe()` | Todo lo anterior y «Generar el informe» del Bloque 7 |
| `bloque(n, hasta)` | Prepara lo que el bloque `n` necesita y lo abre; `hasta = 'nada'` lo abre vacío |
| `esperar(cond)` | Espera a que se cumpla `cond()` y a que se cierre la capa de espera (`.lw-backdrop`) |
| `tarjeta(n, i)`, `figura(id)`, `seccion(id)` | Una tarjeta por su título h2, el recuadro de una figura por su id, una sección de la portada |
| `irA`, `caja`, `vis`, `porId`, `W` | Llevar a la vista, recortar, buscar, esperar |

Además esconde los botones flotantes del navegador LABG y los avisos emergentes. Medir los 30
granos del ejemplo tarda unos 20 s en el navegador sin ventana; contar las panorámicas y comparar
los grupos, unos segundos más.

**Con qué datos salen.** Sólo con el ejemplo simulado (`js/synth.js`, `Images.openExample`):
tres morfotipos, A, B y C, de 8 granos cada uno; cada grano en una foto de 1280 × 960 px a
1000× (0.1 µm/px), los granos 3 y 6 de cada morfotipo fotografiados dos veces (`03a_A.png`), y
una panorámica por morfotipo a 150× con 14 granos (`90_A.png`): 33 imágenes, 30 fotos de un
grano, 24 granos, 3 panorámicas. Los granos se dibujan con semillas fijas: cada vez salen iguales.
Valores por omisión de cada control salvo que la receta diga otra cosa.

Recetas ya hechas (introducción): `i-inicio` (portada de la app), `i-interfaz` (Bloque 3 medido,
con 13 marcas), `i-buscar` («Feret» en `Ctrl + K`), `i-revision` (revisión de `01_A.png`),
`i-ejemplo` (aviso y «Resumen» del Bloque 2) e `i-flujo` («Cómo funciona», a 1800 px de ancho
porque a 1400 px la tira de los siete pasos se corta).

Desde la raíz de la app (no hay `node` en el PATH de este equipo; se usa el de Creative Cloud):

```
set NODE="C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe"
%NODE% manual/herramientas/captura.js i-revision                    # una
%NODE% manual/herramientas/captura.js i-revision --idioma en --salida en/i-revision
%NODE% manual/herramientas/captura.js --todas                       # todas
%NODE% manual/herramientas/captura.js --todas --idioma en           # todas, en inglés, a img/en/
```

El idioma se elige escribiendo la clave `palynopro.lang` en el almacenamiento del navegador
antes de abrir la app. Si una receta deja en `window.__marcas` una lista `[[n, x%, y%], …]`, la
herramienta escribe además `img/<nombre>.marcas.json` con la posición de los círculos numerados
que el texto pone encima (`<span class="marca" style="left:…%;top:…%">n</span>`).
**Después de cambiar algo visible en la app, se vuelven a sacar las capturas afectadas**: el texto
del manual cita los números que se ven en ellas, y todos se comprueban en la app.

## Las herramientas

Todas usan `cdp.js`, que abre Edge (o Chrome) sin ventana con un perfil temporal propio
(`palynopro-manual-<puerto>` en la carpeta temporal), activa `Emulation.setFocusEmulationEnabled`
(para que la página se crea visible y siga pintando en tandas largas), le pide cerrarse con
`Browser.close` y borra el perfil al terminar; si el navegador no se cierra, cierra sólo los
procesos de ese perfil. Nunca toca el navegador del usuario. Node 18 o posterior; sin dependencias.

| Herramienta | Para qué |
|---|---|
| `captura.js` | Saca una captura de la app con su receta (`--idioma en` para la interfaz inglesa) |
| `revisar.js` | Dice cuántas hojas salen, si alguna desborda, las imágenes que no cargaron y los huecos grandes al pie de cada hoja, con la figura que los causa (`… revisar.js manual/es/05-bloque5.html --huecos 1.2`) |
| `anchos.js` | Pone o quita las clases de ancho de las figuras por el nombre de su imagen (`… anchos.js archivo b5-resultados=w70 …`; `=w100` la quita) |
| `genera-portada.js` | Dibuja la portada blanca con los motores de la app sobre el ejemplo simulado: el grano 01 del morfotipo B medido (contorno, cuerpo, espinas, retículo), su perfil radial, la franja de los bloques y tres viñetas (los tres morfotipos, la panorámica clasificada y los componentes principales de los 24 granos); `--idioma en` para la inglesa. Tarda cerca de un minuto |
| `genera-referencias.js` | Escribe las referencias del apéndice F desde `js/home.js` (`Home.REFS`, 21 obras), agrupadas en tres temas, entre las marcas `<!-- REFERENCIAS -->` y `<!-- /REFERENCIAS -->` de `08-apendices.html`; `--idioma en` para la inglesa |
| `unir-manual.ps1` | Une las partes en `manual-completo.html`, con el título en el idioma de la carpeta («PalynoPro · Manual de usuario» o «PalynoPro · User’s Manual») |

Las figuras demasiado altas para la hoja se angostan con las clases `figure.w50` a `figure.w80`
de `interior.css`; los textos de las capturas no deben quedar por debajo de lo legible (una
captura con mucho texto, no menos de `w70`). `paginar.js` adelanta el texto que sigue a una figura
que no cabe, así que un hueco al pie de una hoja no siempre se arregla moviendo párrafos.

## Cómo se trabaja

1. Escribir la parte en `es/NN-bloqueN.html` con la estructura de `GUIA-CAPITULOS.md`.
2. Sacar sus capturas con su receta y mirarlas una por una (la herramienta las deja en `img/`).
3. Revisar la paginación: `revisar.js` con `--huecos 1.2`; ningún desborde, ninguna imagen sin
   cargar, y los huecos grandes sólo antes de una figura que de verdad no cabe. Ajustar anchos con
   `anchos.js`.
4. Cuando estén todas las partes, escribir las referencias y unirlas:

```
"C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe" manual/herramientas/genera-referencias.js
cd manual
powershell -ExecutionPolicy Bypass -File herramientas\unir-manual.ps1 es
```

Escribe `es/manual-completo.html` con la portada como primera hoja y las nueve partes en orden,
con un solo `paginar.js`, de modo que la numeración sea continua y el índice encuentre las páginas
de todos los capítulos. Los estilos propios de cada parte se funden; si dos partes escriben el mismo
selector con valores distintos, gana el más frecuente y el otro se acota a las hojas de su capítulo.
**El script tiene que guardarse con marca de orden de bytes (BOM)**: Windows PowerShell 5.1 lee como
ANSI un `.ps1` sin ella, y el `·` del título saldría mal.

## Cómo se obtiene el PDF

**Sólo al final**, cuando todas las partes están escritas y revisadas, y **de una sola vez**: unir
PDF sueltos pierde los enlaces del índice y reinicia la numeración. No se imprime tras cada parte ni
tras cada corrección. Después de unir, se imprime con el guion de PowerShell que maneja Chrome por el
protocolo de DevTools y espera a que carguen las tres tipografías y a que `paginar.js` reparta las
hojas (no se usa `--print-to-pdf`, que imprime antes):

```
powershell -ExecutionPolicy Bypass -File "C:\Users\luisa\AppData\Local\Temp\claude\C--Users-luisa-Documents\0c3144d8-eb0a-4647-b9f1-c07d0731f8ee\scratchpad\imprimir-pdf.ps1" ^
  -Url "file:///C:/Users/luisa/Documents/LABG%20Apps/PalynoPro/manual/es/manual-completo.html" ^
  -Out "C:\Users\luisa\Documents\LABG Apps\PalynoPro\manual\PalynoPro_Manual_de_usuario_ES.pdf" ^
  -Prof "%TEMP%\palynopro-pdf"
```

(o sirviendo la carpeta con `server.ps1` y pasando `-Url http://localhost:9940/manual/es/manual-completo.html`).
Al terminar se borra el perfil temporal `%TEMP%\palynopro-pdf` y se comprueba que no quedó
ningún Chrome sin ventana de ese perfil (sin cerrar los navegadores del usuario). También se puede
imprimir a mano desde el navegador: destino **Guardar como PDF**, márgenes **Ninguno** y
**Gráficos de fondo** activado.

El resultado se guarda como `manual/PalynoPro_Manual_de_usuario_ES.pdf`, igual que en las demás apps.

## El enlace desde la app

La app todavía no enlaza al manual. Conviene ponerlo, como en ForestPro, en la nota del pie de la
portada (`index.html`, `<p class="footer-note">` del Bloque 1): `manual/es/manual-completo.html` en
español y `manual/en/manual-completo.html` en inglés, con `target="_blank"`.

## De fuera

Las tres tipografías (Cormorant, Crimson Pro y Jost) vienen del servicio público de tipografías web
y sólo las usa el manual, no la app; tienen licencia SIL Open Font License. Todo lo demás —el texto,
las capturas, la portada y las herramientas— es propio. El manual no nombra programas ni marcas:
los resultados de la app se validaron contra un entorno estadístico de referencia, pero eso se
documenta en `validation/` (que no forma parte de la obra), no aquí.
