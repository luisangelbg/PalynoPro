# Guía para escribir los capítulos del manual de PalynoPro

Encargo breve para quien escriba los capítulos 1 a 7 y los apéndices. Antes de empezar, lee
`LEEME.md` (carpetas, herramientas, colores), mira `es/00b-introduccion.html` (el índice general ya
trae los títulos y los `id` propuestos, y la introducción ya dice lo general: no lo repitas) y, como
modelo de forma y de tono, los capítulos del manual de CytogeneticsPro
(`..\..\CytogeneticsPro\manual\es\02-bloque2.html` y `11-apendices.html`).
Todo en español, de tú, en lenguaje llano y con precisión técnica.

## 0. Regla obligatoria: sólo el ejemplo simulado

**Decisión del autor.** Las capturas usan sólo el ejemplo simulado; no se usan micrografías reales. Por lo tanto:

- **No las abras ni las cargues en la app**, ni para probar.
- **No las uses en capturas ni las describas** en el texto.
- **No menciones resultados de micrografías reales**: ni morfotipos, ni diámetros medidos, ni porcentajes de
  fertilidad. Tampoco la herramienta de septiembre ni lo que se corrigió de ella.

Todas las capturas y todas las cifras salen del **ejemplo simulado** de la app (`ejemplo()` en
`recetas/_comun.js`) o de granos simulados que genere la propia app (el laboratorio del Bloque 1).
Para explicar la clave de grupos usa un ejemplo inventado (`A = Morfotipo A`), nunca un nombre de morfotipo real.

## 1. Las partes y lo que hay en cada bloque

Los títulos de sección (h2) son una propuesta; los rótulos entre comillas son los de la app y se citan
**exactamente** como aparecen en pantalla en español. El subtítulo de cada bloque es el que muestra la
app bajo su título. Los valores por omisión están en `js/core.js` (`emptyState().set`).

### Capítulo 1 · Inicio (`01-bloque1.html`, `--b1`, sin ejemplo)

Portada: rótulo «Palinología cuantitativa», título «Del micrografo electrónico a la clave polínica»
(sic: ver errores), botones «Abrir mis imágenes →», «Probar con el ejemplo simulado», «Ver cómo mide»,
«Abrir un proyecto»; cuatro insignias; el grano de la portada (`Art.hero`).

| h2 propuesto | Lo que lleva |
|---|---|
| 1.1 La portada | lo de arriba; qué hace cada botón (el del ejemplo va al Bloque 2 y abre el ejemplo) |
| 1.2 Cómo funciona: los siete pasos | «Cómo funciona»: Abrir las imágenes, Calibrar y comprobar, Contorno y tamaño, Ornamentación, Fertilidad, Comparar grupos, Informe (captura a 1800 px de ancho: a 1400 la tira se corta) |
| 1.3 Pruébalo: así mide un grano | deslizadores «Diámetro del cuerpo» (30–100, 66 µm), «Elongación» (1–1.4, 1.06), «Espinas en el contorno» (8–50, 26), «Altura de espina» (0.6–4, 2.2 µm), «Malla del retículo» (1.6–4.4, 2.6 µm); seis mosaicos dibujado contra medido (Diámetro del cuerpo, Feret, Espinas en el contorno, Altura de espina, Lumen (mediana), Barra de escala); «El grano simulado y lo que se midió» y «Perfil radial: contorno, cuerpo y espinas»; el renglón de estado con el error en % |
| 1.4 Los bloques | las seis tarjetas de los bloques 2–7 con su etiqueta (Datos, Morfometría, Ornamentación, Viabilidad, Comparación, Publicación) |
| 1.5 El polen bajo el microscopio electrónico | «El polen bajo el microscopio electrónico, en lenguaje llano», 6 temas: cómo se ve un grano; la calibración; cuerpo y ornamentación; el retículo; el grano es la unidad; fertilidad a partir de la forma |
| 1.6 Los métodos y de dónde vienen | 14 tarjetas (Calibración, Imagen, Forma, Superficie, Estadística, Multivariada, Clasificación, Viabilidad) |
| 1.7 Lo que este programa no hace | las 6 tarjetas (la introducción ya las tabula: aquí, con más detalle o remitiendo) |
| 1.8 Referencias y cómo citar | «Referencias» (21, sin filtro), «Cómo citar» con «Copiar la cita»; sin DOI todavía |

### Capítulo 2 · Imágenes y calibración (`02-bloque2.html`, `--b2`)

Subtítulo: «Abre una carpeta, revisa los grupos y comprueba la calibración de cada foto.»
Desplegable «Qué hace este bloque» (no capturarlo abierto: ver la regla 0).

| h2 propuesto | Tarjeta y controles |
|---|---|
| 2.1 Abrir una carpeta o el ejemplo | zona «Arrastra aquí una carpeta o tus imágenes»: «Elegir una carpeta», «Elegir archivos», «Ejemplo simulado», «Vaciar»; formatos (TIFF 8/16 bits, PNG, JPEG…), `.txt` del microscopio con el mismo nombre, índice CSV (`archivo, grupo, nombre, grano, magnificacion, excluir`), clave de grupos (`código = nombre`); mensaje del ejemplo |
| 2.2 El resumen y sus avisos | «Resumen»: Imágenes, Grupos, Granos, Calibradas, Barra comprobada, Panorámicas; veredictos (sin calibrar, barra dudosa, tamaño del píxel sustituido por la magnificación, sin barra, sin grupos). Ejemplo: 33, 3, 27 (ver errores), 33/33, 33, 3 |
| 2.3 Calibración y lectura de nombres | «Ancho del cuadro de referencia (mm)» (128), «Píxel del análisis (µm)» (vacío = automático: 0.1 µm en el ejemplo), «Patrón del nombre (grupo y grano)» (expresión regular `^(?<grain>\d+)[A-Za-z]*_(?<group>[A-Za-z]+\d*)`), la línea «Así se leen los primeros nombres», «Aplicar»; la nota del píxel común |
| 2.4 Grupos | tabla Código, Nombre (editable), Imágenes, Granos |
| 2.5 La tabla de imágenes | filtros «Todas», «Un grano», «Panorámicas», «Detalle», «Barra dudosa», «Sin calibrar», «Excluidas»; columnas miniatura, Archivo, Grupo, Grano, Magnif., Ancho (px), µm/px, Fuente (a mano, índice, del equipo, magnificación, sin calibrar), Barra (✓ o !), Tipo (Un grano, Panorámica, Detalle), Excluir; «Descargar el índice (CSV)» |
| 2.6 El visor y la barra medida a mano | «Visor»: ← Anterior, posición, Siguiente →, «Medir la barra a mano» (dos clics); leyenda «barra detectada» (amarillo) e «inicio del rótulo (lo de abajo no se analiza)» (rojo discontinuo); datos: Archivo, Grupo · grano, Tamaño, Magnificación, Tamaño del píxel, Campo, Barra de escala (y voltaje, distancia de trabajo, fecha si los hay) |

Reglas: µm/px = ancho de referencia (128 mm = 128 000 µm) ÷ (magnificación × ancho en px); la barra
por el píxel debe dar una longitud redonda. Ejemplo: 1000× y 1280 px → 0.1 µm/px; panorámicas 150×
→ 0.6667 µm/px.

### Capítulo 3 · Contorno y tamaño (`03-bloque3.html`, `--b3`)

Subtítulo: «El cuerpo de cada grano sin sus espinas: diámetros, elongación y circularidad.»

| h2 propuesto | Tarjeta y controles |
|---|---|
| 3.1 Cómo se mide el cuerpo | desplegable «Cómo se mide»: píxel común, Otsu, relleno de huecos, el grano central, 720 direcciones, recorte de picos más angostos que la base, Feret, contorno cortado, fotos de un grano promediadas |
| 3.2 Medir | «Base máxima de una espina (µm)» (3), «Altura mínima de una espina (µm)» (0.3), «Contorno cortado aceptable (%)» (2), «Medir todas las fotos de un grano»; renglón «30 foto(s) de un grano, al píxel de 0.1 µm»; mensaje «30 de 30 fotos medidas en … s» |
| 3.3 Resultados por grupo | «Resultados»: Fotos medidas (30), Granos (24, con contorno completo), Contorno cortado (0), Cuerpo (media) 63.2 µm, Feret 65.5 × 61.0; avisos (fotos ampliadas, contorno cortado); «Por grupo» media ± DE (A 60.95 ± 4.03; B 67.93 ± 2.56; comprobar C), CSV; figuras «Diámetro del cuerpo por grupo» (`b3FigBox`) y «Diámetros de Feret del cuerpo» (`b3FigFeret`, con elipses al 95 %) |
| 3.4 Revisión de cada foto | «Revisión de cada foto»: ← Anterior, selector, Siguiente →; capas «Grano (máscara)», «Contorno con espinas», «Cuerpo», «Espinas», «Feret» (apagada); datos de la foto; «Excluir esta foto» / «Volver a incluir»; «Tabla de todas las fotos» con CSV. `01_A.png`: cuerpo 59.56 µm, Feret 59.86 × 59.23 |

### Capítulo 4 · Ornamentación (`04-bloque4.html`, `--b4`)

Subtítulo: «Espinas en el contorno, lúmenes del retículo y textura de la superficie.» Se mide en la
misma pasada del Bloque 3 (sin medir, el bloque muestra «Primero mide los granos» e «Ir al Bloque 3»).

| h2 propuesto | Tarjeta y controles |
|---|---|
| 4.1 Espinas, lúmenes y textura | «Cómo se mide»: espinas del contorno (número, altura, espaciado, densidad por 100 µm), lúmenes por umbral local, textura por coocurrencia (contraste, homogeneidad, entropía, correlación, energía) |
| 4.2 Lúmenes: los dos ajustes | «Lúmenes»: «Radio del vecindario (µm)» (1.5), «Más oscuro que el vecindario por (desv. est.)» (0.15), «Volver a medir con estos valores» (vuelve a correr el Bloque 3); la nota de validación |
| 4.3 Resultados por grupo | mosaicos Espinas en el contorno, Altura de espina, Densidad de espinas, Lumen (mediana); «Por grupo» con CSV; figuras «Densidad de espinas por grupo» (`b4FigSp`), «Diámetro de lumen por grupo» (`b4FigLum`), «Altura de espina por grupo» (`b4FigH`), «Textura: contraste contra homogeneidad» (`b4FigTx`) |
| 4.4 Revisión de cada foto y perfil radial | capas «Lúmenes», «Espinas», «Cuerpo»; datos; «Perfil radial de la foto elegida» (`b4FigProfile`) |

Lo que debe decirse: las espinas son las del contorno; la altura sale algo menor que la dibujada (en
la validación, mediana −7.6 %; la app dice «unos 4 %»: ver errores); el lumen es proporcional a la
malla (razón ≈ 0.56), no igual. Los parámetros dibujados de cada morfotipo están en la introducción
(I.7): compáralos con lo medido.

### Capítulo 5 · Fertilidad (`05-bloque5.html`, `--b5`)

Subtítulo: «Granos turgentes y colapsados en las panorámicas, por grupo.»

| h2 propuesto | Tarjeta y controles |
|---|---|
| 5.1 Cómo se estima | «Cómo se estima»: granos del borde fuera, cuerpo sin espinas, fragmentos y agregados por tamaño, solidez = área / área de la envolvente convexa, Wilson y χ² |
| 5.2 Contar | «Solidez mínima del cuerpo de un grano turgente» (0.95), «Diámetro mínimo de un grano (µm)» (15), «Agregado: más grande que el grano típico (×)» (1.3), «Fragmento: más chico que el grano típico (×)» (0.6), «Diámetro máximo de un grano (µm)» (200); «Contar en todas las panorámicas»; renglón «3 panorámica(s)» |
| 5.3 Resultados: proporción, intervalo y χ² | mosaicos Panorámicas, Granos contados (y los que quedan fuera), Colapsados (%), Prueba χ² (gl, p); veredicto; tabla por grupo con Wilson; CSV; figuras «Granos colapsados por grupo» (`b5FigPct`) y «Solidez del cuerpo de los granos» (`b5FigSol`) |
| 5.4 Revisión de cada panorámica | selector; leyenda «turgente», «colapsado o deforme», «agregado (no cuenta)», «fragmento (no cuenta)», «toca el borde (no cuenta)»; datos |

En la panorámica del morfotipo B la portada cuenta 5 colapsados de 13 clasificados; saca las cifras de
la app (los porcentajes dibujados son 15, 35 y 10 %). La solidez es una aproximación, no viabilidad.

### Capítulo 6 · Estadística multivariada (`06-bloque6.html`, `--b6`)

Subtítulo: «¿Se distinguen los grupos por su polen? Con el grano como unidad.»

| h2 propuesto | Tarjeta y controles |
|---|---|
| 6.1 Qué se calcula: el grano como unidad | «Qué se calcula»: promedio por grano; ANOVA, Kruskal–Wallis, letras de Tukey (α = 0.05), Holm; variables estandarizadas; ACP, PERMANOVA, LDA y bosque validados dejando fuera un grano |
| 6.2 Variables y ajustes | «Variables»: «Entran al análisis» (19 casillas; marcadas por omisión las 11 con `mv: true` en `METRICS`), «Árboles del bosque» (500), «Permutaciones» (999), «Semilla aleatoria» (1), «Comparar los grupos»; renglón «24 granos de 3 grupos»; grupos con menos de 3 granos quedan fuera |
| 6.3 En resumen | mosaicos Granos, PERMANOVA (R², F, p), Variables que difieren (ANOVA con Holm), Clasificación (LDA) y (bosque) con κ; veredictos |
| 6.4 Por variable | tabla media ± DE por grupo con letras, F, p, H, p ajustadas por Holm; CSV; figura «La variable que más separa a los grupos» (`b6FigBest`) |
| 6.5 Componentes principales | «Biplot: granos y variables» (`b6FigPca`), «Varianza explicada» (`b6FigScree`), tabla de cargas. Con las 11 variables por omisión la portada da CP1 59.1 % y CP2 23.2 %: compruébalo en la app |
| 6.6 PERMANOVA | global (pseudo-F, gl, R², p, permutaciones, distancia euclidiana sobre variables estandarizadas) y por pares (Par, F, R², p, p (Holm)) |
| 6.7 Clave polínica: clasificar un grano | mosaicos de clasificación; «Espacio discriminante (LD1 × LD2)» (`b6FigLda`), «Importancia de las variables (bosque aleatorio)» (`b6FigImp`); matrices de confusión «Discriminante lineal» y «Bosque aleatorio» (filas: grupo verdadero · columnas: grupo asignado, Acierto) |

### Capítulo 7 · Informe (`07-bloque7.html`, `--b7`)

Subtítulo: «Métodos, resultados, figuras y galería en un documento para imprimir o guardar en PDF.»

| h2 propuesto | Tarjeta y controles |
|---|---|
| 7.1 Datos del informe | «Título», «Especie o material», «Autor(a)», «Institución», «Idioma del informe» (El de la pantalla, Español, English); lista de comprobación (Imágenes calibradas, Contorno y tamaño, Fertilidad, Estadística multivariada) y la nota de lo que falta («sin calcular») |
| 7.2 Generar, imprimir y descargar | «Generar el informe», «Imprimir / guardar como PDF», «Descargar (HTML)», «Copiar los métodos», «Guardar el proyecto»; «Vista previa»; la nota de los colores del tema claro |
| 7.3 Lo que lleva el informe | 1 Material, 2 Métodos, 3 Tamaño y ornamentación por grupo, 4 Comparación entre grupos, 5 Fertilidad, 6 Figuras, 7 Granos medidos, uno por grupo, 8 Limitaciones, 9 Referencias |
| 7.4 Las figuras, el estudio y el editor | botones SVG y PNG de cada figura, el estudio de figuras (desde `Ctrl + K` o el botón de la figura) y el editor ✎ (`labg-figedit.js`) |
| 7.5 Guardar y retomar el proyecto | `Ctrl + S` / `Ctrl + O`, «Abrir un proyecto» de la portada; el proyecto guarda referencias, no las fotos (con el ejemplo, vuelve a dibujarlo) |

En el título de las capturas del informe usa datos inventados y neutros («Morfometría polínica del
ejemplo simulado»), nunca el nombre de una especie real estudiada por el autor.

### Apéndices (`08-apendices.html`, `--bx`, `id="apendices"`, `data-pestana="Ap"`, `data-orden="8"`)

A archivos que lee y escribe (TIFF y sus compresiones, PNG, JPEG, `.txt` del equipo, índice CSV,
clave, proyecto JSON, CSV que descarga, informe HTML); B las reglas reunidas (calibración, barra
redonda, contorno cortado ≤ 2 %, base 3 µm y altura 0.3 µm, solidez ≥ 0.95, fragmento < 0.6× y
agregado > 1.3× el grano típico, α = 0.05 con Holm, tres granos por grupo, validación por grano);
C glosario (cuerpo, corpus, equina, muro, lumen, retículo, téctum, exina, Feret, solidez, circularidad,
elongación, panorámica, PERMANOVA, κ…); D cuando algo no sale; E licencia (GPL-3.0-or-later) y cita
(sin DOI todavía: «se añadirá al publicar»); F referencias, escritas por `genera-referencias.js`
entre `<!-- REFERENCIAS -->` y `<!-- /REFERENCIAS -->` (21 obras en tres temas).

Las decisiones de los motores están en `PROCEDENCIA.md` (secciones 4 y 5) y en `validation/LEEME.md`;
de ahí puede salir lo que el texto explique, **sin** lo que se refiere a las micrografías del autor.

## 2. Cómo se marca

Cada parte copia el `<head>` de `00b-introduccion.html` (tipografías, `../interior.css`,
`../paginar.js`; un `<style>` propio sólo si hace falta) y pone **una sola** `<section>`:

```html
<section class="capitulo" id="cap-3" data-pestana="3" data-orden="3" style="--acento: var(--b3)">
  <div class="cap-apertura">
    <div class="cap-num">3</div>
    <div class="cap-etiqueta">Capítulo tres · Bloque 3</div>
    <h1 data-corto="Contorno y tamaño">Contorno y tamaño</h1>
    <div class="cap-regla"></div>
    <p class="cap-resumen">Qué resuelve el bloque en un estudio, en tres o cuatro renglones.</p>
    <div class="cap-franja"><span class="k2"></span><span class="k3"></span><span class="k3"></span><span class="k4"></span></div>
    <ul class="cap-contenido">
      <li><b>3.1</b>Cómo se mide el cuerpo</li>
      …
    </ul>
  </div>

  <h2 id="s3-1"><span class="num">3.1</span>Cómo se mide el cuerpo</h2>
  <p class="lead">Primer párrafo de la sección, un poco más grande.</p>
  <p>Texto. Los rótulos de la app van así: <span class="ui">Medir todas las fotos de un grano</span>; una ruta,
     <span class="ruta">Bloque 3<span class="sep">›</span>Revisión de cada foto</span>; un archivo o una tecla, <code>Ctrl + S</code>.</p>
  <h3>Subtítulo</h3>
  …
</section>
```

- `data-orden` es el número del bloque (In = 0, Ap = 8); los apéndices usan `id="apendices"`,
  `data-pestana="Ap"`, `--acento: var(--bx)`, `cap-num` «A» y h2 `id="ap-a"` … `ap-f` con
  `<span class="num">A</span>`.
- La etiqueta de apertura dice el número con letra: «Capítulo uno · Bloque 1», … «Capítulo siete · Bloque 7».
- h2 siempre numerados (`N.M`), con `id="sN-M"` igual al del índice; h3 sin número; h4 para un
  rótulo menor en versalitas. Si cambias un h2, corrígelo también en el índice de `00b-introduccion.html`.

**Figuras**, numeradas por capítulo (Figura 3.1, 3.2…), con la imagen en `../img/` y, si lleva
marcas, la lista justo después (ver `i-interfaz` en la introducción):

```html
<figure class="w70">
  <div class="marco"><img src="../img/b3-revision.png" alt="Descripción para lector de pantalla">
    <span class="marca" style="left:12.5%;top:8%">1</span>
  </div>
  <figcaption><b>Figura 3.3.</b> Qué se ve y qué números importan.</figcaption>
</figure>
<ul class="leyenda-marcas">
  <li><span class="n">1</span><b>Capas.</b> …</li>
</ul>
```

Las posiciones de las marcas salen de la receta (`window.__marcas`), no a ojo.

**Recuadros:** `caja nota`, `caja importante`, `caja teoria`, `caja ejemplo`, `caja regla` (con
`table.compacta` y `p.regla-pie`), `caja error`, `caja dato` (con `dato-cifra`), y también `caja idea`
y `caja aviso`; la forma exacta está en `00b-introduccion.html` («Cómo leer este manual») y en el
manual de CytogeneticsPro. Además: `ol.pasos`, `table.compacta` (con `<caption>`), `.formula`, `.dos`,
chips `<span class="chip k3">3</span>`. Cada capítulo cierra con una «Regla de decisión» o una tabla
de lectura y un «Cuando algo sale mal».

## 3. Las capturas

- Una receta por imagen en `herramientas/recetas/`, con nombre `bN-que.js` (por ejemplo
  `b3-resultados.js`) y la ventana en la primera línea. Se apoyan en `_comun.js`:
  `await bloque(3)`, `tarjeta(3, 'Resultados')`, `figura('b3FigBox')`, `irA(nodo)`, `return caja([nodo], 8)`.
  Los rótulos que busques con `tarjeta()` o `vis()` deben estar en el idioma de la captura
  (`I18N.lang === 'en' ? 'Results' : 'Resultados'`); con un id no hay problema de idioma.
- Sacar: `node manual/herramientas/captura.js b3-resultados` desde la raíz de la app, con el node de
  `C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe`. **Mirar cada imagen** antes
  de citarla. Medir el ejemplo tarda unos 20 s por captura: agrupa varias recetas en una llamada.
- Revisar: `node manual/herramientas/revisar.js manual/es/03-bloque3.html --huecos 1.2`. Cero
  desbordes y cero imágenes sin cargar; si una figura deja un hueco grande, angostarla con
  `anchos.js` (no menos de `w70` si la captura tiene mucho texto) o reordenar.
- Las herramientas borran sus perfiles temporales (`palynopro-manual-*` en `%TEMP%`); si algo
  se interrumpe, bórralos a mano, y no cierres ventanas de Edge que no sean de esos perfiles.

## 4. Las cifras

**Todas las cifras del texto salen de la app con el ejemplo simulado**, con los valores por
omisión salvo que el texto diga qué se cambió, y se comprueban en la captura o en la app misma
(con la receta, o en la consola de una captura: `state.results.images`, `state.results.fertility`,
`state.results.stats`, `Images.rows()`). Nada se copia de la literatura ni se calcula a mano aparte.
Se dice «el morfotipo B del ejemplo», nunca como si fuera una planta real. Y ninguna cifra sale de
las micrografías del autor (regla 0).

## 5. Si encuentras un error de la app

**No lo corrijas.** Anótalo al final de tu entrega con el bloque, cómo reproducirlo, qué esperabas y
qué salió (con la captura si ayuda), y escribe el capítulo con lo que la app hace hoy, sin presentar
el error como correcto. Anotados al preparar el manual (sin corregir):

1. Portada (Bloque 1): el título dice «Del **micrografo** electrónico a la clave polínica»; debería
   ser «De la micrografía electrónica…» (el inglés dice «From the electron micrograph»). El manual usa
   la forma correcta en la portada y los créditos; al citar la pantalla, cítala como está.
2. Bloque 2, «Qué hace este bloque»: el ejemplo de clave de grupos debe ser inventado, según la regla 0.
3. Bloque 2, «Resumen»: el mosaico «Granos» cuenta 27 «unidades de análisis» con el ejemplo, porque
   suma las 3 panorámicas a los 24 granos; el Bloque 3 dice 24.
4. Bloque 1 (laboratorio) y Bloque 7 (métodos): dicen que la altura de espina sale «unos 4 %» menor;
   la validación (`validation/informe_imagen.txt`) da una mediana de −7.6 % (de −3.8 a −14.3 %).
5. Cita: la app la titula «PalynoPro: morfometría polínica cuantitativa a partir de micrografías
   electrónicas»; `README.md` y `CITATION.cff` dicen «… en el navegador». El manual usa la de la app.
6. Bloque 1, «Cómo funciona»: a 1400 px de ancho la tira de los siete pasos se corta y pide
   desplazamiento lateral (el paso 7 no se ve).
7. La app no tiene enlace al manual (ver `LEEME.md`, «El enlace desde la app»).

## 6. Tamaño

Los capítulos de la plantilla ocupan **entre 5 y 14 hojas** cada uno; el Bloque 1, el 2 y el 6 irán
hacia arriba, el 4 y el 5 hacia abajo. La introducción tiene 16 hojas (5 de preliminares y 11 de
texto). Los apéndices, con las 21 referencias, rondarán 8 a 10 hojas.

Reparto sugerido entre agentes: (a) capítulos 1 y 2; (b) capítulos 3, 4 y 5; (c) capítulos 6 y 7;
(d) apéndices, cuando los demás hayan entregado.
