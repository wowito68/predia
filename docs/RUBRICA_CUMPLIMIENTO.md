# PREDIA - Cumplimiento de rubrica 3er ciclo

Fecha de cierre tecnico: 2026-07-28  
Alcance auditado: monorepo PREDIA (`apps/web`, `apps/mobile`, `packages/shared`, Docker, scripts y documentacion).

## Estado general

El repositorio queda preparado para evaluacion tecnica de la parte movil, API, seguridad e infraestructura. Los criterios que dependen de codigo, configuracion, pruebas automatizadas y documentacion quedaron implementados o reforzados. Los puntos que requieren intervencion humana quedan documentados en `HUMAN_ACTIONS.md` con pasos exactos.

Evidencia automatizada final: `reports/rubric-report.md` reporta 9 checks OK y 0 fallos. La navegacion movil CDP dejo capturas y reporte en `evidence/mobile-cdp-qa-rubric/`.

## Matriz de cumplimiento

| ID | Criterio | Estado | Evidencia principal | Verificacion |
|----|----------|--------|--------------------|--------------|
| P1 | Presentacion max. 10 min | CUMPLIDO EN REPO | `docs/GUION_PRESENTACION_10_MINUTOS.md`, `docs/CHECKLIST_PRESENTACION.md`, `docs/DISTRIBUCION_PARTICIPACION.md` | Revision documental |
| P2 | Volumen, vestimenta, participacion y lenguaje claro | BLOQUEADO POR HUMANO | `HUMAN_ACTIONS.md` HA-004 | Requiere ensayo presencial |
| T1 | Hash y cifrado funcionando | CUMPLIDO | `apps/web/lib/auth.ts`, `apps/web/lib/crypto.ts`, `apps/web/__tests__/security-crypto.test.ts` | Jest web OK |
| T2 | Dos servidores publico/privado | CUMPLIDO EN REPO | `docker-compose.production.yml`, `docker-compose.rubric.yml`, `infra/reverse-proxy/conf.d/*.conf` | Revision de compose y Nginx |
| T3 | Prometheus y Grafana | CUMPLIDO | `apps/web/app/api/metrics/route.ts`, `monitoring/prometheus.yml`, `monitoring/grafana/dashboards/predia-overview.json` | Endpoint `/api/metrics` y dashboard provisionado |
| T4 | Firewall y monitoreo | LISTO PARA EJECUCION | `infra/firewall/apply-ufw.sh`, `infra/firewall/verify-firewall.sh`, `infra/firewall/fail2ban-sshd.conf`, `docs/FIREWALL.md` | Requiere aplicar en VPS real |
| T5 | API protegida con JWT | CUMPLIDO | JWT con issuer/audience, expiracion corta, refresh token revocable, cookies httpOnly, pruebas de token | Jest web OK |
| T6 | Certificado SSL | LISTO PARA DOMINIO | `infra/reverse-proxy/conf.d/predia.conf`, `docs/SSL_HTTPS.md` | Requiere dominio/DNS real |
| T7 | Balanceador de carga | CUMPLIDO EN REPO | Upstream Nginx con dos APIs en `docker-compose.rubric.yml`; `scripts/test-load-balancer.sh` | Prueba reproducible por headers `X-PREDIA-Instance` |
| T8 | Utilidad real de app movil | CUMPLIDO | Roles medico/paciente/enfermero, automonitoreo, agenda, expediente, PDFs, firma, dictado, camara | Revision de pantallas y TypeScript movil |
| T9 | Diseno profesional app movil | CUMPLIDO | `docs/mobile-ui-redesign-report.md`, `docs/DISENO_APP_MOVIL.md`, componentes premium, feedback banners y empty states | TypeScript movil OK |
| T10 | Navegacion movil clara | CUMPLIDO | `docs/NAVEGACION_MOVIL.md`, navegadores por rol, flujos clinicos directos | Revision de rutas movil |
| T11 | Validacion formularios/BD | CUMPLIDO | Zod estricto y rangos clinicos en mediciones, automonitoreo, recetas, consultas, imagenes y agenda | TypeScript/Jest/Prisma validate |
| T12 | Sincronizacion movil-web | CUMPLIDO | React Query invalida expediente, agenda, recetas, signos y snapshots tras mutaciones | `docs/SINCRONIZACION_WEB_MOVIL.md` |
| T13 | Web/API/BD en nube | CUMPLIDO EN REPO | Docker production, CI/CD endurecido, scripts backup/restore, guia despliegue | `docs/DESPLIEGUE_NUBE.md` |
| T14 | Movil/API/BD funcionales | CUMPLIDO | `scripts/start-demo.sh`, `scripts/verify-system.sh`, `scripts/rubric-check.sh`, builds y tests | Comando unico `bash scripts/rubric-check.sh` |
| T15 | Telefono fisico evaluadores | BLOQUEADO POR HUMANO | `docs/INSTALACION_TELEFONO.md`, `docs/CHECKLIST_TELEFONO_EVALUACION.md` | Requiere dispositivo fisico |

## Evidencia tecnica implementada

- Hash de contrasenas con bcrypt para usuarios y pacientes.
- Cifrado reversible AES-256-GCM para datos sensibles recuperables.
- JWT con expiracion corta, issuer, audience y refresh tokens rotables/revocables.
- Cookies `httpOnly`, `sameSite=lax` y `secure` en produccion.
- Endpoints publicos de salud: `/api/health`, `/api/ready`, `/api/metrics`.
- Metricas Prometheus para disponibilidad, memoria, latencias, requests y auth.
- Prometheus, Grafana y dashboard provisionado en `monitoring/`.
- Reverse proxy Nginx con TLS, headers de seguridad, upstream y bloqueo de metricas publicas.
- Compose de produccion con proxy publico, dos APIs privadas, DB privada y monitoreo local.
- Compose demo de balanceo para rubrica.
- Scripts de firewall UFW/Fail2ban y verificacion.
- Scripts de demo, verificacion, rubrica, balanceo, backup y restore.
- Validaciones estrictas y rangos clinicos en endpoints usados por movil.
- App movil con CRUD completo de agenda, PDFs/impresion, feedback visual, empty states y sincronizacion.

## Pendientes no automatizables

- Aplicar firewall en el servidor real sin bloquear SSH.
- Configurar DNS y emitir certificado HTTPS real para un dominio.
- Probar la app en un telefono fisico del equipo o de los evaluadores.
- Ensayar presentacion y participacion del equipo.

Los pasos exactos estan documentados en `HUMAN_ACTIONS.md`.
