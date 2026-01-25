"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { MedicalHeader } from "@/components/medical-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
    User, Calendar, Syringe, Stethoscope, FileImage, Bone,
    AlertTriangle, Users, Activity, ArrowLeft, Plus, Brain
} from "lucide-react"

interface Paciente {
    id_paciente: number
    cedula: string
    nombre: string
    apellido_paterno: string
    apellido_materno?: string
    genero: string
    fecha_nacimiento: string
    edad?: number
    telefono?: string
    email?: string
}

interface HistorialData {
    vacunas: any[]
    patologias: any[]
    consultas: any[]
    imagenes: any[]
    fracturas: any[]
    alergias: any[]
    antecedentes: any[]
    predicciones: any[]
}

export default function HistorialPacientePage() {
    const router = useRouter()
    const params = useParams()
    const id_paciente = params.id as string

    const [paciente, setPaciente] = useState<Paciente | null>(null)
    const [historial, setHistorial] = useState<HistorialData | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState("resumen")

    useEffect(() => {
        const token = localStorage.getItem("token")
        if (!token) {
            router.push("/login")
            return
        }
        fetchData(token)
    }, [id_paciente])

    const fetchData = async (token: string) => {
        try {
            // Obtener datos del paciente
            const pacienteRes = await fetch(`/api/pacientes/${id_paciente}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (pacienteRes.ok) {
                const data = await pacienteRes.json()
                setPaciente(data.data)
            }

            // Obtener historial completo
            const [vacunas, patologias, consultas, imagenes, fracturas, alergias, antecedentes, predicciones] =
                await Promise.all([
                    fetch(`/api/vacunas?id_paciente=${id_paciente}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
                    fetch(`/api/patologias?id_paciente=${id_paciente}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
                    fetch(`/api/consultas?id_paciente=${id_paciente}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
                    fetch(`/api/imagenes?id_paciente=${id_paciente}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
                    fetch(`/api/fracturas?id_paciente=${id_paciente}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
                    fetch(`/api/alergias?id_paciente=${id_paciente}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
                    fetch(`/api/antecedentes?id_paciente=${id_paciente}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
                    fetch(`/api/predicciones?id_paciente=${id_paciente}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
                ])

            setHistorial({
                vacunas: vacunas.data || [],
                patologias: patologias.data || [],
                consultas: consultas.data || [],
                imagenes: imagenes.data || [],
                fracturas: fracturas.data || [],
                alergias: alergias.data || [],
                antecedentes: antecedentes.data || [],
                predicciones: predicciones.data || []
            })
        } catch (error) {
            console.error("Error al cargar datos:", error)
        } finally {
            setLoading(false)
        }
    }

    const calcularEdad = (fechaNacimiento: string) => {
        const hoy = new Date()
        const nacimiento = new Date(fechaNacimiento)
        let edad = hoy.getFullYear() - nacimiento.getFullYear()
        const mes = hoy.getMonth() - nacimiento.getMonth()
        if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--
        return edad
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <MedicalHeader />
                <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <Skeleton className="h-8 w-64 mb-4" />
                    <Skeleton className="h-48 w-full" />
                </main>
            </div>
        )
    }

    if (!paciente) {
        return (
            <div className="min-h-screen bg-background">
                <MedicalHeader />
                <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <p className="text-muted-foreground">Paciente no encontrado</p>
                </main>
            </div>
        )
    }

    const nombreCompleto = `${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno || ""}`.trim()
    const edad = calcularEdad(paciente.fecha_nacimiento)

    return (
        <div className="min-h-screen bg-background">
            <MedicalHeader />

            <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                {/* Header del paciente */}
                <div className="mb-6">
                    <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Volver
                    </Button>

                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">{nombreCompleto}</h1>
                            <p className="text-muted-foreground">
                                Cédula: {paciente.cedula} • {edad} años • {paciente.genero === "M" ? "Masculino" : paciente.genero === "F" ? "Femenino" : "Otro"}
                            </p>
                        </div>

                        {/* Alertas de alergias */}
                        {historial?.alergias && historial.alergias.length > 0 && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                                <AlertTriangle className="w-4 h-4" />
                                {historial.alergias.length} Alergia(s) registrada(s)
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Tabs del historial */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 lg:grid-cols-9 mb-6">
                        <TabsTrigger value="resumen">Resumen</TabsTrigger>
                        <TabsTrigger value="consultas">Consultas</TabsTrigger>
                        <TabsTrigger value="vacunas">Vacunas</TabsTrigger>
                        <TabsTrigger value="patologias">Patologías</TabsTrigger>
                        <TabsTrigger value="alergias">Alergias</TabsTrigger>
                        <TabsTrigger value="imagenes">Imágenes</TabsTrigger>
                        <TabsTrigger value="fracturas">Fracturas</TabsTrigger>
                        <TabsTrigger value="antecedentes">Antecedentes</TabsTrigger>
                        <TabsTrigger value="diabetes">
                            <Brain className="w-4 h-4 mr-1" /> Diabetes
                        </TabsTrigger>
                    </TabsList>

                    {/* Tab Resumen */}
                    <TabsContent value="resumen">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <Stethoscope className="w-4 h-4 text-blue-600" /> Consultas
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-2xl font-bold">{historial?.consultas.length || 0}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <Syringe className="w-4 h-4 text-green-600" /> Vacunas
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-2xl font-bold">{historial?.vacunas.length || 0}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <FileImage className="w-4 h-4 text-purple-600" /> Imágenes
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-2xl font-bold">{historial?.imagenes.length || 0}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-orange-600" /> Patologías
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-2xl font-bold">{historial?.patologias.length || 0}</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Últimas consultas */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Últimas Consultas</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {historial?.consultas.slice(0, 3).map((consulta: any) => (
                                    <div key={consulta.id_consulta} className="border-b last:border-0 py-3">
                                        <p className="font-medium">{consulta.motivo_consulta}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {new Date(consulta.fecha_consulta).toLocaleDateString()} - Dr. {consulta.usuario?.nombre}
                                        </p>
                                    </div>
                                ))}
                                {(!historial?.consultas || historial.consultas.length === 0) && (
                                    <p className="text-muted-foreground">No hay consultas registradas</p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab Consultas */}
                    <TabsContent value="consultas">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Consultas Médicas</CardTitle>
                                <Button size="sm">
                                    <Plus className="w-4 h-4 mr-1" /> Nueva Consulta
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {historial?.consultas.map((consulta: any) => (
                                    <div key={consulta.id_consulta} className="border-b last:border-0 py-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-medium">{consulta.motivo_consulta}</p>
                                                {consulta.diagnostico && <p className="text-sm mt-1"><strong>Diagnóstico:</strong> {consulta.diagnostico}</p>}
                                                {consulta.tratamiento && <p className="text-sm mt-1"><strong>Tratamiento:</strong> {consulta.tratamiento}</p>}
                                            </div>
                                            <span className="text-sm text-muted-foreground">
                                                {new Date(consulta.fecha_consulta).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {(!historial?.consultas || historial.consultas.length === 0) && (
                                    <p className="text-muted-foreground text-center py-8">No hay consultas registradas</p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab Vacunas */}
                    <TabsContent value="vacunas">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Historial de Vacunas</CardTitle>
                                <Button size="sm">
                                    <Plus className="w-4 h-4 mr-1" /> Registrar Vacuna
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {historial?.vacunas.map((vacuna: any) => (
                                    <div key={vacuna.id_aplicacion} className="border-b last:border-0 py-3 flex justify-between items-center">
                                        <div>
                                            <p className="font-medium">{vacuna.vacuna?.nombre}</p>
                                            <p className="text-sm text-muted-foreground">Dosis {vacuna.dosis_numero} {vacuna.lote && `• Lote: ${vacuna.lote}`}</p>
                                        </div>
                                        <span className="text-sm text-muted-foreground">
                                            {new Date(vacuna.fecha_aplicacion).toLocaleDateString()}
                                        </span>
                                    </div>
                                ))}
                                {(!historial?.vacunas || historial.vacunas.length === 0) && (
                                    <p className="text-muted-foreground text-center py-8">No hay vacunas registradas</p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab Patologías */}
                    <TabsContent value="patologias">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Patologías / Diagnósticos</CardTitle>
                                <Button size="sm">
                                    <Plus className="w-4 h-4 mr-1" /> Agregar Patología
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {historial?.patologias.map((p: any) => (
                                    <div key={p.id_diagnostico} className="border-b last:border-0 py-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-medium">{p.patologia?.nombre}</p>
                                                {p.patologia?.codigo_cie10 && <p className="text-xs text-muted-foreground">CIE-10: {p.patologia.codigo_cie10}</p>}
                                            </div>
                                            <div className="text-right">
                                                <Badge variant={p.estado === "Activa" ? "destructive" : "secondary"}>{p.estado}</Badge>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {new Date(p.fecha_diagnostico).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(!historial?.patologias || historial.patologias.length === 0) && (
                                    <p className="text-muted-foreground text-center py-8">No hay patologías registradas</p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab Alergias */}
                    <TabsContent value="alergias">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-red-600" /> Alergias
                                </CardTitle>
                                <Button size="sm">
                                    <Plus className="w-4 h-4 mr-1" /> Agregar Alergia
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {historial?.alergias.map((a: any) => (
                                    <div key={a.id_alergia} className="border-b last:border-0 py-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-medium">{a.alergeno}</p>
                                                <p className="text-sm text-muted-foreground">{a.tipo_alergia}</p>
                                                {a.reaccion && <p className="text-sm mt-1">Reacción: {a.reaccion}</p>}
                                            </div>
                                            <Badge variant={a.severidad === "Grave" ? "destructive" : "secondary"}>
                                                {a.severidad || "Sin especificar"}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                                {(!historial?.alergias || historial.alergias.length === 0) && (
                                    <p className="text-muted-foreground text-center py-8">No hay alergias registradas</p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab Imágenes */}
                    <TabsContent value="imagenes">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Imágenes Diagnósticas</CardTitle>
                                <Button size="sm">
                                    <Plus className="w-4 h-4 mr-1" /> Subir Imagen
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {historial?.imagenes.map((img: any) => (
                                    <div key={img.id_imagen} className="border-b last:border-0 py-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-medium">{img.tipo_imagen} - {img.region_anatomica}</p>
                                                {img.hallazgos && <p className="text-sm mt-1">Hallazgos: {img.hallazgos}</p>}
                                                {img.archivo_nombre && <p className="text-xs text-muted-foreground">Archivo: {img.archivo_nombre}</p>}
                                            </div>
                                            <span className="text-sm text-muted-foreground">
                                                {new Date(img.fecha_estudio).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {(!historial?.imagenes || historial.imagenes.length === 0) && (
                                    <p className="text-muted-foreground text-center py-8">No hay imágenes registradas</p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab Fracturas */}
                    <TabsContent value="fracturas">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <Bone className="w-5 h-5" /> Fracturas
                                </CardTitle>
                                <Button size="sm">
                                    <Plus className="w-4 h-4 mr-1" /> Registrar Fractura
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {historial?.fracturas.map((f: any) => (
                                    <div key={f.id_fractura} className="border-b last:border-0 py-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-medium">{f.hueso_afectado} {f.lado && `(${f.lado})`}</p>
                                                {f.tipo_fractura && <p className="text-sm text-muted-foreground">{f.tipo_fractura}</p>}
                                                {f.causa && <p className="text-sm">Causa: {f.causa}</p>}
                                            </div>
                                            <div className="text-right">
                                                <Badge variant={f.estado === "Consolidada" ? "secondary" : "default"}>{f.estado}</Badge>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {new Date(f.fecha_fractura).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(!historial?.fracturas || historial.fracturas.length === 0) && (
                                    <p className="text-muted-foreground text-center py-8">No hay fracturas registradas</p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab Antecedentes */}
                    <TabsContent value="antecedentes">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="w-5 h-5" /> Antecedentes Familiares
                                </CardTitle>
                                <Button size="sm">
                                    <Plus className="w-4 h-4 mr-1" /> Agregar Antecedente
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {historial?.antecedentes.map((a: any) => (
                                    <div key={a.id_antecedente} className="border-b last:border-0 py-3">
                                        <p className="font-medium">{a.condicion}</p>
                                        <p className="text-sm text-muted-foreground">{a.parentesco}</p>
                                        {a.detalles && <p className="text-sm mt-1">{a.detalles}</p>}
                                    </div>
                                ))}
                                {(!historial?.antecedentes || historial.antecedentes.length === 0) && (
                                    <p className="text-muted-foreground text-center py-8">No hay antecedentes familiares registrados</p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab Predicción Diabetes */}
                    <TabsContent value="diabetes">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Brain className="w-5 h-5 text-purple-600" /> Predicción de Diabetes (IA)
                                </CardTitle>
                                <CardDescription>
                                    Análisis predictivo basado en datos clínicos del paciente
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {historial?.predicciones && historial.predicciones.length > 0 ? (
                                    <div className="space-y-4">
                                        {historial.predicciones.slice(0, 5).map((pred: any) => (
                                            <div key={pred.id_prediccion} className="border rounded-lg p-4">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <Badge variant={pred.resultado === "Positivo" ? "destructive" : "secondary"}>
                                                            {pred.resultado}
                                                        </Badge>
                                                        <p className="text-sm mt-2">Probabilidad: {(pred.probabilidad_diabetes * 100).toFixed(1)}%</p>
                                                        <p className="text-sm">Nivel de riesgo: {pred.nivel_riesgo}</p>
                                                    </div>
                                                    <span className="text-sm text-muted-foreground">
                                                        {new Date(pred.fecha_prediccion).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                        <p className="text-muted-foreground mb-4">No hay predicciones realizadas</p>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Para realizar una predicción se requieren datos de laboratorio (HbA1c, glucosa, colesterol, triglicéridos)
                                            y mediciones antropométricas (IMC).
                                        </p>
                                        <Link href={`/nuevo-paciente?id_paciente=${id_paciente}`}>
                                            <Button>
                                                <Activity className="w-4 h-4 mr-2" /> Realizar Evaluación
                                            </Button>
                                        </Link>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    )
}
