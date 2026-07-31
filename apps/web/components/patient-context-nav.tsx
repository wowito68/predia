"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Activity, Brain, FileArchive, FileText, ListChecks, Pill, Stethoscope } from "lucide-react"

const items = [
  { key: "resumen", label: "Resumen Clínico", icon: Stethoscope, href: (id: string) => `/pacientes/${id}` },
  { key: "evolucion", label: "Evolución", icon: Activity, href: (id: string) => `/pacientes/${id}/evolucion` },
  { key: "consultas", label: "Consultas", icon: ListChecks, href: (id: string) => `/pacientes/${id}/historial` },
  { key: "documentos", label: "Documentos", icon: FileArchive, href: (id: string) => `/pacientes/${id}/historial` },
  { key: "recetas", label: "Recetas", icon: Pill, href: (id: string) => `/pacientes/${id}/historial` },
  { key: "ia", label: "IA Clínica", icon: Brain, href: (id: string) => `/pacientes/${id}/predicciones` },
]

export function PatientContextNav({ id }: { id: string }) {
  const pathname = usePathname()

  return (
    <aside className="rounded-lg border bg-card p-2 lg:sticky lg:top-6">
      <div className="px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paciente</p>
      </div>
      <nav className="grid gap-1">
        {items.map((item) => {
          const href = item.href(id)
          const Icon = item.icon
          const active = item.key === "resumen" ? pathname === href : pathname === href && item.key !== "documentos" && item.key !== "recetas"
          return (
            <Link
              key={item.key}
              href={href}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="mt-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        <FileText className="mb-2 h-4 w-4" />
        Acciones clínicas principales accesibles desde el resumen en uno o dos clics.
      </div>
    </aside>
  )
}
