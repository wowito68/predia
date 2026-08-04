"use client"

import { useState, useEffect, useRef } from "react"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Activity, Stethoscope, Pill, FileText, User, CheckCircle2, Printer, Download, X } from "lucide-react"
import { useConsultaStore } from "@/store/useConsultaStore"
import { CreatableSelectAPI } from "@/components/ui/creatable-select"

// Helper function to smooth scroll to section
const scrollToElement = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
    }
}

interface Plantilla {
    id_plantilla: number;
    nombre: string;
    tipo: string;
    contenido: string;
}

interface SubmittedResult {
    motivo: string;
    diagnostico: string;
    tratamiento: string;
    medicamentos: string;
    fecha: string;
}

export function NewConsultationModal() {
    const { isOpen, pacienteId, citaId, closeConsulta, draftData, updateDraft, clearDraft } = useConsultaStore()
    const [loading, setLoading] = useState(false)
    const [plantillas, setPlantillas] = useState<Plantilla[]>([])
    const [activeSection, setActiveSection] = useState('section-clinica')
    const [submittedResult, setSubmittedResult] = useState<SubmittedResult | null>(null)
    const printRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (isOpen) {
            cargarPlantillas()
        }
    }, [isOpen])

    const cargarPlantillas = async () => {
        const token = localStorage.getItem("token")
        if (!token) return
        try {
            const res = await fetch("/api/plantillas", {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setPlantillas(data.data || [])
            }
        } catch (error) {
            console.error("Error cargando plantillas")
        }
    }

    const handleApplyPlantilla = (id_plantilla: string) => {
        const plantilla = plantillas.find(p => p.id_plantilla.toString() === id_plantilla)
        if (plantilla && plantilla.tipo === "Consulta") {
            updateDraft({
                motivo_consulta: plantilla.contenido,
                sintomas: plantilla.contenido
            })
        }
    }

    // Interceptor for Scrollspy (simple implementation tracking hover or clicks can be enough, 
    // but robust implementation uses IntersectionObserver. For MVP, we just set active click).
    const handleNavClick = (sectionId: string) => {
        setActiveSection(sectionId)
        scrollToElement(sectionId)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!pacienteId) return

        setLoading(true)
        const token = localStorage.getItem("token")
        
        try {
            const res = await fetch("/api/v2/clinica/expediente", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    id_paciente: Number(pacienteId),
                    citaId: citaId || null,
                    consulta: {
                        motivo_consulta: draftData.motivo_consulta,
                        sintomas: draftData.sintomas,
                        diagnostico: draftData.diagnostico,
                        tratamiento: draftData.tratamiento,
                        observaciones: draftData.observaciones
                    },
                    signos: (draftData.presion_arterial || draftData.frecuencia_cardiaca || draftData.temperatura) ? {
                        presion_arterial: draftData.presion_arterial,
                        frecuencia_cardiaca: draftData.frecuencia_cardiaca ? Number(draftData.frecuencia_cardiaca) : null,
                        frecuencia_respiratoria: draftData.frecuencia_respiratoria ? Number(draftData.frecuencia_respiratoria) : null,
                        temperatura: draftData.temperatura ? Number(draftData.temperatura) : null
                    } : null,
                    receta: (draftData.receta_medicamentos || draftData.receta_indicaciones) ? {
                        medicamentos: draftData.receta_medicamentos,
                        indicaciones: draftData.receta_indicaciones
                    } : null
                })
            })

            if (!res.ok) {
                const errData = await res.json()
                throw new Error(errData.message || "Error al registrar expediente completo")
            }

            // Store the result for the success screen
            setSubmittedResult({
                motivo: draftData.motivo_consulta || "Sin motivo",
                diagnostico: draftData.diagnostico || "Sin diagnóstico",
                tratamiento: draftData.tratamiento || "Sin tratamiento",
                medicamentos: draftData.receta_medicamentos || "Sin receta",
                fecha: new Date().toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })
            })

            toast.success("Expediente clínico firmado exitosamente")
            clearDraft()
            
            // Update central state to trigger refetching across the app
            useConsultaStore.getState().triggerInvalidation()
        } catch (error: any) {
            toast.error(error.message || "Error al registrar la consulta")
        } finally {
            setLoading(false)
        }
    }

    const handlePrint = () => {
        if (!printRef.current) return
        const printContent = printRef.current.innerHTML
        const w = window.open('', '_blank', 'width=800,height=600')
        if (!w) return
        w.document.write(`
            <html><head><title>Expediente Clínico - Predia</title>
            <style>
                body { font-family: system-ui, sans-serif; padding: 40px; color: #1a1a1a; }
                h1 { font-size: 22px; border-bottom: 2px solid #2563eb; padding-bottom: 8px; color: #1e3a5f; }
                h2 { font-size: 16px; color: #374151; margin-top: 20px; }
                .field { margin: 8px 0; }
                .label { font-weight: 600; color: #4b5563; }
                .value { margin-left: 8px; }
                .footer { margin-top: 60px; border-top: 1px solid #d1d5db; padding-top: 16px; font-size: 12px; color: #6b7280; text-align: center; }
                .sig-line { margin-top: 60px; border-top: 1px solid #000; width: 250px; text-align: center; padding-top: 4px; font-size: 14px; }
                @media print { body { padding: 20px; } }
            </style></head><body>
            ${printContent}
            <div class="sig-line">Firma del Médico</div>
            <div class="footer">Predia – Plataforma Clínica Integral · Generado el ${new Date().toLocaleString('es-MX')}</div>
            </body></html>
        `)
        w.document.close()
        w.focus()
        w.print()
    }

    const handleCloseSuccess = () => {
        setSubmittedResult(null)
        closeConsulta()
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleCloseSuccess() }}>
            <DialogContent className="max-w-6xl h-[95vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-zinc-950 border border-border shadow-2xl sm:rounded-xl">
                {submittedResult ? (
                    /* ============ SUCCESS SCREEN ============ */
                    <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
                        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
                            <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground mb-2">Expediente Firmado Exitosamente</h2>
                        <p className="text-muted-foreground mb-8">La consulta ha sido registrada y {citaId ? 'la cita ha sido marcada como completada.' : 'guardada en el historial.'}</p>
                        
                        {/* Printable content (hidden, used by print function) */}
                        <div ref={printRef} className="hidden">
                            <h1>Expediente Clínico</h1>
                            <p><strong>Fecha:</strong> {submittedResult.fecha}</p>
                            <h2>Motivo de Consulta</h2>
                            <p>{submittedResult.motivo}</p>
                            <h2>Diagnóstico</h2>
                            <p>{submittedResult.diagnostico}</p>
                            <h2>Tratamiento</h2>
                            <p>{submittedResult.tratamiento}</p>
                            <h2>Prescripción</h2>
                            <p>{submittedResult.medicamentos}</p>
                        </div>

                        {/* Summary card */}
                        <div className="w-full max-w-md bg-muted/50 dark:bg-zinc-900 rounded-xl p-6 text-left space-y-3 mb-8 border border-border">
                            <div><span className="text-xs font-semibold text-muted-foreground uppercase">Motivo</span><p className="text-sm text-foreground">{submittedResult.motivo}</p></div>
                            <div><span className="text-xs font-semibold text-muted-foreground uppercase">Diagnóstico</span><p className="text-sm text-foreground">{submittedResult.diagnostico}</p></div>
                            <div><span className="text-xs font-semibold text-muted-foreground uppercase">Tratamiento</span><p className="text-sm text-foreground">{submittedResult.tratamiento}</p></div>
                            {submittedResult.medicamentos !== "Sin receta" && (
                                <div><span className="text-xs font-semibold text-muted-foreground uppercase">Receta</span><p className="text-sm text-foreground">{submittedResult.medicamentos}</p></div>
                            )}
                            <p className="text-xs text-muted-foreground pt-2 border-t border-border">{submittedResult.fecha}</p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={handlePrint} className="gap-2">
                                <Printer className="w-4 h-4" /> Imprimir Expediente
                            </Button>
                            <Button variant="outline" onClick={handlePrint} className="gap-2">
                                <Download className="w-4 h-4" /> Descargar PDF
                            </Button>
                            <Button onClick={handleCloseSuccess} className="gap-2">
                                <X className="w-4 h-4" /> Cerrar
                            </Button>
                        </div>
                    </div>
                ) : (
                    /* ============ FORM SCREEN ============ */
                    <>
                <DialogHeader className="px-6 py-4 border-b bg-card z-10 shrink-0">
                    <div className="flex justify-between items-center">
                        <div>
                            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                <Stethoscope className="w-6 h-6 text-blue-600" />
                                Expediente Clínico de Consulta
                            </DialogTitle>
                            <DialogDescription className="mt-1">
                                Complete la evaluación integral. Su progreso se guarda localmente de forma automática.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex flex-1 overflow-hidden h-full relative">
                    {/* Sticky Lateral Navigation */}
                    <div className="w-56 border-r bg-muted/10 hidden md:flex flex-col py-6 px-4 gap-2 shrink-0 h-full overflow-y-auto">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-2">Navegación</p>
                        
                        <Button 
                            variant={activeSection === 'section-clinica' ? 'secondary' : 'ghost'} 
                            className={`justify-start w-full ${activeSection === 'section-clinica' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : ''}`}
                            onClick={() => handleNavClick('section-clinica')}
                        >
                            <Stethoscope className="w-4 h-4 mr-2" /> Clínica y Diag.
                        </Button>
                        <Button 
                            variant={activeSection === 'section-signos' ? 'secondary' : 'ghost'} 
                            className={`justify-start w-full ${activeSection === 'section-signos' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : ''}`}
                            onClick={() => handleNavClick('section-signos')}
                        >
                            <Activity className="w-4 h-4 mr-2" /> Triage (Últimos Signos)
                        </Button>
                        <Button 
                            variant={activeSection === 'section-receta' ? 'secondary' : 'ghost'} 
                            className={`justify-start w-full ${activeSection === 'section-receta' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : ''}`}
                            onClick={() => handleNavClick('section-receta')}
                        >
                            <Pill className="w-4 h-4 mr-2" /> Receta Médica
                        </Button>
                        <Button 
                            variant={activeSection === 'section-notas' ? 'secondary' : 'ghost'} 
                            className={`justify-start w-full ${activeSection === 'section-notas' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : ''}`}
                            onClick={() => handleNavClick('section-notas')}
                        >
                            <FileText className="w-4 h-4 mr-2" /> Notas Privadas
                        </Button>
                    </div>

                    {/* Main Continuous Scroll Area */}
                    <div className="flex-1 overflow-y-auto px-6 py-6 scroll-smooth bg-muted/5" id="consultation-scroll-area">
                        <form id="consultation-form" onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-12 pb-32">
                            
                            {/* Selector de Plantilla rápido */}
                            {plantillas.length > 0 && (
                                <div className="flex items-center gap-4 bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50">
                                    <Label className="whitespace-nowrap font-medium text-blue-700 dark:text-blue-400">Carga Rápida de Plantillas:</Label>
                                    <Select onValueChange={handleApplyPlantilla}>
                                        <SelectTrigger className="w-full h-9 bg-background">
                                            <SelectValue placeholder="Seleccionar plantilla predefinida..." />
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

                            {/* SECTION: CLÍNICA */}
                            <section id="section-clinica" className="scroll-mt-6 space-y-6">
                                <div className="border-b pb-2 mb-4">
                                    <h3 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                                        <Stethoscope className="w-5 h-5 text-blue-500" /> Evaluación Clínica
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">Registre el motivo, síntomas y diagnóstico de esta visita.</p>
                                </div>

                                <div className="space-y-3 focus-within:text-blue-600 transition-colors">
                                    <Label htmlFor="motivo" className="text-base">Motivo de Consulta <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="motivo"
                                        value={draftData.motivo_consulta}
                                        onChange={(e) => updateDraft({ motivo_consulta: e.target.value })}
                                        placeholder="Ej. Fiebre persistente, Dolor abdominal agudo..."
                                        required
                                        className="h-12 text-lg shadow-sm"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <Label htmlFor="sintomas" className="text-base">Historia de la Enfermedad Constatada</Label>
                                    <Textarea
                                        id="sintomas"
                                        value={draftData.sintomas}
                                        onChange={(e) => updateDraft({ sintomas: e.target.value })}
                                        placeholder="Describa la evolución temporal, síntomas acompañantes..."
                                        className="min-h-[120px] resize-y shadow-sm"
                                    />
                                </div>

                                <div className="grid md:grid-cols-2 gap-6 pt-2">
                                    <div className="space-y-3 relative z-50">
                                        <Label htmlFor="diagnostico" className="text-base text-foreground">Diagnóstico (CIE-10 / Descriptivo)</Label>
                                        <CreatableSelectAPI
                                            endpoint="/api/catalogos/patologias"
                                            value={draftData.diagnostico}
                                            onChange={(val) => updateDraft({ diagnostico: val })}
                                            idKey="nombre"
                                            nameKey="nombre"
                                            placeholder="Buscar o crear impresión diagnóstica..."
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label htmlFor="tratamiento" className="text-base text-foreground">Plan Clínico y Tratamiento de Base</Label>
                                        <Textarea
                                            id="tratamiento"
                                            value={draftData.tratamiento}
                                            onChange={(e) => updateDraft({ tratamiento: e.target.value })}
                                            placeholder="Manejo general del padecimiento, requerimientos nutricionales..."
                                            className="min-h-[140px] shadow-sm border-blue-200 focus-visible:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* SECTION: SIGNOS VITALES */}
                            <section id="section-signos" className="scroll-mt-6 space-y-6 pt-8 border-t">
                                <div className="border-b pb-2 mb-4">
                                    <h3 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                                        <Activity className="w-5 h-5 text-red-500" /> Triage y Signos Vitales
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">Los datos ingresados aquí se anexarán al gráfico histórico del paciente.</p>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-card p-6 rounded-xl border shadow-sm">
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground">P/A Sistólica/Diastólica</Label>
                                        <div className="relative">
                                            <Input 
                                                placeholder="120/80" 
                                                value={draftData.presion_arterial}
                                                onChange={(e) => updateDraft({ presion_arterial: e.target.value })}
                                                className="pr-12 text-center text-lg font-medium"
                                            />
                                            <span className="absolute right-3 top-2.5 text-xs text-muted-foreground mt-0.5">mmHg</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground">Frecuencia Cardiaca</Label>
                                        <div className="relative">
                                            <Input 
                                                type="number" 
                                                placeholder="78"
                                                value={draftData.frecuencia_cardiaca}
                                                onChange={(e) => updateDraft({ frecuencia_cardiaca: e.target.value })}
                                                className="pr-10 text-center text-lg font-medium"
                                            />
                                            <span className="absolute right-3 top-2.5 text-xs text-muted-foreground mt-0.5">lpm</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground">Frec. Respiratoria</Label>
                                        <div className="relative">
                                            <Input 
                                                type="number" 
                                                placeholder="18"
                                                value={draftData.frecuencia_respiratoria}
                                                onChange={(e) => updateDraft({ frecuencia_respiratoria: e.target.value })}
                                                className="pr-10 text-center text-lg font-medium"
                                            />
                                            <span className="absolute right-3 top-2.5 text-xs text-muted-foreground mt-0.5">rpm</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground">Temperatura</Label>
                                        <div className="relative">
                                            <Input 
                                                type="number" step="0.1" 
                                                placeholder="36.5"
                                                value={draftData.temperatura}
                                                onChange={(e) => updateDraft({ temperatura: e.target.value })}
                                                className="pr-8 text-center text-lg font-medium"
                                            />
                                            <span className="absolute right-3 top-2.5 text-xs text-muted-foreground mt-0.5">°C</span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* SECTION: RECETA */}
                            <section id="section-receta" className="scroll-mt-6 space-y-6 pt-8 border-t">
                                <div className="border-b pb-2 mb-4">
                                    <h3 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                                        <Pill className="w-5 h-5 text-green-600" /> Prescripción Médica (Receta)
                                    </h3>
                                </div>
                                
                                <div className="grid md:grid-cols-2 gap-6 bg-green-50/30 dark:bg-green-950/10 p-6 rounded-xl border border-green-100 dark:border-green-900/30">
                                    <div className="space-y-3">
                                        <Label className="text-base text-green-900 dark:text-green-300">Medicamentos a Prescribir</Label>
                                        <Textarea
                                            placeholder="Ej. Paracetamol 500mg, Amoxicilina 875mg..."
                                            value={draftData.receta_medicamentos}
                                            onChange={(e) => updateDraft({ receta_medicamentos: e.target.value })}
                                            className="h-[140px] shadow-sm border-green-200 dark:border-green-800 focus-visible:ring-green-500"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-base text-green-900 dark:text-green-300">Indicaciones / Posología</Label>
                                        <Textarea
                                            placeholder="Tomar 1 tableta cada 8 horas por 5 días..."
                                            value={draftData.receta_indicaciones}
                                            onChange={(e) => updateDraft({ receta_indicaciones: e.target.value })}
                                            className="h-[140px] shadow-sm border-green-200 dark:border-green-800 focus-visible:ring-green-500"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* SECTION: NOTAS */}
                            <section id="section-notas" className="scroll-mt-6 space-y-6 pt-8 border-t">
                                <div className="border-b pb-2 mb-4">
                                    <h3 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                                        <FileText className="w-5 h-5 text-amber-500" /> Notas de Evolución
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">Apuntes confidenciales no visibles en las recetas.</p>
                                </div>

                                <div className="space-y-3">
                                    <Textarea
                                        value={draftData.observaciones}
                                        onChange={(e) => updateDraft({ observaciones: e.target.value })}
                                        placeholder="Evolución clínica, pronóstico, sospechas patológicas u observaciones relevantes..."
                                        className="min-h-[180px] shadow-sm bg-amber-50/30 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900 focus-visible:ring-amber-500"
                                    />
                                </div>
                            </section>

                        </form>
                    </div>
                </div>
                
                <DialogFooter className="px-6 py-4 border-t bg-card shrink-0 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground mr-auto flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Guardando borrador automáticamente...
                    </p>
                    <div className="flex gap-2">
                        <Button type="button" variant="ghost" onClick={closeConsulta}>Posponer</Button>
                        <Button 
                            type="submit" 
                            form="consultation-form" 
                            disabled={loading} 
                            className="px-8 shadow-md bg-blue-600 hover:bg-blue-700 text-white font-medium"
                        >
                            {loading ? "Firmando Expediente..." : "Firmar e Imprimir Expediente"}
                        </Button>
                    </div>
                </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
