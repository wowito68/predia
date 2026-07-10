// ============================================
// prisma/seed.ts
// ============================================
// Script de seed para PREDIA (Diabetes AI)
//
// ⚠️  DATOS DE PRUEBA / DEMO ACADÉMICA ⚠️
// Todos los datos generados aquí son FICTICIOS. Nombres, CURP, teléfonos,
// correos y direcciones NO corresponden a personas reales. No usar en
// producción con datos reales de pacientes.
//
// Características:
//   - Idempotente: puede ejecutarse múltiples veces sin duplicar datos.
//   - No destructivo: no borra datos existentes (cleanDatabase está desactivado).
//   - Cobertura completa: usuarios, pacientes, catálogos, historiales,
//     consultas/citas, recetas, alergias, vacunas, patologías, fracturas,
//     antecedentes, documentos, imágenes, signos vitales, predicciones IA.
//
// Ejecución:
//   pnpm db:seed     (tsx prisma/seed.ts)
//   pnpm prisma db seed

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

// ============================================
// CONFIGURACIÓN
// ============================================

const SALT_ROUNDS = 10
const DEFAULT_PASSWORD = "password123"
const DEFAULT_PATIENT_PIN = "123456"
const DEFAULT_MODEL_VERSION = "v2.0-screening-logreg"

// Etiqueta visible para marcar datos como ficticios donde aplique.
const DEMO_TAG = "[DEMO]"

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

interface PatientSeed {
  cedula: string
  curp: string
  nombre: string
  apellido_paterno: string
  apellido_materno: string
  email: string
  telefono: string
  genero: "M" | "F"
  fecha_nacimiento: string // YYYY-MM-DD
  tipo_sangre: string
  seguro_medico?: string
  poliza_seguro?: string
  contacto_emergencia_nombre?: string
  contacto_emergencia_telefono?: string
  direccion: {
    calle: string
    numero: string
    ciudad: string
    provincia: string
    pais: string
    codigo_postal: string
  }
  // Perfil clínico para generar datos coherentes (0 = sano, 3 = alto riesgo)
  riesgo: 0 | 1 | 2 | 3
}

// ============================================
// DATOS INICIALES
// ============================================

const ROLES: RoleData[] = [
  { nombre_rol: "Administrador", descripcion: "Administrador con acceso total al sistema" },
  { nombre_rol: "Médico", descripcion: "Usuario con permisos médicos para crear predicciones y ver historiales" },
  { nombre_rol: "Enfermero", descripcion: "Usuario con permisos de lectura y registro de mediciones" },
]

const USERS: UserData[] = [
  {
    username: "admin_luis",
    password: DEFAULT_PASSWORD,
    nombre: "Luis",
    apellido_paterno: "García",
    apellido_materno: "López",
    email: "luis.garcia@hospital.com",
    telefono: "+52-555-101-2030",
    rol_nombre: "Administrador",
  },
  {
    username: "dr_juan",
    password: DEFAULT_PASSWORD,
    nombre: "Juan",
    apellido_paterno: "Pérez",
    apellido_materno: "Martínez",
    email: "juan.perez@hospital.com",
    telefono: "+52-555-102-3040",
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
    telefono: "+52-555-103-4050",
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
    telefono: "+52-555-104-5060",
    rol_nombre: "Médico",
    cedula_profesional: "C-1003",
    especialidad: "Cardiología",
  },
  {
    username: "enf_pedro",
    password: DEFAULT_PASSWORD,
    nombre: "Pedro",
    apellido_paterno: "Sánchez",
    apellido_materno: "Jiménez",
    email: "pedro.sanchez@hospital.com",
    telefono: "+52-555-105-6070",
    rol_nombre: "Enfermero",
  },
  {
    username: "enf_ana",
    password: DEFAULT_PASSWORD,
    nombre: "Ana",
    apellido_paterno: "Martínez",
    apellido_materno: "Díaz",
    email: "ana.martinez@hospital.com",
    telefono: "+52-555-106-7080",
    rol_nombre: "Enfermero",
  },
]

// 20 pacientes ficticios. CURP en formato válido pero generada (no real).
const PATIENTS: PatientSeed[] = [
  // Los 2 primeros conservan cédula/CURP previos para no duplicar datos existentes.
  { cedula: "12345678", curp: "ROGJ850515HMCRRN08", nombre: "Juan", apellido_paterno: "Rodríguez", apellido_materno: "García", email: "juan.rodriguez@example.com", telefono: "+52-55-6201-1111", genero: "M", fecha_nacimiento: "1985-05-15", tipo_sangre: "O+", seguro_medico: "IMSS", poliza_seguro: "IMSS-0001", contacto_emergencia_nombre: "Laura García", contacto_emergencia_telefono: "+52-55-6201-9111", direccion: { calle: "Av. Insurgentes Sur", numero: "42", ciudad: "Ciudad de México", provincia: "CDMX", pais: "México", codigo_postal: "03100" }, riesgo: 3 },
  { cedula: "87654321", curp: "LOHM781223MDFPRR03", nombre: "María", apellido_paterno: "López", apellido_materno: "Hernández", email: "maria.lopez@example.com", telefono: "+52-55-6202-2222", genero: "F", fecha_nacimiento: "1978-12-23", tipo_sangre: "A+", seguro_medico: "ISSSTE", poliza_seguro: "ISS-0002", contacto_emergencia_nombre: "Pedro López", contacto_emergencia_telefono: "+52-55-6202-9222", direccion: { calle: "Calle Reforma", numero: "28", ciudad: "Guadalajara", provincia: "Jalisco", pais: "México", codigo_postal: "44100" }, riesgo: 1 },
  { cedula: "10000003", curp: "MAGC900310HJCLRL05", nombre: "Carlos", apellido_paterno: "Martínez", apellido_materno: "Gómez", email: "carlos.martinez@example.com", telefono: "+52-33-6203-3333", genero: "M", fecha_nacimiento: "1990-03-10", tipo_sangre: "B+", seguro_medico: "IMSS", poliza_seguro: "IMSS-0003", contacto_emergencia_nombre: "Sofía Gómez", contacto_emergencia_telefono: "+52-33-6203-9333", direccion: { calle: "Av. Vallarta", numero: "1502", ciudad: "Guadalajara", provincia: "Jalisco", pais: "México", codigo_postal: "44130" }, riesgo: 2 },
  { cedula: "10000004", curp: "HEPA830722MNLRRN09", nombre: "Ana", apellido_paterno: "Hernández", apellido_materno: "Pérez", email: "ana.hernandez@example.com", telefono: "+52-81-6204-4444", genero: "F", fecha_nacimiento: "1983-07-22", tipo_sangre: "O-", seguro_medico: "Gastos Médicos Mayores", poliza_seguro: "GMM-0004", contacto_emergencia_nombre: "Jorge Hernández", contacto_emergencia_telefono: "+52-81-6204-9444", direccion: { calle: "Av. Constitución", numero: "305", ciudad: "Monterrey", provincia: "Nuevo León", pais: "México", codigo_postal: "64000" }, riesgo: 0 },
  { cedula: "10000005", curp: "GORL760905HDFNML02", nombre: "Roberto", apellido_paterno: "González", apellido_materno: "Ramírez", email: "roberto.gonzalez@example.com", telefono: "+52-55-6205-5555", genero: "M", fecha_nacimiento: "1976-09-05", tipo_sangre: "AB+", seguro_medico: "IMSS", poliza_seguro: "IMSS-0005", contacto_emergencia_nombre: "Marta Ramírez", contacto_emergencia_telefono: "+52-55-6205-9555", direccion: { calle: "Calle Madero", numero: "77", ciudad: "Puebla", provincia: "Puebla", pais: "México", codigo_postal: "72000" }, riesgo: 3 },
  { cedula: "10000006", curp: "SAFL920118MJCNNR04", nombre: "Fernanda", apellido_paterno: "Sánchez", apellido_materno: "Núñez", email: "fernanda.sanchez@example.com", telefono: "+52-33-6206-6666", genero: "F", fecha_nacimiento: "1992-01-18", tipo_sangre: "A-", seguro_medico: "ISSSTE", poliza_seguro: "ISS-0006", contacto_emergencia_nombre: "Diego Núñez", contacto_emergencia_telefono: "+52-33-6206-9666", direccion: { calle: "Av. Chapultepec", numero: "210", ciudad: "Guadalajara", provincia: "Jalisco", pais: "México", codigo_postal: "44150" }, riesgo: 1 },
  { cedula: "10000007", curp: "RAVD681130HMNMLG07", nombre: "Diego", apellido_paterno: "Ramírez", apellido_materno: "Vela", email: "diego.ramirez@example.com", telefono: "+52-81-6207-7777", genero: "M", fecha_nacimiento: "1968-11-30", tipo_sangre: "O+", seguro_medico: "IMSS", poliza_seguro: "IMSS-0007", contacto_emergencia_nombre: "Carmen Vela", contacto_emergencia_telefono: "+52-81-6207-9777", direccion: { calle: "Av. Gonzalitos", numero: "88", ciudad: "Monterrey", provincia: "Nuevo León", pais: "México", codigo_postal: "64020" }, riesgo: 3 },
  { cedula: "10000008", curp: "TOPL880604MDFRRR01", nombre: "Lucía", apellido_paterno: "Torres", apellido_materno: "Pardo", email: "lucia.torres@example.com", telefono: "+52-55-6208-8888", genero: "F", fecha_nacimiento: "1988-06-04", tipo_sangre: "B-", seguro_medico: "Gastos Médicos Mayores", poliza_seguro: "GMM-0008", contacto_emergencia_nombre: "Raúl Pardo", contacto_emergencia_telefono: "+52-55-6208-9888", direccion: { calle: "Calle Donceles", numero: "14", ciudad: "Ciudad de México", provincia: "CDMX", pais: "México", codigo_postal: "06010" }, riesgo: 0 },
  { cedula: "10000009", curp: "FLMJ950827HJCLRS06", nombre: "José", apellido_paterno: "Flores", apellido_materno: "Mejía", email: "jose.flores@example.com", telefono: "+52-33-6209-9999", genero: "M", fecha_nacimiento: "1995-08-27", tipo_sangre: "A+", seguro_medico: "IMSS", poliza_seguro: "IMSS-0009", contacto_emergencia_nombre: "Elena Mejía", contacto_emergencia_telefono: "+52-33-6209-9999", direccion: { calle: "Av. Patria", numero: "640", ciudad: "Zapopan", provincia: "Jalisco", pais: "México", codigo_postal: "45160" }, riesgo: 2 },
  { cedula: "10000010", curp: "DIMG721015MNLZRB00", nombre: "Gabriela", apellido_paterno: "Díaz", apellido_materno: "Mora", email: "gabriela.diaz@example.com", telefono: "+52-81-6210-1010", genero: "F", fecha_nacimiento: "1972-10-15", tipo_sangre: "O+", seguro_medico: "ISSSTE", poliza_seguro: "ISS-0010", contacto_emergencia_nombre: "Hugo Mora", contacto_emergencia_telefono: "+52-81-6210-9010", direccion: { calle: "Av. Lázaro Cárdenas", numero: "455", ciudad: "Monterrey", provincia: "Nuevo León", pais: "México", codigo_postal: "64720" }, riesgo: 2 },
  { cedula: "10000011", curp: "CABA800212HDFSRL03", nombre: "Alberto", apellido_paterno: "Castro", apellido_materno: "Barrera", email: "alberto.castro@example.com", telefono: "+52-55-6211-1111", genero: "M", fecha_nacimiento: "1980-02-12", tipo_sangre: "AB-", seguro_medico: "IMSS", poliza_seguro: "IMSS-0011", contacto_emergencia_nombre: "Nora Barrera", contacto_emergencia_telefono: "+52-55-6211-9111", direccion: { calle: "Calle Bolívar", numero: "120", ciudad: "Ciudad de México", provincia: "CDMX", pais: "México", codigo_postal: "06080" }, riesgo: 1 },
  { cedula: "10000012", curp: "MOVR930709MDFRLS02", nombre: "Rosa", apellido_paterno: "Morales", apellido_materno: "Villa", email: "rosa.morales@example.com", telefono: "+52-222-6212-1212", genero: "F", fecha_nacimiento: "1993-07-09", tipo_sangre: "A+", seguro_medico: "Gastos Médicos Mayores", poliza_seguro: "GMM-0012", contacto_emergencia_nombre: "Iván Villa", contacto_emergencia_telefono: "+52-222-6212-9212", direccion: { calle: "Av. Juárez", numero: "33", ciudad: "Puebla", provincia: "Puebla", pais: "México", codigo_postal: "72160" }, riesgo: 0 },
  { cedula: "10000013", curp: "JIRO650418HJCMDM08", nombre: "Omar", apellido_paterno: "Jiménez", apellido_materno: "Rosales", email: "omar.jimenez@example.com", telefono: "+52-33-6213-1313", genero: "M", fecha_nacimiento: "1965-04-18", tipo_sangre: "O-", seguro_medico: "IMSS", poliza_seguro: "IMSS-0013", contacto_emergencia_nombre: "Beatriz Rosales", contacto_emergencia_telefono: "+52-33-6213-9313", direccion: { calle: "Calle Hidalgo", numero: "9", ciudad: "Guadalajara", provincia: "Jalisco", pais: "México", codigo_postal: "44280" }, riesgo: 3 },
  { cedula: "10000014", curp: "RUVP870923MNLZLT05", nombre: "Patricia", apellido_paterno: "Ruiz", apellido_materno: "Valdez", email: "patricia.ruiz@example.com", telefono: "+52-81-6214-1414", genero: "F", fecha_nacimiento: "1987-09-23", tipo_sangre: "B+", seguro_medico: "ISSSTE", poliza_seguro: "ISS-0014", contacto_emergencia_nombre: "Sergio Valdez", contacto_emergencia_telefono: "+52-81-6214-9414", direccion: { calle: "Av. Eugenio Garza Sada", numero: "1200", ciudad: "Monterrey", provincia: "Nuevo León", pais: "México", codigo_postal: "64840" }, riesgo: 1 },
  { cedula: "10000015", curp: "MENL910205HDFNRS01", nombre: "Luis", apellido_paterno: "Mendoza", apellido_materno: "Nieto", email: "luis.mendoza@example.com", telefono: "+52-55-6215-1515", genero: "M", fecha_nacimiento: "1991-02-05", tipo_sangre: "A+", seguro_medico: "IMSS", poliza_seguro: "IMSS-0015", contacto_emergencia_nombre: "Daniela Nieto", contacto_emergencia_telefono: "+52-55-6215-9515", direccion: { calle: "Calle 5 de Mayo", numero: "61", ciudad: "Ciudad de México", provincia: "CDMX", pais: "México", codigo_postal: "06000" }, riesgo: 2 },
  { cedula: "10000016", curp: "VAGS840611MJCRMR04", nombre: "Sara", apellido_paterno: "Vargas", apellido_materno: "Gómez", email: "sara.vargas@example.com", telefono: "+52-33-6216-1616", genero: "F", fecha_nacimiento: "1984-06-11", tipo_sangre: "O+", seguro_medico: "Gastos Médicos Mayores", poliza_seguro: "GMM-0016", contacto_emergencia_nombre: "Tomás Gómez", contacto_emergencia_telefono: "+52-33-6216-9616", direccion: { calle: "Av. Américas", numero: "500", ciudad: "Guadalajara", provincia: "Jalisco", pais: "México", codigo_postal: "44630" }, riesgo: 0 },
  { cedula: "10000017", curp: "ORTM700128HMNLRG09", nombre: "Miguel", apellido_paterno: "Ortega", apellido_materno: "Trejo", email: "miguel.ortega@example.com", telefono: "+52-81-6217-1717", genero: "M", fecha_nacimiento: "1970-01-28", tipo_sangre: "AB+", seguro_medico: "IMSS", poliza_seguro: "IMSS-0017", contacto_emergencia_nombre: "Verónica Trejo", contacto_emergencia_telefono: "+52-81-6217-9717", direccion: { calle: "Av. Universidad", numero: "200", ciudad: "Monterrey", provincia: "Nuevo León", pais: "México", codigo_postal: "66450" }, riesgo: 2 },
  { cedula: "10000018", curp: "RISC960714MDFVNL07", nombre: "Claudia", apellido_paterno: "Rivera", apellido_materno: "Santos", email: "claudia.rivera@example.com", telefono: "+52-55-6218-1818", genero: "F", fecha_nacimiento: "1996-07-14", tipo_sangre: "A-", seguro_medico: "ISSSTE", poliza_seguro: "ISS-0018", contacto_emergencia_nombre: "Andrés Santos", contacto_emergencia_telefono: "+52-55-6218-9818", direccion: { calle: "Calle Tacuba", numero: "18", ciudad: "Ciudad de México", provincia: "CDMX", pais: "México", codigo_postal: "06010" }, riesgo: 0 },
  { cedula: "10000019", curp: "GUTR620503HJCZRB02", nombre: "Ricardo", apellido_paterno: "Gutiérrez", apellido_materno: "Zúñiga", email: "ricardo.gutierrez@example.com", telefono: "+52-33-6219-1919", genero: "M", fecha_nacimiento: "1962-05-03", tipo_sangre: "O+", seguro_medico: "IMSS", poliza_seguro: "IMSS-0019", contacto_emergencia_nombre: "Lourdes Zúñiga", contacto_emergencia_telefono: "+52-33-6219-9919", direccion: { calle: "Av. La Paz", numero: "350", ciudad: "Guadalajara", provincia: "Jalisco", pais: "México", codigo_postal: "44100" }, riesgo: 3 },
  { cedula: "10000020", curp: "NUCB890819MNLXRL06", nombre: "Brenda", apellido_paterno: "Núñez", apellido_materno: "Cabrera", email: "brenda.nunez@example.com", telefono: "+52-81-6220-2020", genero: "F", fecha_nacimiento: "1989-08-19", tipo_sangre: "B+", seguro_medico: "Gastos Médicos Mayores", poliza_seguro: "GMM-0020", contacto_emergencia_nombre: "Felipe Cabrera", contacto_emergencia_telefono: "+52-81-6220-9020", direccion: { calle: "Av. Fundadores", numero: "75", ciudad: "Monterrey", provincia: "Nuevo León", pais: "México", codigo_postal: "64720" }, riesgo: 1 },
]

// Catálogos ----------------------------------------------------------------

const VACUNAS_CATALOGO = [
  { nombre: "Influenza estacional", descripcion: "Vacuna anual contra la influenza", dosis_requeridas: 1 },
  { nombre: "COVID-19", descripcion: "Vacuna contra SARS-CoV-2", dosis_requeridas: 2 },
  { nombre: "Hepatitis B", descripcion: "Esquema de 3 dosis", dosis_requeridas: 3 },
  { nombre: "Tétanos-Difteria (Td)", descripcion: "Refuerzo cada 10 años", dosis_requeridas: 1 },
  { nombre: "Neumococo", descripcion: "Vacuna antineumocócica", dosis_requeridas: 1 },
  { nombre: "Triple viral (SRP)", descripcion: "Sarampión, rubéola y parotiditis", dosis_requeridas: 2 },
]

const PATOLOGIAS_CATALOGO = [
  { codigo_cie10: "E11", nombre: "Diabetes mellitus tipo 2", categoria: "Endocrino-metabólica" },
  { codigo_cie10: "E10", nombre: "Diabetes mellitus tipo 1", categoria: "Endocrino-metabólica" },
  { codigo_cie10: "R73", nombre: "Prediabetes / glucosa anormal en ayunas", categoria: "Endocrino-metabólica" },
  { codigo_cie10: "I10", nombre: "Hipertensión arterial esencial", categoria: "Cardiovascular" },
  { codigo_cie10: "E78.5", nombre: "Hiperlipidemia mixta", categoria: "Endocrino-metabólica" },
  { codigo_cie10: "E66", nombre: "Obesidad", categoria: "Endocrino-metabólica" },
  { codigo_cie10: "E03", nombre: "Hipotiroidismo", categoria: "Endocrino-metabólica" },
  { codigo_cie10: "J45", nombre: "Asma", categoria: "Respiratoria" },
  { codigo_cie10: "M81", nombre: "Osteoporosis", categoria: "Musculoesquelética" },
  { codigo_cie10: "N18", nombre: "Enfermedad renal crónica", categoria: "Nefrológica" },
]

const MEDICAMENTOS_CATALOGO = [
  "Metformina", "Glibenclamida", "Insulina glargina", "Losartán", "Enalapril",
  "Amlodipino", "Atorvastatina", "Aspirina", "Omeprazol", "Levotiroxina",
  "Paracetamol", "Ibuprofeno", "Empagliflozina", "Sitagliptina", "Furosemida",
]

const ALERGIAS_CATALOGO = [
  "Penicilina", "Sulfonamidas", "Aspirina", "Mariscos", "Polen",
  "Látex", "Yodo", "Nueces", "Lactosa", "Ácaros del polvo",
]

// ============================================
// FUNCIONES AUXILIARES
// ============================================

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

function ageFrom(fecha: string): number {
  const d = new Date(fecha)
  const diff = Date.now() - d.getTime()
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))
}

const DAY = 24 * 60 * 60 * 1000
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * DAY)
}
function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * DAY)
}
function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length]
}

// ============================================
// SEED: ROLES Y USUARIOS
// ============================================

async function seedRoles() {
  console.log("📋 Creando roles...")
  await prisma.rol.createMany({ data: ROLES, skipDuplicates: true })
  return {
    admin: await prisma.rol.findUnique({ where: { nombre_rol: "Administrador" } }),
    medico: await prisma.rol.findUnique({ where: { nombre_rol: "Médico" } }),
    enfermero: await prisma.rol.findUnique({ where: { nombre_rol: "Enfermero" } }),
  }
}

async function seedUsers(rolesMap: Record<string, any>) {
  console.log("👥 Creando usuarios...")
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
      id_rol:
        user.rol_nombre === "Administrador"
          ? rolesMap.admin.id_rol
          : user.rol_nombre === "Médico"
          ? rolesMap.medico.id_rol
          : rolesMap.enfermero.id_rol,
    }))
  )
  await prisma.usuario.createMany({ data: usersToCreate, skipDuplicates: true })
  return Object.fromEntries(
    await Promise.all(
      USERS.map(async (user) => [user.username, await prisma.usuario.findUnique({ where: { username: user.username } })])
    )
  )
}

// ============================================
// SEED: CATÁLOGOS
// ============================================

async function seedCatalogs() {
  console.log("📚 Creando catálogos (vacunas, patologías, medicamentos, alergias)...")

  // Vacunas: no tiene unique en nombre, así que guardamos por existencia.
  for (const v of VACUNAS_CATALOGO) {
    const exists = await prisma.catalogoVacuna.findFirst({ where: { nombre: v.nombre } })
    if (!exists) await prisma.catalogoVacuna.create({ data: v })
  }

  // Patologías: codigo_cie10 es unique → upsert.
  for (const p of PATOLOGIAS_CATALOGO) {
    await prisma.catalogoPatologia.upsert({
      where: { codigo_cie10: p.codigo_cie10 },
      update: { nombre: p.nombre, categoria: p.categoria },
      create: p,
    })
  }

  // Medicamentos y alergias: nombre es unique → createMany skipDuplicates.
  await prisma.catalogoMedicamento.createMany({
    data: MEDICAMENTOS_CATALOGO.map((nombre) => ({ nombre })),
    skipDuplicates: true,
  })
  await prisma.catalogoAlergia.createMany({
    data: ALERGIAS_CATALOGO.map((nombre) => ({ nombre })),
    skipDuplicates: true,
  })

  return {
    vacunas: await prisma.catalogoVacuna.findMany(),
    patologias: await prisma.catalogoPatologia.findMany(),
  }
}

// ============================================
// SEED: PACIENTES
// ============================================

async function seedPatients() {
  console.log("🏥 Creando pacientes...")
  const created: any[] = []

  for (const pd of PATIENTS) {
    const existing = await prisma.paciente.findUnique({ where: { cedula: pd.cedula } })
    if (existing) {
      // Completar datos Fase 2 faltantes en pacientes preexistentes (no destructivo:
      // solo rellena campos vacíos para que la UID muestre "Datos Bio", seguro, etc.)
      const patched = await prisma.paciente.update({
        where: { id_paciente: existing.id_paciente },
        data: {
          tipo_sangre: existing.tipo_sangre ?? pd.tipo_sangre,
          seguro_medico: existing.seguro_medico ?? pd.seguro_medico ?? null,
          poliza_seguro: existing.poliza_seguro ?? pd.poliza_seguro ?? null,
          contacto_emergencia_nombre: existing.contacto_emergencia_nombre ?? pd.contacto_emergencia_nombre ?? null,
          contacto_emergencia_telefono: existing.contacto_emergencia_telefono ?? pd.contacto_emergencia_telefono ?? null,
        },
      })
      created.push({ ...patched, riesgo: pd.riesgo })
      continue
    }

    const direccion = await prisma.direccion.create({
      data: {
        calle: pd.direccion.calle,
        numero: pd.direccion.numero,
        ciudad: pd.direccion.ciudad,
        provincia: pd.direccion.provincia,
        pais: pd.direccion.pais,
        codigo_postal: pd.direccion.codigo_postal,
      },
    })

    const paciente = await prisma.paciente.create({
      data: {
        cedula: pd.cedula,
        curp: pd.curp,
        pin_hash: await hashPassword(DEFAULT_PATIENT_PIN),
        nombre: pd.nombre,
        apellido_paterno: pd.apellido_paterno,
        apellido_materno: pd.apellido_materno,
        email: pd.email,
        telefono: pd.telefono,
        genero: pd.genero,
        fecha_nacimiento: new Date(pd.fecha_nacimiento),
        edad: ageFrom(pd.fecha_nacimiento),
        tipo_sangre: pd.tipo_sangre,
        seguro_medico: pd.seguro_medico || null,
        poliza_seguro: pd.poliza_seguro || null,
        contacto_emergencia_nombre: pd.contacto_emergencia_nombre || null,
        contacto_emergencia_telefono: pd.contacto_emergencia_telefono || null,
        id_direccion: direccion.id_direccion,
        activo: true,
      },
    })
    created.push({ ...paciente, riesgo: pd.riesgo })
  }

  console.log(`✅ ${created.length} pacientes (creados + existentes)\n`)
  return created
}

// ============================================
// SEED: MODELO IA
// ============================================

async function seedModel() {
  console.log("🤖 Creando modelo de IA...")
  const exists = await prisma.modeloIA.findFirst({ where: { version: DEFAULT_MODEL_VERSION } })
  if (exists) return exists
  return prisma.modeloIA.create({
    data: {
      version: DEFAULT_MODEL_VERSION,
      fecha_entrenamiento: new Date(),
      accuracy: 0.6044,
      n_samples_train: 80000,
      n_samples_test: 20000,
      features: JSON.stringify(["Gender", "AGE", "BMI", "HbA1c", "Chol", "TG", "HDL", "LDL", "VLDL", "Urea", "Cr"]),
      feature_importance: JSON.stringify({ HbA1c: 0.25, BMI: 0.2, AGE: 0.15, Chol: 0.12, TG: 0.1, others: 0.18 }),
      descripcion: "Regresión Logística de cribado (diabetes_dataset.csv, 100k) sin laboratorios diagnósticos — evita data leakage",
      activo: true,
    },
  })
}

// ============================================
// SEED: DATOS CLÍNICOS POR PACIENTE (idempotente por tabla)
// ============================================

// Perfiles por nivel de riesgo para generar valores coherentes.
function clinicalProfile(riesgo: number, i: number) {
  const base = {
    0: { hba1c: 5.3, glucosa: 88, imc: 23, sys: 118, dia: 76, chol: 180, tg: 110, hdl: 55, ldl: 105 },
    1: { hba1c: 5.9, glucosa: 100, imc: 26, sys: 128, dia: 82, chol: 205, tg: 150, hdl: 48, ldl: 130 },
    2: { hba1c: 6.3, glucosa: 118, imc: 29, sys: 136, dia: 86, chol: 220, tg: 180, hdl: 42, ldl: 145 },
    3: { hba1c: 7.4, glucosa: 145, imc: 33, sys: 146, dia: 92, chol: 245, tg: 220, hdl: 36, ldl: 165 },
  }[riesgo as 0 | 1 | 2 | 3]!
  // pequeña variación determinista por paciente
  const j = (i % 5) - 2
  return {
    hba1c: +(base.hba1c + j * 0.1).toFixed(1),
    glucosa: base.glucosa + j * 2,
    imc: +(base.imc + j * 0.4).toFixed(1),
    sys: base.sys + j * 2,
    dia: base.dia + j,
    chol: base.chol + j * 3,
    tg: base.tg + j * 4,
    hdl: base.hdl - j,
    ldl: base.ldl + j * 3,
  }
}

const RIESGO_LABEL: Record<number, { nivel: string; score: number; prob: number }> = {
  0: { nivel: "Bajo", score: 0.18, prob: 0.18 },
  1: { nivel: "Moderado", score: 0.41, prob: 0.41 },
  2: { nivel: "Alto", score: 0.58, prob: 0.58 },
  3: { nivel: "Muy Alto", score: 0.81, prob: 0.81 },
}

async function seedClinicalForPatient(
  patient: any,
  i: number,
  usersMap: any,
  modelo: any,
  catalogs: { vacunas: any[]; patologias: any[] }
) {
  const medicoUsernames = ["dr_juan", "dr_maria", "dr_carlos"]
  const medico = usersMap[pick(medicoUsernames, i)]
  const enfermero = usersMap[i % 2 === 0 ? "enf_pedro" : "enf_ana"]
  const pid = patient.id_paciente
  const riesgo = patient.riesgo ?? 1
  const prof = clinicalProfile(riesgo, i)
  const altura = patient.genero === "F" ? 1.62 : 1.74
  const peso = +(prof.imc * altura * altura).toFixed(1)

  // --- Estudios de laboratorio (2) ---
  if ((await prisma.estudioLaboratorio.count({ where: { id_paciente: pid } })) === 0) {
    await prisma.estudioLaboratorio.createMany({
      data: [
        {
          id_paciente: pid, id_usuario: medico.id_usuario, fecha_estudio: daysAgo(120),
          urea: 30 + (i % 6), creatinina: +(0.8 + (i % 4) * 0.05).toFixed(2), hba1c: prof.hba1c + 0.2,
          glucosa_ayunas: prof.glucosa + 5, colesterol_total: prof.chol, trigliceridos: prof.tg,
          hdl: prof.hdl, ldl: prof.ldl, vldl: Math.round(prof.tg / 5),
          observaciones: `${DEMO_TAG} Perfil metabólico de control trimestral.`,
        },
        {
          id_paciente: pid, id_usuario: medico.id_usuario, fecha_estudio: daysAgo(20),
          urea: 29 + (i % 5), creatinina: +(0.78 + (i % 4) * 0.05).toFixed(2), hba1c: prof.hba1c,
          glucosa_ayunas: prof.glucosa, colesterol_total: prof.chol - 8, trigliceridos: prof.tg - 10,
          hdl: prof.hdl + 2, ldl: prof.ldl - 6, vldl: Math.round((prof.tg - 10) / 5),
          observaciones: `${DEMO_TAG} Seguimiento; ligera mejoría respecto al estudio previo.`,
        },
      ],
    })
  }

  // --- Mediciones / signos vitales (3) ---
  if ((await prisma.medicionAntropometrica.count({ where: { id_paciente: pid } })) === 0) {
    await prisma.medicionAntropometrica.createMany({
      data: [90, 45, 5].map((d, k) => ({
        id_paciente: pid, id_usuario: enfermero.id_usuario, fecha_medicion: daysAgo(d),
        peso: +(peso + k * 0.6).toFixed(1), altura, imc: +(prof.imc + k * 0.2).toFixed(1),
        circunferencia_cintura: Math.round(prof.imc * 3 + (patient.genero === "M" ? 10 : 0)),
        circunferencia_cadera: Math.round(prof.imc * 3.4),
        presion_sistolica: prof.sys + k, presion_diastolica: prof.dia + k,
        observaciones: `${DEMO_TAG} Toma de signos vitales en consulta.`,
      })),
    })
  }

  // --- Historial clínico (2) ---
  if ((await prisma.historialClinico.count({ where: { id_paciente: pid } })) === 0) {
    await prisma.historialClinico.createMany({
      data: [
        {
          id_paciente: pid, id_usuario: medico.id_usuario, fecha_registro: daysAgo(120),
          tipo_evento: "Consulta", descripcion: `${DEMO_TAG} Valoración inicial de riesgo metabólico.`,
          diagnostico: riesgo >= 2 ? "Riesgo metabólico elevado" : "Sin patología relevante",
          tratamiento: "Dieta, actividad física y seguimiento", observaciones: "Paciente colaborador.",
        },
        {
          id_paciente: pid, id_usuario: medico.id_usuario, fecha_registro: daysAgo(20),
          tipo_evento: "Revisión", descripcion: `${DEMO_TAG} Revisión de control.`,
          diagnostico: riesgo >= 3 ? "Diabetes tipo 2 en control" : "Evolución estable",
          tratamiento: riesgo >= 2 ? "Ajuste de tratamiento" : "Continuar medidas higiénico-dietéticas",
          observaciones: "Buena adherencia.",
        },
      ],
    })
  }

  // --- Consultas + citas (pasadas y futuras) ---
  if ((await prisma.consultaMedica.count({ where: { id_paciente: pid } })) === 0) {
    // Consulta pasada (completada)
    await prisma.consultaMedica.create({
      data: {
        id_paciente: pid, id_usuario: medico.id_usuario, fecha_consulta: daysAgo(20),
        motivo_consulta: "Control de salud metabólica",
        sintomas: riesgo >= 2 ? "Cansancio y sed ocasional" : "Sin síntomas",
        exploracion_fisica: `IMC ${prof.imc}; TA ${prof.sys}/${prof.dia} mmHg`,
        diagnostico: riesgo >= 3 ? "Diabetes tipo 2" : riesgo === 2 ? "Prediabetes" : "Control sano",
        tratamiento: riesgo >= 2 ? "Metformina + medidas higiénico-dietéticas" : "Medidas preventivas",
        observaciones: `${DEMO_TAG} Consulta de seguimiento.`,
        // Cita futura solo para una parte de los pacientes (para llenar la agenda)
        proxima_cita: i % 2 === 0 ? daysFromNow((i % 10) + 1) : null,
      },
    })
    // Algunos pacientes con una segunda cita futura programada explícitamente
    if (i % 3 === 0) {
      await prisma.consultaMedica.create({
        data: {
          id_paciente: pid, id_usuario: medico.id_usuario, fecha_consulta: daysAgo(2),
          motivo_consulta: `[CITA PROGRAMADA] ${DEMO_TAG} Revisión de laboratorios`,
          proxima_cita: daysFromNow((i % 14) + 3),
        },
      })
    }
  }

  // --- Recetas ---
  if ((await prisma.receta.count({ where: { id_paciente: pid } })) === 0) {
    const meds =
      riesgo >= 3
        ? [
            { nombre: "Metformina", dosis: "850 mg", frecuencia: "Cada 12 h", duracion: "30 días", indicaciones: "Con alimentos" },
            { nombre: "Losartán", dosis: "50 mg", frecuencia: "1 vez al día", duracion: "30 días", indicaciones: "Por la mañana" },
            { nombre: "Atorvastatina", dosis: "20 mg", frecuencia: "1 vez al día", duracion: "30 días", indicaciones: "Por la noche" },
          ]
        : riesgo === 2
        ? [{ nombre: "Metformina", dosis: "500 mg", frecuencia: "Cada 12 h", duracion: "30 días", indicaciones: "Con alimentos" }]
        : [{ nombre: "Multivitamínico", dosis: "1 tableta", frecuencia: "1 vez al día", duracion: "30 días", indicaciones: "Con el desayuno" }]
    await prisma.receta.create({
      data: {
        id_paciente: pid, id_usuario: medico.id_usuario, fecha_emicion: daysAgo(20),
        medicamentos: JSON.stringify(meds),
        instrucciones: "Tomar según indicación. No suspender sin valoración médica.",
        estado: "Activa",
      },
    })
  }

  // --- Predicción IA ---
  if ((await prisma.prediccion.count({ where: { id_paciente: pid } })) === 0 && modelo) {
    const r = RIESGO_LABEL[riesgo]
    await prisma.prediccion.create({
      data: {
        id_paciente: pid, id_usuario: medico.id_usuario, id_modelo: modelo.id_modelo,
        fecha_prediccion: daysAgo(20),
        datos_entrada: JSON.stringify({ AGE: patient.edad, BMI: prof.imc, HbA1c: prof.hba1c, Chol: prof.chol, TG: prof.tg }),
        resultado: r.nivel, probabilidad_diabetes: r.prob, probabilidad_no_diabetes: +(1 - r.prob).toFixed(2),
        nivel_riesgo: r.nivel, score_riesgo: r.score,
        factores_riesgo: JSON.stringify(
          riesgo >= 2 ? ["IMC elevado", "HbA1c en rango de riesgo", "Antecedentes familiares"] : ["Sin factores mayores"]
        ),
        recomendaciones: JSON.stringify([
          "Mantener dieta baja en azúcares simples",
          "Actividad física ≥ 150 min/semana",
          riesgo >= 2 ? "Control de glucosa periódico" : "Revisión anual",
        ]),
        validado: riesgo >= 3,
        diagnostico_confirmado: riesgo >= 3 ? "Confirmado" : "Pendiente",
      },
    })
  }

  // --- Alergias ---
  if ((await prisma.alergia.count({ where: { id_paciente: pid } })) === 0 && i % 2 === 0) {
    await prisma.alergia.create({
      data: {
        id_paciente: pid, id_usuario: medico.id_usuario,
        tipo_alergia: pick(["Medicamento", "Alimento", "Ambiental"], i),
        alergeno: pick(ALERGIAS_CATALOGO, i),
        severidad: pick(["Leve", "Moderada", "Severa"], i),
        reaccion: pick(["Urticaria", "Edema", "Dificultad respiratoria", "Prurito"], i),
        fecha_deteccion: daysAgo(400 + i), activa: true,
      },
    })
  }

  // --- Vacunas aplicadas ---
  if ((await prisma.vacunaAplicada.count({ where: { id_paciente: pid } })) === 0 && catalogs.vacunas.length) {
    const v1 = pick(catalogs.vacunas, i)
    const v2 = pick(catalogs.vacunas, i + 2)
    await prisma.vacunaAplicada.createMany({
      data: [
        { id_paciente: pid, id_vacuna: v1.id_vacuna, id_usuario: enfermero.id_usuario, fecha_aplicacion: daysAgo(200 + i), dosis_numero: 1, lote: `LOT-${1000 + i}`, observaciones: `${DEMO_TAG} Sin eventos adversos.` },
        { id_paciente: pid, id_vacuna: v2.id_vacuna, id_usuario: enfermero.id_usuario, fecha_aplicacion: daysAgo(60 + i), dosis_numero: 1, lote: `LOT-${2000 + i}`, observaciones: `${DEMO_TAG} Aplicada en campaña.` },
      ],
    })
  }

  // --- Patologías diagnosticadas ---
  if ((await prisma.patologiaPaciente.count({ where: { id_paciente: pid } })) === 0 && catalogs.patologias.length) {
    const patologiasPorRiesgo: Record<number, string[]> = {
      0: [],
      1: ["R73"],
      2: ["R73", "E66"],
      3: ["E11", "I10", "E78.5"],
    }
    const codes = patologiasPorRiesgo[riesgo] || []
    for (const code of codes) {
      const cat = catalogs.patologias.find((p) => p.codigo_cie10 === code)
      if (!cat) continue
      await prisma.patologiaPaciente.create({
        data: {
          id_paciente: pid, id_patologia: cat.id_patologia, id_usuario: medico.id_usuario,
          fecha_diagnostico: daysAgo(300), estado: "Activa",
          severidad: riesgo >= 3 ? "Moderada" : "Leve",
          notas: `${DEMO_TAG} Diagnóstico de seguimiento.`,
        },
      })
    }
  }

  // --- Fracturas (solo algunos pacientes) ---
  if ((await prisma.fractura.count({ where: { id_paciente: pid } })) === 0 && i % 5 === 2) {
    await prisma.fractura.create({
      data: {
        id_paciente: pid, id_usuario: medico.id_usuario, fecha_fractura: daysAgo(500),
        hueso_afectado: pick(["Radio", "Tibia", "Húmero", "Clavícula"], i),
        tipo_fractura: pick(["Cerrada", "Conminuta", "Por estrés"], i),
        lado: pick(["Izquierdo", "Derecho"], i), causa: "Caída accidental (demo)",
        tratamiento: "Inmovilización con yeso y rehabilitación",
        estado: "Consolidada", fecha_alta: daysAgo(420),
        observaciones: `${DEMO_TAG} Recuperación completa.`,
      },
    })
  }

  // --- Antecedentes familiares ---
  if ((await prisma.antecedenteFamiliar.count({ where: { id_paciente: pid } })) === 0) {
    await prisma.antecedenteFamiliar.createMany({
      data: [
        { id_paciente: pid, id_usuario: medico.id_usuario, parentesco: "Padre", condicion: "Diabetes mellitus tipo 2", detalles: `${DEMO_TAG} Diagnóstico a los 55 años.` },
        { id_paciente: pid, id_usuario: medico.id_usuario, parentesco: "Madre", condicion: "Hipertensión arterial", detalles: `${DEMO_TAG} En tratamiento.` },
      ],
    })
  }

  // --- Documentos adjuntos (texto pequeño, sin blobs pesados) ---
  if ((await prisma.documentoAdjunto.count({ where: { id_paciente: pid } })) === 0) {
    const contenido = Buffer.from(`${DEMO_TAG} Documento de prueba para ${patient.nombre} ${patient.apellido_paterno}.`, "utf-8")
    await prisma.documentoAdjunto.create({
      data: {
        id_paciente: pid, id_usuario: medico.id_usuario, tipo_documento: "Resultado Lab",
        nombre_archivo: `laboratorio_${patient.cedula}.txt`, tipo_archivo: "text/plain",
        datos_archivo: contenido, descripcion: `${DEMO_TAG} Resultado de laboratorio (archivo de ejemplo).`,
      },
    })
  }

  // --- Imágenes diagnósticas (metadatos + informe, sin blob real) ---
  if ((await prisma.imagenDiagnostica.count({ where: { id_paciente: pid } })) === 0 && i % 3 !== 1) {
    await prisma.imagenDiagnostica.create({
      data: {
        id_paciente: pid, id_usuario: medico.id_usuario, fecha_estudio: daysAgo(150),
        tipo_imagen: pick(["Radiografía", "Ultrasonido", "Tomografía"], i),
        region_anatomica: pick(["Tórax", "Abdomen", "Rodilla", "Columna"], i),
        archivo_nombre: `imagen_${patient.cedula}.jpg`, archivo_tipo: "image/jpeg",
        informe: `${DEMO_TAG} Estudio de imagen de control.`,
        hallazgos: "Sin hallazgos patológicos significativos.",
        conclusion: "Estudio dentro de límites normales.",
      },
    })
  }

  // --- Automonitoreo (glucosa diaria + peso/presión) ---
  if ((await prisma.automonitoreo.count({ where: { id_paciente: pid } })) === 0) {
    const auto: any[] = []
    for (let d = 13; d >= 0; d--) {
      auto.push({
        id_paciente: pid, tipo: "glucosa",
        valor: prof.glucosa + Math.round((Math.sin(d + i) + 1) * 12),
        unidad: "mg/dL", fecha_registro: daysAgo(d),
      })
    }
    for (let d = 25; d >= 0; d -= 5) {
      auto.push({ id_paciente: pid, tipo: "peso", valor: +(peso + (d / 25) * 1.5).toFixed(1), unidad: "kg", fecha_registro: daysAgo(d) })
      auto.push({ id_paciente: pid, tipo: "presion", valor: prof.sys + (d % 7), valor_secundario: prof.dia + (d % 5), unidad: "mmHg", fecha_registro: daysAgo(d) })
    }
    await prisma.automonitoreo.createMany({ data: auto })
  }
}

async function seedCitasFromLegacyConsultas() {
  const existing = await prisma.cita.count()
  if (existing > 0) {
    console.log(`📅 Agenda clínica ya tiene ${existing} citas; no se duplican datos.`)
    return
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const consultasConCita = await prisma.consultaMedica.findMany({
    where: {
      proxima_cita: { gte: today },
    },
    select: {
      id_paciente: true,
      id_usuario: true,
      proxima_cita: true,
      motivo_consulta: true,
    },
    orderBy: { proxima_cita: "asc" },
  })

  if (!consultasConCita.length) {
    const [pacientes, medicos] = await Promise.all([
      prisma.paciente.findMany({
        where: { activo: true },
        select: { id_paciente: true, nombre: true, apellido_paterno: true },
        orderBy: { id_paciente: "asc" },
        take: 12,
      }),
      prisma.usuario.findMany({
        where: { rol: { nombre_rol: { in: ["Médico", "Administrador"] } }, activo: true },
        select: { id_usuario: true },
        orderBy: { id_usuario: "asc" },
      }),
    ])

    if (!pacientes.length || !medicos.length) {
      console.log("📅 No hay pacientes o médicos suficientes para crear agenda demo.")
      return
    }

    const motivos = [
      "Seguimiento metabólico y revisión de glucosa",
      "Validación de predicción IA",
      "Control de tratamiento y receta",
      "Revisión de laboratorios recientes",
      "Evaluación de signos vitales",
      "Consulta preventiva de riesgo cardiometabólico",
    ]

    await prisma.cita.createMany({
      data: pacientes.map((paciente, index) => {
        const fecha = daysFromNow(Math.floor(index / 3))
        fecha.setHours(9 + (index % 6), index % 2 === 0 ? 0 : 30, 0, 0)
        return {
          id_paciente: paciente.id_paciente,
          id_usuario: medicos[index % medicos.length].id_usuario,
          fecha_cita: fecha,
          motivo: motivos[index % motivos.length],
          estado: "PROGRAMADA",
        }
      }),
      skipDuplicates: true,
    })

    const totalFallback = await prisma.cita.count()
    console.log(`📅 Agenda clínica demo creada directamente: ${totalFallback} citas.`)
    return
  }

  await prisma.cita.createMany({
    data: consultasConCita
      .filter((consulta) => consulta.proxima_cita)
      .map((consulta) => ({
        id_paciente: consulta.id_paciente,
        id_usuario: consulta.id_usuario,
        fecha_cita: consulta.proxima_cita as Date,
        motivo: consulta.motivo_consulta.replace("[CITA PROGRAMADA]", "").replace(DEMO_TAG, "").trim() || "Seguimiento clínico",
        estado: "PROGRAMADA",
      })),
    skipDuplicates: true,
  })

  const total = await prisma.cita.count()
  console.log(`📅 Agenda clínica creada: ${total} citas programadas.`)
}

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================

async function main() {
  console.log("\n" + "=".repeat(60))
  console.log("  🌱 SEED DE PREDIA (DATOS DE PRUEBA / DEMO)")
  console.log("=".repeat(60) + "\n")

  try {
    const roles = await seedRoles()
    const users = await seedUsers(roles)
    const catalogs = await seedCatalogs()
    const patients = await seedPatients()
    const modelo = await seedModel()

    console.log("🩺 Generando datos clínicos por paciente (idempotente)...")
    for (let i = 0; i < patients.length; i++) {
      await seedClinicalForPatient(patients[i], i, users, modelo, catalogs)
    }
    await seedCitasFromLegacyConsultas()
    console.log("✅ Datos clínicos generados\n")

    // Conteos finales
    const [pacientes, consultas, citas, recetas, predicciones, alergias, vacunas, patologias, fracturas, antecedentes, docs, imagenes, mediciones, estudios, auto] =
      await Promise.all([
        prisma.paciente.count(),
        prisma.consultaMedica.count(),
        prisma.cita.count({ where: { estado: { in: ["PROGRAMADA", "EN_CURSO"] } } }),
        prisma.receta.count(),
        prisma.prediccion.count(),
        prisma.alergia.count(),
        prisma.vacunaAplicada.count(),
        prisma.patologiaPaciente.count(),
        prisma.fractura.count(),
        prisma.antecedenteFamiliar.count(),
        prisma.documentoAdjunto.count(),
        prisma.imagenDiagnostica.count(),
        prisma.medicionAntropometrica.count(),
        prisma.estudioLaboratorio.count(),
        prisma.automonitoreo.count(),
      ])

    console.log("=".repeat(60))
    console.log("✅ SEED COMPLETADO")
    console.log("=".repeat(60))
    console.log("\n📊 Totales en BD:")
    console.table({
      Pacientes: pacientes, Consultas: consultas, "Citas futuras": citas, Recetas: recetas,
      "Predicciones IA": predicciones, Alergias: alergias, Vacunas: vacunas, Patologías: patologias,
      Fracturas: fracturas, Antecedentes: antecedentes, Documentos: docs, Imágenes: imagenes,
      "Signos vitales": mediciones, "Estudios lab": estudios, Automonitoreo: auto,
    })

    console.log("\n🔐 Credenciales WEB (usuario / contraseña):")
    console.log(`   Admin:     admin_luis / ${DEFAULT_PASSWORD}`)
    console.log(`   Médico:    dr_juan / ${DEFAULT_PASSWORD}  (también dr_maria, dr_carlos)`)
    console.log(`   Enfermero: enf_pedro / ${DEFAULT_PASSWORD}  (también enf_ana)`)

    console.log("\n📱 Credenciales MÓVIL (paciente — CURP / PIN):")
    console.log(`   ${PATIENTS[0].nombre} ${PATIENTS[0].apellido_paterno}: ${PATIENTS[0].curp} / ${DEFAULT_PATIENT_PIN}`)
    console.log(`   (todos los pacientes usan PIN ${DEFAULT_PATIENT_PIN})`)
    console.log("")
  } catch (error) {
    console.error("\n❌ ERROR EN SEED:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
