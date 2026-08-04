import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/auth"

const patchCitaSchema = z.object({
  action: z.preprocess(
    (value) => typeof value === "string" ? value.toUpperCase() : value,
    z.enum(["INICIAR", "FINALIZAR", "EDITAR", "REAGENDAR", "CANCELAR"]),
  ),
  fecha: z.string().datetime().optional(),
  motivo: z.string().trim().min(3).max(500).optional(),
  observaciones: z.string().trim().max(2000).optional(),
  diagnostico: z.string().trim().max(2000).optional(),
  tratamiento: z.string().trim().max(2000).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.action === "REAGENDAR" && !value.fecha) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["fecha"], message: "La nueva fecha es obligatoria" })
  }
  if (value.action === "EDITAR" && !value.fecha && !value.motivo) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Indica fecha o motivo para editar" })
  }
})

function canManageAgenda(role: string) {
  return role === "Médico" || role === "Administrador"
}

const agendaInclude = {
  paciente: {
    select: {
      id_paciente: true,
      nombre: true,
      apellido_paterno: true,
      telefono: true,
    },
  },
  usuario: {
    select: {
      nombre: true,
      apellido_paterno: true,
    },
  },
} as const

async function authenticatedUser(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "")
  if (!token) return null
  return verifyToken(token)
}

function serializeCita(cita: any) {
  return {
    ...cita,
    proxima_cita: cita.fecha_cita,
    motivo_consulta: cita.motivo,
  }
}

async function loadAgendaItem(idCita: number) {
  const cita = await prisma.cita.findUnique({
    where: { id_cita: idCita },
    include: agendaInclude,
  })
  return cita ? serializeCita(cita) : null
}

async function findScheduleConflict(input: {
  idCita: number
  idPaciente: number
  idUsuario: number
  fecha: Date
}) {
  return prisma.cita.findFirst({
    where: {
      id_cita: { not: input.idCita },
      estado: { in: ["PROGRAMADA", "EN_CURSO"] },
      fecha_cita: input.fecha,
      OR: [
        { id_paciente: input.idPaciente },
        { id_usuario: input.idUsuario },
      ],
    },
    select: { id_cita: true, id_paciente: true, id_usuario: true },
  })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticatedUser(request)
    if (!user) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })
    if (!canManageAgenda(user.rol)) {
      return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 })
    }

    const { id } = await params
    const idCita = Number(id)
    const validation = patchCitaSchema.safeParse(await request.json())
    if (!Number.isInteger(idCita) || !validation.success) {
      return NextResponse.json({ success: false, error: "Acción o cita inválida" }, { status: 400 })
    }
    const body = validation.data
    const action = body.action

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
    if (user.rol === "Médico" && cita.id_usuario !== user.id_usuario) {
      return NextResponse.json({ success: false, error: "La cita pertenece a otro médico" }, { status: 403 })
    }

    if (action === "EDITAR" || action === "REAGENDAR") {
      if (cita.estado !== "PROGRAMADA") {
        return NextResponse.json({ success: false, error: "Solo se pueden modificar citas programadas" }, { status: 409 })
      }

      const fecha = body.fecha ? new Date(body.fecha) : cita.fecha_cita
      const motivo = body.motivo !== undefined ? body.motivo : cita.motivo
      if (Number.isNaN(fecha.getTime())) {
        return NextResponse.json({ success: false, error: "La fecha de la cita no es válida" }, { status: 400 })
      }
      if (fecha.getTime() < Date.now() - 60_000) {
        return NextResponse.json({ success: false, error: "La cita debe quedar programada en el futuro" }, { status: 400 })
      }
      if (!motivo) {
        return NextResponse.json({ success: false, error: "El motivo de la cita es obligatorio" }, { status: 400 })
      }

      const conflict = await findScheduleConflict({
        idCita,
        idPaciente: cita.id_paciente,
        idUsuario: cita.id_usuario,
        fecha,
      })
      if (conflict) {
        const error = conflict.id_paciente === cita.id_paciente
          ? "El paciente ya tiene una cita en ese horario"
          : "El médico ya tiene una cita en ese horario"
        return NextResponse.json({ success: false, error }, { status: 409 })
      }

      await prisma.cita.update({
        where: { id_cita: idCita },
        data: { fecha_cita: fecha, motivo },
      })
      return NextResponse.json({ success: true, data: await loadAgendaItem(idCita) })
    }

    if (action === "CANCELAR") {
      if (cita.estado !== "PROGRAMADA") {
        return NextResponse.json({ success: false, error: "Solo se pueden cancelar citas programadas" }, { status: 409 })
      }
      const observaciones = body.observaciones ?? ""
      await prisma.cita.update({
        where: { id_cita: idCita },
        data: {
          estado: "CANCELADA",
          observaciones_cierre: observaciones || null,
        },
      })
      return NextResponse.json({ success: true, data: await loadAgendaItem(idCita) })
    }

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

      return NextResponse.json({ success: true, data: await loadAgendaItem(updated.id_cita) })
    }

    if (cita.estado !== "EN_CURSO" || !cita.id_consulta) {
      return NextResponse.json({ success: false, error: "La cita debe estar en curso para finalizarla" }, { status: 409 })
    }

    const observaciones = body.observaciones ?? ""
    const diagnostico = body.diagnostico ?? ""
    const tratamiento = body.tratamiento ?? ""
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

    return NextResponse.json({ success: true, data: await loadAgendaItem(updated.id_cita) })
  } catch (error) {
    console.error("Error al actualizar cita:", error)
    return NextResponse.json({ success: false, error: "Error interno al actualizar la cita" }, { status: 500 })
  }
}
