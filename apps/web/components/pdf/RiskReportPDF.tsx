"use client"

import React from "react"
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer"

const BAND: Record<string, { bg: string; text: string }> = {
  "Bajo": { bg: "#ecfdf5", text: "#047857" },
  "Moderado": { bg: "#fffbeb", text: "#b45309" },
  "Alto": { bg: "#fff7ed", text: "#c2410c" },
  "Muy Alto": { bg: "#fef2f2", text: "#991b1b" },
}
const NIVEL_NUM: Record<string, number> = { "Bajo": 1, "Moderado": 2, "Alto": 3, "Muy Alto": 4 }

const s = StyleSheet.create({
  page: { padding: 40, backgroundColor: "#ffffff", fontFamily: "Helvetica", fontSize: 11, color: "#334155" },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#1e293b", paddingBottom: 16, marginBottom: 18 },
  clinic: { fontSize: 22, fontWeight: "bold", color: "#0f172a" },
  clinicSub: { fontSize: 9, color: "#64748b", marginTop: 3 },
  dateText: { fontSize: 11, color: "#334155" },
  folio: { fontSize: 9, color: "#94a3b8", marginTop: 3 },
  title: { fontSize: 13, fontWeight: "bold", color: "#0f172a", marginBottom: 10, textTransform: "uppercase" },
  patient: { backgroundColor: "#f8fafc", padding: 12, borderRadius: 6, marginBottom: 16, flexDirection: "row", justifyContent: "space-between" },
  pText: { fontSize: 11, marginBottom: 3 },
  pLabel: { fontWeight: "bold", color: "#0f172a" },
  riskBox: { padding: 16, borderRadius: 8, marginBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  riskLevel: { fontSize: 20, fontWeight: "bold" },
  riskSub: { fontSize: 9, marginTop: 2 },
  riskScore: { fontSize: 30, fontWeight: "bold" },
  section: { marginBottom: 14 },
  sTitle: { fontSize: 12, fontWeight: "bold", color: "#0f172a", marginBottom: 6, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingBottom: 3 },
  p: { fontSize: 11, lineHeight: 1.5, marginBottom: 4 },
  cols: { flexDirection: "row", gap: 12 },
  col: { flex: 1, padding: 10, borderRadius: 6 },
  colTitle: { fontSize: 10, fontWeight: "bold", marginBottom: 4 },
  li: { fontSize: 10, marginBottom: 2 },
  disclaimer: { fontSize: 8, color: "#94a3b8", fontStyle: "italic", marginTop: 8 },
  footer: { position: "absolute", bottom: 40, left: 40, right: 40, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#e2e8f0", alignItems: "center" },
  sigLine: { width: 200, borderBottomWidth: 1, borderBottomColor: "#0f172a", marginBottom: 8 },
  docName: { fontSize: 11, fontWeight: "bold", color: "#0f172a" },
  docCedula: { fontSize: 9, color: "#64748b", marginTop: 2 },
})

interface Props {
  paciente: { nombre?: string; apellido_paterno?: string; genero?: string; edad?: number | string }
  nivel: string
  score: number
  descripcion?: string
  accionClinica?: string
  contribuyen?: { factor: string }[]
  protegen?: { factor: string }[]
  recomendaciones?: { seguimiento: string; acciones: string[] }
  fecha: string
  doctor?: { nombre?: string; apellido_paterno?: string; cedula?: string }
}

export const RiskReportPDF = ({ paciente, nivel, score, descripcion, accionClinica, contribuyen = [], protegen = [], recomendaciones, fecha, doctor }: Props) => {
  const band = BAND[nivel] ?? BAND["Bajo"]
  const pct = Math.round((score ?? 0) * 100)
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.clinic}>Clínica PREDIA</Text>
            <Text style={s.clinicSub}>Evaluación de Riesgo de Diabetes · Apoyo a la decisión clínica</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.dateText}>Fecha: {fecha}</Text>
            <Text style={s.folio}>Reporte de cribado</Text>
          </View>
        </View>

        <Text style={s.title}>Reporte de Estratificación de Riesgo</Text>

        <View style={s.patient}>
          <View>
            <Text style={s.pText}><Text style={s.pLabel}>Paciente: </Text>{paciente?.nombre} {paciente?.apellido_paterno}</Text>
            <Text style={s.pText}><Text style={s.pLabel}>Edad: </Text>{paciente?.edad ?? "N/A"} años</Text>
          </View>
          <View>
            <Text style={s.pText}><Text style={s.pLabel}>Género: </Text>{paciente?.genero ?? "No especificado"}</Text>
          </View>
        </View>

        {/* Banner de riesgo */}
        <View style={[s.riskBox, { backgroundColor: band.bg }]}>
          <View>
            <Text style={[s.riskLevel, { color: band.text }]}>Nivel {NIVEL_NUM[nivel] ?? "-"} · Riesgo {nivel}</Text>
            <Text style={[s.riskSub, { color: band.text }]}>Probabilidad estimada de cribado</Text>
          </View>
          <Text style={[s.riskScore, { color: band.text }]}>{pct}%</Text>
        </View>

        <View style={s.section}>
          <Text style={s.sTitle}>Interpretación</Text>
          <Text style={s.p}>{descripcion}</Text>
          {accionClinica ? <Text style={[s.p, { fontWeight: "bold", color: "#0f172a" }]}>{accionClinica}</Text> : null}
        </View>

        <View style={s.section}>
          <Text style={s.sTitle}>Factores considerados</Text>
          <View style={s.cols}>
            <View style={[s.col, { backgroundColor: "#fff7ed" }]}>
              <Text style={[s.colTitle, { color: "#c2410c" }]}>Contribuyen al riesgo</Text>
              {contribuyen.length === 0 ? <Text style={s.li}>—</Text> : contribuyen.map((f, i) => <Text key={i} style={s.li}>• {f.factor}</Text>)}
            </View>
            <View style={[s.col, { backgroundColor: "#ecfdf5" }]}>
              <Text style={[s.colTitle, { color: "#047857" }]}>Protegen contra el riesgo</Text>
              {protegen.length === 0 ? <Text style={s.li}>—</Text> : protegen.map((f, i) => <Text key={i} style={s.li}>• {f.factor}</Text>)}
            </View>
          </View>
        </View>

        {recomendaciones && (
          <View style={s.section}>
            <Text style={s.sTitle}>Recomendaciones clínicas</Text>
            <Text style={[s.p, { fontWeight: "bold", color: "#0f172a" }]}>{recomendaciones.seguimiento}</Text>
            {recomendaciones.acciones?.map((a, i) => <Text key={i} style={s.li}>• {a}</Text>)}
          </View>
        )}

        <Text style={s.disclaimer}>
          Este reporte es una herramienta de apoyo a la decisión clínica basada en un modelo de cribado;
          no constituye un diagnóstico. Debe interpretarse junto con el juicio médico y los estudios pertinentes.
        </Text>

        <View style={s.footer} fixed>
          <View style={s.sigLine} />
          <Text style={s.docName}>Dr(a). {doctor?.nombre ?? "Médico Tratante"} {doctor?.apellido_paterno ?? ""}</Text>
          <Text style={s.docCedula}>Cédula: {doctor?.cedula ?? "—"}</Text>
        </View>
      </Page>
    </Document>
  )
}
