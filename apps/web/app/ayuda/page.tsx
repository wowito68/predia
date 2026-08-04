"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Brain, Shield, TrendingUp, FileText, HelpCircle, AlertTriangle,
  Loader2, Users, ClipboardList, CalendarDays, Pill, FolderOpen,
  UserPlus, Stethoscope, CheckCircle
} from "lucide-react"

interface ModelMetrics {
  accuracy: number
  n_samples_train: number
  n_samples_test: number
  version: string
}

export default function AyudaPage() {
  const router = useRouter()
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("token")
    const isAuthenticated = token || localStorage.getItem("authenticated")

    if (!isAuthenticated) {
      router.push("/login")
      return
    }

    fetchModelMetrics(token)
  }, [router])

  const fetchModelMetrics = async (token: string | null) => {
    try {
      const response = await fetch("/api/modelo-ia/metrics", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setMetrics(data.data)
        }
      }
    } catch (error) {
      console.error("Error al cargar métricas del modelo:", error)
    } finally {
      setLoading(false)
    }
  }

  const accuracy = metrics?.accuracy ? metrics.accuracy.toFixed(2) : "98.42"
  const totalSamples = (metrics?.n_samples_train || 0) + (metrics?.n_samples_test || 0)

  return (
    <DashboardLayout>

      <main className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Centro de Ayuda</h1>
          <p className="mt-2 text-muted-foreground">Guía completa para el uso de PREDIA — Plataforma Clínica Integral</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Qué es PREDIA */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Stethoscope className="w-6 h-6 text-blue-600" />
                  <span>¿Qué es PREDIA?</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-foreground">
                  PREDIA es una <strong>Plataforma Clínica Integral</strong> diseñada para la gestión de historiales médicos,
                  consultas, recetas, documentos y agenda. Además, incorpora módulos de inteligencia artificial como
                  herramientas de apoyo a la decisión médica.
                </p>
                <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
                  <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <AlertDescription className="text-blue-800 dark:text-blue-300">
                    <strong>Importante:</strong> Los módulos de IA son herramientas de apoyo. Siempre deben
                    confirmarse con exámenes clínicos adicionales y criterio médico profesional.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Guía de uso — Flujo Clínico */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  <span>Flujo de Trabajo Clínico</span>
                </CardTitle>
                <CardDescription>Orden recomendado para el uso del sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs font-bold">1</div>
                    <div>
                      <p className="font-medium text-foreground flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-blue-600" />
                        Registrar Paciente
                      </p>
                      <p className="text-sm text-muted-foreground">Datos básicos, contacto y seguro médico</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs font-bold">2</div>
                    <div>
                      <p className="font-medium text-foreground flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-green-600" />
                        Historial Clínico
                      </p>
                      <p className="text-sm text-muted-foreground">Vacunas, alergias, patologías, antecedentes familiares</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs font-bold">3</div>
                    <div>
                      <p className="font-medium text-foreground flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-purple-600" />
                        Atención Médica
                      </p>
                      <p className="text-sm text-muted-foreground">Consultas, diagnósticos, recetas y documentos</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300 text-xs font-bold">4</div>
                    <div>
                      <p className="font-medium text-foreground flex items-center gap-2">
                        <Brain className="w-4 h-4 text-violet-600" />
                        Herramientas de IA
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300">Opcional</span>
                      </p>
                      <p className="text-sm text-muted-foreground">Evaluaciones predictivas y análisis cuando los datos clínicos lo permiten</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Secciones del sistema */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <HelpCircle className="w-5 h-5 text-blue-600" />
                  <span>Secciones del Sistema</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-foreground text-sm">Pacientes</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Lista, búsqueda y gestión de pacientes registrados</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-1">
                      <ClipboardList className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-foreground text-sm">Historial</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Historial clínico completo, consultas, vacunas, alergias</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-1">
                      <Pill className="w-4 h-4 text-purple-600" />
                      <span className="font-medium text-foreground text-sm">Recetas</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Generación y consulta de recetas médicas</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-1">
                      <CalendarDays className="w-4 h-4 text-amber-600" />
                      <span className="font-medium text-foreground text-sm">Agenda</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Próximas citas y recordatorios por WhatsApp</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Módulo IA */}
            <Card className="border-violet-200 dark:border-violet-800/50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="w-5 h-5 text-violet-600" />
                  <span>Módulo de IA: Predicción de Diabetes</span>
                  <span className="ml-auto inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300">
                    Valor Añadido
                  </span>
                </CardTitle>
                <CardDescription>
                  {metrics?.version || "Modelo de regresión logística entrenado"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{accuracy}%</div>
                        <div className="text-sm text-muted-foreground">Precisión (Accuracy)</div>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{totalSamples}</div>
                        <div className="text-sm text-muted-foreground">Muestras Totales</div>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{metrics?.n_samples_train || 757}</div>
                        <div className="text-sm text-muted-foreground">Entrenamiento</div>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">{metrics?.n_samples_test || 190}</div>
                        <div className="text-sm text-muted-foreground">Validación</div>
                      </div>
                    </div>

                    <Alert className="border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-900/20">
                      <AlertTriangle className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                      <AlertDescription className="text-violet-800 dark:text-violet-300 text-sm">
                        Esta herramienta evalúa factores de riesgo a partir de datos de laboratorio. <strong>No constituye un diagnóstico médico.</strong> Requiere historial clínico previo para generar resultados.
                      </AlertDescription>
                    </Alert>

                    <p className="text-sm text-muted-foreground mt-4">
                      Modelo entrenado con dataset "Predict Diabetes From Medical Records" de Kaggle.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Requisitos para IA */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-base">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Requisitos para IA</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">Para usar las herramientas de IA, el paciente debe tener:</p>
                <ul className="space-y-1">
                  <li className="flex items-start gap-2 text-foreground">
                    <CheckCircle className="w-3 h-3 mt-1 text-green-600 shrink-0" />
                    Datos básicos registrados
                  </li>
                  <li className="flex items-start gap-2 text-foreground">
                    <CheckCircle className="w-3 h-3 mt-1 text-green-600 shrink-0" />
                    Estudios de laboratorio completos
                  </li>
                  <li className="flex items-start gap-2 text-foreground">
                    <CheckCircle className="w-3 h-3 mt-1 text-green-600 shrink-0" />
                    Mediciones antropométricas (IMC)
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Soporte */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-base">
                  <HelpCircle className="w-5 h-5 text-blue-600" />
                  <span>Soporte Técnico</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-sm text-muted-foreground">Email:</span>
                  <p className="font-medium text-foreground">soporte@predia.com</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </DashboardLayout>
  )
}
