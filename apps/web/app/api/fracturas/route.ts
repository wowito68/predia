import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/auth"

// GET - Listar fracturas
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

        const fracturas = await prisma.fractura.findMany({
            where,
            include: {
                paciente: { select: { nombre: true, apellido_paterno: true, cedula: true } },
                usuario: { select: { nombre: true, apellido_paterno: true } }
            },
            orderBy: { fecha_fractura: "desc" }
        })

        return NextResponse.json({ success: true, data: fracturas })
    } catch (error) {
        console.error("Error al obtener fracturas:", error)
        return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 })
    }
}

// POST - Registrar fractura
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
        const {
            id_paciente, fecha_fractura, hueso_afectado, tipo_fractura,
            lado, causa, tratamiento, estado, observaciones
        } = body

        if (!id_paciente || !fecha_fractura || !hueso_afectado) {
            return NextResponse.json({
                success: false,
                error: "Faltan campos requeridos: id_paciente, fecha_fractura, hueso_afectado"
            }, { status: 400 })
        }

        const fractura = await prisma.fractura.create({
            data: {
                id_paciente: parseInt(id_paciente),
                id_usuario: user.id_usuario,
                fecha_fractura: new Date(fecha_fractura),
                hueso_afectado,
                tipo_fractura: tipo_fractura || null,
                lado: lado || null,
                causa: causa || null,
                tratamiento: tratamiento || null,
                estado: estado || "En tratamiento",
                observaciones: observaciones || null
            }
        })

        return NextResponse.json({ success: true, data: fractura }, { status: 201 })
    } catch (error) {
        console.error("Error al registrar fractura:", error)
        return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 })
    }
}
