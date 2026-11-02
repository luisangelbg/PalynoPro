# Procedencia de PalynoPro

Este documento dice qué partes de PalynoPro son obra propia y de dónde salen
los métodos que implementa. Se escribió para acompañar un eventual registro de
la obra ante el INDAUTOR y para que cualquiera pueda comprobar lo que aquí se
afirma.

Última revisión: 25 de octubre de 2026 (versión 1.0.0).

---

## 1. En una frase

PalynoPro no contiene código, íconos, ilustraciones ni tipografías de nadie
más. Implementa métodos de análisis de imágenes, de palinología y de
estadística publicados en libros y revistas, todos citados en el propio código
y en la app; la escritura de cada uno en JavaScript es propia.

---

## 2. Lo que el programa no tiene

- **Ninguna biblioteca de terceros.** La lectura de TIFF (con sus compresiones),
  el análisis de imágenes, la estadística, el análisis multivariado, las
  figuras y el informe están escritos para este programa. No hay carpeta de
  código ajeno, ni código minificado o empaquetado, ni paso de compilación.
  Los PNG y JPEG los decodifica el propio navegador.
- **Nada que se cargue de la red.** Todos los archivos que usa la página están
  en su carpeta; por eso abre con doble clic, sin servidor y sin conexión. El
  único enlace hacia fuera es el del portal de la suite del autor, que sólo se
  sigue si la persona hace clic en él.
- **Ninguna tipografía incluida.** La interfaz, las figuras y el informe usan
  las letras instaladas en el equipo.
- **Ningún gráfico de terceros.** El logotipo, el grano de la portada, los
  dibujos de cada bloque (`js/art.js`) y los granos del ejemplo (`js/synth.js`)
  se dibujan por código.
- **Ningún dato de terceros ni fotos reales.** El ejemplo es **simulado**: los
  granos, sus espinas, su retículo, el ruido y la barra de escala se generan con
  un generador de semilla fija cada vez que se abre. Las fotos de quien use la
  app nunca se copian dentro del programa.

## 3. Módulos y su autoría

Todo lo que sigue fue escrito para este programa por el autor, salvo los
módulos comunes de la última fila, que son del mismo autor.

| Módulo | Qué hace |
|---|---|
| `js/imgio.js` | lectura de TIFF (tiras y mosaicos; sin compresión, LZW, PackBits y Deflate; predictor; 1, 8, 16 y 32 bits; paleta), escritura de TIFF, metadatos del microscopio, índices CSV y claves de grupos |
| `js/calib.js` | tamaño del píxel por la magnificación, búsqueda de la barra de escala, comprobación de su longitud redonda, renglón del rótulo |
| `js/imgproc.js` | remuestreo por áreas, umbral de Otsu, morfología binaria, relleno de huecos, etiquetado, propiedades de regiones, envolvente convexa, calibradores rotantes, perfil radial, apertura en escala de grises, picos con prominencia, coocurrencia de grises, lúmenes por umbral local, análisis de un grano y de una panorámica |
| `js/stats.js` | funciones especiales, distribuciones, rango estudentizado, intervalos de una proporción, análisis de varianza, Tukey, Kruskal–Wallis, ajustes de muchos valores p, letras de grupos |
| `js/multi.js` | valores propios de Jacobi, componentes principales, discriminante lineal, bosque aleatorio, validación dejando fuera una unidad, matriz de confusión y κ, PERMANOVA global y por pares, promedio por grano |
| `js/synth.js` | el generador de granos y panorámicas simulados con su verdad conocida |
| `js/figures.js`, `js/art.js` | el estuche de dibujo de las figuras (SVG y PNG) y las ilustraciones |
| `js/images.js`, `js/core.js`, `js/i18n.js`, `js/home.js`, `js/block2.js` … `js/block7.js` | las imágenes y su caché, el estado, el proyecto, el idioma, la portada y la interfaz de cada bloque |
| `js/labg-core.js`, `js/labg-navigator.js`, `js/labg-figure-studio.js`, `js/labg-figedit.js`, `css/labg-*.css` | módulos comunes de la LABG Suite, del mismo autor, en su variante de íconos propios: se dibujaron para la suite sobre una cuadrícula de 24 × 24 y son parte de ese código |

## 4. Los métodos publicados

Un método no es objeto de derecho de autor (LFDA, art. 14, fr. I); lo que se
registra es su expresión, el código. Los que el programa implementa, con su
fuente (las referencias completas están en el Bloque 1 y en el informe):

| Qué | Dónde | Publicación |
|---|---|---|
| Terminología polínica | textos de la app | Erdtman 1952; Punt et al. 2007; Halbritter et al. 2018 |
| Remuestreo por áreas | `imgproc.js` | Wolberg 1990 |
| Umbral global | `imgproc.js` | Otsu 1979 |
| Morfología matemática y apertura del perfil | `imgproc.js` | Serra 1982 |
| Envolvente convexa y anchuras de Feret | `imgproc.js` | Andrew 1979; Shamos 1978 |
| Textura | `imgproc.js` | Haralick et al. 1973 |
| Umbral local de los lúmenes | `imgproc.js` | Niblack 1986 |
| Comparaciones univariadas | `stats.js` | Tukey 1949; Kruskal y Wallis 1952; Holm 1979 |
| Intervalo de una proporción | `stats.js` | Wilson 1927 |
| Componentes principales | `multi.js` | Pearson 1901; Hotelling 1933 |
| Discriminante lineal | `multi.js` | Fisher 1936 |
| Bosque aleatorio | `multi.js` | Breiman 2001 |
| PERMANOVA | `multi.js` | Anderson 2001; McArdle y Anderson 2001 |
| Acuerdo de la clasificación | `multi.js` | Cohen 1960 |

La regla de calibración (ancho de la imagen = cuadro de referencia de 128 mm a
la magnificación indicada) es la convención de los microscopios de barrido con
salida de 1280 px; la app la expone como un ajuste y la comprueba contra la
barra de escala de cada imagen.

## 5. Cómo se comprobó

Las pruebas automáticas (`tests/index.html`, 138, todas pasan) comparan cada
motor con respuestas conocidas: discos, cuadrados y elipses de área y ejes
exactos, polígonos con anchuras de Feret conocidas, picos dibujados a mano, un
tablero de ajedrez para la textura, un retículo de celdas iguales para los
lúmenes, TIFF escritos por otro programa con compresión LZW, y granos y
panorámicas simulados cuya verdad (diámetro, ejes, número y altura de espinas,
malla del retículo, granos colapsados) se conoce.

Además:

- **Estadística y multivariado:** 30 conjuntos de datos simulados se
  calcularon con la app y con un entorno estadístico libre, número por número
  (`validation/`, `validation/informe.txt`).
- **Análisis de imágenes:** el área, el perímetro, los momentos, la solidez y
  los ejes de las regiones se compararon, durante la construcción, con los de
  una biblioteca libre de análisis de imágenes, y coincidieron.

Ni las pruebas ni la validación forman parte de la obra: sirven para
comprobarla.

## 6. Qué forma parte de la obra

**Sí:** `index.html`, las hojas de estilo de `css/`, el código de `js/`,
`server.ps1` y `Open PalynoPro.bat`.

**No:** `validation/`, `tests/`, `LICENSE`, `CHANGELOG.md`, `README.md`,
`CITATION.cff`, `codemeta.json` y este documento.

## 7. Autoría, titularidad y licencia

Autor y titular único: **Luis Ángel Barrera-Guzmán**. El programa no lleva
mención de ninguna institución. Se distribuye como software libre bajo la
Licencia Pública General de GNU, versión 3 o posterior (`LICENSE`), que es una
licencia de uso otorgada por el titular: no impide el registro ni cede los
derechos patrimoniales. El nombre «PalynoPro» no se protege con el registro de
la obra; un nombre se protege como marca ante el IMPI.
