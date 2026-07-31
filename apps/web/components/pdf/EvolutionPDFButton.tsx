"use client"

// Envoltorio para cargar @react-pdf/renderer SÓLO mediante next/dynamic (ssr:false).
// La página importa este componente con dynamic(), por lo que @react-pdf y el
// documento PDF quedan fuera del bundle inicial de la ruta (antes ~500kB extra).

import { PDFDownloadButton } from "@/components/pdf/PDFDownloadButton"
import { EvolutionReportPDF } from "@/components/pdf/EvolutionReportPDF"

interface Props {
  id: string
  paciente?: { nombre?: string; apellido_paterno?: string; edad?: number }
  data: any
}

export default function EvolutionPDFButton({ id, paciente, data }: Props) {
  return (
    <PDFDownloadButton
      fileName={`evolucion_${id}.pdf`}
      document={
        <EvolutionReportPDF
          paciente={{ nombre: paciente?.nombre, apellido_paterno: paciente?.apellido_paterno, edad: paciente?.edad }}
          ces={data.ces}
          eventos={data.eventos}
          variables={data.variables}
          fecha={new Date().toLocaleDateString("es-MX")}
        />
      }
    />
  )
}
