# PREDIA - Despliegue fisico en dos servidores

Fecha de implementacion: 2026-08-04

## Inventario

| Rol | Instancia | IP privada | Exposicion |
|---|---|---:|---|
| Servidor publico | `ec2-52-15-133-69.us-east-2.compute.amazonaws.com` | `172.31.37.174` | Nginx `80/443`; SSH administrativo restringido |
| Servidor privado | `i-06e911280e3a4613f` | `172.31.45.164` | SSH restringido; MySQL solo desde el servidor publico |

La instancia privada pertenece a `vpc-05c2514bd6550e9d2`, subred `subnet-069780943be36d0e9` y grupo de seguridad `sg-0cfbdcb57a224f9a5`.

## Responsabilidades

El servidor publico termina TLS, aplica limites de solicitudes y balancea entre dos replicas de Next.js. Tambien sirve Expo Web bajo `/mobile/`.

El servidor privado ejecuta:

- MySQL 8 enlazado exclusivamente a `172.31.45.164:3306`.
- Prometheus en `127.0.0.1:9090`.
- Grafana en `127.0.0.1:3001`.
- Node Exporter, cAdvisor y Blackbox Exporter sin puertos publicados.
- Sondeos de API, HTTPS, certificado, movil y MySQL.

## Controles aplicados

- UFW: denegar entrada y trafico reenviado por defecto.
- SSH: solo llaves, sin root, sin password y sin reenvio remoto.
- Fail2ban habilitado para `sshd`.
- Cadena `DOCKER-USER`: bloquea MySQL salvo desde `172.31.37.174/32`.
- Los contenedores no pueden consultar metadata EC2 en `169.254.169.254`.
- Grafana y Prometheus requieren tunel SSH.
- Actualizaciones de seguridad desatendidas habilitadas.
- Variables privadas con modo `600`; no se versionan.
- Respaldo diario con `mysqldump`, gzip, SHA-256 y retencion de 14 dias.

El timer `predia-private-backup.timer` esta habilitado y la primera copia de prueba fue validada con `gzip -t` y `sha256sum --check`.

## Acceso administrativo

```bash
ssh -i ~/Descargas/PREDIA.pem \
  -L 3002:127.0.0.1:3001 \
  -L 9091:127.0.0.1:9090 \
  ubuntu@ec2-18-222-145-243.us-east-2.compute.amazonaws.com
```

Después del túnel:

- Grafana: `http://127.0.0.1:3002`
- Prometheus: `http://127.0.0.1:9091`

## Regla AWS requerida para MySQL

En `sg-0cfbdcb57a224f9a5`, permitir TCP `3306` únicamente desde el grupo de seguridad de la instancia pública. No usar `0.0.0.0/0` ni la IP pública del primer servidor. UFW y `DOCKER-USER` aplican además la restricción `172.31.37.174/32` dentro del host.

## Verificacion

```bash
bash scripts/infra/verify-two-server-architecture.sh
```

El comando no consulta datos clínicos ni imprime secretos.

## Estado de migracion de datos

El servidor privado y su MySQL están desplegados y sanos. La observabilidad ya consume la API pública por la VPC. El cambio de la base activa requiere primero recuperar acceso SSH administrativo a la instancia pública, generar un respaldo consistente, restaurarlo y cambiar `DATABASE_URL` con prueba y rollback. Hasta completar esa operación, la base actual del servidor público permanece como fuente activa para evitar pérdida de información.
