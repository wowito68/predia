"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MedicalHeader } from "@/components/medical-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FileText, Plus, Save, Trash2, ArrowLeft } from "lucide-react"
import { toast } from "sonner"

export default function PlantillasPage() {
    const router = useRouter()
    const [plantillas, setPlantillas] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [createLoading, setCreateLoading] = useState(false)

    // Filtros
    const [filterType, setFilterType] = useState("Todos")

    const [nuevaPlantilla, setNuevaPlantilla] = useState({
        nombre: "",
        tipo: "Consulta",
        especialidad: "General",
        contenido: ""
    })

    useEffect(() => {
        const token = localStorage.getItem("token")
        if (!token) {
            router.push("/login")
            return
        }
        fetchPlantillas()
    }, [])

    const fetchPlantillas = async () => {
        const token = localStorage.getItem("token")
        if (!token) return

        try {
            const res = await fetch("/api/plantillas", {
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.success) {
                setPlantillas(data.data)
            }
        } catch (error) {
            console.error(error)
            toast.error("Error al cargar plantillas")
        } finally {
            setLoading(false)
        }
    }

    const handleCreatePlantilla = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreateLoading(true)
        const token = localStorage.getItem("token")

        try {
            const res = await fetch("/api/plantillas", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(nuevaPlantilla)
            })

            if (!res.ok) throw new Error("Error al crear plantilla")

            toast.success("Plantilla creada exitosamente")
            setIsCreateOpen(false)
            setNuevaPlantilla({
                nombre: "",
                tipo: "Consulta",
                especialidad: "General",
                contenido: ""
            })
            fetchPlantillas()
        } catch (error) {
            toast.error("Error al crear plantilla")
        } finally {
            setCreateLoading(false)
        }
    }

    const filteredPlantillas = filterType === "Todos"
        ? plantillas
        : plantillas.filter(p => p.tipo === filterType)

    return (
        <div className="min-h-screen bg-background">
            <MedicalHeader />
            <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                <div className="mb-6 flex justify-between items-center">
                    <div>
                        <Button variant="ghost" onClick={() => router.back()} className="mb-2 pl-0 hover:pl-2 transition-all">
                            <ArrowLeft className="w-4 h-4 mr-2" /> Volver
                        </Button>
                        <h1 className="text-3xl font-bold text-foreground">Gestión de Plantillas</h1>
                        <p className="text-muted-foreground">Cree y administre plantillas para agilizar sus consultas y recetas.</p>
                    </div>
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="w-4 h-4 mr-2" /> Nueva Plantilla
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Crear Nueva Plantilla</DialogTitle>
                                <DialogDescription>
                                    Defina el contenido base para reutilizar en futuros registros.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreatePlantilla} className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="nombre">Nombre de Plantilla *</Label>
                                        <Input
                                            id="nombre"
                                            value={nuevaPlantilla.nombre}
                                            onChange={(e) => setNuevaPlantilla({ ...nuevaPlantilla, nombre: e.target.value })}
                                            placeholder="Ej. Consulta Pediátrica Inicial"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="especialidad">Especialidad</Label>
                                        <Input
                                            id="especialidad"
                                            value={nuevaPlantilla.especialidad}
                                            onChange={(e) => setNuevaPlantilla({ ...nuevaPlantilla, especialidad: e.target.value })}
                                            placeholder="Ej. Pediatría, Cardiología..."
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="tipo">Tipo de Plantilla</Label>
                                    <Select
                                        value={nuevaPlantilla.tipo}
                                        onValueChange={(val) => setNuevaPlantilla({ ...nuevaPlantilla, tipo: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Consulta">Consulta Médica</SelectItem>
                                            <SelectItem value="Receta">Receta Médica</SelectItem>
                                            <SelectItem value="Nota">Nota de Evolución</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contenido">Contenido de la Plantilla *</Label>
                                    <Textarea
                                        id="contenido"
                                        value={nuevaPlantilla.contenido}
                                        onChange={(e) => setNuevaPlantilla({ ...nuevaPlantilla, contenido: e.target.value })}
                                        placeholder="Escriba aquí el texto o estructura predefinida..."
                                        className="min-h-[200px] font-mono text-sm"
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Este contenido se copiará en los campos correspondientes al usar la plantilla.
                                    </p>
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                                    <Button type="submit" disabled={createLoading}>
                                        {createLoading ? "Guardando..." : "Guardar Plantilla"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Filtros */}
                <div className="mb-6 flex gap-2">
                    {["Todos", "Consulta", "Receta", "Nota"].map((type) => (
                        <Button
                            key={type}
                            variant={filterType === type ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilterType(type)}
                        >
                            {type}
                        </Button>
                    ))}
                </div>

                {/* Lista de Plantillas */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPlantillas.map((plantilla) => (
                        <Card key={plantilla.id_plantilla} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex items-start justify-between">
                                    <span className="truncate" title={plantilla.nombre}>{plantilla.nombre}</span>
                                    <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                                </CardTitle>
                                <CardDescription>
                                    {plantilla.tipo} • {plantilla.especialidad || "General"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-muted-foreground line-clamp-3 font-mono bg-muted p-2 rounded">
                                    {plantilla.contenido}
                                </p>
                                <div className="mt-4 flex justify-end">
                                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                                        <Save className="w-3 h-3 mr-1" /> Usar
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {filteredPlantillas.length === 0 && !loading && (
                        <div className="col-span-full text-center py-12 text-muted-foreground">
                            No se encontraron plantillas. ¡Cree su primera plantilla personalizada!
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
