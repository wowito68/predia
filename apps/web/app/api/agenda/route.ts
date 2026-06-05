import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
    try {
        const token = request.headers.get("authorization")?.replace("Bearer ", "")
        if (!token) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })

        const user = await verifyToken(token)
        if (!user) return NextResponse.json({ success: false, error: "Token inválido" }, { status: 401 })

        // Obtener citas futuras (basado en proxima_cita de consultas anteriores)
        // Nota: Esto es un MVP. Idealmente tendríamos una tabla 'Cita' separada.
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const agenda = await prisma.consultaMedica.findMany({
            where: {
                proxima_cita: {
                    gte: startOfDay // Citas a partir del inicio de hoy local
                }
            },
            select: {
                id_consulta: true,
                proxima_cita: true,
                motivo_consulta: true, // Para referencia
                paciente: {
                    select: {
                        id_paciente: true,
                        nombre: true,
                        apellido_paterno: true,
                        telefono: true
                    }
                },
                usuario: { // Médico
                    select: {
                        nombre: true,
                        apellido_paterno: true
                    }
                }
            },
            orderBy: {
                proxima_cita: 'asc'
            }
        })

        return NextResponse.json({ success: true, data: agenda })
    } catch (error) {
        console.error("Error al obtener agenda:", error)
        return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 })
    }
}

// POST - Agendar nueva cita
export async function POST(request: NextRequest) {
    try {
        const token = request.headers.get("authorization")?.replace("Bearer ", "")
        if (!token) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })

        const user = await verifyToken(token)
        if (!user) return NextResponse.json({ success: false, error: "Token inválido" }, { status: 401 })

        const body = await request.json()
        const { id_paciente, fecha, motivo } = body

        if (!id_paciente || !fecha || !motivo) {
            return NextResponse.json({ success: false, error: "Faltan datos requeridos: id_paciente, fecha, motivo" }, { status: 400 })
        }

        const nuevaCita = await prisma.consultaMedica.create({
            data: {
                id_paciente: Number(id_paciente),
                id_usuario: user.id_usuario,
                motivo_consulta: `[CITA PROGRAMADA] ${motivo}`,
                proxima_cita: new Date(fecha), // ISO Date String
            }
        })

        return NextResponse.json({ success: true, data: nuevaCita }, { status: 201 })
    } catch (error) {
        console.error("Error al crear cita:", error)
        return NextResponse.json({ success: false, error: "Error interno al crear cita" }, { status: 500 })
    }
}
