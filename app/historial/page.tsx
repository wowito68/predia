"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MedicalHeader } from "@/components/medical-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, Download, Eye, AlertTriangle, CheckCircle, Loader2 } from "lucide-react"

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

export default function HistorialPage() {
  const router = useRouter()
  const [predicciones, setPredicciones] = useState<Prediccion[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterRisk, setFilterRisk] = useState<string>("todos")
  const [token, setToken] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10

  useEffect(() => {
    const storedToken = localStorage.getItem("token")
    if (!storedToken) {
      router.push("/login")
      return
    }
    setToken(storedToken)
  }, [router])

  useEffect(() => {
    if (token) {
      cargarPredicciones()
    }
  }, [token, page])

  const cargarPredicciones = async () => {
    if (!token) return

    setLoading(true)
    try {
      const response = await fetch(`/api/predicciones?page=${page}&limit=${limit}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Error al cargar predicciones")
      }

      const data = await response.json()
      setPredicciones(data.data || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error("Error al cargar predicciones:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPredicciones = predicciones.filter((pred) => {
    const matchSearch =
      pred.paciente_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pred.cedula?.includes(searchTerm)

    const matchRisk = filterRisk === "todos" || pred.nivel_riesgo === filterRisk

    return matchSearch && matchRisk
  })

  const getRiskBadge = (level: string, outcome: boolean) => {
    if (!outcome) {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-700">
          Negativo
        </Badge>
      )
    }

    switch (level?.toLowerCase()) {
      case "alto":
        return <Badge variant="destructive">Riesgo Alto</Badge>
      case "moderado":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
            Riesgo Moderado
          </Badge>
        )
      case "bajo":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            Riesgo Bajo
          </Badge>
        )
      default:
        return <Badge variant="secondary">Sin clasificar</Badge>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MedicalHeader />
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              <p className="mt-4 text-gray-600">Cargando historial...</p>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MedicalHeader />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Historial de Predicciones</h1>
          <p className="mt-2 text-gray-600">Registro de todas las evaluaciones realizadas</p>
        </div>

        {/* Controles de filtrado */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por nombre o cédula..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={filterRisk}
                  onChange={(e) => setFilterRisk(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="todos">Todos los riesgos</option>
                  <option value="alto">Riesgo Alto</option>
                  <option value="moderado">Riesgo Moderado</option>
                  <option value="bajo">Riesgo Bajo</option>
                </select>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filtros
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de historial */}
        <Card>
          <CardHeader>
            <CardTitle>Registros ({filteredPredicciones.length} de {total})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Paciente</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Fecha</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Resultado</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Confianza</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Estado</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Registrado por</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPredicciones.map((pred) => (
                    <tr key={pred.id_prediccion} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{pred.paciente_nombre}</div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
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
                      <td className="py-3 px-4 text-gray-600">
                        {(pred.probabilidad_diabetes * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-4">
                        {getRiskBadge(pred.nivel_riesgo, pred.resultado_prediccion)}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{pred.usuario_nombre}</td>
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
                <div className="text-center py-8 text-gray-500">
                  {predicciones.length === 0
                    ? "No se encontraron predicciones. Realice una evaluación desde la página de pacientes."
                    : "No se encontraron registros que coincidan con los filtros aplicados."}
                </div>
              )}
            </div>

            {/* Paginación */}
            {total > limit && (
              <div className="flex justify-between items-center mt-4 pt-4 border-t">
                <div className="text-sm text-gray-600">
                  Mostrando {Math.min(limit, filteredPredicciones.length)} de {total} registros
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= Math.ceil(total / limit)}
                    onClick={() => setPage(page + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
