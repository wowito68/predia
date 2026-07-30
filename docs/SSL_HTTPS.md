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
4. Confirmar que el VPS tenga certificados reales en `/etc/letsencrypt`.
5. Exponer el certificado esperado por Nginx en `/etc/letsencrypt/live/predia/`.
6. Levantar `docker compose -f docker-compose.production.yml up -d`.

`docker-compose.production.yml` monta `/etc/letsencrypt` y `/var/www/certbot` desde el host. Esto evita que Nginx arranque con un volumen Docker vacio sin certificados.

Si el certificado fue emitido con el nombre del dominio, por ejemplo `predia.ejemplo.com`, crear un symlink en el VPS antes del despliegue:

```bash
sudo ln -sfn /etc/letsencrypt/live/predia.ejemplo.com /etc/letsencrypt/live/predia
```

Tambien debe existir el directorio usado para retos ACME:

```bash
sudo mkdir -p /var/www/certbot
```

## Validacion

```bash
curl -fkSs https://127.0.0.1/api/ready
curl -I https://<dominio>/api/ready
openssl s_client -connect <dominio>:443 -servername <dominio> </dev/null
```

## Bloqueo humano

DNS, dominio y emision final de certificado real requieren acciones humanas registradas en `HUMAN_ACTIONS.md`.
