# Validación independiente de PalynoPro

Cada motor de la app se comprueba contra algo que no es ella misma: una
implementación independiente del mismo método en un entorno estadístico libre,
o imágenes simuladas cuya respuesta se conoce porque se dibujaron.

**Última corrida (25 de octubre de 2026):**

- Estadística y multivariado: **6 705 comparaciones en 18 familias, todas
  dentro de tolerancia** (`informe.txt`).
- Motor de imagen: 60 granos y 12 panorámicas simulados (`informe_imagen.txt`):
  diámetro del cuerpo con error mediano de 0.20 % (P95 0.37 %), anchuras de
  Feret con error menor que 0.3 %, número de espinas exacto en los 60, barra de
  escala reconocida en los 60, 141 de 141 granos encontrados en las
  panorámicas. El motor de imagen se volvió a correr el 2 de noviembre de 2026
  (punto 10): sólo cambió la altura de espina.

## Los pasos

```
node validation/1_app.js          # 30 casos simulados, calculados con los motores de la app
Rscript validation/2_comparar.R   # los mismos casos en el programa de contraste → informe.txt
node validation/3_imagen.js       # granos simulados de verdad conocida → informe_imagen.txt
```

- `1_app.js` carga `js/stats.js` y `js/multi.js` tal como los carga la página,
  sortea 30 conjuntos de granos (3 o 4 grupos, 6 a 12 granos por grupo, 8
  medidas correlacionadas) con semilla fija y escribe `datos/caso_NN.csv` y
  `datos/app.json`.
- `2_comparar.R` necesita los paquetes MASS, vegan y jsonlite. Compara el
  análisis de varianza, Kruskal–Wallis, Tukey (diferencias, intervalos y p),
  Holm, componentes principales (valores propios y cargas), la proporción de la
  traza del discriminante, la predicción de cada grano en la validación dejando
  uno fuera, PERMANOVA (pseudo-F, R² y p), la χ² de homogeneidad y el intervalo
  de Wilson. La tolerancia de cada familia está escrita en el informe.
- `3_imagen.js` carga `js/imgproc.js`, `js/calib.js` y `js/synth.js`, dibuja
  granos redondos y alargados con 14 a 40 espinas de 1.2 a 3.2 µm, retículos de
  1.8 a 3.4 µm, dos anchos de imagen y cualquier giro, los calibra por la
  magnificación y la barra, y los mide como la app.
- `png-node.js` lee y escribe PNG para los guiones que corren sin navegador.

## Tolerancias y por qué

- Estadísticos y valores p: 10⁻⁹ (F, H, valores propios y diferencias de Tukey
  en forma relativa). Los datos se escriben al CSV con todas sus cifras: con 12
  cifras, el redondeo de la entrada movía las diferencias de Tukey cercanas a
  cero en 10⁻⁸ relativo, y la comparación lo marcó.
- Intervalos de Tukey: 10⁻⁶; el cuantil del rango estudentizado se obtiene por
  búsqueda de raíz y la diferencia máxima fue 5 × 10⁻⁷.
- Valor p de PERMANOVA: 0.01, porque los dos programas sortean permutaciones
  distintas (9 999 cada uno); la diferencia máxima fue 0.006.
- Predicciones del discriminante dejando uno fuera: ninguna distinta. La app
  re-estandariza en cada pliegue y el programa de contraste no; el
  discriminante lineal no cambia con una transformación afín, y las 30 × n
  predicciones coinciden.

## Lo que la validación y la construcción encontraron

1. **Calibración por la barra de escala.** La detección de la
   barra de escala podía tomar una letra del rótulo por la barra; ahora se
   exige un rectángulo casi lleno (relleno ≥ 0.95) de longitud redonda (error
   ≤ 4 %), y el tamaño del píxel sigue la regla del ancho de referencia (128 mm
   a la magnificación indicada).
2. **Barra de escala con ruido y letras.** En las imágenes simuladas, el ruido
   rompía la barra y, al tolerar huecos, las letras vecinas se unían a ella. Se
   exige ahora que la banda sea un rectángulo casi lleno.
3. **Umbral de Otsu con histogramas de 8 bits.** Con el histograma en valores
   reales el umbral caía a media clase; se calcula ahora con el histograma
   entero, como la biblioteca de imágenes con la que se comparó.
4. **Densidad de lúmenes sesgada en el borde.** Contar lúmenes por área total
   la subestimaba cerca del contorno; se cuenta en la zona interior, medida con
   una distancia de chaflán.
5. **Fertilidad.** La solidez de la silueta confundía espinas, agregados y
   grietas del montaje con colapso. Se usa la solidez del **cuerpo** (sin
   espinas) y clases de tamaño que dejan fuera agregados y fragmentos.
6. **Umbral de colapso, conservador.** En las panorámicas simuladas, el umbral
   de solidez 0.95 reconoce 15 de 20 granos colapsados sin tomar por colapsado a
   ningún grano sano (los sanos tienen solidez ≥ 0.987). Los cinco que escapan
   tienen pliegues leves (solidez 0.951–0.971). No se añadió un criterio de
   elongación: un grano sano visto de lado puede verse alargado sin estar
   colapsado. El umbral se cambia en el Bloque 5.
7. **TIFF con LZW.** Una prueba fallaba por el codificador escrito para la
   prueba, no por el lector: con archivos escritos por otro programa la lectura
   es exacta.
8. **Índices con el tamaño del píxel equivocado.** Un índice escrito por otra
   herramienta puede traer un µm/px equivocado, y un índice manda sobre la
   magnificación. Ahora, si la barra contradice el valor del índice o
   del archivo y la magnificación coincide con ella, se usa la magnificación y
   el Bloque 2 lo avisa.
9. **Unidades en mayúsculas.** Las etiquetas en versalitas convertían «µm» en
   «MM»; las unidades van ahora fuera de la transformación.
10. **Altura de espina sobre la cuerda de sus pies.** La altura se medía sobre
    la apertura del perfil radial. Una apertura plana se apoya en el lado más
    alto de una espina cuando el contorno del cuerpo está inclinado (granos
    alargados) y queda por encima del cuerpo cuando la ventana apenas rebasa
    la espina: la altura salía con sesgo mediano de −7.6 % (P5 −14.3 %). Ahora
    se mide de la punta a la cuerda que une los dos pies de la espina; el
    sesgo bajó a −3.9 % (P5 −5.7 %, P95 −2.9 %). Lo que queda es cerca de un
    píxel que se pierde porque la punta más fina no llena un píxel: crece en
    proporción cuando la espina mide pocos píxeles de alto o cuando las espinas
    se tocan en la base. El cuerpo, el número de espinas y lo demás no
    cambiaron.

Ni las pruebas ni la validación forman parte de la obra: sirven para
comprobarla.
