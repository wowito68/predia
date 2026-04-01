<p align="center">
  <img src="public/favicon.png" alt="PREDIA Logo" width="120" />
</p>

<h1 align="center">PREDIA</h1>
<p align="center">
  <strong>Sistema Clínico Inteligente para Diagnóstico Temprano de Diabetes</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15.2.4-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.0.0-61DAFB?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.9.3-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Prisma-5.20.0-2D3748?style=flat-square&logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/MySQL-10.11-4479A1?style=flat-square&logo=mysql&logoColor=white" alt="MySQL" />
  <img src="https://img.shields.io/badge/ML_Accuracy-97.89%25-success?style=flat-square" alt="ML Accuracy" />
  <img src="https://img.shields.io/badge/License-Private-red?style=flat-square" alt="License" />
</p>

<p align="center">
  Plataforma integral de gestión clínica con predicción de riesgo de diabetes basada en Machine Learning, expediente clínico electrónico (EHR), automatización con n8n, dictado por voz y soporte offline como PWA.
</p>

---

## 📑 Tabla de Contenidos

- [Características](#-características)
- [Arquitectura del Sistema](#-arquitectura-del-sistema)
- [Stack Tecnológico](#-stack-tecnológico)
- [Modelo de Machine Learning](#-modelo-de-machine-learning)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Modelo de Base de Datos](#-modelo-de-base-de-datos)
- [Referencia de API](#-referencia-de-api)
- [Inicio Rápido](#-inicio-rápido)
- [Configuración de Variables de Entorno](#-configuración-de-variables-de-entorno)
- [Despliegue](#-despliegue)
- [Automatización con n8n](#-automatización-con-n8n)
- [Credenciales de Prueba](#-credenciales-de-prueba)
- [Casos de Uso](#-casos-de-uso)
- [Solución de Problemas](#-solución-de-problemas)

---

## ✨ Características

### 🏥 Gestión Clínica Completa (EHR)
- **Expediente Clínico Electrónico**: Historial completo integrado por paciente.
- **Consultas Médicas**: Registro detallado con motivo, síntomas, exploración física, diagnóstico y tratamiento.
- **Recetas Digitales**: Generación y gestión de recetas médicas con datos estructurados (medicamento, dosis, frecuencia, duración).
- **Agenda Médica**: Gestión de citas con calendario interactivo.
- **Signos Vitales**: Registro de mediciones antropométricas (peso, altura, IMC, presión arterial, circunferencia cintura/cadera).
- **Estudios de Laboratorio**: Registro de resultados bioquímicos (urea, creatinina, HbA1c, perfil lipídico completo).

### 📋 Historial Clínico Avanzado
- **Antecedentes Familiares**: Registro de condiciones hereditarias por parentesco.
- **Alergias**: Tipo, alérgeno, severidad y reacción registrados.
- **Vacunas**: Catálogo de vacunas con control de dosis y lotes aplicados.
- **Patologías**: Diagnósticos con codificación CIE-10, estado y severidad.
- **Fracturas**: Seguimiento de fracturas con hueso afectado, tipo, lado y estado del tratamiento.
- **Imágenes Diagnósticas**: Radiografías, ultrasonidos con informes y hallazgos.
- **Documentos Adjuntos**: Gestión de archivos (resultados externos, consentimientos, etc.).

### 🤖 Inteligencia Artificial
- **Predicción de Riesgo de Diabetes**: Modelo de Regresión Logística con **97.89% de accuracy**.
- **11 Variables Clínicas**: Género, edad, urea, creatinina, HbA1c, colesterol, triglicéridos, HDL, LDL, VLDL e IMC.
- **Criterios Clínicos ADA 2024**: HbA1c ≥6.5% = Diabetes confirmada, independiente del modelo.
- **Factores de Riesgo Identificados**: Análisis detallado con niveles de severidad (🔴🟠🟡).
- **Recomendaciones Personalizadas**: Generación automática basada en resultados clínicos.

### 🎙️ Dictado por Voz
- Transcripción automática con **Web Speech API**.
- Integrado en campos de texto grandes (motivo de consulta, observaciones, etc.).
- Activación con icono de micrófono.

### 📱 Progressive Web App (PWA)
- Instalable en dispositivos móviles y escritorio.
- **Service Worker** con Workbox para cacheo inteligente.
- Soporte para funcionamiento **offline** con sincronización automática.

### 🔐 Seguridad
- **Autenticación JWT** con tokens de acceso y refresco.
- **Control de acceso basado en roles** (RBAC): Administrador, Médico, Enfermero.
- **Middleware de protección** en rutas frontend y API.
- **Auditoría completa** de acciones por usuario con timestamps.
- **Validación de datos** con Zod en backend.
- Cifrado de contraseñas con **bcryptjs**.

### 📊 Dashboard Interactivo
- **Widgets de signos vitales** con gráficas Recharts.
- **Acciones rápidas** de navegación.
- **Alertas recientes** y resumen crítico del paciente.
- **Estadísticas en tiempo real**.

### ⚙️ Automatización (n8n)
- **6 flujos de trabajo** preconfigurados:
  - Recordatorio de citas diarias por email.
  - Monitoreo de salud del sistema.
  - Reportes diarios automáticos.
  - Revisión de código con IA.
  - Alertas de signos vitales.
  - Flujo principal de Predia.

### 📄 Generación de PDF
- Recetas médicas en PDF con datos de médico y paciente.
- Notas de consulta impresas con `react-to-print`.
- Exportación de datos con `jsPDF` y `jspdf-autotable`.

---

## 🏗 Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                       FRONTEND                          │
│  Next.js 15 (App Router) + React 19 + TypeScript        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │Dashboard │ │Pacientes │ │ Agenda   │ │Predicciones│ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │Historial │ │Consultas │ │ Recetas  │ │ Documentos │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘ │
│                                                         │
│  UI: Radix UI + Tailwind CSS + Lucide Icons             │
│  Estado: Zustand + TanStack React Query                 │
│  Formularios: React Hook Form + Zod                     │
│  Voz: Web Speech API (hook personalizado)               │
│  PWA: next-pwa + Workbox Service Worker                 │
├─────────────────────────────────────────────────────────┤
│                    API LAYER (37 Rutas)                  │
│  Next.js API Routes (App Router)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │Auth/JWT  │ │CRUD Ops  │ │ML Predict│ │Voice Trans.│ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘ │
│  Middleware: Auth Guard + Rate Limiting + CORS           │
│  Validación: Zod schemas + Medical validation            │
├─────────────────────────────────────────────────────────┤
│                    DATA LAYER                            │
│  ┌─────────────┐    ┌────────────────────┐              │
│  │ Prisma ORM  │───▶│ MySQL (MariaDB)    │              │
│  │ 20+ Modelos │    │ 20+ Tablas         │              │
│  └─────────────┘    └────────────────────┘              │
│  ┌─────────────────────────────────────────┐            │
│  │ ML Model (Regresión Logística en TS)    │            │
│  │ Coeficientes embebidos + StandardScaler │            │
│  └─────────────────────────────────────────┘            │
├─────────────────────────────────────────────────────────┤
│                  INFRAESTRUCTURA                         │
│  Docker (multi-stage) │ PM2 │ Nginx │ n8n               │
│  Podman compatible    │ HTTPS/SSL  │ AWS EC2             │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠 Stack Tecnológico

| Categoría | Tecnología | Versión |
|-----------|-----------|---------|
| **Framework** | Next.js (App Router) | 15.2.4 |
| **UI Library** | React | 19.0.0 |
| **Lenguaje** | TypeScript | 5.9.3 |
| **Estilos** | Tailwind CSS | 4.1.17 |
| **Componentes UI** | Radix UI | Múltiples |
| **Iconos** | Lucide React | 0.454.0 |
| **ORM** | Prisma | 5.20.0 |
| **Base de Datos** | MySQL / MariaDB | 10.11+ |
| **Autenticación** | jsonwebtoken + bcryptjs | 9.0.2 / 3.0.3 |
| **Validación** | Zod | 3.25.76 |
| **Estado Global** | Zustand | 5.0.12 |
| **Data Fetching** | TanStack React Query | 5.96.0 |
| **Formularios** | React Hook Form | 7.60.0 |
| **Gráficas** | Recharts | 2.15.4 |
| **PDF** | jsPDF + @react-pdf/renderer | 3.0.4 / 4.3.2 |
| **Drag & Drop** | @dnd-kit | 6.3.1 |
| **Notificaciones** | Sonner | 1.7.4 |
| **PWA** | next-pwa + Workbox | 5.6.0 |
| **Temas** | next-themes | 0.4.6 |
| **Automatización** | n8n | latest |
| **Containerización** | Docker / Podman | - |
| **Process Manager** | PM2 | - |

---

## 🧠 Modelo de Machine Learning

### Especificaciones del Modelo

| Parámetro | Valor |
|-----------|-------|
| **Algoritmo** | Regresión Logística (Logistic Regression) |
| **Accuracy** | 97.89% (98.42% en versión embebida) |
| **Precision** | 100% |
| **Recall** | 98.22% |
| **AUC-ROC** | 99.75% |
| **Muestras de Entrenamiento** | 757 |
| **Muestras de Prueba** | 190 |
| **Fecha de Entrenamiento** | 2024-11-23 |

### Variables de Entrada (Features)

| # | Feature | Descripción | Importancia |
|---|---------|-------------|-------------|
| 1 | `BMI` | Índice de Masa Corporal | **2.8687** (más alto) |
| 2 | `HbA1c` | Hemoglobina glicosilada (%) | **2.3632** |
| 3 | `TG` | Triglicéridos (mmol/L) | 0.9613 |
| 4 | `Chol` | Colesterol total (mmol/L) | 0.9543 |
| 5 | `Gender` | Género (0=F, 1=M) | 0.3184 |
| 6 | `HDL` | Lipoproteína alta densidad | 0.2918 |
| 7 | `AGE` | Edad (años) | 0.2294 |
| 8 | `VLDL` | Lipoproteína muy baja densidad | 0.2250 |
| 9 | `Urea` | Urea (mg/dL) | 0.1098 |
| 10 | `LDL` | Lipoproteína baja densidad | 0.0477 |
| 11 | `Cr` | Creatinina (mg/dL) | -0.0432 |

### Pipeline de Predicción

```
Datos del Paciente → Validación → StandardScaler (z-score) → Regresión Logística
                                                                     ↓
                                         ┌───────────────────────────────────────┐
                                         │  Criterios Clínicos ADA 2024         │
                                         │  HbA1c ≥6.5% → Diabetes Confirmada  │
                                         │  HbA1c 5.7-6.4% → Prediabetes      │
                                         │  + Probabilidad del modelo           │
                                         └───────────────────────────────────────┘
                                                                     ↓
                                          Resultado + Nivel de Riesgo + Factores
                                          + Recomendaciones Personalizadas
```

> **Nota**: El modelo está implementado nativamente en TypeScript (`lib/ml-predict.ts`) con los coeficientes y parámetros del StandardScaler embebidos. No requiere Python ni dependencias externas para inferencia.

---

## 📁 Estructura del Proyecto

```
predia/
├── app/                          # Next.js App Router
│   ├── api/                      # 37 API Routes
│   │   ├── agenda/               # Gestión de citas
│   │   ├── alergias/             # CRUD alergias
│   │   ├── antecedentes/         # Antecedentes familiares
│   │   ├── auth/                 # Login, logout, me
│   │   ├── catalogos/            # Catálogos dinámicos
│   │   ├── consultas/            # Consultas médicas
│   │   ├── dashboard/            # Stats y recientes
│   │   ├── documentos/           # Archivos adjuntos
│   │   ├── estudios/             # Estudios de laboratorio
│   │   ├── fracturas/            # Registro de fracturas
│   │   ├── historial/            # Historial clínico
│   │   ├── imagenes/             # Imágenes diagnósticas
│   │   ├── mediciones/           # Mediciones antropométricas
│   │   ├── modelo-ia/            # Métricas del modelo
│   │   ├── pacientes/            # CRUD pacientes + búsqueda
│   │   ├── patologias/           # Patologías CIE-10
│   │   ├── plantillas/           # Plantillas de documentos
│   │   ├── predicciones/         # Predicciones de diabetes
│   │   ├── recetas/              # Recetas médicas
│   │   ├── usuarios/             # Gestión de usuarios
│   │   ├── v2/                   # API v2 (expediente clínico)
│   │   ├── vacunas/              # Vacunas + catálogo
│   │   └── voice/                # Transcripción de voz
│   ├── agenda/                   # Página de agenda
│   ├── ayuda/                    # Página de ayuda
│   ├── configuracion/            # Configuración
│   ├── dashboard/                # Dashboard principal
│   ├── historial/                # Vista de historial
│   ├── login/                    # Autenticación
│   ├── nuevo-paciente/           # Formulario nuevo paciente
│   ├── pacientes/                # Lista y detalle pacientes
│   ├── resultado/                # Resultado de predicción
│   ├── layout.tsx                # Layout raíz
│   ├── page.tsx                  # Página principal (login)
│   ├── providers.tsx             # React Query + Theme Provider
│   └── globals.css               # Estilos globales
├── components/                   # Componentes React
│   ├── dashboard/                # Widgets del dashboard
│   ├── pdf/                      # Generación de PDFs
│   ├── predictions/              # Componentes de predicción
│   ├── ui/                       # Componentes Radix UI (shadcn)
│   ├── dashboard-layout.tsx      # Layout con sidebar
│   ├── medical-header.tsx        # Header clínico
│   ├── new-consultation-modal.tsx # Modal de nueva consulta
│   ├── patient-critical-summary.tsx # Resumen crítico
│   ├── prediction-result.tsx     # Resultado de predicción
│   ├── sidebar.tsx               # Barra lateral de navegación
│   └── vital-signs-chart.tsx     # Gráfica de signos vitales
├── hooks/                        # Custom hooks
│   └── use-dictation.ts          # Hook de dictado por voz
├── lib/                          # Lógica de negocio
│   ├── emails/                   # Templates de email
│   ├── validations/              # Schemas de validación Zod
│   ├── api-client.ts             # Cliente HTTP
│   ├── audit.ts                  # Sistema de auditoría
│   ├── auth.ts                   # JWT, verificación, roles
│   ├── cors.ts                   # Configuración CORS
│   ├── db.ts                     # Conexión MySQL (mysql2)
│   ├── logger.ts                 # Sistema de logging
│   ├── medical-validation.ts     # Validaciones médicas
│   ├── ml-predict.ts             # ⭐ Modelo ML embebido en TS
│   ├── offline-sync.ts           # Sincronización offline
│   ├── prisma.ts                 # Cliente Prisma singleton
│   ├── rate-limit.ts             # Rate limiting
│   ├── utils.ts                  # Utilidades generales
│   └── validation.ts             # Validación general
├── models/                       # Artefactos del modelo ML
│   ├── modelo_diabetes.pkl       # Modelo serializado (Python)
│   ├── scaler_diabetes.pkl       # StandardScaler serializado
│   ├── gender_encoder.pkl        # Label Encoder
│   └── modelo_metadata.json      # Metadata del modelo
├── prisma/                       # Configuración de BD
│   ├── migrations/               # Historial de migraciones
│   ├── schema.prisma             # Schema completo (20+ modelos)
│   └── seed.ts                   # Datos semilla
├── public/                       # Archivos estáticos
│   ├── manifest.json             # PWA manifest
│   ├── sw.js                     # Service Worker
│   └── workbox-*.js              # Workbox runtime
├── scripts/                      # Scripts de utilidad
│   ├── predia_database.sql       # Schema SQL completo
│   ├── seed-usuarios.sql         # Usuarios iniciales
│   ├── insert_modelo_ia.sql      # Datos del modelo IA
│   ├── crear-usuarios.sh         # Script crear usuarios
│   ├── generate-hashes.js        # Generar hashes bcrypt
│   └── test-crud-pacientes.sh    # Tests CRUD por curl
├── store/                        # Estado global
│   └── useConsultaStore.ts       # Store Zustand (consultas)
├── types/                        # Tipos TypeScript
│   ├── database.ts               # Tipos de la BD
│   ├── api.ts                    # Tipos de API
│   └── route-context.ts          # Contexto de rutas
├── n8n-workflow-*.json           # 6 flujos de trabajo n8n
├── docker-compose.yml            # Docker: App + n8n
├── podman-compose.yml            # Podman alternativo
├── Dockerfile                    # Multi-stage build
├── ecosystem.config.js           # PM2 config (producción)
├── Makefile                      # Atajos Docker/Podman
├── middleware.ts                 # Auth guard global
├── setup.sh                      # Script de setup
├── setup-https.sh                # Configurar SSL
├── deploy-ec2.sh                 # Deploy a AWS EC2
├── setup-database.sql            # Crear BD y usuario
└── tailwind.config.ts            # Config Tailwind CSS
```

---

## 🗄 Modelo de Base de Datos

El schema de Prisma define **20+ modelos** organizados en los siguientes módulos:

### Módulo Central

| Modelo | Descripción |
|--------|-------------|
| `Rol` | Roles del sistema (Admin, Médico, Enfermero) |
| `Usuario` | Usuarios con credenciales, especialidad y cédula profesional |
| `Paciente` | Datos demográficos, contacto de emergencia, seguro médico |
| `Direccion` | Dirección del paciente |

### Módulo Clínico

| Modelo | Descripción |
|--------|-------------|
| `ConsultaMedica` | Consultas con motivo, síntomas, exploración, diagnóstico y tratamiento |
| `Receta` | Recetas con medicamentos (JSON), instrucciones y estado |
| `MedicionAntropometrica` | Peso, altura, IMC, presión arterial, circunferencias |
| `EstudioLaboratorio` | Resultados bioquímicos (urea, creatinina, HbA1c, perfil lipídico) |
| `HistorialClinico` | Eventos clínicos generales |

### Módulo de Historial

| Modelo | Descripción |
|--------|-------------|
| `Alergia` | Tipo, alérgeno, severidad y reacción |
| `AntecedenteFamiliar` | Condiciones hereditarias por parentesco |
| `VacunaAplicada` + `CatalogoVacuna` | Vacunas aplicadas con control de dosis |
| `PatologiaPaciente` + `CatalogoPatologia` | Patologías con código CIE-10 |
| `Fractura` | Fracturas con tipo, hueso, lado y estado |
| `ImagenDiagnostica` | Imágenes con informe y hallazgos |
| `DocumentoAdjunto` | Archivos adjuntos (LongBlob o URL) |

### Módulo de IA

| Modelo | Descripción |
|--------|-------------|
| `ModeloIA` | Versiones del modelo con accuracy y features |
| `Prediccion` | Predicciones con resultado, probabilidad, factores y recomendaciones |

### Módulo EHR Avanzado

| Modelo | Descripción |
|--------|-------------|
| `Plantilla` | Plantillas de consulta, receta y notas |
| `CatalogoMedicamento` | Catálogo dinámico de medicamentos |
| `CatalogoAlergia` | Catálogo dinámico de alérgenos |
| `auditoria` | Registro de acciones del sistema |

---

## 📡 Referencia de API

La API cuenta con **37 rutas** organizadas por módulo. Todas las rutas (excepto auth) requieren token JWT en el header `Authorization: Bearer <token>`.

### 🔑 Autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Iniciar sesión (retorna JWT) |
| `POST` | `/api/auth/logout` | Cerrar sesión |
| `GET` | `/api/auth/me` | Obtener usuario autenticado |

### 👤 Usuarios

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/usuarios` | Listar usuarios |
| `POST` | `/api/usuarios` | Crear usuario |
| `GET/PUT/DELETE` | `/api/usuarios/[id]` | CRUD por ID |

### 🏥 Pacientes

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/pacientes` | Listar pacientes |
| `POST` | `/api/pacientes` | Crear paciente |
| `GET/PUT/DELETE` | `/api/pacientes/[id]` | CRUD por ID |
| `GET` | `/api/pacientes/buscar` | Buscar pacientes |
| `DELETE` | `/api/pacientes/[id]/eliminar-completo` | Eliminación completa (cascada) |

### 📅 Agenda

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET/POST` | `/api/agenda` | Listar / Crear citas |

### 📝 Consultas y Recetas

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET/POST` | `/api/consultas` | Listar / Crear consultas |
| `GET/POST` | `/api/recetas` | Listar / Crear recetas |

### 📋 Historial Clínico

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/historial/[pacienteId]` | Historial completo del paciente |
| `GET/POST` | `/api/alergias` | Gestión de alergias |
| `GET/POST` | `/api/antecedentes` | Antecedentes familiares |
| `GET/POST` | `/api/vacunas` | Vacunas aplicadas |
| `GET` | `/api/vacunas/catalogo` | Catálogo de vacunas |
| `GET/POST` | `/api/patologias` | Patologías diagnosticadas |
| `GET` | `/api/patologias/catalogo` | Catálogo CIE-10 |
| `GET/POST` | `/api/fracturas` | Registro de fracturas |
| `GET/POST` | `/api/imagenes` | Imágenes diagnósticas |
| `GET/POST` | `/api/documentos` | Documentos adjuntos |

### 📊 Mediciones y Estudios

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET/POST` | `/api/mediciones` | Mediciones antropométricas |
| `GET/PUT/DELETE` | `/api/mediciones/[id]` | CRUD medición por ID |
| `GET/POST` | `/api/estudios` | Estudios de laboratorio |
| `GET/PUT/DELETE` | `/api/estudios/[id]` | CRUD estudio por ID |

### 🤖 Inteligencia Artificial

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/predicciones` | Listar predicciones |
| `POST` | `/api/predicciones/nueva` | Realizar nueva predicción |
| `GET/PUT` | `/api/predicciones/[id]` | Obtener / Validar predicción |
| `GET` | `/api/modelo-ia/metrics` | Métricas del modelo activo |

### 🔧 Otros

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/voice/transcribe` | Transcripción de voz a texto |
| `GET` | `/api/catalogos/[tipo]` | Catálogos dinámicos |
| `GET/POST` | `/api/plantillas` | Plantillas de documentos |
| `GET` | `/api/dashboard/stats` | Estadísticas del dashboard |
| `GET` | `/api/dashboard/recent` | Actividad reciente |
| `GET` | `/api/v2/clinica/expediente` | Expediente clínico v2 |

---

## 🚀 Inicio Rápido

### Prerrequisitos

- **Node.js** 18+ (recomendado 20+)
- **pnpm** (o npm/yarn)
- **MySQL** 8.0+ o **MariaDB** 10.11+

### Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/wowito68/predia.git
cd predia

# 2. Ejecutar setup automático (recomendado)
chmod +x setup.sh
./setup.sh

# 3. Iniciar servidor de desarrollo
pnpm dev

# 4. Abrir en el navegador
# http://localhost:3000
```

El script `setup.sh` se encargará de:
1. ✅ Verificar dependencias (Node.js, pnpm, MySQL)
2. ✅ Instalar paquetes del proyecto
3. ✅ Crear archivo `.env` desde `.env.example`
4. ✅ Generar cliente Prisma
5. ✅ Ejecutar migraciones de BD (opcional)
6. ✅ Poblar BD con datos de prueba (opcional)

### Instalación Manual

```bash
# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Generar cliente Prisma
pnpm prisma generate

# Ejecutar migraciones
pnpm prisma migrate deploy

# (Opcional) Poblar con datos de prueba
pnpm db:seed

# Iniciar desarrollo
pnpm dev
```

### Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Servidor de desarrollo (hot reload) |
| `pnpm build` | Build de producción |
| `pnpm start` | Iniciar en modo producción |
| `pnpm lint` | Ejecutar linter |
| `pnpm prisma:studio` | Abrir Prisma Studio (GUI de BD) |
| `pnpm prisma:migrate` | Crear nueva migración |
| `pnpm db:migrate` | Aplicar migraciones pendientes |
| `pnpm db:seed` | Poblar BD con datos de prueba |
| `pnpm db:reset` | Resetear BD completa |
| `pnpm db:generate` | Regenerar cliente Prisma |

---

## 🔧 Configuración de Variables de Entorno

Copiar `.env.example` a `.env` y configurar:

```env
# ── App ──────────────────────────────────────────
NODE_ENV="development"
PORT=3000
NEXT_PUBLIC_API_URL="http://localhost:3000"

# ── Base de Datos (MySQL) ────────────────────────
DATABASE_URL="mysql://predia_user:secure_password@localhost:3306/predia_db"

# ── Seguridad (JWT) ─────────────────────────────
JWT_SECRET="CHANGE_THIS_TO_A_SECURE_RANDOM_STRING_MIN_32_CHARS"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# ── Email (Resend) ──────────────────────────────
RESEND_API_KEY="re_xxxxxxxxxxxx"
APP_URL="http://localhost:3000"
FROM_EMAIL="onboarding@resend.dev"

# ── CORS & Cookies ──────────────────────────────
ALLOWED_ORIGINS="http://localhost:3000"
SECURE_COOKIES="false"         # true en producción
COOKIE_DOMAIN="localhost"

# ── Logging ─────────────────────────────────────
LOG_LEVEL="info"
```

> 💡 **Tip**: Genera un JWT_SECRET seguro con `openssl rand -base64 32`

---

## 🚢 Despliegue

### Docker (Recomendado)

El proyecto incluye un **Dockerfile multi-stage** optimizado y `docker-compose.yml` con la app y n8n.

```bash
# Build y ejecutar con Docker Compose
docker compose up -d

# O con Makefile
make up

# Ver logs
make logs

# Estado de contenedores
make status
```

**Servicios del Docker Compose:**

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| `diabetes-ai` | 3000 | Aplicación Next.js |
| `predia-n8n` | 5678 | Plataforma de automatización n8n |

### Podman (Alternativa)

```bash
# Usar Podman en lugar de Docker
make podman-up
make podman-logs
make podman-down
```

### VPS (AWS EC2 / DigitalOcean)

```bash
# Deploy automatizado a EC2
chmod +x deploy-ec2.sh
./deploy-ec2.sh

# O manualmente con PM2
npm install -g pm2
pnpm build
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### HTTPS / SSL

```bash
# Configurar certificados Let's Encrypt con Nginx
chmod +x setup-https.sh
./setup-https.sh
```

Para más detalles, ver [`DEPLOYMENT.md`](./DEPLOYMENT.md).

---

## 🔄 Automatización con n8n

El proyecto incluye **6 flujos de trabajo** preconfigurados para n8n:

| Archivo | Descripción |
|---------|-------------|
| `n8n-workflow-recordatorio-citas.json` | Envía recordatorios de citas diarios por email (Lun-Sáb 7 AM) |
| `n8n-workflow-health-monitor.json` | Monitoreo de salud del sistema |
| `n8n-workflow-reporte-diario.json` | Genera reportes diarios automáticos |
| `n8n-workflow-revision-codigo-ia.json` | Revisión de código con IA |
| `n8n-workflow-signos-vitales.json` | Alertas de signos vitales anormales |
| `n8n-workflow-predia.json` | Flujo principal de la plataforma |

### Cómo usar

1. Acceder a n8n en `http://localhost:5678`
2. Importar el archivo `.json` deseado
3. Configurar las credenciales necesarias (API tokens, email SMTP)
4. Activar el workflow

---

## 🔑 Credenciales de Prueba

| Usuario | Rol | Contraseña |
|---------|-----|------------|
| `admin_luis` | Administrador | `password123` |
| `dr_juan` | Médico | `password123` |
| `enf_pedro` | Enfermero | `password123` |

> ⚠️ **Importante**: Cambiar todas las contraseñas antes de desplegar a producción.

---

## 📖 Casos de Uso

### 1. Crear Paciente y Obtener Predicción de Riesgo

1. Iniciar sesión en `http://localhost:3000`
2. Click en **"Nuevo Paciente"**
3. Llenar datos demográficos y clínicos
4. El sistema ejecuta el modelo ML automáticamente
5. Ver resultado con factores de riesgo y recomendaciones personalizadas

### 2. Registrar Consulta Médica

1. Navegar al paciente desde la lista
2. Click en **"Nueva Consulta"**
3. Registrar motivo, síntomas, exploración física y diagnóstico
4. (Opcional) Usar **dictado por voz** para campos de texto
5. Generar receta médica asociada
6. Imprimir o exportar a PDF

### 3. Usar Dictado por Voz

1. En cualquier campo de texto grande (motivo de consulta, observaciones, etc.)
2. Click en el **icono de micrófono** 🎙️
3. Hablar para transcribir automáticamente
4. El texto se inserta en el campo activo

### 4. Configurar Recordatorios Automáticos (n8n)

1. Importar `n8n-workflow-recordatorio-citas.json` en n8n (`http://localhost:5678`)
2. Configurar credenciales SMTP para envío de emails
3. Activar el workflow
4. El sistema enviará recordatorios automáticamente de Lunes a Sábado a las 7 AM

### 5. Revisar Dashboard Clínico

1. En el dashboard principal, ver widgets de:
   - Signos vitales con gráficas de tendencia
   - Estadísticas de pacientes y consultas
   - Alertas recientes
   - Resumen crítico del paciente seleccionado

---

## 🔧 Solución de Problemas

### Error: "Database connection refused"
```bash
# Verificar que MySQL está corriendo
systemctl status mysql

# Verificar credenciales en .env
cat .env | grep DATABASE_URL
```

### Error: "Token expired / No autorizado"
```bash
# Aumentar tiempo de expiración en .env
JWT_EXPIRES_IN="7d"
```

### Error en Build
```bash
# Limpiar todo y reinstalar
rm -rf .next node_modules
pnpm install
pnpm prisma generate
pnpm build
```

### Prisma: "Migration failed"
```bash
# Resetear base de datos (BORRA TODOS LOS DATOS)
pnpm db:reset

# O aplicar migraciones manualmente
pnpm prisma migrate deploy
```

### PWA no se actualiza
```bash
# Desregistrar Service Worker desde DevTools
# Application → Service Workers → Unregister
# Luego recargar con Ctrl+Shift+R
```

Para más ayuda, consultar [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md).

---

<p align="center">
  Desarrollado con ❤️ para el diagnóstico temprano de diabetes
</p>
