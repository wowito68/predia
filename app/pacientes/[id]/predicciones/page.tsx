"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { MedicalHeader } from "@/components/medical-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, ArrowLeft, Activity, TrendingUp, AlertTriangle, FileSpreadsheet } from "lucide-react"

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

export default function PrediccionesPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [predicciones, setPredicciones] = useState<Prediccion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const storedToken = localStorage.getItem("token")
    if (!storedToken) {
      router.push("/login")
    } else {
      setToken(storedToken)
      cargarPredicciones(storedToken, id)
    }
  }, [id, router])

  const cargarPredicciones = async (token: string, pacienteId: string) => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/predicciones?id_paciente=${pacienteId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Error al cargar predicciones")
      }

      const data = await response.json()

      // Parse JSON fields if they are strings
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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const getRiesgoColor = (nivel: string) => {
    switch (nivel) {
      case "Muy Alto":
        return "bg-red-100 text-red-800 border-red-300"
      case "Alto":
        return "bg-orange-100 text-orange-800 border-orange-300"
      case "Moderado":
        return "bg-yellow-100 text-yellow-800 border-yellow-300"
      case "Bajo":
        return "bg-green-100 text-green-800 border-green-300"
      default:
        return "bg-gray-100 text-gray-800 border-gray-300"
    }
  }

  const getRiesgoIcon = (nivel: string) => {
    switch (nivel) {
      case "Muy Alto":
      case "Alto":
        return <AlertTriangle className="w-5 h-5" />
      case "Moderado":
        return <Activity className="w-5 h-5" />
      case "Bajo":
        return <TrendingUp className="w-5 h-5" />
      default:
        return <Activity className="w-5 h-5" />
    }
  }

  // Exportar datos del paciente a CSV
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
    <div className="min-h-screen bg-gray-50">
      <MedicalHeader />

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
              <h1 className="text-3xl font-bold text-gray-900">Predicciones de Diabetes</h1>
              <p className="mt-2 text-gray-600">Historial de análisis con IA del paciente</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={exportarCSV}
              variant="outline"
              disabled={predicciones.length === 0}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              <p className="mt-4 text-gray-600">Cargando predicciones...</p>
            </CardContent>
          </Card>
        ) : predicciones.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Activity className="w-12 h-12 mx-auto text-gray-300" />
              <p className="mt-4 text-gray-600">No hay predicciones registradas para este paciente</p>
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
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-600 font-semibold mb-1">RESULTADO</p>
                      <p className="text-lg font-bold text-blue-900">{pred.resultado}</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <p className="text-xs text-purple-600 font-semibold mb-1">NIVEL DE RIESGO</p>
                      <p className="text-lg font-bold text-purple-900">{pred.nivel_riesgo}</p>
                    </div>
                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                      <p className="text-xs text-indigo-600 font-semibold mb-1">CONFIANZA</p>
                      <p className="text-lg font-bold text-indigo-900">
                        {Math.max(pred.probabilidad_diabetes, pred.probabilidad_no_diabetes) * 100}%
                      </p>
                    </div>
                  </div>

                  {/* Factores de Riesgo */}
                  {pred.factores_riesgo && pred.factores_riesgo.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Factores de Riesgo Identificados:</h4>
                      <ul className="space-y-2">
                        {pred.factores_riesgo.map((factor, i) => (
                          <li key={i} className="flex gap-3">
                            <span className="text-red-500 font-bold">•</span>
                            <span className="text-gray-700">{factor}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recomendaciones */}
                  {pred.recomendaciones && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Recomendaciones Médicas:</h4>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                        {pred.recomendaciones.split("\n").map((rec, i) => (
                          <p key={i} className="text-gray-700 text-sm">
                            {rec}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Datos Clínicos */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Datos Clínicos Utilizados:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {pred.datos_entrada &&
                        Object.entries(pred.datos_entrada).map(([key, value]) => (
                          <div key={key} className="bg-gray-50 p-3 rounded border">
                            <p className="text-xs text-gray-600 font-semibold">{key}</p>
                            <p className="text-lg font-bold text-gray-900">{value}</p>
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
    </div>
  )
}
