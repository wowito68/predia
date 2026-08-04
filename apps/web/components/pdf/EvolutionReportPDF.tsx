"use client"

import React from "react"
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer"

const cesColor = (c: number) => (c >= 70 ? "#059669" : c >= 55 ? "#16a34a" : c >= 45 ? "#475569" : c >= 30 ? "#c2410c" : "#991b1b")

const s = StyleSheet.create({
  page: { padding: 40, backgroundColor: "#fff", fontFamily: "Helvetica", fontSize: 11, color: "#334155" },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#1e293b", paddingBottom: 14, marginBottom: 16 },
  clinic: { fontSize: 22, fontWeight: "bold", color: "#0f172a" },
  sub: { fontSize: 9, color: "#64748b", marginTop: 3 },
  title: { fontSize: 13, fontWeight: "bold", color: "#0f172a", marginBottom: 10, textTransform: "uppercase" },
  patient: { backgroundColor: "#f8fafc", padding: 12, borderRadius: 6, marginBottom: 14 },
  pText: { fontSize: 11, marginBottom: 3 },
  pLabel: { fontWeight: "bold", color: "#0f172a" },
  cesBox: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 8, marginBottom: 14, backgroundColor: "#f1f5f9" },
  cesNum: { fontSize: 32, fontWeight: "bold" },
  sTitle: { fontSize: 12, fontWeight: "bold", color: "#0f172a", marginBottom: 6, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingBottom: 3 },
  li: { fontSize: 10, marginBottom: 2 },
  section: { marginBottom: 12 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#eef2f6", paddingVertical: 4 },
  th: { fontSize: 9, fontWeight: "bold", color: "#0f172a" },
  cell: { fontSize: 9 },
  c1: { width: "26%" }, c2: { width: "16%" }, c3: { width: "16%" }, c4: { width: "22%" }, c5: { width: "20%" },
  disclaimer: { fontSize: 8, color: "#94a3b8", fontStyle: "italic", marginTop: 8 },
  footer: { position: "absolute", bottom: 40, left: 40, right: 40, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#e2e8f0", alignItems: "center" },
  sig: { width: 200, borderBottomWidth: 1, borderBottomColor: "#0f172a", marginBottom: 8 },
  doc: { fontSize: 11, fontWeight: "bold", color: "#0f172a" },
})

interface Metric { label: string; unidad: string; n: number; actual: number | null; promedio: number; slopePerMonth: number; r2: number; sigma: number; estado: string }
interface Props {
  paciente?: { nombre?: string; apellido_paterno?: string; edad?: number | string }
  ces: { ces: number; banda: string; T: number; S: number; components: { detalle: string }[] } | null
  eventos: { mensaje: string; severidad: string }[]
  variables: Metric[]
  fecha: string
}

export const EvolutionReportPDF = ({ paciente, ces, eventos, variables, fecha }: Props) => {
  const withData = variables.filter((v) => v.n >= 1)
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.clinic}>Clínica PREDIA</Text>
            <Text style={s.sub}>Reporte de Evolución Clínica · Análisis longitudinal</Text>
          </View>
          <Text style={s.sub}>Fecha: {fecha}</Text>
        </View>

        <Text style={s.title}>Reporte de Evolución Clínica</Text>

        <View style={s.patient}>
          <Text style={s.pText}><Text style={s.pLabel}>Paciente: </Text>{paciente?.nombre} {paciente?.apellido_paterno}</Text>
          {paciente?.edad != null && <Text style={s.pText}><Text style={s.pLabel}>Edad: </Text>{paciente.edad} años</Text>}
        </View>

        {ces && (
          <View style={s.cesBox}>
            <Text style={[s.cesNum, { color: cesColor(ces.ces) }]}>{ces.ces}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "bold", color: cesColor(ces.ces) }}>Clinical Evolution Score: {ces.banda}</Text>
              <Text style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>Tendencia T={ces.T} · Estabilidad S={ces.S} (50 = sin cambio; &gt;50 favorable)</Text>
            </View>
          </View>
        )}

        {ces && ces.components.length > 0 && (
          <View style={s.section}>
            <Text style={s.sTitle}>¿Por qué este score?</Text>
            {ces.components.map((c, i) => <Text key={i} style={s.li}>• {c.detalle}</Text>)}
          </View>
        )}

        {eventos.length > 0 && (
          <View style={s.section}>
            <Text style={s.sTitle}>Eventos detectados</Text>
            {eventos.map((e, i) => <Text key={i} style={s.li}>• [{e.severidad}] {e.mensaje}</Text>)}
          </View>
        )}

        <View style={s.section}>
          <Text style={s.sTitle}>Métricas por variable</Text>
          <View style={s.row}>
            <Text style={[s.th, s.c1]}>Variable</Text>
            <Text style={[s.th, s.c2]}>Actual</Text>
            <Text style={[s.th, s.c3]}>Promedio</Text>
            <Text style={[s.th, s.c4]}>Pendiente/mes</Text>
            <Text style={[s.th, s.c5]}>Estado</Text>
          </View>
          {withData.map((v, i) => (
            <View key={i} style={s.row}>
              <Text style={[s.cell, s.c1]}>{v.label}</Text>
              <Text style={[s.cell, s.c2]}>{v.actual != null ? `${v.actual} ${v.unidad}` : "—"}</Text>
              <Text style={[s.cell, s.c3]}>{v.promedio} {v.unidad}</Text>
              <Text style={[s.cell, s.c4]}>{v.n >= 2 ? `${v.slopePerMonth > 0 ? "+" : ""}${v.slopePerMonth} ${v.unidad}` : "—"}</Text>
              <Text style={[s.cell, s.c5]}>{v.estado}</Text>
            </View>
          ))}
        </View>

        <Text style={s.disclaimer}>
          Análisis longitudinal basado en regresión sobre el tiempo (ver docs/clinical-evolution-score.md).
          Herramienta de apoyo a la decisión clínica; no sustituye el juicio médico.
        </Text>

        <View style={s.footer} fixed>
          <View style={s.sig} />
          <Text style={s.doc}>Médico Tratante</Text>
        </View>
      </Page>
    </Document>
  )
}
