# Validacion de datos

## Cliente movil

- Login valida campos requeridos.
- Agenda valida paciente, fecha futura, motivo y conflictos locales de paciente.
- Signos vitales valida numeros positivos.
- Automonitoreo valida formato de presion y numeros.
- Firma valida al menos un medicamento.

## Servidor

- Zod en login, pacientes, mediciones, automonitoreo, consultas y recetas.
- Rangos clinicos en signos vitales y automonitoreo.
- Recetas con medicamentos estructurados, minimo 1 y maximo 20.
- Imagenes limitadas por MIME y 5 MB.
- Agenda valida estado, futuro y conflictos de paciente/medico.
- Prisma/mysql2 usan consultas parametrizadas.

## Pruebas sugeridas

```bash
bash scripts/rubric-check.sh
```

Casos a demostrar: payload vacio, rangos fuera de limite, token ausente, token manipulado y duplicado/conflicto de cita.

