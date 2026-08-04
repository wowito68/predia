import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/auth"

const createCitaSchema = z.object({
  id_paciente: z.coerce.number().int().positive(),
  fecha: z.string().datetime(),
  motivo: z.string().trim().min(3).max(500),
}).strict()

function canManageAgenda(role: string) {
  return role === "Médico" || role === "Administrador"
}

function serializeCita(cita: any) {
  return {
    ...cita,
    proxima_cita: cita.fecha_cita,
    motivo_consulta: cita.motivo,
  }
}

async function findScheduleConflict(input: {
  idPaciente: number
  idUsuario: number
  fecha: Date
  excludeId?: number
}) {
  return prisma.cita.findFirst({
    where: {
      ...(input.excludeId ? { id_cita: { not: input.excludeId } } : {}),
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

async function authenticatedUser(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "")
  if (!token) return null
  return verifyToken(token)
}

export async function GET(request: NextRequest) {
  try {
    const user = await authenticatedUser(request)
    if (!user) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const agenda = await prisma.cita.findMany({
      where: {
        OR: [
          { estado: "EN_CURSO" },
          { estado: "PROGRAMADA", fecha_cita: { gte: startOfDay } },
        ],
      },
      include: {
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
      },
      orderBy: [{ estado: "asc" }, { fecha_cita: "asc" }],
    })

    return NextResponse.json({ success: true, data: agenda.map(serializeCita) })
  } catch (error) {
    console.error("Error al obtener agenda:", error)
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticatedUser(request)
    if (!user) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })
    if (!canManageAgenda(user.rol)) {
      return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 })
    }

    const validation = createCitaSchema.safeParse(await request.json())
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: "Datos inválidos", details: validation.error.errors },
        { status: 400 },
      )
    }
    const idPaciente = validation.data.id_paciente
    const fecha = new Date(validation.data.fecha)
    const motivo = validation.data.motivo
    if (fecha.getTime() < Date.now() - 60_000) {
      return NextResponse.json({ success: false, error: "La cita debe programarse en el futuro" }, { status: 400 })
    }

    const paciente = await prisma.paciente.findUnique({
      where: { id_paciente: idPaciente },
      select: { id_paciente: true },
    })
    if (!paciente) return NextResponse.json({ success: false, error: "Paciente no encontrado" }, { status: 404 })

    const conflict = await findScheduleConflict({ idPaciente, idUsuario: user.id_usuario, fecha })
    if (conflict) {
      const error = conflict.id_paciente === idPaciente
        ? "El paciente ya tiene una cita en ese horario"
        : "El médico ya tiene una cita en ese horario"
      return NextResponse.json({ success: false, error }, { status: 409 })
    }

    const cita = await prisma.cita.create({
      data: {
        id_paciente: idPaciente,
        id_usuario: user.id_usuario,
        fecha_cita: fecha,
        motivo,
      },
      include: {
        paciente: {
          select: { id_paciente: true, nombre: true, apellido_paterno: true, telefono: true },
        },
        usuario: {
          select: { nombre: true, apellido_paterno: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: serializeCita(cita) }, { status: 201 })
  } catch (error) {
    console.error("Error al crear cita:", error)
    return NextResponse.json({ success: false, error: "Error interno al crear cita" }, { status: 500 })
  }
}
