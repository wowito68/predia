# Despliegue en nube

## Preparado

- Dockerfile multi-stage para Next.js standalone.
- `docker-compose.production.yml` con proxy, dos APIs, DB privada y monitoreo.
- CI GitHub Actions con typecheck, pruebas y build.
- Scripts de backup/restore.
- Health/readiness/metrics.

## Variables minimas

- `DATABASE_URL`.
- `JWT_SECRET`.
- `JWT_EXPIRES_IN=15m`.
- `JWT_REFRESH_EXPIRES_IN=7d`.
- `JWT_ISSUER`.
- `JWT_AUDIENCE`.
- `PREDIA_ENCRYPTION_KEY`.
- `ALLOWED_ORIGINS`.
- `SECURE_COOKIES=true`.
- `GRAFANA_ADMIN_PASSWORD`.

## Flujo VPS

```bash
git pull
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d
docker compose -f docker-compose.production.yml exec predia-api-1 npx prisma migrate deploy
```

## Backup

```bash
DATABASE_URL='mysql://user:pass@host:3306/db' bash scripts/backup/mysql-backup.sh
```

## Restore

```bash
CONFIRM_RESTORE=yes DATABASE_URL='mysql://user:pass@host:3306/db' bash scripts/restore/mysql-restore.sh backups/predia.sql.gz
```

