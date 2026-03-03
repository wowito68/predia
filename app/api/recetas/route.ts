import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/auth"
import { logAudit } from "@/lib/audit"

// GET - Listar recetas
export async function GET(request: NextRequest) {
    try {
        const token = request.headers.get("authorization")?.replace("Bearer ", "")
        if (!token) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })

        const user = await verifyToken(token)
        if (!user) return NextResponse.json({ success: false, error: "Token inválido" }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const id_paciente = searchParams.get("id_paciente")

        const where: any = {}
        if (id_paciente) where.id_paciente = parseInt(id_paciente)

        const recetas = await prisma.receta.findMany({
            where,
            include: {
                usuario: { select: { nombre: true, apellido_paterno: true } },
                paciente: { select: { nombre: true, apellido_paterno: true } }
            },
            orderBy: { fecha_emicion: "desc" }
        })

        return NextResponse.json({ success: true, data: recetas })
    } catch (error) {
        console.error("Error al obtener recetas:", error)
        return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 })
    }
}

// POST - Crear receta
export async function POST(request: NextRequest) {
    try {
        const token = request.headers.get("authorization")?.replace("Bearer ", "")
        if (!token) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })

        const user = await verifyToken(token)
        if (!user) return NextResponse.json({ success: false, error: "Token inválido" }, { status: 401 })

        const body = await request.json()
        const { id_paciente, id_consulta, medicamentos, instrucciones } = body

        // Validar campos requeridos
        if (!id_paciente || !medicamentos) {
            return NextResponse.json(
                { success: false, error: "Faltan campos requeridos: id_paciente y medicamentos son obligatorios" },
                { status: 400 }
            )
        }

        // Validar que id_consulta esté presente
        if (!id_consulta) {
            return NextResponse.json(
                { success: false, error: "id_consulta es requerido. Una receta debe estar asociada a una consulta médica registrada" },
                { status: 400 }
            )
        }

        // Verificar que la consulta existe y pertenece al mismo paciente
        const consulta = await prisma.consultaMedica.findFirst({
            where: {
                id_consulta: parseInt(id_consulta),
                id_paciente: parseInt(id_paciente),
            },
            select: { id_consulta: true, id_paciente: true },
        })

        if (!consulta) {
            return NextResponse.json(
                {
                    success: false,
                    error: "La consulta indicada no existe o no pertenece al paciente especificado",
                },
                { status: 404 }
            )
        }

        const receta = await prisma.receta.create({
            data: {
                id_paciente: parseInt(id_paciente),
                id_usuario: user.id_usuario,
                id_consulta: consulta.id_consulta,
                medicamentos: typeof medicamentos === 'string' ? medicamentos : JSON.stringify(medicamentos),
                instrucciones: instrucciones || null
            }
        })

        // Auditoría
        await logAudit(
            user.id_usuario,
            "CREAR_RECETA",
            `Receta creada para paciente ${id_paciente} en consulta ${id_consulta} con ID ${receta.id_receta}`
        )

        return NextResponse.json({ success: true, data: receta }, { status: 201 })
    } catch (error) {
        console.error("Error al crear receta:", error)
        return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 })
    }
}
