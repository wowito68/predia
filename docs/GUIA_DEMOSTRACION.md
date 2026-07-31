# Guia de demostracion PREDIA

## Credenciales demo

- Medico: `dr_juan / password123`.
- Enfermeria: `enf_pedro / password123`.
- Paciente: `ROGJ850515HMCRRN08 / 123456`.

## Levantar demo local

```bash
pnpm install
bash scripts/start-demo.sh
```

URLs:

- Web/API: `http://127.0.0.1:3002`.
- Movil Expo Web: `http://localhost:8082`.

## Verificar

```bash
bash scripts/verify-system.sh
npm run rubric-check
```

## Demostracion sugerida

1. Login medico.
2. Agenda movil: crear, editar/reagendar, iniciar y finalizar cita.
3. Abrir paciente: signos vitales, receta, PDF/resumen clinico.
4. Login paciente: automonitoreo, recetas e indicadores.
5. Mostrar `/api/metrics`, Prometheus/Grafana si estan levantados.
6. Mostrar hash/cifrado con pruebas Jest.

## Plan alternativo sin Internet

- Usar Expo Web local.
- Usar screenshots en `evidence/`.
- Usar reportes generados en `reports/`.

