import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/auth"

// GET - Listar patologías del paciente
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

        const patologias = await prisma.patologiaPaciente.findMany({
            where,
            include: {
                paciente: { select: { nombre: true, apellido_paterno: true, cedula: true } },
                patologia: true,
                usuario: { select: { nombre: true, apellido_paterno: true } }
            },
            orderBy: { fecha_diagnostico: "desc" }
        })

        return NextResponse.json({ success: true, data: patologias })
    } catch (error) {
        console.error("Error al obtener patologías:", error)
        return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 })
    }
}

// POST - Registrar patología al paciente
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
        const { id_paciente, id_patologia, fecha_diagnostico, estado, severidad, notas } = body

        if (!id_paciente || !id_patologia || !fecha_diagnostico) {
            return NextResponse.json({
                success: false,
                error: "Faltan campos requeridos"
            }, { status: 400 })
        }

        const patologiaPaciente = await prisma.patologiaPaciente.create({
            data: {
                id_paciente: parseInt(id_paciente),
                id_patologia: parseInt(id_patologia),
                id_usuario: user.id_usuario,
                fecha_diagnostico: new Date(fecha_diagnostico),
                estado: estado || "Activa",
                severidad: severidad || null,
                notas: notas || null
            },
            include: { patologia: true }
        })

        return NextResponse.json({ success: true, data: patologiaPaciente }, { status: 201 })
    } catch (error) {
        console.error("Error al registrar patología:", error)
        return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 })
    }
}
