export interface PacienteResumen {
  id: number
  nombre: string
  curp: string
  fechaNacimiento: string
  sexo: string
  telefono?: string
  email?: string
}

export interface SignosVitales {
  peso?: number
  talla?: number
  presionSistolica?: number
  presionDiastolica?: number
  glucosa?: number
  temperatura?: number
  frecuenciaCardiaca?: number
  frecuenciaRespiratoria?: number
  saturacionOxigeno?: number
  registradoEn: string
}

export interface PrediccionRiesgo {
  id: number
  nivelRiesgo: 'BAJO' | 'MEDIO' | 'ALTO' | 'MUY_ALTO'
  probabilidad: number
  recomendaciones: string[]
  validadoPorMedico: boolean
  fechaPrediccion: string
}
