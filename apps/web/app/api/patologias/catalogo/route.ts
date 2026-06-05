import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/auth"

// GET - Listar catálogo de patologías (CIE-10)
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
        const search = searchParams.get("search")

        const where = search ? {
            activo: true,
            OR: [
                { nombre: { contains: search } },
                { codigo_cie10: { contains: search } }
            ]
        } : { activo: true }

        const patologias = await prisma.catalogoPatologia.findMany({
            where,
            orderBy: { nombre: "asc" },
            take: 100
        })

        return NextResponse.json({ success: true, data: patologias })
    } catch (error) {
        console.error("Error al obtener catálogo:", error)
        return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 })
    }
}

// POST - Crear patología en catálogo
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
        const { nombre, codigo_cie10, descripcion, categoria } = body

        if (!nombre) {
            return NextResponse.json({ success: false, error: "El nombre es requerido" }, { status: 400 })
        }

        const patologia = await prisma.catalogoPatologia.create({
            data: {
                nombre,
                codigo_cie10: codigo_cie10 || null,
                descripcion: descripcion || null,
                categoria: categoria || null
            }
        })

        return NextResponse.json({ success: true, data: patologia }, { status: 201 })
    } catch (error) {
        console.error("Error al crear patología:", error)
        return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 })
    }
}
