# PREDIA - Plan de implementacion por rubrica

Fecha: 2026-07-28  
Estado: ejecutado en repositorio, pendiente solo accion humana externa.

## P0 - Seguridad, datos y arranque

Estado: completado.

- JWT endurecido con expiracion corta, issuer/audience, refresh token revocable y cookies seguras.
- Cifrado reversible AES-256-GCM agregado para datos sensibles recuperables.
- Rangos clinicos y payloads estrictos agregados en endpoints usados por movil.
- Health/readiness checks agregados.
- TypeScript web/movil, Prisma validate, Jest web y build web verificados.

## P1 - Criterios tecnicos obligatorios

Estado: completado en repositorio.

- Endpoint `/api/metrics` compatible con Prometheus.
- Carpeta `monitoring/` con Prometheus, Grafana y dashboard provisionado.
- Arquitectura publico/privado con reverse proxy, dos backends, DB privada y balanceador.
- Firewall UFW/Fail2ban con scripts idempotentes y guia.
- HTTPS preparado con Nginx y procedimiento de certificado.
- Documentacion de valor movil, diseno, navegacion, validacion y sincronizacion.

## P2 - Automatizacion y evidencia

Estado: completado.

- `scripts/start-demo.sh`, `scripts/stop-demo.sh`, `scripts/verify-system.sh`.
- `scripts/rubric-check.sh` y objetivo `make rubric-check`.
- Salidas esperadas en `reports/rubric-report.md`, `reports/rubric-report.json` y `reports/verify-system.json`.
- Scripts de backup/restore de MySQL.
- Carpeta `evidence/` para respuestas sanitizadas de health/metrics.

## P3 - Presentacion

Estado: material completado; ejecucion humana pendiente.

- Guion de 8-9 minutos.
- Checklist de presentacion y telefono.
- Distribucion de participacion.
- Acciones humanas pendientes documentadas en `HUMAN_ACTIONS.md`.

## Pendientes externos

1. Ejecutar firewall en VPS real con `ADMIN_CIDR` correcto.
2. Configurar DNS y certificado real.
3. Probar en telefono fisico.
4. Ensayar presentacion presencial.
