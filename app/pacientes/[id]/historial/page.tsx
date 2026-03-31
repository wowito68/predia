"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/empty-state"
import {
    User, Calendar, Syringe, Stethoscope, FileImage, Bone,
    AlertTriangle, Users, Activity, ArrowLeft, Plus, Brain,
    Pill, FileText, ScrollText, Download, HeartPulse, QrCode
} from "lucide-react"

import { VitalSignsChart } from "@/components/vital-signs-chart"
import { PatientCriticalSummary } from "@/components/patient-critical-summary"
import { VoiceInput } from "@/components/ui/voice-input"
import { QRCodeCanvas } from "qrcode.react"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"

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
    // Fase 2
    tipo_sangre?: string
    seguro_medico?: string
    poliza_seguro?: string
    contacto_emergencia_nombre?: string
    contacto_emergencia_telefono?: string
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
    recetas: any[]
    documentos: any[]
    mediciones: any[]
}

export default function HistorialPacientePage() {
    const router = useRouter()
    const params = useParams()
    const id_paciente = params.id as string

    const [paciente, setPaciente] = useState<Paciente | null>(null)
    const [historial, setHistorial] = useState<HistorialData | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState("resumen")

    // Plantillas
    const [plantillas, setPlantillas] = useState<any[]>([])

    const handleApplyPlantilla = (id_plantilla: string) => {
        const plantilla = plantillas.find(p => p.id_plantilla.toString() === id_plantilla)
        if (plantilla) {
            setNuevaConsulta(prev => ({
                ...prev,
                motivo_consulta: plantilla.tipo === "Consulta" ? plantilla.contenido : prev.motivo_consulta,
                // Si la plantilla es texto plano, lo ponemos en Motivo o donde sea más lógico.
                // Si fuera JSON estructurado podríamos mapearlo.
                // Asumimos texto simple en motivo para MVP si es consulta.
            }))
            // Hack para insertar en textareas
            if (plantilla.tipo === 'Consulta') {
                setNuevaConsulta(prev => ({ ...prev, sintomas: plantilla.contenido }))
            }
        }
    }

    // Estado para nueva consulta
    const [isConsultaOpen, setIsConsultaOpen] = useState(false)
    const [consultLoading, setConsultLoading] = useState(false)
    const [nuevaConsulta, setNuevaConsulta] = useState({
        motivo_consulta: "",
        sintomas: "",
        diagnostico: "",
        tratamiento: "",
        observaciones: ""
    })

    // Estado vacunas
    const [isVaccineOpen, setIsVaccineOpen] = useState(false)
    const [vaccineLoading, setVaccineLoading] = useState(false)
    const [catalogoVacunas, setCatalogoVacunas] = useState<any[]>([])
    const [nuevaVacuna, setNuevaVacuna] = useState({
        id_vacuna: "",
        dosis_numero: 1,
        lote: "",
        observaciones: "",
        fecha_aplicacion: new Date().toISOString().split('T')[0]
    })

    // Estado patologias
    const [isPathologyOpen, setIsPathologyOpen] = useState(false)
    const [pathologyLoading, setPathologyLoading] = useState(false)
    const [catalogoPatologias, setCatalogoPatologias] = useState<any[]>([])
    const [nuevaPatologia, setNuevaPatologia] = useState({
        id_patologia: "",
        estado: "Activa",
        severidad: "Leve",
        notas: "",
        fecha_diagnostico: new Date().toISOString().split('T')[0]
    })

    // Estado alergias
    const [isAllergyOpen, setIsAllergyOpen] = useState(false)
    const [allergyLoading, setAllergyLoading] = useState(false)
    const [nuevaAlergia, setNuevaAlergia] = useState({
        tipo_alergia: "Medicamento",
        alergeno: "",
        severidad: "Leve",
        reaccion: "",
        fecha_deteccion: new Date().toISOString().split('T')[0]
    })

    // Estado imagenes
    const [isImageOpen, setIsImageOpen] = useState(false)
    const [imageLoading, setImageLoading] = useState(false)
    const [nuevaImagen, setNuevaImagen] = useState({
        tipo_imagen: "Radiografía",
        region_anatomica: "",
        hallazgos: "",
        archivo: null as File | null
    })

    // Estado fracturas
    const [isFractureOpen, setIsFractureOpen] = useState(false)
    const [fractureLoading, setFractureLoading] = useState(false)
    const [nuevaFractura, setNuevaFractura] = useState({
        hueso_afectado: "",
        tipo_fractura: "",
        lado: "Izquierdo",
        causa: "",
        tratamiento: "",
        estado: "En tratamiento",
        fecha_fractura: new Date().toISOString().split('T')[0]
    })

    // Estado antecedentes
    const [isAntecedenteOpen, setIsAntecedenteOpen] = useState(false)
    const [antecedenteLoading, setAntecedenteLoading] = useState(false)
    const [nuevoAntecedente, setNuevoAntecedente] = useState({
        parentesco: "Padre",
        condicion: "",
        detalles: ""
    })

    // Estado recetas
    const [isRecetaOpen, setIsRecetaOpen] = useState(false)
    const [recetaLoading, setRecetaLoading] = useState(false)
    const [nuevaReceta, setNuevaReceta] = useState({
        medicamentos: [{ nombre: "", dosis: "", frecuencia: "", duracion: "" }],
        instrucciones: ""
    })
    const [qrReceta, setQrReceta] = useState<any>(null)

    // Estado documentos

    // Estado documentos
    const [isDocOpen, setIsDocOpen] = useState(false)
    const [docLoading, setDocLoading] = useState(false)
    const [nuevoDoc, setNuevoDoc] = useState({
        tipo_documento: "Resultado Laboratorio",
        descripcion: "",
        archivo: null as File | null
    })

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
            // Inicializar historial vacío para no bloquear la UI
            setHistorial(prev => prev || {
                vacunas: [], patologias: [], consultas: [], imagenes: [], fracturas: [],
                alergias: [], antecedentes: [], predicciones: [], recetas: [], documentos: [], mediciones: []
            })

            // Obtener paciente (Bloqueante mínimo necesario)
            const pacienteRes = await fetch(`/api/pacientes/${id_paciente}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (pacienteRes.ok) {
                const data = await pacienteRes.json()
                setPaciente(data.data)
            }
            setLoading(false) // Desbloquear UI Principal instantáneamente!

            // Cargas en Segundo Plano (Lazy fetch)
            const fetchModule = async (endpoint: string, key: keyof HistorialData) => {
                try {
                    const res = await fetch(`/api/${endpoint}?id_paciente=${id_paciente}`, {
                        headers: { Authorization: `Bearer ${token}` },
                        cache: "no-store"
                    })
                    if (res.ok) {
                        const json = await res.json()
                        setHistorial(prev => prev ? { ...prev, [key]: json.data || [] } : null)
                    }
                } catch (e) {
                    console.error(`Error loading ${key}:`, e)
                }
            }

            fetchModule("vacunas", "vacunas")
            fetchModule("patologias", "patologias")
            fetchModule("consultas", "consultas")
            fetchModule("imagenes", "imagenes")
            fetchModule("fracturas", "fracturas")
            fetchModule("alergias", "alergias")
            fetchModule("antecedentes", "antecedentes")
            fetchModule("predicciones", "predicciones")
            fetchModule("recetas", "recetas")
            fetchModule("documentos", "documentos")
            fetchModule("mediciones", "mediciones")

            fetch(`/api/plantillas?tipo=Consulta`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
                .then(r => r.json())
                .then(r => r.success && setPlantillas(r.data))
                .catch(console.error)

        } catch (error) {
            console.error("Error al cargar paciente:", error)
            setLoading(false)
        }
    }

    const handleCreateConsulta = async (e: React.FormEvent) => {
        e.preventDefault()
        setConsultLoading(true)
        const token = localStorage.getItem("token")

        try {
            const res = await fetch("/api/consultas", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    id_paciente: Number(id_paciente),
                    ...nuevaConsulta
                })
            })

            if (!res.ok) {
                const err = await res.json()
                throw err
            }

            toast.success("Consulta registrada exitosamente")
            setIsConsultaOpen(false)
            setNuevaConsulta({
                motivo_consulta: "",
                sintomas: "",
                diagnostico: "",
                tratamiento: "",
                observaciones: ""
            })
            if (token) fetchData(token)
        } catch (error: any) {
            toast.error(error.error || "Error al registrar consulta")
        } finally {
            setConsultLoading(false)
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

    // Cargar catálogo de vacunas al abrir el modal
    useEffect(() => {
        if (isVaccineOpen && catalogoVacunas.length === 0) {
            const fetchCatalogo = async () => {
                const token = localStorage.getItem("token")
                if (!token) return
                try {
                    const res = await fetch("/api/vacunas/catalogo", {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                    const data = await res.json()
                    if (data.success) setCatalogoVacunas(data.data)
                } catch (e) {
                    console.error(e)
                }
            }
            fetchCatalogo()
        }
    }, [isVaccineOpen])

    const handleCreateVacuna = async (e: React.FormEvent) => {
        e.preventDefault()
        setVaccineLoading(true)
        const token = localStorage.getItem("token")

        try {
            if (!nuevaVacuna.id_vacuna) {
                toast.error("Seleccione una vacuna")
                setVaccineLoading(false)
                return
            }

            const res = await fetch("/api/vacunas", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    id_paciente: Number(id_paciente),
                    ...nuevaVacuna,
                    // Convert date back to full ISO or keep as is? API expects Date compatible string.
                    // Assuming API implementation uses new Date(fecha_aplicacion), YYYY-MM-DD works.
                })
            })

            if (!res.ok) {
                const err = await res.json()
                throw err
            }

            toast.success("Vacuna registrada exitosamente")
            setIsVaccineOpen(false)
            setNuevaVacuna({
                id_vacuna: "",
                dosis_numero: 1,
                lote: "",
                observaciones: "",
                fecha_aplicacion: new Date().toISOString().split('T')[0]
            })
            if (token) fetchData(token)
        } catch (error: any) {
            toast.error(error.error || "Error al registrar vacuna")
        } finally {
            setVaccineLoading(false)
        }
    }

    // Cargar catálogo de patologías
    useEffect(() => {
        if (isPathologyOpen && catalogoPatologias.length === 0) {
            const fetchCatalogo = async () => {
                const token = localStorage.getItem("token")
                if (!token) return
                try {
                    const res = await fetch("/api/patologias/catalogo", {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                    const data = await res.json()
                    if (data.success) setCatalogoPatologias(data.data)
                } catch (e) {
                    console.error(e)
                }
            }
            fetchCatalogo()
        }
    }, [isPathologyOpen])

    const handleCreatePatologia = async (e: React.FormEvent) => {
        e.preventDefault()
        setPathologyLoading(true)
        const token = localStorage.getItem("token")

        try {
            if (!nuevaPatologia.id_patologia) {
                toast.error("Seleccione una patología")
                setPathologyLoading(false)
                return
            }

            const res = await fetch("/api/patologias", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    id_paciente: Number(id_paciente),
                    ...nuevaPatologia
                })
            })

            if (!res.ok) {
                const err = await res.json()
                throw err
            }

            toast.success("Patología registrada exitosamente")
            setIsPathologyOpen(false)
            setNuevaPatologia({
                id_patologia: "",
                estado: "Activa",
                severidad: "Leve",
                notas: "",
                fecha_diagnostico: new Date().toISOString().split('T')[0]
            })
            if (token) fetchData(token)
        } catch (error: any) {
            toast.error(error.error || "Error al registrar patología")
        } finally {
            setPathologyLoading(false)
        }
    }

    const handleCreateAlergia = async (e: React.FormEvent) => {
        e.preventDefault()
        setAllergyLoading(true)
        const token = localStorage.getItem("token")

        try {
            const res = await fetch("/api/alergias", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    id_paciente: Number(id_paciente),
                    ...nuevaAlergia
                })
            })

            if (!res.ok) {
                const err = await res.json()
                throw err
            }

            toast.success("Alergia registrada exitosamente")
            setIsAllergyOpen(false)
            setNuevaAlergia({
                tipo_alergia: "Medicamento",
                alergeno: "",
                severidad: "Leve",
                reaccion: "",
                fecha_deteccion: new Date().toISOString().split('T')[0]
            })
            if (token) fetchData(token)
        } catch (error: any) {
            toast.error(error.error || "Error al registrar alergia")
        } finally {
            setAllergyLoading(false)
        }
    }

    const handleCreateImagen = async (e: React.FormEvent) => {
        e.preventDefault()
        setImageLoading(true)
        const token = localStorage.getItem("token")

        try {
            if (!nuevaImagen.archivo) {
                toast.error("Seleccione un archivo de imagen")
                setImageLoading(false)
                return
            }

            const formData = new FormData()
            formData.append("id_paciente", id_paciente)
            formData.append("tipo_imagen", nuevaImagen.tipo_imagen)
            formData.append("region_anatomica", nuevaImagen.region_anatomica)
            if (nuevaImagen.hallazgos) formData.append("hallazgos", nuevaImagen.hallazgos)
            formData.append("archivo", nuevaImagen.archivo)

            const res = await fetch("/api/imagenes", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                    // Do NOT set Content-Type for FormData, browser sets it with boundary
                },
                body: formData
            })

            if (!res.ok) {
                const err = await res.json()
                throw err
            }

            toast.success("Imagen subida exitosamente")
            setIsImageOpen(false)
            setNuevaImagen({
                tipo_imagen: "Radiografía",
                region_anatomica: "",
                hallazgos: "",
                archivo: null
            })
            if (token) fetchData(token)
        } catch (error: any) {
            toast.error(error.error || "Error al subir imagen")
        } finally {
            setImageLoading(false)
        }
    }

    const handleCreateFractura = async (e: React.FormEvent) => {
        e.preventDefault()
        setFractureLoading(true)
        const token = localStorage.getItem("token")

        try {
            const res = await fetch("/api/fracturas", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    id_paciente: Number(id_paciente),
                    ...nuevaFractura
                })
            })

            if (!res.ok) {
                const err = await res.json()
                throw err
            }

            toast.success("Fractura registrada exitosamente")
            setIsFractureOpen(false)
            setNuevaFractura({
                hueso_afectado: "",
                tipo_fractura: "",
                lado: "Izquierdo",
                causa: "",
                tratamiento: "",
                estado: "En tratamiento",
                fecha_fractura: new Date().toISOString().split('T')[0]
            })
            if (token) fetchData(token)
        } catch (error: any) {
            toast.error(error.error || "Error al registrar fractura")
        } finally {
            setFractureLoading(false)
        }
    }

    const handleCreateAntecedente = async (e: React.FormEvent) => {
        e.preventDefault()
        setAntecedenteLoading(true)
        const token = localStorage.getItem("token")

        try {
            const res = await fetch("/api/antecedentes", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    id_paciente: Number(id_paciente),
                    ...nuevoAntecedente
                })
            })

            if (!res.ok) {
                const err = await res.json()
                throw err
            }

            toast.success("Antecedente registrado exitosamente")
            setIsAntecedenteOpen(false)
            setNuevoAntecedente({
                parentesco: "Padre",
                condicion: "",
                detalles: ""
            })
            if (token) fetchData(token)
        } catch (error: any) {
            toast.error(error.error || "Error al registrar antecedente")
        } finally {
            setAntecedenteLoading(false)
        }
    }

    const handleCreateReceta = async (e: React.FormEvent) => {
        e.preventDefault()
        setRecetaLoading(true)
        const token = localStorage.getItem("token")

        try {
            const res = await fetch("/api/recetas", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    id_paciente: Number(id_paciente),
                    ...nuevaReceta
                })
            })

            if (!res.ok) throw new Error("Error al crear receta")

            toast.success("Receta creada exitosamente")
            setIsRecetaOpen(false)
            setNuevaReceta({
                medicamentos: [{ nombre: "", dosis: "", frecuencia: "", duracion: "" }],
                instrucciones: ""
            })
            if (token) fetchData(token)
        } catch (error: any) {
            toast.error("Error al registrar receta")
        } finally {
            setRecetaLoading(false)
        }
    }

    const handleCreateDocumento = async (e: React.FormEvent) => {
        e.preventDefault()
        setDocLoading(true)
        const token = localStorage.getItem("token")

        try {
            if (!nuevoDoc.archivo) {
                toast.error("Seleccione un archivo")
                setDocLoading(false)
                return
            }

            const formData = new FormData()
            formData.append("id_paciente", id_paciente)
            formData.append("tipo_documento", nuevoDoc.tipo_documento)
            if (nuevoDoc.descripcion) formData.append("descripcion", nuevoDoc.descripcion)
            formData.append("archivo", nuevoDoc.archivo)

            const res = await fetch("/api/documentos", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            })

            if (!res.ok) throw new Error("Error al subir documento")

            toast.success("Documento subido exitosamente")
            setIsDocOpen(false)
            setNuevoDoc({
                tipo_documento: "Resultado Laboratorio",
                descripcion: "",
                archivo: null
            })
            if (token) fetchData(token)
        } catch (error: any) {
            toast.error("Error al subir documento")
        } finally {
            setDocLoading(false)
        }
    }

    if (loading) {
        return (
            <DashboardLayout>
                <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <Skeleton className="h-8 w-64 mb-4" />
                    <Skeleton className="h-48 w-full" />
                </main>
    </DashboardLayout>
        )
    }

    if (!paciente) {
        return (
            <DashboardLayout>
                <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <p className="text-muted-foreground">Paciente no encontrado</p>
                </main>
    </DashboardLayout>
        )
    }

    const nombreCompleto = `${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno || ""}`.trim()
    const edad = calcularEdad(paciente.fecha_nacimiento)

    return (
        <DashboardLayout>

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
                                {paciente.tipo_sangre && ` • ${paciente.tipo_sangre}`}
                            </p>
                            {paciente.seguro_medico && (
                                <p className="text-sm text-muted-foreground mt-1">
                                    Seguro: {paciente.seguro_medico} {paciente.poliza_seguro && `(#${paciente.poliza_seguro})`}
                                </p>
                            )}
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

                {/* Vista "Un Solo Vistazo" - Resumen Crítico */}
                <PatientCriticalSummary
                    alergias={historial?.alergias || []}
                    tipoSangre={paciente.tipo_sangre}
                    ultimaConsulta={historial?.consultas?.[0]}
                    ultimosSignos={historial?.mediciones?.[0]}
                />

                {/* Tabs del historial */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="flex flex-wrap h-auto gap-1 p-1 mb-6">
                        <TabsTrigger value="resumen" className="flex items-center gap-1">
                            Resumen
                        </TabsTrigger>
                        <TabsTrigger value="consultas" className="flex items-center gap-1">
                            <Stethoscope className="w-3.5 h-3.5" />
                            Consultas
                            {historial && historial.consultas.length > 0 && (
                                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                                    {historial.consultas.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="vacunas" className="flex items-center gap-1">
                            <Syringe className="w-3.5 h-3.5" />
                            Vacunas
                            {historial && historial.vacunas.length > 0 && (
                                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                                    {historial.vacunas.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="patologias" className="flex items-center gap-1">
                            <Activity className="w-3.5 h-3.5" />
                            Patologías
                            {historial && historial.patologias.length > 0 && (
                                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                                    {historial.patologias.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="alergias" className="flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Alergias
                            {historial && historial.alergias.length > 0 && (
                                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                                    {historial.alergias.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="imagenes" className="flex items-center gap-1">
                            <FileImage className="w-3.5 h-3.5" />
                            Imágenes
                            {historial && historial.imagenes.length > 0 && (
                                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                                    {historial.imagenes.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="fracturas" className="flex items-center gap-1">
                            <Bone className="w-3.5 h-3.5" />
                            Fracturas
                            {historial && historial.fracturas.length > 0 && (
                                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                                    {historial.fracturas.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="antecedentes" className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            Antecedentes
                            {historial && historial.antecedentes.length > 0 && (
                                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                                    {historial.antecedentes.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="diabetes" className="flex items-center gap-1">
                            <Brain className="w-3.5 h-3.5 text-purple-600" />
                            Diabetes
                            {historial && historial.predicciones.length > 0 && (
                                <Badge variant="outline" className="ml-1 h-5 px-1.5 text-xs border-purple-400 text-purple-600">
                                    {historial.predicciones.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="recetas" className="flex items-center gap-1">
                            <ScrollText className="w-3.5 h-3.5" />
                            Recetas
                            {historial && historial.recetas.length > 0 && (
                                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                                    {historial.recetas.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="documentos" className="flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" />
                            Documentos
                            {historial && historial.documentos.length > 0 && (
                                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                                    {historial.documentos.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="signos" className="flex items-center gap-1">
                            <HeartPulse className="w-3.5 h-3.5 text-red-600" />
                            Signos Vitales
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

                    {/* Tab Signos Vitales */}
                    <TabsContent value="signos">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[300px]">
                                <VitalSignsChart
                                    data={historial?.mediciones || []}
                                    title="Presión Arterial"
                                    description="Histórico de presión sistólica y diastólica"
                                    xAxisKey="fecha_medicion"
                                    dataKeys={[
                                        { key: "presion_sistolica", name: "Sistólica", color: "#ef4444" },
                                        { key: "presion_diastolica", name: "Diastólica", color: "#3b82f6" }
                                    ]}
                                />
                                <VitalSignsChart
                                    data={historial?.mediciones || []}
                                    title="Control de Peso"
                                    description="Evolución del peso corporal (kg)"
                                    xAxisKey="fecha_medicion"
                                    dataKeys={[
                                        { key: "peso", name: "Peso (kg)", color: "#10b981" }
                                    ]}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[300px]">
                                <VitalSignsChart
                                    data={historial?.mediciones || []}
                                    title="Índice de Masa Corporal"
                                    description="Evolución del IMC"
                                    xAxisKey="fecha_medicion"
                                    dataKeys={[
                                        { key: "imc", name: "IMC", color: "#8b5cf6" }
                                    ]}
                                />
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Historial de Mediciones</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {historial?.mediciones.slice(0, 5).map((m: any) => (
                                                <div key={m.id_medicion} className="flex justify-between border-b pb-2">
                                                    <div>
                                                        <p className="font-medium">{new Date(m.fecha_medicion).toLocaleDateString()}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            P/A: {m.presion_sistolica}/{m.presion_diastolica} mmHg
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-medium">{m.peso} kg</p>
                                                        <p className="text-sm text-muted-foreground">IMC: {m.imc?.toFixed(1)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            <Link href={`/pacientes/${id_paciente}/predicciones`}>
                                                <Button size="sm" variant="outline" className="w-full mt-2">
                                                    <Plus className="w-4 h-4 mr-2" /> Nueva Medición
                                                </Button>
                                            </Link>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Tab Consultas */}
                    <TabsContent value="consultas">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Consultas Médicas</CardTitle>
                                <Dialog open={isConsultaOpen} onOpenChange={setIsConsultaOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm">
                                            <Plus className="w-4 h-4 mr-1" /> Nueva Consulta
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl">
                                        <DialogHeader>
                                            <DialogTitle>Registrar Nueva Consulta</DialogTitle>
                                            <DialogDescription>
                                                Complete los detalles de la consulta médica.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <form onSubmit={handleCreateConsulta} className="space-y-4 py-4">
                                            {/* Selector de Plantilla */}
                                            {plantillas.length > 0 && (
                                                <div className="space-y-2 bg-muted/50 p-3 rounded-md">
                                                    <Label>Cargar Plantilla</Label>
                                                    <Select onValueChange={handleApplyPlantilla}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Seleccionar plantilla..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {plantillas.filter(p => p.tipo === "Consulta").map((p: any) => (
                                                                <SelectItem key={p.id_plantilla} value={p.id_plantilla.toString()}>
                                                                    {p.nombre}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="motivo">Motivo de Consulta *</Label>
                                                    <Input
                                                        id="motivo"
                                                        value={nuevaConsulta.motivo_consulta}
                                                        onChange={(e) => setNuevaConsulta({ ...nuevaConsulta, motivo_consulta: e.target.value })}
                                                        placeholder="Ej. Dolor abdominal, Control rutina..."
                                                        required
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="sintomas">Síntomas</Label>
                                                    <Textarea
                                                        id="sintomas"
                                                        value={nuevaConsulta.sintomas}
                                                        onChange={(e) => setNuevaConsulta({ ...nuevaConsulta, sintomas: e.target.value })}
                                                        placeholder="Descripción detallada de síntomas..."
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="diagnostico">Diagnóstico</Label>
                                                        <Textarea
                                                            id="diagnostico"
                                                            value={nuevaConsulta.diagnostico}
                                                            onChange={(e) => setNuevaConsulta({ ...nuevaConsulta, diagnostico: e.target.value })}
                                                            placeholder="Diagnóstico preliminar o confirmado..."
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="tratamiento">Tratamiento</Label>
                                                        <Textarea
                                                            id="tratamiento"
                                                            value={nuevaConsulta.tratamiento}
                                                            onChange={(e) => setNuevaConsulta({ ...nuevaConsulta, tratamiento: e.target.value })}
                                                            placeholder="Medicamentos, indicaciones..."
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="obs">Observaciones Adicionales</Label>
                                                    <Textarea
                                                        id="obs"
                                                        value={nuevaConsulta.observaciones}
                                                        onChange={(e) => setNuevaConsulta({ ...nuevaConsulta, observaciones: e.target.value })}
                                                        className="h-20"
                                                    />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button type="button" variant="outline" onClick={() => setIsConsultaOpen(false)}>Cancelar</Button>
                                                <Button type="submit" disabled={consultLoading}>
                                                    {consultLoading ? "Registrando..." : "Guardar Consulta"}
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </CardHeader>
                            <CardContent className="pt-6">
                                {historial?.consultas && historial.consultas.length > 0 ? (
                                    <div className="relative border-l-2 border-muted ml-3 space-y-8 pb-4">
                                        {historial.consultas.map((consulta: any) => (
                                            <div key={consulta.id_consulta} className="relative pl-6">
                                                {/* Punto del Timeline */}
                                                <div className="absolute w-4 h-4 rounded-full bg-blue-500 border-4 border-background -left-[9px] top-1" />
                                                
                                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-1 gap-2">
                                                    <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
                                                        <Stethoscope className="w-4 h-4 text-blue-500" />
                                                        {consulta.motivo_consulta}
                                                    </h3>
                                                    <Badge variant="secondary" className="shrink-0">
                                                        {new Date(consulta.fecha_consulta).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                    </Badge>
                                                </div>
                                                
                                                <div className="bg-muted/30 p-4 rounded-lg mt-3 space-y-3 border border-border/50 transition-colors hover:border-border">
                                                    {consulta.sintomas && (
                                                        <div className="text-sm">
                                                            <strong className="text-foreground block mb-1">Síntomas Reportados:</strong>
                                                            <span className="text-muted-foreground">{consulta.sintomas}</span>
                                                        </div>
                                                    )}
                                                    {consulta.diagnostico && (
                                                        <div className="text-sm">
                                                            <strong className="text-foreground block mb-1">Diagnóstico Clínico:</strong>
                                                            <span className="text-muted-foreground">{consulta.diagnostico}</span>
                                                        </div>
                                                    )}
                                                    {consulta.tratamiento && (
                                                        <div className="text-sm">
                                                            <strong className="text-foreground block mb-1">Tratamiento & Indicaciones:</strong>
                                                            <span className="text-muted-foreground">{consulta.tratamiento}</span>
                                                        </div>
                                                    )}
                                                    {consulta.observaciones && (
                                                        <div className="text-sm border-t border-border/50 pt-2 mt-2">
                                                            <strong className="text-foreground block mb-1">Observaciones:</strong>
                                                            <span className="text-muted-foreground italic">{consulta.observaciones}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-6">
                                        <EmptyState
                                            icon={<Stethoscope className="w-8 h-8" />}
                                            title="Historial de Consultas Vacío"
                                            description="Este paciente no tiene consultas médicas registradas en su expediente. Haz clic en 'Nueva Consulta' para crear el primer registro."
                                        />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab Vacunas */}
                    <TabsContent value="vacunas">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Historial de Vacunas</CardTitle>
                                <Dialog open={isVaccineOpen} onOpenChange={setIsVaccineOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm">
                                            <Plus className="w-4 h-4 mr-1" /> Registrar Vacuna
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Registrar Aplicación de Vacuna</DialogTitle>
                                        </DialogHeader>
                                        <form onSubmit={handleCreateVacuna} className="space-y-4 py-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="vacuna">Vacuna *</Label>
                                                <Select
                                                    value={nuevaVacuna.id_vacuna}
                                                    onValueChange={(val) => setNuevaVacuna({ ...nuevaVacuna, id_vacuna: val })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Seleccione vacuna..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {catalogoVacunas.map((v) => (
                                                            <SelectItem key={v.id_vacuna} value={v.id_vacuna.toString()}>
                                                                {v.nombre} ({v.dosis_requeridas} dosis req.)
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="fecha">Fecha Aplicación *</Label>
                                                    <Input
                                                        id="fecha"
                                                        type="date"
                                                        value={nuevaVacuna.fecha_aplicacion}
                                                        onChange={(e) => setNuevaVacuna({ ...nuevaVacuna, fecha_aplicacion: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="dosis">Dosis N°</Label>
                                                    <Input
                                                        id="dosis"
                                                        type="number"
                                                        min="1"
                                                        value={nuevaVacuna.dosis_numero}
                                                        onChange={(e) => setNuevaVacuna({ ...nuevaVacuna, dosis_numero: parseInt(e.target.value) })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="lote">Lote</Label>
                                                <Input
                                                    id="lote"
                                                    value={nuevaVacuna.lote}
                                                    onChange={(e) => setNuevaVacuna({ ...nuevaVacuna, lote: e.target.value })}
                                                    placeholder="Ej. AB12345"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="obs_vacuna">Observaciones</Label>
                                                <Textarea
                                                    id="obs_vacuna"
                                                    value={nuevaVacuna.observaciones}
                                                    onChange={(e) => setNuevaVacuna({ ...nuevaVacuna, observaciones: e.target.value })}
                                                />
                                            </div>
                                            <DialogFooter>
                                                <Button type="button" variant="outline" onClick={() => setIsVaccineOpen(false)}>Cancelar</Button>
                                                <Button type="submit" disabled={vaccineLoading}>
                                                    {vaccineLoading ? "Registrando..." : "Guardar Registro"}
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
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
                                <Dialog open={isPathologyOpen} onOpenChange={setIsPathologyOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm">
                                            <Plus className="w-4 h-4 mr-1" /> Agregar Patología
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Registrar Patología</DialogTitle>
                                        </DialogHeader>
                                        <form onSubmit={handleCreatePatologia} className="space-y-4 py-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="patologia">Patología (CIE-10) *</Label>
                                                <Select
                                                    value={nuevaPatologia.id_patologia}
                                                    onValueChange={(val) => setNuevaPatologia({ ...nuevaPatologia, id_patologia: val })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Buscar patología..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {catalogoPatologias.map((p) => (
                                                            <SelectItem key={p.id_patologia} value={p.id_patologia.toString()}>
                                                                {p.codigo_cie10 ? `[${p.codigo_cie10}] ` : ""}{p.nombre}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="fecha_diag">Fecha Diagnóstico *</Label>
                                                <Input
                                                    id="fecha_diag"
                                                    type="date"
                                                    value={nuevaPatologia.fecha_diagnostico}
                                                    onChange={(e) => setNuevaPatologia({ ...nuevaPatologia, fecha_diagnostico: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="estado">Estado</Label>
                                                    <Select
                                                        value={nuevaPatologia.estado}
                                                        onValueChange={(val) => setNuevaPatologia({ ...nuevaPatologia, estado: val })}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Activa">Activa</SelectItem>
                                                            <SelectItem value="Inactiva">Inactiva</SelectItem>
                                                            <SelectItem value="Resuelta">Resuelta</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="severidad">Severidad</Label>
                                                    <Select
                                                        value={nuevaPatologia.severidad}
                                                        onValueChange={(val) => setNuevaPatologia({ ...nuevaPatologia, severidad: val })}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Leve">Leve</SelectItem>
                                                            <SelectItem value="Moderada">Moderada</SelectItem>
                                                            <SelectItem value="Grave">Grave</SelectItem>
                                                            <SelectItem value="Crónica">Crónica</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="notas">Notas Clínicas</Label>
                                                <Textarea
                                                    id="notas"
                                                    value={nuevaPatologia.notas}
                                                    onChange={(e) => setNuevaPatologia({ ...nuevaPatologia, notas: e.target.value })}
                                                />
                                            </div>
                                            <DialogFooter>
                                                <Button type="button" variant="outline" onClick={() => setIsPathologyOpen(false)}>Cancelar</Button>
                                                <Button type="submit" disabled={pathologyLoading}>
                                                    {pathologyLoading ? "Registrando..." : "Guardar Registro"}
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
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
                                <Dialog open={isAllergyOpen} onOpenChange={setIsAllergyOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm">
                                            <Plus className="w-4 h-4 mr-1" /> Agregar Alergia
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Registrar Alergia</DialogTitle>
                                        </DialogHeader>
                                        <form onSubmit={handleCreateAlergia} className="space-y-4 py-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="alergeno">Alérgeno *</Label>
                                                <Input
                                                    id="alergeno"
                                                    value={nuevaAlergia.alergeno}
                                                    onChange={(e) => setNuevaAlergia({ ...nuevaAlergia, alergeno: e.target.value })}
                                                    placeholder="Ej. Penicilina, Nueces..."
                                                    required
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="tipo_alergia">Tipo</Label>
                                                    <Select
                                                        value={nuevaAlergia.tipo_alergia}
                                                        onValueChange={(val) => setNuevaAlergia({ ...nuevaAlergia, tipo_alergia: val })}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Medicamento">Medicamento</SelectItem>
                                                            <SelectItem value="Alimento">Alimento</SelectItem>
                                                            <SelectItem value="Ambiental">Ambiental</SelectItem>
                                                            <SelectItem value="Contacto">Contacto</SelectItem>
                                                            <SelectItem value="Otro">Otro</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="sev_alergia">Severidad</Label>
                                                    <Select
                                                        value={nuevaAlergia.severidad}
                                                        onValueChange={(val) => setNuevaAlergia({ ...nuevaAlergia, severidad: val })}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Leve">Leve</SelectItem>
                                                            <SelectItem value="Moderada">Moderada</SelectItem>
                                                            <SelectItem value="Grave">Grave</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="reaccion">Reacción</Label>
                                                <Input
                                                    id="reaccion"
                                                    value={nuevaAlergia.reaccion}
                                                    onChange={(e) => setNuevaAlergia({ ...nuevaAlergia, reaccion: e.target.value })}
                                                    placeholder="Ej. Erupnción cutánea, Anafilaxia..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="fecha_det">Fecha Detección</Label>
                                                <Input
                                                    id="fecha_det"
                                                    type="date"
                                                    value={nuevaAlergia.fecha_deteccion}
                                                    onChange={(e) => setNuevaAlergia({ ...nuevaAlergia, fecha_deteccion: e.target.value })}
                                                />
                                            </div>
                                            <DialogFooter>
                                                <Button type="button" variant="outline" onClick={() => setIsAllergyOpen(false)}>Cancelar</Button>
                                                <Button type="submit" disabled={allergyLoading}>
                                                    {allergyLoading ? "Registrando..." : "Guardar Registro"}
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
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
                                <Dialog open={isImageOpen} onOpenChange={setIsImageOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm">
                                            <Plus className="w-4 h-4 mr-1" /> Subir Imagen
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Subir Imagen Diagnóstica</DialogTitle>
                                        </DialogHeader>
                                        <form onSubmit={handleCreateImagen} className="space-y-4 py-2">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="tipo_img">Tipo Imagen</Label>
                                                    <Select
                                                        value={nuevaImagen.tipo_imagen}
                                                        onValueChange={(val) => setNuevaImagen({ ...nuevaImagen, tipo_imagen: val })}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Radiografía">Radiografía</SelectItem>
                                                            <SelectItem value="Ultrasonido">Ultrasonido</SelectItem>
                                                            <SelectItem value="Tomografía">Tomografía</SelectItem>
                                                            <SelectItem value="Resonancia">Resonancia</SelectItem>
                                                            <SelectItem value="Otro">Otro</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="region">Región Anatómica *</Label>
                                                    <Input
                                                        id="region"
                                                        value={nuevaImagen.region_anatomica}
                                                        onChange={(e) => setNuevaImagen({ ...nuevaImagen, region_anatomica: e.target.value })}
                                                        placeholder="Ej. Tórax, Rodilla..."
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="archivo">Archivo de Imagen *</Label>
                                                <Input
                                                    id="archivo"
                                                    type="file"
                                                    accept="image/*,.pdf"
                                                    onChange={(e) => setNuevaImagen({ ...nuevaImagen, archivo: e.target.files ? e.target.files[0] : null })}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="hallazgos">Hallazgos / Informe</Label>
                                                <Textarea
                                                    id="hallazgos"
                                                    value={nuevaImagen.hallazgos}
                                                    onChange={(e) => setNuevaImagen({ ...nuevaImagen, hallazgos: e.target.value })}
                                                />
                                            </div>
                                            <DialogFooter>
                                                <Button type="button" variant="outline" onClick={() => setIsImageOpen(false)}>Cancelar</Button>
                                                <Button type="submit" disabled={imageLoading}>
                                                    {imageLoading ? "Subiendo..." : "Subir Imagen"}
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
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
                                <Dialog open={isFractureOpen} onOpenChange={setIsFractureOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm">
                                            <Plus className="w-4 h-4 mr-1" /> Registrar Fractura
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Registrar Fractura</DialogTitle>
                                        </DialogHeader>
                                        <form onSubmit={handleCreateFractura} className="space-y-4 py-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="hueso">Hueso Afectado *</Label>
                                                <Input
                                                    id="hueso"
                                                    value={nuevaFractura.hueso_afectado}
                                                    onChange={(e) => setNuevaFractura({ ...nuevaFractura, hueso_afectado: e.target.value })}
                                                    placeholder="Ej. Fémur, Radio..."
                                                    required
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="lado">Lado</Label>
                                                    <Select
                                                        value={nuevaFractura.lado}
                                                        onValueChange={(val) => setNuevaFractura({ ...nuevaFractura, lado: val })}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Izquierdo">Izquierdo</SelectItem>
                                                            <SelectItem value="Derecho">Derecho</SelectItem>
                                                            <SelectItem value="Ambos">Ambos</SelectItem>
                                                            <SelectItem value="No aplica">No aplica</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="fecha_frac">Fecha Fractura *</Label>
                                                    <Input
                                                        id="fecha_frac"
                                                        type="date"
                                                        value={nuevaFractura.fecha_fractura}
                                                        onChange={(e) => setNuevaFractura({ ...nuevaFractura, fecha_fractura: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="tipo_frac">Tipo Fractura</Label>
                                                <Input
                                                    id="tipo_frac"
                                                    value={nuevaFractura.tipo_fractura}
                                                    onChange={(e) => setNuevaFractura({ ...nuevaFractura, tipo_fractura: e.target.value })}
                                                    placeholder="Ej. Conminuta, Tallo verde..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="causa">Causa</Label>
                                                <Input
                                                    id="causa"
                                                    value={nuevaFractura.causa}
                                                    onChange={(e) => setNuevaFractura({ ...nuevaFractura, causa: e.target.value })}
                                                    placeholder="Ej. Caída, Accidente..."
                                                />
                                            </div>
                                            <DialogFooter>
                                                <Button type="button" variant="outline" onClick={() => setIsFractureOpen(false)}>Cancelar</Button>
                                                <Button type="submit" disabled={fractureLoading}>
                                                    {fractureLoading ? "Registrando..." : "Guardar Registro"}
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
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
                                <Dialog open={isAntecedenteOpen} onOpenChange={setIsAntecedenteOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm">
                                            <Plus className="w-4 h-4 mr-1" /> Agregar Antecedente
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Registrar Antecedente Familiar</DialogTitle>
                                        </DialogHeader>
                                        <form onSubmit={handleCreateAntecedente} className="space-y-4 py-2">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="parentesco">Parentesco *</Label>
                                                    <Select
                                                        value={nuevoAntecedente.parentesco}
                                                        onValueChange={(val) => setNuevoAntecedente({ ...nuevoAntecedente, parentesco: val })}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Padre">Padre</SelectItem>
                                                            <SelectItem value="Madre">Madre</SelectItem>
                                                            <SelectItem value="Abuelo Paterno">Abuelo Paterno</SelectItem>
                                                            <SelectItem value="Abuela Paterna">Abuela Paterna</SelectItem>
                                                            <SelectItem value="Abuelo Materno">Abuelo Materno</SelectItem>
                                                            <SelectItem value="Abuela Materna">Abuela Materna</SelectItem>
                                                            <SelectItem value="Hermano/a">Hermano/a</SelectItem>
                                                            <SelectItem value="Tío/a">Tío/a</SelectItem>
                                                            <SelectItem value="Otro">Otro</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="condicion">Condición / Enfermedad *</Label>
                                                    <Input
                                                        id="condicion"
                                                        value={nuevoAntecedente.condicion}
                                                        onChange={(e) => setNuevoAntecedente({ ...nuevoAntecedente, condicion: e.target.value })}
                                                        placeholder="Ej. Diabetes, Hipertensión..."
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="detalles">Detalles Adicionales</Label>
                                                <Textarea
                                                    id="detalles"
                                                    value={nuevoAntecedente.detalles}
                                                    onChange={(e) => setNuevoAntecedente({ ...nuevoAntecedente, detalles: e.target.value })}
                                                    placeholder="Edad diagnóstico, tratamiento, etc..."
                                                />
                                            </div>
                                            <DialogFooter>
                                                <Button type="button" variant="outline" onClick={() => setIsAntecedenteOpen(false)}>Cancelar</Button>
                                                <Button type="submit" disabled={antecedenteLoading}>
                                                    {antecedenteLoading ? "Registrando..." : "Guardar Registro"}
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
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
                                        <Link href={`/pacientes/${id_paciente}/predicciones`}>
                                            <Button>
                                                <Activity className="w-4 h-4 mr-2" /> Realizar Evaluación
                                            </Button>
                                        </Link>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab Recetas */}
                    <TabsContent value="recetas">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <ScrollText className="w-5 h-5" /> Recetas Médicas
                                </CardTitle>
                                <Dialog open={isRecetaOpen} onOpenChange={setIsRecetaOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm">
                                            <Plus className="w-4 h-4 mr-1" /> Nueva Receta
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-3xl">
                                        <DialogHeader>
                                            <DialogTitle>Generar Receta Médica</DialogTitle>
                                        </DialogHeader>
                                        <form onSubmit={handleCreateReceta} className="space-y-4 py-2">
                                            <div className="space-y-4">
                                                <Label>Medicamentos</Label>
                                                {nuevaReceta.medicamentos.map((med, index) => (
                                                    <div key={index} className="grid grid-cols-12 gap-2 items-end border p-2 rounded">
                                                        <div className="col-span-4 space-y-1">
                                                            <Label className="text-xs">Nombre Comercial/Genérico</Label>
                                                            <Input
                                                                value={med.nombre}
                                                                onChange={(e) => {
                                                                    const newMeds = [...nuevaReceta.medicamentos]
                                                                    newMeds[index].nombre = e.target.value
                                                                    setNuevaReceta({ ...nuevaReceta, medicamentos: newMeds })
                                                                }}
                                                                placeholder="Ej. Paracetamol 500mg"
                                                                required
                                                            />
                                                        </div>
                                                        <div className="col-span-3 space-y-1">
                                                            <Label className="text-xs">Dosis</Label>
                                                            <Input
                                                                value={med.dosis}
                                                                onChange={(e) => {
                                                                    const newMeds = [...nuevaReceta.medicamentos]
                                                                    newMeds[index].dosis = e.target.value
                                                                    setNuevaReceta({ ...nuevaReceta, medicamentos: newMeds })
                                                                }}
                                                                placeholder="Ej. 1 tableta"
                                                            />
                                                        </div>
                                                        <div className="col-span-3 space-y-1">
                                                            <Label className="text-xs">Frecuencia</Label>
                                                            <Input
                                                                value={med.frecuencia}
                                                                onChange={(e) => {
                                                                    const newMeds = [...nuevaReceta.medicamentos]
                                                                    newMeds[index].frecuencia = e.target.value
                                                                    setNuevaReceta({ ...nuevaReceta, medicamentos: newMeds })
                                                                }}
                                                                placeholder="Ej. c/8 horas"
                                                            />
                                                        </div>
                                                        <div className="col-span-2 space-y-1">
                                                            <Label className="text-xs">Duración</Label>
                                                            <Input
                                                                value={med.duracion}
                                                                onChange={(e) => {
                                                                    const newMeds = [...nuevaReceta.medicamentos]
                                                                    newMeds[index].duracion = e.target.value
                                                                    setNuevaReceta({ ...nuevaReceta, medicamentos: newMeds })
                                                                }}
                                                                placeholder="Ej. 5 días"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setNuevaReceta({
                                                        ...nuevaReceta,
                                                        medicamentos: [...nuevaReceta.medicamentos, { nombre: "", dosis: "", frecuencia: "", duracion: "" }]
                                                    })}
                                                >
                                                    <Plus className="w-4 h-4 mr-2" /> Agregar Medicamento
                                                </Button>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="instrucciones">Instrucciones Adicionales</Label>
                                                <Textarea
                                                    id="instrucciones"
                                                    value={nuevaReceta.instrucciones}
                                                    onChange={(e) => setNuevaReceta({ ...nuevaReceta, instrucciones: e.target.value })}
                                                    placeholder="Indicaciones generales, dieta, cuidados..."
                                                />
                                            </div>
                                            <DialogFooter>
                                                <Button type="button" variant="outline" onClick={() => setIsRecetaOpen(false)}>Cancelar</Button>
                                                <Button type="submit" disabled={recetaLoading}>
                                                    {recetaLoading ? "Generando..." : "Guardar Receta"}
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {historial?.recetas.map((r: any) => (
                                        <div key={r.id_receta} className="flex flex-col border rounded-xl overflow-hidden bg-card hover:shadow-md transition-shadow duration-200">
                                            <div className="flex items-center justify-between p-4 bg-muted/30 border-b">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                                                        <ScrollText className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-sm">Receta #{r.id_receta}</h4>
                                                        <p className="text-xs text-muted-foreground">
                                                            {new Date(r.fecha_emicion).toLocaleDateString()} • Dr(a). {r.usuario?.nombre} {r.usuario?.apellido_paterno}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Badge variant={r.estado === 'Activa' ? 'default' : 'secondary'} className="capitalize">
                                                    {r.estado}
                                                </Badge>
                                            </div>

                                            <div className="p-4 space-y-4">
                                                <div className="space-y-3">
                                                    {(() => {
                                                        try {
                                                            const meds = JSON.parse(r.medicamentos)
                                                            return meds.map((m: any, i: number) => (
                                                                <div key={i} className="flex items-start gap-2 text-sm">
                                                                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                                                    <div className="grid gap-0.5">
                                                                        <span className="font-medium text-foreground">{m.nombre}</span>
                                                                        <span className="text-muted-foreground">{m.dosis} • {m.frecuencia} for {m.duracion}</span>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        } catch (e) {
                                                            return <p className="text-sm">{r.medicamentos}</p>
                                                        }
                                                    })()}
                                                </div>

                                                {r.instrucciones && (
                                                    <div className="text-sm bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-md text-yellow-800 dark:text-yellow-200 border border-yellow-100 dark:border-yellow-800/30">
                                                        <strong>Indicaciones:</strong> {r.instrucciones}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 p-3 bg-muted/10 border-t mt-auto">
                                                <Button variant="ghost" size="sm" className="flex-1 h-8">
                                                    <Download className="w-3.5 h-3.5 mr-2" /> Descargar PDF
                                                </Button>
                                                <div className="w-px h-4 bg-border" />
                                                <Button variant="ghost" size="sm" className="flex-1 h-8" onClick={() => setQrReceta(r)}>
                                                    <QrCode className="w-3.5 h-3.5 mr-2" /> Ver QR
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    {(!historial?.recetas || historial.recetas.length === 0) && (
                                        <p className="text-muted-foreground text-center py-8">No hay recetas registradas</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Dialog open={!!qrReceta} onOpenChange={(open) => !open && setQrReceta(null)}>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Código de Verificación QR</DialogTitle>
                                    <DialogDescription>
                                        Escanee este código en la farmacia para validar la receta.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg">
                                    {qrReceta && (
                                        <QRCodeCanvas
                                            value={JSON.stringify({
                                                id: qrReceta.id_receta,
                                                paciente: nombreCompleto,
                                                cedula: paciente.cedula,
                                                fecha: qrReceta.fecha_emicion,
                                                med: qrReceta.medicamentos
                                            })}
                                            size={200}
                                            level="M"
                                        />
                                    )}
                                    <p className="mt-4 text-xs text-muted-foreground text-center">
                                        Firma Digital: {qrReceta?.id_receta}-{Date.now()}
                                    </p>
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="secondary" onClick={() => setQrReceta(null)}>
                                        Cerrar
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </TabsContent>

                    {/* Tab Documentos */}
                    <TabsContent value="documentos">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="w-5 h-5" /> Documentos Adjuntos
                                </CardTitle>
                                <Dialog open={isDocOpen} onOpenChange={setIsDocOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm">
                                            <Plus className="w-4 h-4 mr-1" /> Subir Documento
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Subir Documento</DialogTitle>
                                        </DialogHeader>
                                        <form onSubmit={handleCreateDocumento} className="space-y-4 py-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="tipo_doc">Tipo de Documento</Label>
                                                <Select
                                                    value={nuevoDoc.tipo_documento}
                                                    onValueChange={(val) => setNuevoDoc({ ...nuevoDoc, tipo_documento: val })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Resultado Laboratorio">Resultado Laboratorio</SelectItem>
                                                        <SelectItem value="Historia Externa">Historia Externa</SelectItem>
                                                        <SelectItem value="Consentimiento">Consentimiento Informado</SelectItem>
                                                        <SelectItem value="Otro">Otro</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="archivo_doc">Archivo *</Label>
                                                <Input
                                                    id="archivo_doc"
                                                    type="file"
                                                    accept=".pdf,.jpg,.png,.doc,.docx"
                                                    onChange={(e) => setNuevoDoc({ ...nuevoDoc, archivo: e.target.files ? e.target.files[0] : null })}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="desc_doc">Descripción</Label>
                                                <Textarea
                                                    id="desc_doc"
                                                    value={nuevoDoc.descripcion}
                                                    onChange={(e) => setNuevoDoc({ ...nuevoDoc, descripcion: e.target.value })}
                                                    placeholder="Detalles sobre el documento..."
                                                />
                                            </div>
                                            <DialogFooter>
                                                <Button type="button" variant="outline" onClick={() => setIsDocOpen(false)}>Cancelar</Button>
                                                <Button type="submit" disabled={docLoading}>
                                                    {docLoading ? "Subiendo..." : "Subir Documento"}
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {historial?.documentos.map((d: any) => (
                                        <Card key={d.id_documento} className="overflow-hidden">
                                            <div className="p-4 flex items-start gap-3">
                                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                                                    <FileText className="w-6 h-6 text-blue-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate" title={d.nombre_archivo}>{d.nombre_archivo}</p>
                                                    <p className="text-xs text-muted-foreground">{d.tipo_documento}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Subido el {new Date(d.fecha_subida).toLocaleDateString()}
                                                    </p>
                                                    {d.descripcion && (
                                                        <p className="text-sm mt-2 line-clamp-2">{d.descripcion}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="bg-muted/50 p-2 flex justify-end gap-2">
                                                <Button variant="ghost" size="sm" className="h-8">
                                                    <Download className="w-3 h-3 mr-1" /> Descargar
                                                </Button>
                                            </div>
                                        </Card>
                                    ))}
                                    {(!historial?.documentos || historial.documentos.length === 0) && (
                                        <p className="col-span-full text-muted-foreground text-center py-8">No hay documentos adjuntos</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>
    </DashboardLayout>
    )
}
