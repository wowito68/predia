"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AlertTriangle, Brain, CalendarClock, CheckCircle2, Loader2, ShieldAlert, Stethoscope } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type DashboardStats = {
  totalPacientes: number
  alertasActivas: number
  citasPendientes: number
  consultasHoy: number
  alertas: Array<{
    id: number
    id_paciente?: number
    paciente: string
    cedula: string
    nivel_riesgo: string
    probabilidad: number
    fecha: string
    tiempo_relativo: string
  }>
}

function riskClass(level: string) {
  if (level === "Muy Alto") return "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
  return "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-200"
}

export default function AlertasClinicasPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
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
        if (!res.ok || !body.success) throw new Error(body.error || "No se pudieron cargar las alertas")
        setStats(body.data)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error desconocido"))
      .finally(() => setLoading(false))
  }, [router])

  return (
    <DashboardLayout>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Alertas Clínicas</h1>
            <p className="mt-2 text-muted-foreground">Prioriza pacientes que requieren decisión o seguimiento médico.</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/pacientes")}>Buscar paciente</Button>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
            <AlertTriangle className="h-4 w-4 text-red-700" />
            <AlertDescription className="text-red-800 dark:text-red-200">{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-28 rounded-lg" />)}
            </div>
            <Skeleton className="h-96 rounded-lg" />
          </div>
        ) : stats ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="rounded-lg shadow-none">
                <CardContent className="p-5">
                  <ShieldAlert className="mb-3 h-5 w-5 text-red-700 dark:text-red-300" />
                  <p className="text-2xl font-semibold">{stats.alertasActivas ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Riesgo alto</p>
                </CardContent>
              </Card>
              <Card className="rounded-lg shadow-none">
                <CardContent className="p-5">
                  <Brain className="mb-3 h-5 w-5 text-primary" />
                  <p className="text-2xl font-semibold">{stats.alertas?.length ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Alertas IA recientes</p>
                </CardContent>
              </Card>
              <Card className="rounded-lg shadow-none">
                <CardContent className="p-5">
                  <CalendarClock className="mb-3 h-5 w-5 text-amber-700 dark:text-amber-300" />
                  <p className="text-2xl font-semibold">{stats.citasPendientes ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Seguimientos programados</p>
                </CardContent>
              </Card>
              <Card className="rounded-lg shadow-none">
                <CardContent className="p-5">
                  <Stethoscope className="mb-3 h-5 w-5 text-emerald-700 dark:text-emerald-300" />
                  <p className="text-2xl font-semibold">{stats.consultasHoy ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Consultas hoy</p>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-lg shadow-none">
              <CardHeader>
                <CardTitle>Lista priorizada</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.alertas?.length ? (
                  <div className="divide-y">
                    {stats.alertas.map((alerta) => (
                      <div key={alerta.id} className="grid gap-3 py-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-foreground">{alerta.paciente}</p>
                            <Badge variant="outline" className={riskClass(alerta.nivel_riesgo)}>{alerta.nivel_riesgo}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">Cédula {alerta.cedula} · {alerta.tiempo_relativo}</p>
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">Revisar factores y validar IA</p>
                        <Button asChild size="sm">
                          <Link href={alerta.id_paciente ? `/pacientes/${alerta.id_paciente}` : "/pacientes"}>Abrir resumen</Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-lg border bg-emerald-50 p-5 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                    <CheckCircle2 className="h-5 w-5" />
                    <div>
                      <p className="font-semibold">Sin alertas activas</p>
                      <p className="text-sm opacity-80">No hay pacientes priorizados por IA en este momento.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </main>
    </DashboardLayout>
  )
}
