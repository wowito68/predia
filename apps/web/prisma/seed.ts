// ============================================
// prisma/seed.ts
// ============================================
// Script de seed para Diabetes AI
// Crea roles, usuarios, pacientes, y datos de ejemplo
//
// Ejecución:
// pnpm prisma db seed

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

// ============================================
// CONFIGURACIÓN
// ============================================

const SALT_ROUNDS = 10

// Contraseña para todos los usuarios de prueba
const DEFAULT_PASSWORD = "password123"

// ============================================
// TIPOS
// ============================================

interface RoleData {
  nombre_rol: string
  descripcion: string
}

interface UserData {
  username: string
  password: string
  nombre: string
  apellido_paterno: string
  apellido_materno?: string
  email: string
  telefono?: string
  rol_nombre: string
  cedula_profesional?: string
  especialidad?: string
}

interface PatientData {
  cedula: string
  curp?: string
  pin?: string
  nombre: string
  apellido_paterno: string
  apellido_materno?: string
  email?: string
  telefono?: string
  genero: string
  fecha_nacimiento: Date
  direccion?: {
    calle: string
    numero?: string
    ciudad: string
    provincia: string
    pais: string
    codigo_postal?: string
  }
}

// ============================================
// DATOS INICIALES
// ============================================

const ROLES: RoleData[] = [
  {
    nombre_rol: "Administrador",
    descripcion: "Administrador con acceso total al sistema",
  },
  {
    nombre_rol: "Médico",
    descripcion: "Usuario con permisos médicos para crear predicciones y ver historiales",
  },
  {
    nombre_rol: "Enfermero",
    descripcion: "Usuario con permisos de lectura y registro de mediciones",
  },
]

const USERS: UserData[] = [
  // Administrador
  {
    username: "admin_luis",
    password: DEFAULT_PASSWORD,
    nombre: "Luis",
    apellido_paterno: "García",
    apellido_materno: "López",
    email: "luis.garcia@hospital.com",
    telefono: "+34-911-234567",
    rol_nombre: "Administrador",
  },
  // Médicos
  {
    username: "dr_juan",
    password: DEFAULT_PASSWORD,
    nombre: "Juan",
    apellido_paterno: "Pérez",
    apellido_materno: "Martínez",
    email: "juan.perez@hospital.com",
    telefono: "+34-912-345678",
    rol_nombre: "Médico",
    cedula_profesional: "C-1001",
    especialidad: "Endocrinología",
  },
  {
    username: "dr_maria",
    password: DEFAULT_PASSWORD,
    nombre: "María",
    apellido_paterno: "González",
    apellido_materno: "Rodríguez",
    email: "maria.gonzalez@hospital.com",
    telefono: "+34-913-456789",
    rol_nombre: "Médico",
    cedula_profesional: "C-1002",
    especialidad: "Medicina Interna",
  },
  {
    username: "dr_carlos",
    password: DEFAULT_PASSWORD,
    nombre: "Carlos",
    apellido_paterno: "López",
    apellido_materno: "Fernández",
    email: "carlos.lopez@hospital.com",
    telefono: "+34-914-567890",
    rol_nombre: "Médico",
    cedula_profesional: "C-1003",
    especialidad: "Cardiología",
  },
  // Enfermeros
  {
    username: "enf_pedro",
    password: DEFAULT_PASSWORD,
    nombre: "Pedro",
    apellido_paterno: "Sánchez",
    apellido_materno: "Jiménez",
    email: "pedro.sanchez@hospital.com",
    telefono: "+34-915-678901",
    rol_nombre: "Enfermero",
  },
  {
    username: "enf_ana",
    password: DEFAULT_PASSWORD,
    nombre: "Ana",
    apellido_paterno: "Martínez",
    apellido_materno: "Díaz",
    email: "ana.martinez@hospital.com",
    telefono: "+34-916-789012",
    rol_nombre: "Enfermero",
  },
]

const PATIENTS: PatientData[] = [
  {
    cedula: "12345678",
    curp: "ROGJ850515HMCRRN08",
    pin: "123456",
    nombre: "Juan",
    apellido_paterno: "Rodríguez",
    apellido_materno: "García",
    email: "juan.rodriguez@email.com",
    telefono: "+34-620-111111",
    genero: "M",
    fecha_nacimiento: new Date("1985-05-15"),
    direccion: {
      calle: "Calle Principal",
      numero: "42",
      ciudad: "Madrid",
      provincia: "Madrid",
      pais: "España",
      codigo_postal: "28001",
    },
  },
  {
    cedula: "87654321",
    curp: "LOHM781223MDFPRR03",
    pin: "123456",
    nombre: "María",
    apellido_paterno: "López",
    apellido_materno: "Hernández",
    email: "maria.lopez@email.com",
    telefono: "+34-620-222222",
    genero: "F",
    fecha_nacimiento: new Date("1978-12-23"),
    direccion: {
      calle: "Avenida Central",
      numero: "28",
      ciudad: "Barcelona",
      provincia: "Barcelona",
      pais: "España",
      codigo_postal: "08002",
    },
  },
]

// ============================================
// FUNCIONES AUXILIARES
// ============================================

/**
 * Hash de contraseña usando bcrypt
 */
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Limpiar BD (opcional para desarrollo)
 */
async function cleanDatabase() {
  console.log("🧹 Limpiando base de datos...")

  try {
    // Orden importante: relaciones dependientes primero
    await prisma.prediccion.deleteMany({})
    await prisma.historialClinico.deleteMany({})
    await prisma.medicionAntropometrica.deleteMany({})
    await prisma.estudioLaboratorio.deleteMany({})
    await prisma.paciente.deleteMany({})
    await prisma.usuario.deleteMany({})
    await prisma.rol.deleteMany({})
    await prisma.direccion.deleteMany({})
    await prisma.modeloIA.deleteMany({})

    console.log("✅ Base de datos limpiada\n")
  } catch (error) {
    console.error("❌ Error limpiando BD:", error)
    throw error
  }
}

/**
 * Crear roles iniciales
 */
async function seedRoles() {
  console.log("📋 Creando roles...")

  try {
    const rolesCreated = await prisma.rol.createMany({
      data: ROLES,
      skipDuplicates: true,
    })

    console.log(`✅ Creados ${rolesCreated.count} roles\n`)

    return {
      admin: await prisma.rol.findUnique({ where: { nombre_rol: "Administrador" } }),
      medico: await prisma.rol.findUnique({ where: { nombre_rol: "Médico" } }),
      enfermero: await prisma.rol.findUnique({ where: { nombre_rol: "Enfermero" } }),
    }
  } catch (error) {
    console.error("❌ Error creando roles:", error)
    throw error
  }
}

/**
 * Crear usuarios de prueba
 */
async function seedUsers(rolesMap: Record<string, any>) {
  console.log("👥 Creando usuarios...")

  try {
    const usersToCreate = await Promise.all(
      USERS.map(async (user) => ({
        username: user.username,
        password_hash: await hashPassword(user.password),
        nombre: user.nombre,
        apellido_paterno: user.apellido_paterno,
        apellido_materno: user.apellido_materno || null,
        email: user.email,
        telefono: user.telefono || null,
        cedula_profesional: user.cedula_profesional || null,
        especialidad: user.especialidad || null,
        id_rol: user.rol_nombre === "Administrador"
          ? rolesMap.admin.id_rol
          : user.rol_nombre === "Médico"
          ? rolesMap.medico.id_rol
          : rolesMap.enfermero.id_rol,
      }))
    )

    const usersCreated = await prisma.usuario.createMany({
      data: usersToCreate,
      skipDuplicates: true,
    })

    console.log(`✅ Creados ${usersCreated.count} usuarios\n`)

    // Obtener referencias a usuarios por username
    return Object.fromEntries(
      await Promise.all(
        USERS.map(async (user) => [
          user.username,
          await prisma.usuario.findUnique({ where: { username: user.username } }),
        ])
      )
    )
  } catch (error) {
    console.error("❌ Error creando usuarios:", error)
    throw error
  }
}

/**
 * Crear pacientes con direcciones
 */
async function seedPatients() {
  console.log("🏥 Creando pacientes...")

  try {
    const createdPatients = []

    for (const patientData of PATIENTS) {
      // Crear o encontrar dirección
      let direccion = null
      if (patientData.direccion) {
        direccion = await prisma.direccion.create({
          data: {
            calle: patientData.direccion.calle,
            numero: patientData.direccion.numero || null,
            ciudad: patientData.direccion.ciudad,
            provincia: patientData.direccion.provincia,
            pais: patientData.direccion.pais,
            codigo_postal: patientData.direccion.codigo_postal || null,
          },
        })
      }

      // Calcular edad
      const age = new Date().getFullYear() - patientData.fecha_nacimiento.getFullYear()

      // Crear paciente
      const paciente = await prisma.paciente.create({
        data: {
          cedula: patientData.cedula,
          curp: patientData.curp || null,
          pin_hash: patientData.pin ? await hashPassword(patientData.pin) : null,
          nombre: patientData.nombre,
          apellido_paterno: patientData.apellido_paterno,
          apellido_materno: patientData.apellido_materno || null,
          email: patientData.email || null,
          telefono: patientData.telefono || null,
          genero: patientData.genero,
          fecha_nacimiento: patientData.fecha_nacimiento,
          edad: age,
          id_direccion: direccion?.id_direccion || null,
          activo: true,
        },
      })

      createdPatients.push(paciente)
    }

    console.log(`✅ Creados ${createdPatients.length} pacientes\n`)
    return createdPatients
  } catch (error) {
    console.error("❌ Error creando pacientes:", error)
    throw error
  }
}

/**
 * Crear estudios de laboratorio de ejemplo
 */
async function seedStudies(patients: any[], usersMap: any) {
  console.log("🔬 Creando estudios de laboratorio...")

  try {
    const medico = usersMap["dr_juan"]
    if (!medico) {
      throw new Error("No se encontró usuario médico para crear estudios")
    }

    const studies = [
      // Estudios para Juan Rodríguez
      {
        id_paciente: patients[0].id_paciente,
        id_usuario: medico.id_usuario,
        urea: 32.5,
        creatinina: 0.95,
        hba1c: 6.8,
        glucosa_ayunas: 105,
        colesterol_total: 220,
        trigliceridos: 180,
        hdl: 38,
        ldl: 145,
        vldl: 36,
        observaciones: "Valores elevados de glucosa. Recomendación: control periódico",
      },
      {
        id_paciente: patients[0].id_paciente,
        id_usuario: medico.id_usuario,
        urea: 30.2,
        creatinina: 0.92,
        hba1c: 6.5,
        glucosa_ayunas: 98,
        colesterol_total: 210,
        trigliceridos: 160,
        hdl: 42,
        ldl: 135,
        vldl: 32,
        observaciones: "Mejora en glucosa. Continuar con régimen",
      },
      // Estudios para María López
      {
        id_paciente: patients[1].id_paciente,
        id_usuario: medico.id_usuario,
        urea: 28.1,
        creatinina: 0.85,
        hba1c: 5.9,
        glucosa_ayunas: 92,
        colesterol_total: 195,
        trigliceridos: 125,
        hdl: 52,
        ldl: 120,
        vldl: 25,
        observaciones: "Valores normales. Mantener estilo de vida actual",
      },
    ]

    const studiesCreated = await prisma.estudioLaboratorio.createMany({
      data: studies,
      skipDuplicates: true,
    })

    console.log(`✅ Creados ${studiesCreated.count} estudios de laboratorio\n`)
  } catch (error) {
    console.error("❌ Error creando estudios:", error)
    throw error
  }
}

/**
 * Crear mediciones antropométricas de ejemplo
 */
async function seedMeasurements(patients: any[], usersMap: any) {
  console.log("📏 Creando mediciones antropométricas...")

  try {
    const enfermero = usersMap["enf_pedro"]
    if (!enfermero) {
      throw new Error("No se encontró usuario enfermero para crear mediciones")
    }

    const measurements = [
      // Mediciones para Juan Rodríguez
      {
        id_paciente: patients[0].id_paciente,
        id_usuario: enfermero.id_usuario,
        peso: 82.5,
        altura: 1.78,
        imc: 26.1,
        circunferencia_cintura: 95,
        circunferencia_cadera: 105,
        presion_sistolica: 135,
        presion_diastolica: 85,
        observaciones: "Sobrepeso moderado. Presión levemente elevada",
      },
      {
        id_paciente: patients[0].id_paciente,
        id_usuario: enfermero.id_usuario,
        peso: 80.0,
        altura: 1.78,
        imc: 25.3,
        circunferencia_cintura: 92,
        circunferencia_cadera: 102,
        presion_sistolica: 130,
        presion_diastolica: 82,
        observaciones: "Mejora. Continuar con ejercicio",
      },
      // Mediciones para María López
      {
        id_paciente: patients[1].id_paciente,
        id_usuario: enfermero.id_usuario,
        peso: 68.0,
        altura: 1.65,
        imc: 24.98,
        circunferencia_cintura: 80,
        circunferencia_cadera: 95,
        presion_sistolica: 120,
        presion_diastolica: 78,
        observaciones: "Valores normales. Peso ideal",
      },
    ]

    const measurementsCreated = await prisma.medicionAntropometrica.createMany({
      data: measurements,
      skipDuplicates: true,
    })

    console.log(`✅ Creadas ${measurementsCreated.count} mediciones antropométricas\n`)
  } catch (error) {
    console.error("❌ Error creando mediciones:", error)
    throw error
  }
}

/**
 * Crear modelo IA por defecto
 */
async function seedModel() {
  console.log("🤖 Creando modelo de IA...")

  try {
    const modelExists = await prisma.modeloIA.findFirst({
      where: { version: "1.0.0" },
    })

    if (!modelExists) {
      await prisma.modeloIA.create({
        data: {
          version: "v2.0-screening-logreg",
          fecha_entrenamiento: new Date(),
          // Métrica HONESTA de cribado (sin laboratorios diagnósticos). El 97.89%
          // anterior estaba inflado por fuga de HbA1c — ver ml-research/reports/.
          accuracy: 0.6044,
          n_samples_train: 80000,
          n_samples_test: 20000,
          features: JSON.stringify([
            "Gender",
            "AGE",
            "BMI",
            "HbA1c",
            "Chol",
            "TG",
            "HDL",
            "LDL",
            "VLDL",
            "Urea",
            "Cr",
          ]),
          feature_importance: JSON.stringify({
            HbA1c: 0.25,
            BMI: 0.2,
            AGE: 0.15,
            Chol: 0.12,
            TG: 0.1,
            others: 0.18,
          }),
          descripcion: "Regresión Logística de cribado (diabetes_dataset.csv, 100k) sin laboratorios diagnósticos — evita data leakage",
          activo: true,
        },
      })

      console.log("✅ Modelo IA creado\n")
    } else {
      console.log("ℹ️  Modelo IA ya existe\n")
    }
  } catch (error) {
    console.error("❌ Error creando modelo:", error)
    throw error
  }
}

/**
 * Crear historial clínico de ejemplo
 */
async function seedHistory(patients: any[], usersMap: any) {
  console.log("📅 Creando historial clínico...")

  try {
    const medico = usersMap["dr_juan"]
    if (!medico) {
      throw new Error("No se encontró usuario médico para crear historial")
    }

    const histories = [
      {
        id_paciente: patients[0].id_paciente,
        id_usuario: medico.id_usuario,
        tipo_evento: "Consulta",
        descripcion: "Consulta de seguimiento por diabetes",
        diagnostico: "Diabetes Tipo 2 (probable)",
        tratamiento: "Dieta y ejercicio",
        observaciones: "Paciente muestra mejoría",
      },
      {
        id_paciente: patients[1].id_paciente,
        id_usuario: medico.id_usuario,
        tipo_evento: "Revisión",
        descripcion: "Revisión periódica de salud",
        diagnostico: "Sin patologías",
        tratamiento: "Prevención",
        observaciones: "Mantener hábitos saludables",
      },
    ]

    const historiesCreated = await prisma.historialClinico.createMany({
      data: histories,
      skipDuplicates: true,
    })

    console.log(`✅ Creados ${historiesCreated.count} registros de historial\n`)
  } catch (error) {
    console.error("❌ Error creando historial:", error)
    throw error
  }
}

/**
 * Crear datos para la app móvil: automonitoreo (glucosa/peso/presión),
 * predicción IA, próxima cita y receta activa por paciente.
 */
async function seedMobileData(patients: any[], usersMap: any) {
  console.log("📱 Creando datos para app móvil (automonitoreo, predicción, citas, recetas)...")

  try {
    const medico = usersMap["dr_juan"]
    const modelo = await prisma.modeloIA.findFirst({ where: { version: "1.0.0" } })
    if (!medico || !modelo) throw new Error("Faltan médico o modelo IA para datos móviles")

    const now = Date.now()
    const day = 24 * 60 * 60 * 1000

    for (let pi = 0; pi < patients.length; pi++) {
      const p = patients[pi]
      const auto: any[] = []

      // Glucosa diaria (14 días)
      for (let d = 13; d >= 0; d--) {
        auto.push({
          id_paciente: p.id_paciente,
          tipo: "glucosa",
          valor: 95 + Math.round(Math.random() * 55),
          unidad: "mg/dL",
          fecha_registro: new Date(now - d * day),
        })
      }
      // Peso y presión (cada 5 días)
      for (let d = 25; d >= 0; d -= 5) {
        auto.push({
          id_paciente: p.id_paciente,
          tipo: "peso",
          valor: 80 - pi * 12 + Math.round(Math.random() * 3),
          unidad: "kg",
          fecha_registro: new Date(now - d * day),
        })
        auto.push({
          id_paciente: p.id_paciente,
          tipo: "presion",
          valor: 120 + Math.round(Math.random() * 15),
          valor_secundario: 75 + Math.round(Math.random() * 10),
          unidad: "mmHg",
          fecha_registro: new Date(now - d * day),
        })
      }
      await prisma.automonitoreo.createMany({ data: auto })

      // Predicción IA
      await prisma.prediccion.create({
        data: {
          id_paciente: p.id_paciente,
          id_usuario: medico.id_usuario,
          id_modelo: modelo.id_modelo,
          datos_entrada: JSON.stringify({ BMI: 31.2, HbA1c: 6.8, AGE: 40 + pi * 5 }),
          resultado: pi === 0 ? "Diabetes" : "No Diabetes",
          probabilidad_diabetes: pi === 0 ? 0.82 : 0.21,
          probabilidad_no_diabetes: pi === 0 ? 0.18 : 0.79,
          nivel_riesgo: pi === 0 ? "ALTO" : "BAJO",
          factores_riesgo: JSON.stringify(["IMC elevado", "HbA1c > 6.5", "Antecedentes familiares"]),
          recomendaciones: JSON.stringify([
            "Mantén una dieta baja en azúcares",
            "Camina al menos 30 minutos al día",
            "Controla tu glucosa cada mañana",
          ]),
        },
      })

      // Consulta con próxima cita
      await prisma.consultaMedica.create({
        data: {
          id_paciente: p.id_paciente,
          id_usuario: medico.id_usuario,
          motivo_consulta: "Control de diabetes",
          diagnostico: pi === 0 ? "Diabetes Tipo 2" : "Prediabetes",
          proxima_cita: new Date(now + (pi + 3) * day),
        },
      })

      // Receta activa
      await prisma.receta.create({
        data: {
          id_paciente: p.id_paciente,
          id_usuario: medico.id_usuario,
          medicamentos: JSON.stringify([
            { nombre: "Metformina", dosis: "850 mg", frecuencia: "Cada 12 h", duracion: "30 días" },
            { nombre: "Glibenclamida", dosis: "5 mg", frecuencia: "1 vez al día", duracion: "30 días" },
          ]),
          instrucciones: "Tomar con alimentos. No suspender sin indicación médica.",
          estado: "Activa",
        },
      })
    }

    console.log("✅ Datos de app móvil creados\n")
  } catch (error) {
    console.error("❌ Error creando datos móviles:", error)
    throw error
  }
}

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================

async function main() {
  console.log("\n" + "=".repeat(60))
  console.log("  🌱 SEED DE DIABETES AI")
  console.log("=".repeat(60) + "\n")

  try {
    // Limpiar BD (descomenta si quieres empezar desde cero)
    // await cleanDatabase()

    // Crear datos en orden
    const roles = await seedRoles()
    const users = await seedUsers(roles)
    const patients = await seedPatients()
    await seedModel()
    await seedStudies(patients, users)
    await seedMeasurements(patients, users)
    await seedHistory(patients, users)
    await seedMobileData(patients, users)

    // Resumen
    console.log("=".repeat(60))
    console.log("✅ SEED COMPLETADO EXITOSAMENTE")
    console.log("=".repeat(60))
    console.log("\n📊 Resumen de datos creados:")
    console.log(`   • Roles: ${ROLES.length}`)
    console.log(`   • Usuarios: ${USERS.length}`)
    console.log(`   • Pacientes: ${PATIENTS.length}`)
    console.log(`   • Estudios de laboratorio: 3`)
    console.log(`   • Mediciones antropométricas: 3`)
    console.log(`   • Registros de historial: 2`)
    console.log(`   • Modelo IA: 1\n`)

    console.log("🔐 Credenciales de prueba (web — usuario / contraseña):")
    console.log(`   Admin: admin_luis / ${DEFAULT_PASSWORD}`)
    console.log(`   Médico: dr_juan / ${DEFAULT_PASSWORD}`)
    console.log(`   Enfermero: enf_pedro / ${DEFAULT_PASSWORD}\n`)

    console.log("📱 Credenciales de prueba (app móvil paciente — CURP / PIN):")
    for (const p of PATIENTS) {
      if (p.curp) console.log(`   ${p.nombre} ${p.apellido_paterno}: ${p.curp} / ${p.pin}`)
    }
    console.log("")

    console.log("💾 Base de datos actualizada en: " + process.env.DATABASE_URL)
    console.log("")
  } catch (error) {
    console.error("\n❌ ERROR EN SEED:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar
main()
