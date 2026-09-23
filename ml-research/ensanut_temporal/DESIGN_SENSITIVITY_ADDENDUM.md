# Complemento de inferencia de encuesta y reporte

Fecha: 2026-09-12. Escrito despues de conocer los resultados primarios y de capacidad,
antes de ejecutar este complemento. Estado: exploratorio posterior al bloqueo.

## Alcance

No se modifican el protocolo original, los modelos, imputadores, probabilidades,
umbral 0.238346 ni archivos de resultados anteriores. No se seleccionan nuevos
umbrales. El objetivo operativo de sensibilidad de 80% en 2018 no se presenta como
una norma clinica ni como una decision validada por pacientes o autoridades.

## Diseno disponible

Se conserva el archivo bioquimico 2021 con `ponde_g > 0`, antes de restricciones de
elegibilidad. La inspeccion estructural encontro 2,034 registros, 85 estratos,
397 UPM y 13 estratos con una sola UPM. El dominio elegible contiene los mismos
1,724 registros que el estudio bloqueado. Los siete conglomerados adicionales
sin participantes elegibles se conservan con contribucion linealizada cero.

Se comprueba enlace uno a uno y concordancia exacta de ponderador, estrato y UPM.
Esto recupera informacion del diseno publico disponible, no las etapas originales
completas, probabilidades conjuntas de inclusion ni ajustes de no respuesta.

## Estimadores y sensibilidad

1. Linealizacion de Taylor para razones de totales ponderados: prevalencia,
   sensibilidad, especificidad, valores predictivos, remision, Brier, detecciones,
   omisiones y beneficio neto. Para AUC se usa su contribucion linealizada de la
   comparacion ponderada de pares caso-control, asignando medio credito al empate.
   El contraste de AUC usa la diferencia de contribuciones individuales en la
   misma muestra comun. Se verifican derivadas por diferencias finitas.
2. Las contribuciones individuales incluyen el ponderador y se agregan por UPM.
   La varianza de cada estrato con m>1 UPM es m/(m-1) por la suma de cuadrados de
   desviaciones respecto a su media. No se aplica correccion de poblacion finita.
3. Se muestran tres tratamientos de los estratos con una sola UPM: contribucion
   cero (comparacion condicional, no afirma certeza), contribucion centrada en la
   media global de totales de UPM, y promedio de las contribuciones de varianza
   de los estratos con mas de una UPM. Ninguno reconstruye informacion ausente.
   El promedio sera la sensibilidad destacada; las otras dos se reportan siempre.
4. IC95% simetricos t con grados de libertad del dominio (UPM representadas menos
   estratos representados); para razones condicionadas se usa el dominio del
   denominador. No se recortan artificialmente limites a [0,1]. Intervalos fuera
   de rango senalan las limitaciones de la aproximacion de Wald.
5. Contraste numerico adicional mediante jackknife estratificado delete-one-PSU
   (JKn) para AUC y diferencia de AUC. Se elimina una UPM por replica, se multiplican
   los pesos de las restantes del mismo estrato por m/(m-1) y se mantiene el resto.
   Se usa sumatoria (m-1)/m*(estimacion_replica-estimacion_completa)^2. Los estratos
   de una UPM quedan fijos en esta comprobacion; no resuelve su incertidumbre.
6. Curva de decision: malla 0.05 a 0.50, pasos de 0.01, mas el umbral bloqueado.
   IC95% puntuales (no bandas simultaneas) para beneficio neto y diferencias
   emparejadas contra remitir a todos y a nadie. No son beneficios observados,
   calculos economicos ni resultados de una intervencion.

## Reporte descriptivo

Se exportan las cuentas secuenciales de inclusion y exclusion ya calculadas por
la armonizacion bloqueada, sin tratar los distintos archivos fuente como pasos
secuenciales. Los faltantes se tabulan antes de imputacion en cada cohorte elegible
para los seis predictores, presion arterial y HbA1c. No se imputa glucosa ausente.

Se muestran omisiones por 1,000 personas DENTRO de cada grupo de edad y su
contribucion por 1,000 de la cohorte TOTAL, con denominadores explicitos. No se
infieren mecanismos causales, discriminacion ni se recomiendan umbrales por edad.

## Referencias de los procedimientos

- Lohr SL. Sampling: Design and Analysis. 3rd ed. 2022. ISBN 9780367279509.
- Efron B, Tibshirani RJ. An Introduction to the Bootstrap. 1993.
- https://wwwn.cdc.gov/nchs/nhanes/tutorials/varianceestimation.aspx
  (principio general de analisis de dominios; no sustituye el diseno ENSANUT).
- https://r-survey.r-forge.r-project.org/survey/html/surveyoptions.html
- https://r-survey.r-forge.r-project.org/survey/html/as.svrepdesign.html
- Yao W, Li Z, Graubard BI. Estimation of ROC curve with complex survey data.
  Statistics in Medicine. 2015. doi:10.1002/sim.6405.

La implementacion de este complemento es propia en Python; no se afirma haber
utilizado el paquete survey de R. Se conservan hashes y pruebas sinteticas.
