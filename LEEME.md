# PalynoPro

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.23883213.svg)](https://doi.org/10.5281/zenodo.23883213)

**De la micrografía electrónica a la clave polínica** · *English: [README.md](README.md)*

Morfometría polínica cuantitativa en el navegador, sin escribir código.
PalynoPro mide granos de polen en micrografías electrónicas de barrido y
compara grupos (morfotipos, variedades, poblaciones) por su polen. Calibra cada
imagen con la magnificación del microscopio y la comprueba contra la barra de
escala impresa; separa el grano del fondo; lee su contorno en 720 direcciones;
quita las espinas para medir el **cuerpo**; cuenta y mide las espinas; detecta
los lúmenes del retículo; mide la textura de la superficie; estima la
proporción de granos colapsados en las panorámicas; compara los grupos con
pruebas univariadas, componentes principales, PERMANOVA, análisis
discriminante y bosque aleatorio, siempre con el **grano** como unidad; y
entrega un informe con los métodos redactados. Sirve para pólenes equinados y
reticulados en general (Cucurbitaceae, Malvaceae, Asteraceae y otras), para
tesis, palinología descriptiva y docencia. Español e inglés, tema claro y
oscuro, sin instalar nada; todo se calcula en el propio equipo y las imágenes
no salen de él.


## Cómo abrirla

En línea: https://luisangelbg.github.io/PalynoPro/

Doble clic en `index.html`: no necesita servidor, instalación ni internet, y
el ejemplo simulado funciona sin conexión. Para abrirla desde otro equipo de
la red, ejecuta `Open PalynoPro.bat` (arranca `server.ps1`, un servidor local
en el puerto 9940). Se maneja entera con el teclado y con lector de pantalla,
y se usa también en un teléfono (360 px de ancho, sin desplazamiento lateral).


## Los siete bloques

1. **Inicio** — cómo se mide un grano en lenguaje llano, un laboratorio que
   dibuja un grano simulado y lo mide en vivo, los métodos con sus referencias
   y cómo citarla.
2. **Imágenes y calibración** — se abre una carpeta entera (TIFF del
   microscopio, con sus compresiones, PNG o JPEG); el grupo y el número de
   grano se leen del nombre del archivo o de un índice CSV; el tamaño del píxel
   sale de la magnificación (ancho del cuadro de referencia ÷ magnificación ÷
   ancho en píxeles) y se comprueba contra la barra de escala, que se encuentra
   sola. Las imágenes se separan en fotos de un grano y panorámicas.
3. **Contorno y tamaño** — diámetro equivalente del cuerpo, anchuras de Feret
   mayor y menor, elongación y circularidad; el contorno cortado por el borde
   se marca y se excluye.
4. **Ornamentación** — espinas en el contorno (número, altura, espaciado,
   densidad), lúmenes del retículo (diámetro, densidad, variación) y textura de
   la superficie por matriz de coocurrencia.
5. **Fertilidad** — granos turgentes y colapsados en las panorámicas por la
   solidez del cuerpo; agregados, fragmentos y granos en el borde quedan fuera;
   intervalo de Wilson y prueba χ² entre grupos.
6. **Estadística multivariada** — análisis de varianza con letras de Tukey y
   Kruskal–Wallis con ajuste de Holm, componentes principales, PERMANOVA global
   y por pares, discriminante lineal y bosque aleatorio validados dejando fuera
   un grano entero, matrices de confusión y κ de Cohen.
7. **Informe** — material, métodos con los parámetros usados y sus citas,
   cuadros, todas las figuras, galería de un grano medido por grupo,
   limitaciones y referencias, en español o en inglés, para imprimir o guardar
   como PDF; el proyecto se guarda en JSON y cada cuadro en CSV.

Un ejemplo **simulado** (tres morfotipos, con 30 fotos de un grano y tres
panorámicas) permite recorrer todo sin imágenes propias; los granos se dibujan
por código cada vez que se abre y no son fotos de plantas reales.


## Manuales

- `manual/PalynoPro_Manual_de_usuario_ES.pdf` — manual de usuario en español:
  introducción, un capítulo por bloque y apéndices (archivos, reglas,
  glosario, qué hacer cuando algo falla, licencia y cómo citar, referencias).
- `manual/en/PalynoPro User's Manual (English).pdf` — el mismo manual en
  inglés.

Los manuales en HTML son `manual/es/manual-completo.html` y
`manual/en/manual-completo.html`; las partes sueltas están en las mismas
carpetas y `manual/LEEME.md` explica cómo se arman.


## Validación

`tests/index.html` ejecuta 155 pruebas del lector de imágenes, la
calibración, el motor de imagen, los granos simulados y la estadística
(también con `node tests/run_node.js`). Ábrela con doble clic: todo debe salir
en verde.

Los motores estadísticos (`js/stats.js`, `js/multi.js`) corren en el navegador
y en node, así que 30 conjuntos simulados (3 o 4 grupos, 6 a 12 granos por
grupo, 8 medidas correlacionadas, semilla fija) se compararon contra
implementaciones independientes en R 4.4.2 (MASS y vegan): **6 705
comparaciones en 18 familias, ninguna fuera de tolerancia**.

| Familia | Comparaciones | Fuera de tolerancia |
|---|---:|---:|
| Análisis de varianza (F y p) | 480 | 0 |
| Kruskal–Wallis (H y p) | 480 | 0 |
| Tukey (diferencias, intervalos, p ajustada) | 4 320 | 0 |
| Holm | 240 | 0 |
| Componentes principales (valores propios y cargas) | 720 | 0 |
| Discriminante lineal (proporción de la traza y predicciones dejando uno fuera) | 105 | 0 |
| PERMANOVA (pseudo-F, R², p) | 90 | 0 |
| χ² de homogeneidad (estadístico y p) | 60 | 0 |
| Intervalo de Wilson | 210 | 0 |
| **Total** | **6 705** | **0** |

El motor de imagen se comprobó con granos simulados de verdad conocida: 60
fotos de un grano y 12 panorámicas, dibujadas con tamaño, espinas y retículo
conocidos, en dos anchos de imagen y con cualquier giro, calibradas y medidas
como lo hace la app. La barra de escala se reconoció en las 60 fotos; el
diámetro del cuerpo tiene un error mediano de 0.20 % (percentil 95: 0.37 %);
las anchuras de Feret, errores menores que 0.3 %; el número de espinas fue
exacto en los 60 granos; se encontraron 141 de 141 granos en las panorámicas
y ningún grano turgente se tomó por colapsado.

La tolerancia de cada familia y la diferencia máxima están en
`validation/informe.txt`; los resultados del motor de imagen, en
`validation/informe_imagen.txt`, y `validation/LEEME.md` explica los pasos,
las tolerancias y lo que la validación encontró y se corrigió. Para repetirla:

```
node validation/1_app.js
Rscript validation/2_comparar.R
node validation/3_imagen.js
node tests/run_node.js
```


## Datos y material de terceros

PalynoPro no contiene código, íconos, ilustraciones ni tipografías de nadie
más. El lector de TIFF (con sus compresiones), el análisis de imágenes, la
estadística, el análisis multivariado, las figuras y el informe son código
propio; los PNG y JPEG los decodifica el propio navegador, y el programa no
pide nada a internet. Cada método publicado se cita a su fuente original en el
código, en la app y en el manual. `PROCEDENCIA.md` lo detalla.

El ejemplo es **simulado** (`js/synth.js`): los granos, sus espinas, su
retículo, el ruido y la barra de escala se generan con una semilla fija cada
vez que se abre. Las fotos de quien use la app nunca se copian dentro del
programa.


## Lo que conviene saber

- La regla de calibración supone que el ancho de la imagen corresponde a un
  cuadro de referencia de 128 mm a la magnificación indicada (lo habitual en
  los microscopios de barrido con salida de 1280 px de ancho). Si el equipo usa
  otro, se cambia en el Bloque 2; la barra de escala avisa cuando no coincide.
- Las medidas son de la **proyección** del grano en la imagen: el diámetro
  polar y el ecuatorial sólo se distinguen si se fotografiaron vistas
  orientadas.
- La solidez del cuerpo es una aproximación morfológica a la fertilidad, no
  una prueba de viabilidad; conviene contrastarla con una tinción.
- Las fotos repetidas de un mismo grano se promedian antes de comparar: el
  grano, no la foto, es la unidad.


## Cómo citar

Barrera-Guzmán, L. Á. (2026). *PalynoPro: morfometría polínica cuantitativa a
partir de micrografías electrónicas* (versión 1.0.0) [Programa de cómputo].
Zenodo. https://doi.org/10.5281/zenodo.23883213

El DOI de arriba lleva siempre a la versión más reciente; cada versión tiene
además el suyo en la página de Zenodo. Cita la versión que usaste. Código:
https://github.com/luisangelbg/PalynoPro

La sección **Cómo citar** de la portada de la app da la cita lista para
copiar, y todos los informes terminan con ella; `CITATION.cff` tiene los
mismos datos para los gestores de referencias. Cita además los métodos que
usaste: cada resultado los nombra.


## Licencia

Licencia Pública General de GNU, versión 3 o posterior (`LICENSE`). Copyright
(C) 2026 Luis Ángel Barrera-Guzmán.


## Cómo contribuir

Los errores y las propuestas se reciben en
https://github.com/luisangelbg/PalynoPro/issues.
