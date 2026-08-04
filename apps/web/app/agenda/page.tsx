"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Phone, MessageCircle, User, Stethoscope, MoreVertical, FileText } from "lucide-react"
import { toast } from "sonner"
import { EmptyState } from "@/components/empty-state"
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useConsultaStore } from "@/store/useConsultaStore"

interface Cita {
    id_cita: number
    id_consulta: number | null
    proxima_cita: string
    fecha_cita: string
    motivo_consulta: string
    motivo: string
    estado: string
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
    const { openConsulta } = useConsultaStore()
    const [citas, setCitas] = useState<Cita[]>([])
    const [loading, setLoading] = useState(true)

    // Modal state
    const [isNewCitaOpen, setIsNewCitaOpen] = useState(false)
    const [pacientes, setPacientes] = useState<any[]>([])
    const [newCita, setNewCita] = useState({ id_paciente: "", fecha: "", motivo: "" })
    const [savingCita, setSavingCita] = useState(false)
    const [startingCita, setStartingCita] = useState<number | null>(null)

    useEffect(() => {
        const token = localStorage.getItem("token")
        if (!token) {
            router.push("/login")
            return
        }
        fetchAgenda()
        fetchPacientes()
    }, [])

    const fetchPacientes = async () => {
        const token = localStorage.getItem("token")
        if (!token) return
        try {
            const res = await fetch(`/api/pacientes?limit=1000&t=${Date.now()}`, {
                headers: { Authorization: `Bearer ${token}` },
                cache: 'no-store'
            })
            const data = await res.json()
            if (data.success) {
                setPacientes(data.data)
            }
        } catch (error) {
            console.error("Error cargando pacientes:", error)
        }
    }

    const fetchAgenda = async () => {
        const token = localStorage.getItem("token")
        if (!token) return

        try {
            const res = await fetch(`/api/agenda?t=${Date.now()}`, {
                headers: { Authorization: `Bearer ${token}` },
                cache: 'no-store'
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

    const handleCreateCita = async () => {
        if (!newCita.id_paciente || !newCita.fecha || !newCita.motivo) {
            toast.error("Por favor completa todos los campos")
            return
        }

        const selectedDate = new Date(newCita.fecha)
        if (selectedDate < new Date()) {
            toast.error("La cita debe ser programada en una fecha y hora futura")
            return
        }

        setSavingCita(true)
        const token = localStorage.getItem("token")
        try {
            const res = await fetch("/api/agenda", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(newCita)
            })
            const data = await res.json()
            if (data.success) {
                toast.success("Cita agendada exitosamente")
                setIsNewCitaOpen(false)
                setNewCita({ id_paciente: "", fecha: "", motivo: "" })
                fetchAgenda()
            } else {
                toast.error(data.error || "Error al agendar cita")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error al agendar cita")
        } finally {
            setSavingCita(false)
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

    const handleStartCita = async (cita: Cita) => {
        if (cita.estado === "EN_CURSO" && cita.id_consulta) {
            openConsulta(cita.paciente.id_paciente, cita.id_consulta)
            return
        }
        const token = localStorage.getItem("token")
        setStartingCita(cita.id_cita)
        try {
            const res = await fetch(`/api/agenda/${cita.id_cita}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ action: "INICIAR" }),
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.error || "No se pudo iniciar la consulta")
            toast.success("Consulta iniciada")
            openConsulta(cita.paciente.id_paciente, data.data.id_consulta)
            fetchAgenda()
        } catch (error: any) {
            toast.error(error?.message || "No se pudo iniciar la consulta")
        } finally {
            setStartingCita(null)
        }
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
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Agenda Médica</h1>
                        <p className="text-muted-foreground">Próximas citas y seguimiento de pacientes.</p>
                    </div>
                    <Button onClick={() => setIsNewCitaOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                        <Calendar className="w-4 h-4 mr-2" />
                        Agendar Cita
                    </Button>
                </div>

                {loading ? (
                    <div className="flex gap-6 overflow-x-hidden pb-6">
                        {[1, 2, 3].map((i) => (
                           <Skeleton key={i} className="min-w-[320px] h-[300px] shrink-0 rounded-xl" />
                        ))}
                    </div>
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
                                        <Card key={cita.id_cita} className="hover:shadow-md transition-shadow bg-background">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-base flex justify-between">
                                                    <span className="truncate pr-2">{cita.paciente.nombre} {cita.paciente.apellido_paterno}</span>
                                                    <User className="w-4 h-4 shrink-0 text-muted-foreground" />
                                                </CardTitle>
                                                <CardDescription className="text-xs">
                                                    Dr. {cita.usuario.nombre} {cita.usuario.apellido_paterno}
                                                </CardDescription>
                                                <Badge variant={cita.estado === "EN_CURSO" ? "destructive" : "secondary"} className="mt-2 w-fit text-[10px]">
                                                    {cita.estado === "EN_CURSO" ? "En curso" : "Programada"}
                                                </Badge>
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
                                                    <div className="flex gap-2 mt-4 items-center">
                                                        <Button
                                                            className="flex-1 text-xs h-9 font-medium transition-all"
                                                            onClick={() => handleStartCita(cita)}
                                                            disabled={startingCita === cita.id_cita}
                                                        >
                                                            <Stethoscope className="w-3.5 h-3.5 mr-2" />
                                                            {startingCita === cita.id_cita ? "Iniciando..." : cita.estado === "EN_CURSO" ? "Continuar consulta" : "Iniciar consulta"}
                                                        </Button>
                                                        
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground">
                                                                    <MoreVertical className="w-4 h-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-48 p-1">
                                                                <DropdownMenuItem 
                                                                    onClick={() => router.push(`/pacientes/${cita.paciente.id_paciente}`)}
                                                                    className="cursor-pointer font-medium text-xs mb-1"
                                                                >
                                                                    <FileText className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                                                                    Ver Resumen
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem 
                                                                    onClick={() => handleWhatsApp(cita)}
                                                                    className="cursor-pointer text-xs text-green-600 focus:text-green-700 focus:bg-green-50 dark:focus:bg-green-950/30"
                                                                >
                                                                    <MessageCircle className="w-3.5 h-3.5 mr-2" />
                                                                    Enviar Recordatorio
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
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

                <Dialog open={isNewCitaOpen} onOpenChange={setIsNewCitaOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Agendar Nueva Cita</DialogTitle>
                            <DialogDescription>
                                Programa una nueva consulta para un paciente registrado.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Paciente</label>
                                <select 
                                    className="flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1.5 text-sm shadow-sm transition-all duration-200 outline-none focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[2px] disabled:cursor-not-allowed disabled:opacity-50 hover:border-primary/50"
                                    value={newCita.id_paciente}
                                    onChange={(e) => setNewCita({ ...newCita, id_paciente: e.target.value })}
                                >
                                    <option value="" disabled className="bg-background text-foreground">Seleccione un paciente</option>
                                    {pacientes.map((p) => (
                                        <option key={p.id_paciente} value={p.id_paciente} className="bg-background text-foreground">
                                            {p.nombre} {p.apellido_paterno}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Fecha y Hora</label>
                                <Input 
                                    type="datetime-local" 
                                    value={newCita.fecha}
                                    onChange={(e) => setNewCita({ ...newCita, fecha: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Motivo (Breve)</label>
                                <Input 
                                    placeholder="Ej. Chequeo general, resultados..."
                                    value={newCita.motivo}
                                    onChange={(e) => setNewCita({ ...newCita, motivo: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsNewCitaOpen(false)} disabled={savingCita} className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-foreground hover:bg-gray-100 dark:hover:bg-gray-700">
                                Cancelar
                            </Button>
                            <Button onClick={handleCreateCita} disabled={savingCita} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                                {savingCita ? "Agendando..." : "Confirmar Cita"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </main>
        </DashboardLayout>
    )
}
