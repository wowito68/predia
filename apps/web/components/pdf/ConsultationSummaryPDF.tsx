"use client"

import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingBottom: 20,
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'column',
  },
  clinicName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  clinicSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  dateText: {
    fontSize: 12,
    color: '#334155',
  },
  folioText: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 4,
  },
  patientSection: {
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  patientText: {
    fontSize: 12,
    color: '#334155',
    marginBottom: 4,
  },
  patientLabel: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  body: {
    flex: 1,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 4,
    textTransform: 'uppercase',
  },
  contentBlock: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 1.5,
    marginBottom: 8,
  },
  bold: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
    marginBottom: 10,
    backgroundColor: '#f1f5f9',
    padding: 10,
    borderRadius: 6,
  },
  vitalItem: {
    width: '25%',
    marginBottom: 5,
  },
  vitalLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  vitalValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'column',
    alignItems: 'center',
  },
  signatureLine: {
    width: 200,
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a',
    marginBottom: 10,
  },
  doctorName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  doctorCedula: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  }
});

interface ConsultationProps {
  paciente: any;
  consulta: any;
  medicion?: any;
  doctor: any;
  fecha: string;
}

export const ConsultationSummaryPDF = ({ paciente, consulta, medicion, doctor, fecha }: ConsultationProps) => {
  // Inmutabilidad (Fase 4): Priorizar Snapshot estricto si existe
  if (consulta?.datos_paciente) { try { paciente = typeof consulta.datos_paciente === 'string' ? JSON.parse(consulta.datos_paciente) : consulta.datos_paciente; } catch(e) {} }
  if (consulta?.datos_medico) { try { doctor = typeof consulta.datos_medico === 'string' ? JSON.parse(consulta.datos_medico) : consulta.datos_medico; } catch(e) {} }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.clinicName}>Clínica PREDIA</Text>
            <Text style={styles.clinicSub}>Av. Salud Integral #123, Ciudad de México</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.dateText}>Fecha: {fecha}</Text>
            <Text style={styles.folioText}>Folio: C-{consulta?.id_consulta || '0001'}</Text>
          </View>
        </View>

        {/* PATIENT INFO */}
        <View style={styles.patientSection}>
          <View>
            <Text style={styles.patientText}>
              <Text style={styles.patientLabel}>Paciente: </Text>
              {paciente?.nombre} {paciente?.apellido_paterno}
            </Text>
            <Text style={styles.patientText}>
              <Text style={styles.patientLabel}>Edad: </Text>
              {paciente?.edad || 'N/A'} años
            </Text>
          </View>
          <View>
            <Text style={styles.patientText}>
              <Text style={styles.patientLabel}>Género: </Text>
              {paciente?.genero || 'No especificado'}
            </Text>
            <Text style={styles.patientText}>
              <Text style={styles.patientLabel}>Alergias: </Text>
              {paciente?.alergias_count ? `${paciente.alergias_count} registradas` : 'Ninguna conocida'}
            </Text>
          </View>
        </View>

        {/* VITALS (If exist) */}
        {medicion && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Signos Vitales y Triage</Text>
            <View style={styles.vitalsGrid}>
              <View style={styles.vitalItem}>
                <Text style={styles.vitalLabel}>Presión Art.</Text>
                <Text style={styles.vitalValue}>{medicion.presion_sistolica}/{medicion.presion_diastolica} mmHg</Text>
              </View>
              <View style={styles.vitalItem}>
                <Text style={styles.vitalLabel}>Peso</Text>
                <Text style={styles.vitalValue}>{medicion.peso || '--'} kg</Text>
              </View>
              <View style={styles.vitalItem}>
                <Text style={styles.vitalLabel}>Estatura</Text>
                <Text style={styles.vitalValue}>{medicion.estatura || '--'} cm</Text>
              </View>
              <View style={styles.vitalItem}>
                <Text style={styles.vitalLabel}>IMC</Text>
                <Text style={styles.vitalValue}>{medicion.imc ? Number(medicion.imc).toFixed(1) : '--'} kg/m²</Text>
              </View>
            </View>
          </View>
        )}

        {/* CLINICAL EVALUATION */}
        <View style={styles.body}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Motivo de Consulta</Text>
            <Text style={styles.contentBlock}>{consulta?.motivo_consulta || 'Sin motivo registrado'}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Historia de la Enfermedad</Text>
            <Text style={styles.contentBlock}>{consulta?.sintomas || 'No descrita'}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Diagnóstico (Impresión Clínica)</Text>
            <Text style={styles.contentBlock}>{consulta?.diagnostico || 'Pendiente'}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Plan de Tratamiento y Manejo</Text>
            <Text style={styles.contentBlock}>{consulta?.tratamiento || 'Ninguno especificado'}</Text>
          </View>
          
          {consulta?.observaciones && (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Observaciones Médicas</Text>
                <Text style={styles.contentBlock}>{consulta.observaciones}</Text>
            </View>
          )}
        </View>

        {/* FOOTER & SIGNATURE */}
        <View style={styles.footer} fixed>
          <View style={styles.signatureLine} />
          <Text style={styles.doctorName}>Dr(a). {doctor?.nombre || 'Médico Tratante'} {doctor?.apellido_paterno || ''}</Text>
          <Text style={styles.doctorCedula}>Cédula: {doctor?.cedula || '12345678'}</Text>
        </View>

      </Page>
    </Document>
  );
};
