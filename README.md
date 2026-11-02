# PalynoPro

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.23883213.svg)](https://doi.org/10.5281/zenodo.23883213)

**From the electron micrograph to the pollen key** · *Español: [LEEME.md](LEEME.md)*

Quantitative pollen morphometry in the browser, without writing code. PalynoPro
measures pollen grains in scanning electron micrographs and compares groups
(morphotypes, varieties, populations) by their pollen. It calibrates every
image from the magnification of the microscope and checks it against the
printed scale bar; separates the grain from the background; reads its outline
in 720 directions; removes the spines to measure the **corpus**; counts and
measures the spines; detects the lumina of the reticulum; measures the texture
of the surface; estimates the proportion of collapsed grains in overview
images; compares the groups with univariate tests, principal components,
PERMANOVA, discriminant analysis and random forest, always with the **grain**
as the unit; and writes a report with the methods. It is meant for echinate
and reticulate pollen in general (Cucurbitaceae, Malvaceae, Asteraceae and
others), for theses, descriptive palynology and teaching. The interface is in
Spanish and English, with light and dark themes. There is nothing to install,
and everything is computed on your own computer: the images never leave it.

## Statement of need

Measuring pollen in electron micrographs usually means calibrating each image
by hand, tracing outlines in a general image program, counting spines one by
one, copying the numbers to a spreadsheet and moving them to a statistics
package, where the photographs of one grain easily end up counted as separate
grains. Every transfer is a chance for error, and the spines inflate the
diameter if they are not removed. PalynoPro puts the whole chain in one page
that opens with a double click: the calibration is checked against the scale
bar, the corpus is measured without its spines, repeated photographs of a
grain are averaged before any comparison, and each result names its method and
its source.

## Open it

- **On line:** https://luisangelbg.github.io/PalynoPro/
- **On your computer:** download the repository and double-click
  `index.html`. No server, no installation, no build step and no internet
  connection; the simulated example works offline. Any current browser works.

To open it from another device on the same network, run `Open PalynoPro.bat`
(Windows; it starts `server.ps1`, a minimal local server on port 9940).
Keyboard and screen reader work throughout, and it can be used on a phone
(360 px wide, no horizontal scrolling).

## The seven blocks

1. **Home** — how a grain is measured, in plain language; a laboratory that
   draws a simulated grain and measures it live; the methods and their
   references; how to cite.
2. **Images and calibration** — open a whole folder (instrument TIFF, with its
   compressions, PNG or JPEG); the group and the grain number are read from
   the file name or from a CSV index; the pixel size comes from the
   magnification (width of the reference frame ÷ magnification ÷ width in
   pixels) and is checked against the scale bar, which is found
   automatically. Images are sorted into single-grain photographs and
   overviews.
3. **Outline and size** — equivalent diameter of the corpus, greatest and
   least Feret widths, elongation and circularity; outlines cut by the image
   edge are flagged and excluded.
4. **Ornamentation** — spines on the outline (number, height, spacing,
   density), lumina of the reticulum (diameter, density, variation) and
   surface texture from the grey-level co-occurrence matrix.
5. **Fertility** — turgid and collapsed grains in the overviews by the
   solidity of the corpus; aggregates, fragments and grains on the edge are
   left out; Wilson intervals and a chi-square test among groups.
6. **Multivariate statistics** — analysis of variance with Tukey letters and
   Kruskal–Wallis with Holm's adjustment, principal components, global and
   pairwise PERMANOVA, linear discriminant analysis and random forest
   validated by leaving out one whole grain at a time, confusion matrices and
   Cohen's κ.
7. **Report** — material, methods with the parameters used and their
   sources, tables, every figure, a gallery with one measured grain per group,
   limitations and references, in Spanish or English, to print or save as
   PDF; the project is saved as JSON and every table as CSV.

A **simulated** example (three morphotypes, with 30 single-grain photographs
and three overviews) lets you go through every block without images of your
own; the grains are drawn by code every time it opens and are not photographs
of real plants.

## Tests and validation

- **Unit tests.** Open `tests/index.html` with a double click (or run
  `node tests/run_node.js`): 155 tests of the image reader, the calibration,
  the image engine, the simulated grains and the statistics. Every line must
  be green.
- **Validation of the statistics against R.** The statistical engines
  (`js/stats.js`, `js/multi.js`) run both in the browser and in node, so 30
  simulated data sets (3 or 4 groups, 6 to 12 grains per group, 8 correlated
  measurements, fixed seed) were compared against independent implementations
  in R 4.4.2 (MASS and vegan): analysis of variance, Kruskal–Wallis, Tukey
  differences, intervals and adjusted p-values, Holm, principal components,
  the discriminant, its leave-one-out predictions, PERMANOVA, the chi-square
  test and the Wilson interval: **6,705 comparisons in 18 families, none out
  of tolerance**.
- **Validation of the image engine against simulated grains of known
  truth.** 60 single-grain images and 12 overviews, drawn with known size,
  spines and reticulum, at two image widths and any rotation, calibrated and
  measured as the app does: the scale bar was recognised in 60 of 60 images;
  the corpus diameter has a median error of 0.20 % (95th percentile 0.37 %);
  the Feret widths, errors below 0.3 %; the number of spines was exact in 60
  of 60; 141 of 141 grains were found in the overviews, and no turgid grain was
  taken for a collapsed one.

| Family | Comparisons | Out of tolerance |
|---|---:|---:|
| Analysis of variance (F and p) | 480 | 0 |
| Kruskal–Wallis (H and p) | 480 | 0 |
| Tukey (differences, intervals, adjusted p) | 4,320 | 0 |
| Holm | 240 | 0 |
| Principal components (eigenvalues and loadings) | 720 | 0 |
| Linear discriminant (trace proportion and leave-one-out predictions) | 105 | 0 |
| PERMANOVA (pseudo-F, R², p) | 90 | 0 |
| Chi-square of homogeneity (statistic and p) | 60 | 0 |
| Wilson interval | 210 | 0 |
| **Total** | **6,705** | **0** |

The tolerance of every family and the largest difference found are written in
`validation/informe.txt`; the image results, in
`validation/informe_imagen.txt`; and `validation/LEEME.md` explains the steps,
the tolerances and what the validation caught and was corrected (in Spanish).
To repeat it:

```
node validation/1_app.js
Rscript validation/2_comparar.R
node validation/3_imagen.js
node tests/run_node.js
```

## Documentation

| Document | Language | What it is |
|---|---|---|
| `manual/PalynoPro_Manual_de_usuario_ES.pdf` | Spanish | User manual: introduction, one chapter per block and appendices (files, rules, glossary, common problems, licence and how to cite, references) |
| `manual/en/PalynoPro User's Manual (English).pdf` | English | The same manual in English |
| `manual/es/manual-completo.html`, `manual/en/manual-completo.html` | Spanish, English | The manuals in HTML; the separate parts are in the same folders, and `manual/LEEME.md` explains how they are built |
| Home page of the app (Block 1) and the method box of every block | Spanish and English | What each block does, the methods with their sources |
| [`CHANGELOG.md`](CHANGELOG.md) | Spanish | What changed in each version |
| [`PROCEDENCIA.md`](PROCEDENCIA.md) | Spanish | Item by item, what is original work and where the methods come from |

## Data and third-party material

PalynoPro contains no code, icons, illustrations or fonts by anyone else. The
TIFF reader (with its compressions), the image analysis, the statistics, the
multivariate analysis, the figures and the report are the author's own code;
PNG and JPEG are decoded by the browser itself, and the program requests
nothing from the internet. It implements published methods, each one cited to
its original source in the code, in the app and in the manual.

The example is **simulated** (`js/synth.js`): the grains, their spines, their
reticulum, the noise and the scale bar are generated with a fixed seed every
time it opens. The pictures of whoever uses the app are never copied into the
program.

## Good to know

- The calibration rule assumes that the width of the image corresponds to a
  reference frame of 128 mm at the stated magnification (usual in scanning
  microscopes with an output 1280 px wide). If your instrument uses another,
  change it in Block 2; the scale bar warns when they disagree.
- The measurements are of the **projection** of the grain in the image: the
  polar and equatorial diameters can be told apart only if oriented views were
  photographed.
- The solidity of the corpus is a morphological approximation to fertility,
  not a viability test; it is worth checking it against a stain.
- Repeated photographs of the same grain are averaged before comparing: the
  grain, not the photograph, is the unit.

## How to cite

Barrera-Guzmán, L. Á. (2026). PalynoPro: quantitative pollen morphometry from
electron micrographs (Version 1.0.0) [Computer software]. Zenodo.
https://doi.org/10.5281/zenodo.23883213

The DOI above always resolves to the latest version; each version has its own
DOI on the Zenodo page. Cite the version you used. Code:
https://github.com/luisangelbg/PalynoPro

The **Home** page of the app gives the citation ready to copy, and every
report ends with it. `CITATION.cff` has the same data for reference managers.
Cite also the methods you used: every result names them.

## Contributing and support

Problems and proposals go to https://github.com/luisangelbg/PalynoPro/issues.

## Licence

GNU General Public License, version 3 or later (`LICENSE`). Copyright (C) 2026
Luis Ángel Barrera-Guzmán.
