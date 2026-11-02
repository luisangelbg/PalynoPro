# Cambios de PalynoPro

Todas las versiones de PalynoPro, de la más nueva a la más vieja.

## 1.0.0 — 25 de octubre de 2026

Primera versión dentro de la LABG Suite. Sustituye a la herramienta de
septiembre de 2026 (PolenApp), que corría en un servidor local con código ajeno;
PalynoPro se reescribió entera en JavaScript propio y abre con doble clic.

### Interfaz de la suite

- Barra común, navegador de bloques con buscador (Ctrl K), modo enfocado,
  pasos marcados, botones Anterior y Siguiente, tema claro y oscuro, español e
  inglés en toda la interfaz y en el informe, editor ✎ y estudio de figuras.
- Identidad propia: azul acero de la imagen de barrido y ámbar de la exina; un
  grano equinado que gira en la portada, con haz de barrido y calibrador.
- Laboratorio vivo en la portada: se dibuja un grano simulado y se mide en el
  momento.
- Se usa en un teléfono (360 px, sin desplazamiento lateral).

### Los siete bloques

- **Imágenes y calibración:** carpetas enteras, TIFF del microscopio con sus
  compresiones, índice CSV o nombre de archivo, tamaño del píxel por la
  magnificación comprobado contra la barra de escala, medición manual de la
  barra con dos clics, separación en fotos de un grano y panorámicas.
- **Contorno y tamaño:** cuerpo sin espinas por apertura del perfil radial;
  diámetro, Feret, elongación y circularidad; contorno cortado excluido.
- **Ornamentación:** espinas, lúmenes del retículo y textura, con perfil
  radial y capas sobre la imagen.
- **Fertilidad:** solidez del cuerpo en las panorámicas, clases de tamaño,
  Wilson y χ².
- **Estadística multivariada:** con el grano como unidad; Tukey con letras,
  Kruskal–Wallis, Holm, componentes principales, PERMANOVA, discriminante y
  bosque aleatorio validados dejando fuera un grano.
- **Informe:** métodos con los parámetros usados, cuadros, figuras en dos
  columnas, galería, limitaciones y referencias; imprimible como PDF.

### Pruebas y validación

- 155 pruebas automáticas, todas pasan.
- 6 705 comparaciones contra un entorno estadístico libre, todas dentro de
  tolerancia; 60 granos y 12 panorámicas simulados de verdad conocida
  (`validation/LEEME.md` cuenta qué se encontró y qué se corrigió).

### Revisión antes de publicar

- Inicio: «Cómo funciona» cabe entero a 1400 px; enlace al manual en PDF
  (español o inglés) en el pie; referencia de Borgefors (1986); el título de
  la cita es el mismo en la app, el README, CITATION.cff y codemeta.json.
- Granos del Bloque 2: se cuentan sólo en las fotos de un grano (las
  panorámicas ya no suman un grano cada una).
- La clave de nombres admite códigos de sólo letras o alfanuméricos
  («A = Morfotipo A»).
- Al recalcular la calibración («Aplicar» o una magnificación escrita en la
  tabla) se conserva la regla que sustituye un tamaño de píxel contradicho por
  la barra; antes la foto podía volver a quedar con barra dudosa.
- Volver a abrir la carpeta de un proyecto ya no borra sus resultados; añadir
  imágenes nuevas los borra, previa confirmación.
- Un patrón nuevo de nombres no reemplaza el grupo ni el grano que vinieron
  del índice o se escribieron en la tabla, y lo avisa.
- El índice descargado escribe la fuente y el tipo de foto en el idioma de la
  interfaz; al volver a leerlo se aceptan los dos idiomas.
- Los motivos por los que no se pudo leer un archivo salen en el idioma de la
  interfaz.
- La tabla de imágenes cabe a 1400 px con sus miniaturas.
- Altura de espina: se mide de la punta a la cuerda que une sus dos pies, no
  sobre la apertura plana; el sesgo en pólenes simulados bajó de cerca de
  −7.6 % a −3.9 % (mediana), y los textos dicen el sesgo real.
- Bloque 3: una foto excluida sigue en el selector y se puede volver a
  incluir; las etiquetas de Feret se leen en el visor.
- Bloque 4: tablas por grupo con un grupo por columna (caben sin
  desplazamiento), número de espinas entero y perfil radial en todas las
  direcciones (también en el laboratorio de la portada).
- Bloque 5: histograma de solidez con todos sus intervalos, «χ²» que no se
  vuelve mayúscula, «colapsados» en todo el bloque y etiquetas dentro de la foto.
- Bloque 6: nombres de las variables (no sus claves) en el biplot y en la
  importancia, que pasa a barras horizontales; aviso de los granos sin valor
  en alguna variable; los métodos dicen los árboles de la validación (300).
- Proyecto: guarda el idioma del informe y vuelve a mostrar los ajustes de la
  comparación; avisa que los resultados del Bloque 6 se repiten al abrirlo.
- Cabeceras de figura con el título y sus botones en un solo renglón.
- Cajas por grupo: la letra de Tukey va sobre el punto más alto, no sobre el
  bigote. Biplot: rótulos con halo y, si se recorren, una línea a su flecha.
- Solidez con tres decimales en la revisión de las panorámicas (un grano de
  0.947 ya no se lee «0.95», igual que el umbral).
- Interfaz en inglés: ortografía estadounidense (color, center, gray,
  neighborhood, analyzed…), «PC1/PC2/PC3» en el ACP, «Body» en lugar de
  «Corpus», «Mean decrease in Gini», porcentajes sin espacio («95% CI»),
  fecha del informe en formato estadounidense y nombres de archivo de las
  descargas en inglés (palynopro_report.html, project.palynopro.json…).
  El español no cambia.

### Correcciones respecto de la herramienta de septiembre

- La detección de la barra de escala podía tomar una letra del rótulo por la
  barra; ahora se exige un rectángulo casi lleno de longitud redonda.
- Las fotos repetidas de un mismo grano contaban como granos distintos; ahora
  se promedian.
- Un tamaño de píxel de un índice o del archivo que la barra de escala
  contradice, mientras la magnificación coincide con ella, se sustituye por el
  de la magnificación, con aviso.
- La fertilidad se estimaba con la silueta completa; ahora con el cuerpo.
