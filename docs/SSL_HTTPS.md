# SSL/HTTPS para PREDIA

## Configuracion preparada

- Reverse proxy: Nginx.
- Redireccion HTTP a HTTPS.
- TLS 1.2/1.3.
- HSTS y headers de seguridad.
- ACME challenge en `/.well-known/acme-challenge/`.

Archivos:

- `infra/reverse-proxy/nginx.conf`.
- `infra/reverse-proxy/conf.d/predia.conf`.
- `docker-compose.production.yml`.

## Produccion con Let's Encrypt

1. Apuntar DNS `A`/`AAAA` al servidor.
2. Definir `.env.production`.
3. Emitir certificado para el dominio elegido.
4. Montar certificados en `/etc/letsencrypt/live/predia/`.
5. Levantar `docker compose -f docker-compose.production.yml up -d`.

## Validacion

```bash
curl -I https://<dominio>/api/health
openssl s_client -connect <dominio>:443 -servername <dominio> </dev/null
```

## Bloqueo humano

DNS, dominio y emision final de certificado real requieren acciones humanas registradas en `HUMAN_ACTIONS.md`.

