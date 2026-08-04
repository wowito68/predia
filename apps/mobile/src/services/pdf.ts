import { Alert, Platform } from 'react-native'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import type { Medicamento, RecetaResumen } from '@predia/shared'
import type { ClinicalSnapshot } from './api'

type ParsedMed = Medicamento & { medicamento?: string }

const nowLabel = () => new Date().toLocaleString('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const dateLabel = (value?: string | null) => value
  ? new Date(value).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
  : 'Sin registro'

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;')

export function parseMedicamentos(value: RecetaResumen['medicamentos']): ParsedMed[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : [{ nombre: String(value) }]
  } catch {
    return [{ nombre: String(value) }]
  }
}

const documentShell = (title: string, body: string) => `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        @page { margin: 28px; }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          color: #111827;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 12px;
          line-height: 1.45;
        }
        .header {
          border-bottom: 2px solid #111827;
          padding-bottom: 14px;
          margin-bottom: 20px;
        }
        .brand {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: 1.2px;
        }
        .subtitle {
          margin-top: 3px;
          color: #4B5563;
        }
        .doc-title {
          margin-top: 14px;
          font-size: 16px;
          font-weight: 800;
          text-transform: uppercase;
        }
        .meta {
          margin-top: 8px;
          color: #4B5563;
        }
        .section {
          margin-top: 18px;
          break-inside: avoid;
        }
        .section-title {
          border-bottom: 1px solid #D1D5DB;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.8px;
          padding-bottom: 5px;
          text-transform: uppercase;
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 18px;
          margin-top: 10px;
        }
        .label {
          color: #6B7280;
          display: block;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .value {
          display: block;
          font-weight: 600;
          margin-top: 2px;
        }
        table {
          border-collapse: collapse;
          margin-top: 10px;
          width: 100%;
        }
        th, td {
          border-bottom: 1px solid #E5E7EB;
          padding: 8px 6px;
          text-align: left;
          vertical-align: top;
        }
        th {
          font-size: 10px;
          letter-spacing: 0.6px;
          text-transform: uppercase;
        }
        .note {
          border: 1px solid #D1D5DB;
          margin-top: 10px;
          padding: 10px;
          white-space: pre-wrap;
        }
        .footer {
          border-top: 1px solid #D1D5DB;
          color: #6B7280;
          font-size: 10px;
          margin-top: 28px;
          padding-top: 10px;
        }
      </style>
      <title>${escapeHtml(title)}</title>
    </head>
    <body>
      <div class="header">
        <div class="brand">PREDIA</div>
        <div class="subtitle">Plataforma Clínica Inteligente para la Detección Temprana de Diabetes</div>
        <div class="doc-title">${escapeHtml(title)}</div>
        <div class="meta">Documento generado desde PREDIA móvil · ${escapeHtml(nowLabel())}</div>
      </div>
      ${body}
      <div class="footer">
        Documento informativo generado por PREDIA. La información debe ser interpretada por personal médico autorizado.
      </div>
    </body>
  </html>
`

export function recetaHtml(receta: RecetaResumen, pacienteNombre?: string) {
  const meds = parseMedicamentos(receta.medicamentos)
  const instructions = (receta.instrucciones || 'Sin indicaciones adicionales.')
    .replace(/([.!?])(?=[A-ZÁÉÍÓÚÑ])/g, '$1 ')
  return documentShell('Receta médica', `
    <div class="section">
      <div class="section-title">Datos generales</div>
      <div class="grid">
        <div><span class="label">Paciente</span><span class="value">${escapeHtml(pacienteNombre || 'Paciente')}</span></div>
        <div><span class="label">Médico</span><span class="value">${escapeHtml(receta.medico || 'No especificado')}</span></div>
        <div><span class="label">Fecha de emisión</span><span class="value">${escapeHtml(dateLabel(receta.fecha_emision))}</span></div>
        <div><span class="label">Estado</span><span class="value">${escapeHtml(receta.estado)}</span></div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Medicamentos</div>
      <table>
        <thead><tr><th>Medicamento</th><th>Dosis</th><th>Frecuencia</th><th>Duración</th></tr></thead>
        <tbody>
          ${meds.map((med) => `
            <tr>
              <td>${escapeHtml(med.nombre || med.medicamento || 'Medicamento')}</td>
              <td>${escapeHtml(med.dosis || '—')}</td>
              <td>${escapeHtml(med.frecuencia || '—')}</td>
              <td>${escapeHtml(med.duracion || '—')}</td>
            </tr>
          `).join('') || '<tr><td colspan="4">Sin medicamentos estructurados.</td></tr>'}
        </tbody>
      </table>
    </div>
    <div class="section">
      <div class="section-title">Indicaciones</div>
      <div class="note">${escapeHtml(instructions)}</div>
    </div>
  `)
}

export function clinicalSummaryHtml(snapshot: ClinicalSnapshot) {
  const patient = snapshot.paciente
  const summary = snapshot.summary
  const measurement = summary.ultimaMedicion
  const risk = snapshot.risk
  return documentShell('Resumen clínico', `
    <div class="section">
      <div class="section-title">Paciente</div>
      <div class="grid">
        <div><span class="label">Nombre</span><span class="value">${escapeHtml(patient.nombre_completo)}</span></div>
        <div><span class="label">Cédula</span><span class="value">${escapeHtml(patient.cedula)}</span></div>
        <div><span class="label">Edad</span><span class="value">${escapeHtml(patient.edad ?? 'Sin registro')}</span></div>
        <div><span class="label">Tipo sanguíneo</span><span class="value">${escapeHtml(patient.tipo_sangre || 'Sin registro')}</span></div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Riesgo y alertas</div>
      <div class="grid">
        <div><span class="label">Nivel de riesgo</span><span class="value">${escapeHtml(risk?.nivel || 'Sin evaluación')}</span></div>
        <div><span class="label">Validación IA</span><span class="value">${escapeHtml(risk ? (risk.validado ? 'Validada' : 'Pendiente') : 'No aplica')}</span></div>
      </div>
      <div class="note">${escapeHtml(risk?.descripcion || 'Sin descripción de riesgo registrada.')}</div>
    </div>
    <div class="section">
      <div class="section-title">Últimos indicadores</div>
      <table>
        <tbody>
          <tr><th>Peso</th><td>${escapeHtml(measurement?.peso != null ? `${measurement.peso} kg` : '—')}</td></tr>
          <tr><th>IMC</th><td>${escapeHtml(measurement?.imc ?? '—')}</td></tr>
          <tr><th>Presión</th><td>${escapeHtml(measurement?.presion_sistolica != null ? `${measurement.presion_sistolica}/${measurement.presion_diastolica ?? '—'} mmHg` : '—')}</td></tr>
          <tr><th>Glucosa</th><td>${escapeHtml(summary.ultimaGlucosa ? `${summary.ultimaGlucosa.valor} ${summary.ultimaGlucosa.unidad || 'mg/dL'}` : '—')}</td></tr>
        </tbody>
      </table>
    </div>
    <div class="section">
      <div class="section-title">Seguimiento</div>
      <div class="grid">
        <div><span class="label">Última consulta</span><span class="value">${escapeHtml(dateLabel(summary.ultimaConsulta?.fecha_consulta))}</span></div>
        <div><span class="label">Próxima cita</span><span class="value">${escapeHtml(dateLabel(summary.proximaCita?.proxima_cita))}</span></div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Alergias y tratamiento</div>
      <div class="note">
        Alergias críticas: ${escapeHtml(summary.alergiasCriticas.length ? summary.alergiasCriticas.map((a) => a.alergeno).join(', ') : 'Sin alergias críticas registradas')}
        ${'\n'}Recetas activas: ${escapeHtml(summary.recetasActivas.length ? summary.recetasActivas.map((r) => parseMedicamentos(r.medicamentos).map((m) => m.nombre || m.medicamento).filter(Boolean).join(', ')).filter(Boolean).join(' · ') : 'Sin recetas activas')}
      </div>
    </div>
  `)
}

function printHtmlInBrowser(html: string) {
  const popup = window.open('', '_blank', 'width=900,height=720')
  if (!popup) throw new Error('El navegador bloqueó la ventana de impresión. Habilita las ventanas emergentes para PREDIA.')

  popup.document.open()
  popup.document.write(html)
  popup.document.close()
  popup.focus()
  window.setTimeout(() => popup.print(), 250)
}

export async function printHtml(html: string) {
  if (Platform.OS === 'web') {
    printHtmlInBrowser(html)
    return
  }
  await Print.printAsync({ html })
}

export async function sharePdf(title: string, html: string) {
  if (Platform.OS === 'web') {
    printHtmlInBrowser(html)
    return
  }

  const { uri } = await Print.printToFileAsync({ html, base64: false })
  const canShare = await Sharing.isAvailableAsync()
  if (!canShare) {
    await Print.printAsync({ html })
    return
  }
  await Sharing.shareAsync(uri, {
    dialogTitle: title,
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
  })
}

export function showPdfError(error: unknown) {
  Alert.alert('No se pudo generar el PDF', error instanceof Error ? error.message : 'Intenta nuevamente.')
}
