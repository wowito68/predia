# Guion de presentacion PREDIA (8-9 minutos)

## 0:00-0:45 - Apertura

Presentar PREDIA como plataforma clinica inteligente para deteccion temprana de diabetes con web, API, BD y app movil.

## 0:45-1:45 - Problema y solucion

Explicar en lenguaje simple: centralizar expediente, prediccion IA, agenda y seguimiento paciente-medico.

## 1:45-3:00 - Seguridad

Mostrar:

- bcrypt para contrasenas/PIN.
- AES-256-GCM para cifrado.
- JWT corto + refresh token revocable.
- Rate limit en login.

Comando: `pnpm --filter @predia/web exec jest --runInBand security-crypto security-jwt`.

## 3:00-4:30 - Infraestructura

Mostrar diagrama de `docs/ARQUITECTURA_INFRAESTRUCTURA.md`:

- Proxy publico.
- Dos APIs privadas.
- DB privada.
- Prometheus/Grafana.
- Firewall.

## 4:30-6:30 - Demo movil-web

1. Login medico.
2. Agenda: crear/reagendar/cancelar o iniciar/finalizar.
3. Paciente: signos vitales, receta y PDF.
4. Login paciente: automonitoreo y recetas.

## 6:30-7:30 - Monitoreo y balanceo

Mostrar `/api/metrics`, Prometheus/Grafana o evidencia generada. Probar `scripts/test-load-balancer.sh` si el compose demo esta activo.

## 7:30-8:30 - Cierre

Explicar que la app movil aporta camara, microfono, biometria, PDFs, agenda y automonitoreo. Mencionar pendientes humanos: DNS/SSL real, firewall en servidor y telefono fisico.

## Plan alternativo

Si falla Internet, usar Expo Web local y evidencias en `evidence/`/`reports/`.
