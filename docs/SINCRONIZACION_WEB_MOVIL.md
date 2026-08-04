# Sincronizacion Web-Movil

## Fuente de verdad

Web y movil consumen la misma API Next.js y la misma base MySQL.

## Flujos sincronizados

- Agenda movil crea/edita/reagenda/cancela citas; web consulta `/api/agenda`.
- Medico movil guarda signos vitales; expediente web consulta `medicion_antropometrica`.
- Paciente movil registra automonitoreo; dashboard web/paciente consulta `automonitoreo`.
- Movil emite receta; web historial consulta `receta`.
- Dictado movil crea consulta; web historial consulta `consulta_medica`.

## Actualizacion

- React Query invalida cache despues de mutaciones.
- Pull-to-refresh disponible en pantallas principales.
- Conflictos de agenda se resuelven en backend.

## Prueba E2E propuesta

1. Login movil.
2. Crear cita desde Agenda movil.
3. Consultar `/api/agenda` con token del mismo usuario.
4. Verificar `id_cita`, fecha, paciente y motivo.
5. Abrir web Agenda y confirmar dato visible.

