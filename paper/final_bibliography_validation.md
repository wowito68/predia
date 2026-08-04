# Validación Bibliográfica Final — Revisión nivel IEEE

**Papers validados:**
- `paper_ml_diabetes_mimeti2026.tex` (inglés) — objetivo de envío: **MiMETI 2026**
- `paper_ml_diabetes_mimeti2026_es.tex` (español)
- `main.tex` / `main_es.tex` (recompilados por consistencia: comparten `references.bib` e `IEEEtran.bst`)

**Insumos:** `bibliography_audit_report.md` + `references_cleaned.bib` (auditoría de junio 2026, verificada contra Crossref / DOI.org / PubMed / editoriales).

**Fecha de validación:** 12 de junio de 2026.

---

## 1. Resumen ejecutivo

| Verificación | Resultado |
|---|---|
| Entradas reemplazadas por versiones verificadas | **35 / 35** ✅ |
| DOIs validados incorporados | **27** (26 añadidos + 1 ya presente) ✅ |
| Entradas sin DOI (la fuente no asigna DOI) | **8** (JMLR ×2, NeurIPS ×2, PMLR ×1, reportes ×2, Kaggle ×1) ✅ |
| Correcciones de formato aplicadas | **2** (`steyerberg2019validation`, `vancalster2019calibration`) ✅ |
| Referencias huérfanas (en bibliografía sin citar) | **0** ✅ |
| Citas rotas (citadas sin entrada) | **0** ✅ |
| Claves duplicadas (entre `references.bib` y `mimeti.bib`) | **0** ✅ |
| Advertencias de BibTeX (`.blg`) | **0** en los 4 documentos ✅ |
| DOIs visibles en el PDF final | **27/27** (EN y ES) ✅ |
| Sección "Reproducibility Statement" | Añadida (EN y ES) ✅ |
| Resultados experimentales / métricas | **Sin modificar** ✅ |
| Referencias nuevas añadidas | **0** ✅ |

**Veredicto: la bibliografía está lista para envío académico a MiMETI 2026.**

---

## 2. Cambios aplicados

### 2.1 `references.bib` — reemplazo completo
Se sustituyó el contenido por las **35 entradas verificadas** de `references_cleaned.bib`, con los 27 DOIs validados. Los comentarios de procedencia se colocaron **fuera** de las entradas (dentro de una entrada, BibTeX no admite `%` y produce errores de sintaxis; esto se detectó y corrigió durante la compilación).

### 2.2 `mimeti.bib` — eliminación de duplicados
Las 24 claves que duplicaban a `references.bib` se eliminaron. El archivo se conserva (los `.tex` invocan `\bibliography{references,mimeti}`) y retiene únicamente `molnar2022interpretable`, que **no está citada** en ningún `.tex` y por tanto no se imprime (no es huérfana en el PDF; se conserva por si se reutiliza).

### 2.3 Las dos entradas corregidas
1. **`steyerberg2019validation`** — re-tipada de `@article` (que italizaba "Springer, 2nd ed." como si fuera revista) a `@book` con `edition`, `series`, `publisher`, `address`, `isbn` y `doi`. Render verificado en el PDF:
   > E. W. Steyerberg, *Clinical Prediction Models: A Practical Approach to Development, Validation, and Updating*, 2nd ed., ser. Statistics for Biology and Health. Cham, Switzerland: Springer, 2019, doi: 10.1007/978-3-030-16399-0.
2. **`vancalster2019calibration`** — "achilles" → "{Achilles}" (nombre propio protegido del estilo). Render verificado: "Calibration: The **Achilles** heel of predictive analytics".

### 2.4 `IEEEtran.bst` — soporte de DOI (necesario para la tarea 5)
El `IEEEtran.bst` v1.14 original **ignora el campo `doi`**: los DOIs del `.bib` jamás habrían llegado al PDF. Se aplicó un parche mínimo de tres partes:
1. `doi` declarado en el bloque `ENTRY`.
2. Nueva función `format.doi` (modelada sobre `format.url`), que emite `, doi: 10.xxxx/yyyy` al final de la entrada — el formato oficial de IEEE Xplore.
3. `format.doi output` insertado antes de `format.url output` en los 17 manejadores de tipo de entrada.

### 2.5 Sección "Reproducibility Statement"
La sección breve existente ("Reproducibility") se formalizó como **"Reproducibility Statement"** (EN) / **"Declaración de Reproducibilidad"** (ES), declarando: semilla fija, partición estratificada 60/20/20, evaluación exclusiva sobre el conjunto de prueba retenido, datos públicos (BRFSS 2015 / Diabetes Health Indicators, citados), disponibilidad de la tubería completa como notebooks/scripts, y la verificación bibliográfica con DOI cuando la fuente lo asigna. Se añadió `\label{sec:methods}` a la sección de Metodología para la referencia cruzada. **No se tocó ningún resultado ni métrica.**

---

## 3. Verificación de consistencia (post-recompilación)

Comprobación automática sobre los `.aux`/`.bbl` regenerados:

| Documento | Claves citadas (`.aux`) | Entradas impresas (`.bbl`) | Correspondencia | Advertencias BibTeX |
|---|---|---|---|---|
| `paper_ml_diabetes_mimeti2026` | 35 | 35 | 1:1 ✅ | 0 |
| `paper_ml_diabetes_mimeti2026_es` | 35 | 35 | 1:1 ✅ | 0 |
| `main` | 13 | 13 | 1:1 ✅ | 0 |
| `main_es` | 13 | 13 | 1:1 ✅ | 0 |

- **Citas rotas:** ninguna (`grep undefined` en los `.log` finales: vacío).
- **Huérfanas:** ninguna (BibTeX imprime exactamente las citadas).
- **Claves duplicadas:** ninguna (`uniq -d` sobre las claves de ambos `.bib`: vacío; BibTeX no reportó "Repeated entry").

## 4. Verificación del PDF final

Sobre el texto extraído de los PDFs recompilados:

- **27 ocurrencias de `doi:`** en `paper_ml_diabetes_mimeti2026.pdf` y 27 en la versión ES — exactamente las 27 entradas con DOI verificado.
- Sección **"REPRODUCIBILITY STATEMENT"** presente en EN y **"DECLARACIÓN DE REPRODUCIBILIDAD"** en ES.
- Las dos correcciones de formato renderizadas correctamente (libro de Steyerberg; "Achilles" con mayúscula).
- Las 8 entradas sin DOI permanecen, correctamente, sin DOI.

## 5. Secuencia de compilación ejecutada

```
pdflatex → bibtex → pdflatex → pdflatex
```
para los cuatro documentos (`paper_ml_diabetes_mimeti2026`, `paper_ml_diabetes_mimeti2026_es`, `main`, `main_es`). Copias de `main.pdf` / `main_es.pdf` actualizadas en `pdf/`.

## 6. Archivos modificados

| Archivo | Cambio |
|---|---|
| `references.bib` | Reemplazado por las 35 entradas verificadas con DOIs |
| `mimeti.bib` | Reducido a 1 entrada no citada; duplicados eliminados |
| `IEEEtran.bst` | Parche para imprimir el campo `doi` (estilo IEEE) |
| `paper_ml_diabetes_mimeti2026.tex` | "Reproducibility Statement" + `\label{sec:methods}` |
| `paper_ml_diabetes_mimeti2026_es.tex` | "Declaración de Reproducibilidad" + `\label{sec:methods}` |
| `*.pdf`, `*.bbl`, `*.aux`, … | Regenerados |

---

*Ningún DOI fue inventado: todos provienen de `references_cleaned.bib`, verificados en la auditoría contra Crossref/DOI.org/PubMed/editoriales. No se modificaron resultados experimentales ni métricas. No se añadió ninguna referencia nueva.*
