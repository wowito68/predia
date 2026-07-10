import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/auth"

async function authenticatedUser(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "")
  if (!token) return null
  return verifyToken(token)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticatedUser(request)
    if (!user) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })

    const { id } = await params
    const idCita = Number(id)
    const body = await request.json()
    const action = String(body.action ?? "").toUpperCase()
    if (!Number.isInteger(idCita) || !["INICIAR", "FINALIZAR"].includes(action)) {
      return NextResponse.json({ success: false, error: "Acción o cita inválida" }, { status: 400 })
    }

    const cita = await prisma.cita.findUnique({
      where: { id_cita: idCita },
      include: {
        paciente: {
          select: {
            nombre: true,
            apellido_paterno: true,
            cedula: true,
            fecha_nacimiento: true,
            genero: true,
          },
        },
      },
    })
    if (!cita) return NextResponse.json({ success: false, error: "Cita no encontrada" }, { status: 404 })

    if (action === "INICIAR") {
      if (cita.estado !== "PROGRAMADA") {
        return NextResponse.json({ success: false, error: "Solo se pueden iniciar citas programadas" }, { status: 409 })
      }

      const medico = await prisma.usuario.findUnique({
        where: { id_usuario: user.id_usuario },
        select: { nombre: true, apellido_paterno: true, especialidad: true, cedula_profesional: true },
      })
      const now = new Date()
      const updated = await prisma.$transaction(async (tx) => {
        const consulta = await tx.consultaMedica.create({
          data: {
            id_paciente: cita.id_paciente,
            id_usuario: user.id_usuario,
            fecha_consulta: now,
            motivo_consulta: cita.motivo,
            datos_paciente: JSON.stringify(cita.paciente),
            datos_medico: JSON.stringify(medico ?? {}),
          },
        })
        return tx.cita.update({
          where: { id_cita: idCita },
          data: {
            estado: "EN_CURSO",
            inicio_cita: now,
            id_consulta: consulta.id_consulta,
          },
        })
      })

      return NextResponse.json({ success: true, data: updated })
    }

    if (cita.estado !== "EN_CURSO" || !cita.id_consulta) {
      return NextResponse.json({ success: false, error: "La cita debe estar en curso para finalizarla" }, { status: 409 })
    }

    const observaciones = String(body.observaciones ?? "").trim()
    const diagnostico = String(body.diagnostico ?? "").trim()
    const tratamiento = String(body.tratamiento ?? "").trim()
    const now = new Date()
    const updated = await prisma.$transaction(async (tx) => {
      await tx.consultaMedica.update({
        where: { id_consulta: cita.id_consulta! },
        data: {
          observaciones: observaciones || undefined,
          diagnostico: diagnostico || undefined,
          tratamiento: tratamiento || undefined,
        },
      })
      return tx.cita.update({
        where: { id_cita: idCita },
        data: {
          estado: "FINALIZADA",
          fin_cita: now,
          observaciones_cierre: observaciones || null,
        },
      })
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("Error al actualizar cita:", error)
    return NextResponse.json({ success: false, error: "Error interno al actualizar la cita" }, { status: 500 })
  }
}
