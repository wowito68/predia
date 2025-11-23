"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MedicalHeader } from "@/components/medical-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Brain, Shield, TrendingUp, FileText, HelpCircle, AlertTriangle, CheckCircle, Loader2 } from "lucide-react"

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

  const accuracy = metrics?.accuracy ? (metrics.accuracy * 100).toFixed(1) : "97.89"
  const totalSamples = (metrics?.n_samples_train || 0) + (metrics?.n_samples_test || 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <MedicalHeader />

      <main className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Centro de Ayuda</h1>
          <p className="mt-2 text-gray-600">Guía completa para el uso de PREDIA - Sistema de Predicción de Diabetes</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-6 h-6 text-blue-600" />
                  <span>¿Qué es PREDIA?</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  PREDIA (Predicción de Diabetes con IA) es una herramienta de apoyo diagnóstico que utiliza inteligencia artificial para
                  evaluar el riesgo de diabetes en pacientes, basándose en parámetros clínicos específicos.
                </p>
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertTriangle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>Importante:</strong> Esta herramienta es de apoyo diagnóstico únicamente. Siempre debe
                    confirmarse con exámenes clínicos adicionales y criterio médico.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  <span>Métricas del Modelo de IA</span>
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
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{accuracy}%</div>
                        <div className="text-sm text-gray-600">Precisión (Accuracy)</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{totalSamples}</div>
                        <div className="text-sm text-gray-600">Muestras Totales</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{metrics?.n_samples_train || 757}</div>
                        <div className="text-sm text-gray-600">Entrenamiento</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">{metrics?.n_samples_test || 190}</div>
                        <div className="text-sm text-gray-600">Validación</div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-4">
                      Modelo entrenado con dataset \"Predict Diabetes From Medical Records\" de Kaggle.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <HelpCircle className="w-5 h-5 text-blue-600" />
                  <span>Soporte Técnico</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-sm text-gray-500">Email:</span>
                  <p className="font-medium">soporte@predia.com</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
