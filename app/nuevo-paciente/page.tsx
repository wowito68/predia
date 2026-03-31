"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, User, AlertCircle, ClipboardList, Brain, CheckCircle2, ChevronRight } from "lucide-react"

interface PatientData {
  nombre: string
  apellido_paterno: string
  apellido_materno?: string
  cedula: string
  genero: string
  fecha_nacimiento: string
  email?: string
  telefono?: string
  tipo_sangre?: string
  seguro_medico?: string
  poliza_seguro?: string
  contacto_emergencia_nombre?: string
  contacto_emergencia_telefono?: string
}

// Helper para extraer mensaje de error de respuesta API
const extraerMensajeError = (errorData: any, defaultMsg: string = "Error desconocido"): string => {
  if (!errorData) return defaultMsg

  if (Array.isArray(errorData.details)) {
    const firstError = errorData.details[0]
    if (typeof firstError === 'object' && firstError?.message) {
      return firstError.message
    }
    return String(firstError)
  }

  if (typeof errorData.details === 'string') {
    return errorData.details
  }

  if (typeof errorData.error === 'string') {
    return errorData.error
  }

  if (typeof errorData.message === 'string') {
    return errorData.message
  }

  return defaultMsg
}

// Componente de Stepper Visual
function FlowStepper({ currentStep }: { currentStep: number }) {
  const steps = [
    { number: 1, label: "Datos Básicos", description: "Información demográfica y administrativa", icon: User },
    { number: 2, label: "Historial Clínico", description: "Antecedentes, alergias, vacunas, patologías", icon: ClipboardList },
    { number: 3, label: "Herramientas IA", description: "Análisis predictivo (opcional)", icon: Brain },
  ]

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between relative">
        {/* Línea de conexión */}
        <div className="absolute top-6 left-0 right-0 h-0.5 bg-border -z-0" />
        <div
          className="absolute top-6 left-0 h-0.5 bg-primary -z-0 transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step) => {
          const Icon = step.icon
          const isActive = step.number === currentStep
          const isCompleted = step.number < currentStep
          const isFuture = step.number > currentStep

          return (
            <div key={step.number} className="flex flex-col items-center relative z-10" style={{ width: '33%' }}>
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isCompleted
                    ? "bg-primary border-primary text-primary-foreground"
                    : isActive
                      ? "bg-card border-primary text-primary shadow-lg shadow-primary/20"
                      : "bg-muted border-border text-muted-foreground"
                  }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              <p className={`mt-2 text-sm font-semibold text-center ${isActive ? "text-primary" : isFuture ? "text-muted-foreground/50" : "text-foreground"
                }`}>
                {step.label}
              </p>
              <p className={`text-xs text-center mt-0.5 max-w-[140px] ${isFuture ? "text-muted-foreground/40" : "text-muted-foreground"
                }`}>
                {step.description}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function NuevoPacientePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [token, setToken] = useState<string | null>(null)
  const [patientData, setPatientData] = useState<PatientData>({
    nombre: "",
    apellido_paterno: "",
    apellido_materno: "",
    cedula: "",
    genero: "",
    fecha_nacimiento: "",
    email: "",
    telefono: "",
    tipo_sangre: "",
    seguro_medico: "",
    poliza_seguro: "",
    contacto_emergencia_nombre: "",
    contacto_emergencia_telefono: "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const currentToken = localStorage.getItem("token")
      if (!currentToken) {
        throw new Error("Sesión expirada. Por favor, inicia sesión de nuevo")
      }

      // Validar campos requeridos
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

      // Validar que fecha de nacimiento no sea futura
      const fechaNac = new Date(patientData.fecha_nacimiento)
      if (fechaNac > new Date()) {
        throw new Error("La fecha de nacimiento no puede ser futura")
      }

      // Crear paciente (solo datos demográficos)
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
          tipo_sangre: patientData.tipo_sangre || null,
          seguro_medico: patientData.seguro_medico?.trim() || null,
          poliza_seguro: patientData.poliza_seguro?.trim() || null,
          contacto_emergencia_nombre: patientData.contacto_emergencia_nombre?.trim() || null,
          contacto_emergencia_telefono: patientData.contacto_emergencia_telefono?.trim() || null,
        }),
      })

      if (!pacienteResponse.ok) {
        const errorData = await pacienteResponse.json()
        const errorMsg = extraerMensajeError(errorData, "Error al crear paciente")
        throw new Error(errorMsg)
      }

      const pacienteData = await pacienteResponse.json()
      const id_paciente = pacienteData.data.id_paciente

      // Redirigir al historial clínico para la siguiente etapa
      router.push(`/pacientes/${id_paciente}/historial`)
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      setError(message)
      console.error("Error:", err)
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
    ]
    return requiredFields.every(
      (field) => {
        const value = patientData[field]
        return value !== undefined && String(value).trim() !== ""
      }
    )
  }

  return (
    <DashboardLayout>

      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Nuevo Paciente</h1>
          <p className="mt-2 text-muted-foreground">Registre los datos básicos del paciente para iniciar su expediente clínico</p>
        </div>

        {/* Stepper Visual */}
        <FlowStepper currentStep={1} />

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/50">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-300">{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información Personal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Información Personal</span>
              </CardTitle>
              <CardDescription>Datos de identificación del paciente</CardDescription>
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
                <Select
                  value={patientData.genero}
                  onValueChange={(value) => handleInputChange("genero", value)}
                >
                  <SelectTrigger id="genero">
                    <SelectValue placeholder="Seleccione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Femenino</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento *</Label>
                <Input
                  id="fecha_nacimiento"
                  type="date"
                  value={patientData.fecha_nacimiento}
                  onChange={(e) => handleInputChange("fecha_nacimiento", e.target.value)}
                  min="1900-01-01"
                  max={new Date().toISOString().split('T')[0]}
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
                  placeholder="Ej: +52 33 1234 5678"
                />
              </div>
            </CardContent>
          </Card>

          {/* Información Médica Básica */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ClipboardList className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span>Información Médica Básica</span>
              </CardTitle>
              <CardDescription>Datos administrativos de salud</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tipo_sangre">Tipo de Sangre</Label>
                <Select
                  value={patientData.tipo_sangre}
                  onValueChange={(value) => handleInputChange("tipo_sangre", value)}
                >
                  <SelectTrigger id="tipo_sangre">
                    <SelectValue placeholder="Seleccione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="seguro_medico">Seguro Médico</Label>
                <Input
                  id="seguro_medico"
                  value={patientData.seguro_medico}
                  onChange={(e) => handleInputChange("seguro_medico", e.target.value)}
                  placeholder="Ej: IMSS, AXA, GNP..."
                />
              </div>
              <div>
                <Label htmlFor="poliza_seguro">Póliza de Seguro</Label>
                <Input
                  id="poliza_seguro"
                  value={patientData.poliza_seguro}
                  onChange={(e) => handleInputChange("poliza_seguro", e.target.value)}
                  placeholder="Número de póliza"
                />
              </div>
            </CardContent>
          </Card>

          {/* Contacto de Emergencia */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span>Contacto de Emergencia</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contacto_emergencia_nombre">Nombre del Contacto</Label>
                <Input
                  id="contacto_emergencia_nombre"
                  value={patientData.contacto_emergencia_nombre}
                  onChange={(e) => handleInputChange("contacto_emergencia_nombre", e.target.value)}
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <Label htmlFor="contacto_emergencia_telefono">Teléfono del Contacto</Label>
                <Input
                  id="contacto_emergencia_telefono"
                  value={patientData.contacto_emergencia_telefono}
                  onChange={(e) => handleInputChange("contacto_emergencia_telefono", e.target.value)}
                  placeholder="Teléfono de emergencia"
                />
              </div>
            </CardContent>
          </Card>

          {/* Banner informativo del flujo */}
          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/50">
            <ClipboardList className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-300">
              <strong>Siguiente paso:</strong> Tras registrar al paciente, podrá completar su historial clínico
              (antecedentes, alergias, vacunas, patologías) y acceder a herramientas de análisis con IA.
            </AlertDescription>
          </Alert>

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={() => router.push("/dashboard")} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!isFormValid() || loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  Registrar Paciente
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </DashboardLayout>
  )
}
