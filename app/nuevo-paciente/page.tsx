"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MedicalHeader } from "@/components/medical-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Brain, User, AlertCircle } from "lucide-react"

interface PatientData {
  nombre: string
  apellido_paterno: string
  apellido_materno?: string
  cedula: string
  genero: string
  fecha_nacimiento: string
  email?: string
  telefono?: string
  // Datos para predicción
  age: string // Requerido para validación
  urea: string
  cr: string
  hba1c: string
  chol: string
  tg: string
  hdl: string
  ldl: string
  vldl: string
  bmi: string
}

// ✅ Mapeo explícito de género (evita discriminación de "Otro")
const GENDER_MAP: Record<string, number> = {
  M: 1,      // Masculino
  F: 0,      // Femenino
  Otro: 0,   // Otro (usa mismo valor que Femenino)
}

// ✅ Calcular edad correctamente considerando mes y día
const calcularEdad = (fechaNacimiento: string): number => {
  const hoy = new Date()
  const nacimiento = new Date(fechaNacimiento)
  let edad = hoy.getFullYear() - nacimiento.getFullYear()
  const mes = hoy.getMonth() - nacimiento.getMonth()

  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--
  }

  return edad
}

// ✅ Rangos basados en el dataset de entrenamiento
const DATASET_RANGES = {
  AGE: { min: 20, max: 100 },
  Urea: { min: 0.5, max: 38.9 },
  Cr: { min: 6, max: 800 },
  HbA1c: { min: 0.9, max: 16 },
  Chol: { min: 0, max: 10.3 },
  TG: { min: 0.3, max: 13.8 },
  HDL: { min: 0.2, max: 9.9 },
  LDL: { min: 0.3, max: 9.9 },
  VLDL: { min: 0.1, max: 35 },
  BMI: { min: 19, max: 47.75 },
}

// ✅ Validar que estén dentro de rangos del dataset
const validarDatosLaboratorio = (data: PatientData): string[] => {
  const errores: string[] = []

  const urea = parseFloat(data.urea)
  if (isNaN(urea) || urea < DATASET_RANGES.Urea.min || urea > DATASET_RANGES.Urea.max) {
    errores.push(`Urea debe estar entre ${DATASET_RANGES.Urea.min} y ${DATASET_RANGES.Urea.max} mg/dL`)
  }

  const cr = parseFloat(data.cr)
  if (isNaN(cr) || cr < DATASET_RANGES.Cr.min || cr > DATASET_RANGES.Cr.max) {
    errores.push(`Creatinina debe estar entre ${DATASET_RANGES.Cr.min} y ${DATASET_RANGES.Cr.max} mg/dL`)
  }

  const hba1c = parseFloat(data.hba1c)
  if (isNaN(hba1c) || hba1c < DATASET_RANGES.HbA1c.min || hba1c > DATASET_RANGES.HbA1c.max) {
    errores.push(`HbA1c debe estar entre ${DATASET_RANGES.HbA1c.min} y ${DATASET_RANGES.HbA1c.max}%`)
  }

  const chol = parseFloat(data.chol)
  if (isNaN(chol) || chol < DATASET_RANGES.Chol.min || chol > DATASET_RANGES.Chol.max) {
    errores.push(`Colesterol total debe estar entre ${DATASET_RANGES.Chol.min} y ${DATASET_RANGES.Chol.max} mmol/L`)
  }

  const tg = parseFloat(data.tg)
  if (isNaN(tg) || tg < DATASET_RANGES.TG.min || tg > DATASET_RANGES.TG.max) {
    errores.push(`Triglicéridos deben estar entre ${DATASET_RANGES.TG.min} y ${DATASET_RANGES.TG.max} mmol/L`)
  }

  const hdl = parseFloat(data.hdl)
  if (isNaN(hdl) || hdl < DATASET_RANGES.HDL.min || hdl > DATASET_RANGES.HDL.max) {
    errores.push(`HDL debe estar entre ${DATASET_RANGES.HDL.min} y ${DATASET_RANGES.HDL.max} mmol/L`)
  }

  const ldl = parseFloat(data.ldl)
  if (isNaN(ldl) || ldl < DATASET_RANGES.LDL.min || ldl > DATASET_RANGES.LDL.max) {
    errores.push(`LDL debe estar entre ${DATASET_RANGES.LDL.min} y ${DATASET_RANGES.LDL.max} mmol/L`)
  }

  const vldl = parseFloat(data.vldl)
  if (isNaN(vldl) || vldl < DATASET_RANGES.VLDL.min || vldl > DATASET_RANGES.VLDL.max) {
    errores.push(`VLDL debe estar entre ${DATASET_RANGES.VLDL.min} y ${DATASET_RANGES.VLDL.max} mg/dL`)
  }

  const bmi = parseFloat(data.bmi)
  if (isNaN(bmi) || bmi < DATASET_RANGES.BMI.min || bmi > DATASET_RANGES.BMI.max) {
    errores.push(`BMI debe estar entre ${DATASET_RANGES.BMI.min} y ${DATASET_RANGES.BMI.max} kg/m²`)
  }

  // Validar edad
  const edad = calcularEdad(data.fecha_nacimiento)
  if (edad < DATASET_RANGES.AGE.min || edad > DATASET_RANGES.AGE.max) {
    errores.push(`Edad debe estar entre ${DATASET_RANGES.AGE.min} y ${DATASET_RANGES.AGE.max} años. Edad calculada: ${edad}`)
  }

  // Validar que fecha de nacimiento no sea futura
  const fechaNac = new Date(data.fecha_nacimiento)
  if (fechaNac > new Date()) {
    errores.push("La fecha de nacimiento no puede ser futura")
  }

  return errores
}

// ✅ Helper para extraer mensaje de error de respuesta API
const extraerMensajeError = (errorData: any, defaultMsg: string = "Error desconocido"): string => {
  if (!errorData) return defaultMsg

  // Si details es un array (validación Zod)
  if (Array.isArray(errorData.details)) {
    const firstError = errorData.details[0]
    if (typeof firstError === 'object' && firstError?.message) {
      return firstError.message
    }
    return String(firstError)
  }

  // Si details es string
  if (typeof errorData.details === 'string') {
    return errorData.details
  }

  // Si hay error directo
  if (typeof errorData.error === 'string') {
    return errorData.error
  }

  // Si hay message
  if (typeof errorData.message === 'string') {
    return errorData.message
  }

  return defaultMsg
}

export default function NuevoPacientePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [token, setToken] = useState<string | null>(null)
  // ✅ Step tracking para mostrar progreso
  const [step, setStep] = useState<'idle' | 'patient' | 'study' | 'measurement' | 'prediction' | 'complete'>('idle')
  const [patientData, setPatientData] = useState<PatientData>({
    nombre: "",
    apellido_paterno: "",
    apellido_materno: "",
    cedula: "",
    genero: "",
    fecha_nacimiento: "",
    email: "",
    telefono: "",
    age: "",
    urea: "",
    cr: "",
    hba1c: "",
    chol: "",
    tg: "",
    hdl: "",
    ldl: "",
    vldl: "",
    bmi: "",
  })

  useEffect(() => {
    const storedToken = localStorage.getItem("token")
    if (!storedToken) {
      router.push("/login")
    } else {
      setToken(storedToken)
    }
  }, [router])

  const handleInputChange = (field: keyof PatientData, value: string) => {
    setPatientData((prev) => ({ ...prev, [field]: value }))
    setError("")
  }

  // ✅ Función auxiliar para obtener mensaje de paso
  const getStepMessage = (currentStep: typeof step): string => {
    const messages: Record<typeof step, string> = {
      idle: "Procesando con IA...",
      patient: "Creando paciente...",
      study: "Registrando estudios de laboratorio...",
      measurement: "Registrando mediciones...",
      prediction: "Generando predicción con IA...",
      complete: "¡Procesamiento completado!",
    }
    return messages[currentStep]
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setStep('idle')
    let id_paciente: number | null = null

    try {
      // ✅ Re-verificar token antes de procesar
      const currentToken = localStorage.getItem("token")
      if (!currentToken) {
        throw new Error("Sesión expirada. Por favor, inicia sesión de nuevo")
      }

      // ✅ Validar campos requeridos
      if (!patientData.nombre.trim()) {
        throw new Error("El nombre es requerido")
      }
      if (!patientData.apellido_paterno.trim()) {
        throw new Error("El apellido paterno es requerido")
      }
      if (!patientData.cedula.trim()) {
        throw new Error("La cédula es requerida")
      }
      if (!patientData.genero) {
        throw new Error("Debe seleccionar un género")
      }
      if (!patientData.fecha_nacimiento) {
        throw new Error("La fecha de nacimiento es requerida")
      }

      // ✅ Validar datos de laboratorio con rangos
      const validacionErrores = validarDatosLaboratorio(patientData)
      if (validacionErrores.length > 0) {
        throw new Error(validacionErrores[0])
      }

      // ✅ 1. Crear paciente
      setStep('patient')
      const pacienteResponse = await fetch("/api/pacientes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({
          cedula: patientData.cedula.trim(),
          nombre: patientData.nombre.trim(),
          apellido_paterno: patientData.apellido_paterno.trim(),
          apellido_materno: patientData.apellido_materno?.trim() || null,
          genero: patientData.genero,
          fecha_nacimiento: patientData.fecha_nacimiento,
          email: patientData.email?.trim() || null,
          telefono: patientData.telefono?.trim() || null,
        }),
      })

      if (!pacienteResponse.ok) {
        const errorData = await pacienteResponse.json()
        const errorMsg = extraerMensajeError(errorData, "Error al crear paciente")
        console.error("Paciente error:", { status: pacienteResponse.status, errorData, errorMsg })
        throw new Error(errorMsg)
      }

      const pacienteData = await pacienteResponse.json()
      id_paciente = pacienteData.data.id_paciente

      // ✅ Calcular edad correctamente (considerando mes y día)
      const age = calcularEdad(patientData.fecha_nacimiento)

      // ✅ 2. Crear estudio de laboratorio
      setStep('study')
      const estudioResponse = await fetch("/api/estudios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({
          id_paciente,
          urea: parseFloat(patientData.urea),
          creatinina: parseFloat(patientData.cr),
          hba1c: parseFloat(patientData.hba1c),
          glucosa: 0, // No proporcionado en el formulario
          colesterol: parseFloat(patientData.chol),
          trigliceridos: parseFloat(patientData.tg),
          hdl: parseFloat(patientData.hdl),
          ldl: parseFloat(patientData.ldl),
          vldl: parseFloat(patientData.vldl),
          observaciones: "Estudio inicial de laboratorio",
        }),
      })

      // ✅ Verificar que estudio se creó correctamente
      if (!estudioResponse.ok) {
        const errorData = await estudioResponse.json()
        const errorMsg = extraerMensajeError(errorData, "Error desconocido")
        throw new Error(`Error al crear estudio: ${errorMsg}`)
      }

      const estudioData = await estudioResponse.json()
      const id_estudio = estudioData.data.id_estudio

      // ✅ 3. Crear medición antropométrica (omitir campos con valor 0)
      setStep('measurement')
      const medicionResponse = await fetch("/api/mediciones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({
          id_paciente,
          // ✅ Solo incluir campos con valores > 0
          ...(parseFloat(patientData.bmi) > 0 && { imc: parseFloat(patientData.bmi) }),
          observaciones: "Medición inicial - Datos completados en formulario de admisión",
        }),
      })

      // ✅ Verificar que medición se creó correctamente
      if (!medicionResponse.ok) {
        const errorData = await medicionResponse.json()
        const errorMsg = extraerMensajeError(errorData, "Error desconocido")
        throw new Error(`Error al crear medición: ${errorMsg}`)
      }

      const medicionData = await medicionResponse.json()
      const id_medicion = medicionData.data.id_medicion

      // ✅ 4. Realizar predicción con IA
      setStep('prediction')
      const prediccionResponse = await fetch("/api/predicciones/nueva", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({
          id_paciente,
          id_estudio,
          id_medicion,
          datos_entrada: {
            Gender: GENDER_MAP[patientData.genero] ?? 0, // ✅ Usar mapeo explícito
            AGE: age,
            Urea: parseFloat(patientData.urea),
            Cr: parseFloat(patientData.cr),
            HbA1c: parseFloat(patientData.hba1c),
            Chol: parseFloat(patientData.chol),
            TG: parseFloat(patientData.tg),
            HDL: parseFloat(patientData.hdl),
            LDL: parseFloat(patientData.ldl),
            VLDL: parseFloat(patientData.vldl),
            BMI: parseFloat(patientData.bmi),
          },
        }),
      })

      if (!prediccionResponse.ok) {
        const errorData = await prediccionResponse.json()
        const errorMsg = extraerMensajeError(errorData, "Error al realizar predicción")
        console.error("Predicción error:", { status: prediccionResponse.status, errorData, errorMsg })
        throw new Error(`Error al crear predicción: ${errorMsg}`)
      }

      const prediccionData = await prediccionResponse.json()
      const id_prediccion = prediccionData.data.id_prediccion

      // ✅ Marcar como completo
      setStep('complete')

      // ✅ Usar ID de predicción (no de paciente) para cargar resultado
      router.push(`/resultado?id=${id_prediccion}`)

      // ✅ Invalidar cache DESPUÉS de navegar (no antes)
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      // ✅ Mostrar en qué paso falló
      if (step !== 'idle' && step !== 'complete') {
        setError(`Error en ${getStepMessage(step).toLowerCase()}: ${message}`)
      } else {
        setError(message)
      }
      console.error("Error:", err)
      setStep('idle')
    } finally {
      setLoading(false)
    }
  }

  const isFormValid = () => {
    const requiredFields: (keyof PatientData)[] = [
      "nombre",
      "apellido_paterno",
      "cedula",
      "genero",
      "fecha_nacimiento",
      "age",
      "urea",
      "cr",
      "hba1c",
      "chol",
      "tg",
      "hdl",
      "ldl",
      "vldl",
      "bmi",
    ]
    // ✅ Validación básica más robusta
    return requiredFields.every(
      (field) => {
        const value = patientData[field]
        return value !== undefined && String(value).trim() !== ""
      }
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MedicalHeader />

      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Nuevo Paciente</h1>
          <p className="mt-2 text-gray-600">Ingrese los datos clínicos para evaluación con IA</p>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* ✅ Mostrar progreso por pasos */}
        {loading && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
            <AlertDescription className="text-blue-800">{getStepMessage(step)}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información del paciente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5 text-blue-600" />
                <span>Información del Paciente</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={patientData.nombre}
                  onChange={(e) => handleInputChange("nombre", e.target.value)}
                  placeholder="Ej: María"
                  required
                />
              </div>
              <div>
                <Label htmlFor="apellido_paterno">Apellido Paterno *</Label>
                <Input
                  id="apellido_paterno"
                  value={patientData.apellido_paterno}
                  onChange={(e) => handleInputChange("apellido_paterno", e.target.value)}
                  placeholder="Ej: González"
                  required
                />
              </div>
              <div>
                <Label htmlFor="apellido_materno">Apellido Materno</Label>
                <Input
                  id="apellido_materno"
                  value={patientData.apellido_materno}
                  onChange={(e) => handleInputChange("apellido_materno", e.target.value)}
                  placeholder="Ej: López"
                />
              </div>
              <div>
                <Label htmlFor="cedula">Cédula/ID *</Label>
                <Input
                  id="cedula"
                  value={patientData.cedula}
                  onChange={(e) => handleInputChange("cedula", e.target.value)}
                  placeholder="Ej: 12345678"
                  required
                />
              </div>
              <div>
                <Label htmlFor="genero">Género *</Label>
                <select
                  id="genero"
                  value={patientData.genero}
                  onChange={(e) => handleInputChange("genero", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="">Seleccione...</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div>
                <Label htmlFor="fecha_nacimiento">Fecha Nacimiento (YYYY-MM-DD) *</Label>
                <Input
                  id="fecha_nacimiento"
                  type="date"
                  value={patientData.fecha_nacimiento}
                  onChange={(e) => handleInputChange("fecha_nacimiento", e.target.value)}
                  min="1900-01-01"
                  max={new Date().toISOString().split('T')[0]} // ✅ No puede ser futura
                  required
                />
              </div>
              <div>
                <Label htmlFor="age">Edad (años) * <span className="text-xs text-gray-500">(Rango dataset: 20-79)</span></Label>
                <Input
                  id="age"
                  type="number"
                  min="20"
                  max="79"
                  value={patientData.age}
                  onChange={(e) => handleInputChange("age", e.target.value)}
                  placeholder="Ej: 45"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={patientData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="Ej: paciente@email.com"
                />
              </div>
              <div>
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={patientData.telefono}
                  onChange={(e) => handleInputChange("telefono", e.target.value)}
                  placeholder="Ej: +34 600 123 456"
                />
              </div>
            </CardContent>
          </Card>

          {/* Datos de Laboratorio - Función Renal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="w-5 h-5 text-purple-600" />
                <span>Función Renal</span>
              </CardTitle>
              <CardDescription>Pruebas de laboratorio - función renal</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="urea">Urea (mg/dL) * <span className="text-xs text-gray-500">(0.5-38.9)</span></Label>
                <Input
                  id="urea"
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="38.9"
                  value={patientData.urea}
                  onChange={(e) => handleInputChange("urea", e.target.value)}
                  placeholder="Ej: 4.7"
                  required
                />
              </div>
              <div>
                <Label htmlFor="cr">Creatinina (mg/dL) * <span className="text-xs text-gray-500">(6-800)</span></Label>
                <Input
                  id="cr"
                  type="number"
                  step="1"
                  min="6"
                  max="800"
                  value={patientData.cr}
                  onChange={(e) => handleInputChange("cr", e.target.value)}
                  placeholder="Ej: 46"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Datos de Laboratorio - Glucosa y Lípidos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="w-5 h-5 text-green-600" />
                <span>Glucosa y Perfil Lipídico</span>
              </CardTitle>
              <CardDescription>Pruebas de laboratorio - glucosa y lípidos</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hba1c">HbA1c (%) * <span className="text-xs text-gray-500">(0.9-16)</span></Label>
                <Input
                  id="hba1c"
                  type="number"
                  step="0.1"
                  min="0.9"
                  max="16"
                  value={patientData.hba1c}
                  onChange={(e) => handleInputChange("hba1c", e.target.value)}
                  placeholder="Ej: 4.9"
                  required
                />
              </div>
              <div>
                <Label htmlFor="chol">Colesterol Total (mmol/L) * <span className="text-xs text-gray-500">(0-10.3)</span></Label>
                <Input
                  id="chol"
                  type="number"
                  step="0.1"
                  min="0"
                  max="10.3"
                  value={patientData.chol}
                  onChange={(e) => handleInputChange("chol", e.target.value)}
                  placeholder="Ej: 4.2"
                  required
                />
              </div>
              <div>
                <Label htmlFor="tg">Triglicéridos (mmol/L) * <span className="text-xs text-gray-500">(0.3-13.8)</span></Label>
                <Input
                  id="tg"
                  type="number"
                  step="0.1"
                  min="0.3"
                  max="13.8"
                  value={patientData.tg}
                  onChange={(e) => handleInputChange("tg", e.target.value)}
                  placeholder="Ej: 0.9"
                  required
                />
              </div>
              <div>
                <Label htmlFor="hdl">HDL Colesterol (mmol/L) * <span className="text-xs text-gray-500">(0.2-9.9)</span></Label>
                <Input
                  id="hdl"
                  type="number"
                  step="0.1"
                  min="0.2"
                  max="9.9"
                  value={patientData.hdl}
                  onChange={(e) => handleInputChange("hdl", e.target.value)}
                  placeholder="Ej: 2.4"
                  required
                />
              </div>
              <div>
                <Label htmlFor="ldl">LDL Colesterol (mmol/L) * <span className="text-xs text-gray-500">(0.3-9.9)</span></Label>
                <Input
                  id="ldl"
                  type="number"
                  step="0.1"
                  min="0.3"
                  max="9.9"
                  value={patientData.ldl}
                  onChange={(e) => handleInputChange("ldl", e.target.value)}
                  placeholder="Ej: 1.4"
                  required
                />
              </div>
              <div>
                <Label htmlFor="vldl">VLDL Colesterol (mg/dL) * <span className="text-xs text-gray-500">(0.1-35)</span></Label>
                <Input
                  id="vldl"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="35"
                  value={patientData.vldl}
                  onChange={(e) => handleInputChange("vldl", e.target.value)}
                  placeholder="Ej: 0.5"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Datos Antropométricos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="w-5 h-5 text-orange-600" />
                <span>Datos Antropométricos</span>
              </CardTitle>
              <CardDescription>Mediciones físicas</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bmi">IMC (kg/m²) * <span className="text-xs text-gray-500">(19-47.75)</span></Label>
                <Input
                  id="bmi"
                  type="number"
                  step="0.1"
                  min="19"
                  max="47.75"
                  value={patientData.bmi}
                  onChange={(e) => handleInputChange("bmi", e.target.value)}
                  placeholder="Ej: 24"
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Alert className="border-blue-200 bg-blue-50">
            <Brain className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Los datos serán procesados por nuestro modelo de IA entrenado (Precisión: 97.89%). Las características
              más importantes son: BMI, HbA1c, Triglicéridos y Colesterol Total.
            </AlertDescription>
          </Alert>

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={() => router.push("/dashboard")} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!isFormValid() || loading} className="bg-green-600 hover:bg-green-700">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {getStepMessage(step)}
                </>
              ) : (
                "Procesar con IA"
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
