"use client"

// Envoltorio para cargar @react-pdf/renderer SÓLO mediante next/dynamic (ssr:false),
// manteniéndolo fuera del bundle inicial de la ruta de predicciones.

import { PDFDownloadButton } from "@/components/pdf/PDFDownloadButton"
import { RiskReportPDF } from "@/components/pdf/RiskReportPDF"

interface Props {
  fileName: string
  paciente?: { nombre?: string; apellido_paterno?: string; genero?: string; edad?: number }
  nivel: any
  score: number
  descripcion?: string
  accionClinica?: string
  contribuyen?: any[]
  protegen?: any[]
  recomendaciones?: any
  fecha: string
}

export default function RiskPDFButton({
  fileName, paciente = {}, nivel, score, descripcion, accionClinica, contribuyen = [], protegen = [], recomendaciones, fecha,
}: Props) {
  return (
    <PDFDownloadButton
      fileName={fileName}
      document={
        <RiskReportPDF
          paciente={paciente}
          nivel={nivel}
          score={score}
          descripcion={descripcion}
          accionClinica={accionClinica}
          contribuyen={contribuyen}
          protegen={protegen}
          recomendaciones={recomendaciones}
          fecha={fecha}
        />
      }
    />
  )
}
