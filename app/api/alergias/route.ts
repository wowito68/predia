import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/auth"

// GET - Listar alergias
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

        const alergias = await prisma.alergia.findMany({
            where,
            include: {
                paciente: { select: { nombre: true, apellido_paterno: true, cedula: true } },
                usuario: { select: { nombre: true, apellido_paterno: true } }
            },
            orderBy: { fecha_registro: "desc" }
        })

        return NextResponse.json({ success: true, data: alergias })
    } catch (error) {
        console.error("Error al obtener alergias:", error)
        return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 })
    }
}

// POST - Registrar alergia
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
        const { id_paciente, tipo_alergia, alergeno, severidad, reaccion, fecha_deteccion } = body

        if (!id_paciente || !tipo_alergia || !alergeno) {
            return NextResponse.json({
                success: false,
                error: "Faltan campos requeridos: id_paciente, tipo_alergia, alergeno"
            }, { status: 400 })
        }

        const alergia = await prisma.alergia.create({
            data: {
                id_paciente: parseInt(id_paciente),
                id_usuario: user.id_usuario,
                tipo_alergia,
                alergeno,
                severidad: severidad || null,
                reaccion: reaccion || null,
                fecha_deteccion: fecha_deteccion ? new Date(fecha_deteccion) : null
            }
        })

        return NextResponse.json({ success: true, data: alergia }, { status: 201 })
    } catch (error) {
        console.error("Error al registrar alergia:", error)
        return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 })
    }
}
