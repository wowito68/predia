// app/api/predicciones/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/auth"

// GET - Obtener predicciones
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const user = verifyToken(token)
    if (!user) return NextResponse.json({ error: "Token inválido" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const id_paciente = searchParams.get("id_paciente")
    const skip = (page - 1) * limit

    const where = id_paciente ? { id_paciente: parseInt(id_paciente) } : {}

    const [predicciones, total] = await Promise.all([
      prisma.prediccion.findMany({
        where,
        include: {
          paciente: { select: { nombre: true, apellido_paterno: true } },
          usuario: { select: { username: true } },
        },
        orderBy: { fecha_prediccion: "desc" },
        take: limit,
        skip,
      }),
      prisma.prediccion.count({ where }),
    ])

    // Format response for backward compatibility
    const data = predicciones.map((p) => ({
      ...p,
      paciente_nombre: `${p.paciente.nombre} ${p.paciente.apellido_paterno}`,
      usuario_nombre: p.usuario.username,
      datos_entrada: typeof p.datos_entrada === "string" ? JSON.parse(p.datos_entrada) : p.datos_entrada,
      factores_riesgo: typeof p.factores_riesgo === "string" ? JSON.parse(p.factores_riesgo) : p.factores_riesgo,
    }))

    return NextResponse.json({
      success: true,
      data,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error("Error al obtener predicciones:", error)
    return NextResponse.json({ error: "Error al obtener predicciones" }, { status: 500 })
  }
}
