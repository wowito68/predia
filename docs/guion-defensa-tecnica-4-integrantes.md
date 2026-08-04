# PREDIA - Guion de defensa técnica para 4 integrantes

## Propósito y duración

Este guion cubre los 14 criterios de la rúbrica sin repetir temas. Está diseñado para una exposición de **14 a 16 minutos**, con aproximadamente 3:30 minutos por integrante y una demostración continua.

| Integrante | Bloque | Criterios principales |
|---|---|---|
| Arianna Valentina Giannoccaro Quiñone | Producto y experiencia móvil | Utilidad real, diseño profesional, navegación, aplicación funcional en teléfono |
| Álvarez Sánchez Guillermo | Seguridad de aplicación y datos | Hashing, cifrado, JWT, validación de formularios |
| Muñoz Prado Cristopher Yanhyu | Infraestructura y perímetro | Capa pública/privada, firewall, SSL, balanceador |
| Villafuerte Armenta Gabriel Iván | Operación e integración | Prometheus/Grafana, nube, sincronización móvil-web, API y BD |

## Preparación antes de exponer

Abrir con anticipación:

1. En un teléfono, `https://prediaa.duckdns.org/mobile/` o la versión APK instalada.
2. En una laptop, `https://prediaa.duckdns.org` con un perfil clínico.
3. Una terminal conectada al VPS, sin mostrar secretos ni el contenido de `.env.production`.
4. Grafana mediante túnel SSH local, porque no está expuesto a Internet.
5. Este repositorio en las rutas de evidencia citadas en el guion.

No mostrar contraseñas, tokens JWT completos, llaves privadas, `.env.production`, datos personales reales ni el contenido de respaldos.

## Orden táctico de demostración

| Momento | Acción visible | Responsable |
|---|---|---|
| 0:00 | Abrir PREDIA móvil y presentar el valor clínico | Arianna |
| 2:00 | Navegar agenda, paciente y automonitoreo | Arianna |
| 3:30 | Mostrar pruebas de criptografía/JWT y explicar controles | Guillermo |
| 7:00 | Mostrar diagrama, HTTPS, puertos y dos réplicas API | Cristopher |
| 10:30 | Abrir Grafana y ejecutar sincronización móvil-web | Gabriel |
| 14:00 | Mostrar que el dato aparece en web y cerrar | Gabriel |

---

## Integrante 1 - Arianna: producto y aplicación móvil

### Objetivo del bloque

Demostrar primero que la aplicación móvil aporta valor propio, se puede usar en un teléfono y tiene una interfaz deliberadamente diseñada.

### Guion sugerido

> Buenos días. Somos el equipo de PREDIA, una plataforma clínica para la detección temprana y el seguimiento de diabetes. En esta etapa llevamos el sistema al contexto móvil con dos perfiles: personal clínico y paciente.
>
> La aplicación móvil no es una copia reducida de la web. Para el médico prioriza tareas que ocurren en movilidad: consultar la agenda, crear, reagendar o cancelar citas, iniciar y terminar una atención, revisar el expediente, registrar signos vitales, usar dictado clínico, capturar evidencia y generar documentos. Para el paciente prioriza el automonitoreo de glucosa, peso y presión, la consulta de tendencias, recetas, citas y alertas.

Mientras se habla, iniciar sesión y mostrar Inicio, Agenda y Paciente.

> La navegación se organiza por perfil y por frecuencia de uso. Las acciones principales están visibles y las secundarias se agrupan sin competir visualmente. El sistema de diseño usa una paleta clínica de alto contraste, tipografía Inter, espaciado basado en múltiplos de cuatro, iconografía consistente y componentes comunes para botones, campos, estados vacíos, confirmaciones y carga.
>
> En formularios móviles damos retroalimentación inmediata: el usuario ve qué campo es inválido, conserva la información capturada y recibe confirmación al guardar. También contemplamos pérdida de conexión; la sesión se conserva de forma segura y la API distingue un problema de red de una sesión expirada.

Mostrar un estado vacío o de carga y abrir Crear cita o Registrar glucosa sin guardar todavía.

> La misma base de Expo permite ejecutar una versión web móvil y generar una versión Android. El proyecto tiene configuración de preview APK y producción AAB, URL HTTPS por ambiente, identificador de paquete, icono, splash y versión. Las claves de firma no se guardan en el repositorio.

### Frase de transición

> Esta experiencia sólo es confiable si la identidad y los datos clínicos están protegidos. Guillermo explicará cómo aseguramos ese flujo desde el ingreso hasta la API.

### Evidencia que debe conocer

- Design system: `apps/mobile/src/theme/` y `apps/mobile/src/components/`.
- Navegación: `apps/mobile/src/navigation/`.
- Configuración Android/iOS: `apps/mobile/app.json` y `apps/mobile/eas.json`.
- Servicio API y renovación de sesión: `apps/mobile/src/services/api.ts`.
- Persistencia segura: `apps/mobile/src/store/authStore.ts`.

### Palabras técnicas de su bloque

- **Design system:** reglas y componentes reutilizables que mantienen consistencia visual.
- **Jerarquía visual:** orden en que la interfaz dirige la atención del usuario.
- **Estado vacío:** interfaz útil cuando todavía no hay registros.
- **Skeleton:** representación temporal de la estructura durante una carga.
- **Feedback háptico:** vibración breve que confirma una acción en un dispositivo.
- **Navegación por rol:** rutas disponibles según el tipo de usuario autenticado.
- **APK:** archivo instalable de Android para pruebas o distribución directa.
- **AAB:** paquete que Google Play usa para generar APK optimizados.

---

## Integrante 2 - Guillermo: hashing, cifrado, JWT y validación

### Objetivo del bloque

Explicar la diferencia entre controles y demostrar que no se confía en la interfaz para proteger la API.

### Guion sugerido

> En PREDIA separamos hashing y cifrado porque resuelven problemas distintos. Las contraseñas del personal y los PIN de paciente se protegen con bcrypt. bcrypt es un hash lento, irreversible y con salt aleatorio administrado por la biblioteca. La API nunca necesita recuperar la contraseña: compara el valor presentado contra el hash.
>
> Para información sensible que sí debe recuperarse existe cifrado AES-256-GCM. GCM aporta confidencialidad e integridad: además de ocultar el contenido, detecta si el texto cifrado fue alterado. La llave se obtiene de `PREDIA_ENCRYPTION_KEY`, no del código. Los refresh tokens tampoco se almacenan en claro; la base conserva su SHA-256 para poder revocarlos sin exponer el token original.

Ejecutar o mostrar el resultado de:

```bash
pnpm --filter @predia/web exec jest --runInBand security-crypto security-jwt refresh-token
```

> Después del login se emite un access token JWT corto y un refresh token opaco. El JWT se valida por firma, algoritmo HS256, emisor, audiencia, expiración y tipo de sujeto. El payload contiene sólo identificadores mínimos, rol y tipo de sesión; no contiene contraseña, CURP ni información clínica.
>
> La renovación rota el refresh token en una transacción. El token anterior queda revocado y un intento de reutilizarlo se rechaza. En web usamos cookies `httpOnly`, `secure` y `sameSite`; en iOS y Android la sesión se guarda mediante SecureStore. El cierre de sesión revoca el refresh token en servidor y limpia el dispositivo.
>
> La autorización distingue autenticación de permisos. Un token ausente o inválido produce 401. Un usuario válido sin permiso produce 403. Además, el proxy de Next verifica criptográficamente el token antes de permitir rutas privadas y la API vuelve a validar propiedad y rol en operaciones sensibles.
>
> Finalmente, todos los datos que llegan a la base pasan por validación del servidor con Zod: campos requeridos, rangos clínicos, fechas, enumeraciones, identificadores, longitud, archivos y rechazo de campos adicionales. La validación del móvil mejora la experiencia, pero la del servidor es la frontera de seguridad.

### Frase de transición

> Estos controles protegen cada solicitud. Cristopher mostrará cómo protegemos también el perímetro, el transporte y la disponibilidad del servicio.

### Evidencia que debe conocer

- Hashing/JWT: `apps/web/lib/auth.ts`.
- AES-256-GCM: `apps/web/lib/crypto.ts`.
- Validación global de tokens: `apps/web/proxy.ts`.
- Rotación: `apps/web/app/api/auth/refresh/route.ts`.
- Pruebas: `apps/web/__tests__/security-crypto.test.ts`, `security-jwt.test.ts`, `refresh-token.test.ts` y `api-authorization.test.ts`.
- Escaneo de secretos: `.gitleaks.toml` y job `secret-scan` en `.github/workflows/main.yml`.

### Palabras técnicas de su bloque

- **Hash:** transformación unidireccional usada para comprobar un secreto sin recuperarlo.
- **Salt:** valor aleatorio que evita hashes iguales y tablas precalculadas.
- **Factor de costo:** trabajo computacional de bcrypt que encarece ataques de fuerza bruta.
- **AES-256-GCM:** cifrado autenticado con llave simétrica de 256 bits.
- **Nonce/IV:** valor único por cifrado; no es una contraseña ni necesita ocultarse.
- **JWT:** token firmado que transporta claims verificables.
- **Claim:** atributo dentro del JWT, por ejemplo sujeto, rol, emisor o audiencia.
- **Access token:** credencial de vida corta para acceder a la API.
- **Refresh token:** credencial opaca para renovar la sesión; se rota y revoca.
- **RBAC:** control de acceso basado en roles.
- **401 / 403:** no autenticado / autenticado sin autorización.
- **Zod:** biblioteca de esquemas y validación usada por la API.

---

## Integrante 3 - Cristopher: arquitectura, firewall, SSL y balanceo

### Objetivo del bloque

Mostrar que sólo el punto de entrada necesario es público y que una falla de una réplica no detiene toda la aplicación.

### Guion sugerido

> La solución está desplegada en una instancia EC2 de AWS mediante Docker Compose. En el VPS implementamos dos capas lógicas. La capa pública contiene Nginx y sólo publica los puertos 80 y 443. La capa privada contiene dos réplicas de Next.js, MySQL, Prometheus, Grafana y exporters en redes Docker internas sin puertos públicos.
>
> Es importante ser precisos: hoy son dos capas aisladas en un solo VPS, no dos máquinas físicas independientes. Esto satisface la separación lógica y evita exponer la base, pero comparte el mismo dominio de falla. La evolución prevista es mover la red privada a un segundo VPS o una subred privada de AWS sin cambiar los contratos de la aplicación.

Mostrar el diagrama de `docs/ARQUITECTURA_INFRAESTRUCTURA.md` y después:

```bash
sudo ss -lntup
sudo ufw status numbered
sudo fail2ban-client status sshd
```

> El firewall combina el Security Group de AWS y UFW. La política de entrada es denegar por defecto; HTTP y HTTPS están permitidos, SSH se limita a la IP administrativa y MySQL, API, Grafana y Prometheus no se publican. Fail2ban agrega bloqueo temporal frente a intentos repetidos de SSH. El script detecta el puerto SSH, crea respaldo, valida `sshd` y tiene rollback para reducir el riesgo de perder acceso.
>
> Nginx termina TLS con un certificado válido de Let's Encrypt. HTTP redirige a HTTPS, Certbot renueva automáticamente y se configuran TLS 1.2/1.3, HSTS, CSP, límites de solicitud, timeouts, cabeceras forwarding y rate limiting. De esta forma el tráfico móvil, web y API viaja cifrado.

Mostrar:

```bash
curl -I http://prediaa.duckdns.org
curl -I https://prediaa.duckdns.org
openssl s_client -connect prediaa.duckdns.org:443 -servername prediaa.duckdns.org </dev/null
```

> El balanceador utiliza `least_conn` y dos instancias de API. Cada instancia tiene health check y un identificador. Nginx evita temporalmente una instancia con fallos y puede reintentar errores seguros en la otra. Esto mejora disponibilidad y permite demostrar distribución real de solicitudes.

```bash
URL=https://prediaa.duckdns.org/api/health bash scripts/test-load-balancer.sh
```

### Frase de transición

> Tener servicios protegidos y redundantes no basta si no sabemos qué ocurre dentro. Gabriel cerrará con monitoreo y una sincronización completa entre teléfono, API, base y web.

### Evidencia que debe conocer

- Compose de producción: `docker-compose.production.yml`.
- Proxy/balanceador: `infra/reverse-proxy/nginx.conf` y `conf.d/predia.conf`.
- Firewall: `infra/firewall/`.
- TLS: `setup-https.sh`.
- Prueba de balanceo: `scripts/test-load-balancer.sh`.
- Despliegue: `deploy-ec2.sh`.

### Palabras técnicas de su bloque

- **Proxy inverso:** punto de entrada que recibe solicitudes y las reenvía a servicios internos.
- **Terminación TLS:** descifrado controlado de HTTPS en el proxy.
- **Capa pública/privada:** separación de servicios expuestos y servicios internos.
- **Red interna de Docker:** red sin publicación directa hacia Internet.
- **UFW:** interfaz de administración de reglas del firewall de Linux.
- **Security Group:** firewall virtual asociado a una instancia de AWS.
- **Fail2ban:** analiza eventos de autenticación y bloquea temporalmente IP agresoras.
- **Rate limiting:** límite de solicitudes por origen y periodo.
- **Least connections:** algoritmo que envía tráfico a la réplica con menos conexiones activas.
- **Health check:** comprobación de proceso; **readiness** comprueba además dependencias como BD.
- **Dominio de falla:** conjunto de componentes afectados por una misma avería.
- **HSTS/CSP:** cabeceras que fuerzan HTTPS y restringen fuentes de contenido.

---

## Integrante 4 - Gabriel: monitoreo, nube y sincronización

### Objetivo del bloque

Terminar con evidencia dinámica: observar el sistema y registrar desde móvil un dato que aparece en la web.

### Guion sugerido

> La operación se monitorea con Prometheus y Grafana, ambos restringidos a localhost y redes internas. Prometheus recopila salud de las dos APIs, CPU, memoria, disco, red, contenedores, conexiones MySQL, estado de Nginx, códigos 4xx/5xx, latencia y disponibilidad HTTPS. Grafana se provisiona como código para que el tablero sea reproducible.

Mostrar el dashboard PREDIA - Salud del sistema.

> También configuramos alertas para API o instancia caída, MySQL o Nginx no disponibles, incremento de errores 5xx, memoria alta, disco bajo, fallos de autenticación, endpoint público caído y certificado próximo a vencer. Los logs de Docker rotan por tamaño para evitar llenar el disco.
>
> El flujo que demuestra integración es el automonitoreo. Desde el perfil paciente registraré una glucosa. El móvil valida el rango, envía el JWT por HTTPS, la API verifica que el paciente sólo escriba en su propio expediente, vuelve a validar con Zod y persiste el registro con fecha y autor implícito por `id_paciente`. React Query invalida la consulta afectada y actualiza la tendencia.

Registrar un valor de demostración claramente etiquetado. En la web, abrir el mismo paciente y actualizar la vista.

> El dato ya está visible en la contraparte web porque móvil y web no mantienen bases separadas: ambos consumen la misma API y MySQL privada. Si se pierde conexión, la interfaz informa el estado y no presenta una operación fallida como exitosa. Este recorrido prueba teléfono, HTTPS, JWT, autorización, validación, API, base de datos y sincronización.
>
> La plataforma completa está alojada en AWS y dispone de health checks, migraciones Prisma, reinicio automático, respaldo diario con checksum, restauración confirmada y rollback por etiqueta de imagen. GitHub Actions ejecuta escaneo de secretos, lint, tipos, pruebas, migraciones en MySQL limpio, builds web y móvil, auditoría de dependencias y builds Docker antes de desplegar.
>
> En resumen, PREDIA entrega una aplicación clínica móvil útil y una plataforma observable, protegida e integrada. No presentamos sólo pantallas: presentamos un flujo clínico verificable de extremo a extremo.

### Evidencia que debe conocer

- Prometheus y alertas: `monitoring/prometheus.yml` y `monitoring/alert_rules.yml`.
- Dashboard: `monitoring/grafana/dashboards/predia-overview.json`.
- Sincronización: `apps/web/app/api/pacientes/[id]/automonitoreo/route.ts` y servicio móvil.
- Backups: `scripts/backup/` y `scripts/restore/`.
- CI/CD: `.github/workflows/main.yml` y `.github/workflows/mobile-native.yml`.

### Palabras técnicas de su bloque

- **Prometheus:** recolector y base temporal de métricas.
- **Grafana:** visualización y exploración de métricas.
- **Exporter:** adaptador que expone métricas de un servicio en formato Prometheus.
- **Blackbox probe:** prueba externa de disponibilidad, latencia y TLS.
- **cAdvisor / Node Exporter:** métricas de contenedores / sistema operativo.
- **Serie temporal:** valores asociados a marcas de tiempo.
- **p95:** valor por debajo del cual cae el 95 % de las mediciones de latencia.
- **React Query:** caché y sincronización del estado remoto en el cliente.
- **Invalidación de caché:** marca datos como obsoletos para volver a consultarlos.
- **Migración:** cambio versionado y reproducible del esquema de base de datos.
- **Readiness:** indica si la aplicación puede atender tráfico y acceder a sus dependencias.
- **Rollback:** regreso controlado a una versión anterior.

---

## Posibles preguntas del jurado

### Seguridad

**¿Hashing y cifrado son lo mismo?**  
No. El hashing es irreversible y se usa para verificar contraseñas. El cifrado es reversible con una llave y se usa cuando el sistema necesita recuperar el dato.

**¿Por qué bcrypt y no SHA-256 para contraseñas?**  
SHA-256 es deliberadamente rápido y facilita probar millones de contraseñas. bcrypt es lento, usa salt y tiene un factor de costo ajustable. SHA-256 sí se usa para identificar refresh tokens aleatorios, no contraseñas humanas.

**¿Qué ocurre si alguien modifica un dato cifrado con AES-GCM?**  
La etiqueta de autenticación deja de coincidir y el descifrado falla. GCM detecta alteración además de mantener confidencialidad.

**¿Dónde están las llaves?**  
En variables/secretos del entorno del VPS y CI, nunca en Git ni en el APK. El repositorio sólo contiene plantillas sin valores reales.

**¿Qué contiene el JWT?**  
Identificador, rol, tipo de sujeto y claims estándar. No contiene contraseña, CURP, expediente ni datos clínicos.

**¿Qué evita reutilizar un refresh token robado?**  
La rotación de un solo uso: al renovar, el anterior se revoca de forma transaccional. Un replay se rechaza.

**¿Cómo evitan que un paciente consulte a otro?**  
La API compara el `id_paciente` firmado del token con el recurso solicitado. No depende de ocultar botones en la interfaz.

**¿La aplicación es inmune a ataques DDoS?**  
Ningún VPS aislado puede garantizar inmunidad. Hay rate limiting, límites de conexión, firewall y bloqueo de fuerza bruta. Para ataques volumétricos la siguiente capa sería AWS WAF/CloudFront o un proveedor anti-DDoS delante del origen.

### Arquitectura e infraestructura

**¿Realmente tienen dos servidores?**  
Hay dos capas lógicas y dos réplicas de API aisladas por redes Docker en un VPS. No afirmamos que sean dos máquinas físicas. La base no es pública, pero el host sigue siendo un único dominio de falla; la migración futura es mover la capa privada a otra instancia/subred.

**¿Por qué la base de datos no tiene puerto publicado?**  
Sólo las APIs necesitan hablar con MySQL. Al no publicar 3306 se reduce la superficie de ataque y las reglas de red expresan el flujo permitido.

**¿Qué pasa si una API falla?**  
Nginx detecta fallos pasivamente, deja de enviarle tráfico durante el periodo configurado y utiliza la otra réplica. Los health checks permiten observar el incidente.

**¿Balancear dos contenedores en el mismo VPS da alta disponibilidad total?**  
Da redundancia de proceso y permite actualizaciones/fallas parciales, pero no protege contra la caída del VPS. Alta disponibilidad completa requiere réplicas en hosts o zonas distintas.

**¿Cómo se renueva el certificado?**  
Certbot usa renovación automática. La sonda de Prometheus calcula los días restantes y alerta antes del vencimiento.

**¿Prometheus y Grafana son públicos?**  
No. Sus puertos sólo se enlazan a `127.0.0.1` y redes internas; para administrarlos se usa un túnel SSH.

**¿Cómo recuperan el sistema después de una actualización fallida?**  
Cada despliegue conserva etiquetas de imagen actual y anterior, crea respaldo antes de migrar y ofrece rollback. Si el esquema cambió de forma incompatible, se restaura el backup verificado además de regresar las imágenes.

### Móvil e integración

**¿Qué hace el móvil que no sea una copia de la web?**  
Permite atención en movilidad, inicio/fin de citas, signos vitales, dictado, cámara/evidencia, llamadas y automonitoreo rápido del paciente. La web conserva las tareas amplias de escritorio y administración.

**¿Cómo se sincronizan móvil y web?**  
Ambos consumen la misma API HTTPS. La API valida y escribe una sola base MySQL; React Query actualiza la caché móvil y la web vuelve a consultar la misma fuente de verdad.

**¿Qué pasa sin Internet?**  
La sesión local se conserva de forma segura, las lecturas ya cargadas pueden mantenerse en caché y las escrituras muestran error/reintento; no se confirma una operación hasta recibir respuesta del servidor.

**¿PWA y APK son lo mismo?**  
No. La PWA/web móvil se ejecuta en el navegador y facilita la demo. El APK es un binario Android instalable generado desde el mismo proyecto Expo. El AAB es el formato para publicación en Play Store.

**¿Por qué Expo/React Native?**  
Permite compartir TypeScript, modelos y lógica de red, mantener builds Android/iOS y aprovechar APIs móviles sin duplicar por completo el equipo y la base de código.

### Calidad y datos clínicos

**¿La validación en móvil es suficiente?**  
No. Es una ayuda de UX. La API repite la validación, verifica rol/propiedad y rechaza campos extra antes de escribir en BD.

**¿Cómo evitan SQL injection?**  
Se usan Prisma o consultas parametrizadas; los valores no se concatenan como SQL ejecutable. Los esquemas limitan además tipo y formato.

**¿Cómo saben que el despliegue funciona?**  
CI prueba tipos, lint, Jest, migraciones sobre MySQL limpio, builds y contenedores. En producción `/api/health` valida proceso, `/api/ready` consulta BD y Blackbox prueba HTTPS desde Prometheus.

**¿La predicción reemplaza al médico?**  
No. Es apoyo a la detección y priorización de riesgo. El resultado debe interpretarse y validarse por personal clínico; no constituye diagnóstico autónomo.

## Preguntas que no deben responder con afirmaciones absolutas

| Evitar decir | Respuesta técnicamente correcta |
|---|---|
| “Es imposible hackearnos” | “Reducimos superficie y aplicamos defensa en profundidad; monitoreamos y corregimos riesgo residual.” |
| “Tenemos dos VPS” | “Tenemos dos capas lógicas y dos réplicas en un VPS; la separación física es la siguiente etapa.” |
| “JWT cifra los datos” | “JWT firma e identifica; HTTPS cifra el tránsito.” |
| “bcrypt cifra contraseñas” | “bcrypt genera un hash irreversible.” |
| “El firewall evita cualquier DDoS” | “Filtra puertos y algunos abusos; un DDoS volumétrico exige protección aguas arriba.” |
| “La IA diagnostica diabetes” | “La IA estima riesgo y apoya la decisión clínica.” |

## Plan B si falla Internet durante la exposición

1. Mostrar capturas y el reporte técnico local.
2. Ejecutar las pruebas unitarias y de seguridad desde el repositorio.
3. Mostrar `docker compose ... config` para explicar redes y servicios.
4. Usar un video corto previamente grabado del flujo móvil-web.
5. Aclarar que una falla de conectividad del aula no equivale a una caída verificada del VPS.

## Lista final de memorización

Cada integrante debe poder explicar en una frase:

- bcrypt frente a AES-GCM.
- access token frente a refresh token.
- 401 frente a 403.
- health frente a readiness.
- proxy inverso frente a balanceador.
- contenedor frente a servidor físico.
- Prometheus frente a Grafana.
- APK frente a AAB.
- validación cliente frente a validación servidor.
- caché frente a base de datos como fuente de verdad.

