# Dossier de sometimiento Rosenkranz 2026

## Decisión de categoría

La categoría recomendada es **Investigación en Epidemiología y Salud Pública**. El aporte principal es epidemiológico: desarrollo y transporte temporal de un instrumento de tamizaje con cuatro olas de una encuesta nacional, desenlace bioquímico, ponderadores complejos y análisis de utilidad. La aplicación móvil funciona como traducción del resultado y no como sustituto de la investigación poblacional.

## Título de trabajo

**Priorización de pruebas para disglucemia no diagnosticada mediante variables no invasivas en adultos mexicanos**

Subtítulo: **Validación temporal y carga de laboratorio con ENSANUT**.

El título debe reproducirse literalmente en el manuscrito, la plataforma, la carta de autoría y la carta del comité.

## Diferencia frente al artículo CIERMMI

La propuesta tiene una pregunta y datos distintos del manuscrito dirigido a CIERMMI; la valoración definitiva del solapamiento corresponde a autores y evaluadores:

- El estudio CIERMMI evalúa nueve algoritmos con BRFSS 2015 y un desenlace autorreportado en población estadounidense.
- El estudio Rosenkranz usa ENSANUT 2012, 2016, 2018 y 2021 en adultos mexicanos.
- El desenlace Rosenkranz es bioquímico y restringido a personas sin diagnóstico previo.
- La pregunta principal es transporte temporal, calibración, utilidad de decisión y carga de remisión, no una competencia general de algoritmos.
- El modelo fue congelado antes de la evaluación 2021 mediante hashes de código y artefactos.
- La integración móvil conserva la inferencia bloqueada y comunica un índice de priorización no diagnóstico.

Conviene conservar una declaración interna de trabajos relacionados y entregar ambos manuscritos al investigador titular para una revisión de solapamiento antes de someter.

## Mensaje científico central

El resultado defendible es que una mejor AUC no garantiza mayor detección a igual capacidad de laboratorio. El modelo conservó discriminación moderada y sensibilidad de 78.2%, a costa de remitir a 60.8% de la cohorte elegible. Por cada 1,000 adultos, indicaría 608 pruebas iniciales, identificaría 171 alteraciones y omitiría 48; aproximadamente siete omisiones tendrían glucosa en rango diabético, sin constituir diagnósticos confirmados. En la muestra común, los contrastes con el puntaje mexicano bajo tres capacidades incluyeron cero. Esto no demuestra superioridad ni equivalencia. La sobrepredicción, las omisiones en jóvenes y la incertidumbre rural delimitan una futura evaluación prospectiva.

## Datos listos para la plataforma

- Categoría: Investigación en Epidemiología y Salud Pública.
- Resumen en español: 235 palabras; conteo automático en `manuscript-fortalecido-qa.json`.
- Texto principal: menos de 3,500 palabras, excluyendo referencias.
- Referencias: 21.
- Formato del manuscrito: tamaño carta, Arial 11, interlineado 1.5.
- Documento: PDF ciego, sin nombres ni afiliaciones de autores.
- Fecha límite oficial: 18 de septiembre de 2026 a las 23:00 horas.

## Situación administrativa comunicada por el equipo

El 12 de septiembre de 2026 el equipo indicó que la afiliación y los aspectos relacionados ya están resueltos. Se toma esa confirmación como contexto y no se mantiene la afiliación como un bloqueo del trabajo científico. Los datos documentales exactos no se han facilitado en esta conversación; por ello no se inventan nombres de comité, folios, fechas, financiamiento o conflictos.

Antes del envío basta incorporar en las tres declaraciones la información confirmada por el equipo y comprobar su concordancia con los anexos. Esta es una tarea editorial distinta de verificar o resolver de nuevo la afiliación. El archivo actual se entrega para revisión científica, no se ha sometido.

## Textos administrativos para completar

**Financiamiento, si no hubo apoyo específico:** “El estudio no recibió financiamiento específico de agencias públicas, comerciales ni del sector sin fines de lucro. Se utilizaron recursos computacionales propios y/o institucionales.” Use esta redacción únicamente si el investigador titular confirma que es verdadera.

**Conflictos de interés, si ninguno existe:** “Los autores declaran no tener conflictos de interés.” Debe confirmarlo cada autor.

**Ética:** solicitar al comité la redacción y clasificación exactas. El manuscrito ya consigna que se analizaron microdatos públicos desidentificados y que no hubo contacto con participantes; eso no sustituye el documento exigido por el concurso.

## Evidencia técnica disponible

- Huella del estudio: `cc911791bad871aca43e0ac677c4f44ccfa05343af94c07cf8faf5438c592b8f`.
- Evaluación final: ENSANUT 2021, `n=1,724`, 397 eventos.
- Bootstrap: 1,000 remuestreos de unidades primarias dentro de estratos.
- Pruebas científicas: 24 pruebas aprobadas, incluidas siete del complemento de capacidad y nueve del contraste de varianza.
- Comparación a capacidad fija: 200, 400 y 600 pruebas por 1,000; análisis exploratorio posterior, con muestra común de 1,413 personas y 338 eventos.
- Se conservaron intactos el resultado primario y la huella del modelo; no hubo reajuste con 2021.
- Paridad de inferencia: seis vectores Python y TypeScript coincidentes a once decimales.
- QA móvil: claro y oscuro, 390 x 844, sin desborde, solicitudes fallidas ni excepciones.
- El endpoint de investigación no persiste el resultado en el expediente.

## Plan de cierre antes del 18 de septiembre

1. Revisar clínicamente el desenlace, las omisiones y el lenguaje de no diagnóstico.
2. Revisar estadísticamente el remuestreo aproximado, los estratos con una sola UPM y la comparación concurrente con el puntaje de 2024.
3. Incorporar las tres declaraciones confirmadas y mantener concordancia del título con los documentos del equipo.
4. Revisar la versión final ciega y someter con margen para corregir problemas de plataforma.

## Uso crítico de la investigación proporcionada

Se incorporaron la comparación a igual capacidad de laboratorio y la caracterización de omisiones. El complemento se documentó antes de ejecutarlo, pero después de conocer el análisis primario; no se presenta como hipótesis originalmente preespecificada.

No se trasladaron las siguientes imprecisiones del texto proporcionado:

- Agrupar errores por estrato no equivale a remuestrear unidades primarias dentro de estratos; ponderar una regresión tampoco reproduce por sí solo todo el diseño complejo.
- Brier y error de calibración no son la misma métrica.
- El límite de alteración de glucosa en ayuno de la ADA es 100 mg/dL; el de la OMS es 110 mg/dL. No son criterios intercambiables.
- Las cifras de 608 pruebas y 171 alteraciones corresponden al umbral bloqueado de 0.238346, no a 0.50.
- No se aplicaron nuevas exclusiones arbitrarias de glucosa después de conocer los resultados.
- Recalibrar y evaluar sobre 2021 no produciría una nueva validación independiente.
- No se incorporaron programas, cifras económicas ni resultados sin una fuente primaria verificable.

El hallazgo de ausencia de superioridad demostrada a igual capacidad se conservó. No se buscaron otros cortes para obtener una conclusión más favorable. Los resultados completos están en `results/postlock_policy_analysis.json` y `results/policy_metrics_2021.csv` dentro del estudio ENSANUT.

## Estado

### Fortalecimiento metodológico del 12 de septiembre

La nueva versión es `manuscrito-ensanut-fortalecido.docx`, acompañada por `suplemento-metodologico-ensanut.docx`. Se conservó la versión anterior. El manuscrito tiene tres tablas, tres figuras y 21 referencias; el suplemento añade siete tablas. El conteo del texto previo a referencias es 3,337 palabras, incluidos título, resumen y declaraciones, pero no las tablas y leyendas anexas.

Se incorporaron exclusiones secuenciales y faltantes por variable, aclaración del objetivo operativo de sensibilidad del 80%, omisiones por edad con dos denominadores, y un contraste explícitamente posterior del diseño. Los 1,724 elegibles se analizaron como dominio dentro de 2,034 registros con ponderador positivo, 85 estratos y 397 UPM. Persisten 13 estratos de una UPM: se reportaron contribución cero, centrado global y promedio, además de jackknife con esos estratos fijos.

Con el tratamiento promedio, el IC95% de AUC es 0.649-0.738 y el de su diferencia frente al puntaje es 0.001-0.052. En el umbral bloqueado, el beneficio neto frente a nadie tiene IC95% -0.0002 a 0.0688; frente a todos, la diferencia tiene IC95% 0.0401-0.0806. La conclusión se matizó: las estimaciones favorables no sostienen superioridad en todo el intervalo de umbrales. Los intervalos son puntuales, no simultáneos, y dependen de supuestos sobre el diseño incompleto.

El suplemento declara que la transformación logit-t para representar las tasas de omisión se eligió después de inspeccionar límites Wald fuera de rango. Se conservaron todos los intervalos originales y las estimaciones y varianzas no cambiaron. No se reabrió la selección, recalibró el modelo ni buscó un umbral más favorable en 2021.

### Cierre pendiente

La parte científica y técnica cuenta con una versión ampliada para revisión. No es una herramienta validada para uso asistencial. La revisión independiente debe priorizar calibración, remuestreo aproximado y omisiones por subgrupo. La afiliación se considera resuelta conforme a la confirmación del equipo; faltan únicamente los textos exactos que deben insertarse en las declaraciones del archivo.

## Fuentes y verificación

Convocatoria PDF proporcionada por el equipo y [convocatoria oficial vigente](https://www.premiorosenkranzmexico.com/investigacion), consultada el 11 de septiembre de 2026. Contacto publicado: `mexico.premio_rosenkranz@roche.com`. No se ha registrado ni enviado el trabajo a la plataforma.
