# Addendum de utilidad operativa posterior al bloqueo

Fecha: 2026-09-12. Este análisis se propone después de conocer los resultados de 2021. Es exploratorio y no sustituye la evaluación primaria ni selecciona un nuevo modelo o umbral.

## Preguntas

1. A igual capacidad de laboratorio, ¿cuántas alteraciones identificarían el modelo fijo, el puntaje mexicano publicado y una selección aleatoria?
2. ¿Cómo se distribuyen las omisiones del umbral bloqueado por sexo, edad y ámbito?
3. ¿Qué parte de las omisiones corresponde a glucosa de 100 a menos de 126 mg/dL y qué parte a glucosa de 126 mg/dL o más?

## Decisiones fijadas para este complemento

- Mantener la familia aditiva, los coeficientes y el umbral 0.23834601402384176. No recalibrar ni reentrenar.
- Usar el desenlace primario original, sin cambiar criterios de exclusión.
- Comparar capacidades ponderadas del 20%, 40% y 60% en la misma muestra con puntaje publicado disponible. No seleccionar después la capacidad más favorable.
- Ordenar únicamente por el predictor. En empates en el límite, asignar igual probabilidad fraccional de remisión a todos los empatados hasta completar exactamente la capacidad; equivale al rendimiento esperado de un desempate aleatorio independiente del desenlace. No son personas fraccionarias ni una política implementada en pacientes.
- La capacidad se impone sobre la distribución de puntajes de 2021 sin consultar el desenlace; es una política de ordenamiento de cohortes, no un umbral individual aprendido en 2018 ni una evaluación prospectiva.
- El escenario aleatorio tiene probabilidad uniforme de remisión igual a la capacidad. Es un valor esperado teórico, no una intervención realizada.
- Informar la diferencia emparejada de casos detectados por 1,000 entre modelo y puntaje en las tres capacidades, incluso si incluye cero o favorece al comparador.
- Reutilizar el remuestreo aproximado de UPM dentro de estratos, 1,000 repeticiones, semilla 20260912. Remuestrear la cohorte elegible completa antes de aplicar el dominio común del comparador y antes de estratificar por subgrupos. Recalcular el límite de capacidad en cada réplica.
- Los intervalos son percentiles, condicionales al modelo. No incluyen incertidumbre de entrenamiento, selección ni variación de los desempates de una implementación individual.
- Hay estratos con una sola UPM en la cohorte elegible. Su contribución permanece fija en este remuestreo; no se interpretan como unidades de certeza del diseño original. Se reportan número y peso, y se conserva la limitación de posible subestimación de incertidumbre. No se fusionan estratos arbitrariamente.
- No denominar al número de pruebas un costo monetario, ahorro demostrado o análisis de costo-efectividad. Se asume una determinación bioquímica inicial por persona remitida, asistencia completa y clasificación por la medición de encuesta; no se cuentan repeticiones confirmatorias.

## Integridad

El script comprobará los hashes del bloqueo y de los datos antes de leer predicciones. Las nuevas salidas tendrán nombres propios; `evaluation_2021.json` permanecerá sin cambios. Los resultados de esta extensión deben identificarse como exploratorios en métodos, resultados, figuras y tablas del artículo.
