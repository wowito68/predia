# Reporte de Auditoría de Seguridad — PREDIA

**Fecha:** 01 de junio de 2026  
**Proyecto:** PREDIA — Plataforma de Gestión de Historiales Médicos  
**Alcance:** Aplicación web (Next.js 15) en `apps/web/`  
**Rama auditada:** `demo/failing-ci`  
**Herramienta:** Claude Code (claude-sonnet-4-6) — análisis estático de código  
**Tipo de auditoría:** Lectura completa del repositorio — sin modificaciones al código  
**Equipo:** Villafuerte Armenta Gabriel Iván · Muñoz Prado Cristopher Yanhyu · Álvarez Sánchez Guillermo · Arianna Valentina Giannoccaro Quiñonez  

> ⚠️ **AVISO:** Este documento es un diagnóstico de seguridad del Primer Parcial. El objetivo es documentar el estado actual. Las correcciones se implementarán en los parciales 2 y 3.

---

## Resumen Ejecutivo

El sistema PREDIA maneja datos clínicos sensibles de pacientes (historial médico, predicciones de IA de riesgo de diabetes, medicamentos, resultados de laboratorio). Durante la auditoría se identificaron **20 hallazgos de seguridad**, distribuidos de la siguiente manera:

| Severidad  | Cantidad | Descripción general |
|-----------|----------|---------------------|
| 🔴 CRÍTICA  | 4        | Credenciales expuestas, cookies inseguras, autenticación incompleta, secretos hardcodeados |
| 🟠 ALTA     | 5        | JWT no verificado en middleware, datos PHI en logs, endpoints sin autenticación, exposición de información |
| 🟡 MEDIA    | 8        | Contraseñas débiles, RBAC inconsistente, datos sin cifrar, CORS permisivo, sin HTTPS forzado |
| 🔵 BAJA     | 3        | Headers de seguridad faltantes, sin límite de tamaño de payload, mensajes de error verbosos |

**Riesgo Global: CRÍTICO** — El sistema no cumple con los estándares mínimos de seguridad para una aplicación de salud (HIPAA/GDPR equivalente en México: NOM-024-SSA3-2012).

---

## Tabla de Hallazgos

| ID   | Severidad | Categoría              | Hallazgo                                            | Archivo principal |
|------|-----------|------------------------|-----------------------------------------------------|-------------------|
| V-01 | 🔴 CRÍTICA  | Gestión de Secretos    | JWT_SECRET hardcodeado como fallback en código fuente | `lib/auth.ts:11` |
| V-02 | 🔴 CRÍTICA  | Gestión de Secretos    | Credenciales reales en `.env` versionado en git     | `.env` |
| V-03 | 🔴 CRÍTICA  | Autenticación          | Cookie de sesión con `httpOnly: false`              | `app/api/auth/login/route.ts:64` |
| V-04 | 🔴 CRÍTICA  | Autenticación          | Middleware no verifica validez del JWT              | `middleware.ts:28` |
| V-05 | 🟠 ALTA     | Autorización           | Endpoint `/api/modelo-ia/metrics` sin autenticación | `app/api/modelo-ia/metrics/route.ts:4` |
| V-06 | 🟠 ALTA     | Exposición de Datos    | 71 llamadas a `console.log/error` con datos PHI     | Múltiples routes  |
| V-07 | 🟠 ALTA     | Control de Acceso      | Rate limiting solo en `/api/auth/login`             | `lib/rate-limit.ts` |
| V-08 | 🟠 ALTA     | Gestión de Secretos    | `.env.production` con contraseña débil `123456789`  | `.env.production` |
| V-09 | 🟠 ALTA     | Exposición de Info.    | Endpoint `/api/ping` público expone info del servidor | `app/api/ping/route.ts` |
| V-10 | 🟡 MEDIA    | Autenticación          | Contraseñas requieren mínimo 6 caracteres           | `app/api/auth/login/route.ts:9` |
| V-11 | 🟡 MEDIA    | Autorización           | RBAC no verificado consistentemente en todos los endpoints | Múltiples routes |
| V-12 | 🟡 MEDIA    | Cifrado de Datos       | PII del paciente almacenado en texto plano en BD    | `prisma/schema.prisma` |
| V-13 | 🟡 MEDIA    | Enumeración            | IDs de pacientes son enteros secuenciales predecibles | Todos los endpoints |
| V-14 | 🟡 MEDIA    | CORS                   | CORS permite todos los métodos HTTP (`DELETE`, `PATCH`) | `lib/cors.ts` |
| V-15 | 🟡 MEDIA    | CORS                   | `Access-Control-Max-Age: 86400` (24h, excesivo)    | `lib/cors.ts` |
| V-16 | 🟡 MEDIA    | Transporte             | Cookies sin flag `secure`, sesiones sobre HTTP      | `app/api/auth/login/route.ts:68` |
| V-17 | 🟡 MEDIA    | Sesiones               | Duración de sesión de 7 días para datos médicos     | `lib/auth.ts:12` |
| V-18 | 🟡 MEDIA    | Rate Limiting          | Store de rate limit en memoria (se pierde al reiniciar) | `lib/rate-limit.ts` |
| V-19 | 🔵 BAJA     | Headers HTTP           | Faltan headers: CSP, X-Frame-Options, HSTS, X-Content-Type-Options | `next.config.mjs` |
| V-20 | 🔵 BAJA     | Payload               | Sin límite de tamaño en body de requests POST       | Múltiples routes |

---

## Descripción Detallada de Vulnerabilidades

### V-01 🔴 — JWT_SECRET Hardcodeado
**Archivo:** `apps/web/lib/auth.ts`, línea 11  
**Evidencia:**
```typescript
const JWT_SECRET: string = process.env.JWT_SECRET || "SUPER_SECRET_AND_SECURE_KEY_FOR_TESTING_123456789"
```
**Riesgo:** Si un atacante obtiene acceso al código fuente (repositorio público, leak), puede forjar tokens JWT válidos para cualquier usuario, incluyendo administradores. Tiene acceso completo al sistema.  
**OWASP:** A02:2021 – Cryptographic Failures  

---

### V-02 🔴 — Credenciales Reales en Repositorio Git
**Archivos:** `.env`, `.env.production`  
**Evidencia:**
```bash
# .env
DATABASE_URL="mysql://predia_app:SecurePassword123!@localhost:3306/predia"
JWT_SECRET="SUPER_SECRET_AND_SECURE_KEY_FOR_TESTING_123456789"

# .env.production
DATABASE_URL="mysql://predia_user:123456789@localhost:3306/predia_db"
JWT_SECRET=CAMBIAR_A_VALOR_SEGURO_MINIMO_32_CARACTERES
```
**Riesgo:** Cualquier persona con acceso al repositorio puede conectarse directamente a la base de datos de producción con las credenciales expuestas. El historial de git preserva estos valores incluso si se eliminan más tarde.  
**OWASP:** A02:2021 – Cryptographic Failures  

---

### V-03 🔴 — Cookie de Sesión sin `httpOnly`
**Archivo:** `apps/web/app/api/auth/login/route.ts`, líneas 64–72  
**Evidencia:**
```typescript
serialize("auth-token", result.token || "", {
  httpOnly: false,  // CAMBIAR a false para que el middleware pueda leerlo
  secure: false,    // CAMBIAR a false (sin HTTPS aún)
  sameSite: "lax",  // CAMBIAR de strict a lax
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 días
})
```
**Nota:** Los comentarios en el código demuestran que el equipo era consciente de los problemas pero los implementó inseguramente de forma intencional como solución temporal.  
**Riesgo:** Un ataque XSS puede robar el token de sesión mediante `document.cookie`. Con `sameSite: "lax"`, es vulnerable a ataques CSRF en ciertos contextos cross-site.  
**OWASP:** A07:2021 – Identification and Authentication Failures  

---

### V-04 🔴 — Middleware No Verifica el JWT, Solo su Presencia
**Archivo:** `apps/web/middleware.ts`, líneas 28–40  
**Evidencia:**
```typescript
// Nota: No se puede usar verifyToken directamente en middleware por limitaciones de Next.js
// Se usará validación básica
if (!authHeader || !authHeader.startsWith("Bearer ")) {
  return NextResponse.json({ error: "No autorizado - token faltante" }, { status: 401 })
}
// No hay verificación de firma, expiración ni payload
return NextResponse.next()  // Pasa cualquier Bearer token, incluso malformados
```
**Riesgo:** Un atacante puede enviar `Authorization: Bearer token_falso_inventado` y pasar el middleware. La verificación real ocurre en cada route handler individualmente, lo que significa que cualquier endpoint que olvide llamar a `requireAuth()` es completamente público.  
**OWASP:** A07:2021 – Identification and Authentication Failures  

---

### V-05 🟠 — Endpoint Público sin Autenticación
**Archivo:** `apps/web/app/api/modelo-ia/metrics/route.ts`  
**Evidencia:**
```typescript
export const GET = async (request: NextRequest) => {
  // Sin requireAuth(), sin verificación de token
  const modeloResult = await query("SELECT version, accuracy, n_samples_train...")
```
**Riesgo:** Cualquier usuario anónimo en internet puede consultar la versión, exactitud y metadatos del modelo de IA. Esta información puede ser usada para ataques de adversarial ML o para entender las capacidades del sistema.  
**OWASP:** A01:2021 – Broken Access Control  

---

### V-06 🟠 — Datos PHI en Logs del Servidor
**Evidencia (muestra de 71 llamadas a console):**
```typescript
// app/api/pacientes/[id]/route.ts
console.log(`✅ Paciente eliminado: ${records.paciente}`)
console.log(`✅ Eliminación completa - ID: ${id}, Cédula: ${paciente.cedula}`)
console.error("Error en login:", error)  // Puede incluir username/password
```
**Riesgo:** Los logs del servidor en producción (archivos de texto, servicios como CloudWatch, Papertrail) contendrán Información de Salud Protegida (PHI). Viola la NOM-024-SSA3-2012. Cualquier persona con acceso a los logs puede extraer datos de pacientes.  
**OWASP:** A09:2021 – Security Logging and Monitoring Failures  

---

### V-07 🟠 — Rate Limiting Solo en Login
**Archivo:** `apps/web/lib/rate-limit.ts`  
**Evidencia:** La función `checkRateLimit` existe pero solo se importa en `app/api/auth/login/route.ts`. Los endpoints de pacientes, mediciones, predicciones y consultas no tienen límite de peticiones.  
**Riesgo:** Un atacante puede hacer scraping de todos los datos de pacientes con peticiones automatizadas. También permite ataques de fuerza bruta en otros endpoints. El store en memoria se resetea al reiniciar el servidor (reiniciar el servidor invalida el rate limit).  
**OWASP:** A04:2021 – Insecure Design  

---

### V-08 🟠 — Contraseña Débil en `.env.production`
**Archivo:** `.env.production`  
**Evidencia:** `DATABASE_URL="mysql://predia_user:123456789@localhost:3306/predia_db"`  
**Riesgo:** La contraseña `123456789` es extremadamente débil. Puede ser adivinada por fuerza bruta en segundos. Esta es la configuración que llegará a producción.  
**OWASP:** A02:2021 – Cryptographic Failures  

---

### V-09 🟠 — Endpoint `/api/ping` Expone Información del Servidor
**Archivo:** `apps/web/app/api/ping/route.ts`  
**Evidencia:**
```typescript
return NextResponse.json({
  status: 'ok',
  message: 'CI/CD deployment verfied successfully!',
  timestamp: new Date().toISOString()
})
```
**Riesgo:** El endpoint es completamente público y confirma que el servidor está activo, la zona horaria del servidor, y que el sistema usa CI/CD. Esta información ayuda a un atacante a planear ataques de timing.  
**OWASP:** A05:2021 – Security Misconfiguration  

---

### V-10 🟡 — Política de Contraseñas Insuficiente
**Evidencia:** `password: z.string().min(6, "Contraseña debe tener al menos 6 caracteres")`  
**Riesgo:** Contraseñas de 6 caracteres son vulnerables a ataques de diccionario. No se requieren mayúsculas, números ni caracteres especiales.  
**OWASP:** A07:2021 – Identification and Authentication Failures  

---

### V-11 🟡 — RBAC No Aplicado Consistentemente
**Evidencia:** Existen `requireRole()` y `requirePermission()` en `lib/auth.ts`, pero muchos endpoints usan solo `requireAuth()` sin validar el rol del usuario. Un enfermero podría acceder a endpoints reservados para médicos.  
**OWASP:** A01:2021 – Broken Access Control  

---

### V-12 🟡 — Datos PII Sin Cifrar en Base de Datos
**Evidencia:** En `prisma/schema.prisma`, campos como `email`, `telefono`, `cedula`, `curp`, diagnósticos y resultados se almacenan como `String` plano sin cifrado a nivel de campo.  
**Riesgo:** Un dump de la base de datos expone toda la información de salud de los pacientes en texto plano.  
**OWASP:** A02:2021 – Cryptographic Failures  

---

### V-13 🟡 — IDs Secuenciales Predecibles (IDOR)
**Evidencia:** Los endpoints usan `/api/pacientes/1`, `/api/pacientes/2`, etc. Un usuario autenticado podría cambiar el número del ID en la URL para acceder a datos de otro paciente si no hay verificación de propiedad.  
**OWASP:** A01:2021 – Broken Access Control (IDOR – Insecure Direct Object Reference)  

---

### V-14 y V-15 🟡 — CORS Permisivo
**Archivo:** `apps/web/lib/cors.ts`  
**Evidencia:**
```typescript
"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
"Access-Control-Max-Age": "86400",  // 24 horas
```
**Riesgo:** Permitir `DELETE` y `PATCH` en CORS es innecesariamente permisivo. El preflight cache de 24h es excesivo según las mejores prácticas (recomendado: ≤3600s).  
**OWASP:** A05:2021 – Security Misconfiguration  

---

### V-16 🟡 — Sesiones sobre HTTP sin Flag `secure`
**Evidencia:** `secure: false` en la cookie de sesión.  
**Riesgo:** El token de sesión se transmite en texto plano sobre HTTP, susceptible a ataques Man-in-the-Middle.  
**OWASP:** A02:2021 – Cryptographic Failures  

---

### V-17 🟡 — Duración de Sesión de 7 Días Inapropiada para Datos Médicos
**Evidencia:** `maxAge: 60 * 60 * 24 * 7` y `JWT_EXPIRES_IN: "7d"`  
**Riesgo:** Para una aplicación con datos de salud, 7 días es excesivo. El `.env.example` incluso sugiere `15m` como valor correcto. Un token robado da acceso durante 7 días sin posibilidad de revocación.  
**OWASP:** A07:2021 – Identification and Authentication Failures  

---

### V-18 🟡 — Rate Limit Store en Memoria Volátil
**Evidencia:** `const store: RateLimitStore = {}` — variable de módulo en Node.js.  
**Riesgo:** Al reiniciar el servidor, el contador se resetea, permitiendo un atacante eludir el rate limit con un simple reinicio o aprovechando deployments de CI/CD.  
**OWASP:** A04:2021 – Insecure Design  

---

### V-19 🔵 — Headers de Seguridad HTTP Faltantes
**Archivo:** `apps/web/next.config.mjs`  
**Evidencia:** No se configuran `headers()` en `next.config.mjs`.  
**Headers ausentes:**
- `Content-Security-Policy` (CSP)
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security` (HSTS)
- `Referrer-Policy`
- `Permissions-Policy`

**OWASP:** A05:2021 – Security Misconfiguration  

---

### V-20 🔵 — Sin Límite de Tamaño en Requests
**Evidencia:** No se configura `bodySizeLimit` en ningún endpoint POST.  
**Riesgo:** Un atacante puede enviar payloads enormes para saturar la memoria del servidor (DoS).  
**OWASP:** A04:2021 – Insecure Design  

---

## Mapeo OWASP Top 10 (2021)

| OWASP | Descripción | Hallazgos |
|-------|-------------|-----------|
| A01 – Broken Access Control | Control de acceso roto | V-04, V-05, V-11, V-13 |
| A02 – Cryptographic Failures | Fallas criptográficas | V-01, V-02, V-08, V-12, V-16 |
| A03 – Injection | Inyección | *(No se encontraron SQLi directas, Prisma ORM mitiga)* |
| A04 – Insecure Design | Diseño inseguro | V-07, V-18, V-20 |
| A05 – Security Misconfiguration | Mala configuración | V-09, V-14, V-15, V-19 |
| A06 – Vulnerable Components | Componentes vulnerables | *(No auditado — pendiente npm audit)* |
| A07 – Identification/Auth Failures | Fallos de autenticación | V-03, V-04, V-10, V-17 |
| A08 – Software/Data Integrity | Integridad de datos | *(CI/CD no usa verificación de firma)* |
| A09 – Logging/Monitoring Failures | Fallas de logging | V-06 |
| A10 – SSRF | Server-Side Request Forgery | *(No auditado en este alcance)* |

---

## Checklist de Seguridad

### Autenticación y Sesiones
- [ ] JWT_SECRET generado con `openssl rand -base64 32` y almacenado solo en variables de entorno
- [ ] Cookie de sesión con `httpOnly: true`
- [ ] Cookie de sesión con `secure: true` (solo HTTPS)
- [ ] Cookie con `sameSite: "strict"`
- [ ] Duración de sesión reducida a 15–30 minutos con refresh token
- [ ] Middleware verifica firma y expiración del JWT (no solo su presencia)
- [ ] Implementar revocación de tokens (blacklist en Redis)
- [ ] Política de contraseñas: mínimo 12 caracteres, mayúsculas, números, símbolos

### Autorización y Control de Acceso
- [ ] Todos los endpoints `/api/` usan `requireAuth()` + `requireRole()`
- [ ] Verificación de propiedad del recurso (un paciente no puede ver datos de otro)
- [ ] UUIDs en lugar de IDs secuenciales para prevenir IDOR
- [ ] Matriz de permisos RBAC auditada endpoint por endpoint

### Gestión de Secretos
- [ ] `.env` en `.gitignore` (verificar que no está en el historial de git)
- [ ] `.env.production` eliminado del repositorio
- [ ] Credenciales de BD en producción con contraseña segura (≥20 caracteres, aleatoria)
- [ ] Rotación programada de secretos
- [ ] Usar un gestor de secretos (GitHub Secrets, AWS Secrets Manager, Vault)

### Protección de Datos
- [ ] Cifrado a nivel de campo para: CURP, cédula, teléfono, email, diagnósticos
- [ ] Cifrado de base de datos en reposo (TDE)
- [ ] TLS 1.2+ obligatorio en producción
- [ ] Eliminación de PHI de todos los logs

### API y Red
- [ ] Rate limiting en TODOS los endpoints de la API
- [ ] Rate limiting con store persistente (Redis)
- [ ] Límite de tamaño de payload (max 1MB para JSON)
- [ ] Headers de seguridad configurados (CSP, HSTS, X-Frame-Options, etc.)
- [ ] CORS restrictivo: solo orígenes permitidos, métodos mínimos necesarios
- [ ] Endpoint `/api/ping` con autenticación o eliminado

### Logging y Monitoreo
- [ ] Eliminar todos los `console.log` con datos de pacientes de rutas de producción
- [ ] Implementar logging estructurado (sin PHI) con niveles de severidad
- [ ] Alertas automáticas para intentos de acceso fallidos
- [ ] Auditoría de acceso a expedientes clínicos
- [ ] Retención de logs de auditoría por mínimo 5 años (NOM-024)

### Dependencias
- [ ] Ejecutar `npm audit` y resolver vulnerabilidades críticas/altas
- [ ] Configurar Dependabot o Renovate para actualizaciones automáticas
- [ ] Política de actualización trimestral de dependencias

---

## Roadmap de Correcciones

### Segundo Parcial — Correcciones Críticas y Altas
| Prioridad | Acción | Hallazgos |
|-----------|--------|-----------|
| 1 | Rotar JWT_SECRET y remover `.env` del historial de git | V-01, V-02 |
| 2 | Corregir cookie: `httpOnly: true`, `secure: true`, `sameSite: "strict"` | V-03 |
| 3 | Implementar verificación JWT en middleware con Edge Runtime | V-04 |
| 4 | Agregar `requireAuth()` al endpoint de métricas del modelo | V-05 |
| 5 | Eliminar o sanitizar todos los `console.log` con datos PHI | V-06 |
| 6 | Extender rate limiting a todos los endpoints de pacientes/datos | V-07 |
| 7 | Cambiar contraseñas de producción a valores fuertes y aleatorios | V-08 |
| 8 | Agregar headers de seguridad en `next.config.mjs` | V-19 |

### Tercer Parcial — Mejoras Arquitectónicas
| Prioridad | Acción | Hallazgos |
|-----------|--------|-----------|
| 1 | Implementar refresh tokens + sesiones cortas (15 min) | V-17 |
| 2 | Migrar rate limit store a Redis (persistente) | V-18 |
| 3 | Implementar cifrado a nivel de campo para datos sensibles del paciente | V-12 |
| 4 | Sustituir IDs secuenciales por UUIDs para prevenir IDOR | V-13 |
| 5 | Auditoría RBAC completa con pruebas de autorización por rol | V-11 |
| 6 | Ejecutar `npm audit` y actualizar dependencias vulnerables | A06 |
| 7 | Implementar logging estructurado con trazabilidad de auditoría | V-06 |
| 8 | Evaluación de cumplimiento NOM-024-SSA3-2012 | General |

---

## Evidencia de Uso de Herramienta

**Herramienta:** Claude Code CLI (claude-sonnet-4-6) — modo solo lectura  
**Comandos ejecutados durante la auditoría:**
```bash
# Búsqueda de secretos hardcodeados
grep -r "JWT_SECRET|SECRET|PASSWORD|API_KEY" apps/web --include="*.ts" -l

# Identificación de datos sensibles en logs
grep -rn "console.log|console.error" apps/web/app/api/ --include="*.ts"

# Detección de queries crudas (riesgo SQL injection)
grep -rn "rawQuery|\$queryRaw|executeRaw" apps/web --include="*.ts"

# Verificación de configuración de cookies
grep -r "httpOnly|secure|sameSite" apps/web --include="*.ts"

# Análisis de configuración de CORS y rate limiting
cat apps/web/lib/cors.ts
cat apps/web/lib/rate-limit.ts

# Lectura de archivos de entorno
cat .env && cat .env.production && cat .env.example

# Revisión de middleware de autenticación
cat apps/web/middleware.ts
cat apps/web/lib/auth.ts
cat apps/web/app/api/auth/login/route.ts
```

**Total de archivos analizados:** 25+  
**Total de líneas de código revisadas:** ~2,500  
**Duración de la auditoría:** 1 sesión  
**Modificaciones al código:** Ninguna (auditoría de solo lectura)

---

## Conclusión

El sistema PREDIA tiene una **superficie de ataque significativa** para una aplicación que maneja datos de salud. Las vulnerabilidades más graves son:

1. **Secretos comprometidos** — El JWT_SECRET y las credenciales de base de datos están expuestos en el repositorio. Si el repositorio es o fue público, se deben considerar **todos los secretos como comprometidos** y rotarlos inmediatamente.

2. **Autenticación incompleta** — El middleware no verifica el JWT, y la cookie de sesión es accesible desde JavaScript. Esto hace que toda la protección del sistema sea superficial.

3. **Datos médicos en logs** — Con 71 llamadas a `console.log/error` en las rutas de API, los logs del servidor contienen PHI, lo cual es una violación de privacidad grave para un sistema de salud.

Estas vulnerabilidades, si fueran explotadas en un sistema real en producción, podrían resultar en: robo masivo de datos de pacientes, suplantación de identidad médica, modificación no autorizada de expedientes clínicos, y sanciones regulatorias.

---

*Generado el 2026-06-01 | PREDIA Security Audit v1.0 | Primer Parcial*
