// types/database.ts
// Tipos TypeScript para las tablas de la base de datos

export interface Usuario {
  id_usuario: number
  username: string
  password_hash: string
  id_rol: number
  nombre: string
  apellido_paterno: string
  apellido_materno: string | null
  email: string
  telefono: string | null
  cedula_profesional: string | null
  especialidad: string | null
  activo: boolean
  ultimo_acceso: Date | null
  fecha_registro: Date
  fecha_modificacion: Date
}

export interface Paciente {
  id_paciente: number
  cedula: string
  nombre: string
  apellido_paterno: string
  apellido_materno: string | null
  genero: "M" | "F" | "Otro"
  fecha_nacimiento: Date
  edad: number
  telefono: string | null
  email: string | null
  id_direccion: number | null
  foto_perfil: string | null
  activo: boolean
  fecha_registro: Date
  fecha_modificacion: Date
}

export interface EstudioLaboratorio {
  id_estudio: number
  id_paciente: number
  id_usuario: number
  fecha_estudio: Date
  urea: number | null
  creatinina: number | null
  hba1c: number | null
  glucosa_ayunas: number | null
  colesterol_total: number | null
  trigliceridos: number | null
  hdl: number | null
  ldl: number | null
  vldl: number | null
  observaciones: string | null
  archivo_pdf: string | null
  activo: boolean
}

export interface MedicionAntropometrica {
  id_medicion: number
  id_paciente: number
  id_usuario: number
  fecha_medicion: Date
  peso: number | null
  altura: number | null
  imc: number | null
  circunferencia_cintura: number | null
  circunferencia_cadera: number | null
  presion_sistolica: number | null
  presion_diastolica: number | null
  observaciones: string | null
  activo: boolean
}

export interface ModeloIA {
  id_modelo: number
  version: string
  fecha_entrenamiento: Date
  accuracy: number
  n_samples_train: number
  n_samples_test: number
  features: string // JSON
  feature_importance: string | null // JSON
  descripcion: string | null
  archivo_modelo: string | null
  activo: boolean
  fecha_registro: Date
}

export interface Prediccion {
  id_prediccion: number
  id_paciente: number
  id_usuario: number
  id_modelo: number
  id_estudio: number | null
  id_medicion: number | null
  fecha_prediccion: Date
  datos_entrada: string // JSON
  resultado: "No Diabetes" | "Diabetes"
  probabilidad_diabetes: number
  probabilidad_no_diabetes: number
  nivel_riesgo: "Bajo" | "Moderado" | "Alto" | "Muy Alto"
  factores_riesgo: string | null // JSON
  recomendaciones: string | null
  validado: boolean
  diagnostico_confirmado: "Pendiente" | "Confirmado" | "Descartado"
  notas_medicas: string | null
  fecha_validacion: Date | null
}

export interface HistorialClinico {
  id_historial: number
  id_paciente: number
  id_usuario: number
  fecha_registro: Date
  tipo_evento: "Consulta" | "Estudio" | "Predicción" | "Seguimiento" | "Diagnóstico" | "Otro"
  descripcion: string
  diagnostico: string | null
  tratamiento: string | null
  observaciones: string | null
}

// DTOs (Data Transfer Objects) para las APIs

export interface CreatePacienteDTO {
  cedula: string
  nombre: string
  apellido_paterno: string
  apellido_materno?: string
  genero: "M" | "F" | "Otro"
  fecha_nacimiento: string // formato: YYYY-MM-DD
  telefono?: string
  email?: string
}

export interface CreateEstudioDTO {
  id_paciente: number
  urea?: number
  creatinina?: number
  hba1c?: number
  glucosa_ayunas?: number
  colesterol_total?: number
  trigliceridos?: number
  hdl?: number
  ldl?: number
  vldl?: number
  observaciones?: string
}

export interface CreateMedicionDTO {
  id_paciente: number
  peso?: number
  altura?: number
  circunferencia_cintura?: number
  circunferencia_cadera?: number
  presion_sistolica?: number
  presion_diastolica?: number
  observaciones?: string
}

export interface CreatePrediccionDTO {
  id_paciente: number
  id_estudio?: number
  id_medicion?: number
  datos_entrada: {
    Gender: number // 0=F, 1=M
    AGE: number
    Urea: number
    Cr: number
    HbA1c: number
    Chol: number
    TG: number
    HDL: number
    LDL: number
    VLDL: number
    BMI: number
  }
}

// Respuestas de la API

export interface PacienteConUltimaPredicion extends Paciente {
  ultima_prediccion: {
    fecha_prediccion: Date
    resultado: string
    probabilidad_diabetes: number
    nivel_riesgo: string
    diagnostico_confirmado: string
  } | null
}

export interface EstudioCompleto extends EstudioLaboratorio {
  paciente: {
    nombre: string
    apellido_paterno: string
    cedula: string
    genero: string
    edad: number
  }
  imc: number | null
  medico: {
    nombre: string
    apellido_paterno: string
  }
}
