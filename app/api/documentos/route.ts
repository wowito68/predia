import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/auth"

// GET - Listar documentos
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

        const documentos = await prisma.documentoAdjunto.findMany({
            where,
            orderBy: { fecha_subida: "desc" },
            select: {
                id_documento: true,
                id_paciente: true,
                tipo_documento: true,
                nombre_archivo: true,
                tipo_archivo: true,
                descripcion: true,
                fecha_subida: true,
                usuario: { select: { nombre: true, apellido_paterno: true } }
                // No seleccionamos datos_archivo para no saturar la respuesta, se descarga aparte
            }
        })

        return NextResponse.json({ success: true, data: documentos })
    } catch (error) {
        console.error("Error al obtener documentos:", error)
        return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 })
    }
}

// POST - Subir documento
export async function POST(request: NextRequest) {
    try {
        const token = request.headers.get("authorization")?.replace("Bearer ", "")
        if (!token) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })

        const user = await verifyToken(token)
        if (!user) return NextResponse.json({ success: false, error: "Token inválido" }, { status: 401 })

        const formData = await request.formData()
        const id_paciente = formData.get("id_paciente") as string
        const tipo_documento = formData.get("tipo_documento") as string
        const descripcion = formData.get("descripcion") as string | null
        const archivo = formData.get("archivo") as File | null

        if (!id_paciente || !tipo_documento || !archivo) {
            return NextResponse.json({ success: false, error: "Faltan campos requeridos" }, { status: 400 })
        }

        const arrayBuffer = await archivo.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const documento = await prisma.documentoAdjunto.create({
            data: {
                id_paciente: parseInt(id_paciente),
                id_usuario: user.id_usuario,
                tipo_documento,
                nombre_archivo: archivo.name,
                tipo_archivo: archivo.type,
                datos_archivo: buffer,
                descripcion: descripcion || null
            }
        })

        return NextResponse.json({
            success: true,
            data: {
                id_documento: documento.id_documento,
                nombre_archivo: documento.nombre_archivo
            }
        }, { status: 201 })
    } catch (error) {
        console.error("Error al subir documento:", error)
        return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 })
    }
}
