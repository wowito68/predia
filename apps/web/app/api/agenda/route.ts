import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/auth"

function serializeCita(cita: any) {
  return {
    ...cita,
    proxima_cita: cita.fecha_cita,
    motivo_consulta: cita.motivo,
  }
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

    const body = await request.json()
    const idPaciente = Number(body.id_paciente)
    const fecha = new Date(body.fecha)
    const motivo = String(body.motivo ?? "").trim()

    if (!Number.isInteger(idPaciente) || Number.isNaN(fecha.getTime()) || !motivo) {
      return NextResponse.json(
        { success: false, error: "Faltan datos válidos: id_paciente, fecha y motivo" },
        { status: 400 },
      )
    }
    if (fecha.getTime() < Date.now() - 60_000) {
      return NextResponse.json({ success: false, error: "La cita debe programarse en el futuro" }, { status: 400 })
    }

    const paciente = await prisma.paciente.findUnique({
      where: { id_paciente: idPaciente },
      select: { id_paciente: true },
    })
    if (!paciente) return NextResponse.json({ success: false, error: "Paciente no encontrado" }, { status: 404 })

    const duplicate = await prisma.cita.findFirst({
      where: {
        id_paciente: idPaciente,
        fecha_cita: fecha,
        estado: { in: ["PROGRAMADA", "EN_CURSO"] },
      },
      select: { id_cita: true },
    })
    if (duplicate) {
      return NextResponse.json({ success: false, error: "El paciente ya tiene una cita en ese horario" }, { status: 409 })
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
