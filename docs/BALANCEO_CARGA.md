# Balanceador de carga PREDIA

## Estrategia

- Nginx con upstream `least_conn`.
- Dos instancias privadas de Next.js.
- Health checks en `/api/health` y `/api/ready`.
- Cabecera diagnostica `X-PREDIA-Instance` para demostrar distribucion.
- Aplicacion stateless: sesion basada en JWT y refresh token en BD.

## Demo local

```bash
docker compose -f docker-compose.rubric.yml up -d --build
bash scripts/test-load-balancer.sh
```

Salida esperada:

- Deben aparecer al menos dos valores diferentes: `predia-api-demo-1` y `predia-api-demo-2`.

## Produccion

Usar `docker-compose.production.yml` y `infra/reverse-proxy/conf.d/predia.conf`.

