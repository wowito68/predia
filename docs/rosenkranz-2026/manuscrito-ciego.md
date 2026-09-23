# Priorización de pruebas para disglucemia no diagnosticada mediante variables no invasivas en adultos mexicanos

## Validación temporal y carga de laboratorio con ENSANUT

## Resumen

**Objetivo.** Evaluar el desempeño temporal y las consecuencias operativas de un modelo no invasivo para priorizar pruebas bioquímicas en adultos mexicanos sin diabetes diagnosticada. **Métodos.** Análisis secundario de ENSANUT con desenlace de glucosa en ayuno >=100 mg/dL. Se desarrollaron modelos con 2012 y 2016, se seleccionaron configuración y umbral en 2018 y se evaluaron sin reajuste en 2021. El modelo seleccionado fue una regresión logística aditiva con seis predictores. Se calcularon métricas ponderadas e IC95% aproximados mediante 1,000 remuestreos de conglomerados dentro de estratos. Un análisis exploratorio posterior comparó modelo y puntaje mexicano a igual capacidad de laboratorio. **Resultados.** En 2021 se incluyeron 1,724 adultos, con 397 eventos y prevalencia ponderada de 21.9%. El ROC-AUC fue 0.694 (IC95% 0.657-0.729); la sensibilidad, 78.2%; y la especificidad, 44.1%. Un contraste complementario de varianza amplió el IC del ROC-AUC a 0.649-0.738. Por 1,000 adultos, el umbral bloqueado indicaría 608 pruebas iniciales, identificaría 171 alteraciones y omitiría 48, incluidas aproximadamente siete con glucosa >=126 mg/dL. En la muestra común, la diferencia de ROC-AUC frente al puntaje fue 0.027 (0.008-0.046). Sin embargo, con capacidades de 200, 400 y 600 pruebas por 1,000, las diferencias de detección fueron 9.1, 5.3 y 1.5, con intervalos que incluyeron cero. La sensibilidad fue menor en adultos jóvenes y se observó sobrepredicción. **Conclusión.** La discriminación temporal moderada no demostró superioridad operativa a igual capacidad. La implementación requiere evaluar recalibración, omisiones por subgrupo y desempeño prospectivo.

**Palabras clave:** diabetes mellitus; prediabetes; tamizaje; modelos de predicción; ENSANUT; validación temporal; salud digital.

## Introducción

La diabetes representa un problema persistente de salud pública en México. En la ENSANUT 2022, la prevalencia estimada de prediabetes fue 22.1%, la de diabetes previamente diagnosticada 12.6% y la de diabetes no diagnosticada 5.8% [1]. Esta fracción no diagnosticada importa porque retrasa la confirmación, la modificación de factores de riesgo y el inicio oportuno del seguimiento. La glucosa plasmática en ayuno y la hemoglobina glucosilada son pruebas aceptadas para tamizaje y diagnóstico, pero un resultado anormal en una persona sin hiperglucemia inequívoca requiere confirmación [2]. Por tanto, un instrumento digital no debe declarar diagnósticos: su función razonable es priorizar a quién ofrecer una prueba bioquímica.

México dispone de herramientas de riesgo construidas con datos nacionales. Un puntaje de seis factores, desarrollado con ENSANUT Continua 2021-2023, reportó sensibilidad de 68.3% y especificidad de 70.1% para un desenlace compuesto de prediabetes o diabetes [3]. Modelos derivados de ENSANUT 2006 y 2012 identificaron señal predictiva en edad, cintura, presión sistólica y antecedentes familiares [4]; una comparación en ENSANUT 2016 documentó transportabilidad variable [5]. La cuestión pendiente no es solo qué algoritmo discrimina mejor, sino cuántas pruebas demanda y qué alteraciones omite cuando cambian la población y la capacidad de atención.

TRIPOD+AI y PROBAST+AI recomiendan separar desarrollo y evaluación, reportar calibración y examinar aplicabilidad [6,7]. La validación temporal no sustituye una evaluación prospectiva independiente [8].

El objetivo principal fue desarrollar un modelo no invasivo y evaluar sin reajuste su desempeño temporal en ENSANUT 2021. Se compararon familias de modelado, un puntaje mexicano y un conjunto con presión arterial. Después del análisis primario se amplió la evaluación operativa: detección a igual capacidad de laboratorio y distribución de omisiones por edad, sexo, ámbito y nivel de glucosa. La integración en un prototipo móvil se examinó como factibilidad técnica complementaria.

## Métodos

### Diseño y fuentes de datos

Se realizó un análisis secundario de cortes transversales repetidos. Las olas se asignaron por calendario antes de revisar el resultado final: ENSANUT 2012 y ENSANUT MC 2016 para desarrollo, ENSANUT 2018-19 para selección de hiperparámetros y umbral, y ENSANUT Continua 2021 para evaluación temporal bloqueada. Las cuatro son encuestas probabilísticas de hogares; sus diseños emplean estratificación, conglomerados y ponderadores para producir inferencias poblacionales [9-12]. Los archivos se obtuvieron del repositorio oficial del Instituto Nacional de Salud Pública. Se conservaron manifiestos, hashes SHA-256 de los archivos fuente y versiones del entorno, sin redistribuir microdatos.

### Población y desenlaces

Se incluyeron personas de 20 a 110 años con cuestionario de adulto, antropometría y biomarcador enlazables; glucosa venosa; y ponderador bioquímico positivo. Se excluyeron diagnóstico médico previo de diabetes, embarazo registrado, menos de ocho horas de ayuno cuando la variable estaba disponible y valores fuera de intervalos preestablecidos de control de calidad. En 2012 se utilizó la submuestra bioquímica sin poder verificar horas individuales de ayuno; la ausencia de dato de embarazo no motivó exclusión.

El desenlace primario fue disglucemia no diagnosticada, definida operativamente como glucosa en ayuno >=100 mg/dL, conforme al límite inferior de alteración de ayuno de la ADA. Los desenlaces secundarios fueron glucosa en rango diabético (>=126 mg/dL), disglucemia compuesta (glucosa >=100 mg/dL o HbA1c >=5.7%) y rango diabético compuesto (glucosa >=126 mg/dL o HbA1c >=6.5%) [2]. Son clasificaciones de encuesta basadas en una medición, no diagnósticos confirmados ni predicción de incidencia futura. La glucosa permitió comparabilidad entre olas; la HbA1c de 2012 procedía de una submuestra no comparable.

### Predictores y comparadores

El conjunto núcleo incluyó seis variables disponibles de 2012 a 2021: edad continua, sexo registrado por la encuesta, antecedente de diabetes en padre o madre, diagnóstico médico previo de hipertensión, índice de masa corporal y circunferencia de cintura. El conjunto ampliado agregó presión arterial sistólica y diastólica medias y se desarrolló desde 2016. No se utilizaron glucosa, HbA1c, tratamientos antidiabéticos ni variables derivadas del desenlace.

Se evaluaron tres familias preespecificadas: regresión logística regularizada, regresión logística aditiva con splines cuadráticos y gradient boosting con restricciones crecientes para todos los predictores excepto sexo [13,14]. Como comparador clínico se reprodujo el puntaje mexicano de seis factores publicado en 2024 y su corte de 27 puntos [3]. Debido a que dicho puntaje se desarrolló con ENSANUT 2021-2023, su desempeño en la ola 2021 se describe como comparación concurrente y no como validación externa independiente.

### Desarrollo y bloqueo del modelo

Cada candidato se ajustó con ponderadores normalizados para igualar la contribución total de las olas de entrenamiento. La imputación y estandarización se aprendieron solo en desarrollo: mediana para variables continuas y moda con indicadores de ausencia para binarias en el modelo aditivo. No se imputó glucosa ausente. En 2018 se eligió, dentro de cada familia, la configuración con menor Brier; entre finalistas con ROC-AUC a no más de 0.01 del mejor se priorizó menor Brier y luego menor complejidad. El umbral maximizó especificidad con sensibilidad ponderada >=80% en 2018. Este objetivo operativo favoreció detección sobre especificidad; no deriva de una norma ni de preferencias clínicas formalmente evaluadas.

Antes de consultar el desempeño final de 2021 se congelaron variables, transformaciones, artefactos, umbrales, semillas y código mediante una huella SHA-256. Previamente se había inspeccionado la factibilidad de 2021; el bloqueo no constituye un prerregistro externo ni implica desconocimiento absoluto de esa ola. Los modelos nuevos no se seleccionaron ni ajustaron con ella. Se seleccionó el aditivo con tres nudos, C=1 y umbral 0.238346; no se reentrenó con 2018 ni se recalibró con 2021 [6-8,15]. Se usaron Python 3.12.14, scikit-learn 1.5.2 y semilla base 20260911.

### Análisis estadístico

Se estimaron ROC-AUC, precisión promedio (AP), Brier, intercepto y pendiente de calibración ajustados conjuntamente, error absoluto de calibración en diez intervalos de probabilidad de igual amplitud, sensibilidad, especificidad, valores predictivos, fracción remitida, casos detectados por 1,000 evaluados y pruebas por caso. Todas las estimaciones utilizaron el ponderador bioquímico. Se calcularon IC95% percentiles con 1,000 remuestreos con reemplazo de unidades primarias dentro de estratos, conservando sus observaciones y ponderadores. Esta implementación en Python aproxima la incertidumbre del diseño [16,17], sin corrección por población finita ni reestimación del modelo; no incorpora incertidumbre del entrenamiento. Las diferencias de ROC-AUC se calcularon de manera emparejada con los mismos índices de remuestreo.

La utilidad se examinó mediante curva de decisión frente a enviar a todos o a nadie [18]. Se reportó desempeño por sexo, edad y ámbito, con intervalos y sin interpretar ausencia de significancia como equidad. El tamaño fue fijo; no hubo cálculo prospectivo de potencia. La menor precisión de subgrupos limita sus comparaciones [19]. Se efectuó un análisis de casos completos. No se ajustaron los contrastes secundarios por multiplicidad.

### Evaluación exploratoria de capacidad y omisiones

Un addendum posterior al resultado primario fijó capacidades de 200, 400 y 600 pruebas iniciales por 1,000 adultos. En la muestra común se ordenaron los participantes por el modelo fijo o el puntaje publicado, sin consultar el desenlace. La fracción remitida se completó asignando igual probabilidad de selección dentro del nivel empatado en el límite. Se estimó así el rendimiento esperado de un desempate aleatorio y se comparó con selección uniforme. Esta política relativa a una cohorte no equivale al umbral individual aprendido en 2018.

Se obtuvieron diferencias emparejadas de detección mediante 1,000 remuestreos (semilla 20260912), aplicando primero el remuestreo a la cohorte elegible y después la restricción a la muestra común; la capacidad se recalculó en cada réplica. También se descompusieron las omisiones del umbral original en glucosa de 100 a menos de 126 mg/dL y >=126 mg/dL. Se asumió una determinación inicial por persona remitida y asistencia completa. No se incluyeron pruebas confirmatorias repetidas, costos ni efectos terapéuticos.

### Traducción digital y control de fidelidad

Se verificó la concordancia de seis vectores entre Python y un prototipo móvil TypeScript con datos simulados. El resultado no se persiste y advierte que no constituye un diagnóstico.

### Sensibilidad del diseño de encuesta

Un segundo complemento posterior conservó los 2,034 registros bioquímicos con ponderador positivo, 85 estratos y 397 UPM; la elegibilidad se trató como dominio, sin eliminar conglomerados externos. Se aplicó linealización para razones y AUC ponderada, con IC95% t y grados de libertad del dominio [16]. Para los 13 estratos de una UPM se contrastaron contribución cero, centrado global y promedio de varianzas entre estratos replicados. Se comprobó AUC mediante jackknife estratificado, manteniendo fijos los estratos únicos [17]. La curva de decisión incorporó IC puntuales y contrastes emparejados; no bandas simultáneas. Las proporciones de omisión se presentaron con transformación logit para evitar límites imposibles. El suplemento detalla fórmulas y supuestos; no se modificó el análisis primario.

### Consideraciones éticas

Este análisis utilizó microdatos públicos desidentificados de ENSANUT [9-12], sin contacto con participantes ni intervención. Los datos clínicos utilizados en el prototipo fueron simulados. La información documental del dictamen institucional se consigna en las declaraciones.

## Resultados

### Cohortes y selección

Se incluyeron 8,710 adultos en 2012, 3,308 en 2016, 11,093 en 2018 y 1,724 en 2021 (tabla 1). Los predictores núcleo estuvieron completos en 7,522, 2,835, 9,784 y 1,523 participantes. La prevalencia ponderada fue 28.6%, 25.1%, 22.0% y 21.9%, respectivamente: describe las cohortes elegibles, no la tendencia nacional de diabetes total. En 2021 hubo 397 eventos; faltó cintura en 7.0%, antecedente parental en 4.8% e IMC en 3.2% de participantes. Las tablas S1-S3 del suplemento presentan exclusiones secuenciales y faltantes por variable y ola.

[TABLE1]

En 2018, el modelo aditivo núcleo alcanzó ROC-AUC de 0.694 y Brier de 0.164. La regla preespecificada lo seleccionó antes de ejecutar la evaluación final de 2021; no se cambió la familia después de conocer sus resultados.

### Desempeño temporal bloqueado

En ENSANUT 2021, el modelo aditivo obtuvo ROC-AUC de 0.694 (IC95% 0.657-0.729), AP de 0.395 (0.341-0.458) y Brier de 0.162 (0.152-0.171). La pendiente de calibración fue 0.987 (0.785-1.198), compatible con conservación de la dispersión relativa; el intercepto fue -0.440 (-0.652 a -0.239), consistente con la sobreestimación observada en la curva de calibración. El error de calibración en diez intervalos fue 0.074.

En el umbral bloqueado, la sensibilidad fue 78.2% (73.1-83.3), la especificidad 44.1% (40.9-47.7), el valor predictivo positivo 28.1% (24.8-31.5) y el negativo 87.9% (85.1-90.9). La estrategia remitiría a 60.8% de los adultos, detectaría aproximadamente 171 casos por 1,000 evaluados y requeriría 3.55 pruebas por caso detectado (tabla 2). El análisis de casos completos produjo ROC-AUC de 0.691, sin cambio material.

[TABLE2]

La regresión logística lineal y el boosting obtuvieron ROC-AUC de 0.696 y 0.698; sus diferencias con el seleccionado incluyeron cero. El conjunto ampliado obtuvo 0.692, con diferencia de -0.002 (IC95% -0.012 a 0.008). No se reabrió la selección.

La linealización con tratamiento promedio de estratos únicos amplió el IC95% del ROC-AUC a 0.649-0.738, frente a 0.657-0.729 del bootstrap original. El centrado produjo 0.651-0.736 y el jackknife con estratos únicos fijos, 0.653-0.735. Las estimaciones puntuales no cambiaron; sí aumentó la incertidumbre.

### Comparación clínica y utilidad

En 1,413 participantes con información común, el puntaje mexicano de 2024 obtuvo ROC-AUC de 0.673 para glucosa en ayuno, frente a 0.699 del modelo bloqueado; la diferencia fue 0.027 (IC95% 0.008-0.046). La linealización con tratamiento promedio amplió este intervalo a 0.001-0.052. Para el desenlace compuesto que motivó el puntaje publicado, el modelo y el puntaje obtuvieron ROC-AUC de 0.725 y 0.731, respectivamente, con diferencia -0.006 (-0.025 a 0.013). En 2018, las diferencias a favor del modelo fueron 0.036 para glucosa y 0.032 para el compuesto; esa ola intervino en su selección y no aporta una prueba independiente. Estos hallazgos muestran dependencia del desenlace y no invalidan el puntaje publicado.

Las estimaciones puntuales del beneficio neto favorecieron al modelo entre umbrales de 0.10 y 0.30, pero el complemento mostró incertidumbre relevante. En el umbral bloqueado, el beneficio neto fue 0.0343 (IC95% -0.0002 a 0.0688), incluyendo cero con tratamiento promedio de estratos únicos; la diferencia frente a remitir a todos fue 0.0603 (0.0401-0.0806). La evidencia no sostiene superioridad frente a ambas alternativas en todo el intervalo (figura 1). Para glucosa en rango diabético, disglucemia compuesta y rango diabético compuesto, los ROC-AUC fueron 0.725, 0.729 y 0.715; las probabilidades no estaban calibradas para esos desenlaces.

[FIGURE1]

### Rendimiento con capacidad de laboratorio limitada

En el análisis exploratorio, con 200 pruebas por 1,000 adultos de la muestra común, el modelo identificaría 87.2 alteraciones y el puntaje 78.1; la diferencia fue 9.1 (IC95% -0.3 a 20.4). Con 400 pruebas, identificarían 136.8 y 131.5, respectivamente, con diferencia 5.3 (-4.5 a 15.6). Con 600 pruebas, los valores fueron 177.1 y 175.6, con diferencia 1.5 (-10.2 a 10.6). La selección aleatoria identificaría, en promedio, 44.3, 88.6 y 132.9. Los tres contrastes modelo-puntaje incluyeron cero; no se demostró superioridad operativa ni equivalencia (tabla 3 y figura 2). La prevalencia ponderada en esta muestra fue 22.2%, distinta del 21.9% de la cohorte completa.

[TABLE3]

[FIGURE2]

En la cohorte completa, el umbral original omitiría 47.6 alteraciones por 1,000 adultos: 40.8 con glucosa de 100 a menos de 126 mg/dL y 6.8 con glucosa >=126 mg/dL. Para este último grupo, la sensibilidad fue 85.9% (IC95% 75.8-94.7). Estos resultados no permiten considerar un tamizaje negativo como descarte de diabetes.

### Distribución poblacional del desempeño

El ROC-AUC fue 0.704 en mujeres y 0.680 en hombres; la diferencia tuvo IC95% -0.044 a 0.087. Fue 0.708 en área urbana/metropolitana y 0.628 en área rural, con diferencia -0.080 (-0.174 a 0.003). La sensibilidad pasó de 43.2% en 20-34 años a 95.1% en >=55; la especificidad, de 77.2% a 7.7%. El grupo de 20-34 concentró 59.6% de las omisiones ponderadas totales, sin demostrar causalidad ni discriminación.

Las omisiones fueron 73.0, 41.6 y 14.3 por cada 1,000 personas dentro de los grupos de 20-34, 35-54 y >=55 años. Expresadas sobre 1,000 adultos de la cohorte completa, sus contribuciones fueron 28.4, 15.9 y 3.3: suman 47.6. Estos denominadores no son intercambiables. La figura 3 presenta IC del complemento de diseño; los intervalos del análisis previo se conservan en el suplemento.

[FIGURE3]

### Implementación translacional

Los seis vectores coincidieron a once decimales. La API rechazó entradas inválidas y dos recorridos en Expo Web completaron formulario y resultado. Esta verificación técnica no demuestra usabilidad con profesionales ni eficacia clínica.

## Discusión

### Hallazgos principales

El modelo de seis variables conservó discriminación moderada, pero sobreestimó el riesgo absoluto y requirió remitir a seis de cada diez adultos para identificar alrededor de ocho de cada diez alteraciones. La mejora de ROC-AUC frente al puntaje mexicano no se tradujo en superioridad de detección demostrable a igual capacidad de laboratorio. La comparación de algoritmos, por sí sola, no establece una razón suficiente para sustituir una herramienta simple [15].

La pendiente próxima a uno no corrige el desplazamiento del riesgo absoluto. La sobrepredicción impide comunicar las probabilidades crudas como estimaciones individuales bien calibradas [20]. El prototipo presenta un índice de priorización y exige confirmación bioquímica. Una recalibración futura deberá ajustarse en datos destinados a actualización y evaluarse en otros datos; aplicarla a 2021 y medirla en la misma muestra no produciría una nueva validación independiente.

La capacidad de laboratorio modifica el balance entre detección y omisión. En la muestra común, limitar la remisión al 20% permitiría identificar aproximadamente 39% de las alteraciones con el modelo; al 60%, alrededor de 80%. La menor cantidad de pruebas por alteración identificada bajo restricciones severas no representa necesariamente una mejor política: se obtiene dejando más alteraciones sin identificar. Las comparaciones deben considerar ambas consecuencias y no optimizar exclusivamente el rendimiento por prueba [18].

El puntaje publicado se desarrolló con ENSANUT 2021-2023 para un desenlace compuesto [3]; la comparación de 2021 no es externa para él. Los IC a capacidad fija incluyen beneficios y perjuicios y no prueban equivalencia. La adopción requiere evaluación independiente, aceptabilidad y recursos para medir los predictores.

El conjunto ampliado se entrenó solo con 2016; la ausencia de ganancia no aísla el efecto de añadir presión arterial. El núcleo evita esa medición adicional, pero tampoco se evaluó su costo de captura.

### Equidad y aplicabilidad

Un umbral común produjo patrones de omisión distintos por edad: la menor prevalencia juvenil no elimina su contribución a las alteraciones no detectadas. Igualar sensibilidad podría aumentar la demanda; no se justifican umbrales nuevos desde este análisis exploratorio. La menor AUC rural requiere mayor precisión, sin interpretar un intervalo que incluye cero como equidad [7,19].

La codificación binaria de sexo procede de las encuestas y no representa identidad de género. Asimismo, las personas sintomáticas y las que tienen una indicación clínica de laboratorio no deberían quedar excluidas por un resultado bajo de este prototipo. Su posible función sería complementar la priorización, no impedir el acceso a pruebas.

### Fortalezas y limitaciones

Las fortalezas incluyen cuatro olas, desenlace bioquímico, separación temporal y evaluación operativa. La factibilidad de 2021 había sido inspeccionada; no hubo prerregistro externo. Los complementos posteriores no cambiaron el modelo ni los resultados primarios. La mayor incertidumbre de encuesta y el beneficio neto dependiente del tratamiento de estratos únicos aconsejan prudencia, incluso cuando la estimación puntual es favorable.

Las ENSANUT son transversales; una glucosa no confirma diagnóstico [2]. No se verificó ayuno individual en 2012 ni se descartó embarazo con información ausente. La imputación y los casos completos no descartan sesgo por no respuesta. En el bootstrap original, 13 estratos únicos (4.7% del peso elegible) permanecieron fijos. El complemento recuperó siete UPM externas al dominio, pero no resolvió los estratos únicos: sus ajustes son supuestos, no reconstrucciones del diseño. No se incorporaron todas las etapas, recalibración de ponderadores ni incertidumbre del entrenamiento. Las simulaciones asumen asistencia completa, sin costos ni efectos terapéuticos. El mismo equipo desarrolló y evaluó el modelo; falta validación independiente y prospectiva [8,19,21].

## Conclusiones

El modelo mostró discriminación temporal moderada y sobrepredicción en adultos mexicanos sin diagnóstico previo. Su umbral identificaría 171 alteraciones por cada 608 pruebas iniciales entre 1,000 adultos, pero omitiría 48. Una mejor AUC frente al puntaje mexicano no demostró mayor detección a igual capacidad de laboratorio. La concentración de omisiones en adultos jóvenes y la incertidumbre rural justifican evaluación dirigida. Estos hallazgos apoyan valorar carga de pruebas, calibración y omisiones junto con discriminación antes de adoptar un instrumento digital de tamizaje.

## Declaraciones

**Financiamiento.** [Incorporar la declaración exacta confirmada por el equipo.]  
**Conflictos de interés.** [Incorporar la declaración confirmada por todos los autores.]  
**Aprobación ética.** [Incorporar comité, folio, fecha y clasificación conforme al documento institucional.]  
**Disponibilidad de datos y materiales.** Los microdatos de ENSANUT se encuentran en el portal oficial del Instituto Nacional de Salud Pública. Los manifiestos, diccionario armonizado, huellas de integridad, código analítico y artefactos derivados podrán ponerse a disposición de revisores, sujetos a las condiciones de uso de las fuentes; no se redistribuyen microdatos.

## Referencias

1. Basto-Abreu A, López-Olmedo N, Rojas-Martínez R, Aguilar-Salinas CA, Moreno-Banda GL, Carnalla M, et al. Prevalencia de prediabetes y diabetes en México: Ensanut 2022. Salud Publica Mex. 2023;65(Supl 1):S163-S168. doi:10.21149/14832.
2. American Diabetes Association Professional Practice Committee for Diabetes. 2. Diagnosis and Classification of Diabetes: Standards of Care in Diabetes 2026. Diabetes Care. 2026;49(Suppl 1):S27-S49. doi:10.2337/dc26-S002.
3. Rojas-Martínez R, Escamilla-Núñez C, Castro-Porras L, Gómez-Velasco D, Romero-Martínez M, Hernández-Serrato MI, et al. Detección oportuna de prediabetes y diabetes. Salud Publica Mex. 2024;66:520-529. doi:10.21149/15837.
4. Félix-Martínez GJ, Godínez-Fernández JR. Screening models for undiagnosed diabetes in Mexican adults using clinical and self-reported information. Endocrinol Diabetes Nutr. 2018;65(10):603-610. doi:10.1016/j.endinu.2018.04.004.
5. Félix-Martínez GJ, Godínez-Fernández JR. Comparative analysis of screening models for undiagnosed diabetes in Mexico. Endocrinol Diabetes Nutr. 2020;67(5):333-341. doi:10.1016/j.endinu.2019.08.006.
6. Collins GS, Moons KGM, Dhiman P, Riley RD, Beam AL, Van Calster B, et al. TRIPOD+AI statement: updated guidance for reporting clinical prediction models that use regression or machine learning methods. BMJ. 2024;385:e078378. doi:10.1136/bmj-2023-078378.
7. Moons KGM, Damen JAA, Kaul T, Hooft L, Andaur Navarro C, Dhiman P, et al. PROBAST+AI: an updated quality, risk of bias, and applicability assessment tool for prediction models using regression or artificial intelligence methods. BMJ. 2025;388:e082505. doi:10.1136/bmj-2024-082505.
8. Steyerberg EW, Harrell FE Jr. Prediction models need appropriate internal, internal-external, and external validation. J Clin Epidemiol. 2016;69:245-247. doi:10.1016/j.jclinepi.2015.04.005.
9. Romero-Martínez M, Shamah-Levy T, Franco-Núñez A, Villalpando S, Cuevas-Nasu L, Gutiérrez JP, et al. Encuesta Nacional de Salud y Nutrición 2012: diseño y cobertura. Salud Publica Mex. 2013;55(Supl 2):S332-S340. doi:10.21149/spm.v55s2.5132.
10. Romero-Martínez M, Shamah-Levy T, Cuevas-Nasu L, Méndez Gómez-Humarán I, Gaona-Pineda EB, Gómez-Acosta LM, et al. Diseño metodológico de la Encuesta Nacional de Salud y Nutrición de Medio Camino 2016. Salud Publica Mex. 2017;59(3):299-305. doi:10.21149/8593.
11. Romero-Martínez M, Shamah-Levy T, Vielma-Orozco E, Heredia-Hernández O, Mojica-Cuevas J, Cuevas-Nasu L, et al. Encuesta Nacional de Salud y Nutrición 2018-19: metodología y perspectivas. Salud Publica Mex. 2019;61(6):917-923. doi:10.21149/11095.
12. Romero-Martínez M, Barrientos-Gutiérrez T, Cuevas-Nasu L, Bautista-Arredondo S, Colchero MA, Gaona-Pineda EB, et al. Metodología de la Encuesta Nacional de Salud y Nutrición 2021. Salud Publica Mex. 2021;63(6):813-818. doi:10.21149/13348.
13. Harrell FE Jr. Regression Modeling Strategies. 2nd ed. Cham: Springer; 2015. doi:10.1007/978-3-319-19425-7.
14. Friedman JH. Greedy function approximation: a gradient boosting machine. Ann Stat. 2001;29(5):1189-1232. doi:10.1214/aos/1013203451.
15. Christodoulou E, Ma J, Collins GS, Steyerberg EW, Verbakel JY, Van Calster B. A systematic review shows no performance benefit of machine learning over logistic regression for clinical prediction models. J Clin Epidemiol. 2019;110:12-22. doi:10.1016/j.jclinepi.2019.02.004.
16. Lohr SL. Sampling: Design and Analysis. 3rd ed. Boca Raton: Chapman & Hall/CRC; 2022. ISBN:9780367279509.
17. Efron B, Tibshirani RJ. An Introduction to the Bootstrap. New York: Chapman and Hall/CRC; 1993. doi:10.1201/9780429246593.
18. Vickers AJ, Elkin EB. Decision curve analysis: a novel method for evaluating prediction models. Med Decis Making. 2006;26(6):565-574. doi:10.1177/0272989X06295361.
19. Riley RD, Debray TPA, Collins GS, Archer L, Ensor J, van Smeden M, et al. Minimum sample size for external validation of a clinical prediction model with a binary outcome. Stat Med. 2021;40(19):4230-4251. doi:10.1002/sim.9025.
20. Van Calster B, McLernon DJ, van Smeden M, Wynants L, Steyerberg EW. Calibration: the Achilles heel of predictive analytics. BMC Med. 2019;17:230. doi:10.1186/s12916-019-1466-7.
21. Riley RD, Ensor J, Snell KIE, Debray TPA, Altman DG, Moons KGM, et al. External validation of clinical prediction models using big datasets from e-health records or IPD meta-analysis: opportunities and challenges. BMJ. 2016;353:i3140. doi:10.1136/bmj.i3140.
