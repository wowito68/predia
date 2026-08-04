import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
    try {
        const token = request.headers.get("authorization")?.replace("Bearer ", "")
        if (!token) {
            return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })
        }

        const user = await verifyToken(token)
        if (!user) {
            return NextResponse.json({ success: false, error: "Token inválido" }, { status: 401 })
        }

        const body = await request.json()
        const { id_paciente, consulta, signos, receta, citaId } = body

        if (!id_paciente || !consulta || !consulta.motivo_consulta) {
            return NextResponse.json({
                success: false,
                error: "Faltan campos requeridos: id_paciente, motivo_consulta"
            }, { status: 400 })
        }

        // Parse Vitals
        let ps: number | null = null;
        let pd: number | null = null;
        let obsSignos = "";

        if (signos) {
            if (signos.presion_arterial && signos.presion_arterial.includes('/')) {
                const parts = signos.presion_arterial.split('/');
                ps = Number(parts[0]);
                pd = Number(parts[1]);
            }
            if (signos.frecuencia_cardiaca) obsSignos += `FC: ${signos.frecuencia_cardiaca} lpm. `;
            if (signos.frecuencia_respiratoria) obsSignos += `FR: ${signos.frecuencia_respiratoria} rpm. `;
            if (signos.temperatura) obsSignos += `Temp: ${signos.temperatura}°C. `;
        }

        // Utilizamos una transacción Prisma interactiva para garantizar All-or-Nothing (ACID)
        const result = await prisma.$transaction(async (tx) => {
            // 1. Crear Consulta Médica
            const nuevaConsulta = await tx.consultaMedica.create({
                data: {
                    id_paciente: parseInt(id_paciente),
                    id_usuario: user.id_usuario,
                    motivo_consulta: consulta.motivo_consulta,
                    sintomas: consulta.sintomas || null,
                    diagnostico: consulta.diagnostico || null,
                    tratamiento: consulta.tratamiento || null,
                    observaciones: consulta.observaciones || null
                }
            })

            // 2. Crear Signos Vitales (Si fueron proporcionados)
            let nuevaMedicion = null;
            if (signos && (ps !== null || obsSignos.length > 0)) {
                nuevaMedicion = await tx.medicionAntropometrica.create({
                    data: {
                        id_paciente: parseInt(id_paciente),
                        id_usuario: user.id_usuario,
                        presion_sistolica: ps,
                        presion_diastolica: pd,
                        observaciones: obsSignos ? obsSignos.trim() : null
                    }
                })
            }

            // 3. Crear Receta (Si fue proporcionada)
            let nuevaReceta = null;
            if (receta && (receta.medicamentos || receta.indicaciones)) {
                nuevaReceta = await tx.receta.create({
                    data: {
                        id_paciente: parseInt(id_paciente),
                        id_usuario: user.id_usuario,
                        id_consulta: nuevaConsulta.id_consulta,
                        medicamentos: receta.medicamentos || null,
                        instrucciones: receta.indicaciones || null
                    }
                })
            }

            // 4. Marcar cita original como completada (limpiar proxima_cita)
            if (citaId) {
                await tx.consultaMedica.update({
                    where: { id_consulta: Number(citaId) },
                    data: { proxima_cita: null }
                })
            }

            return { consulta: nuevaConsulta, medicion: nuevaMedicion, receta: nuevaReceta }
        });

        return NextResponse.json({ success: true, message: "Expediente guardado atómicamente", data: result }, { status: 201 })
    } catch (error: any) {
        console.error("❌ Error en Transacción Ómnibus:", error)
        return NextResponse.json({ success: false, error: "Error en transacción trans-modular", details: error.message }, { status: 500 })
    }
}
