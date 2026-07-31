import { create } from 'zustand'

export interface ConsultaDraftData {
    motivo_consulta: string;
    sintomas: string;
    diagnostico: string;
    tratamiento: string;
    observaciones: string;
    receta_medicamentos: string;
    receta_indicaciones: string;
    presion_arterial: string;
    frecuencia_cardiaca: string;
    frecuencia_respiratoria: string;
    temperatura: string;
}

interface ConsultaState {
    isOpen: boolean;
    pacienteId: string | number | null;
    citaId: number | null;
    draftData: ConsultaDraftData;
    openConsulta: (id: string | number, citaId?: number) => void;
    closeConsulta: () => void;
    updateDraft: (data: Partial<ConsultaDraftData>) => void;
    clearDraft: () => void;
    lastUpdate: number;
    triggerInvalidation: () => void;
}

const initialDraft: ConsultaDraftData = {
    motivo_consulta: "",
    sintomas: "",
    diagnostico: "",
    tratamiento: "",
    observaciones: "",
    receta_medicamentos: "",
    receta_indicaciones: "",
    presion_arterial: "",
    frecuencia_cardiaca: "",
    frecuencia_respiratoria: "",
    temperatura: ""
}

export const useConsultaStore = create<ConsultaState>((set) => ({
    isOpen: false,
    pacienteId: null,
    citaId: null,
    draftData: initialDraft,
    lastUpdate: Date.now(),
    openConsulta: (id, citaId) => set({ isOpen: true, pacienteId: id, citaId: citaId || null }),
    closeConsulta: () => set({ isOpen: false, citaId: null }),
    updateDraft: (newValues) => set((state) => ({ 
        draftData: { ...state.draftData, ...newValues } 
    })),
    clearDraft: () => set({ draftData: initialDraft }),
    triggerInvalidation: () => set({ lastUpdate: Date.now() })
}))
