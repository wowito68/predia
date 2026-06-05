import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/auth"

// GET - Listar imágenes diagnósticas
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

        const imagenes = await prisma.imagenDiagnostica.findMany({
            where,
            select: {
                id_imagen: true,
                id_paciente: true,
                fecha_estudio: true,
                tipo_imagen: true,
                region_anatomica: true,
                archivo_nombre: true,
                archivo_tipo: true,
                informe: true,
                hallazgos: true,
                conclusion: true,
                fecha_registro: true,
                paciente: { select: { nombre: true, apellido_paterno: true, cedula: true } },
                usuario: { select: { nombre: true, apellido_paterno: true } }
            },
            orderBy: { fecha_estudio: "desc" }
        })

        return NextResponse.json({ success: true, data: imagenes })
    } catch (error) {
        console.error("Error al obtener imágenes:", error)
        return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 })
    }
}

// POST - Registrar imagen diagnóstica
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

        const formData = await request.formData()
        const id_paciente = formData.get("id_paciente") as string
        const tipo_imagen = formData.get("tipo_imagen") as string
        const region_anatomica = formData.get("region_anatomica") as string
        const informe = formData.get("informe") as string | null
        const hallazgos = formData.get("hallazgos") as string | null
        const conclusion = formData.get("conclusion") as string | null
        const archivo = formData.get("archivo") as File | null

        if (!id_paciente || !tipo_imagen || !region_anatomica) {
            return NextResponse.json({
                success: false,
                error: "Faltan campos requeridos: id_paciente, tipo_imagen, region_anatomica"
            }, { status: 400 })
        }

        let archivo_data: Buffer | null = null
        let archivo_nombre: string | null = null
        let archivo_tipo: string | null = null

        if (archivo) {
            const arrayBuffer = await archivo.arrayBuffer()
            archivo_data = Buffer.from(arrayBuffer)
            archivo_nombre = archivo.name
            archivo_tipo = archivo.type
        }

        const imagen = await prisma.imagenDiagnostica.create({
            data: {
                id_paciente: parseInt(id_paciente),
                id_usuario: user.id_usuario,
                tipo_imagen,
                region_anatomica,
                archivo_data,
                archivo_nombre,
                archivo_tipo,
                informe: informe || null,
                hallazgos: hallazgos || null,
                conclusion: conclusion || null
            }
        })

        return NextResponse.json({
            success: true,
            data: {
                id_imagen: imagen.id_imagen,
                tipo_imagen: imagen.tipo_imagen,
                region_anatomica: imagen.region_anatomica,
                archivo_nombre: imagen.archivo_nombre
            }
        }, { status: 201 })
    } catch (error) {
        console.error("Error al registrar imagen:", error)
        return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 })
    }
}
