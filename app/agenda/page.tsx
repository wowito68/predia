"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Phone, MessageCircle, User } from "lucide-react"
import { toast } from "sonner"
import { EmptyState } from "@/components/empty-state"

interface Cita {
    id_consulta: number
    proxima_cita: string
    motivo_consulta: string
    paciente: {
        id_paciente: number
        nombre: string
        apellido_paterno: string
        telefono?: string
    }
    usuario: {
        nombre: string
        apellido_paterno: string
    }
}

export default function AgendaPage() {
    const router = useRouter()
    const [citas, setCitas] = useState<Cita[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const token = localStorage.getItem("token")
        if (!token) {
            router.push("/login")
            return
        }
        fetchAgenda()
    }, [])

    const fetchAgenda = async () => {
        const token = localStorage.getItem("token")
        if (!token) return

        try {
            const res = await fetch("/api/agenda", {
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.success) {
                setCitas(data.data)
            }
        } catch (error) {
            console.error(error)
            toast.error("Error al cargar la agenda")
        } finally {
            setLoading(false)
        }
    }

    const handleWhatsApp = (cita: Cita) => {
        if (!cita.paciente.telefono) {
            toast.error("El paciente no tiene teléfono registrado")
            return
        }

        const fecha = new Date(cita.proxima_cita).toLocaleDateString()
        const mensaje = `Hola ${cita.paciente.nombre}, le recordamos su próxima cita médica el día ${fecha}. Por favor confirme su asistencia.`
        const url = `https://wa.me/${cita.paciente.telefono.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(mensaje)}`
        window.open(url, '_blank')
    }

    // Agrupar por fecha
    const groupedCitas = citas.reduce((acc, cita) => {
        const fecha = new Date(cita.proxima_cita).toLocaleDateString()
        if (!acc[fecha]) acc[fecha] = []
        acc[fecha].push(cita)
        return acc
    }, {} as Record<string, Cita[]>)

    return (
        <DashboardLayout>
            <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-foreground">Agenda Médica</h1>
                    <p className="text-muted-foreground">Próximas citas y seguimiento de pacientes.</p>
                </div>

                {loading ? (
                    <div className="text-center py-12">Cargando agenda...</div>
                ) : citas.length === 0 ? (
                    <EmptyState
                      icon={<Calendar className="w-8 h-8" />}
                      title="Agenda Libre"
                      description="No tienes citas médicas programadas próximamente."
                      actionLabel="Ver Pacientes"
                      onAction={() => router.push("/pacientes")}
                    />
                ) : (
                    <div className="flex gap-6 overflow-x-auto pb-6 snap-x -mx-4 px-4 sm:mx-0 sm:px-0">
                        {Object.entries(groupedCitas).map(([fecha, listaCitas]) => (
                            <div key={fecha} className="min-w-[320px] max-w-[350px] shrink-0 snap-start bg-muted/40 p-4 rounded-xl border border-border">
                                <h2 className="text-lg font-semibold mb-4 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        <span>{fecha}</span>
                                    </div>
                                    <Badge variant="secondary">{listaCitas.length}</Badge>
                                </h2>
                                <div className="space-y-4">
                                    {listaCitas.map((cita) => (
                                        <Card key={cita.id_consulta} className="hover:shadow-md transition-shadow bg-background">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-base flex justify-between">
                                                    <span className="truncate pr-2">{cita.paciente.nombre} {cita.paciente.apellido_paterno}</span>
                                                    <User className="w-4 h-4 shrink-0 text-muted-foreground" />
                                                </CardTitle>
                                                <CardDescription className="text-xs">
                                                    Dr. {cita.usuario.nombre} {cita.usuario.apellido_paterno}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-2 text-sm">
                                                    <p className="flex justify-between items-center text-muted-foreground text-xs bg-muted/50 p-2 rounded-md">
                                                        <span>Motivo:</span>
                                                        <span className="font-medium text-foreground truncate max-w-[150px]">{cita.motivo_consulta}</span>
                                                    </p>
                                                    {cita.paciente.telefono && (
                                                        <p className="flex items-center gap-2 mt-2">
                                                            <Phone className="w-3 h-3 text-muted-foreground" />
                                                            {cita.paciente.telefono}
                                                        </p>
                                                    )}
                                                    <div className="grid grid-cols-2 gap-2 mt-4">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-xs h-8"
                                                            onClick={() => router.push(`/pacientes/${cita.paciente.id_paciente}/historial`)}
                                                        >
                                                            Historial
                                                        </Button>
                                                        <Button
                                                            className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-xs h-8"
                                                            size="sm"
                                                            onClick={() => handleWhatsApp(cita)}
                                                        >
                                                            <MessageCircle className="w-3 h-3 mr-1" />
                                                            Citar
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </DashboardLayout>
    )
}
