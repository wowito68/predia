import { NextRequest, NextResponse } from "next/server"
import { requirePacienteSelf } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const PATCH = requirePacienteSelf(async (request: NextRequest, { params }) => {
  const idPaciente = Number(params?.id)
  const idCita = Number(params?.citaId)
  if (!Number.isInteger(idPaciente) || !Number.isInteger(idCita)) {
    return NextResponse.json({ success: false, error: "Cita inválida" }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  if (String(body.action ?? "").toUpperCase() !== "CANCELAR") {
    return NextResponse.json({ success: false, error: "Acción no permitida" }, { status: 400 })
  }

  const cita = await prisma.cita.findFirst({
    where: { id_cita: idCita, id_paciente: idPaciente },
    select: { id_cita: true, estado: true },
  })
  if (!cita) return NextResponse.json({ success: false, error: "Cita no encontrada" }, { status: 404 })
  if (cita.estado !== "PROGRAMADA") {
    return NextResponse.json({ success: false, error: "Sólo se pueden cancelar citas programadas" }, { status: 409 })
  }

  const reason = String(body.motivo ?? "Cancelada por el paciente desde PREDIA móvil").trim()
  const updated = await prisma.cita.update({
    where: { id_cita: idCita },
    data: {
      estado: "CANCELADA",
      observaciones_cierre: reason.slice(0, 500),
    },
    select: { id_cita: true, estado: true },
  })

  return NextResponse.json({ success: true, data: updated })
})
