# Monitoreo con Prometheus y Grafana

## Implementacion

- Endpoint Prometheus: `GET /api/metrics`.
- Configuracion Prometheus: `monitoring/prometheus.yml`.
- Alertas: `monitoring/alert_rules.yml`.
- Grafana datasource/dashboard provisionados en `monitoring/grafana/`.

## Metricas expuestas

- `predia_app_up`.
- `predia_app_uptime_seconds`.
- `predia_process_memory_bytes`.
- `predia_auth_attempts_total`.
- `predia_http_requests_total` para rutas instrumentadas.
- `predia_http_request_duration_ms_sum`.

## Ejecutar

```bash
docker compose -f docker-compose.production.yml up -d prometheus grafana
```

En demo local, Prometheus queda en `http://127.0.0.1:9090` y Grafana en `http://127.0.0.1:3001`.

## Verificar

```bash
curl http://localhost:3002/api/metrics | grep predia_app_up
```

## Alertas basicas

- API caida.
- Muchos intentos de autenticacion fallidos.
- Memoria alta.

