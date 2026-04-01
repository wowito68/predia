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
    marginBottom: 25,
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  medicationItem: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  medName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 2,
  },
  medDose: {
    fontSize: 11,
    color: '#475569',
  },
  indicationsText: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 1.5,
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

interface PrescriptionProps {
  paciente: any;
  receta: any;
  doctor: any;
  fecha: string;
}

export const PrescriptionPDF = ({ paciente, receta, doctor, fecha }: PrescriptionProps) => {
  // Inmutabilidad (Fase 4): Priorizar Snapshot estricto si existe
  if (receta?.datos_paciente) { try { paciente = typeof receta.datos_paciente === 'string' ? JSON.parse(receta.datos_paciente) : receta.datos_paciente; } catch(e) {} }
  if (receta?.datos_medico) { try { doctor = typeof receta.datos_medico === 'string' ? JSON.parse(receta.datos_medico) : receta.datos_medico; } catch(e) {} }

  // Manejar caso donde medicamentos sea un string JSON o Array JSON
  let medicinas = [];
  try {
      if (typeof receta.medicamentos === 'string') {
          medicinas = JSON.parse(receta.medicamentos);
      } else if (Array.isArray(receta.medicamentos)) {
          medicinas = receta.medicamentos;
      }
  } catch(e) {}

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.clinicName}>Clínica PREDIA</Text>
            <Text style={styles.clinicSub}>Av. Salud Integral #123, Ciudad de México</Text>
            <Text style={styles.clinicSub}>Tel: (555) 123-4567 • contacto@predia.com</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.dateText}>Fecha: {fecha}</Text>
            <Text style={styles.folioText}>Folio: R-{receta.id_receta || '0001'}</Text>
          </View>
        </View>

        <View style={styles.patientSection}>
          <View>
            <Text style={styles.patientText}>
              <Text style={styles.patientLabel}>Paciente: </Text>
              {paciente?.nombre} {paciente?.apellido_paterno} {paciente?.apellido_materno || ''}
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
              <Text style={styles.patientLabel}>Tipo de Sangre: </Text>
              {paciente?.tipo_sangre || 'No especificado'}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.sectionTitle}>Prescripción Médica (Rx)</Text>
          
          {medicinas.length > 0 ? medicinas.map((med: any, i: number) => (
            <View key={i} style={styles.medicationItem}>
              <Text style={styles.medName}>• {med.nombre}</Text>
              <Text style={styles.medDose}>{med.dosis} - Tomar {med.frecuencia} durante {med.duracion}</Text>
            </View>
          )) : (
            <View style={styles.medicationItem}>
                <Text style={styles.indicationsText}>{typeof receta.medicamentos === 'string' ? receta.medicamentos : "Ver indicaciones generales"}</Text>
            </View>
          )}

          <View style={{ marginTop: 20 }}>
            <Text style={styles.sectionTitle}>Indicaciones Adicionales</Text>
            <Text style={styles.indicationsText}>{receta.instrucciones || receta.indicaciones || "Ninguna instrucción adicional."}</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <View style={styles.signatureLine} />
          <Text style={styles.doctorName}>Dr(a). {doctor?.nombre || 'Médico Tratante'} {doctor?.apellido_paterno || ''}</Text>
          <Text style={styles.doctorCedula}>Cédula Profesional: {doctor?.cedula || '12345678'}</Text>
        </View>

      </Page>
    </Document>
  );
};
