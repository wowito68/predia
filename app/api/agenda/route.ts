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
        const agenda = await prisma.consultaMedica.findMany({
            where: {
                proxima_cita: {
                    gte: new Date() // Citas futuras o de hoy
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
