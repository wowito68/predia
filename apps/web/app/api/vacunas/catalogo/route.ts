import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/auth"

// GET - Listar catálogo de vacunas
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

        const vacunas = await prisma.catalogoVacuna.findMany({
            where: { activo: true },
            orderBy: { nombre: "asc" }
        })

        return NextResponse.json({ success: true, data: vacunas })
    } catch (error) {
        console.error("Error al obtener catálogo de vacunas:", error)
        return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 })
    }
}

// POST - Crear nueva vacuna en catálogo
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
        const { nombre, descripcion, dosis_requeridas } = body

        if (!nombre) {
            return NextResponse.json({ success: false, error: "El nombre es requerido" }, { status: 400 })
        }

        const vacuna = await prisma.catalogoVacuna.create({
            data: {
                nombre,
                descripcion: descripcion || null,
                dosis_requeridas: dosis_requeridas || 1
            }
        })

        return NextResponse.json({ success: true, data: vacuna }, { status: 201 })
    } catch (error) {
        console.error("Error al crear vacuna:", error)
        return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 })
    }
}
