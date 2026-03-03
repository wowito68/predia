"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { MedicalHeader } from "@/components/medical-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search, Download, Eye, AlertTriangle, CheckCircle, Loader2,
  Brain, ClipboardList, Activity, User
} from "lucide-react"

interface Prediccion {
  id_prediccion: number
  id_paciente: number
  paciente_nombre: string
  cedula?: string
  resultado_prediccion: boolean
  probabilidad_diabetes: number
  nivel_riesgo: string
  fecha_prediccion: string
  usuario_nombre: string
}

interface Consulta {
  id_consulta: number
  motivo_consulta: string
  diagnostico?: string
  fecha_consulta: string
  proxima_cita?: string
  paciente: {
    id_paciente: number
    nombre: string
    apellido_paterno: string
  }
  usuario: {
    nombre: string
    apellido_paterno: string
  }
}

const CONSULTAS_PER_PAGE = 10
const PREDICCIONES_PER_PAGE = 10

export default function HistorialPage() {
  const router = useRouter()
  const [predicciones, setPredicciones] = useState<Prediccion[]>([])
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingConsultas, setLoadingConsultas] = useState(true)
  const [errorPredicciones, setErrorPredicciones] = useState<string | null>(null)
  const [errorConsultas, setErrorConsultas] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterRisk, setFilterRisk] = useState<string>("todos")
  const [token, setToken] = useState<string | null>(null)

  // Paginación: predicciones
  const [pagePred, setPagePred] = useState(1)
  const [totalPred, setTotalPred] = useState(0)

  // Paginación: consultas
  const [pageConsultas, setPageConsultas] = useState(1)
  const [totalConsultas, setTotalConsultas] = useState(0)

  useEffect(() => {
    const storedToken = localStorage.getItem("token")
    if (!storedToken) {
      router.push("/login")
      return
    }
    setToken(storedToken)
  }, [router])

  const cargarConsultas = useCallback(async (tkn: string, page: number, signal: AbortSignal) => {
    setLoadingConsultas(true)
    setErrorConsultas(null)
    try {
      const offset = (page - 1) * CONSULTAS_PER_PAGE
      const response = await fetch(
        `/api/consultas?limit=${CONSULTAS_PER_PAGE}&offset=${offset}`,
        { headers: { Authorization: `Bearer ${tkn}` }, signal }
      )
      if (signal.aborted) return
      if (!response.ok) throw new Error(`Error ${response.status}`)
      const data = await response.json()
      setConsultas(data.data || [])
      // Si el API devuelve total, úsalo; si no, estimamos con el array recibido
      setTotalConsultas(data.total ?? (data.data?.length ?? 0) + offset)
    } catch (error: any) {
      if (error.name === "AbortError") return
      console.error("Error al cargar consultas:", error)
      setErrorConsultas("No se pudieron cargar las consultas. Verifica la conexión.")
    } finally {
      setLoadingConsultas(false)
    }
  }, [])

  const cargarPredicciones = useCallback(async (tkn: string, page: number, signal: AbortSignal) => {
    setLoading(true)
    setErrorPredicciones(null)
    try {
      const response = await fetch(
        `/api/predicciones?page=${page}&limit=${PREDICCIONES_PER_PAGE}`,
        { headers: { Authorization: `Bearer ${tkn}` }, signal }
      )
      if (signal.aborted) return
      if (!response.ok) throw new Error(`Error ${response.status}`)
      const data = await response.json()
      setPredicciones(data.data || [])
      setTotalPred(data.total || 0)
    } catch (error: any) {
      if (error.name === "AbortError") return
      console.error("Error al cargar predicciones:", error)
      setErrorPredicciones("No se pudieron cargar las evaluaciones predictivas. Verifica la conexión.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    cargarPredicciones(token, pagePred, controller.signal)
    cargarConsultas(token, pageConsultas, controller.signal)
    return () => controller.abort()
  }, [token, pagePred, pageConsultas, cargarPredicciones, cargarConsultas])

  const filteredPredicciones = predicciones.filter((pred) => {
    const matchSearch =
      pred.paciente_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pred.cedula?.includes(searchTerm)
    const matchRisk = filterRisk === "todos" || pred.nivel_riesgo === filterRisk
    return matchSearch && matchRisk
  })

  const filteredConsultas = consultas.filter((c) => {
    if (!searchTerm) return true
    const name = `${c.paciente?.nombre} ${c.paciente?.apellido_paterno}`.toLowerCase()
    return name.includes(searchTerm.toLowerCase()) ||
      c.motivo_consulta?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const handleExportar = () => {
    if (filteredPredicciones.length === 0) return
    const headers = ["Paciente", "Cédula", "Resultado", "Probabilidad", "Nivel Riesgo", "Fecha", "Médico"]
    const rows = filteredPredicciones.map(p => [
      p.paciente_nombre,
      p.cedula || "",
      p.resultado_prediccion ? "Positivo" : "Negativo",
      `${(p.probabilidad_diabetes * 100).toFixed(1)}%`,
      p.nivel_riesgo,
      new Date(p.fecha_prediccion).toLocaleDateString(),
      p.usuario_nombre
    ])
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `historial_predicciones_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getRiskBadge = (level: string, outcome: boolean) => {
    if (!outcome) {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          Negativo
        </Badge>
      )
    }
    switch (level?.toLowerCase()) {
      case "alto":
        return <Badge variant="destructive">Riesgo Alto</Badge>
      case "moderado":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
            Riesgo Moderado
          </Badge>
        )
      case "bajo":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            Riesgo Bajo
          </Badge>
        )
      default:
        return <Badge variant="secondary">Sin clasificar</Badge>
    }
  }

  const isInitialLoading = loading && loadingConsultas && predicciones.length === 0 && consultas.length === 0

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-background">
        <MedicalHeader />
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              <p className="mt-4 text-muted-foreground">Cargando actividad clínica...</p>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <MedicalHeader />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Actividad Clínica</h1>
          <p className="mt-2 text-muted-foreground">Registro unificado de consultas, evaluaciones y actividad del sistema</p>
        </div>

        {/* Búsqueda global */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre de paciente o motivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="consultas" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="consultas" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Consultas Médicas
            </TabsTrigger>
            <TabsTrigger value="predicciones" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Evaluaciones IA
            </TabsTrigger>
          </TabsList>

          {/* Tab: Consultas Médicas */}
          <TabsContent value="consultas">
            {/* Error de consultas */}
            {errorConsultas && (
              <Alert className="mb-4 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/50">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="text-red-800 dark:text-red-300">
                  {errorConsultas}
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => token && cargarConsultas(token, pageConsultas, new AbortController().signal)}
                    className="ml-2 p-0 h-auto text-red-700 dark:text-red-400 underline"
                  >
                    Reintentar
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-green-600 dark:text-green-400" />
                      Consultas Recientes
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {filteredConsultas.length} consultas en esta página
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingConsultas ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                  </div>
                ) : filteredConsultas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    No se encontraron consultas registradas.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium text-foreground">Paciente</th>
                          <th className="text-left py-3 px-4 font-medium text-foreground">Motivo</th>
                          <th className="text-left py-3 px-4 font-medium text-foreground">Fecha</th>
                          <th className="text-left py-3 px-4 font-medium text-foreground">Médico</th>
                          <th className="text-left py-3 px-4 font-medium text-foreground">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredConsultas.map((consulta) => (
                          <tr key={consulta.id_consulta} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium text-foreground">
                                  {consulta.paciente?.nombre ?? "—"} {consulta.paciente?.apellido_paterno ?? ""}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">
                              {consulta.motivo_consulta || "Sin motivo registrado"}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {new Date(consulta.fecha_consulta).toLocaleDateString("es-ES")}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              Dr. {consulta.usuario?.nombre} {consulta.usuario?.apellido_paterno}
                            </td>
                            <td className="py-3 px-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => consulta.paciente?.id_paciente && router.push(`/pacientes/${consulta.paciente.id_paciente}/historial`)}
                                disabled={!consulta.paciente?.id_paciente}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Ver Historial
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Paginación de consultas */}
                {totalConsultas > CONSULTAS_PER_PAGE && (
                  <div className="flex justify-between items-center mt-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Página {pageConsultas} · {Math.min(CONSULTAS_PER_PAGE, filteredConsultas.length)} de ~{totalConsultas} consultas
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pageConsultas === 1}
                        onClick={() => setPageConsultas(p => p - 1)}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={filteredConsultas.length < CONSULTAS_PER_PAGE}
                        onClick={() => setPageConsultas(p => p + 1)}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Evaluaciones IA */}
          <TabsContent value="predicciones">
            {/* Banner contextual sobre IA */}
            <Alert className="mb-4 border-violet-200 bg-violet-50/50 dark:border-violet-900 dark:bg-violet-950/30">
              <Brain className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <AlertDescription className="text-violet-800 dark:text-violet-300 text-sm">
                Las evaluaciones predictivas son un complemento del historial clínico. Cada predicción se basa en los datos
                de laboratorio del paciente y actúa como apoyo a la decisión médica. No constituyen un diagnóstico.
              </AlertDescription>
            </Alert>

            {/* Error de predicciones */}
            {errorPredicciones && (
              <Alert className="mb-4 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/50">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="text-red-800 dark:text-red-300">
                  {errorPredicciones}
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => token && cargarPredicciones(token, pagePred, new AbortController().signal)}
                    className="ml-2 p-0 h-auto text-red-700 dark:text-red-400 underline"
                  >
                    Reintentar
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Controles de filtrado de predicciones */}
            <Card className="mb-4">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex gap-2 ml-auto">
                    <select
                      value={filterRisk}
                      onChange={(e) => setFilterRisk(e.target.value)}
                      className="px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="todos">Todos los niveles</option>
                      <option value="alto">Riesgo Alto</option>
                      <option value="moderado">Riesgo Moderado</option>
                      <option value="bajo">Riesgo Bajo</option>
                    </select>
                    <Button variant="outline" size="sm" onClick={handleExportar} disabled={filteredPredicciones.length === 0}>
                      <Download className="w-4 h-4 mr-2" />
                      Exportar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabla de predicciones */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      Evaluaciones Predictivas
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {filteredPredicciones.length} de {totalPred} registros — Módulo de IA: Predicción de Diabetes
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="border-violet-200 text-violet-700 dark:border-violet-800 dark:text-violet-300">
                    <Brain className="w-3 h-3 mr-1" />
                    IA Clínica
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium text-foreground">Paciente</th>
                          <th className="text-left py-3 px-4 font-medium text-foreground">Fecha</th>
                          <th className="text-left py-3 px-4 font-medium text-foreground">Resultado</th>
                          <th className="text-left py-3 px-4 font-medium text-foreground">Confianza</th>
                          <th className="text-left py-3 px-4 font-medium text-foreground">Nivel</th>
                          <th className="text-left py-3 px-4 font-medium text-foreground">Registrado por</th>
                          <th className="text-left py-3 px-4 font-medium text-foreground">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPredicciones.map((pred) => (
                          <tr key={pred.id_prediccion} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4">
                              <div className="font-medium text-foreground">{pred.paciente_nombre}</div>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {new Date(pred.fecha_prediccion).toLocaleDateString("es-ES")}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2">
                                {pred.resultado_prediccion ? (
                                  <AlertTriangle className="w-4 h-4 text-red-600" />
                                ) : (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                )}
                                <span className={pred.resultado_prediccion ? "text-red-600" : "text-green-600"}>
                                  {pred.resultado_prediccion ? "Positivo" : "Negativo"}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {(pred.probabilidad_diabetes * 100).toFixed(1)}%
                            </td>
                            <td className="py-3 px-4">
                              {getRiskBadge(pred.nivel_riesgo, pred.resultado_prediccion)}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">{pred.usuario_nombre}</td>
                            <td className="py-3 px-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/pacientes/${pred.id_paciente}/predicciones`)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Ver
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {filteredPredicciones.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        {predicciones.length === 0
                          ? "No se han realizado evaluaciones predictivas. Acceda al historial de un paciente con datos clínicos para ejecutar una evaluación."
                          : "No se encontraron registros que coincidan con los filtros aplicados."}
                      </div>
                    )}
                  </div>
                )}

                {/* Paginación de predicciones */}
                {totalPred > PREDICCIONES_PER_PAGE && (
                  <div className="flex justify-between items-center mt-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Página {pagePred} · Mostrando {Math.min(PREDICCIONES_PER_PAGE, filteredPredicciones.length)} de {totalPred} registros
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagePred === 1}
                        onClick={() => setPagePred(p => p - 1)}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagePred >= Math.ceil(totalPred / PREDICCIONES_PER_PAGE)}
                        onClick={() => setPagePred(p => p + 1)}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
