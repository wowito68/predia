# Bitácora de análisis

## 2026-09-11: factibilidad previa al bloqueo

- Se identificaron y verificaron los archivos oficiales de ENSANUT 2012, 2016, 2018-19 y Continua 2021.
- Se inspeccionaron nombres, catálogos, códigos, tamaños de muestra y prevalencias agregadas para confirmar que el enlace y el desenlace eran viables.
- Antes de entrenar modelos nuevos se observó la prevalencia agregada de 2021 y se aplicó exploratoriamente el puntaje mexicano publicado.
- No se entrenó, seleccionó, calibró ni ajustó ningún modelo PREDIA con información de 2021.
- En consecuencia, 2021 funciona como evaluación temporal bloqueada para los modelos nuevos, pero no debe describirse como una base completamente desconocida: su estructura y prevalencia fueron examinadas durante factibilidad.

## Regla desde el bloqueo

El comando `develop` no carga archivos de 2021. Produce modelos, umbrales y `model_lock.json`. El comando `evaluate` verifica los hashes del código y de los modelos antes de calcular resultados de 2021. Toda desviación posterior debe anotarse aquí antes de volver a evaluar.

## 2026-09-11: bloqueo y evaluación temporal

- Se ejecutaron ocho pruebas unitarias y de integración antes del bloqueo final.
- El modelo núcleo y el modelo ampliado quedaron bloqueados con huella `cc911791bad871aca43e0ac677c4f44ccfa05343af94c07cf8faf5438c592b8f`.
- Se verificaron nuevamente código, versiones, archivos extraídos y artefactos antes de cargar ENSANUT 2021.
- Se ejecutó una sola evaluación primaria con 1,000 remuestreos de UPM dentro de estratos. El archivo `evaluation_2021.json` no se sobrescribió.
- Después de conocer el resultado primario se implementó `postlock_subgroup_analysis.py` para completar los intervalos y contrastes de subgrupos ya preespecificados en el protocolo. Este análisis no modifica predictores, modelo, probabilidades ni umbral; se identifica expresamente como análisis post-lock.
- Se verificó la implementación del comparador contra Rojas-Martínez et al. (2024; doi:10.21149/15837): máximo 49 puntos y corte 27. No corresponde al puntaje sexoespecífico publicado por el mismo grupo en 2018.
- Se añadió un análisis post-lock de comparadores con probabilidades y familias ya fijadas. Debe advertirse que el puntaje de 2024 se desarrolló con ENSANUT 2021-2023; su evaluación en la ola 2021 no es externa para ese comparador.
- Se añadió explicabilidad post-lock sobre ENSANUT 2018, no sobre la ola de prueba: curvas marginales ponderadas e importancia por permutación del modelo fijo. No se usaron estas salidas para seleccionar variables ni modelos.

## 2026-09-12: capacidad de laboratorio y omisiones

- Se escribió `POLICY_ANALYSIS_ADDENDUM.md` antes de ejecutar `postlock_policy_analysis.py`. Es un complemento exploratorio posterior al resultado primario, no una modificación del protocolo bloqueado.
- Se compararon 200, 400 y 600 pruebas por 1,000 adultos en la muestra común de 1,413 participantes y 338 eventos. Los desempates tienen selección fraccionaria uniforme, sin usar el desenlace; sus resultados son expectativas de una asignación aleatoria dentro del empate.
- Las diferencias modelo-puntaje de alteraciones detectadas por 1,000 fueron 9.1 (IC95% -0.3 a 20.4), 5.3 (-4.5 a 15.6) y 1.5 (-10.2 a 10.6). No se demostró superioridad ni equivalencia a igual capacidad.
- El umbral bloqueado omitiría 47.6 alteraciones por 1,000 adultos de la cohorte completa, incluidas 6.8 con glucosa >=126 mg/dL. El grupo de 20-34 años concentró 59.6% de las omisiones ponderadas, sin inferencia causal.
- Los 1,000 remuestreos se aplicaron primero a la cohorte elegible y después a dominios de análisis, con semilla 20260912. Trece estratos contenían una sola UPM y aportaban 4.7% del peso; su contribución fija limita los intervalos aproximados.
- Siete pruebas del complemento y ocho del estudio anterior pasaron (15 en total). El complemento guarda hashes del script, addendum y resultados primarios. No se modificaron modelos, umbral, protocolo ni el archivo primario `evaluation_2021.json`.
- El manuscrito se reorientó a la pregunta sanitaria de detección y omisiones bajo restricciones de laboratorio. La integración móvil quedó como factibilidad técnica secundaria, sin alegar beneficio clínico ni económico.

## 2026-09-12: sensibilidad de diseño y reporte de cohortes

- Se escribió `DESIGN_SENSITIVITY_ADDENDUM.md` después de conocer los resultados previos y antes de ejecutar el nuevo análisis. SHA-256: `02a7b766f8905d2bde04f7021eeea4deb58e8cb80677d83d8eee415dfa0befe2`.
- Se ejecutó `postlock_design_sensitivity.py` una vez, sin sobrescribir resultados. SHA-256 del script: `5d4467574cc8a33e6f7fdddc99de792e14b07c90d2108433360abf8a179f2af0`; del resultado `results/design_sensitivity/analysis.json`: `b63f07b19e9b43e416f1421073c4ec19013b60bbc6760ec2c90593b150023809`.
- El dominio elegible permanece en 1,724 adultos. El archivo bioquímico positivo contiene 2,034 registros, 85 estratos, 397 UPM y 13 estratos únicos; recupera siete UPM externas al dominio, sin resolver la falta de varianza interna en estratos únicos.
- Se aplicaron linealización de razones y AUC ponderada emparejada, tres tratamientos de estratos únicos (cero, centrado y promedio), IC t por dominio y JKn con 384 réplicas y estratos únicos fijos. Implementación propia en Python; no se ejecutó el paquete survey de R. No se reconstruyen todas las etapas del diseño ni se incorpora incertidumbre de entrenamiento.
- AUC con tratamiento promedio: 0.694, IC95% 0.649-0.738. Diferencia de AUC frente al puntaje: 0.027, IC95% 0.001-0.052. Las estimaciones coinciden con las anteriores; se conservan sus intervalos bootstrap.
- Se calcularon IC puntuales de decisión y contrastes emparejados. En el umbral bloqueado, beneficio neto 0.0343, IC95% -0.0002 a 0.0688 con tratamiento promedio. Frente a remitir a todos: diferencia 0.0603, IC95% 0.0401-0.0806. Se retiró la interpretación de superioridad frente a ambas alternativas en todo el intervalo.
- Se exportaron las exclusiones ya determinadas por la armonización bloqueada y los faltantes previos a imputación. No se presentan cuentas fuente heterogéneas como pasos de exclusión ni variables no armonizadas de 2012 como ausencia universal en la encuesta.
- Después de observar límites Wald negativos para tasas de omisión, se añadió `docs/rosenkranz-2026/render_design_figures.py`. Calcula IC logit-t desde las mismas tasas, errores estándar y grados de libertad, sin recortar límites ni cambiar resultados. Esta decisión posterior se declara en el suplemento; los IC Wald permanecen intactos en los archivos analíticos.
- Nueve pruebas nuevas verifican derivadas numéricas, AUC ponderada con empates, varianza SRS, dominios, tratamiento de estratos únicos e invariancias. La suite suma 24 pruebas; no constituyen validación clínica ni revisión estadística independiente.
- Se actualizaron el manuscrito y el dossier, y se generó un suplemento metodológico. El título prioriza carga de laboratorio y omisiones, manteniendo el prototipo como factibilidad técnica. No se modificaron las salidas primarias, el complemento de capacidad ni los modelos.
