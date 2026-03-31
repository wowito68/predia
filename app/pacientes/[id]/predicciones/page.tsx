"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Loader2, AlertCircle, ArrowLeft, Activity, TrendingUp, AlertTriangle,
  FileSpreadsheet, Brain, Plus, ChevronDown, ChevronUp, FlaskConical, Ruler
} from "lucide-react"

interface Prediccion {
  id_prediccion: number
  resultado: "Diabetes" | "No Diabetes"
  probabilidad_diabetes: number
  probabilidad_no_diabetes: number
  nivel_riesgo: "Bajo" | "Moderado" | "Alto" | "Muy Alto"
  factores_riesgo: string[]
  recomendaciones: string
  datos_entrada: Record<string, number>
  fecha_prediccion: string
  usuario_nombre?: string
}

interface Paciente {
  id_paciente: number
  nombre: string
  apellido_paterno: string
  apellido_materno?: string
  genero: string
  fecha_nacimiento: string
}

interface LabData {
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

// Mapeo de género para el modelo
const GENDER_MAP: Record<string, number> = {
  M: 1,
  F: 0,
  Otro: 0,
}

// Rangos basados en el dataset de entrenamiento
const DATASET_RANGES = {
  AGE: { min: 20, max: 100 },
  Urea: { min: 0.5, max: 38.9, unit: "mg/dL" },
  Cr: { min: 6, max: 800, unit: "mg/dL" },
  HbA1c: { min: 0.9, max: 16, unit: "%" },
  Chol: { min: 0, max: 10.3, unit: "mmol/L" },
  TG: { min: 0.3, max: 13.8, unit: "mmol/L" },
  HDL: { min: 0.2, max: 9.9, unit: "mmol/L" },
  LDL: { min: 0.3, max: 9.9, unit: "mmol/L" },
  VLDL: { min: 0.1, max: 35, unit: "mg/dL" },
  BMI: { min: 19, max: 47.75, unit: "kg/m²" },
}

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

const extraerMensajeError = (errorData: any, defaultMsg: string = "Error desconocido"): string => {
  if (!errorData) return defaultMsg
  if (Array.isArray(errorData.details)) {
    const firstError = errorData.details[0]
    if (typeof firstError === 'object' && firstError?.message) return firstError.message
    return String(firstError)
  }
  if (typeof errorData.details === 'string') return errorData.details
  if (typeof errorData.error === 'string') return errorData.error
  if (typeof errorData.message === 'string') return errorData.message
  return defaultMsg
}

export default function PrediccionesPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [predicciones, setPredicciones] = useState<Prediccion[]>([])
  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [token, setToken] = useState<string | null>(null)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitStep, setSubmitStep] = useState<'idle' | 'study' | 'measurement' | 'prediction' | 'complete'>('idle')
  const [labData, setLabData] = useState<LabData>({
    urea: "", cr: "", hba1c: "", chol: "", tg: "", hdl: "", ldl: "", vldl: "", bmi: "",
  })

  useEffect(() => {
    const storedToken = localStorage.getItem("token")
    if (!storedToken) {
      router.push("/login")
    } else {
      setToken(storedToken)
      cargarDatos(storedToken, id)
    }
  }, [id, router])

  const cargarDatos = async (token: string, pacienteId: string) => {
    setLoading(true)
    setError("")

    try {
      // Cargar paciente y predicciones en paralelo
      const [pacienteRes, predRes] = await Promise.all([
        fetch(`/api/pacientes/${pacienteId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/predicciones?id_paciente=${pacienteId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (pacienteRes.ok) {
        const pacData = await pacienteRes.json()
        setPaciente(pacData.data || pacData)
      }

      if (predRes.ok) {
        const data = await predRes.json()
        const parsedPredicciones = (data.data || []).map((pred: any) => ({
          ...pred,
          factores_riesgo: typeof pred.factores_riesgo === 'string'
            ? JSON.parse(pred.factores_riesgo)
            : pred.factores_riesgo || [],
          datos_entrada: typeof pred.datos_entrada === 'string'
            ? JSON.parse(pred.datos_entrada)
            : pred.datos_entrada || {}
        }))
        setPredicciones(parsedPredicciones)

        // Pre-fill form with last prediction data if available
        if (parsedPredicciones.length > 0) {
          const lastData = parsedPredicciones[0].datos_entrada
          if (lastData) {
            setLabData({
              urea: lastData.Urea?.toString() || "",
              cr: lastData.Cr?.toString() || "",
              hba1c: lastData.HbA1c?.toString() || "",
              chol: lastData.Chol?.toString() || "",
              tg: lastData.TG?.toString() || "",
              hdl: lastData.HDL?.toString() || "",
              ldl: lastData.LDL?.toString() || "",
              vldl: lastData.VLDL?.toString() || "",
              bmi: lastData.BMI?.toString() || "",
            })
          }
        }
      } else {
        throw new Error("Error al cargar predicciones")
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleLabChange = (field: keyof LabData, value: string) => {
    setLabData(prev => ({ ...prev, [field]: value }))
  }

  const isLabFormValid = (): boolean => {
    return Object.values(labData).every(v => v.trim() !== "")
  }

  const getStepMessage = (step: typeof submitStep): string => {
    const msgs: Record<typeof submitStep, string> = {
      idle: "Preparando...",
      study: "Registrando estudios de laboratorio...",
      measurement: "Registrando mediciones antropométricas...",
      prediction: "Generando predicción con IA...",
      complete: "¡Análisis completado!",
    }
    return msgs[step]
  }

  const handleNewPrediction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !paciente) return

    setSubmitting(true)
    setError("")
    setSubmitStep('idle')

    try {
      const age = calcularEdad(paciente.fecha_nacimiento)

      // 1. Crear estudio de laboratorio
      setSubmitStep('study')
      const estudioRes = await fetch("/api/estudios", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id_paciente: parseInt(id),
          urea: parseFloat(labData.urea),
          creatinina: parseFloat(labData.cr),
          hba1c: parseFloat(labData.hba1c),
          glucosa: 0,
          colesterol: parseFloat(labData.chol),
          trigliceridos: parseFloat(labData.tg),
          hdl: parseFloat(labData.hdl),
          ldl: parseFloat(labData.ldl),
          vldl: parseFloat(labData.vldl),
          observaciones: "Estudio para análisis predictivo de diabetes",
        }),
      })

      if (!estudioRes.ok) {
        const errData = await estudioRes.json()
        throw new Error(`Estudio: ${extraerMensajeError(errData)}`)
      }
      const estudioData = await estudioRes.json()
      const id_estudio = estudioData.data.id_estudio

      // 2. Crear medición antropométrica
      setSubmitStep('measurement')
      const medicionRes = await fetch("/api/mediciones", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id_paciente: parseInt(id),
          ...(parseFloat(labData.bmi) > 0 && { imc: parseFloat(labData.bmi) }),
          observaciones: "Medición para análisis predictivo",
        }),
      })

      if (!medicionRes.ok) {
        const errData = await medicionRes.json()
        throw new Error(`Medición: ${extraerMensajeError(errData)}`)
      }
      const medicionData = await medicionRes.json()
      const id_medicion = medicionData.data.id_medicion

      // 3. Realizar predicción con IA
      setSubmitStep('prediction')
      const predRes = await fetch("/api/predicciones/nueva", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id_paciente: parseInt(id),
          id_estudio,
          id_medicion,
          datos_entrada: {
            Gender: GENDER_MAP[paciente.genero] ?? 0,
            AGE: age,
            Urea: parseFloat(labData.urea),
            Cr: parseFloat(labData.cr),
            HbA1c: parseFloat(labData.hba1c),
            Chol: parseFloat(labData.chol),
            TG: parseFloat(labData.tg),
            HDL: parseFloat(labData.hdl),
            LDL: parseFloat(labData.ldl),
            VLDL: parseFloat(labData.vldl),
            BMI: parseFloat(labData.bmi),
          },
        }),
      })

      if (!predRes.ok) {
        const errData = await predRes.json()
        throw new Error(`Predicción: ${extraerMensajeError(errData)}`)
      }

      setSubmitStep('complete')
      setShowForm(false)

      // Reload predictions
      await cargarDatos(token, id)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      setError(message)
      setSubmitStep('idle')
    } finally {
      setSubmitting(false)
    }
  }

  const getRiesgoColor = (nivel: string) => {
    switch (nivel) {
      case "Muy Alto": return "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"
      case "Alto": return "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800"
      case "Moderado": return "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800"
      case "Bajo": return "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800"
      default: return "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
    }
  }

  const getRiesgoIcon = (nivel: string) => {
    switch (nivel) {
      case "Muy Alto":
      case "Alto": return <AlertTriangle className="w-5 h-5" />
      case "Moderado": return <Activity className="w-5 h-5" />
      case "Bajo": return <TrendingUp className="w-5 h-5" />
      default: return <Activity className="w-5 h-5" />
    }
  }

  const exportarCSV = () => {
    if (predicciones.length === 0) return
    const headers = ["Fecha", "Resultado", "Probabilidad", "Nivel Riesgo", "Factores de Riesgo"]
    const rows = predicciones.map(p => [
      new Date(p.fecha_prediccion).toLocaleString(),
      p.resultado,
      `${(p.probabilidad_diabetes * 100).toFixed(1)}%`,
      p.nivel_riesgo,
      p.factores_riesgo.join("; ")
    ])
    const csvContent = [
      `Paciente ID: ${id}`,
      `Total Predicciones: ${predicciones.length}`,
      "",
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `paciente_${id}_predicciones_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
  }

  return (
    <DashboardLayout>

      <main className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/pacientes">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Predicciones de Diabetes</h1>
              <p className="mt-1 text-muted-foreground">
                {paciente
                  ? `${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno || ""}`.trim()
                  : "Historial de análisis con IA del paciente"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowForm(!showForm)}
              className={showForm ? "bg-gray-600 hover:bg-gray-700" : "bg-violet-600 hover:bg-violet-700"}
            >
              {showForm ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-2" />
                  Cerrar
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Evaluación
                </>
              )}
            </Button>
            <Button
              onClick={exportarCSV}
              variant="outline"
              disabled={predicciones.length === 0}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              CSV
            </Button>
          </div>
        </div>

        {/* Banner informativo */}
        <Alert className="mb-6 border-violet-200 bg-violet-50/50 dark:border-violet-900 dark:bg-violet-950/30">
          <Brain className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          <AlertDescription className="text-violet-800 dark:text-violet-300 text-sm">
            Este módulo utiliza un modelo de IA entrenado (Precisión: 97.89%) para evaluar el riesgo de diabetes.
            Requiere datos clínicos de laboratorio del paciente y actúa como <strong>apoyo a la decisión médica</strong>.
          </AlertDescription>
        </Alert>

        {error && (
          <Alert className="mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 dark:text-red-300">{error}</AlertDescription>
          </Alert>
        )}

        {/* Formulario de Nueva Predicción */}
        {showForm && (
          <Card className="mb-6 border-violet-200 dark:border-violet-800">
            <CardHeader className="bg-violet-50/50 dark:bg-violet-950/20">
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                Nueva Evaluación Predictiva
              </CardTitle>
              <CardDescription>
                Ingrese los datos clínicos de laboratorio para generar una predicción.
                {predicciones.length > 0 && " Los campos se han prellenado con los datos de la última evaluación."}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleNewPrediction} className="space-y-6">
                {/* Función Renal */}
                <div>
                  <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    Función Renal
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="urea">Urea (mg/dL) * <span className="text-xs text-muted-foreground">({DATASET_RANGES.Urea.min}-{DATASET_RANGES.Urea.max})</span></Label>
                      <Input id="urea" type="number" step="0.1" min={DATASET_RANGES.Urea.min} max={DATASET_RANGES.Urea.max}
                        value={labData.urea} onChange={(e) => handleLabChange("urea", e.target.value)} placeholder="Ej: 4.7" required />
                    </div>
                    <div>
                      <Label htmlFor="cr">Creatinina (mg/dL) * <span className="text-xs text-muted-foreground">({DATASET_RANGES.Cr.min}-{DATASET_RANGES.Cr.max})</span></Label>
                      <Input id="cr" type="number" step="1" min={DATASET_RANGES.Cr.min} max={DATASET_RANGES.Cr.max}
                        value={labData.cr} onChange={(e) => handleLabChange("cr", e.target.value)} placeholder="Ej: 46" required />
                    </div>
                  </div>
                </div>

                {/* Glucosa y Perfil Lipídico */}
                <div>
                  <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-green-600 dark:text-green-400" />
                    Glucosa y Perfil Lipídico
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="hba1c">HbA1c (%) * <span className="text-xs text-muted-foreground">({DATASET_RANGES.HbA1c.min}-{DATASET_RANGES.HbA1c.max})</span></Label>
                      <Input id="hba1c" type="number" step="0.1" min={DATASET_RANGES.HbA1c.min} max={DATASET_RANGES.HbA1c.max}
                        value={labData.hba1c} onChange={(e) => handleLabChange("hba1c", e.target.value)} placeholder="Ej: 4.9" required />
                    </div>
                    <div>
                      <Label htmlFor="chol">Colesterol Total (mmol/L) * <span className="text-xs text-muted-foreground">({DATASET_RANGES.Chol.min}-{DATASET_RANGES.Chol.max})</span></Label>
                      <Input id="chol" type="number" step="0.1" min={DATASET_RANGES.Chol.min} max={DATASET_RANGES.Chol.max}
                        value={labData.chol} onChange={(e) => handleLabChange("chol", e.target.value)} placeholder="Ej: 4.2" required />
                    </div>
                    <div>
                      <Label htmlFor="tg">Triglicéridos (mmol/L) * <span className="text-xs text-muted-foreground">({DATASET_RANGES.TG.min}-{DATASET_RANGES.TG.max})</span></Label>
                      <Input id="tg" type="number" step="0.1" min={DATASET_RANGES.TG.min} max={DATASET_RANGES.TG.max}
                        value={labData.tg} onChange={(e) => handleLabChange("tg", e.target.value)} placeholder="Ej: 0.9" required />
                    </div>
                    <div>
                      <Label htmlFor="hdl">HDL Colesterol (mmol/L) * <span className="text-xs text-muted-foreground">({DATASET_RANGES.HDL.min}-{DATASET_RANGES.HDL.max})</span></Label>
                      <Input id="hdl" type="number" step="0.1" min={DATASET_RANGES.HDL.min} max={DATASET_RANGES.HDL.max}
                        value={labData.hdl} onChange={(e) => handleLabChange("hdl", e.target.value)} placeholder="Ej: 2.4" required />
                    </div>
                    <div>
                      <Label htmlFor="ldl">LDL Colesterol (mmol/L) * <span className="text-xs text-muted-foreground">({DATASET_RANGES.LDL.min}-{DATASET_RANGES.LDL.max})</span></Label>
                      <Input id="ldl" type="number" step="0.1" min={DATASET_RANGES.LDL.min} max={DATASET_RANGES.LDL.max}
                        value={labData.ldl} onChange={(e) => handleLabChange("ldl", e.target.value)} placeholder="Ej: 1.4" required />
                    </div>
                    <div>
                      <Label htmlFor="vldl">VLDL Colesterol (mg/dL) * <span className="text-xs text-muted-foreground">({DATASET_RANGES.VLDL.min}-{DATASET_RANGES.VLDL.max})</span></Label>
                      <Input id="vldl" type="number" step="0.1" min={DATASET_RANGES.VLDL.min} max={DATASET_RANGES.VLDL.max}
                        value={labData.vldl} onChange={(e) => handleLabChange("vldl", e.target.value)} placeholder="Ej: 0.5" required />
                    </div>
                  </div>
                </div>

                {/* Datos Antropométricos */}
                <div>
                  <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    Datos Antropométricos
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bmi">IMC (kg/m²) * <span className="text-xs text-muted-foreground">({DATASET_RANGES.BMI.min}-{DATASET_RANGES.BMI.max})</span></Label>
                      <Input id="bmi" type="number" step="0.1" min={DATASET_RANGES.BMI.min} max={DATASET_RANGES.BMI.max}
                        value={labData.bmi} onChange={(e) => handleLabChange("bmi", e.target.value)} placeholder="Ej: 24" required />
                    </div>
                  </div>
                </div>

                {/* Progreso */}
                {submitting && (
                  <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/50">
                    <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                    <AlertDescription className="text-blue-800 dark:text-blue-300">{getStepMessage(submitStep)}</AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={submitting}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={!isLabFormValid() || submitting} className="bg-violet-600 hover:bg-violet-700">
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {getStepMessage(submitStep)}
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        Ejecutar Análisis Predictivo
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              <p className="mt-4 text-muted-foreground">Cargando predicciones...</p>
            </CardContent>
          </Card>
        ) : predicciones.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <Activity className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
              <p className="mt-4 text-muted-foreground">No hay predicciones registradas para este paciente</p>
              <p className="text-sm text-muted-foreground mt-1">
                Haga clic en "Nueva Evaluación" para iniciar un análisis predictivo
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {predicciones.map((pred, idx) => (
              <Card key={pred.id_prediccion} className="overflow-hidden">
                <CardHeader className={`${getRiesgoColor(pred.nivel_riesgo)} border-l-4`}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-4">
                      {getRiesgoIcon(pred.nivel_riesgo)}
                      <div>
                        <CardTitle className="text-xl">Análisis #{predicciones.length - idx}</CardTitle>
                        <p className="text-sm mt-1">{new Date(pred.fecha_prediccion).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold">
                        {(pred.probabilidad_diabetes * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs mt-1">Riesgo de Diabetes</p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-6 space-y-6">
                  {/* Resultado */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">RESULTADO</p>
                      <p className="text-lg font-bold text-blue-900 dark:text-blue-200">{pred.resultado}</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                      <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold mb-1">NIVEL DE RIESGO</p>
                      <p className="text-lg font-bold text-purple-900 dark:text-purple-200">{pred.nivel_riesgo}</p>
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mb-1">CONFIANZA</p>
                      <p className="text-lg font-bold text-indigo-900 dark:text-indigo-200">
                        {(Math.max(pred.probabilidad_diabetes, pred.probabilidad_no_diabetes) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Factores de Riesgo */}
                  {pred.factores_riesgo && pred.factores_riesgo.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-foreground mb-3">Factores de Riesgo Identificados:</h4>
                      <ul className="space-y-2">
                        {pred.factores_riesgo.map((factor, i) => (
                          <li key={i} className="flex gap-3">
                            <span className="text-red-500 font-bold">•</span>
                            <span className="text-foreground">{factor}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recomendaciones */}
                  {pred.recomendaciones && (
                    <div>
                      <h4 className="font-semibold text-foreground mb-3">Recomendaciones Médicas:</h4>
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-2">
                        {pred.recomendaciones.split("\n").map((rec, i) => (
                          <p key={i} className="text-foreground text-sm">{rec}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Datos Clínicos */}
                  <div>
                    <h4 className="font-semibold text-foreground mb-3">Datos Clínicos Utilizados:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {pred.datos_entrada &&
                        Object.entries(pred.datos_entrada).map(([key, value]) => (
                          <div key={key} className="bg-background p-3 rounded border">
                            <p className="text-xs text-muted-foreground font-semibold">{key}</p>
                            <p className="text-lg font-bold text-foreground">{value}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </DashboardLayout>
  )
}
