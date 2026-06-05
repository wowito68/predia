// app/api/predicciones/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/auth"

// GET - Obtener predicción por ID
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const user = verifyToken(token)
    if (!user) return NextResponse.json({ error: "Token inválido" }, { status: 401 })

    const params = await context.params
    const id = parseInt(params.id, 10)
    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ success: false, error: "ID inválido" }, { status: 400 })
    }

    const prediccion = await prisma.prediccion.findUnique({
      where: { id_prediccion: id },
      include: {
        paciente: { select: { nombre: true, apellido_paterno: true, cedula: true, genero: true } },
        usuario: { select: { username: true } },
      },
    })

    if (!prediccion) {
      return NextResponse.json(
        { success: false, error: "Predicción no encontrada", code: "NOT_FOUND" },
        { status: 404 },
      )
    }

    const result = {
      ...prediccion,
      datos_entrada: typeof prediccion.datos_entrada === "string" ? JSON.parse(prediccion.datos_entrada) : prediccion.datos_entrada,
      factores_riesgo: typeof prediccion.factores_riesgo === "string" ? JSON.parse(prediccion.factores_riesgo) : prediccion.factores_riesgo,
      paciente_nombre: `${prediccion.paciente.nombre} ${prediccion.paciente.apellido_paterno}`,
      usuario_nombre: prediccion.usuario.username,
      paciente: {
        nombre: prediccion.paciente.nombre,
        apellido_paterno: prediccion.paciente.apellido_paterno,
        cedula: prediccion.paciente.cedula,
        genero: prediccion.paciente.genero,
      },
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido"
    console.error("❌ Error en GET predicción:", errorMessage)
    return NextResponse.json(
      { success: false, error: "Error al obtener predicción", details: errorMessage },
      { status: 500 },
    )
  }
}

// PUT - Actualizar predicción (validar resultado)
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const user = verifyToken(token)
    if (!user) return NextResponse.json({ error: "Token inválido" }, { status: 401 })

    const params = await context.params
    const id = parseInt(params.id, 10)
    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ success: false, error: "ID inválido" }, { status: 400 })
    }

    const body = await request.json()

    const allowedFields = ["diagnostico_confirmado", "notas_medicas", "validado"] as const
    const updateData: Record<string, any> = {}

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: "No hay campos para actualizar" }, { status: 400 })
    }

    if ("diagnostico_confirmado" in updateData) {
      updateData.fecha_validacion = new Date()
      updateData.validado = true
    }

    const updated = await prisma.prediccion.update({
      where: { id_prediccion: id },
      data: updateData,
      include: {
        paciente: { select: { nombre: true, apellido_paterno: true } },
      },
    })

    return NextResponse.json({
      success: true,
      message: "Predicción actualizada",
      data: {
        ...updated,
        paciente_nombre: `${updated.paciente.nombre} ${updated.paciente.apellido_paterno}`,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido"
    console.error("❌ Error en PUT predicción:", errorMessage)
    return NextResponse.json(
      { success: false, error: "Error al actualizar predicción" },
      { status: 500 },
    )
  }
}

// DELETE - Eliminar predicción (soft delete)
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const user = verifyToken(token)
    if (!user) return NextResponse.json({ error: "Token inválido" }, { status: 401 })

    const params = await context.params
    const id = parseInt(params.id, 10)
    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ success: false, error: "ID inválido" }, { status: 400 })
    }

    const existing = await prisma.prediccion.findUnique({ where: { id_prediccion: id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: "Predicción no encontrada" }, { status: 404 })
    }

    await prisma.prediccion.update({
      where: { id_prediccion: id },
      data: { validado: false },
    })

    return NextResponse.json({ success: true, message: "Predicción eliminada" })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido"
    console.error("❌ Error en DELETE predicción:", errorMessage)
    return NextResponse.json(
      { success: false, error: "Error al eliminar predicción" },
      { status: 500 },
    )
  }
}
