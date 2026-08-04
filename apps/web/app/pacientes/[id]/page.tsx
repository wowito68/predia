"use client"

import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowLeft,
  Brain,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  HeartPulse,
  Loader2,
  MessageCircle,
  Phone,
  Pill,
  Plus,
  ShieldAlert,
  Stethoscope,
  UserRound,
} from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { PatientContextNav } from "@/components/patient-context-nav"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/empty-state"
import { useConsultaStore } from "@/store/useConsultaStore"

type Snapshot = {
  paciente: any
  risk: any | null
  alerts: Array<{ type: string; severity: "critical" | "warning" | "info"; title: string; detail: string }>
  summary: {
    proximaCita: any | null
    ultimaConsulta: any | null
    ultimaMedicion: any | null
    ultimaGlucosa: any | null
    recetasActivas: any[]
    documentosRecientes: any[]
    alergias: any[]
    alergiasCriticas: any[]
    patologias: any[]
  }
  timeline: Array<{ id: string; kind: string; title: string; detail: string; date: string }>
}

function formatDate(value?: string | null) {
  if (!value) return "Sin registro"
  return new Date(value).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
}

function ageFrom(date?: string) {
  if (!date) return "Sin edad"
  const birth = new Date(date)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const month = now.getMonth() - birth.getMonth()
  if (month < 0 || (month === 0 && now.getDate() < birth.getDate())) age--
  return `${age} años`
}

function riskClasses(level?: string | null) {
  if (level === "Muy Alto") return "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
  if (level === "Alto") return "border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-200"
  if (level === "Moderado") return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
  if (level === "Bajo") return "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
  return "border-border bg-muted text-muted-foreground"
}

function alertIcon(severity: string) {
  if (severity === "critical") return <ShieldAlert className="h-4 w-4 text-red-700 dark:text-red-300" />
  if (severity === "warning") return <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-300" />
  return <Clock className="h-4 w-4 text-blue-700 dark:text-blue-300" />
}

function metric(label: string, value: string, icon: ReactNode) {
  return (
    <Card className="rounded-lg py-4 shadow-none">
      <CardContent className="flex items-center gap-3 p-4 pt-0">
        <div className="rounded-md bg-muted p-2 text-muted-foreground">{icon}</div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-base font-semibold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function PatientOverviewPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const { openConsulta } = useConsultaStore()
  const [data, setData] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }

    setLoading(true)
    fetch(`/api/pacientes/${id}/clinical-snapshot`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const body = await res.json()
        if (!res.ok || !body.success) throw new Error(body.error || "No se pudo cargar el resumen clínico")
        setData(body.data)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error desconocido"))
      .finally(() => setLoading(false))
  }, [id, router])

  const whatsappUrl = useMemo(() => {
    const phone = data?.paciente?.telefono?.replace(/[^0-9]/g, "")
    if (!phone) return null
    return `https://wa.me/${phone}`
  }, [data])

  return (
    <DashboardLayout>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <Button variant="ghost" onClick={() => router.push("/pacientes")} className="text-muted-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Pacientes
          </Button>
          {data?.risk && (
            <Badge variant="outline" className={riskClasses(data.risk.nivel)}>
              Riesgo {data.risk.nivel}
            </Badge>
          )}
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
            <AlertTriangle className="h-4 w-4 text-red-700" />
            <AlertDescription className="text-red-800 dark:text-red-200">{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
            <Skeleton className="h-[340px] rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-44 rounded-lg" />
              <Skeleton className="h-32 rounded-lg" />
              <Skeleton className="h-80 rounded-lg" />
            </div>
          </div>
        ) : data ? (
          <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
            <PatientContextNav id={id} />

            <section className="space-y-5">
              <Card className="rounded-lg py-0 shadow-none">
                <CardContent className="grid gap-5 p-5 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="flex items-start gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-xl font-bold text-primary">
                      {data.paciente.nombre?.[0]}{data.paciente.apellido_paterno?.[0]}
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{data.paciente.nombre_completo}</h1>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {ageFrom(data.paciente.fecha_nacimiento)} · {data.paciente.genero || "Sexo no registrado"} · {data.paciente.tipo_sangre || "Sin tipo sanguíneo"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">Cédula: {data.paciente.cedula}</p>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
                    <Button onClick={() => openConsulta(Number(id))}>
                      <Plus className="mr-2 h-4 w-4" />
                      Nueva consulta
                    </Button>
                    <Button variant="outline" asChild disabled={!data.paciente.telefono}>
                      <a href={data.paciente.telefono ? `tel:${data.paciente.telefono}` : "#"}>
                        <Phone className="mr-2 h-4 w-4" />
                        Llamar
                      </a>
                    </Button>
                    <Button variant="outline" asChild disabled={!whatsappUrl}>
                      <a href={whatsappUrl ?? "#"} target="_blank" rel="noreferrer">
                        <MessageCircle className="mr-2 h-4 w-4" />
                        WhatsApp
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-3 md:grid-cols-4">
                {metric("Próxima cita", data.summary.proximaCita ? formatDate(data.summary.proximaCita.proxima_cita) : "Sin cita", <CalendarDays className="h-4 w-4" />)}
                {metric("Última consulta", data.summary.ultimaConsulta ? formatDate(data.summary.ultimaConsulta.fecha_consulta) : "Sin consulta", <Stethoscope className="h-4 w-4" />)}
                {metric("Presión", data.summary.ultimaMedicion?.presion_sistolica ? `${data.summary.ultimaMedicion.presion_sistolica}/${data.summary.ultimaMedicion.presion_diastolica ?? "?"}` : "Sin dato", <HeartPulse className="h-4 w-4" />)}
                {metric("Recetas activas", String(data.summary.recetasActivas.length), <Pill className="h-4 w-4" />)}
              </div>

              <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
                <Card className="rounded-lg shadow-none">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary" />
                      Riesgo clínico explicado
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {data.risk ? (
                      <>
                        <div className={`rounded-lg border p-4 ${riskClasses(data.risk.nivel)}`}>
                          <p className="text-sm font-medium">Estratificación</p>
                          <p className="mt-1 text-2xl font-semibold">{data.risk.titulo}</p>
                          <p className="mt-2 text-sm opacity-90">{data.risk.descripcion}</p>
                          <p className="mt-3 text-sm font-semibold">{data.risk.accionClinica}</p>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-lg border bg-card p-4">
                            <p className="mb-3 text-sm font-semibold text-foreground">Factores que aumentan riesgo</p>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                              {data.risk.explanation.contribuyen.length ? data.risk.explanation.contribuyen.map((item: any) => (
                                <li key={item.factor} className="flex gap-2"><span className="text-orange-600">•</span>{item.factor}</li>
                              )) : <li>Sin factores dominantes registrados.</li>}
                            </ul>
                          </div>
                          <div className="rounded-lg border bg-card p-4">
                            <p className="mb-3 text-sm font-semibold text-foreground">Factores protectores</p>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                              {data.risk.explanation.protegen.length ? data.risk.explanation.protegen.map((item: any) => (
                                <li key={item.factor} className="flex gap-2"><span className="text-emerald-600">•</span>{item.factor}</li>
                              )) : <li>Sin factores protectores dominantes.</li>}
                            </ul>
                          </div>
                        </div>
                        <div className="rounded-lg border bg-muted/40 p-4">
                          <p className="text-sm font-semibold text-foreground">Recomendación</p>
                          <p className="mt-1 text-sm text-muted-foreground">{data.risk.recomendaciones?.seguimiento}</p>
                          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                            {data.risk.recomendaciones?.acciones?.map((item: string) => <li key={item}>• {item}</li>)}
                          </ul>
                        </div>
                      </>
                    ) : (
                      <EmptyState
                        icon={<Brain className="h-7 w-7" />}
                        title="Sin evaluación de riesgo"
                        description="Este paciente aún no tiene una evaluación de IA registrada."
                        actionLabel="Crear evaluación"
                        onAction={() => router.push(`/pacientes/${id}/predicciones`)}
                      />
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-lg shadow-none">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      Alertas activas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.alerts.length ? (
                      <div className="space-y-3">
                        {data.alerts.map((alert) => (
                          <div key={`${alert.type}-${alert.title}`} className="flex gap-3 rounded-lg border bg-card p-3">
                            <div className="mt-0.5">{alertIcon(alert.severity)}</div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">{alert.title}</p>
                              <p className="text-sm text-muted-foreground">{alert.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 rounded-lg border bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                        <CheckCircle2 className="h-5 w-5" />
                        <div>
                          <p className="font-semibold">Sin alertas críticas</p>
                          <p className="text-sm opacity-80">Mantener seguimiento clínico habitual.</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
                <Card className="rounded-lg shadow-none">
                  <CardHeader>
                    <CardTitle>Timeline clínico</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.timeline.length ? (
                      <div className="space-y-4">
                        {data.timeline.map((event) => (
                          <div key={event.id} className="grid grid-cols-[110px_1fr] gap-4 border-b pb-4 last:border-b-0 last:pb-0">
                            <div>
                              <Badge variant="secondary">{event.kind}</Badge>
                              <p className="mt-2 text-xs text-muted-foreground">{formatDate(event.date)}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{event.title}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{event.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        icon={<FileText className="h-7 w-7" />}
                        title="Timeline sin eventos"
                        description="Este paciente aún no tiene consultas, mediciones, recetas o documentos registrados."
                        actionLabel="Crear primera consulta"
                        onAction={() => openConsulta(Number(id))}
                      />
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-lg shadow-none">
                  <CardHeader>
                    <CardTitle>Últimos elementos clínicos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <section>
                      <p className="mb-2 text-sm font-semibold text-foreground">Alergias</p>
                      {data.summary.alergias.length ? (
                        <div className="flex flex-wrap gap-2">
                          {data.summary.alergias.map((item) => (
                            <Badge key={item.id_alergia} variant="outline" className={item.severidad === "Leve" ? "" : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"}>
                              {item.alergeno} · {item.severidad ?? "Sin severidad"}
                            </Badge>
                          ))}
                        </div>
                      ) : <p className="text-sm text-muted-foreground">Sin alergias registradas.</p>}
                    </section>
                    <section>
                      <p className="mb-2 text-sm font-semibold text-foreground">Documentos recientes</p>
                      {data.summary.documentosRecientes.length ? data.summary.documentosRecientes.slice(0, 3).map((item) => (
                        <div key={item.id_documento} className="rounded-md border p-3 text-sm">
                          <p className="font-medium">{item.tipo_documento}</p>
                          <p className="text-muted-foreground">{item.descripcion || item.nombre_archivo}</p>
                        </div>
                      )) : <p className="text-sm text-muted-foreground">Sin documentos adjuntos.</p>}
                    </section>
                    <section>
                      <p className="mb-2 text-sm font-semibold text-foreground">Accesos rápidos</p>
                      <div className="grid gap-2">
                        <Link href={`/pacientes/${id}/historial`}><Button variant="outline" className="w-full justify-start"><FileText className="mr-2 h-4 w-4" />Abrir expediente completo</Button></Link>
                        <Link href={`/pacientes/${id}/evolucion`}><Button variant="outline" className="w-full justify-start"><HeartPulse className="mr-2 h-4 w-4" />Ver evolución</Button></Link>
                        <Link href={`/pacientes/${id}/predicciones`}><Button variant="outline" className="w-full justify-start"><Brain className="mr-2 h-4 w-4" />Validar IA clínica</Button></Link>
                      </div>
                    </section>
                  </CardContent>
                </Card>
              </div>
            </section>
          </div>
        ) : null}
      </main>
    </DashboardLayout>
  )
}
