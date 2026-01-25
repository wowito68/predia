import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/auth"

// GET - Listar consultas médicas
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

        const consultas = await prisma.consultaMedica.findMany({
            where,
            include: {
                paciente: {
                    select: { nombre: true, apellido_paterno: true, cedula: true }
                },
                usuario: {
                    select: { nombre: true, apellido_paterno: true, especialidad: true }
                }
            },
            orderBy: { fecha_consulta: "desc" }
        })

        return NextResponse.json({ success: true, data: consultas })
    } catch (error) {
        console.error("Error al obtener consultas:", error)
        return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 })
    }
}

// POST - Registrar nueva consulta médica
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
            id_paciente,
            motivo_consulta,
            sintomas,
            exploracion_fisica,
            diagnostico,
            tratamiento,
            receta,
            proxima_cita,
            observaciones
        } = body

        if (!id_paciente || !motivo_consulta) {
            return NextResponse.json({
                success: false,
                error: "Faltan campos requeridos: id_paciente, motivo_consulta"
            }, { status: 400 })
        }

        const consulta = await prisma.consultaMedica.create({
            data: {
                id_paciente: parseInt(id_paciente),
                id_usuario: user.id_usuario,
                motivo_consulta,
                sintomas: sintomas || null,
                exploracion_fisica: exploracion_fisica || null,
                diagnostico: diagnostico || null,
                tratamiento: tratamiento || null,
                receta: receta || null,
                proxima_cita: proxima_cita ? new Date(proxima_cita) : null,
                observaciones: observaciones || null
            },
            include: {
                paciente: { select: { nombre: true, apellido_paterno: true } },
                usuario: { select: { nombre: true, apellido_paterno: true } }
            }
        })

        return NextResponse.json({ success: true, data: consulta }, { status: 201 })
    } catch (error) {
        console.error("Error al registrar consulta:", error)
        return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 })
    }
}
