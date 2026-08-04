# Firewall PREDIA

## Politica

- Denegar conexiones entrantes por defecto.
- Permitir salientes.
- Permitir SSH solo desde IP/CIDR administrativa.
- Permitir HTTP/HTTPS.
- Bloquear puertos internos: MySQL 3306, backend 3000, Prometheus 9090, Grafana 3001.
- Activar logs UFW y Fail2ban para SSH.

## Scripts

- Aplicar: `infra/firewall/apply-ufw.sh`.
- Verificar: `infra/firewall/verify-firewall.sh`.
- Fail2ban: `infra/firewall/fail2ban-sshd.conf`.

## Ejecucion segura

No ejecutar sin confirmar IP administrativa:

```bash
sudo SSH_PORT=22 ADMIN_CIDR=<tu-ip-publica>/32 bash infra/firewall/apply-ufw.sh
```

## Verificacion

```bash
sudo bash infra/firewall/verify-firewall.sh
sudo journalctl -u ufw -n 100
sudo fail2ban-client status sshd
```

La ejecucion en servidor real esta registrada en `HUMAN_ACTIONS.md`.

