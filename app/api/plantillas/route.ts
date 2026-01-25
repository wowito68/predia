import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/auth"

// GET - Listar plantillas
export async function GET(request: NextRequest) {
    try {
        const token = request.headers.get("authorization")?.replace("Bearer ", "")
        if (!token) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })

        const user = await verifyToken(token)
        if (!user) return NextResponse.json({ success: false, error: "Token inválido" }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const tipo = searchParams.get("tipo")
        const especialidad = searchParams.get("especialidad")

        const where: any = { activo: true }
        if (tipo) where.tipo = tipo
        if (especialidad) where.especialidad = especialidad

        // Usuarios ven sus plantillas globales o propias (si se extendiera a privadas)
        // Por ahora, todas las plantillas activas son visibles/compartidas

        const plantillas = await prisma.plantilla.findMany({
            where,
            orderBy: { nombre: "asc" },
            include: { usuario: { select: { nombre: true, apellido_paterno: true } } }
        })

        return NextResponse.json({ success: true, data: plantillas })
    } catch (error) {
        console.error("Error al obtener plantillas:", error)
        return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 })
    }
}

// POST - Crear plantilla
export async function POST(request: NextRequest) {
    try {
        const token = request.headers.get("authorization")?.replace("Bearer ", "")
        if (!token) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })

        const user = await verifyToken(token)
        if (!user) return NextResponse.json({ success: false, error: "Token inválido" }, { status: 401 })

        const body = await request.json()
        const { nombre, tipo, especialidad, contenido } = body

        if (!nombre || !tipo || !contenido) {
            return NextResponse.json({ success: false, error: "Faltan campos requeridos" }, { status: 400 })
        }

        const plantilla = await prisma.plantilla.create({
            data: {
                id_usuario: user.id_usuario,
                nombre,
                tipo,
                especialidad: especialidad || null,
                contenido: typeof contenido === 'string' ? contenido : JSON.stringify(contenido)
            }
        })

        return NextResponse.json({ success: true, data: plantilla }, { status: 201 })
    } catch (error) {
        console.error("Error al crear plantilla:", error)
        return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 })
    }
}
