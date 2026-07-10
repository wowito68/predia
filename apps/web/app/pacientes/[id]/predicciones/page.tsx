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
  Loader2, AlertCircle, ArrowLeft, Activity,
  FileSpreadsheet, Brain, Plus, ChevronUp, Users, HeartPulse, Ruler
} from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardiovascularTab } from "@/components/predictions/CardiovascularTab";
import { MetabolicTab } from "@/components/predictions/MetabolicTab";
import dynamic from "next/dynamic"
import { RiskCard } from "@/components/risk/RiskCard"
import type { RiskLevel } from "@/lib/risk"

// Carga diferida: recharts (RiskTimeline) y @react-pdf/renderer (PDF) fuera del bundle inicial.
const RiskTimeline = dynamic(() => import("@/components/risk/RiskTimeline").then((m) => m.RiskTimeline), {
  ssr: false,
  loading: () => <div className="flex items-center gap-2 p-4 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Cargando línea de tiempo…</div>,
})
const RiskPDFButton = dynamic(() => import("@/components/pdf/RiskPDFButton"), {
  ssr: false,
  loading: () => <Button variant="outline" size="sm" disabled><Loader2 className="w-4 h-4 mr-2 animate-spin" />PDF…</Button>,
})
import modelParams from "@/lib/ml-model-params.json"

interface Prediccion {
  id_prediccion: number
  resultado: string
  probabilidad_diabetes: number
  probabilidad_no_diabetes: number
  nivel_riesgo: RiskLevel
  factores_riesgo: string[]
  recomendaciones: string
  score_riesgo?: number
  recomendaciones_generadas?: string
  datos_entrada: Record<string, number | string>
  fecha_prediccion: string
  usuario_nombre?: string
}

const parseRG = (v?: string) => {
  if (!v) return null
  try {
    return typeof v === "string" ? JSON.parse(v) : v
  } catch {
    return null
  }
}

interface Paciente {
  id_paciente: number
  nombre: string
  apellido_paterno: string
  apellido_materno?: string
  genero: string
  fecha_nacimiento: string
}

// ---- Definición de campos del modelo de CRIBADO (migrado) ----
const CATS: Record<string, string[]> = (modelParams as any).categories || {}
const NUMERIC_COLS: string[] = (modelParams as any).numeric_cols || []
const BINARY_COLS: string[] = (modelParams as any).binary_cols || []
const CATEGORICAL_COLS: string[] = (modelParams as any).categorical_cols || []

const FIELD_LABEL: Record<string, string> = {
  gender: "Género", ethnicity: "Etnia", education_level: "Nivel educativo",
  income_level: "Nivel de ingreso", employment_status: "Situación laboral",
  smoking_status: "Tabaquismo", family_history_diabetes: "Antecedente familiar de diabetes",
  hypertension_history: "Antecedente de hipertensión", cardiovascular_history: "Antecedente cardiovascular",
  age: "Edad (años)", alcohol_consumption_per_week: "Alcohol (unidades/sem)",
  physical_activity_minutes_per_week: "Actividad física (min/sem)", diet_score: "Índice de dieta (0-10)",
  sleep_hours_per_day: "Sueño (horas/día)", screen_time_hours_per_day: "Pantallas (horas/día)",
  bmi: "IMC (kg/m²)", waist_to_hip_ratio: "Relación cintura-cadera",
  systolic_bp: "Presión sistólica (mmHg)", diastolic_bp: "Presión diastólica (mmHg)",
  heart_rate: "Frecuencia cardíaca (lpm)", cholesterol_total: "Colesterol total (mg/dL)",
  hdl_cholesterol: "HDL (mg/dL)", ldl_cholesterol: "LDL (mg/dL)", triglycerides: "Triglicéridos (mg/dL)",
}

const SECTIONS: { title: string; icon: React.ReactNode; fields: string[] }[] = [
  { title: "Demografía y socioeconómico", icon: <Users className="w-4 h-4 text-primary" />,
    fields: ["gender", "ethnicity", "education_level", "income_level", "employment_status"] },
  { title: "Estilo de vida", icon: <Activity className="w-4 h-4 text-green-600" />,
    fields: ["smoking_status", "alcohol_consumption_per_week", "physical_activity_minutes_per_week",
             "diet_score", "sleep_hours_per_day", "screen_time_hours_per_day"] },
  { title: "Antecedentes", icon: <HeartPulse className="w-4 h-4 text-red-600" />,
    fields: ["family_history_diabetes", "hypertension_history", "cardiovascular_history"] },
  { title: "Antropometría y signos vitales", icon: <Ruler className="w-4 h-4 text-orange-600" />,
    fields: ["age", "bmi", "waist_to_hip_ratio", "systolic_bp", "diastolic_bp", "heart_rate"] },
  { title: "Perfil lipídico (no diagnóstico)", icon: <Activity className="w-4 h-4 text-indigo-600" />,
    fields: ["cholesterol_total", "hdl_cholesterol", "ldl_cholesterol", "triglycerides"] },
]

const ALL_FIELDS = SECTIONS.flatMap((s) => s.fields)

const extraerMensajeError = (errorData: any, defaultMsg = "Error desconocido"): string => {
  if (!errorData) return defaultMsg
  if (Array.isArray(errorData.details)) {
    const f = errorData.details[0]
    return typeof f === "object" && f?.message ? f.message : String(f)
  }
  if (typeof errorData.details === "string") return errorData.details
  if (typeof errorData.error === "string") return errorData.error
  if (typeof errorData.message === "string") return errorData.message
  return defaultMsg
}

const calcularEdad = (fechaNacimiento: string): number => {
  const hoy = new Date(); const n = new Date(fechaNacimiento)
  let e = hoy.getFullYear() - n.getFullYear()
  const m = hoy.getMonth() - n.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < n.getDate())) e--
  return e
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

  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})

  useEffect(() => {
    const storedToken = localStorage.getItem("token")
    if (!storedToken) router.push("/login")
    else { setToken(storedToken); cargarDatos(storedToken, id) }
  }, [id, router])

  const cargarDatos = async (token: string, pacienteId: string) => {
    setLoading(true); setError("")
    try {
      const [pacienteRes, predRes] = await Promise.all([
        fetch(`/api/pacientes/${pacienteId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/predicciones?id_paciente=${pacienteId}`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (pacienteRes.ok) {
        const pacData = await pacienteRes.json()
        const pac: Paciente = pacData.data || pacData
        setPaciente(pac)
        // Prefill edad y género del paciente
        setForm((prev) => ({
          ...prev,
          age: prev.age || (pac.fecha_nacimiento ? String(calcularEdad(pac.fecha_nacimiento)) : ""),
          gender: prev.gender || (pac.genero === "M" ? "Male" : pac.genero === "F" ? "Female" : ""),
        }))
      }
      if (predRes.ok) {
        const data = await predRes.json()
        const parsed = (data.data || []).map((pred: any) => ({
          ...pred,
          factores_riesgo: typeof pred.factores_riesgo === "string" ? JSON.parse(pred.factores_riesgo) : pred.factores_riesgo || [],
          datos_entrada: typeof pred.datos_entrada === "string" ? JSON.parse(pred.datos_entrada) : pred.datos_entrada || {},
        }))
        setPredicciones(parsed)
      } else {
        throw new Error("Error al cargar predicciones")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const setField = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))
  const isFormValid = (): boolean => ALL_FIELDS.every((f) => (form[f] ?? "").toString().trim() !== "")

  const handleNewPrediction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !paciente) return
    setSubmitting(true); setError("")
    try {
      const datos_entrada: Record<string, number | string> = {}
      for (const f of CATEGORICAL_COLS) datos_entrada[f] = form[f]
      for (const f of [...NUMERIC_COLS, ...BINARY_COLS]) datos_entrada[f] = parseFloat(form[f])

      const predRes = await fetch("/api/predicciones/nueva", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id_paciente: parseInt(id), datos_entrada }),
      })
      if (!predRes.ok) throw new Error(`Predicción: ${extraerMensajeError(await predRes.json())}`)
      setShowForm(false)
      await cargarDatos(token, id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setSubmitting(false)
    }
  }

  const exportarCSV = () => {
    if (predicciones.length === 0) return
    const headers = ["Fecha", "Resultado", "Probabilidad", "Nivel Riesgo", "Factores de Riesgo"]
    const rows = predicciones.map((p) => [
      new Date(p.fecha_prediccion).toLocaleString(), p.resultado,
      `${(p.probabilidad_diabetes * 100).toFixed(1)}%`, p.nivel_riesgo, p.factores_riesgo.join("; "),
    ])
    const csv = [`Paciente ID: ${id}`, `Total: ${predicciones.length}`, "", headers.join(","),
      ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `paciente_${id}_predicciones_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
  }

  const renderField = (f: string) => {
    if (CATEGORICAL_COLS.includes(f)) {
      return (
        <select id={f} value={form[f] ?? ""} onChange={(e) => setField(f, e.target.value)} required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="" disabled>Selecciona…</option>
          {(CATS[f] || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      )
    }
    if (BINARY_COLS.includes(f)) {
      return (
        <select id={f} value={form[f] ?? ""} onChange={(e) => setField(f, e.target.value)} required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="" disabled>Selecciona…</option>
          <option value="1">Sí</option>
          <option value="0">No</option>
        </select>
      )
    }
    return (
      <Input id={f} type="number" step="any" value={form[f] ?? ""}
        onChange={(e) => setField(f, e.target.value)} required />
    )
  }

  return (
    <DashboardLayout>
      <main className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href={`/pacientes/${id}`}><Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Volver</Button></Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Predicciones de Diabetes</h1>
              <p className="mt-1 text-muted-foreground">
                {paciente ? `${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno || ""}`.trim()
                  : "Historial de análisis con IA del paciente"}
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="diabetes" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl">
            <TabsTrigger value="diabetes">Predicción Diabetes</TabsTrigger>
            <TabsTrigger value="cardiovascular">Riesgo Cardiovascular</TabsTrigger>
            <TabsTrigger value="metabolico">Síndrome Metabólico</TabsTrigger>
          </TabsList>

          <TabsContent value="diabetes">
            <div className="flex justify-end pb-4">
              <div className="flex gap-2">
                <Button onClick={() => setShowForm(!showForm)}
                  className={showForm ? "bg-gray-600 hover:bg-gray-700 text-white" : "bg-violet-600 hover:bg-violet-700 text-white"}>
                  {showForm ? <><ChevronUp className="w-4 h-4 mr-2" />Cerrar</> : <><Plus className="w-4 h-4 mr-2" />Nueva Evaluación</>}
                </Button>
                <Button onClick={exportarCSV} variant="outline" disabled={predicciones.length === 0}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />CSV
                </Button>
                <Link href={`/pacientes/${id}/evolucion`}>
                  <Button variant="outline"><Activity className="w-4 h-4 mr-2" />Evolución Clínica</Button>
                </Link>
              </div>
            </div>

            <Alert className="mb-6 border-violet-200 bg-violet-50/50 dark:border-violet-900 dark:bg-violet-950/30">
              <Brain className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <AlertDescription className="text-violet-800 dark:text-violet-300 text-sm">
                Modelo de <strong>cribado</strong> entrenado sin laboratorios diagnósticos (evita fuga de
                información). Estima riesgo a partir de datos demográficos, estilo de vida y antropometría;
                es <strong>apoyo a la decisión médica</strong>, no un diagnóstico.
              </AlertDescription>
            </Alert>

            {error && (
              <Alert className="mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 dark:text-red-300">{error}</AlertDescription>
              </Alert>
            )}

            {showForm && (
              <Card className="mb-6 border-violet-200 dark:border-violet-800">
                <CardHeader className="bg-violet-50/50 dark:bg-violet-950/20">
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-violet-600 dark:text-violet-400" />Nueva Evaluación de Cribado
                  </CardTitle>
                  <CardDescription>Ingrese los datos de cribado del paciente para estimar el riesgo de diabetes.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleNewPrediction} className="space-y-6">
                    {SECTIONS.map((sec) => (
                      <div key={sec.title}>
                        <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">{sec.icon}{sec.title}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {sec.fields.map((f) => (
                            <div key={f}>
                              <Label htmlFor={f}>{FIELD_LABEL[f] ?? f} *</Label>
                              {renderField(f)}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {submitting && (
                      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/50">
                        <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                        <AlertDescription className="text-blue-800 dark:text-blue-300">Generando predicción con IA…</AlertDescription>
                      </Alert>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                      <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={submitting}>Cancelar</Button>
                      <Button type="submit" disabled={!isFormValid() || submitting} className="bg-violet-600 hover:bg-violet-700">
                        {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Procesando…</> : <><Brain className="w-4 h-4 mr-2" />Ejecutar Análisis</>}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {loading ? (
              <Card><CardContent className="pt-6 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /><p className="mt-4 text-muted-foreground">Cargando…</p></CardContent></Card>
            ) : predicciones.length === 0 ? (
              <Card><CardContent className="pt-6 text-center py-12">
                <Activity className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
                <p className="mt-4 text-muted-foreground">No hay predicciones registradas para este paciente</p>
                <p className="text-sm text-muted-foreground mt-1">Haga clic en "Nueva Evaluación" para iniciar un análisis</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-6">
                <RiskTimeline
                  points={[...predicciones].reverse().map((p) => ({
                    fecha: p.fecha_prediccion,
                    score: p.score_riesgo ?? p.probabilidad_diabetes,
                    nivel: p.nivel_riesgo,
                  }))}
                />
                {predicciones.map((pred) => {
                  const rg = parseRG(pred.recomendaciones_generadas)
                  return (
                    <div key={pred.id_prediccion} className="space-y-3">
                      <RiskCard
                        score={pred.score_riesgo ?? pred.probabilidad_diabetes}
                        nivel={pred.nivel_riesgo}
                        contribuyen={rg?.contribuyen ?? []}
                        protegen={rg?.protegen ?? []}
                        recomendaciones={rg?.recomendaciones}
                        fecha={pred.fecha_prediccion}
                      />
                      <div className="flex justify-end">
                        <RiskPDFButton
                          fileName={`reporte_riesgo_${id}_${pred.id_prediccion}.pdf`}
                          paciente={{
                            nombre: paciente?.nombre,
                            apellido_paterno: paciente?.apellido_paterno,
                            genero: paciente?.genero,
                            edad: paciente?.fecha_nacimiento ? calcularEdad(paciente.fecha_nacimiento) : undefined,
                          }}
                          nivel={pred.nivel_riesgo}
                          score={pred.score_riesgo ?? pred.probabilidad_diabetes}
                          descripcion={rg?.descripcion}
                          accionClinica={rg?.accion_clinica}
                          contribuyen={rg?.contribuyen ?? []}
                          protegen={rg?.protegen ?? []}
                          recomendaciones={rg?.recomendaciones}
                          fecha={new Date(pred.fecha_prediccion).toLocaleDateString("es-MX")}
                        />
                      </div>
                      <details className="rounded-lg border border-border bg-card px-4 py-2">
                        <summary className="cursor-pointer text-sm font-medium text-muted-foreground">Datos utilizados</summary>
                        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                          {pred.datos_entrada && Object.entries(pred.datos_entrada).map(([key, value]) => (
                            <div key={key} className="bg-background p-3 rounded border">
                              <p className="text-xs text-muted-foreground font-semibold">{FIELD_LABEL[key] ?? key}</p>
                              <p className="text-base font-bold text-foreground">{String(value)}</p>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="cardiovascular"><CardiovascularTab paciente={paciente} id={id} /></TabsContent>
          <TabsContent value="metabolico"><MetabolicTab paciente={paciente} id={id} /></TabsContent>
        </Tabs>
      </main>
    </DashboardLayout>
  )
}
