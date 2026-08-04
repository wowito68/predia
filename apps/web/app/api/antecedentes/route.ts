import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/auth"

// GET - Listar antecedentes familiares
export async function GET(request: NextRequest) {
    try {
        const token = request.headers.get("authorization")?.replace("Bearer ", "")
        if (!token) {
            return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })
        }

        const user = await verifyToken(token)
        if (!user) {
            return NextResponse.json({ success: false, error: "Token inválido" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const id_paciente = searchParams.get("id_paciente")

        const where = id_paciente ? { id_paciente: parseInt(id_paciente) } : {}

        const antecedentes = await prisma.antecedenteFamiliar.findMany({
            where,
            include: {
                paciente: { select: { nombre: true, apellido_paterno: true, cedula: true } },
                usuario: { select: { nombre: true, apellido_paterno: true } }
            },
            orderBy: { fecha_registro: "desc" }
        })

        return NextResponse.json({ success: true, data: antecedentes })
    } catch (error) {
        console.error("Error al obtener antecedentes:", error)
        return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 })
    }
}

// POST - Registrar antecedente familiar
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
        const { id_paciente, parentesco, condicion, detalles } = body

        if (!id_paciente || !parentesco || !condicion) {
            return NextResponse.json({
                success: false,
                error: "Faltan campos requeridos: id_paciente, parentesco, condicion"
            }, { status: 400 })
        }

        const antecedente = await prisma.antecedenteFamiliar.create({
            data: {
                id_paciente: parseInt(id_paciente),
                id_usuario: user.id_usuario,
                parentesco,
                condicion,
                detalles: detalles || null
            }
        })

        return NextResponse.json({ success: true, data: antecedente }, { status: 201 })
    } catch (error) {
        console.error("Error al registrar antecedente:", error)
        return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 })
    }
}
