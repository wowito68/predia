# Diabetes AI - Sistema de Predicción de Diabetes

Plataforma completa de predicción de diabetes basada en Machine Learning, con backend REST, frontend completo y base de datos MySQL.

## Características

- **Gestión Clínica Completa**:
  - **Agenda Médica**: Gestión de citas y disponibilidad.
  - **Historial Clínico**: Antecedentes, alergias, vacunas, patologías y fracturas.
  - **Consultas y Recetas**: Registro detallado de consultas y generación de recetas médicas.
  - **Documentos**: Gestión de archivos y estudios adjuntos.
- **Tecnología Avanzada**:
  - **Dictado por Voz**: Transcripción automática para notas clínicas y campos de texto.
  - **PWA (Progressive Web App)**: Soporte para instalación y funcionamiento offline.
  - **Sincronización Offline**: Capacidad de trabajo sin conexión con sincronización automática.
- **Dashboard Interactivo**: Widgets de signos vitales, acciones rápidas, alertas recientes y resumen crítico del paciente.
- **24+ Endpoints REST**: API completa y documentada.
- **Modelo ML**: 97.89% accuracy (757 muestras entrenamiento).
- **Seguridad**: Autenticación JWT, control de acceso basado en roles (Admin, Médico, Enfermero) y auditoría completa.

## Inicio Rápido

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar entorno (Script unificado)
./setup.sh

# 3. Iniciar servidor
pnpm dev

# 4. Acceder
# http://localhost:3000
# Usuario: admin_luis
# Contraseña: password123
```

## Documentación

**Empieza aquí:** [`INDEX.md`](./INDEX.md)

| Documento | Para | Tiempo |
|-----------|------|--------|
| **INICIO_RÁPIDO.md** | Setup en 5 minutos | 5 min |
| **REFERENCIA_TÉCNICA.md** | Endpoints y BD | 20 min |
| **GUÍA_TESTING.md** | Testing y ejemplos | 30 min |
| **DEPLOYMENT.md** | Producción | 30 min |
| **TROUBLESHOOTING.md** | Problemas | 5 min |

## Stack Tecnológico

- **Frontend**: Next.js 15.2.4, React 19.0.0, TypeScript 5.9.3, Tailwind CSS.
- **Características**: PWA, Web Speech API (Dictado).
- **Backend**: Next.js API Routes, Node.js.
- **Base de Datos**: MySQL 10.11.13, Prisma 5.20.0.
- **Seguridad**: JWT, bcryptjs, Zod (validación).
- **ML**: Modelo Python (97.89% accuracy).

## Endpoints Principales

```
POST   /api/auth/login              - Autenticación
GET    /api/agenda                  - Gestión de citas
GET    /api/pacientes/[id]/historial - Historial completo
POST   /api/consultas               - Registrar consulta
POST   /api/recetas                 - Generar receta
POST   /api/voice/transcribe        - Transmisión de voz a texto
POST   /api/predicciones/nueva      - Hacer predicción de riesgos
```

Ver todos en [`REFERENCIA_TÉCNICA.md`](./REFERENCIA_TÉCNICA.md)

## Modelos de Base de Datos

- **Usuarios y Roles**: Autenticación y permisos.
- **Pacientes**: Información demográfica y clínica base.
- **Historial**: Antecedentes, Alergias, Vacunas, Patologías, Fracturas.
- **Atención**: Consultas, Recetas, Signos Vitales.
- **Archivos**: Documentos e Imágenes.
- **IA**: Predicciones y Modelos.

## Credenciales de Prueba

| Usuario | Rol | Contraseña |
|---------|-----|-----------|
| admin_luis | Administrador | password123 |
| dr_juan | Médico | password123 |
| enf_pedro | Enfermero | password123 |

## Casos de Uso

### Crear Paciente y Predicción
1. Login en http://localhost:3000
2. Click en "Nuevo Paciente"
3. Llenar formulario
4. Ver predicción con factores de riesgo

### Usar Dictado por Voz
1. En cualquier campo de texto grande (ej. "Motivo de Consulta").
2. Click en el icono de micrófono.
3. Hablar para transcribir automáticamente.

## Si Algo No Funciona

1. Revisa [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md)
2. Verifica que MySQL esté corriendo.
3. Revisa logs en terminal (`pnpm dev`).
