# Auditoría Bibliográfica — Paper ML Diabetes (BRFSS 2015)

**Documento auditado:** `paper_ml_diabetes_mimeti2026_es.tex` + `paper_ml_diabetes_mimeti2026_es.bbl`
**Estilo objetivo:** IEEE (`IEEEtran`)
**Fecha de verificación:** junio 2026
**Verificado contra:** Crossref, DOI.org, PubMed/PMC, IEEE Xplore, ACM DL, Springer, Elsevier/ScienceDirect, PLoS, Project Euclid, sitios oficiales (CDC, ADA, BMJ, Mendeley Data).

> **Nota de procedencia.** Se aportó el `.bbl` compilado, **no** los `.bib` fuente (`references.bib`, `mimeti.bib`) que invoca `\bibliography{references,mimeti}`. La auditoría se hizo sobre el `.bbl` (lo que realmente se imprime). El `references_cleaned.bib` adjunto es una **reconstrucción** de esas 35 entradas con los DOIs verificados añadidos; basta con fundir las claves en tus `.bib` fuente.
>
> **Regla cumplida:** ningún DOI fue inventado. Cada DOI proviene de una fuente verificable. Las entradas sin DOI no lo tienen porque su fuente (JMLR, NeurIPS/PMLR, reportes institucionales, datasets) no asigna DOI.

---

## Resumen ejecutivo

| Métrica | Resultado |
|---|---|
| Referencias totales | **35** |
| Reales y verificables | **35 / 35 (100%)** |
| Generadas por IA / inexistentes | **0** |
| Retractadas | **0** |
| Duplicadas | **0** |
| Citadas pero ausentes (faltantes) | **0** |
| Presentes pero no citadas (huérfanas) | **0** |
| DOIs **añadidos** (verificados) | **26** |
| DOIs corregidos | **0** (no había DOIs erróneos; solo faltantes) |
| Entradas sin DOI (correctamente) | **8** |
| Correcciones de formato IEEE | **2** |

**Veredicto:** bibliografía sólida y honesta. No hay señales de fabricación ni de "relleno" por IA. El trabajo restante es mecánico: **añadir 26 DOIs** y **dos arreglos de formato** (un libro mal tipado como artículo y una mayúscula de nombre propio).

---

## FASE 1–2 · Verificación y detección de errores

Las 35 referencias existen, con autores/título/venue/año/volumen/páginas correctos. No se detectó ningún DOI inválido, roto ni inventado en el original; el único defecto sistemático es la **ausencia** de DOI en 26 entradas.

Verificación destacable: el DOI canónico de Breiman *Random Forests* es **`10.1023/A:1010933404324`**. Durante la verificación apareció en la web un DOI alternativo erróneo (`10.1023/A:1010950718922`) en bibliografías de terceros; **no** se usó. Esto justifica verificar incluso los clásicos.

---

## FASE 4 · DOIs (estado por referencia)

Leyenda: ✅ verificado y presente · ➕ verificado y **a añadir** · ⬜ no aplica (la fuente no asigna DOI).

| # | Clave BibTeX | Tipo | DOI (verificado) | Acción |
|---|---|---|---|---|
| 1 | `idf2021atlas` | Reporte IDF | — | ⬜ sin DOI (reporte) |
| 2 | `ada2021classification` | Artículo | `10.2337/dc21-S002` | ➕ añadir |
| 3 | `xie2019building` | Artículo | `10.5888/pcd16.190109` | ➕ añadir |
| 4 | `dinh2019data` | Artículo | `10.1186/s12911-019-0918-5` | ➕ añadir |
| 5 | `tigga2020prediction` | Artículo | `10.1016/j.procs.2020.03.336` | ➕ añadir |
| 6 | `rashid2020diabetes` | Dataset | `10.17632/wj9rwkp9c2.1` | ✅ ya presente |
| 7 | `christodoulou2019systematic` | Artículo | `10.1016/j.jclinepi.2019.02.004` | ➕ añadir |
| 8 | `kaufman2012leakage` | Artículo | `10.1145/2382577.2382579` | ➕ añadir |
| 9 | `kapoor2023leakage` | Artículo | `10.1016/j.patter.2023.100804` | ➕ añadir |
| 10 | `steyerberg2019validation` | **Libro** | `10.1007/978-3-030-16399-0` | ➕ añadir (+ formato) |
| 11 | `vancalster2019calibration` | Artículo | `10.1186/s12916-019-1466-7` | ➕ añadir (+ formato) |
| 12 | `niculescu2005predicting` | Conf. | `10.1145/1102351.1102430` | ➕ añadir |
| 13 | `guo2017calibration` | Conf. (PMLR) | — | ⬜ sin DOI (PMLR) |
| 14 | `lundberg2017shap` | Conf. (NeurIPS) | — | ⬜ sin DOI (NeurIPS) |
| 15 | `lundberg2020local` | Artículo | `10.1038/s42256-019-0138-9` | ➕ añadir |
| 16 | `ribeiro2016lime` | Conf. | `10.1145/2939672.2939778` | ➕ añadir |
| 17 | `rudin2019stop` | Artículo | `10.1038/s42256-019-0048-x` | ➕ añadir |
| 18 | `caruana2015intelligible` | Conf. | `10.1145/2783258.2788613` | ➕ añadir |
| 19 | `ghassemi2021false` | Artículo | `10.1016/S2589-7500(21)00208-9` | ➕ añadir |
| 20 | `saito2015precision` | Artículo | `10.1371/journal.pone.0118432` | ➕ añadir |
| 21 | `he2009learning` | Artículo | `10.1109/TKDE.2008.239` | ➕ añadir |
| 22 | `chicco2020mcc` | Artículo | `10.1186/s12864-019-6413-7` | ➕ añadir |
| 23 | `teboul2021dataset` | Dataset | — | ⬜ sin DOI (Kaggle) |
| 24 | `cdc2015brfss` | Reporte CDC | — | ⬜ sin DOI (reporte) |
| 25 | `pedregosa2011scikit` | Artículo (JMLR) | — | ⬜ sin DOI (JMLR) |
| 26 | `breiman2001random` | Artículo | `10.1023/A:1010933404324` | ➕ añadir |
| 27 | `friedman2001greedy` | Artículo | `10.1214/aos/1013203451` | ➕ añadir |
| 28 | `chen2016xgboost` | Conf. | `10.1145/2939672.2939785` | ➕ añadir |
| 29 | `ke2017lightgbm` | Conf. (NeurIPS) | — | ⬜ sin DOI (NeurIPS) |
| 30 | `cover1967knn` | Artículo | `10.1109/TIT.1967.1053964` | ➕ añadir |
| 31 | `cortes1995svm` | Artículo | `10.1007/BF00994018` | ➕ añadir |
| 32 | `demsar2006statistical` | Artículo (JMLR) | — | ⬜ sin DOI (JMLR) |
| 33 | `elsayed2023classification` | Artículo | `10.2337/dc23-S002` | ➕ añadir |
| 34 | `tasin2023diabetes` | Artículo | `10.1049/htl2.12039` | ➕ añadir |
| 35 | `collins2024tripod` | Artículo | `10.1136/bmj-2023-078378` | ➕ añadir |

**26 DOIs a añadir · 1 ya presente · 8 sin DOI por naturaleza de la fuente.**

---

## FASE 3 · Formato IEEE — correcciones requeridas

Solo **dos** entradas necesitan arreglo de formato; el resto cumple el estilo IEEE.

1. **`steyerberg2019validation` (libro mal tipado como artículo).**
   El `.bbl` lo imprime como `\emph{Springer, 2nd ed.}, 2019`, es decir, italiza la editorial como si fuera el nombre de una revista. En IEEE un libro lleva el **título en cursiva** y la editorial en redonda:
   > E. W. Steyerberg, *Clinical Prediction Models: A Practical Approach to Development, Validation, and Updating*, 2nd ed. Cham, Switzerland: Springer, 2019.

   Corregido como `@book` en el `.bib` (con `edition`, `publisher`, `address`, `isbn`, `doi`).

2. **`vancalster2019calibration` (mayúscula de nombre propio).**
   El `.bbl` escribe "the **a**chilles heel". *Achilles* es nombre propio → debe ir en mayúscula. Corregido a "The **Achilles** heel" en el `.bib` mediante `{Achilles}` para protegerlo del estilo.

Observaciones menores (no errores): `tigga2020prediction` usa *Procedia Computer Science* (proceedings tipo revista) → se mantiene como `@article`, consistente con el `.bbl`. `rashid2020diabetes`, `teboul2021dataset` y `cdc2015brfss` están bien tratados como dataset/reporte.

---

## FASE 5 · Datasets (atención especial)

| Recurso | Rol | Fuente primaria vs. secundaria | Estado |
|---|---|---|---|
| **BRFSS 2015** (`cdc2015brfss`) | Fuente científica **primaria** del estudio | CDC (origen) | ✅ correcto. Es la cita "raíz" correcta. Sin DOI (reporte gubernamental). |
| **Diabetes Health Indicators** (`teboul2021dataset`) | Fuente **secundaria** (extracción curada en Kaggle) | Kaggle de A. Teboul, derivada de BRFSS 2015 | ✅ correcto. La `note` ya documenta la derivación de BRFSS. Sin DOI (Kaggle). |
| **Diabetes Dataset** (`rashid2020diabetes`) | Trabajo relacionado (no es el dataset del estudio) | Mendeley Data, A. Rashid, V1, 2020 | ✅ DOI real `10.17632/wj9rwkp9c2.1`. Es un dataset **clínico iraquí** (con HbA1c, etc.), distinto de BRFSS; se cita correctamente como ejemplo de literatura, no como datos del estudio. |

**Buena práctica ya aplicada:** el paper prioriza la fuente científica original (CDC/BRFSS) y trata Kaggle como derivada. No se requiere cambio de jerarquía.

---

## FASE 6 · Consistencia del paper

Comprobación automática `\cite{}` ↔ `\bibitem{}`:

- Claves citadas únicas: **35**
- Entradas en bibliografía: **35**
- **Citadas sin entrada (rotas):** ninguna
- **Entradas sin citar (huérfanas):** ninguna
- **Claves inconsistentes / duplicadas:** ninguna

La correspondencia es **1:1 perfecta**. (Las más citadas: `vancalster2019calibration` y `kapoor2023leakage`, 4 veces cada una.)

---

## FASE 7 · Resultado consolidado

1. **Referencias verificadas (35/35):** todas reales, con metadatos correctos.
2. **Referencias corregidas (2):** `steyerberg2019validation` (artículo→libro) y `vancalster2019calibration` ("Achilles").
3. **DOIs añadidos (26):** ver tabla Fase 4 (todos verificados).
4. **DOIs corregidos (0):** no había DOIs erróneos en el original.
5. **Referencias dudosas / sospechosas (0):** ninguna requiere marca de sospecha.
6. **Referencias eliminadas (0):** nada que eliminar.
7. **Referencias faltantes (0):** nada que añadir.

### Cómo aplicar
1. Fusiona las claves de `references_cleaned.bib` en tus `references.bib` / `mimeti.bib` (o reemplázalos si todas tus claves están aquí).
2. Recompila: `pdflatex → bibtex → pdflatex → pdflatex`.
3. Verifica que las dos correcciones de formato se rendericen (Steyerberg como libro; "Achilles" con mayúscula).

> **Limitación declarada.** Verificación realizada vía búsqueda web contra Crossref/DOI.org/editoriales/PubMed (el acceso de red del entorno de cómputo estaba deshabilitado, pero la búsqueda web sí estaba disponible). Si necesitas además ISBN del IDF Atlas o la resolución HTTP en vivo de cada DOI, indícalo y lo añado.
