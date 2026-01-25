"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MedicalHeader } from "@/components/medical-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Phone, MessageCircle, User } from "lucide-react"
import { toast } from "sonner"

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
        <div className="min-h-screen bg-background">
            <MedicalHeader />
            <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-foreground">Agenda Médica</h1>
                    <p className="text-muted-foreground">Próximas citas y seguimiento de pacientes.</p>
                </div>

                {loading ? (
                    <div className="text-center py-12">Cargando agenda...</div>
                ) : citas.length === 0 ? (
                    <div className="text-center py-12 border rounded-lg bg-card text-muted-foreground">
                        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        No hay citas programadas próximamente.
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(groupedCitas).map(([fecha, listaCitas]) => (
                            <div key={fecha}>
                                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-blue-600" />
                                    {fecha}
                                    <Badge variant="outline" className="ml-2">{listaCitas.length} citas</Badge>
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {listaCitas.map((cita) => (
                                        <Card key={cita.id_consulta} className="hover:shadow-md transition-shadow">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-lg flex justify-between">
                                                    <span>{cita.paciente.nombre} {cita.paciente.apellido_paterno}</span>
                                                    <User className="w-4 h-4 text-muted-foreground" />
                                                </CardTitle>
                                                <CardDescription>
                                                    Dr. {cita.usuario.nombre} {cita.usuario.apellido_paterno}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-2 text-sm">
                                                    <p className="flex items-center gap-2 text-muted-foreground">
                                                        <Calendar className="w-3 h-3" />
                                                        Cita de seguimiento
                                                    </p>
                                                    {cita.paciente.telefono && (
                                                        <p className="flex items-center gap-2">
                                                            <Phone className="w-3 h-3" />
                                                            {cita.paciente.telefono}
                                                        </p>
                                                    )}
                                                    <Button
                                                        className="w-full mt-2 bg-green-600 hover:bg-green-700"
                                                        size="sm"
                                                        onClick={() => handleWhatsApp(cita)}
                                                    >
                                                        <MessageCircle className="w-4 h-4 mr-2" />
                                                        Recordatorio WhatsApp
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        className="w-full"
                                                        size="sm"
                                                        onClick={() => router.push(`/pacientes/${cita.paciente.id_paciente}/historial`)}
                                                    >
                                                        Ver Historial
                                                    </Button>
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
        </div>
    )
}
