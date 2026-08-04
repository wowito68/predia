# Auditoria de seguridad PREDIA

| Severidad | Hallazgo | Estado | Evidencia/solucion |
|---|---|---|---|
| ALTO | Access token con duracion larga por defecto | CORREGIDO | Default `JWT_EXPIRES_IN=15m`; refresh token revocable. |
| ALTO | Cookie web `auth-token` no era httpOnly | CORREGIDO | Login usa `httpOnly`, `sameSite` y `secure` en produccion. |
| ALTO | No existia cifrado reversible documentado | CORREGIDO | AES-256-GCM en `apps/web/lib/crypto.ts` y pruebas. |
| MEDIO | No habia endpoint Prometheus propio | CORREGIDO | `/api/metrics`. |
| MEDIO | Falta limite de subida en imagenes | CORREGIDO | MIME permitido y max 5 MB. |
| MEDIO | Validaciones clinicas con rangos incompletos | CORREGIDO PARCIAL | Rangos en mediciones, automonitoreo, recetas, consultas y agenda. |
| MEDIO | CORS local rigido | CORREGIDO PARCIAL | `ALLOWED_ORIGINS` + origenes locales permitidos. |
| BAJO | Headers de seguridad faltantes | CORREGIDO | Middleware agrega `nosniff`, `DENY`, referrer y permissions policy. |
| BAJO | CI usaba comandos inexistentes y `db push --accept-data-loss` | CORREGIDO | Workflow usa typecheck, tests, build y `migrate deploy`. |

## Riesgos residuales

- Web legacy aun usa access token en localStorage en varias pantallas; mitigado con expiracion corta, cookie httpOnly y duracion de demo, pero conviene migrar toda la web a cliente con refresh.
- SSL real, firewall real y telefono fisico dependen de acciones humanas.
- Rate limit en memoria es adecuado para demo; en multiinstancia produccion debe moverse a Redis o servicio central.

