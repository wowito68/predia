# PREDIA - Validacion de la demostracion tecnica

Fecha: 2026-08-04  
Modo: local y consultas remotas de solo lectura  
Comando: `bash scripts/demo/validate.sh`

## Resultado

| Comprobacion | Resultado observado |
|---|---|
| Sintaxis Bash | Todos los scripts validos |
| Herramientas | OBS 30.0.2.1, tmux 3.4, Node 22, pnpm 10.23.0 |
| FFmpeg CLI | No instalado; no se instalo |
| Web publica | HTTPS 200 |
| Redireccion | HTTP 301 hacia HTTPS |
| API + BD | `/api/ready` 200, `database: ok` |
| Certificado | Let's Encrypt para `prediaa.duckdns.org`, valido hasta 2026-11-01 |
| Pruebas de seguridad | 3 suites, 11 pruebas aprobadas |
| Balanceo | 6 respuestas de `predia-api-1` y 6 de `predia-api-2` |
| Arquitectura | Dos EC2 fisicas: publica `172.31.37.174` y privada `172.31.45.164` |
| Servidor privado | 6 contenedores activos; MySQL, Prometheus, Grafana y cAdvisor saludables |
| Firewall privado | UFW activo, entrada y reenvio denegados por defecto, logging activo |
| Proteccion SSH | Fail2ban `sshd` operativo, sin mostrar IP |
| Prometheus privado | Ready, 8 targets disponibles durante el ensayo |
| Grafana | Operativo, version 11.4.0 |
| Recursos privados durante ensayo | Memoria 15.3 %, CPU promedio 1.7 % |
| Superficie privada | Puertos publicos 80, 443, 3001, 3306 y 9090 cerrados |
| Navegador de demo | 4 pestanas verificadas por CDP en un perfil temporal aislado |
| Terminales de demo | 6 ventanas preparadas en la sesion `predia-demo` |
| CI/CD | Ultimo push: fallo de `secret-scan`; run anterior de `main`: exitoso |
| Timer de backup privado | Habilitado y activo; ejecucion diaria persistente |
| Backups detectados | 1 copia de prueba con gzip y SHA-256 verificados |

## Garantias del ensayo

- No se ejecuto ningun `POST`, `PUT`, `PATCH` o `DELETE` contra la API.
- No se abrio ni imprimio ningun archivo `.env`.
- No se consultaron tablas ni datos clinicos.
- No se ejecutaron migraciones, despliegues, backups, restores o rollbacks.
- No se reiniciaron servicios ni contenedores.
- La ejecucion de validacion no modifico UFW, Fail2ban, TLS ni servicios de ninguna EC2.
- No se mostraron tokens, cookies, contrasenas o llaves privadas.

## Hallazgo de CI/CD

El run `30911329838` del commit `c4920b2` termino en fallo por Gitleaks al detectar el placeholder literal `"token": "REDACTED"` en `TROUBLESHOOTING.md`; los demas jobs funcionales de ese run finalizaron correctamente. El run anterior de `main`, `30876857125`, termino con exito. No se corrigio ni relanzo el pipeline porque esta preparacion prohibe commits, pushes y despliegues.

## Grabacion

OBS y X11 estan disponibles, pero la toma final requiere narracion humana, autenticacion previa de Grafana y confirmacion visual de que el escritorio no contiene secretos. Por seguridad no se inicio una grabacion automatica del escritorio activo. `launch-obs.sh` exige `CONFIRM_SAFE_DESKTOP=yes` para el modo automatico.
