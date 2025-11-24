"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { MedicalHeader } from "@/components/medical-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, Save, X } from "lucide-react"

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
}

export default function EditarPacientePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const storedToken = localStorage.getItem("token")
    if (!storedToken) {
      router.push("/login")
    } else {
      setToken(storedToken)
      cargarPaciente(storedToken, id)
    }
  }, [id, router])

  const cargarPaciente = async (token: string, pacienteId: string) => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/pacientes/${pacienteId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Paciente no encontrado")
      }

      const data = await response.json()
      setPaciente(data.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleGuardar = async () => {
    if (!paciente || !token) return

    setSaving(true)
    setError("")
    setSuccess("")

    try {
      // Validar datos antes de enviar
      if (!paciente.nombre || !paciente.nombre.trim()) {
        throw new Error("El nombre es requerido")
      }
      if (!paciente.apellido_paterno || !paciente.apellido_paterno.trim()) {
        throw new Error("El apellido paterno es requerido")
      }

      const response = await fetch(`/api/pacientes/${paciente.id_paciente}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre: paciente.nombre.trim(),
          apellido_paterno: paciente.apellido_paterno.trim(),
          apellido_materno: paciente.apellido_materno?.trim() || null,
          genero: paciente.genero,
          email: paciente.email?.trim() || null,
          telefono: paciente.telefono?.trim() || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMsg = errorData.details || errorData.error || "Error al guardar cambios"
        console.error("Update paciente error:", errorData)
        throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg))
      }

      setSuccess("Paciente actualizado exitosamente")
      setTimeout(() => {
        router.push("/pacientes")
      }, 2000)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      console.error("Paciente update error:", message)
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MedicalHeader />
        <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              <p className="mt-4 text-muted-foreground">Cargando paciente...</p>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (!paciente) {
    return (
      <div className="min-h-screen bg-background">
        <MedicalHeader />
        <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error || "Paciente no encontrado"}</AlertDescription>
          </Alert>
          <Link href="/pacientes">
            <Button className="mt-4">Volver a Pacientes</Button>
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <MedicalHeader />

      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Editar Paciente</h1>
          <p className="mt-2 text-muted-foreground">Actualice la información del paciente</p>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Información del Paciente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={paciente.nombre}
                  onChange={(e) => setPaciente({ ...paciente, nombre: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="apellido_paterno">Apellido Paterno</Label>
                <Input
                  id="apellido_paterno"
                  value={paciente.apellido_paterno}
                  onChange={(e) => setPaciente({ ...paciente, apellido_paterno: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="apellido_materno">Apellido Materno</Label>
                <Input
                  id="apellido_materno"
                  value={paciente.apellido_materno || ""}
                  onChange={(e) => setPaciente({ ...paciente, apellido_materno: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="cedula">Cédula (no editable)</Label>
                <Input id="cedula" value={paciente.cedula} disabled className="bg-gray-100" />
              </div>
              <div>
                <Label htmlFor="genero">Género</Label>
                <select
                  id="genero"
                  value={paciente.genero}
                  onChange={(e) => setPaciente({ ...paciente, genero: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div>
                <Label htmlFor="fecha_nacimiento">Fecha Nacimiento (no editable)</Label>
                <Input
                  id="fecha_nacimiento"
                  value={paciente.fecha_nacimiento}
                  disabled
                  className="bg-gray-100"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={paciente.email || ""}
                  onChange={(e) => setPaciente({ ...paciente, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={paciente.telefono || ""}
                  onChange={(e) => setPaciente({ ...paciente, telefono: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t">
              <Link href="/pacientes">
                <Button variant="outline">
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </Link>
              <Button onClick={handleGuardar} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
