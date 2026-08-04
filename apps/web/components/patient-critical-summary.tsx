"use client"

import { AlertTriangle, Droplet, Clock, Activity, FileText } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface CriticalSummaryProps {
    alergias: any[]
    tipoSangre?: string
    ultimaConsulta?: any
    ultimosSignos?: any
    prediccion?: any
}

// Mapea el nivel de riesgo a una etiqueta de estado y estilos coherentes.
function riesgoVisual(nivel?: string) {
    const n = (nivel || "").toLowerCase()
    if (n.includes("muy alto")) return { estado: "Requiere atención", riesgo: "Muy Alto", text: "text-red-600 dark:text-red-400", bg: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400", border: "border-l-red-500" }
    if (n.includes("alto")) return { estado: "Vigilancia", riesgo: "Alto", text: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400", border: "border-l-orange-500" }
    if (n.includes("moderado") || n.includes("medio")) return { estado: "Seguimiento", riesgo: "Moderado", text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400", border: "border-l-amber-500" }
    if (n.includes("bajo")) return { estado: "Estable", riesgo: "Bajo", text: "text-green-600 dark:text-green-400", bg: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400", border: "border-l-green-500" }
    return { estado: "Sin evaluar", riesgo: "—", text: "text-muted-foreground", bg: "bg-muted text-muted-foreground", border: "border-l-slate-400" }
}

export function PatientCriticalSummary({ alergias, tipoSangre, ultimaConsulta, ultimosSignos, prediccion }: CriticalSummaryProps) {
    // Filtrar alergias graves (acepta las distintas etiquetas de severidad usadas en el sistema)
    const graves = new Set(["grave", "moderada", "severa", "alta"])
    const alergiasGraves = alergias.filter(a => graves.has(String(a.severidad || "").toLowerCase()))
    const rv = riesgoVisual(prediccion?.nivel_riesgo)

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* Alertas Críticas */}
            <Card className={`border-l-4 ${alergiasGraves.length > 0 ? 'border-l-red-500' : 'border-l-green-500'} shadow-sm`}>
                <CardContent className="p-4 flex items-start gap-3">
                    <div className={`p-2 rounded-full ${alergiasGraves.length > 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'}`}>
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Alertas</p>
                        {alergiasGraves.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-1">
                                {alergiasGraves.map(a => (
                                    <Badge key={a.id_alergia} variant="destructive" className="text-[10px] px-1 py-0 h-5">
                                        {a.alergeno}
                                    </Badge>
                                ))}
                            </div>
                        ) : (
                            <p className="font-semibold text-sm mt-1">Sin alergias graves conocidas</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Datos Biométricos */}
            <Card className="border-l-4 border-l-blue-500 shadow-sm">
                <CardContent className="p-4 flex items-start gap-3">
                    <div className="p-2 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        <Droplet className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Datos Bio</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="font-bold text-lg">{tipoSangre || "--"}</span>
                            {ultimosSignos && (
                                <span className="text-xs text-muted-foreground border-l pl-2">
                                    IMC: {ultimosSignos.imc?.toFixed(1) || "--"}
                                </span>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Última Actividad */}
            <Card className="border-l-4 border-l-purple-500 shadow-sm">
                <CardContent className="p-4 flex items-start gap-3">
                    <div className="p-2 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Última Visita</p>
                        {ultimaConsulta ? (
                            <>
                                <p className="font-semibold text-sm mt-1 truncate">{ultimaConsulta.motivo_consulta}</p>
                                <p className="text-xs text-muted-foreground">{new Date(ultimaConsulta.fecha_consulta).toLocaleDateString()}</p>
                            </>
                        ) : (
                            <p className="text-sm font-medium mt-1 text-muted-foreground">Primera visita</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Estado General — derivado de la última predicción de IA */}
            <Card className={`border-l-4 ${rv.border} shadow-sm`}>
                <CardContent className="p-4 flex items-start gap-3">
                    <div className={`p-2 rounded-full ${rv.bg}`}>
                        <Activity className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Estado Actual</p>
                        <p className={`font-semibold text-sm mt-1 ${rv.text}`}>{rv.estado}</p>
                        <p className="text-xs text-muted-foreground">Riesgo Predicho: {rv.riesgo}</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
