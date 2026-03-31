"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Loader2,
  Search,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  FileText,
  User,
  Eye,
  FileSpreadsheet,
  ClipboardList,
} from "lucide-react"

// ✅ Hook de debounce para búsqueda
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}

interface Paciente {
  id_paciente: number
  cedula: string
  nombre: string
  apellido_paterno: string
  apellido_materno?: string
  genero: string
  fecha_nacimiento: string
  email?: string
  telefono?: string
  activo: boolean
  fecha_registro: string
  ultima_consulta?: string
  resultado?: string
  probabilidad_diabetes?: number
  fecha_prediccion?: string
}

interface PaginatedResponse {
  success: boolean
  data: Paciente[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ✅ Funciones helper para lógica de componente



// ✅ Calcular edad correctamente (mes y día)
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

// ✅ Obtener rango de páginas para paginación
const getPaginationRange = (page: number, totalPages: number): (number | string)[] => {
  const delta = 2
  const range: (number | string)[] = []

  for (let i = Math.max(2, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) {
    range.push(i)
  }

  if (page - delta > 2) range.unshift("...")
  if (page + delta < totalPages - 1) range.push("...")

  range.unshift(1)
  if (totalPages > 1) range.push(totalPages)

  return range
}

export default function PacientesPage() {
  const router = useRouter()
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [pacienteAEliminar, setPacienteAEliminar] = useState<Paciente | null>(null)

  // ✅ Debounce de búsqueda (500ms delay)
  const debouncedSearch = useDebounce(search, 500)

  // ✅ Obtener token fresco de localStorage
  const getToken = useCallback(() => localStorage.getItem("token"), [])

  const cargarPacientes = useCallback(
    async (pageNum: number, searchTerm: string = "") => {
      const token = getToken()
      if (!token) {
        router.push("/login")
        return
      }

      setLoading(true)
      setError("")

      try {
        const queryParams = new URLSearchParams({
          page: pageNum.toString(),
          limit: "10",
          ...(searchTerm && { search: searchTerm }),
        })

        const response = await fetch(`/api/pacientes?${queryParams}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error("Error al cargar pacientes")
        }

        const data = (await response.json()) as PaginatedResponse

        setPacientes(data.data)
        setPage(data.pagination.page)
        setTotalPages(data.pagination.totalPages)
        setTotal(data.pagination.total)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error desconocido"
        setError(message)
      } finally {
        setLoading(false)
      }
    },
    [getToken, router]
  )

  // ✅ Cargar pacientes al montar
  useEffect(() => {
    const token = getToken()
    if (!token) {
      router.push("/login")
      return
    }

    cargarPacientes(1, "")
  }, [router, getToken, cargarPacientes])

  // ✅ Cargar cuando la búsqueda cambia (con debounce)
  useEffect(() => {
    setPage(1)
    cargarPacientes(1, debouncedSearch)
  }, [debouncedSearch, cargarPacientes])

  // ✅ Cambiar página
  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage)
      cargarPacientes(newPage, debouncedSearch)
    },
    [debouncedSearch, cargarPacientes]
  )

  // ✅ Buscar sin debounce en handleSearch
  const handleSearch = (value: string) => {
    setSearch(value)
  }

  // ✅ Eliminar paciente
  const handleEliminar = async (paciente: Paciente) => {
    const token = getToken()
    if (!token) {
      setError("Sesión expirada")
      return
    }

    setDeletingId(paciente.id_paciente)
    try {
      const response = await fetch(`/api/pacientes/${paciente.id_paciente}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Error al eliminar paciente")
      }

      // ✅ Ajustar página si quedó vacía
      const nuevaPagina = pacientes.length === 1 && page > 1 ? page - 1 : page

      setPacienteAEliminar(null)
      await cargarPacientes(nuevaPagina, debouncedSearch)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      setError(message)
    } finally {
      setDeletingId(null)
    }
  }

  // ✅ Editar paciente
  const handleEditarPaciente = (id: number) => {
    router.push(`/pacientes/${id}/editar`)
  }

  // ✅ Ver predicciones (nombre corregido)
  const handleVerPredicciones = (id: number) => {
    router.push(`/pacientes/${id}/predicciones`)
  }

  // Exportar a CSV
  const exportarCSV = () => {
    if (pacientes.length === 0) {
      setError("No hay datos para exportar")
      return
    }

    const headers = [
      "Cédula",
      "Nombre Completo",
      "Género",
      "Edad",
      "Email",
      "Teléfono",
      "Estado",
      "Fecha Registro"
    ]

    const rows = pacientes.map(p => [
      p.cedula,
      getNombreCompleto(p),
      p.genero,
      calcularEdad(p.fecha_nacimiento),
      p.email || "N/A",
      p.telefono || "N/A",
      p.activo ? "Activo" : "Inactivo",
      new Date(p.fecha_registro).toLocaleDateString()
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `pacientes_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
  }

  const getNombreCompleto = (paciente: Paciente) => {
    return [paciente.nombre, paciente.apellido_paterno, paciente.apellido_materno]
      .filter(Boolean)
      .join(" ")
  }

  return (
    <DashboardLayout>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Pacientes</h1>
            <p className="mt-2 text-muted-foreground">Gestione los datos de los pacientes registrados</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={exportarCSV}
              variant="outline"
              className="flex items-center gap-2"
              disabled={pacientes.length === 0}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Exportar CSV
            </Button>
            <Link href="/nuevo-paciente">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Paciente
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/50">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-300">{error}</AlertDescription>
          </Alert>
        )}

        {/* Búsqueda */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, cédula..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Total: {total} pacientes</p>
          </CardContent>
        </Card>

        {/* Tabla de pacientes */}
        {loading ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              <p className="mt-4 text-muted-foreground">Cargando pacientes...</p>
            </CardContent>
          </Card>
        ) : pacientes.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <User className="w-12 h-12 mx-auto text-muted-foreground/30" />
              <p className="mt-4 text-muted-foreground">No se encontraron pacientes</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold">Paciente</th>
                        <th className="text-left py-3 px-4 font-semibold">Cédula</th>
                        <th className="text-left py-3 px-4 font-semibold">Edad</th>
                        <th className="text-left py-3 px-4 font-semibold">Estado</th>
                        <th className="text-left py-3 px-4 font-semibold">Última Consulta</th>
                        <th className="text-center py-3 px-4 font-semibold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pacientes.map((paciente) => {
                        // ✅ Calcular edad correctamente
                        const edad = calcularEdad(paciente.fecha_nacimiento)

                        return (
                          <tr key={paciente.id_paciente} className="border-b hover:bg-background">
                            <td className="py-4 px-4 font-medium">{getNombreCompleto(paciente)}</td>
                            <td className="py-4 px-4">{paciente.cedula}</td>
                            <td className="py-4 px-4">{edad} años</td>
                            <td className="py-4 px-4">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${paciente.activo
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-muted text-muted-foreground"
                                  }`}
                              >
                                {paciente.activo ? "Activo" : "Inactivo"}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              {paciente.ultima_consulta ? (
                                <span className="text-sm">
                                  {new Date(paciente.ultima_consulta).toLocaleDateString()}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-sm">Sin consultas</span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-center">
                              <div className="flex justify-center gap-2">
                                <button
                                  onClick={() => router.push(`/pacientes/${paciente.id_paciente}/historial`)}
                                  title="Ver historial clínico"
                                  className="p-2 rounded-md text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  <ClipboardList className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleVerPredicciones(paciente.id_paciente)}
                                  title="Ver predicciones"
                                  className="p-2 rounded-md text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleEditarPaciente(paciente.id_paciente)}
                                  title="Editar"
                                  className="p-2 rounded-md text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setPacienteAEliminar(paciente)}
                                  disabled={deletingId === paciente.id_paciente}
                                  title="Eliminar"
                                  className="p-2 rounded-md text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  {deletingId === paciente.id_paciente ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Paginación mejorada */}
            {totalPages > 1 && (
              <Card className="mt-6">
                <CardContent className="pt-6">
                  <div className="flex justify-center gap-2 flex-wrap">
                    <Button
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1}
                      variant="outline"
                    >
                      Anterior
                    </Button>
                    {getPaginationRange(page, totalPages).map((p, idx) =>
                      typeof p === "string" ? (
                        <span key={`ellipsis-${idx}`} className="px-3 py-2 text-muted-foreground">
                          ...
                        </span>
                      ) : (
                        <Button
                          key={p}
                          onClick={() => handlePageChange(p as number)}
                          variant={page === p ? "default" : "outline"}
                        >
                          {p}
                        </Button>
                      )
                    )}
                    <Button
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page === totalPages}
                      variant="outline"
                    >
                      Siguiente
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* ✅ Diálogo de confirmación de eliminación */}
        {pacienteAEliminar && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle className="text-red-600">¿Eliminar paciente?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Está a punto de eliminar a <strong>{getNombreCompleto(pacienteAEliminar)}</strong>{" "}
                  (Cédula: <strong>{pacienteAEliminar.cedula}</strong>).
                </p>
                <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/50">
                  <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <AlertDescription className="text-sm text-yellow-800 dark:text-yellow-300">
                    Esta acción no se puede deshacer. Se eliminarán todos los registros asociados.
                  </AlertDescription>
                </Alert>
                <div className="flex gap-3 justify-end">
                  <Button
                    onClick={() => setPacienteAEliminar(null)}
                    variant="outline"
                    disabled={deletingId === pacienteAEliminar.id_paciente}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => handleEliminar(pacienteAEliminar)}
                    variant="destructive"
                    disabled={deletingId === pacienteAEliminar.id_paciente}
                  >
                    {deletingId === pacienteAEliminar.id_paciente ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Eliminando...
                      </>
                    ) : (
                      "Eliminar Paciente"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </DashboardLayout>
  )
}
