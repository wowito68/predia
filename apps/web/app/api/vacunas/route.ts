import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/auth"

// GET - Listar vacunas aplicadas (filtrar por paciente opcional)
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

        const vacunas = await prisma.vacunaAplicada.findMany({
            where,
            include: {
                paciente: {
                    select: { nombre: true, apellido_paterno: true, cedula: true }
                },
                vacuna: true,
                usuario: {
                    select: { nombre: true, apellido_paterno: true }
                }
            },
            orderBy: { fecha_aplicacion: "desc" }
        })

        return NextResponse.json({ success: true, data: vacunas })
    } catch (error) {
        console.error("Error al obtener vacunas:", error)
        return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 })
    }
}

// POST - Registrar nueva vacuna aplicada
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
        const { id_paciente, id_vacuna, fecha_aplicacion, dosis_numero, lote, observaciones } = body

        if (!id_paciente || !id_vacuna || !fecha_aplicacion) {
            return NextResponse.json({
                success: false,
                error: "Faltan campos requeridos: id_paciente, id_vacuna, fecha_aplicacion"
            }, { status: 400 })
        }

        const vacunaAplicada = await prisma.vacunaAplicada.create({
            data: {
                id_paciente: parseInt(id_paciente),
                id_vacuna: parseInt(id_vacuna),
                id_usuario: user.id_usuario,
                fecha_aplicacion: new Date(fecha_aplicacion),
                dosis_numero: dosis_numero || 1,
                lote: lote || null,
                observaciones: observaciones || null
            },
            include: {
                vacuna: true,
                paciente: { select: { nombre: true, apellido_paterno: true } }
            }
        })

        return NextResponse.json({ success: true, data: vacunaAplicada }, { status: 201 })
    } catch (error) {
        console.error("Error al registrar vacuna:", error)
        return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 })
    }
}
