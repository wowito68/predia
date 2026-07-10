"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import dynamic from "next/dynamic"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2, LineChart } from "lucide-react"
import type { EvolutionData } from "@/components/evolution/ClinicalEvolution"
import { AsistenteClinico } from "@/components/cdss/AsistenteClinico"

// Carga diferida: recharts (gráficas) y @react-pdf/renderer (PDF) salen del
// bundle inicial de la ruta y se cargan en el cliente bajo demanda.
const ClinicalEvolution = dynamic(
  () => import("@/components/evolution/ClinicalEvolution").then((m) => m.ClinicalEvolution),
  { ssr: false, loading: () => <div className="flex items-center gap-2 p-6 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Cargando gráficas…</div> }
)
const EvolutionPDFButton = dynamic(() => import("@/components/pdf/EvolutionPDFButton"), {
  ssr: false,
  loading: () => <Button variant="outline" size="sm" disabled><Loader2 className="w-4 h-4 mr-2 animate-spin" />PDF…</Button>,
})

export default function EvolucionPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [paciente, setPaciente] = useState<any>(null)
  const [data, setData] = useState<EvolutionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const t = localStorage.getItem("token")
    if (!t) { router.push("/login"); return }
    Promise.all([
      fetch(`/api/pacientes/${id}`, { headers: { Authorization: `Bearer ${t}` } }).then((r) => r.json()).catch(() => null),
      fetch(`/api/pacientes/${id}/evolucion`, { headers: { Authorization: `Bearer ${t}` } }).then((r) => r.json()).catch(() => null),
    ]).then(([p, e]) => {
      if (p && p.success !== false) setPaciente(p.data ?? p)
      if (e?.success) setData(e.data)
      else if (e?.error) setError(e.error)
    }).finally(() => setLoading(false))
  }, [id, router])

  const nombre = paciente ? `${paciente.nombre ?? ""} ${paciente.apellido_paterno ?? ""}`.trim() : ""

  return (
    <DashboardLayout>
      <main className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href={`/pacientes/${id}`}>
              <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Volver</Button>
            </Link>
            <div>
              <h1 className="flex items-center gap-2 text-3xl font-bold text-foreground">
                <LineChart className="h-7 w-7 text-primary" />Evolución Clínica
              </h1>
              <p className="mt-1 text-muted-foreground">{nombre || "Análisis longitudinal del paciente"}</p>
            </div>
          </div>
          {data && (
            <EvolutionPDFButton id={id} paciente={paciente} data={data} />
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 p-6 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Cargando evolución…</div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">{error}</div>
        ) : data ? (
          <div className="space-y-6">
            <AsistenteClinico id={id} />
            <ClinicalEvolution id={id} data={data} />
          </div>
        ) : null}
      </main>
    </DashboardLayout>
  )
}
