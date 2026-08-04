# Acciones humanas pendientes

## HA-001: Ejecutar firewall en servidor real

- Criterio relacionado: T4 Firewall y monitoreo.
- Motivo por el que no puede automatizarse: aplicar reglas UFW/Fail2ban en un servidor remoto puede bloquear SSH si la IP permitida no es correcta.
- Prioridad: Alta antes de presentar infraestructura en nube.
- Tiempo estimado: 15 minutos.
- Responsable sugerido: responsable DevOps del equipo.
- Datos o accesos necesarios: acceso SSH al servidor, puerto SSH real, IP publica desde donde administran.
- Instrucciones exactas: editar variables en `infra/firewall/apply-ufw.sh`, confirmar `SSH_PORT` y `ADMIN_CIDR`, ejecutar con sudo.
- Comando o pantalla: `sudo SSH_PORT=22 ADMIN_CIDR=<tu-ip>/32 bash infra/firewall/apply-ufw.sh`.
- Resultado esperado: UFW activo, politica deny incoming, HTTP/HTTPS abiertos, BD no expuesta.
- Como verificarlo: `sudo bash infra/firewall/verify-firewall.sh`.
- Riesgo de no realizarlo: perder puntos de firewall o exponer servicios internos.
- Trabajo que Codex ya dejo preparado: scripts y documentacion de firewall.

## HA-002: Configurar DNS y emitir certificado real

- Criterio relacionado: T6 SSL/HTTPS.
- Motivo por el que no puede automatizarse: requiere dominio real, acceso DNS y correo de Let's Encrypt.
- Prioridad: Alta si se demostrara en nube.
- Tiempo estimado: 20-40 minutos.
- Responsable sugerido: responsable de despliegue.
- Datos o accesos necesarios: dominio, panel DNS, IP publica del servidor, correo institucional.
- Instrucciones exactas: apuntar `A`/`AAAA` al servidor, configurar `.env.production`, ejecutar reverse proxy con Certbot o usar Caddy/Traefik equivalente.
- Comando o pantalla: ver `docs/SSL_HTTPS.md`.
- Resultado esperado: `https://<dominio>` responde con certificado valido.
- Como verificarlo: `curl -I https://<dominio>/api/health`.
- Riesgo de no realizarlo: no cumplir certificado SSL real.
- Trabajo que Codex ya dejo preparado: configuracion Nginx/SSL y guia.

## HA-003: Probar e instalar en telefono fisico

- Criterio relacionado: T15 Telefono fisico para evaluadores.
- Motivo por el que no puede automatizarse: requiere dispositivo, cable/red local y entrega fisica.
- Prioridad: Critica para la evaluacion.
- Tiempo estimado: 30-60 minutos.
- Responsable sugerido: integrante que llevara el telefono.
- Datos o accesos necesarios: telefono Android/iOS, Expo Go o APK, IP/URL del backend.
- Instrucciones exactas: seguir `docs/INSTALACION_TELEFONO.md` y `docs/CHECKLIST_TELEFONO_EVALUACION.md`.
- Comando o pantalla: `npm --prefix apps/mobile run start -- --tunnel` o instalar APK generado.
- Resultado esperado: app abre, login medico/paciente funciona y consume API real.
- Como verificarlo: completar checklist de telefono.
- Riesgo de no realizarlo: criterio T15 no cumple.
- Trabajo que Codex ya dejo preparado: instrucciones, perfiles demo y scripts de verificacion.

## HA-004: Ensayar presentacion

- Criterio relacionado: Presentacion P1/P2.
- Motivo por el que no puede automatizarse: volumen, tiempo, vestimenta y participacion son acciones presenciales.
- Prioridad: Alta.
- Tiempo estimado: 45 minutos.
- Responsable sugerido: todo el equipo.
- Datos o accesos necesarios: nombres definitivos de integrantes y orden de exposicion.
- Instrucciones exactas: usar `docs/GUION_PRESENTACION_10_MINUTOS.md`, cronometrar 8-9 minutos y repartir participaciones.
- Comando o pantalla: no aplica.
- Resultado esperado: exposicion clara, formal y dentro del tiempo.
- Como verificarlo: ensayo grabado o cronometro.
- Riesgo de no realizarlo: perdida de puntos de contenido de presentacion.
- Trabajo que Codex ya dejo preparado: guion, checklist y distribucion.
