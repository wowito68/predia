"use client"

import React from 'react'
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"

interface PDFData {
    paciente?: any;
    consulta?: any;
    receta?: any;
    medicion?: any;
    doctor?: any;
    fecha?: string;
}

function generateConsultationHTML(data: PDFData): string {
    const { paciente, consulta, medicion, doctor, fecha } = data

    // Try to parse snapshot data if available
    let pat = paciente || {}
    let doc = doctor || {}
    if (consulta?.datos_paciente) {
        try { pat = typeof consulta.datos_paciente === 'string' ? JSON.parse(consulta.datos_paciente) : consulta.datos_paciente } catch { }
    }
    if (consulta?.datos_medico) {
        try { doc = typeof consulta.datos_medico === 'string' ? JSON.parse(consulta.datos_medico) : consulta.datos_medico } catch { }
    }

    return `
        <h1 style="font-size:22px;border-bottom:2px solid #2563eb;padding-bottom:8px;color:#1e3a5f;margin-bottom:16px;">
            Clínica PREDIA — Expediente Clínico
        </h1>
        <p style="color:#64748b;font-size:11px;margin-bottom:16px;">Folio: C-${consulta?.id_consulta || '0001'} | Fecha: ${fecha || 'N/A'}</p>
        
        <div style="background:#f8fafc;padding:12px 16px;border-radius:6px;margin-bottom:20px;border:1px solid #e2e8f0;">
            <p style="margin:4px 0;font-size:13px;"><strong>Paciente:</strong> ${pat?.nombre || ''} ${pat?.apellido_paterno || ''}</p>
            <p style="margin:4px 0;font-size:13px;"><strong>Edad:</strong> ${pat?.edad || 'N/A'} años | <strong>Género:</strong> ${pat?.genero || 'N/A'}</p>
        </div>

        ${medicion ? `
        <h2 style="font-size:14px;color:#0f172a;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:8px;text-transform:uppercase;">Signos Vitales</h2>
        <div style="background:#f1f5f9;padding:10px;border-radius:6px;margin-bottom:16px;display:flex;gap:20px;">
            <span><strong>PA:</strong> ${medicion.presion_sistolica || '--'}/${medicion.presion_diastolica || '--'} mmHg</span>
            <span><strong>Peso:</strong> ${medicion.peso || '--'} kg</span>
            <span><strong>Talla:</strong> ${medicion.estatura || '--'} cm</span>
            <span><strong>IMC:</strong> ${medicion.imc ? Number(medicion.imc).toFixed(1) : '--'}</span>
        </div>
        ` : ''}

        <h2 style="font-size:14px;color:#0f172a;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:8px;text-transform:uppercase;">Motivo de Consulta</h2>
        <p style="font-size:12px;color:#334155;margin-bottom:16px;">${consulta?.motivo_consulta || 'Sin motivo registrado'}</p>

        <h2 style="font-size:14px;color:#0f172a;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:8px;text-transform:uppercase;">Historia de la Enfermedad</h2>
        <p style="font-size:12px;color:#334155;margin-bottom:16px;">${consulta?.sintomas || 'No descrita'}</p>

        <h2 style="font-size:14px;color:#0f172a;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:8px;text-transform:uppercase;">Diagnóstico</h2>
        <p style="font-size:12px;color:#334155;margin-bottom:16px;">${consulta?.diagnostico || 'Pendiente'}</p>

        <h2 style="font-size:14px;color:#0f172a;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:8px;text-transform:uppercase;">Plan de Tratamiento</h2>
        <p style="font-size:12px;color:#334155;margin-bottom:16px;">${consulta?.tratamiento || 'Ninguno especificado'}</p>

        ${consulta?.observaciones ? `
        <h2 style="font-size:14px;color:#0f172a;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:8px;text-transform:uppercase;">Observaciones</h2>
        <p style="font-size:12px;color:#334155;margin-bottom:16px;">${consulta.observaciones}</p>
        ` : ''}

        <div style="margin-top:60px;text-align:center;">
            <div style="width:250px;border-top:1px solid #000;margin:0 auto;padding-top:6px;">
                <p style="font-size:13px;font-weight:bold;margin:2px 0;">Dr(a). ${doc?.nombre || 'Médico'} ${doc?.apellido_paterno || ''}</p>
                <p style="font-size:11px;color:#64748b;margin:2px 0;">Cédula: ${doc?.cedula_profesional || doc?.cedula || '---'}</p>
            </div>
        </div>
    `
}

function generatePrescriptionHTML(data: PDFData): string {
    const { paciente, receta, doctor, fecha } = data
    const pat = paciente || {}
    const doc = doctor || {}

    return `
        <h1 style="font-size:22px;border-bottom:2px solid #2563eb;padding-bottom:8px;color:#1e3a5f;margin-bottom:16px;">
            Clínica PREDIA — Receta Médica
        </h1>
        <p style="color:#64748b;font-size:11px;margin-bottom:16px;">Folio: R-${receta?.id_receta || '0001'} | Fecha: ${fecha || 'N/A'}</p>
        
        <div style="background:#f8fafc;padding:12px 16px;border-radius:6px;margin-bottom:20px;border:1px solid #e2e8f0;">
            <p style="margin:4px 0;font-size:13px;"><strong>Paciente:</strong> ${pat?.nombre || ''} ${pat?.apellido_paterno || ''}</p>
        </div>

        <h2 style="font-size:14px;color:#0f172a;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:8px;text-transform:uppercase;">Medicamentos</h2>
        <p style="font-size:12px;color:#334155;margin-bottom:16px;white-space:pre-wrap;">${receta?.medicamentos || 'Sin medicamentos'}</p>

        <h2 style="font-size:14px;color:#0f172a;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:8px;text-transform:uppercase;">Indicaciones</h2>
        <p style="font-size:12px;color:#334155;margin-bottom:16px;white-space:pre-wrap;">${receta?.instrucciones || 'Sin indicaciones'}</p>

        <div style="margin-top:60px;text-align:center;">
            <div style="width:250px;border-top:1px solid #000;margin:0 auto;padding-top:6px;">
                <p style="font-size:13px;font-weight:bold;margin:2px 0;">Dr(a). ${doc?.nombre || 'Médico'} ${doc?.apellido_paterno || ''}</p>
                <p style="font-size:11px;color:#64748b;margin:2px 0;">Cédula: ${doc?.cedula_profesional || doc?.cedula || '---'}</p>
            </div>
        </div>
    `
}

function openPrintWindow(html: string, title: string) {
    const w = window.open('', '_blank', 'width=800,height=900')
    if (!w) {
        alert('Por favor permite las ventanas emergentes para imprimir/descargar el PDF.')
        return
    }
    w.document.write(`<!DOCTYPE html>
<html><head><title>${title}</title>
<style>
    body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 40px; color: #1a1a1a; max-width: 700px; margin: 0 auto; }
    @media print { 
        body { padding: 20px; }
        .no-print { display: none !important; }
    }
    .no-print { 
        position: fixed; top: 16px; right: 16px; z-index: 1000;
        display: flex; gap: 8px;
    }
    .no-print button {
        padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font-size: 13px; font-weight: 600;
    }
    .btn-print { background: #2563eb; color: white; }
    .btn-print:hover { background: #1d4ed8; }
    .btn-save { background: #059669; color: white; }
    .btn-save:hover { background: #047857; }
</style>
</head><body>
<div class="no-print">
    <button class="btn-print" onclick="window.print()"> Imprimir</button>
    <button class="btn-save" onclick="window.print()"> Guardar como PDF</button>
</div>
${html}
<div style="margin-top:40px;border-top:1px solid #d1d5db;padding-top:12px;font-size:11px;color:#6b7280;text-align:center;">
    Predia – Plataforma Clínica Integral · Generado el ${new Date().toLocaleString('es-MX')}
</div>
</body></html>`)
    w.document.close()
    w.focus()
}

export default function PDFDownloadWrapper({
    type, data, fileName, variant = "outline", size = "sm", className = "", children
}: {
    type: 'consultation' | 'prescription',
    data: any,
    fileName: string,
    variant?: any,
    size?: any,
    className?: string,
    children?: React.ReactNode
}) {
    const handleClick = () => {
        const html = type === 'consultation'
            ? generateConsultationHTML(data)
            : generatePrescriptionHTML(data)

        const title = type === 'consultation'
            ? `Expediente Clínico - ${data?.paciente?.nombre || 'Paciente'}`
            : `Receta Médica - ${data?.paciente?.nombre || 'Paciente'}`

        openPrintWindow(html, title)
    }

    return (
        <Button
            size={size}
            variant={variant}
            onClick={handleClick}
            className={className || "shrink-0 shadow-sm hover:bg-muted font-medium"}
        >
            {children || <><Download className="w-4 h-4 mr-2" /> PDF</>}
        </Button>
    )
}
