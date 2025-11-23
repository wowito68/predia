# 🏥 Diabetes AI - Sistema de Predicción de Diabetes

Plataforma completa de predicción de diabetes basada en Machine Learning, con backend REST, frontend completo y base de datos MySQL.

## ✨ Características

- ✅ **24+ Endpoints REST** - API completa y documentada
- ✅ **Modelo ML** - 97.89% accuracy (757 muestras entrenamiento)
- ✅ **Frontend Completo** - Login, dashboard, gestión de pacientes
- ✅ **Autenticación JWT** - Tokens de 7 días
- ✅ **Control de Acceso** - Roles: Admin, Médico, Enfermero
- ✅ **Base de Datos** - 11 modelos relacionados
- ✅ **Auditoría** - Registro completo de acciones
- ✅ **Validación** - Validación de datos clínicos

## 🚀 Inicio Rápido

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar variables de entorno
cp .env.example .env.local

# 3. Iniciar servidor
pnpm dev

# 4. Acceder
# http://localhost:3000
# Usuario: admin_luis
# Contraseña: password123
```

## 📚 Documentación

**Empieza aquí:** [`INDEX.md`](./INDEX.md)

| Documento | Para | Tiempo |
|-----------|------|--------|
| **INICIO_RÁPIDO.md** | Setup en 5 minutos | 5 min |
| **REFERENCIA_TÉCNICA.md** | Endpoints y BD | 20 min |
| **GUÍA_TESTING.md** | Testing y ejemplos | 30 min |
| **DEPLOYMENT.md** | Producción | 30 min |
| **TROUBLESHOOTING.md** | Problemas | 5 min |
| **FIX_FECHA_MODIFICACION.md** | Fix de BD | 5 min |

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 15.2.4, React 19.0.0, TypeScript 5.9.3, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Base de Datos**: MySQL 10.11.13
- **ORM**: Prisma 5.20.0
- **Autenticación**: JWT, bcryptjs
- **Validación**: Zod
- **ML**: Modelo Python (97.89% accuracy)

## 📊 Endpoints Principales

```
POST   /api/auth/login              - Autenticación
GET    /api/usuarios                - Listar usuarios
POST   /api/usuarios                - Crear usuario
GET    /api/pacientes               - Listar pacientes
POST   /api/pacientes               - Crear paciente
POST   /api/predicciones/nueva      - Hacer predicción
GET    /api/predicciones/[id]       - Obtener predicción
```

Ver todos en [`REFERENCIA_TÉCNICA.md`](./REFERENCIA_TÉCNICA.md)

## 📊 Modelos de Base de Datos

- Rol
- Usuario
- Paciente
- Dirección
- EstudioLaboratorio
- MedicionAntropometrica
- Prediccion
- HistorialClinico
- Auditoria
- ModeloIA
- RelacionMedicaPaciente

## 🔐 Credenciales de Prueba

| Usuario | Rol | Contraseña |
|---------|-----|-----------|
| admin_luis | Administrador | password123 |
| dr_juan | Médico | password123 |
| enf_pedro | Enfermero | password123 |

## 🎯 Casos de Uso

### Crear Paciente y Predicción
1. Login en http://localhost:3000
2. Click en "Nuevo Paciente"
3. Llenar formulario
4. Ver predicción con factores de riesgo

### Usar API con cURL
```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin_luis","password":"password123"}' | \
  jq -r '.token')

# Crear paciente
curl -X POST http://localhost:3000/api/pacientes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"cedula":"123","nombre":"Juan","apellido_paterno":"Pérez","genero":"M","fecha_nacimiento":"1990-01-01"}'
```

## 🚨 Si Algo No Funciona

1. Revisa [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md)
2. Verifica MySQL está corriendo
3. Revisa logs en terminal (pnpm dev)
4. Abre consola del navegador (F12 → Console)

## 📞 Documentación Completa

- [`INDEX.md`](./INDEX.md) - Índice de documentación
- [`INICIO_RÁPIDO.md`](./INICIO_RÁPIDO.md) - Setup rápido
- [`REFERENCIA_TÉCNICA.md`](./REFERENCIA_TÉCNICA.md) - Endpoints y arquitectura
- [`GUÍA_TESTING.md`](./GUÍA_TESTING.md) - Testing
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) - Producción
- [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) - Solución de problemas

## 📝 Estado del Proyecto

✅ Backend: 100% funcional
✅ Frontend: 100% funcional
✅ Base de Datos: Completamente configurada
✅ ML Model: Integrado y funcionando
✅ Documentación: Exhaustiva
✅ Listo para: Desarrollo y Producción

## 🎉 ¡Comienza Ahora!

```bash
pnpm dev
# Visita http://localhost:3000
```
