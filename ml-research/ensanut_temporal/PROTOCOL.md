# Protocolo congelado: validación temporal ENSANUT-PREDIA

Versión: 0.1.0  
Fecha de congelamiento inicial: 2026-09-11  
Estado: análisis secundario de microdatos públicos; no es una evaluación clínica prospectiva.

## Pregunta primaria

¿Un modelo no invasivo y explicable, desarrollado con olas históricas de ENSANUT, conserva discriminación, calibración y utilidad de decisión al evaluarse sin reajuste en ENSANUT Continua 2021?

## Diseño

- Estudio transversal repetido con validación temporal por ola.
- Desarrollo: ENSANUT 2012 y ENSANUT MC 2016.
- Selección de hiperparámetros y umbral: ENSANUT 2018-19.
- Evaluación final bloqueada: ENSANUT Continua 2021.
- Unidad de análisis: adulto de 20 años o más.
- Los datos de 2021 no se utilizarán para seleccionar variables, hiperparámetros, calibradores ni umbrales.

## Población

### Inclusión

- Edad de 20 años o más.
- Cuestionario de adulto, antropometría y biomarcador enlazables.
- Glucosa venosa en ayuno disponible.
- Ponderador del subsistema bioquímico válido y positivo.

### Exclusión

- Diagnóstico médico previo de diabetes; la diabetes gestacional aislada no se considera diagnóstico prevalente.
- Embarazo actual declarado.
- Menos de ocho horas desde el último alimento cuando la ola contiene esa variable.
- Valores fisiológicamente imposibles definidos antes del modelado.

## Desenlaces

### Primario

Disglucemia no diagnosticada basada en glucosa plasmática en ayuno: glucosa >=100 mg/dL.

### Secundarios

- Diabetes no diagnosticada basada en glucosa: glucosa >=126 mg/dL.
- Disglucemia compuesta: glucosa >=100 mg/dL o HbA1c >=5.7%, solo en olas con HbA1c poblacional comparable.
- Diabetes compuesta: glucosa >=126 mg/dL o HbA1c >=6.5%, solo en olas con HbA1c poblacional comparable.

El desenlace primario usa glucosa para mantener la misma definición en las cuatro olas. La base de HbA1c de 2012 corresponde a una submuestra no comparable y no se mezcla con el desenlace primario.

## Predictores preespecificados

### Núcleo, disponible en 2012-2021

- Edad continua.
- Sexo registrado por ENSANUT.
- Antecedente de diabetes en padre o madre.
- Diagnóstico médico previo de hipertensión.
- Índice de masa corporal.
- Circunferencia de cintura.

### Clínico ampliado, disponible en 2016-2021

- Todos los predictores núcleo.
- Presión arterial sistólica media.
- Presión arterial diastólica media.

No se utilizarán glucosa, HbA1c, tratamientos antidiabéticos ni variables derivadas del diagnóstico como predictores.

## Comparadores

- Puntaje mexicano publicado de seis factores, aplicado con su corte de 27 puntos.
- Regresión logística regularizada y ponderada.
- Modelo aditivo explicable con splines y regresión logística.
- Gradient boosting con restricciones monotónicas para edad, IMC, cintura y presión arterial.

## Estrategia temporal

1. Entrenar en 2012+2016.
2. Seleccionar configuración y umbral en 2018.
3. Congelar el modelo sin reajustarlo con 2018.
4. Ejecutar una sola evaluación final en 2021.

Para el conjunto ampliado se omite 2012: entrenamiento 2016, selección 2018 y prueba final 2021. Mantener 2018 fuera del ajuste evita escoger un umbral con predicciones internas y después cambiar inadvertidamente la escala de probabilidades al reentrenar.

## Métricas

- ROC-AUC y PR-AUC ponderadas.
- Brier score.
- Intercepto y pendiente de calibración.
- Sensibilidad, especificidad, VPP y VPN.
- Fracción remitida a laboratorio, casos detectados por 1,000 evaluados y pruebas por caso detectado.
- Beneficio neto mediante curvas de decisión.
- Intervalos de confianza por bootstrap de conglomerados dentro de estratos.

## Equidad y transporte

Se reportará desempeño por sexo, grupos de edad y ámbito rural/urbano cuando cada subgrupo tenga al menos 100 observaciones y 20 eventos. Las diferencias se presentarán con incertidumbre; no se concluirá ausencia de sesgo solamente por falta de significancia.

## Manejo de datos faltantes

- El diagrama de inclusión se construirá antes de imputar.
- Los modelos usarán imputación aprendida exclusivamente en datos de entrenamiento.
- Las variables binarias desconocidas conservarán una categoría explícita de ausencia de información.
- Se realizará sensibilidad de casos completos.

## Reglas contra fuga de información

- El año 2021 permanece bloqueado hasta congelar código, variables y umbrales.
- La normalización, imputación y calibración se aprenden dentro del conjunto de entrenamiento.
- Ningún resultado de 2021 se usará para elegir el modelo ganador.
- El repositorio guardará hashes, versiones, semillas y manifiestos, pero no redistribuirá microdatos.

## Interpretación autorizada

Los resultados demostrarán validez técnica y transporte temporal de un instrumento de tamizaje. No demostrarán diagnóstico individual, eficacia clínica, reducción de complicaciones ni impacto prospectivo en pacientes.
