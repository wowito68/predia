"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, CheckCircle, TrendingUp, Zap } from "lucide-react"

interface Factor {
  nombre: string
  importancia: number
  contribucion: number
  riesgo_nivel: string
}

interface PredictionResultProps {
  resultado: "No Diabetes" | "Diabetes"
  probabilidad_diabetes: number
  nivel_riesgo: "Bajo" | "Moderado" | "Alto" | "Muy Alto"
  factores_riesgo: string[]
  factores_importancia?: Factor[]
  recomendaciones: string
}

export function PredictionResult({
  resultado,
  probabilidad_diabetes,
  nivel_riesgo,
  factores_riesgo,
  factores_importancia,
  recomendaciones,
}: PredictionResultProps) {
  // Colores según nivel de riesgo
  const riskColors = {
    Bajo: { bg: "bg-green-50 dark:bg-green-900/20", border: "border-green-200 dark:border-green-800", text: "text-green-700 dark:text-green-300", badge: "bg-green-100 dark:bg-green-900/40" },
    Moderado: {
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      border: "border-yellow-200 dark:border-yellow-800",
      text: "text-yellow-700 dark:text-yellow-300",
      badge: "bg-yellow-100 dark:bg-yellow-900/40",
    },
    Alto: { bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-200 dark:border-orange-800", text: "text-orange-700 dark:text-orange-300", badge: "bg-orange-100 dark:bg-orange-900/40" },
    "Muy Alto": { bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200 dark:border-red-800", text: "text-red-700 dark:text-red-300", badge: "bg-red-100 dark:bg-red-900/40" },
  }

  const colors = riskColors[nivel_riesgo]

  // Normalizar importancia a 0-1
  const importanciaMax = factores_importancia ? Math.max(...factores_importancia.map((f) => f.importancia)) : 1
  const normalizarImportancia = (valor: number) => Math.round((valor / importanciaMax) * 100)

  return (
    <div className="space-y-6">
      {/* Resultado Principal */}
      <Card className={`border-2 ${colors.border} ${colors.bg}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className={colors.text}>
                {nivel_riesgo === "Muy Alto" && "🚨 Riesgo Muy Alto de Diabetes"}
                {nivel_riesgo === "Alto" && "⚠️ Riesgo Alto de Diabetes"}
                {nivel_riesgo === "Moderado" && "⚡ Riesgo Moderado de Diabetes"}
                {nivel_riesgo === "Bajo" && "✅ Riesgo Bajo de Diabetes"}
              </CardTitle>
              <CardDescription className="mt-1">
                {resultado === "Diabetes"
                  ? "El análisis indica presencia de criterios diagnósticos"
                  : "Resultado del análisis predictivo"}
              </CardDescription>
            </div>
            {resultado === "Diabetes" || nivel_riesgo === "Muy Alto" ? (
              <AlertTriangle className={`h-12 w-12 ${colors.text}`} />
            ) : (
              <CheckCircle className={`h-12 w-12 ${colors.text}`} />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Probabilidad */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span>Probabilidad de Diabetes</span>
              <span className={colors.text}>{Math.round(probabilidad_diabetes * 100)}%</span>
            </div>
            <div className="h-3 rounded-full bg-muted">
              <div
                className={`h-3 rounded-full transition-all ${probabilidad_diabetes < 0.3
                  ? "bg-green-500"
                  : probabilidad_diabetes < 0.6
                    ? "bg-yellow-500"
                    : "bg-red-500"
                  }`}
                style={{ width: `${Math.round(probabilidad_diabetes * 100)}%` }}
              />
            </div>
          </div>

          {/* Nivel de Riesgo */}
          <div className="flex items-center justify-between">
            <span className="font-medium">Nivel de Riesgo</span>
            <span className={`rounded-full px-4 py-1 text-sm font-semibold ${colors.badge} ${colors.text}`}>
              {nivel_riesgo}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Factores de Importancia */}
      {factores_importancia && factores_importancia.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Factores de Mayor Influencia
            </CardTitle>
            <CardDescription>Parámetros que más influyeron en la predicción</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {factores_importancia.slice(0, 5).map((factor, idx) => (
              <div key={factor.nombre} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{idx + 1}. {factor.nombre}</span>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-foreground">{normalizarImportancia(factor.importancia)}%</div>
                    <div className="text-xs text-muted-foreground">Importancia: {factor.importancia.toFixed(3)}</div>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-blue-500 transition-all"
                    style={{ width: `${normalizarImportancia(factor.importancia)}%` }}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  Contribución: {factor.contribucion.toFixed(3)} • Riesgo: {factor.riesgo_nivel}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Factores de Riesgo */}
      {factores_riesgo && factores_riesgo.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Factores de Riesgo Identificados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {factores_riesgo.map((factor, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="text-red-500 font-bold mt-0.5">•</span>
                  <span className="text-sm text-muted-foreground">{factor}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recomendaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Recomendaciones Médicas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm whitespace-pre-wrap font-mono text-foreground bg-muted p-4 rounded">
            {recomendaciones}
          </div>
        </CardContent>
      </Card>

      {/* Alerta si es diabetes */}
      {resultado === "Diabetes" && (
        <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertDescription className="text-red-800 dark:text-red-300">
            <strong>Acción Requerida:</strong> El análisis indica un riesgo significativo. Se recomienda consultar con un
            endocrinólogo especialista de inmediato para confirmación diagnóstica y plan de tratamiento.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
