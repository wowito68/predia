"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { MedicalHeader } from "@/components/medical-header"
import { PredictionResult } from "@/components/prediction-result"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, Download } from "lucide-react"

interface PrediccionCompleta {
  id_prediccion: number
  id_paciente: number
  resultado: "No Diabetes" | "Diabetes"
  probabilidad_diabetes: number
  probabilidad_no_diabetes: number
  nivel_riesgo: "Bajo" | "Moderado" | "Alto" | "Muy Alto"
  factores_riesgo: string[]
  factores_importancia?: Array<{
    nombre: string
    importancia: number
    contribucion: number
    riesgo_nivel: string
  }>
  recomendaciones: string
  fecha_prediccion: string
  paciente?: {
    nombre: string
    apellido_paterno: string
    cedula: string
    genero: string
  }
}

function ResultadoContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [prediccion, setPrediccion] = useState<PrediccionCompleta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const storedToken = localStorage.getItem("token")
    if (!storedToken) {
      router.push("/login")
      return
    }
    setToken(storedToken)

    const id_prediccion = searchParams.get("id") || localStorage.getItem("lastPredictionId")

    if (!id_prediccion) {
      setError("No se encontró predicción")
      setLoading(false)
      return
    }

    const fetchPrediccion = async () => {
      try {
        const res = await fetch(`/api/predicciones/${id_prediccion}`, {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        })

        if (!res.ok) {
          throw new Error("No se pudo cargar la predicción")
        }

        const data = await res.json()
        setPrediccion(data.data)
      } catch (err) {
        console.error("Error al cargar predicción:", err)
        setError(err instanceof Error ? err.message : "Error desconocido")
      } finally {
        setLoading(false)
      }
    }

    fetchPrediccion()
  }, [searchParams, router])

  const handleDescargar = () => {
    if (!prediccion) return

    const paciente = prediccion.paciente || { nombre: "Paciente", apellido_paterno: "Desconocido", cedula: "N/A", genero: "M" }

    const contenido = `
REPORTE DE PREDICCIÓN DE DIABETES
==================================

Información del Paciente
------------------------
Nombre: ${paciente.nombre} ${paciente.apellido_paterno}
Cédula: ${paciente.cedula}
Género: ${paciente.genero === "M" ? "Masculino" : "Femenino"}
Fecha de Análisis: ${new Date(prediccion.fecha_prediccion).toLocaleDateString()}

Resultado del Análisis
----------------------
Predicción: ${prediccion.resultado}
Probabilidad de Diabetes: ${Math.round(prediccion.probabilidad_diabetes * 100)}%
Nivel de Riesgo: ${prediccion.nivel_riesgo}

Factores de Riesgo Identificados
---------------------------------
${prediccion.factores_riesgo.map((f) => `• ${f}`).join("\n")}

Recomendaciones Médicas
------------------------
${prediccion.recomendaciones}

---
Reporte generado automáticamente por PREDIA
${new Date().toLocaleString()}
    `.trim()

    const blob = new Blob([contenido], { type: "text/plain" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `prediccion_${paciente.cedula}_${new Date().getTime()}.txt`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-600">Cargando predicción...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MedicalHeader />
        <main className="max-w-6xl mx-auto py-6 px-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
          <Button onClick={() => router.push("/nuevo-paciente")} className="mt-4">
            Volver a Crear Predicción
          </Button>
        </main>
      </div>
    )
  }

  if (!prediccion) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MedicalHeader />
        <main className="max-w-6xl mx-auto py-6 px-4">
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertDescription className="text-yellow-800">No se encontró predicción</AlertDescription>
          </Alert>
        </main>
      </div>
    )
  }

  const paciente = prediccion.paciente || { nombre: "Paciente", apellido_paterno: "Desconocido", cedula: "N/A", genero: "M" }

  return (
    <div className="min-h-screen bg-gray-50">
      <MedicalHeader />

      <main className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Resultado del Análisis</h1>
              <p className="mt-2 text-gray-600">
                Paciente: {paciente.nombre} {paciente.apellido_paterno}
              </p>
              <p className="text-sm text-gray-500">
                Fecha: {new Date(prediccion.fecha_prediccion).toLocaleDateString()} -{" "}
                {new Date(prediccion.fecha_prediccion).toLocaleTimeString()}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleDescargar} variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Descargar
              </Button>
              <Button onClick={() => router.push("/dashboard")} variant="outline" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
            </div>
          </div>
        </div>

        {/* Contenido principal */}
        <PredictionResult
          resultado={prediccion.resultado}
          probabilidad_diabetes={prediccion.probabilidad_diabetes}
          nivel_riesgo={prediccion.nivel_riesgo}
          factores_riesgo={prediccion.factores_riesgo}
          factores_importancia={prediccion.factores_importancia}
          recomendaciones={prediccion.recomendaciones}
        />

        {/* Botones de acción */}
        <div className="mt-8 flex gap-4 flex-wrap">
          <Button onClick={() => router.push("/nuevo-paciente")} variant="default">
            Analizar Otro Paciente
          </Button>
          <Button onClick={() => router.push("/pacientes")} variant="outline">
            Ver Todos los Pacientes
          </Button>
        </div>
      </main>
    </div>
  )
}

export default function ResultadoPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ResultadoContent />
    </Suspense>
  )
}
