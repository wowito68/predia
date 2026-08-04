"use client"

import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Activity, AlertTriangle, BarChart3, CalendarDays, LineChart, Users } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { RiskDistributionWidget } from "@/components/risk/RiskDistributionWidget"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type Stats = {
  totalPacientes: number
  consultasHoy: number
  citasPendientes: number
  alertasActivas: number
  prediccionesHoy: number
  distribucionRiesgo?: Record<string, number>
  tendenciaRiesgo?: { aumentaron: number; disminuyeron: number; estables: number }
}

function Kpi({ icon, label, value, hint }: { icon: ReactNode; label: string; value: number | string; hint: string }) {
  return (
    <Card className="rounded-lg shadow-none">
      <CardContent className="p-5">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground">{icon}</div>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        <p className="mt-1 text-sm font-medium text-foreground">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}

export default function AnaliticaPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }
    fetch("/api/dashboard/stats", { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        const body = await res.json()
        if (!res.ok || !body.success) throw new Error(body.error || "No se pudo cargar analítica")
        setStats(body.data)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error desconocido"))
      .finally(() => setLoading(false))
  }, [router])

  return (
    <DashboardLayout>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Analítica Clínica</h1>
          <p className="mt-2 text-muted-foreground">Vista ejecutiva de carga clínica, riesgo y seguimiento de la población atendida.</p>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
            <AlertTriangle className="h-4 w-4 text-red-700" />
            <AlertDescription className="text-red-800 dark:text-red-200">{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-5">
              {[1, 2, 3, 4, 5].map((item) => <Skeleton key={item} className="h-32 rounded-lg" />)}
            </div>
            <Skeleton className="h-96 rounded-lg" />
          </div>
        ) : stats ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-5">
              <Kpi icon={<Users className="h-5 w-5" />} label="Pacientes activos" value={stats.totalPacientes} hint="Población bajo seguimiento" />
              <Kpi icon={<Activity className="h-5 w-5" />} label="Riesgo alto" value={stats.alertasActivas ?? 0} hint="Pacientes que requieren prioridad" />
              <Kpi icon={<CalendarDays className="h-5 w-5" />} label="Citas pendientes" value={stats.citasPendientes ?? 0} hint="Seguimientos programados" />
              <Kpi icon={<LineChart className="h-5 w-5" />} label="Predicciones hoy" value={stats.prediccionesHoy ?? 0} hint="Actividad de apoyo IA" />
              <Kpi icon={<BarChart3 className="h-5 w-5" />} label="Consultas hoy" value={stats.consultasHoy ?? 0} hint="Carga operativa diaria" />
            </div>

            <RiskDistributionWidget distribucion={stats.distribucionRiesgo} tendencia={stats.tendenciaRiesgo} />

            <Card className="rounded-lg shadow-none">
              <CardHeader>
                <CardTitle>Lectura clínica</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm font-semibold">Prioridad de agenda</p>
                  <p className="mt-1 text-sm text-muted-foreground">Usar pacientes de riesgo alto para ordenar llamadas y citas de seguimiento.</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm font-semibold">Calidad de seguimiento</p>
                  <p className="mt-1 text-sm text-muted-foreground">Cruzar alertas activas con citas pendientes para detectar pacientes sin plan.</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm font-semibold">Uso de IA</p>
                  <p className="mt-1 text-sm text-muted-foreground">La estratificación debe traducirse en acciones clínicas verificables.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </main>
    </DashboardLayout>
  )
}
