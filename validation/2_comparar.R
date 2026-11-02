# PalynoPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán. GNU GPL v3 or later.
# Validation, step 2: the same 30 cases computed by R and compared with the app.
#   Rscript validation/2_comparar.R
# Needs the packages MASS, vegan and jsonlite. Writes validation/informe.txt.
suppressMessages({ library(MASS); library(vegan); library(jsonlite) })
here <- tryCatch(dirname(normalizePath(sub("--file=", "", grep("--file=", commandArgs(FALSE), value = TRUE)))), error = function(e) "validation")
app <- fromJSON(file.path(here, "datos", "app.json"), simplifyVector = FALSE)
keys <- unlist(app$keys)
res <- data.frame(familia = character(), n = integer(), maxdif = numeric(), tol = numeric(), stringsAsFactors = FALSE)
add <- function(fam, a, b, tol, rel = FALSE) {
  a <- as.numeric(a); b <- as.numeric(b)
  d <- if (rel) abs(a - b) / pmax(abs(b), 1e-300) else abs(a - b)
  i <- match(fam, res$familia)
  if (is.na(i)) res[nrow(res) + 1, ] <<- list(fam, length(d), max(d), tol)
  else { res$n[i] <<- res$n[i] + length(d); res$maxdif[i] <<- max(res$maxdif[i], d) }
}
for (cs in app$cases) {
  d <- read.csv(file.path(here, "datos", sprintf("caso_%02d.csv", cs$caso)))
  y <- factor(d$group, levels = unlist(cs$groups)); X <- as.matrix(d[, keys])
  pv <- numeric(length(keys))
  for (j in seq_along(keys)) {
    u <- cs$uni[[j]]; a <- summary(aov(X[, j] ~ y))[[1]]
    add("ANOVA: F", u$F, a$`F value`[1], 1e-9, TRUE); add("ANOVA: p", u$p, a$`Pr(>F)`[1], 1e-9)
    pv[j] <- a$`Pr(>F)`[1]
    k <- kruskal.test(X[, j] ~ y)
    add("Kruskal–Wallis: H", u$H, k$statistic, 1e-9, TRUE); add("Kruskal–Wallis: p", u$pK, k$p.value, 1e-9)
    tk <- TukeyHSD(aov(X[, j] ~ y))$y
    for (q in u$tukey) {
      lv <- levels(y); nm <- paste(lv[q$j + 1], lv[q$i + 1], sep = "-")
      add("Tukey: diferencia", -q$diff, tk[nm, "diff"], 1e-9, TRUE)
      add("Tukey: intervalo", c(-q$hi, -q$lo), tk[nm, c("lwr", "upr")], 1e-6)
      add("Tukey: p ajustada", q$p, tk[nm, "p adj"], 1e-6)
    }
  }
  add("Holm", unlist(cs$holm), p.adjust(pv, "holm"), 1e-9)
  pr <- prcomp(X, scale. = TRUE)
  add("ACP: valores propios", unlist(cs$pcaValues), pr$sdev^2, 1e-9, TRUE)
  add("ACP: cargas (sin signo)", abs(c(unlist(cs$pcaLoad1), unlist(cs$pcaLoad2))), abs(c(pr$rotation[, 1], pr$rotation[, 2])), 1e-7)
  l <- lda(scale(X), y)
  add("LDA: proporción de la traza", unlist(cs$ldaProp), l$svd^2 / sum(l$svd^2), 1e-9)
  lc <- lda(scale(X), y, CV = TRUE)
  add("LDA: validación dejando uno fuera (predicciones distintas)", sum(as.character(lc$class) != unlist(cs$ldaCvPred)), 0, 0)
  set.seed(cs$caso); ad <- adonis2(dist(scale(X)) ~ y, permutations = 9999)
  add("PERMANOVA: pseudo-F", cs$permF, ad$F[1], 1e-9, TRUE); add("PERMANOVA: R²", cs$permR2, ad$R2[1], 1e-9)
  # p from permutations: two independent draws of 9999 differ by sampling only
  add("PERMANOVA: p (permutaciones)", cs$permP, ad$`Pr(>F)`[1], 0.01)
  ct <- do.call(rbind, lapply(cs$counts, function(q) c(q$x, q$n - q$x)))
  ch <- suppressWarnings(chisq.test(ct, correct = FALSE))
  add("χ² de homogeneidad", cs$chi, ch$statistic, 1e-9, TRUE); add("χ²: p", cs$chiP, ch$p.value, 1e-9)
  for (k in seq_along(cs$counts)) {
    q <- cs$counts[[k]]; w <- prop.test(q$x, q$n, correct = FALSE)$conf.int
    add("Intervalo de Wilson", unlist(cs$wilson[[k]]), w, 1e-9)
  }
}
res$estado <- ifelse(res$maxdif <= res$tol, "dentro", "FUERA")
lines <- c(sprintf("PalynoPro 1.0.0 contra %s — %s", R.version.string, format(Sys.Date())), "",
  sprintf("%-58s %7s %12s %10s  %s", "Familia", "n", "dif. máx.", "tolerancia", "estado"),
  sprintf("%-58s %7d %12.3g %10.0e  %s", res$familia, res$n, res$maxdif, res$tol, res$estado), "",
  sprintf("Total: %d comparaciones en %d familias; fuera de tolerancia: %d.", sum(res$n), nrow(res), sum(res$estado != "dentro")),
  "Las diferencias de F, H, valores propios y Tukey son relativas; las demás, absolutas.")
writeLines(lines, file.path(here, "informe.txt"), useBytes = TRUE)
cat(lines, sep = "\n")
